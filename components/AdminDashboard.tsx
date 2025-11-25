
import React, { useState, useMemo, useEffect } from 'react';
import { Order, ApprovalStatus, FollowUpStatus, PricingSettings, Flavor, Expense, WorkShift } from '../types';
import { parseOrderDateTime } from '../utils/dateUtils';
import { saveOrderToDb, deleteOrderFromDb, updateSettingsInDb, saveOrdersBatch, AppSettings, subscribeToExpenses, saveExpenseToDb, deleteExpenseFromDb, subscribeToShifts, saveShiftToDb, deleteShiftFromDb } from '../services/dbService';
import { calculateOrderTotal, calculateSupplyCost } from '../utils/pricingUtils';

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
import PrepListModal from './PrepListModal';
import ExpenseModal from './ExpenseModal';
import ShiftLogModal from './ShiftLogModal'; // Imported Shift Modal
import ReportsView from './ReportsView';
import { PlusCircleIcon, ListBulletIcon, CalendarDaysIcon, ArrowTopRightOnSquareIcon, CogIcon, ScaleIcon, ReceiptIcon, ChartBarIcon, BriefcaseIcon } from './icons/Icons';
import { User } from 'firebase/auth';

interface AdminDashboardProps {
    user: User;
    orders: Order[];
    empanadaFlavors: Flavor[];
    fullSizeEmpanadaFlavors: Flavor[];
    importedSignatures: Set<string>;
    sheetUrl: string;
    pricing: PricingSettings;
    prepSettings?: AppSettings['prepSettings'];
    settings?: AppSettings;
}

