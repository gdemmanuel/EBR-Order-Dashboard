
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import DashboardMetrics from './components/DashboardMetrics';
import OrderList from './components/OrderList';
import CalendarView from './components/CalendarView';
import OrderFormModal from './components/OrderFormModal';
import OrderDetailModal from './components/OrderDetailModal';
import ImportOrderModal from './components/ImportOrderModal';
import PrintPreviewPage from './components/PrintPreviewPage';
import PendingOrders from './components/PendingOrders';
import DateRangeFilter from './components/DateRangeFilter';
import LoginPage from './components/LoginPage';
import { PlusCircleIcon, ListBulletIcon, CalendarDaysIcon, ArrowTopRightOnSquareIcon } from './components/icons/Icons';
import { Order, FollowUpStatus, ApprovalStatus, OrderItem } from './types';
import { subscribeToOrders, subscribeToSettings, saveOrderToDb, deleteOrderFromDb, updateSettingsInDb, saveOrdersBatch, AppSettings, migrateLocalDataToFirestore } from './services/dbService';
import { subscribeToAuth } from './services/authService';
import { initialEmpanadaFlavors, initialFullSizeEmpanadaFlavors } from './data/mockData';
import { parseOrderDateTime } from './utils/dateUtils';
import { MINI_EMPANADA_PRICE, FULL_SIZE_EMPANADA_PRICE, SALSA_PRICES } from './config';
import { User } from 'firebase/auth';

