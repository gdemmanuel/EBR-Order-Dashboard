
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Order, FollowUpStatus, ContactMethod, PaymentStatus, ApprovalStatus } from './types';
import { initialOrders, initialEmpanadaFlavors, initialFullSizeEmpanadaFlavors } from './data/mockData';
import { MINI_EMPANADA_PRICE, FULL_SIZE_EMPANADA_PRICE, SALSA_PRICES } from './config';
import Header from './components/Header';
import OrderList from './components/OrderList';
import OrderDetailModal from './components/OrderDetailModal';
import DashboardMetrics from './components/DashboardMetrics';
import OrderFormModal from './components/OrderFormModal';
import ImportOrderModal from './components/ImportOrderModal';
import { PlusCircleIcon, DocumentArrowDownIcon, CalendarDaysIcon, ListBulletIcon, SparklesIcon } from './components/icons/Icons';
import PrintPreviewPage from './components/PrintPreviewPage';
import PendingOrders from './components/PendingOrders';
import DateRangeFilter from './components/DateRangeFilter';
import CalendarView from './components/CalendarView';
import { parseOrderDateTime } from './utils/dateUtils';
import { parseOrdersFromSheet } from './services/geminiService';
// Import DB Service
import { 
    subscribeToOrders, 
    subscribeToSettings, 
    saveOrderToDb, 
    deleteOrderFromDb, 
    updateSettingsInDb, 
    migrateLocalDataToFirestore,
    saveOrdersBatch,
    AppSettings
} from './services/dbService';


/**
 * The single source of truth for calculating the total cost of an order.
 * Ensures that pricing is consistent across the entire application.
 */
const calculateOrderTotal = (order: Partial<Order>): number => {
    const items = order.items || [];
    const deliveryFee = order.deliveryFee || 0;

    const total = items.reduce((sum, item) => {
        let itemPrice = 0;
        if (item.name.startsWith('Full ')) {
            itemPrice = FULL_SIZE_EMPANADA_PRICE;
        } else if (item.name.includes('Salsa')) {
            const size = item.name.includes('Large') ? 'Large (8oz)' : 'Small (4oz)';
            itemPrice = SALSA_PRICES[size];
        } else {
            itemPrice = MINI_EMPANADA_PRICE;
        }
        return sum + (item.quantity * itemPrice);
    }, 0);
    
    return total + (order.deliveryRequired ? deliveryFee : 0);
};


