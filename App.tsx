

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
  
  // Orders and Flavor Data (Persisted)
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('orders');
    return saved ? JSON.parse(saved) : initialOrders;
  });
  
  const [pendingOrders, setPendingOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('pendingOrders');
    return saved ? JSON.parse(saved) : [];
  });

  const [empanadaFlavors, setEmpanadaFlavors] = useState<string[]>(() => {
      const saved = localStorage.getItem('empanadaFlavors');
      return saved ? JSON.parse(saved) : initialEmpanadaFlavors;
  });

  const [fullSizeEmpanadaFlavors, setFullSizeEmpanadaFlavors] = useState<string[]>(() => {
      const saved = localStorage.getItem('fullSizeEmpanadaFlavors');
      return saved ? JSON.parse(saved) : initialFullSizeEmpanadaFlavors;
  });

  // Automation Data (Persisted)
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
      return localStorage.getItem('sheetUrl') || '';
  });

  const [importedSignatures, setImportedSignatures] = useState<Set<string>>(() => {
      const saved = localStorage.getItem('importedSignatures');
      return saved ? new Set(JSON.parse(saved)) : new Set();
  });

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

  // -- EFFECTS FOR PERSISTENCE --
  
  useEffect(() => { localStorage.setItem('orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('pendingOrders', JSON.stringify(pendingOrders)); }, [pendingOrders]);
  useEffect(() => { localStorage.setItem('empanadaFlavors', JSON.stringify(empanadaFlavors)); }, [empanadaFlavors]);
  useEffect(() => { localStorage.setItem('fullSizeEmpanadaFlavors', JSON.stringify(fullSizeEmpanadaFlavors)); }, [fullSizeEmpanadaFlavors]);
  useEffect(() => { localStorage.setItem('sheetUrl', sheetUrl); }, [sheetUrl]);
  useEffect(() => { localStorage.setItem('importedSignatures', JSON.stringify(Array.from(importedSignatures))); }, [importedSignatures]);


  // -- HANDLERS --

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

  const handleOrdersImported = (importedOrders: Partial<Order>[], newSignatures: string[]) => {
    const newPendingOrders = processImportedOrders(importedOrders);

    setPendingOrders(prev => [...prev, ...newPendingOrders]);
    setImportedSignatures(prev => {
        const next = new Set(prev);
        newSignatures.forEach(sig => next.add(sig));
        return next;
    });
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
              setPendingOrders(prev => [...prev, ...processedOrders]);
              setImportedSignatures(prev => {
                  const next = new Set(prev);
                  newSignatures.forEach(sig => next.add(sig));
                  return next;
              });
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


  const handleApproveOrder = (orderId: string) => {
    const orderToApprove = pendingOrders.find(o => o.id === orderId);
    if (orderToApprove) {
      setOrders(prevOrders => [
        ...prevOrders, 
        { ...orderToApprove, approvalStatus: ApprovalStatus.APPROVED }
      ]);
      setPendingOrders(prevPending => prevPending.filter(o => o.id !== orderId));
    }
  };

  const handleDenyOrder = (orderId: string) => {
    setPendingOrders(prevPending => prevPending.filter(o => o.id !== orderId));
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

  const handleUpdateFollowUp = (orderId: string, status: FollowUpStatus) => {
    const update = (orderList: Order[]) => orderList.map(o => o.id === orderId ? { ...o, followUpStatus: status } : o);
    setOrders(update);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, followUpStatus: status } : null);
    }
  };

  const handleSaveOrder = (orderData: Order | Omit<Order, 'id'>) => {
    // Recalculate the total amount as the single source of truth, ignoring the form's calculation.
    const recalculatedAmountCharged = calculateOrderTotal(orderData);

    if ('id' in orderData) {
        // It's an existing order (or a pending order with a temp ID)
        const finalOrderData: Order = {
            ...orderData,
            amountCharged: recalculatedAmountCharged,
        };

        const isFromPending = pendingOrders.some(p => p.id === finalOrderData.id);
        
        if (isFromPending) {
            // This is an "edit and approve" action
            setPendingOrders(prev => prev.filter(p => p.id !== finalOrderData.id));
            setOrders(prev => [...prev, { ...finalOrderData, approvalStatus: ApprovalStatus.APPROVED }]);
        } else {
            // This is a standard edit of an already approved order
            setOrders(prev => prev.map(o => (o.id === finalOrderData.id ? finalOrderData : o)));
        }
    } else {
        // It's a brand new order
        const newOrder: Order = {
            ...(orderData as Omit<Order, 'id'>),
            id: `order-${Date.now()}`,
            approvalStatus: ApprovalStatus.APPROVED,
            amountCharged: recalculatedAmountCharged,
        };
        setOrders(prev => [...prev, newOrder]);
    }
    setIsNewOrderModalOpen(false);
    setOrderToEdit(undefined);
};

  const handleAddNewFlavor = (flavor: string, type: 'mini' | 'full') => {
    if (type === 'mini') {
      if (!empanadaFlavors.includes(flavor)) {
        setEmpanadaFlavors(prev => [...prev.slice(0, -1), flavor, 'Other']);
      }
    } else {
      const fullFlavor = `Full ${flavor}`;
      if (!fullSizeEmpanadaFlavors.includes(fullFlavor)) {
        setFullSizeEmpanadaFlavors(prev => [...prev.slice(0, -1), fullFlavor, 'Full Other']);
      }
    }
  };

  const handlePrintSelected = (selectedToPrint: Order[]) => {
    setOrdersToPrint(selectedToPrint);
  };

  if (ordersToPrint.length > 0) {
    return <PrintPreviewPage orders={ordersToPrint} onExit={() => setOrdersToPrint([])} />;
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
                onUpdateSheetUrl={setSheetUrl}
                existingSignatures={importedSignatures}
            />
        )}
      </main>
    </div>
  );
}