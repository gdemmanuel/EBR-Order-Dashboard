
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User } from 'firebase/auth';

import { Order, ApprovalStatus, PricingSettings, Flavor } from './types';
import { subscribeToOrders, subscribeToSettings, AppSettings, migrateLocalDataToFirestore } from './services/dbService';
import { subscribeToAuth } from './services/authService';
import { initialEmpanadaFlavors, initialFullSizeEmpanadaFlavors } from './data/mockData';

import AdminDashboard from './components/AdminDashboard';
import CustomerOrderPage from './components/CustomerOrderPage';
import LoginPage from './components/LoginPage';
import { normalizeDateStr } from './utils/dateUtils';

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
  
  // Extended Settings State
  const [prepSettings, setPrepSettings] = useState<AppSettings['prepSettings']>({ 
      lbsPer20: {}, 
      fullSizeMultiplier: 2.0,
      discosPer: { mini: 1, full: 1 },
      discoPackSize: { mini: 10, full: 10 },
      productionRates: { mini: 40, full: 25 }
  });
  const [scheduling, setScheduling] = useState<AppSettings['scheduling']>({
      enabled: true,
      intervalMinutes: 15,
      startTime: "09:00",
      endTime: "17:00",
      blockedDates: [],
      closedDays: [],
      dateOverrides: {}
  });
  const [laborWage, setLaborWage] = useState<number>(15.00);
  const [materialCosts, setMaterialCosts] = useState<Record<string, number>>({});
  const [discoCosts, setDiscoCosts] = useState<{mini: number, full: number}>({mini: 0.10, full: 0.15});
  const [inventory, setInventory] = useState<Record<string, { mini: number; full: number }>>({});
  
  const [dbError, setDbError] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  
  // Notification State
  const prevPendingCountRef = useRef(0);

  // Derived state for notifications
  const pendingCount = useMemo(() => 
    orders.filter(o => o.approvalStatus === ApprovalStatus.PENDING).length
  , [orders]);

  // Create a safe list of busy times to pass to the customer page (without PII)
  const busySlots = useMemo(() => {
      return orders
        .filter(o => o.approvalStatus === ApprovalStatus.APPROVED)
        .map(o => ({
            date: normalizeDateStr(o.pickupDate),
            time: o.pickupTime
        }));
  }, [orders]);

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
      if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
      }
  }, []);

  useEffect(() => {
      if (pendingCount > prevPendingCountRef.current) {
          const newCount = pendingCount - prevPendingCountRef.current;
          if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Order Pending!', {
                  body: `You have ${newCount} new order(s) waiting for approval.`,
                  icon: '/vite.svg',
                  requireInteraction: true
              });
          }
          document.title = `(${pendingCount}) Pending - Empanadas by Rose`;
      } else if (pendingCount === 0) {
          document.title = 'Empanadas by Rose';
      } else {
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
              
              const rawMini = JSON.parse(localStorage.getItem('empanadaFlavors') || JSON.stringify(initialEmpanadaFlavors));
              const rawFull = JSON.parse(localStorage.getItem('fullSizeEmpanadaFlavors') || JSON.stringify(initialFullSizeEmpanadaFlavors));

              const localSettings: AppSettings = {
                  empanadaFlavors: Array.isArray(rawMini) && typeof rawMini[0] === 'string' ? rawMini.map((f: string) => ({ name: f, visible: true })) : rawMini,
                  fullSizeEmpanadaFlavors: Array.isArray(rawFull) && typeof rawFull[0] === 'string' ? rawFull.map((f: string) => ({ name: f, visible: true })) : rawFull,
                  sheetUrl: localStorage.getItem('sheetUrl') || '',
                  importedSignatures: JSON.parse(localStorage.getItem('importedSignatures') || '[]'),
                  pricing: { mini: { basePrice: 1.75 }, full: { basePrice: 3.00 }, packages: [], salsas: [], salsaSmall: 2.00, salsaLarge: 4.00 },
                  prepSettings: { lbsPer20: {}, fullSizeMultiplier: 2.0, discosPer: { mini: 1, full: 1 }, discoPackSize: { mini: 10, full: 10 }, productionRates: { mini: 40, full: 25 } },
                  scheduling: { enabled: true, intervalMinutes: 15, startTime: "09:00", endTime: "17:00", blockedDates: [], closedDays: [], dateOverrides: {} },
                  laborWage: 15.00,
                  materialCosts: {},
                  discoCosts: { mini: 0.10, full: 0.15 },
                  inventory: {}
              };

              await migrateLocalDataToFirestore(localOrders, localPending, localSettings);
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
        if (settings.scheduling) setScheduling(settings.scheduling);
        if (settings.laborWage !== undefined) setLaborWage(settings.laborWage);
        if (settings.materialCosts) setMaterialCosts(settings.materialCosts);
        if (settings.discoCosts) setDiscoCosts(settings.discoCosts);
        if (settings.inventory) setInventory(settings.inventory);

    }, (error) => {
        console.warn("Could not load settings:", error.message);
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
                    setDbError("Permission Denied: Database locked.");
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

  const fullSettings: AppSettings = {
      empanadaFlavors,
      fullSizeEmpanadaFlavors,
      sheetUrl,
      importedSignatures: Array.from(importedSignatures),
      pricing: pricing || { mini: { basePrice: 1.75 }, full: { basePrice: 3.00 }, packages: [], salsas: [], salsaSmall: 2, salsaLarge: 4 },
      prepSettings,
      scheduling,
      laborWage,
      materialCosts,
      discoCosts,
      inventory
  };

  return (
    <Router>
        <Routes>
            <Route 
                path="/order" 
                element={
                    <CustomerOrderPage 
                        empanadaFlavors={empanadaFlavors} 
                        fullSizeEmpanadaFlavors={fullSizeEmpanadaFlavors} 
                        pricing={pricing}
                        scheduling={scheduling}
                        busySlots={busySlots}
                    />
                } 
            />

            <Route 
                path="/login" 
                element={!user ? <LoginPage /> : <Navigate to="/" replace />} 
            />

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
                            pricing={pricing || { mini: { basePrice: 1.75 }, full: { basePrice: 3.00 }, packages: [], salsas: [], salsaSmall: 2, salsaLarge: 4 }}
                            prepSettings={prepSettings}
                            settings={fullSettings}
                        />
                    ) : (
                        <Navigate to="/login" replace />
                    )
                } 
            />
        </Routes>

        {dbError && user && (
            <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-xl z-50 max-w-md">
                <p className="font-bold mb-1">System Error</p>
                <p className="text-sm">{dbError}</p>
            </div>
        )}
    </Router>
  );
}