export default function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App State
  const [orders, setOrders] = useState<Order[]>([]);
  const [empanadaFlavors, setEmpanadaFlavors] = useState<string[]>(initialEmpanadaFlavors);
  const [fullSizeEmpanadaFlavors, setFullSizeEmpanadaFlavors] = useState<string[]>(initialFullSizeEmpanadaFlavors);
  const [importedSignatures, setImportedSignatures] = useState<Set<string>>(new Set());
  const [sheetUrl, setSheetUrl] = useState<string>('');
  
  const [view, setView] = useState<'dashboard' | 'list' | 'calendar'>('dashboard');
  const [dateFilter, setDateFilter] = useState<{ start?: string; end?: string }>({});
  
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | undefined>(undefined);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [printPreviewOrders, setPrintPreviewOrders] = useState<Order[] | null>(null);

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
    if (!user) return;

    const unsubscribeOrders = subscribeToOrders(
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

    const unsubscribeSettings = subscribeToSettings((settings: AppSettings) => {
        if (settings.empanadaFlavors) setEmpanadaFlavors(settings.empanadaFlavors);
        if (settings.fullSizeEmpanadaFlavors) setFullSizeEmpanadaFlavors(settings.fullSizeEmpanadaFlavors);
        if (settings.importedSignatures) setImportedSignatures(new Set(settings.importedSignatures));
        if (settings.sheetUrl) setSheetUrl(settings.sheetUrl);
    });

    return () => {
        unsubscribeOrders();
        unsubscribeSettings();
    };
  }, [user]);

  // --- Derived State & Calculations ---

  const activeOrders = useMemo(() => orders.filter(o => o.approvalStatus === ApprovalStatus.APPROVED), [orders]);
  const pendingOrders = useMemo(() => orders.filter(o => o.approvalStatus === ApprovalStatus.PENDING), [orders]);

  const filteredOrders = useMemo(() => {
    let result = activeOrders;
    if (dateFilter.start) {
        const start = new Date(dateFilter.start);
        start.setHours(0,0,0,0);
        result = result.filter(o => parseOrderDateTime(o) >= start);
    }
    if (dateFilter.end) {
        const end = new Date(dateFilter.end);
        end.setHours(23,59,59,999);
        result = result.filter(o => parseOrderDateTime(o) <= end);
    }
    return result;
  }, [activeOrders, dateFilter]);

  const stats = useMemo(() => {
      const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.amountCharged, 0);
      const ordersToFollowUp = filteredOrders.filter(o => o.followUpStatus === FollowUpStatus.NEEDED).length;
      const totalEmpanadasSold = filteredOrders.reduce((sum, o) => sum + o.totalMini + o.totalFullSize, 0);
      return { totalRevenue, ordersToFollowUp, totalEmpanadasSold };
  }, [filteredOrders]);

  const calculateOrderTotal = (items: OrderItem[], deliveryFee: number) => {
      const miniTotal = items.filter(i => !i.name.startsWith('Full ') && !i.name.includes('Salsa')).reduce((sum, i) => sum + (i.quantity * MINI_EMPANADA_PRICE), 0);
      const fullTotal = items.filter(i => i.name.startsWith('Full ')).reduce((sum, i) => sum + (i.quantity * FULL_SIZE_EMPANADA_PRICE), 0);
      
      const salsaTotal = items.filter(i => i.name.includes('Salsa')).reduce((sum, i) => {
           if(i.name.includes('Large')) return sum + (i.quantity * SALSA_PRICES['Large (8oz)']);
           return sum + (i.quantity * SALSA_PRICES['Small (4oz)']);
      }, 0);

      return miniTotal + fullTotal + salsaTotal + deliveryFee;
  };

  // --- Handlers ---

  const handleSaveOrder = async (orderData: Order | Omit<Order, 'id'>) => {
      const calculatedTotal = calculateOrderTotal(orderData.items, orderData.deliveryFee || 0);
      
      let orderToSave: Order;
      if ('id' in orderData) {
          orderToSave = { ...orderData as Order, amountCharged: calculatedTotal };
          if (orderToSave.approvalStatus === ApprovalStatus.PENDING) {
             orderToSave.approvalStatus = ApprovalStatus.APPROVED;
          }
      } else {
          orderToSave = {
              ...orderData,
              id: Date.now().toString(),
              amountCharged: calculatedTotal
          };
      }
      await saveOrderToDb(orderToSave);
      setIsNewOrderModalOpen(false);
      setOrderToEdit(undefined);
  };

  const handleDeleteOrder = async (orderId: string) => {
      await deleteOrderFromDb(orderId);
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      if (orderToEdit?.id === orderId) {
          setOrderToEdit(undefined);
          setIsNewOrderModalOpen(false);
      }
  };

  const handleAddNewFlavor = async (flavor: string, type: 'mini' | 'full') => {
      if (type === 'mini') {
          if (!empanadaFlavors.includes(flavor)) {
              const newFlavors = [...empanadaFlavors, flavor];
              setEmpanadaFlavors(newFlavors);
              await updateSettingsInDb({ empanadaFlavors: newFlavors });
          }
      } else {
          if (!fullSizeEmpanadaFlavors.includes(flavor)) {
              const newFlavors = [...fullSizeEmpanadaFlavors, flavor];
              setFullSizeEmpanadaFlavors(newFlavors);
              await updateSettingsInDb({ fullSizeEmpanadaFlavors: newFlavors });
          }
      }
  };

  const handleUpdateFollowUp = async (orderId: string, status: FollowUpStatus) => {
      const order = orders.find(o => o.id === orderId);
      if (order) {
          await saveOrderToDb({ ...order, followUpStatus: status });
      }
  };
  
  const handleApproveOrder = async (orderId: string) => {
      const order = orders.find(o => o.id === orderId);
      if (order) {
          await saveOrderToDb({ ...order, approvalStatus: ApprovalStatus.APPROVED });
      }
  };

  const handleDenyOrder = async (orderId: string) => {
      await deleteOrderFromDb(orderId);
  };

  const handleOrdersImported = async (newOrders: Partial<Order>[], newSignatures: string[]) => {
      const ordersToSave: Order[] = newOrders.map((pOrder, index) => {
          const items = pOrder.items || [];
          const deliveryFee = 0; 
          const calculatedTotal = calculateOrderTotal(items, deliveryFee);

          return {
            id: `${Date.now()}-${index}`,
            pickupDate: pOrder.pickupDate || '',
            pickupTime: pOrder.pickupTime || '',
            customerName: pOrder.customerName || 'Unknown',
            contactMethod: pOrder.contactMethod || 'Unknown',
            phoneNumber: pOrder.phoneNumber || null,
            items: items,
            totalFullSize: items.filter(i => i.name.includes('Full')).reduce((s, i) => s + i.quantity, 0),
            totalMini: items.filter(i => !i.name.includes('Full') && !i.name.includes('Salsa')).reduce((s, i) => s + i.quantity, 0),
            amountCharged: calculatedTotal,
            deliveryRequired: pOrder.deliveryRequired || false,
            deliveryFee: deliveryFee,
            amountCollected: 0,
            paymentMethod: null,
            deliveryAddress: pOrder.deliveryAddress || null,
            followUpStatus: FollowUpStatus.NEEDED,
            paymentStatus: pOrder.paymentStatus as any || 'Pending',
            specialInstructions: pOrder.specialInstructions || null,
            approvalStatus: ApprovalStatus.PENDING
          } as Order;
      });

      await saveOrdersBatch(ordersToSave);
      const updatedSignatures = [...Array.from(importedSignatures), ...newSignatures];
      await updateSettingsInDb({ importedSignatures: updatedSignatures });
      setIsImportModalOpen(false);
  };

  const handleUpdateSheetUrl = async (url: string) => {
      await updateSettingsInDb({ sheetUrl: url });
  };

  // --- Render Logic ---

  if (authLoading) {
      return <div className="min-h-screen flex items-center justify-center bg-brand-cream">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange"></div>
      </div>;
  }

  if (!user) {
      return <LoginPage />;
  }

  if (printPreviewOrders) {
      return <PrintPreviewPage orders={printPreviewOrders} onExit={() => setPrintPreviewOrders(null)} />;
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {dbError && (
            <div className="bg-red-500 text-white px-4 py-3 rounded-lg mb-6 text-center font-medium shadow-md">
                <p>{dbError}</p>
            </div>
        )}

        {isMigrating && (
            <div className="bg-blue-100 text-blue-800 px-4 py-3 rounded-lg mb-6 text-center font-medium animate-pulse">
                <p>Setting up your database and uploading existing orders...</p>
            </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex bg-white rounded-lg shadow-sm p-1 border border-brand-tan">
                <button 
                    onClick={() => setView('dashboard')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}
                >
                    Dashboard
                </button>
                <button 
                    onClick={() => setView('list')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === 'list' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}
                >
                    <ListBulletIcon className="w-4 h-4" /> List
                </button>
                <button 
                    onClick={() => setView('calendar')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === 'calendar' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}
                >
                    <CalendarDaysIcon className="w-4 h-4" /> Calendar
                </button>
            </div>

            <div className="flex gap-3">
                <button 
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center gap-2 bg-white text-brand-brown border border-brand-tan font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                    Import
                </button>
                <button 
                    onClick={() => { setOrderToEdit(undefined); setIsNewOrderModalOpen(true); }}
                    className="flex items-center gap-2 bg-brand-brown text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors shadow-sm"
                >
                    <PlusCircleIcon className="w-5 h-5" />
                    New Order
                </button>
            </div>
        </div>

        <PendingOrders 
            orders={pendingOrders} 
            onApprove={handleApproveOrder} 
            onDeny={handleDenyOrder}
            onSelectOrder={setSelectedOrder}
        />
        
        {pendingOrders.length > 0 && <div className="mb-8" />}

        {view === 'dashboard' && (
            <>
                <DateRangeFilter onDateChange={setDateFilter} />
                <DashboardMetrics 
                    stats={stats} 
                    orders={filteredOrders}
                    empanadaFlavors={empanadaFlavors}
                    fullSizeEmpanadaFlavors={fullSizeEmpanadaFlavors}
                />
            </>
        )}

        {view === 'list' && (
            <OrderList 
                orders={activeOrders} 
                onSelectOrder={setSelectedOrder} 
                onPrintSelected={setPrintPreviewOrders}
                onDelete={handleDeleteOrder}
            />
        )}

        {view === 'calendar' && (
            <CalendarView 
                orders={activeOrders} 
                onSelectOrder={setSelectedOrder}
                onPrintSelected={setPrintPreviewOrders}
                onDelete={handleDeleteOrder}
            />
        )}
      </main>

      {isNewOrderModalOpen && (
          <OrderFormModal 
              order={orderToEdit}
              onClose={() => setIsNewOrderModalOpen(false)}
              onSave={handleSaveOrder}
              empanadaFlavors={empanadaFlavors}
              fullSizeEmpanadaFlavors={fullSizeEmpanadaFlavors}
              onAddNewFlavor={handleAddNewFlavor}
              onDelete={handleDeleteOrder}
          />
      )}

      {selectedOrder && (
          <OrderDetailModal 
              order={selectedOrder} 
              onClose={() => setSelectedOrder(null)}
              onUpdateFollowUp={handleUpdateFollowUp}
              onEdit={(order) => {
                  setSelectedOrder(null);
                  setOrderToEdit(order);
                  setIsNewOrderModalOpen(true);
              }}
              onApprove={selectedOrder.approvalStatus === ApprovalStatus.PENDING ? handleApproveOrder : undefined}
              onDeny={selectedOrder.approvalStatus === ApprovalStatus.PENDING ? handleDenyOrder : undefined}
              onDelete={handleDeleteOrder}
          />
      )}

      {isImportModalOpen && (
          <ImportOrderModal 
              onClose={() => setIsImportModalOpen(false)}
              onOrdersImported={handleOrdersImported}
              onUpdateSheetUrl={handleUpdateSheetUrl}
              existingSignatures={importedSignatures}
          />
      )}
    </div>
  );
}
