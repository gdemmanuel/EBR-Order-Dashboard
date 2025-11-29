
import React, { useState, useMemo } from 'react';
import { Order, ApprovalStatus, FollowUpStatus, PricingSettings, Flavor } from '../types';
import { parseOrderDateTime } from '../utils/dateUtils';
import { saveOrderToDb, deleteOrderFromDb, updateSettingsInDb, saveOrdersBatch } from '../services/dbService';
import { calculateOrderTotal } from '../utils/pricingUtils';

import Header from './Header';
import DashboardMetrics from './DashboardMetrics';
import OrderList from './OrderList';
import CalendarView from './CalendarView';
import OrderFormModal from './OrderFormModal';
import OrderDetailModal from './OrderDetailModal';
import ImportOrderModal from './ImportOrderModal';
import PrintPreviewPage from './PrintPreviewPage';
import PendingOrders from './PendingOrders';
import DateRangeFilter from './DateRangeFilter';
import SettingsModal from './SettingsModal';
import ConfirmationModal from './ConfirmationModal';
import { PlusCircleIcon, ListBulletIcon, CalendarDaysIcon, ArrowTopRightOnSquareIcon, CogIcon } from './icons/Icons';
import { User } from 'firebase/auth';

interface AdminDashboardProps {
    user: User;
    orders: Order[];
    empanadaFlavors: Flavor[];
    fullSizeEmpanadaFlavors: Flavor[];
    importedSignatures: Set<string>;
    sheetUrl: string;
    pricing: PricingSettings;
}

