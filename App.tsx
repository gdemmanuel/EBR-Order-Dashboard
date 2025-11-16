import React, { useState, useMemo } from 'react';
import { Order, FollowUpStatus } from './types';
import { initialOrders } from './data/mockData';
import Header from './components/Header';
import OrderList from './components/OrderList';
import OrderDetailModal from './components/OrderDetailModal';
import DashboardMetrics from './components/DashboardMetrics';
import OrderFormModal from './components/OrderFormModal';
import { PlusCircleIcon } from './components/icons/Icons';

const parseOrderDateTime = (order: Order): Date => {
  const [month, day, year] = order.pickupDate.split('/').map(Number);
  
  let timeStr = order.pickupTime.split('-')[0].trim().toLowerCase();
  const hasAmPm = timeStr.includes('am') || timeStr.includes('pm');
  let [hours, minutes] = timeStr.replace('am', '').replace('pm', '').split(':').map(Number);

  if (isNaN(hours)) hours = 0;
  if (isNaN(minutes)) minutes = 0;

  if (hasAmPm && timeStr.includes('pm') && hours < 12) {
    hours += 12;
  } else if (hasAmPm && timeStr.includes('am') && hours === 12) {
    hours = 0;
  } else if (!hasAmPm && hours > 0 && hours < 8) {
    // Assumption for times like '4:30' without AM/PM are likely afternoon
    hours += 12;
  }
  
  return new Date(year, month - 1, day, hours, minutes);
};


export default function App() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState<boolean>(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
  };
  
  const handleOpenEditModal = (order: Order) => {
    setSelectedOrder(null); // Close detail modal
    setOrderToEdit(order);
  };

  const handleCloseModals = () => {
    setSelectedOrder(null);
    setIsNewOrderModalOpen(false);
    setOrderToEdit(null);
  };

  const handleUpdateFollowUp = (orderId: string, status: FollowUpStatus) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, followUpStatus: status } : order
      )
    );
    if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? {...prev, followUpStatus: status} : null);
    }
  };

  const handleSaveOrder = (savedOrderData: Order | Omit<Order, 'id'>) => {
    if ('id' in savedOrderData) {
      // Update existing order
      setOrders(prev => prev.map(o => o.id === savedOrderData.id ? savedOrderData : o));
    } else {
      // Add new order
      const newOrderWithId: Order = {
        ...savedOrderData,
        id: `order-${Date.now()}-${Math.random()}`,
      };
      setOrders(prevOrders => [newOrderWithId, ...prevOrders]);
    }
    handleCloseModals();
  };

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start) start.setUTCHours(0, 0, 0, 0);
        if (end) end.setUTCHours(23, 59, 59, 999);

        filtered = orders.filter(order => {
            try {
                const orderDate = parseOrderDateTime(order);
                const afterStart = start ? orderDate >= start : true;
                const beforeEnd = end ? orderDate <= end : true;
                return afterStart && beforeEnd;
            } catch (e) {
                return false;
            }
        });
    }

    // Sort the orders by pickup date and time, latest first
    return filtered.slice().sort((a, b) => {
        const dateA = parseOrderDateTime(a);
        const dateB = parseOrderDateTime(b);
        return dateB.getTime() - dateA.getTime();
    });
  }, [orders, startDate, endDate]);

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.amountCharged, 0);
    const ordersToFollowUp = filteredOrders.filter(o => o.followUpStatus === FollowUpStatus.NEEDED).length;
    const totalEmpanadasSold = filteredOrders.reduce((sum, order) => sum + order.totalFullSize + order.totalMini, 0);
    return { totalRevenue, ordersToFollowUp, totalEmpanadasSold };
  }, [filteredOrders]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <Header />
      <main className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Order Dashboard</h1>
                <p className="text-gray-500 mt-1">Manage and track your empanada orders.</p>
            </div>
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="flex items-center gap-2 bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-orange-700 transition-colors duration-200"
            >
              <PlusCircleIcon className="w-5 h-5" />
              New Order
            </button>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-md mb-6 flex flex-wrap items-center gap-4">
            <span className="font-semibold text-gray-700">Filter by pickup date:</span>
            <div className="flex items-center gap-2">
              <label htmlFor="start-date" className="text-sm font-medium text-gray-600">From:</label>
              <input 
                type="date" 
                id="start-date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm" 
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="end-date" className="text-sm font-medium text-gray-600">To:</label>
              <input 
                type="date"
                id="end-date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
              />
            </div>
            {(startDate || endDate) && (
                <button
                    onClick={handleClearFilters}
                    className="text-sm text-orange-600 hover:underline font-medium"
                >
                    Clear Filter
                </button>
            )}
          </div>
          
          <DashboardMetrics stats={stats} orders={filteredOrders} />

          <div className="mt-8">
            <OrderList orders={filteredOrders} onSelectOrder={handleSelectOrder} />
          </div>
        </div>
      </main>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={handleCloseModals}
          onUpdateFollowUp={handleUpdateFollowUp}
          onEdit={handleOpenEditModal}
        />
      )}
      {(isNewOrderModalOpen || orderToEdit) && (
        <OrderFormModal 
          order={orderToEdit || undefined}
          onClose={handleCloseModals} 
          onSave={handleSaveOrder} 
        />
      )}
    </div>
  );
}