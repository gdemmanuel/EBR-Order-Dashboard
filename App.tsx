
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User } from 'firebase/auth';

import { Order, ApprovalStatus } from './types';
import { subscribeToOrders, subscribeToSettings, AppSettings, migrateLocalDataToFirestore } from './services/dbService';
import { subscribeToAuth } from './services/authService';
import { initialEmpanadaFlavors, initialFullSizeEmpanadaFlavors } from './data/mockData';

import AdminDashboard from './components/AdminDashboard';
import CustomerOrderPage from './components/CustomerOrderPage';
import LoginPage from './components/LoginPage';

export default function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Shared App State
  const [orders, setOrders] = useState<Order[]>([]);
  const [empanadaFlavors, setEmpanadaFlavors] = useState<string[]>(initialEmpanadaFlavors);
  const [fullSizeEmpanadaFlavors, setFullSizeEmpanadaFlavors] = useState<string[]>(initialFullSizeEmpanadaFlavors);
  const [importedSignatures, setImportedSignatures] = useState<Set<string>>(new Set());
  const [sheetUrl, setSheetUrl] = useState<string>('');
  
  const [dbError, setDbError] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  // Auth Listener
  useEffect(() => {
      const unsubscribe = subscribeToAuth((u) => {
          setUser(u);
          setAuthLoading(false);
      });
      return () => unsubscribe();
  }, []);

  // Migration Logic (Run once on mount if user is logged in)
  useEffect(() => {
      if (!user) return;

      const performMigration = async () => {
          setIsMigrating(true);
          try {
              const localOrdersStr = localStorage.getItem('orders');
              const localPendingStr = localStorage.getItem('pendingOrders');
              
              if (!localOrdersStr && !localPendingStr) {
                  setIsMigrating(false);
                  return;
              }

              const localOrders: Order[] = localOrdersStr ? JSON.parse(localOrdersStr) : [];
              const localPending: Order[] = localPendingStr ? JSON.parse(localPendingStr) : [];
              
              const localSettings: AppSettings = {
                  empanadaFlavors: JSON.parse(localStorage.getItem('empanadaFlavors') || JSON.stringify(initialEmpanadaFlavors)),
                  fullSizeEmpanadaFlavors: JSON.parse(localStorage.getItem('fullSizeEmpanadaFlavors') || JSON.stringify(initialFullSizeEmpanadaFlavors)),
                  sheetUrl: localStorage.getItem('sheetUrl') || '',
                  importedSignatures: JSON.parse(localStorage.getItem('importedSignatures') || '[]'),
              };

              await migrateLocalDataToFirestore(localOrders, localPending, localSettings);
              // Clear local storage after successful migration to avoid re-running
              localStorage.removeItem('orders');
              localStorage.removeItem('pendingOrders');
          } catch (e) {
              console.error("Migration failed:", e);
          } finally {
              setIsMigrating(false);
          }
      };
      
      performMigration();
  }, [user]);

  // Data Subscriptions (Only if logged in for orders, but settings might be public in future?)
  // For now, we need settings (flavors) for the public page too.
  // We will make settings subscription always run if possible, but it depends on Firestore rules.
  // If rules require auth for settings, we might need to open them up or use Cloud Functions.
  // Assuming updated rules will allow public READ of settings or hardcode for now? 
  // Better: The user must update rules to allow public to read /app_settings/general.
  
  useEffect(() => {
    // Always subscribe to settings (assuming rules allow public read of settings)
    // Or if not, we rely on defaults for public page until logged in.
    // But wait, we can't edit flavors without being logged in, so keeping them sync is good.
    
    const unsubscribeSettings = subscribeToSettings((settings: AppSettings) => {
        if (settings.empanadaFlavors) setEmpanadaFlavors(settings.empanadaFlavors);
        if (settings.fullSizeEmpanadaFlavors) setFullSizeEmpanadaFlavors(settings.fullSizeEmpanadaFlavors);
        if (settings.importedSignatures) setImportedSignatures(new Set(settings.importedSignatures));
        if (settings.sheetUrl) setSheetUrl(settings.sheetUrl);
    });

    let unsubscribeOrders = () => {};

    if (user) {
        unsubscribeOrders = subscribeToOrders(
            (updatedOrders) => {
                setOrders(updatedOrders);
                setDbError(null);
            }, 
            ApprovalStatus.APPROVED, // This fetches all orders regardless of status? Actually dbService filters?
            // Checking dbService... subscribeToOrders query doesn't seem to filter by status in the query provided previously.
            // It grabs the whole collection.
            (error) => {
                if (error.message.includes("permission-denied")) {
                    setDbError("Permission Denied: Your database is locked. Please check Firebase Rules.");
                } else {
                    setDbError(`Database Error: ${error.message}`);
                }
            }
        );
    } else {
        setOrders([]); // Clear sensitive orders if logged out
    }

    return () => {
        unsubscribeOrders();
        unsubscribeSettings();
    };
  }, [user]);

  if (authLoading) {
      return <div className="min-h-screen flex items-center justify-center bg-brand-cream">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange"></div>
      </div>;
  }

  return (
    <Router>
        <Routes>
            {/* Public Customer Route */}
            <Route 
                path="/order" 
                element={
                    <CustomerOrderPage 
                        empanadaFlavors={empanadaFlavors} 
                        fullSizeEmpanadaFlavors={fullSizeEmpanadaFlavors} 
                    />
                } 
            />

            {/* Login Route */}
            <Route 
                path="/login" 
                element={!user ? <LoginPage /> : <Navigate to="/" replace />} 
            />

            {/* Protected Admin Route */}
            <Route 
                path="/*" 
                element={
                    user ? (
                        <AdminDashboard 
                            user={user}
                            orders={orders}
                            empanadaFlavors={empanadaFlavors}
                            fullSizeEmpanadaFlavors={fullSizeEmpanadaFlavors}
                            importedSignatures={importedSignatures}
                            sheetUrl={sheetUrl}
                        />
                    ) : (
                        <Navigate to="/login" replace />
                    )
                } 
            />
        </Routes>

        {/* Global Error Toast/Banner */}
        {dbError && user && (
            <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-xl z-50 max-w-md">
                <p className="font-bold mb-1">System Error</p>
                <p className="text-sm">{dbError}</p>
            </div>
        )}
    </Router>
  );
}