export default function AdminDashboard({ 
    user, 
    orders, 
    empanadaFlavors, 
    fullSizeEmpanadaFlavors,
    importedSignatures,
    sheetUrl,
    pricing 
}: AdminDashboardProps) {

    const [view, setView] = useState<'dashboard' | 'list' | 'calendar'>('dashboard');
    const [dateFilter, setDateFilter] = useState<{ start?: string; end?: string }>({});
    
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
    const [orderToEdit, setOrderToEdit] = useState<Order | undefined>(undefined);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [printPreviewOrders, setPrintPreviewOrders] = useState<Order[] | null>(null);
    
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    // --- Derived State ---
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

    // --- Logic ---
    
    // Fallback default pricing if loading
    const safePricing = pricing || {
        mini: { basePrice: 1.75 },
        full: { basePrice: 3.00 },
        packages: [],
        salsaSmall: 2.00,
        salsaLarge: 4.00
    };

    const handleSaveOrder = async (orderData: Order | Omit<Order, 'id'>) => {
        // Note: Amount is already calculated by the form using dynamic pricing
        let orderToSave: Order;
        if ('id' in orderData) {
            orderToSave = { ...orderData as Order };
            if (orderToSave.approvalStatus === ApprovalStatus.PENDING) {
               orderToSave.approvalStatus = ApprovalStatus.APPROVED;
            }
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

    const confirmDeleteOrder = (orderId: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Order",
            message: "Are you sure you want to delete this order? This action cannot be undone.",
            onConfirm: async () => {
                await deleteOrderFromDb(orderId);
                if (selectedOrder?.id === orderId) setSelectedOrder(null);
                if (orderToEdit?.id === orderId) {
                    setOrderToEdit(undefined);
                    setIsNewOrderModalOpen(false);
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleAddNewFlavor = async (flavorName: string, type: 'mini' | 'full') => {
        // Check if flavor exists (by name)
        if (type === 'mini') {
            if (!empanadaFlavors.some(f => f.name === flavorName)) {
                await updateSettingsInDb({ empanadaFlavors: [...empanadaFlavors, { name: flavorName, visible: true }] });
            }
        } else {
            if (!fullSizeEmpanadaFlavors.some(f => f.name === flavorName)) {
                await updateSettingsInDb({ fullSizeEmpanadaFlavors: [...fullSizeEmpanadaFlavors, { name: flavorName, visible: true }] });
            }
        }
    };

    const handleUpdateFollowUp = async (orderId: string, status: FollowUpStatus) => {
        const order = orders.find(o => o.id === orderId);
        if (order) await saveOrderToDb({ ...order, followUpStatus: status });
    };
    
    const handleApproveOrder = async (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (order) await saveOrderToDb({ ...order, approvalStatus: ApprovalStatus.APPROVED });
    };

    const handleDenyOrder = async (orderId: string) => {
        await deleteOrderFromDb(orderId);
    };

    const handleOrdersImported = async (newOrders: Partial<Order>[], newSignatures: string[]) => {
        const ordersToSave: Order[] = newOrders.map((pOrder, index) => {
            const items = pOrder.items || [];
            const deliveryFee = 0; 
            // Calculate price using current settings for imports
            const calculatedTotal = calculateOrderTotal(items, deliveryFee, safePricing);
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

    if (printPreviewOrders) {
        return <PrintPreviewPage orders={printPreviewOrders} onExit={() => setPrintPreviewOrders(null)} />;
    }

    return (
        <div className="min-h-screen bg-brand-cream">
            <Header user={user} variant="admin" />
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div className="flex bg-white rounded-lg shadow-sm p-1 border border-brand-tan">
                        <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}>Dashboard</button>
                        <button onClick={() => setView('list')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === 'list' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}><ListBulletIcon className="w-4 h-4" /> List</button>
                        <button onClick={() => setView('calendar')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === 'calendar' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}><CalendarDaysIcon className="w-4 h-4" /> Calendar</button>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 bg-white text-brand-brown border border-brand-tan font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><CogIcon className="w-5 h-5" /> Settings</button>
                        <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 bg-white text-brand-brown border border-brand-tan font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><ArrowTopRightOnSquareIcon className="w-5 h-5" /> Import</button>
                        <button onClick={() => { setOrderToEdit(undefined); setIsNewOrderModalOpen(true); }} className="flex items-center gap-2 bg-brand-brown text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors shadow-sm"><PlusCircleIcon className="w-5 h-5" /> New Order</button>
                    </div>
                </div>

                <PendingOrders orders={pendingOrders} onApprove={handleApproveOrder} onDeny={handleDenyOrder} onSelectOrder={setSelectedOrder} />
                
                {pendingOrders.length > 0 && <div className="mb-8" />}

                {view === 'dashboard' && (
                    <>
                        <DateRangeFilter onDateChange={setDateFilter} />
                        <DashboardMetrics stats={stats} orders={filteredOrders} empanadaFlavors={empanadaFlavors.map(f => f.name)} fullSizeEmpanadaFlavors={fullSizeEmpanadaFlavors.map(f => f.name)} />
                    </>
                )}

                {view === 'list' && (
                    <OrderList orders={activeOrders} onSelectOrder={setSelectedOrder} onPrintSelected={setPrintPreviewOrders} onDelete={confirmDeleteOrder} />
                )}

                {view === 'calendar' && (
                    <CalendarView orders={activeOrders} onSelectOrder={setSelectedOrder} onPrintSelected={setPrintPreviewOrders} onDelete={confirmDeleteOrder} />
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
                    onDelete={confirmDeleteOrder}
                    pricing={safePricing}
                />
            )}

            {selectedOrder && (
                <OrderDetailModal 
                    order={selectedOrder} 
                    onClose={() => setSelectedOrder(null)}
                    onUpdateFollowUp={handleUpdateFollowUp}
                    onEdit={(order) => { setSelectedOrder(null); setOrderToEdit(order); setIsNewOrderModalOpen(true); }}
                    onApprove={selectedOrder.approvalStatus === ApprovalStatus.PENDING ? handleApproveOrder : undefined}
                    onDeny={selectedOrder.approvalStatus === ApprovalStatus.PENDING ? handleDenyOrder : undefined}
                    onDelete={confirmDeleteOrder}
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
            
            {isSettingsOpen && (
                <SettingsModal 
                    settings={{ 
                        empanadaFlavors, 
                        fullSizeEmpanadaFlavors, 
                        sheetUrl, 
                        importedSignatures: Array.from(importedSignatures), 
                        pricing: safePricing 
                    }}
                    onClose={() => setIsSettingsOpen(false)}
                />
            )}

            <ConfirmationModal 
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                isDangerous={true}
                confirmText="Delete"
            />
        </div>
    );
}