export default function App() {
  // -- STATE MANAGEMENT --
  
  // Loading State for initial DB connection
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Orders (Live from Firebase)
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  
  // Derived state for UI
  const orders = useMemo(() => allOrders.filter(o => o.approvalStatus === ApprovalStatus.APPROVED), [allOrders]);
  const pendingOrders = useMemo(() => allOrders.filter(o => o.approvalStatus === ApprovalStatus.PENDING), [allOrders]);

  // Settings (Live from Firebase)
  const [empanadaFlavors, setEmpanadaFlavors] = useState<string[]>(initialEmpanadaFlavors);
  const [fullSizeEmpanadaFlavors, setFullSizeEmpanadaFlavors] = useState<string[]>(initialFullSizeEmpanadaFlavors);
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [importedSignatures, setImportedSignatures] = useState<Set<string>>(new Set());

  // UI State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | undefined>(undefined);
  const [ordersToPrint, setOrdersToPrint] = useState<Order[]>([]);
  const [activeDateRange, setActiveDateRange] = useState<{ start?: string; end?: string }>({});
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isCheckingForOrders, setIsCheckingForOrders] = useState(false);

  // -- FIREBASE INTEGRATION --

  // 1. Initial Migration & Setup
  useEffect(() => {
    const performMigration = async () => {
        const localOrdersStr = localStorage.getItem('orders');
        const localPendingStr = localStorage.getItem('pendingOrders');
        
        // If we have local data, try to migrate it once
        if (localOrdersStr || localPendingStr) {
            const localOrders = localOrdersStr ? JSON.parse(localOrdersStr) : [];
            const localPending = localPendingStr ? JSON.parse(localPendingStr) : [];
            
            const localSettings: AppSettings = {
                empanadaFlavors: JSON.parse(localStorage.getItem('empanadaFlavors') || JSON.stringify(initialEmpanadaFlavors)),
                fullSizeEmpanadaFlavors: JSON.parse(localStorage.getItem('fullSizeEmpanadaFlavors') || JSON.stringify(initialFullSizeEmpanadaFlavors)),
                sheetUrl: localStorage.getItem('sheetUrl') || '',
                importedSignatures: JSON.parse(localStorage.getItem('importedSignatures') || '[]')
            };

            await migrateLocalDataToFirestore(localOrders, localPending, localSettings);
            
            // Optional: Clear local storage after migration to prevent confusion
            // localStorage.clear(); 
        }
    };
    performMigration();
  }, []);

  // 2. Subscribe to Data
  useEffect(() => {
    const unsubOrders = subscribeToOrders((data) => {
        setAllOrders(data);
        setIsLoadingData(false);
    });

    const unsubSettings = subscribeToSettings((data) => {
        if (data) {
            if (data.empanadaFlavors) setEmpanadaFlavors(data.empanadaFlavors);
            if (data.fullSizeEmpanadaFlavors) setFullSizeEmpanadaFlavors(data.fullSizeEmpanadaFlavors);
            if (data.sheetUrl) setSheetUrl(data.sheetUrl);
            if (data.importedSignatures) setImportedSignatures(new Set(data.importedSignatures));
        }
    });

    return () => {
        unsubOrders();
        unsubSettings();
    };
  }, []);

  // -- HANDLERS (Updated to use DB) --

  const processImportedOrders = useCallback((importedOrders: Partial<Order>[]) => {
      return importedOrders.map((importedOrder, index) => {
        const items = importedOrder.items || [];
        const totalFullSize = items.filter(i => i.name.startsWith('Full ')).reduce((sum, i) => sum + i.quantity, 0);
        const totalMini = items.filter(i => !i.name.startsWith('Full ')).reduce((sum, i) => sum + i.quantity, 0);

        const newOrderBase = {
            id: `imported-${Date.now()}-${index}`,
            customerName: importedOrder.customerName || 'Unknown Customer',
            phoneNumber: importedOrder.phoneNumber || null,
            pickupDate: importedOrder.pickupDate || new Date().toLocaleDateString(),
            pickupTime: importedOrder.pickupTime || 'N/A',
            contactMethod: importedOrder.contactMethod || ContactMethod.UNKNOWN,
            items: items,
            totalFullSize: totalFullSize,
            totalMini: totalMini,
            deliveryRequired: importedOrder.deliveryRequired || false,
            deliveryAddress: importedOrder.deliveryAddress || null,
            specialInstructions: importedOrder.specialInstructions || null,
            deliveryFee: importedOrder.deliveryFee || 0,
            amountCollected: importedOrder.amountCollected || null,
            paymentMethod: importedOrder.paymentMethod || null,
            paymentStatus: PaymentStatus.PENDING,
            followUpStatus: FollowUpStatus.NEEDED,
            approvalStatus: ApprovalStatus.PENDING,
        };
        
        const amountCharged = calculateOrderTotal(newOrderBase);
        
        return {
          ...newOrderBase,
          amountCharged: amountCharged,
        } as Order;
    });
  }, []);

  const handleOrdersImported = async (importedOrders: Partial<Order>[], newSignatures: string[]) => {
    const newPendingOrders = processImportedOrders(importedOrders);

    // Save to DB
    await saveOrdersBatch(newPendingOrders);

    // Update Signatures in DB
    const nextSignatures = Array.from(new Set([...Array.from(importedSignatures), ...newSignatures]));
    await updateSettingsInDb({ importedSignatures: nextSignatures });

    setIsImportModalOpen(false);
  };

  // -- AUTOMATION: AUTO-IMPORT LOGIC --

  const checkForNewOrders = useCallback(async () => {
      if (!sheetUrl) return;

      setIsCheckingForOrders(true);
      try {
          const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
          const match = sheetUrl.match(regex);
          if (!match || !match[1]) return;
          
          const sheetId = match[1];
          const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

          const response = await fetch(csvUrl);
          if (!response.ok) return;
          const csvText = await response.text();

          // Use the service to find new orders, passing current signatures to skip duplicates
          const { newOrders, newSignatures } = await parseOrdersFromSheet(
              csvText, 
              () => {}, // No progress updates needed for background check
              importedSignatures
          );

          if (newOrders.length > 0) {
              const processedOrders = processImportedOrders(newOrders);
              
              // Save found orders to DB
              await saveOrdersBatch(processedOrders);
              
              // Update signatures
              const nextSignatures = Array.from(new Set([...Array.from(importedSignatures), ...newSignatures]));
              await updateSettingsInDb({ importedSignatures: nextSignatures });
              
              console.log(`Auto-import: Found ${newOrders.length} new orders.`);
          }
      } catch (error) {
          console.error("Auto-import failed:", error);
      } finally {
          setIsCheckingForOrders(false);
      }
  }, [sheetUrl, importedSignatures, processImportedOrders]);

  // Effect: Check for new orders on mount (if URL exists) and then every hour
  useEffect(() => {
      if (sheetUrl) {
          checkForNewOrders();
          
          const intervalId = setInterval(checkForNewOrders, 60 * 60 * 1000); // 60 minutes
          return () => clearInterval(intervalId);
      }
  }, [sheetUrl, checkForNewOrders]);


  const handleApproveOrder = async (orderId: string) => {
    const orderToApprove = pendingOrders.find(o => o.id === orderId);
    if (orderToApprove) {
      await saveOrderToDb({ ...orderToApprove, approvalStatus: ApprovalStatus.APPROVED });
    }
  };

  const handleDenyOrder = async (orderId: string) => {
      await deleteOrderFromDb(orderId);
  };

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const dateA = parseOrderDateTime(a);
      const dateB = parseOrderDateTime(b);
      const timeA = dateA.getTime();
      const timeB = dateB.getTime();

      const aIsInvalid = isNaN(timeA);
      const bIsInvalid = isNaN(timeB);

      if (aIsInvalid && bIsInvalid) return 0;
      if (aIsInvalid) return 1;
      if (bIsInvalid) return -1;

      return timeA - timeB;
    });
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!activeDateRange.start || !activeDateRange.end) {
      return sortedOrders;
    }
    const startDate = new Date(activeDateRange.start + 'T00:00:00');
    const endDate = new Date(activeDateRange.end + 'T23:59:59');
    return sortedOrders.filter(order => {
      const orderDate = parseOrderDateTime(order);
      if (isNaN(orderDate.getTime())) {
          return false;
      }
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [sortedOrders, activeDateRange]);

  const dashboardStats = useMemo(() => {
    return {
      totalRevenue: filteredOrders.reduce((sum, order) => sum + (order.amountCollected || 0), 0),
      ordersToFollowUp: filteredOrders.filter(order => order.followUpStatus === FollowUpStatus.NEEDED).length,
      totalEmpanadasSold: filteredOrders.reduce((sum, order) => sum + order.totalMini + order.totalFullSize, 0),
    };
  }, [filteredOrders]);

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedOrder(null);
  };

  const handleOpenNewOrderModal = () => {
    setOrderToEdit(undefined);
    setIsNewOrderModalOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setOrderToEdit(order);
    setIsDetailModalOpen(false);
    setIsNewOrderModalOpen(true);
  };
  
  const handleEditPendingOrder = (order: Order) => {
    setOrderToEdit(order);
    setIsNewOrderModalOpen(true);
  };

  const handleUpdateFollowUp = async (orderId: string, status: FollowUpStatus) => {
      const orderToUpdate = allOrders.find(o => o.id === orderId);
      if (orderToUpdate) {
        const updatedOrder = { ...orderToUpdate, followUpStatus: status };
        await saveOrderToDb(updatedOrder);
        if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder(updatedOrder);
        }
      }
  };

  const handleSaveOrder = async (orderData: Order | Omit<Order, 'id'>) => {
    // Recalculate the total amount as the single source of truth
    const recalculatedAmountCharged = calculateOrderTotal(orderData);

    if ('id' in orderData) {
        // Existing Order
        const finalOrderData: Order = {
            ...orderData,
            amountCharged: recalculatedAmountCharged,
        };
        
        // If it was pending, approve it automatically
        if (finalOrderData.approvalStatus === ApprovalStatus.PENDING) {
             finalOrderData.approvalStatus = ApprovalStatus.APPROVED;
        }

        await saveOrderToDb(finalOrderData);
    } else {
        // New Order
        const newOrder: Order = {
            ...(orderData as Omit<Order, 'id'>),
            id: `order-${Date.now()}`,
            approvalStatus: ApprovalStatus.APPROVED,
            amountCharged: recalculatedAmountCharged,
        };
        await saveOrderToDb(newOrder);
    }
    setIsNewOrderModalOpen(false);
    setOrderToEdit(undefined);
};

  const handleAddNewFlavor = async (flavor: string, type: 'mini' | 'full') => {
      let newFlavors;
      if (type === 'mini') {
          if (!empanadaFlavors.includes(flavor)) {
              newFlavors = [...empanadaFlavors.slice(0, -1), flavor, 'Other'];
              // Optimistic update not strictly needed due to real-time listener, but feels faster
              setEmpanadaFlavors(newFlavors);
              await updateSettingsInDb({ empanadaFlavors: newFlavors });
          }
      } else {
          const fullFlavor = `Full ${flavor}`;
          if (!fullSizeEmpanadaFlavors.includes(fullFlavor)) {
              newFlavors = [...fullSizeEmpanadaFlavors.slice(0, -1), fullFlavor, 'Full Other'];
              setFullSizeEmpanadaFlavors(newFlavors);
              await updateSettingsInDb({ fullSizeEmpanadaFlavors: newFlavors });
          }
      }
  };
  
  const handleUpdateSheetUrl = async (url: string) => {
      setSheetUrl(url);
      await updateSettingsInDb({ sheetUrl: url });
  };

  const handlePrintSelected = (selectedToPrint: Order[]) => {
    setOrdersToPrint(selectedToPrint);
  };

  if (ordersToPrint.length > 0) {
    return <PrintPreviewPage orders={ordersToPrint} onExit={() => setOrdersToPrint([])} />;
  }

  if (isLoadingData) {
      return (
          <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-brand-orange mb-4"></div>
              <p className="text-brand-brown font-medium">Connecting to database...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <Header />
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
             <div className="bg-white p-1 rounded-lg border border-gray-300 shadow-sm flex items-center">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-brand-tan text-brand-brown font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <ListBulletIcon className="w-5 h-5" />
                    List
                </button>
                <button 
                    onClick={() => setViewMode('calendar')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-brand-tan text-brand-brown font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <CalendarDaysIcon className="w-5 h-5" />
                    Calendar
                </button>
            </div>
            <div className="flex gap-4 items-center">
                {sheetUrl && (
                    <div className="hidden md:flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                        {isCheckingForOrders ? (
                            <>
                                <div className="animate-spin h-3 w-3 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                                Checking...
                            </>
                        ) : (
                            <>
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Auto-refresh active
                            </>
                        )}
                    </div>
                )}
                <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center gap-2 bg-white text-brand-brown font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300 shadow-sm"
                >
                    <DocumentArrowDownIcon className="w-5 h-5" />
                    Import Orders
                </button>
                <button 
                    onClick={handleOpenNewOrderModal}
                    className="flex items-center gap-2 bg-brand-orange text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-opacity-90 transition-all"
                >
                    <PlusCircleIcon className="w-6 h-6" />
                    New Order
                </button>
            </div>
        </div>

        {viewMode === 'list' && (
            <DateRangeFilter onDateChange={setActiveDateRange} />
        )}

        {pendingOrders.length > 0 && (
          <div className="mb-8">
            <PendingOrders
              orders={pendingOrders}
              onApprove={handleApproveOrder}
              onDeny={handleDenyOrder}
              onSelectOrder={handleSelectOrder}
            />
          </div>
        )}
        
        <div>
            {viewMode === 'list' ? (
                <OrderList 
                    orders={filteredOrders} 
                    onSelectOrder={handleSelectOrder}
                    onPrintSelected={handlePrintSelected}
                />
            ) : (
                <CalendarView 
                    orders={orders}
                    onSelectOrder={handleSelectOrder}
                    onPrintSelected={handlePrintSelected}
                />
            )}
        </div>
        
        <div className="mt-8">
          <DashboardMetrics 
            stats={dashboardStats} 
            orders={filteredOrders} 
            empanadaFlavors={empanadaFlavors} 
            fullSizeEmpanadaFlavors={fullSizeEmpanadaFlavors} />
        </div>
        
        {isDetailModalOpen && selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={handleCloseDetailModal}
            onUpdateFollowUp={handleUpdateFollowUp}
            onEdit={handleEditOrder}
            onApprove={handleApproveOrder}
            onDeny={handleDenyOrder}
          />
        )}
        
        {isNewOrderModalOpen && (
            <OrderFormModal 
                order={orderToEdit}
                onClose={() => setIsNewOrderModalOpen(false)}
                onSave={handleSaveOrder}
                empanadaFlavors={empanadaFlavors}
                fullSizeEmpanadaFlavors={fullSizeEmpanadaFlavors}
                onAddNewFlavor={handleAddNewFlavor}
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
      </main>
    </div>
  );
}