const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AdminDashboard({ 
    user, 
    orders, 
    empanadaFlavors, 
    fullSizeEmpanadaFlavors, 
    importedSignatures, 
    sheetUrl,
    pricing, 
    prepSettings,
    settings 
}: AdminDashboardProps) {

    const [view, setView] = useState<'dashboard' | 'list' | 'calendar' | 'reports'>('dashboard');
    const [dateFilter, setDateFilter] = useState<{ start?: string; end?: string }>({ start: getTodayStr() });
    const [searchTerm, setSearchTerm] = useState(''); 
    const [statusFilter, setStatusFilter] = useState<FollowUpStatus | null>(null); 
    const [viewingCancelled, setViewingCancelled] = useState(false); 
    
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
    const [orderToEdit, setOrderToEdit] = useState<Order | undefined>(undefined);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [printPreviewOrders, setPrintPreviewOrders] = useState<Order[] | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPrepListOpen, setIsPrepListOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isShiftLogOpen, setIsShiftLogOpen] = useState(false); // Shift Log Modal State
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    // Local Expenses State
    const [expenses, setExpenses] = useState<Expense[]>([]);
    // Local Shifts State
    const [shifts, setShifts] = useState<WorkShift[]>([]);

    useEffect(() => {
        const unsubscribeExpenses = subscribeToExpenses(setExpenses);
        const unsubscribeShifts = subscribeToShifts(setShifts);
        return () => {
            unsubscribeExpenses();
            unsubscribeShifts();
        };
    }, []);

    // Keep selectedOrder in sync with live orders to reflect changes immediately
    useEffect(() => {
        if (selectedOrder) {
            const liveOrder = orders.find(o => o.id === selectedOrder.id);
            if (liveOrder) {
                setSelectedOrder(liveOrder);
            }
        }
    }, [orders, selectedOrder?.id]);

    const activeOrders = useMemo(() => orders.filter(o => o.approvalStatus === ApprovalStatus.APPROVED), [orders]);
    const pendingOrders = useMemo(() => orders.filter(o => o.approvalStatus === ApprovalStatus.PENDING), [orders]);
    const cancelledOrders = useMemo(() => orders.filter(o => o.approvalStatus === ApprovalStatus.CANCELLED), [orders]);

    const filteredOrders = useMemo(() => {
        let result = viewingCancelled ? cancelledOrders : activeOrders;
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            return result.filter(o => o.customerName.toLowerCase().includes(term) || (o.phoneNumber && o.phoneNumber.includes(term)));
        }
        if (dateFilter.start) {
            const [y, m, d] = dateFilter.start.split('-').map(Number);
            const start = new Date(y, m - 1, d);
            result = result.filter(o => parseOrderDateTime(o) >= start);
        }
        if (dateFilter.end) {
            const [y, m, d] = dateFilter.end.split('-').map(Number);
            const end = new Date(y, m - 1, d);
            end.setHours(23,59,59,999);
            result = result.filter(o => parseOrderDateTime(o) <= end);
        }
        return result;
    }, [activeOrders, cancelledOrders, viewingCancelled, dateFilter, searchTerm]);

    const ordersForList = useMemo(() => {
        if (!statusFilter) return filteredOrders;
        return filteredOrders.filter(o => o.followUpStatus === statusFilter);
    }, [filteredOrders, statusFilter]);

    const currentListFilter = viewingCancelled ? 'CANCELLED' : (statusFilter || 'ALL');
    const handleListFilterChange = (filter: string) => {
        if (filter === 'CANCELLED') { setViewingCancelled(true); setStatusFilter(null); } else if (filter === 'ALL') { setViewingCancelled(false); setStatusFilter(null); } else { setViewingCancelled(false); setStatusFilter(filter as FollowUpStatus); }
    };

    const stats = useMemo(() => {
        let result = activeOrders;
        if (dateFilter.start) {
            const [y, m, d] = dateFilter.start.split('-').map(Number);
            const start = new Date(y, m - 1, d);
            result = result.filter(o => parseOrderDateTime(o) >= start);
        }
        if (dateFilter.end) {
            const [y, m, d] = dateFilter.end.split('-').map(Number);
            const end = new Date(y, m - 1, d);
            end.setHours(23,59,59,999);
            result = result.filter(o => parseOrderDateTime(o) <= end);
        }
        const totalRevenue = result.reduce((sum, o) => sum + o.amountCharged, 0);
        const ordersToFollowUp = result.filter(o => o.followUpStatus === FollowUpStatus.NEEDED).length;
        const totalEmpanadasSold = result.reduce((sum, o) => sum + o.totalMini + o.totalFullSize, 0);
        return { totalRevenue, ordersToFollowUp, totalEmpanadasSold };
    }, [activeOrders, dateFilter]);

    const safeSettings: AppSettings = settings || { 
        motd: '',
        empanadaFlavors, 
        fullSizeEmpanadaFlavors, 
        sheetUrl, 
        importedSignatures: Array.from(importedSignatures), 
        pricing: pricing || { mini: { basePrice: 1.75 }, full: { basePrice: 3.00 }, packages: [], salsas: [] }, 
        prepSettings: prepSettings || { lbsPer20: {}, fullSizeMultiplier: 2.0, discosPer: { mini: 1, full: 1 }, discoPackSize: { mini: 10, full: 10 }, productionRates: { mini: 40, full: 25 } }, 
        scheduling: { enabled: true, intervalMinutes: 15, startTime: "09:00", endTime: "17:00", blockedDates: [], closedDays: [], dateOverrides: {} }, 
        messageTemplates: {
            followUpNeeded: "Hi {firstName}! This is Rose from Empanadas by Rose. Thank you for placing an order. Please confirm your order for {deliveryType} on {date} at {time} as follows:\n{totals}\n{items}",
            pendingConfirmation: "Perfect! The total is ${total}. Cash on {deliveryType}, please. I'll see you on {date} at {time}.\nThank you for your order!"
        },
        laborWage: 15.00, 
        materialCosts: {}, 
        discoCosts: { mini: 0.10, full: 0.15 }, 
        inventory: {}, 
        expenseCategories: ['Packaging', 'Marketing', 'Rent', 'Utilities', 'Equipment', 'Other'],
        employees: []
    };
    const safePricing = safeSettings.pricing;

    const handleSaveOrder = async (orderData: Order | Omit<Order, 'id'>) => {
        let orderToSave: Order;
        if ('id' in orderData) { orderToSave = { ...orderData as Order }; if (orderToSave.approvalStatus === ApprovalStatus.PENDING) { orderToSave.approvalStatus = ApprovalStatus.APPROVED; } } else { orderToSave = { ...orderData, id: Date.now().toString() }; }
        await saveOrderToDb(orderToSave);
        setIsNewOrderModalOpen(false);
        setOrderToEdit(undefined);
    };

    const handleDeductInventory = async (order: Order) => {
        const currentInventory = { ...safeSettings.inventory };
        let changesMade = false;
        order.items.forEach(item => {
            const isSalsa = safePricing.salsas.some(s => item.name.includes(s.name));
            if (isSalsa) return; 
            let flavor = item.name;
            let type: 'mini' | 'full' = 'mini';
            if (item.name.startsWith('Full ')) { type = 'full'; flavor = item.name.replace('Full ', ''); }
            if (!currentInventory[flavor]) { currentInventory[flavor] = { mini: 0, full: 0 }; }
            currentInventory[flavor][type] -= item.quantity;
            changesMade = true;
        });
        if (changesMade) { await updateSettingsInDb({ inventory: currentInventory }); await saveOrderToDb({ ...order, followUpStatus: FollowUpStatus.COMPLETED }); if (selectedOrder && selectedOrder.id === order.id) { setSelectedOrder({ ...order, followUpStatus: FollowUpStatus.COMPLETED }); } }
    };

    const confirmDeleteOrder = (orderId: string) => { setConfirmModal({ isOpen: true, title: "Delete Order", message: "Are you sure you want to delete this order? This action cannot be undone.", onConfirm: async () => { await deleteOrderFromDb(orderId); if (selectedOrder?.id === orderId) setSelectedOrder(null); if (orderToEdit?.id === orderId) { setOrderToEdit(undefined); setIsNewOrderModalOpen(false); } setConfirmModal(prev => ({ ...prev, isOpen: false })); } }); };
    const confirmDeleteShift = (shiftId: string) => { setConfirmModal({ isOpen: true, title: "Delete Shift", message: "Are you sure you want to delete this shift record?", onConfirm: async () => { await deleteShiftFromDb(shiftId); setConfirmModal(prev => ({ ...prev, isOpen: false })); } }); };

    const handleAddNewFlavor = async (flavorName: string, type: 'mini' | 'full') => { if (type === 'mini') { if (!empanadaFlavors.some(f => f.name === flavorName)) { await updateSettingsInDb({ empanadaFlavors: [...empanadaFlavors, { name: flavorName, visible: true }] }); } } else { if (!fullSizeEmpanadaFlavors.some(f => f.name === flavorName)) { await updateSettingsInDb({ fullSizeEmpanadaFlavors: [...fullSizeEmpanadaFlavors, { name: flavorName, visible: true }] }); } } };
    
    const handleUpdateFollowUp = async (orderId: string, status: FollowUpStatus) => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            const updatedOrder = { ...order, followUpStatus: status };
            // Update local state immediately for responsiveness
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder(updatedOrder);
            }
            await saveOrderToDb(updatedOrder);
        }
    };

    const handleApproveOrder = async (orderId: string) => { const order = orders.find(o => o.id === orderId); if (order) await saveOrderToDb({ ...order, approvalStatus: ApprovalStatus.APPROVED }); };
    const handleDenyOrder = async (orderId: string) => { const order = orders.find(o => o.id === orderId); if (order) await saveOrderToDb({ ...order, approvalStatus: ApprovalStatus.CANCELLED }); };
    const handleOrdersImported = async (newOrders: Partial<Order>[], newSignatures: string[]) => { const ordersToSave: Order[] = newOrders.map((pOrder, index) => { const items = pOrder.items || []; const deliveryFee = 0; const calculatedTotal = calculateOrderTotal(items, deliveryFee, safePricing, empanadaFlavors, fullSizeEmpanadaFlavors); const calculatedCost = calculateSupplyCost(items, safeSettings); return { id: `${Date.now()}-${index}`, pickupDate: pOrder.pickupDate || '', pickupTime: pOrder.pickupTime || '', customerName: pOrder.customerName || 'Unknown', contactMethod: pOrder.contactMethod || 'Unknown', phoneNumber: pOrder.phoneNumber || null, items: items, totalFullSize: items.filter(i => i.name.includes('Full')).reduce((s, i) => s + i.quantity, 0), totalMini: items.filter(i => !i.name.includes('Full') && !i.name.includes('Salsa')).reduce((s, i) => s + i.quantity, 0), amountCharged: calculatedTotal, totalCost: calculatedCost, deliveryRequired: pOrder.deliveryRequired || false, deliveryFee: deliveryFee, amountCollected: 0, paymentMethod: null, deliveryAddress: pOrder.deliveryAddress || null, followUpStatus: FollowUpStatus.NEEDED, paymentStatus: pOrder.paymentStatus as any || 'Pending', specialInstructions: pOrder.specialInstructions || null, approvalStatus: ApprovalStatus.PENDING } as Order; }); await saveOrdersBatch(ordersToSave); const updatedSignatures = [...Array.from(importedSignatures), ...newSignatures]; await updateSettingsInDb({ importedSignatures: updatedSignatures }); setIsImportModalOpen(false); };
    const handleUpdateSheetUrl = async (url: string) => { await updateSettingsInDb({ sheetUrl: url }); };

    if (printPreviewOrders) { return <PrintPreviewPage orders={printPreviewOrders} onExit={() => setPrintPreviewOrders(null)} />; }

    return (
        <div className="min-h-screen bg-brand-cream">
            <Header user={user} variant="admin" />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="flex bg-white rounded-lg shadow-sm p-1 border border-brand-tan self-start">
                            <button onClick={() => { setView('dashboard'); setStatusFilter(null); setViewingCancelled(false); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}>Dashboard</button>
                            <button onClick={() => setView('list')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === 'list' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}><ListBulletIcon className="w-4 h-4" /> List</button>
                            <button onClick={() => setView('calendar')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === 'calendar' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}><CalendarDaysIcon className="w-4 h-4" /> Calendar</button>
                            <button onClick={() => setView('reports')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === 'reports' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}><ChartBarIcon className="w-4 h-4" /> Reports</button>
                        </div>
                    </div>
                    <div className="flex gap-3 flex-wrap w-full md:w-auto justify-end">
                        <button onClick={() => setIsShiftLogOpen(true)} className="flex items-center gap-2 bg-white text-brand-brown border border-brand-tan font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><BriefcaseIcon className="w-5 h-5" /> Log Hours</button>
                        <button onClick={() => setIsExpenseModalOpen(true)} className="flex items-center gap-2 bg-white text-brand-brown border border-brand-tan font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><ReceiptIcon className="w-5 h-5" /> Expenses</button>
                        <button onClick={() => setIsPrepListOpen(true)} className="flex items-center gap-2 bg-white text-brand-brown border border-brand-tan font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><ScaleIcon className="w-5 h-5" /> Prep List</button>
                        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 bg-white text-brand-brown border border-brand-tan font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><CogIcon className="w-5 h-5" /> Settings</button>
                        <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 bg-white text-brand-brown border border-brand-tan font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><ArrowTopRightOnSquareIcon className="w-5 h-5" /> Import</button>
                        <button onClick={() => { setOrderToEdit(undefined); setIsNewOrderModalOpen(true); }} className="flex items-center gap-2 bg-brand-brown text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors shadow-sm"><PlusCircleIcon className="w-5 h-5" /> New Order</button>
                    </div>
                </div>

                <PendingOrders orders={pendingOrders} onApprove={handleApproveOrder} onDeny={handleDenyOrder} onSelectOrder={setSelectedOrder} />
                {pendingOrders.length > 0 && <div className="mb-8" />}
                {view !== 'calendar' && <DateRangeFilter initialStartDate={dateFilter.start} initialEndDate={dateFilter.end} onDateChange={setDateFilter} />}

                {view === 'dashboard' && (
                    <DashboardMetrics 
                        stats={stats} 
                        orders={activeOrders} 
                        empanadaFlavors={empanadaFlavors.map(f => f.name)} 
                        fullSizeEmpanadaFlavors={fullSizeEmpanadaFlavors.map(f => f.name)} 
                        pendingCount={pendingOrders.length}
                        cancelledCount={cancelledOrders.length}
                        onFilterStatus={(status) => {
                            if (status === 'CANCELLED') { setViewingCancelled(true); setStatusFilter(null); } else { setViewingCancelled(false); setStatusFilter(status); }
                            setView('list');
                        }}
                    />
                )}

                {view === 'list' && (
                    <OrderList 
                        title={viewingCancelled ? 'Cancelled Orders' : 'Active Orders'}
                        orders={ordersForList} 
                        onSelectOrder={setSelectedOrder} 
                        onPrintSelected={setPrintPreviewOrders} 
                        onDelete={confirmDeleteOrder} 
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        currentFilter={currentListFilter}
                        onFilterChange={handleListFilterChange}
                    />
                )}

                {view === 'calendar' && (
                    <CalendarView 
                        orders={activeOrders} 
                        shifts={shifts} // Passing shifts to calendar
                        onSelectOrder={setSelectedOrder} 
                        onPrintSelected={setPrintPreviewOrders} 
                        onDelete={confirmDeleteOrder} 
                        settings={safeSettings} 
                    />
                )}
                
                {view === 'reports' && (
                    <ReportsView 
                        orders={activeOrders} 
                        expenses={expenses} 
                        shifts={shifts} // Passing shifts to reports
                        settings={safeSettings} 
                        dateRange={dateFilter} 
                        onDeleteExpense={deleteExpenseFromDb}
                    />
                )}
            </main>

            {isNewOrderModalOpen && <OrderFormModal order={orderToEdit} onClose={() => setIsNewOrderModalOpen(false)} onSave={handleSaveOrder} empanadaFlavors={empanadaFlavors} fullSizeEmpanadaFlavors={fullSizeEmpanadaFlavors} onAddNewFlavor={handleAddNewFlavor} onDelete={confirmDeleteOrder} pricing={safePricing} settings={safeSettings} existingOrders={orders} />}
            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdateFollowUp={handleUpdateFollowUp} onEdit={(order) => { setSelectedOrder(null); setOrderToEdit(order); setIsNewOrderModalOpen(true); }} onApprove={selectedOrder.approvalStatus === ApprovalStatus.PENDING ? handleApproveOrder : undefined} onDeny={selectedOrder.approvalStatus === ApprovalStatus.PENDING ? handleDenyOrder : (orderId) => saveOrderToDb({ ...selectedOrder, approvalStatus: ApprovalStatus.CANCELLED })} onDelete={confirmDeleteOrder} onDeductInventory={handleDeductInventory} />}
            {isImportModalOpen && <ImportOrderModal onClose={() => setIsImportModalOpen(false)} onOrdersImported={handleOrdersImported} onUpdateSheetUrl={handleUpdateSheetUrl} existingSignatures={importedSignatures} />}
            {isSettingsOpen && <SettingsModal settings={safeSettings} onClose={() => setIsSettingsOpen(false)} />}
            {isExpenseModalOpen && (
                <ExpenseModal 
                    expenses={expenses} 
                    categories={safeSettings.expenseCategories} 
                    onClose={() => setIsExpenseModalOpen(false)} 
                    onSave={saveExpenseToDb} 
                    onDelete={deleteExpenseFromDb} 
                />
            )}
            {isShiftLogOpen && (
                <ShiftLogModal
                    employees={safeSettings.employees || []}
                    onClose={() => setIsShiftLogOpen(false)}
                    onSave={saveShiftToDb}
                />
            )}
            {isPrepListOpen && <PrepListModal orders={activeOrders.filter(o => { const d = parseOrderDateTime(o); if (dateFilter.start) { const [y, m, d_start] = dateFilter.start.split('-').map(Number); if (d < new Date(y, m - 1, d_start)) return false; } if (dateFilter.end) { const [y, m, d_end] = dateFilter.end.split('-').map(Number); const end = new Date(y, m - 1, d_end); end.setHours(23,59,59,999); if (d > end) return false; } return true; })} settings={safeSettings} onClose={() => setIsPrepListOpen(false)} onUpdateSettings={updateSettingsInDb} />}
            <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} isDangerous={true} confirmText="Delete" />
        </div>
    );
}
