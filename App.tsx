
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User } from 'firebase/auth';

import { Order, ApprovalStatus, PricingSettings, Flavor } from './types';
import { subscribeToOrders, subscribeToSettings, AppSettings, migrateLocalDataToFirestore } from './services/dbService';
import { subscribeToAuth } from './services/authService';
import { initialEmpanadaFlavors, initialFullSizeEmpanadaFlavors } from './data/mockData';
import { parseOrdersFromSheet } from './services/geminiService'; // Import needed for auto-check logic

import AdminDashboard from './components/AdminDashboard';
import CustomerOrderPage from './components/CustomerOrderPage';
import LoginPage from './components/LoginPage';

export default function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Shared App State
  const [orders, setOrders] = useState<Order[]>([]);
  const [empanadaFlavors, setEmpanadaFlavors] = useState<Flavor[]>(initialEmpanadaFlavors.map(name => ({ name, visible: true })));
  const [fullSizeEmpanadaFlavors, setFullSizeEmpanadaFlavors] = useState<Flavor[]>(initialFullSizeEmpanadaFlavors.map(name => ({ name, visible: true })));
  const [importedSignatures, setImportedSignatures] = useState<Set<string>>(new Set());
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [pricing, setPricing] = useState<PricingSettings | undefined>(undefined);
  const [prepSettings, setPrepSettings] = useState<AppSettings['prepSettings']>({ lbsPer20: {}, fullSizeMultiplier: 2.0 });
  
  const [dbError, setDbError] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  
  // Notification State
  const prevPendingCountRef = useRef(0);

  // Derived state for notifications
  const pendingCount = useMemo(() => 
    orders.filter(o => o.approvalStatus === ApprovalStatus.PENDING).length
  , [orders]);

  // Auth Listener
  useEffect(() => {
      const unsubscribe = subscribeToAuth((u) => {
          setUser(u);
          setAuthLoading(false);
      });
      return () => unsubscribe();
  }, []);

  // Notification Logic
  useEffect(() => {
      // 1. Request Permission on mount
      if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
      }
  }, []);

  useEffect(() => {
      // 2. Check for increase in pending orders
      if (pendingCount > prevPendingCountRef.current) {
          const newCount = pendingCount - prevPendingCountRef.current;
          
          // Browser Notification
          if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Order Pending!', {
                  body: `You have ${newCount} new order(s) waiting for approval.`,
                  icon: '/vite.svg', // Standard Vite icon, or replace with your logo URL
                  requireInteraction: true // Keeps notification on screen until clicked
              });
          }

          // Tab Title Alert
          document.title = `(${pendingCount}) Pending - Empanadas by Rose`;
      } else if (pendingCount === 0) {
          document.title = 'Empanadas by Rose';
      } else {
          // Just update the count in title if it decreased or stayed same (but > 0)
          document.title = `(${pendingCount}) Pending - Empanadas by Rose`;
      }
      
      prevPendingCountRef.current = pendingCount;
  }, [pendingCount]);


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
              
              // Basic migration of flavors to object array if needed
              const rawMini = JSON.parse(localStorage.getItem('empanadaFlavors') || JSON.stringify(initialEmpanadaFlavors));
              const rawFull = JSON.parse(localStorage.getItem('fullSizeEmpanadaFlavors') || JSON.stringify(initialFullSizeEmpanadaFlavors));

              const localSettings: AppSettings = {
                  empanadaFlavors: Array.isArray(rawMini) && typeof rawMini[0] === 'string' 
                    ? rawMini.map((f: string) => ({ name: f, visible: true })) 
                    : rawMini,
                  fullSizeEmpanadaFlavors: Array.isArray(rawFull) && typeof rawFull[0] === 'string' 
                    ? rawFull.map((f: string) => ({ name: f, visible: true })) 
                    : rawFull,
                  sheetUrl: localStorage.getItem('sheetUrl') || '',
                  importedSignatures: JSON.parse(localStorage.getItem('importedSignatures') || '[]'),
                  pricing: {
                      mini: { basePrice: 1.75 },
                      full: { basePrice: 3.00 },
                      packages: [],
                      salsaSmall: 2.00,
                      salsaLarge: 4.00
                  },
                  prepSettings: {
                      lbsPer20: {},
                      fullSizeMultiplier: 2.0
                  }
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

  // Data Subscriptions
  useEffect(() => {
    const unsubscribeSettings = subscribeToSettings((settings: AppSettings) => {
        if (settings.empanadaFlavors) setEmpanadaFlavors(settings.empanadaFlavors);
        if (settings.fullSizeEmpanadaFlavors) setFullSizeEmpanadaFlavors(settings.fullSizeEmpanadaFlavors);
        if (settings.importedSignatures) setImportedSignatures(new Set(settings.importedSignatures));
        if (settings.sheetUrl) setSheetUrl(settings.sheetUrl);
        if (settings.pricing) setPricing(settings.pricing);
        if (settings.prepSettings) setPrepSettings(settings.prepSettings);
    }, (error) => {
        console.warn("Could not load settings (likely public user restricted):", error.message);
    });

    let unsubscribeOrders = () => {};

    if (user) {
        unsubscribeOrders = subscribeToOrders(
            (updatedOrders) => {
                setOrders(updatedOrders);
                setDbError(null);
            }, 
            ApprovalStatus.APPROVED,
            (error) => {
                if (error.message.includes("permission-denied")) {
                    setDbError("Permission Denied: Your database is locked. Please check Firebase Rules.");
                } else {
                    setDbError(`Database Error: ${error.message}`);
                }
            }
        );
    } else {
        setOrders([]);
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
                        pricing={pricing}
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
                            pricing={pricing || {
                                mini: { basePrice: 1.75 },
                                full: { basePrice: 3.00 },
                                packages: [],
                                salsaSmall: 2.00,
                                salsaLarge: 4.00
                            }}
                            prepSettings={prepSettings}
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
