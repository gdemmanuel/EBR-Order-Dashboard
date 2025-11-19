
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
import { PlusCircleIcon, ListBulletIcon, CalendarDaysIcon, ArrowTopRightOnSquareIcon } from './components/icons/Icons';
import { Order, FollowUpStatus, ApprovalStatus } from './types';
import { subscribeToOrders, subscribeToSettings, saveOrderToDb, deleteOrderFromDb, updateSettingsInDb, saveOrdersBatch, AppSettings } from './services/dbService';
import { initialEmpanadaFlavors, initialFullSizeEmpanadaFlavors } from './data/mockData';
import { parseOrderDateTime } from './utils/dateUtils';

export default function App() {
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [empanadaFlavors, setEmpanadaFlavors] = useState<string[]>(initialEmpanadaFlavors);
  const [fullSizeEmpanadaFlavors, setFullSizeEmpanadaFlavors] = useState<string[]>(initialFullSizeEmpanadaFlavors);
  const [importedSignatures, setImportedSignatures] = useState<Set<string>>(new Set());
  
  const [view, setView] = useState<'dashboard' | 'list' | 'calendar'>('dashboard');
  const [dateFilter, setDateFilter] = useState<{ start?: string; end?: string }>({});
  
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | undefined>(undefined);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [printPreviewOrders, setPrintPreviewOrders] = useState<Order[] | null>(null);

  // Data Subscriptions
  useEffect(() => {
    const unsubscribeOrders = subscribeToOrders((updatedOrders) => {
        setOrders(updatedOrders);
    }, ApprovalStatus.APPROVED); // We might want all orders and filter locally

    const unsubscribeSettings = subscribeToSettings((settings: AppSettings) => {
        if (settings.empanadaFlavors) setEmpanadaFlavors(settings.empanadaFlavors);
        if (settings.fullSizeEmpanadaFlavors) setFullSizeEmpanadaFlavors(settings.fullSizeEmpanadaFlavors);
        if (settings.importedSignatures) setImportedSignatures(new Set(settings.importedSignatures));
    });

    return () => {
        unsubscribeOrders();
        unsubscribeSettings();
    };
  }, []);

  // Derived State
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


  // Handlers
  const handleSaveOrder = async (orderData: Order | Omit<Order, 'id'>) => {
      let orderToSave: Order;
      if ('id' in orderData) {
          orderToSave = orderData as Order;
      } else {
          orderToSave = {
              ...orderData,
              id: Date.now().toString(),
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
      // Convert partial orders to full orders with defaults
      const ordersToSave: Order[] = newOrders.map((pOrder, index) => ({
          id: `${Date.now()}-${index}`,
          pickupDate: pOrder.pickupDate || '',
          pickupTime: pOrder.pickupTime || '',
          customerName: pOrder.customerName || 'Unknown',
          contactMethod: pOrder.contactMethod || 'Unknown',
          phoneNumber: pOrder.phoneNumber || null,
          items: pOrder.items || [],
          totalFullSize: pOrder.items?.filter(i => i.name.includes('Full')).reduce((s, i) => s + i.quantity, 0) || 0,
          totalMini: pOrder.items?.filter(i => !i.name.includes('Full')).reduce((s, i) => s + i.quantity, 0) || 0,
          amountCharged: 0, // Needs manual calculation or updated logic during import
          deliveryRequired: pOrder.deliveryRequired || false,
          deliveryFee: 0,
          amountCollected: 0,
          paymentMethod: null,
          deliveryAddress: pOrder.deliveryAddress || null,
          followUpStatus: FollowUpStatus.NEEDED,
          paymentStatus: pOrder.paymentStatus as any || 'Pending',
          specialInstructions: pOrder.specialInstructions || null,
          approvalStatus: ApprovalStatus.PENDING
      } as Order));

      await saveOrdersBatch(ordersToSave);
      
      // Update signatures
      const updatedSignatures = [...Array.from(importedSignatures), ...newSignatures];
      await updateSettingsInDb({ importedSignatures: updatedSignatures });
      
      setIsImportModalOpen(false);
  };

  const handleUpdateSheetUrl = async (url: string) => {
      await updateSettingsInDb({ sheetUrl: url });
  };

  if (printPreviewOrders) {
      return <PrintPreviewPage orders={printPreviewOrders} onExit={() => setPrintPreviewOrders(null)} />;
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
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

      {/* Modals */}
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
