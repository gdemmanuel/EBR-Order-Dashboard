
import React, { useState, useMemo } from 'react';
import { Order, ApprovalStatus, FollowUpStatus, PricingSettings, Flavor } from '../types';
import { parseOrderDateTime } from '../utils/dateUtils';
import { saveOrderToDb, deleteOrderFromDb, updateSettingsInDb, saveOrdersBatch, AppSettings } from '../services/dbService';
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
import { PlusCircleIcon, ListBulletIcon, CalendarDaysIcon, ArrowTopRightOnSquareIcon, CogIcon, ScaleIcon } from './icons/Icons';
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
    // We need full settings accessible here to pass down
    settings?: AppSettings;
}

// Helper to get local date string YYYY-MM-DD
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
    settings // Optional prop, but we should construct a safe object if missing
}: AdminDashboardProps) {

    const [view, setView] = useState<'dashboard' | 'list' | 'calendar'>('dashboard');
    
    // Initialize filter with Today as start date
    const [dateFilter, setDateFilter] = useState<{ start?: string; end?: string }>({
        start: getTodayStr()
    });
    
    const [searchTerm, setSearchTerm] = useState(''); // Search State
    const [statusFilter, setStatusFilter] = useState<FollowUpStatus | null>(null); // Status Filter State
    
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
    const [orderToEdit, setOrderToEdit] = useState<Order | undefined>(undefined);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [printPreviewOrders, setPrintPreviewOrders] = useState<Order[] | null>(null);
    
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPrepListOpen, setIsPrepListOpen] = useState(false);
    
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

    // 1. Base Filtered Orders (by Date & Search) - Used for Dashboard Stats
    const filteredOrders = useMemo(() => {
        let result = activeOrders;

        // 1. Search Filter (Overrides Date Filter if active)
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            // Search by Customer Name or Phone
            return result.filter(o => 
                o.customerName.toLowerCase().includes(term) || 
                (o.phoneNumber && o.phoneNumber.includes(term))
            );
        }

        // 2. Date Filter (Only applies if no search term)
        if (dateFilter.start) {
            // Construct local midnight date strictly from components to avoid UTC shifts
            const [y, m, d] = dateFilter.start.split('-').map(Number);
            const start = new Date(y, m - 1, d);
            result = result.filter(o => parseOrderDateTime(o) >= start);
        }
        if (dateFilter.end) {
            // Construct local end-of-day date
            const [y, m, d] = dateFilter.end.split('-').map(Number);
            const end = new Date(y, m - 1, d);
            end.setHours(23,59,59,999);
            result = result.filter(o => parseOrderDateTime(o) <= end);
        }
        return result;
    }, [activeOrders, dateFilter, searchTerm]);

    // 2. List Orders (Base Filtered + Status Filter) - Used for List View
    const ordersForList = useMemo(() => {
        if (!statusFilter) return filteredOrders;
        return filteredOrders.filter(o => o.followUpStatus === statusFilter);
    }, [filteredOrders, statusFilter]);

    const stats = useMemo(() => {
        const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.amountCharged, 0);
        const ordersToFollowUp = filteredOrders.filter(o => o.followUpStatus === FollowUpStatus.NEEDED).length;
        const totalEmpanadasSold = filteredOrders.reduce((sum, o) => sum + o.totalMini + o.totalFullSize, 0);
        return { totalRevenue, ordersToFollowUp, totalEmpanadasSold };
    }, [filteredOrders]);

    // --- Logic ---
    
    // Safe Full Settings Object construction
    const safeSettings: AppSettings = settings || {
        empanadaFlavors,
        fullSizeEmpanadaFlavors,
        sheetUrl,
        importedSignatures: Array.from(importedSignatures),
        pricing: pricing || {
            mini: { basePrice: 1.75 },
            full: { basePrice: 3.00 },
            packages: [],
            salsas: []
        },
        prepSettings: prepSettings || { 
            lbsPer20: {}, 
            fullSizeMultiplier: 2.0, 
            discosPer: { mini: 1, full: 1 },
            discoPackSize: { mini: 10, full: 10 },
            productionRates: { mini: 40, full: 25 } 
        },
        scheduling: {
            enabled: true,
            intervalMinutes: 15,
            startTime: "09:00",
            endTime: "17:00",
            blockedDates: [],
            closedDays: [],
            dateOverrides: {}
        },
        laborWage: 15.00,
        materialCosts: {},
        discoCosts: { mini: 0.10, full: 0.15 },
        inventory: {}
    };

    // Fallback default pricing if loading
    const safePricing = safeSettings.pricing;

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

    const handleDeductInventory = async (order: Order) => {
        const currentInventory = { ...safeSettings.inventory };
        let changesMade = false;

        order.items.forEach(item => {
            // Check if item is salsa based on pricing definitions (avoid hardcoded 'Salsa' string if possible, 
            // but for now string check is safer as name format is "Salsa Name - Size")
            const isSalsa = safePricing.salsas.some(s => item.name.includes(s.name));
            if (isSalsa) return; 
            
            let flavor = item.name;
            let type: 'mini' | 'full' = 'mini';
            
            if (item.name.startsWith('Full ')) {
                type = 'full';
                flavor = item.name.replace('Full ', '');
            }
            
            if (!currentInventory[flavor]) {
                currentInventory[flavor] = { mini: 0, full: 0 };
            }
            
            // Deduct from inventory
            currentInventory[flavor][type] -= item.quantity;
            changesMade = true;
        });

        if (changesMade) {
            await updateSettingsInDb({ inventory: currentInventory });
            // Also mark order as completed
            await saveOrderToDb({ ...order, followUpStatus: FollowUpStatus.COMPLETED });
            if (selectedOrder && selectedOrder.id === order.id) {
                setSelectedOrder({ ...order, followUpStatus: FollowUpStatus.COMPLETED });
            }
        }
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
            const calculatedTotal = calculateOrderTotal(items, deliveryFee, safePricing, empanadaFlavors, fullSizeEmpanadaFlavors);
            
            // Calculate supply cost using current settings for imports
            const calculatedCost = calculateSupplyCost(items, safeSettings);

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
              totalCost: calculatedCost, // Save calculated cost
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="flex bg-white rounded-lg shadow-sm p-1 border border-brand-tan self-start">
                            <button onClick={() => { setView('dashboard'); setStatusFilter(null); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}>Dashboard</button>
                            <button onClick={() => setView('list')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === 'list' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}><ListBulletIcon className="w-4 h-4" /> List</button>
                            <button onClick={() => setView('calendar')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === 'calendar' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}><CalendarDaysIcon className="w-4 h-4" /> Calendar</button>
                        </div>
                    </div>

                    <div className="flex gap-3 flex-wrap w-full md:w-auto justify-end">
                        <button onClick={() => setIsPrepListOpen(true)} className="flex items-center gap-2 bg-white text-brand-brown border border-brand-tan font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><ScaleIcon className="w-5 h-5" /> Prep List</button>
                        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 bg-white text-brand-brown border border-brand-tan font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><CogIcon className="w-5 h-5" /> Settings</button>
                        <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 bg-white text-brand-brown border border-brand-tan font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><ArrowTopRightOnSquareIcon className="w-5 h-5" /> Import</button>
                        <button onClick={() => { setOrderToEdit(undefined); setIsNewOrderModalOpen(true); }} className="flex items-center gap-2 bg-brand-brown text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors shadow-sm"><PlusCircleIcon className="w-5 h-5" /> New Order</button>
                    </div>
                </div>

                <PendingOrders orders={pendingOrders} onApprove={handleApproveOrder} onDeny={handleDenyOrder} onSelectOrder={setSelectedOrder} />
                
                {pendingOrders.length > 0 && <div className="mb-8" />}
                
                {/* Date Filter is now visible for both dashboard and list views for consistency */}
                {view !== 'calendar' && (
                    <DateRangeFilter 
                        initialStartDate={dateFilter.start}
                        initialEndDate={dateFilter.end}
                        onDateChange={setDateFilter} 
                    />
                )}

                {view === 'dashboard' && (
                    <DashboardMetrics 
                        stats={stats} 
                        orders={filteredOrders} // Use base filtered orders so stats don't jump around
                        empanadaFlavors={empanadaFlavors.map(f => f.name)} 
                        fullSizeEmpanadaFlavors={fullSizeEmpanadaFlavors.map(f => f.name)} 
                        onFilterStatus={(status) => {
                            setStatusFilter(status);
                            setView('list');
                        }}
                    />
                )}

                {view === 'list' && (
                    <OrderList 
                        // Use list-specific orders (which might have extra status filters)
                        orders={ordersForList} 
                        onSelectOrder={setSelectedOrder} 
                        onPrintSelected={setPrintPreviewOrders} 
                        onDelete={confirmDeleteOrder} 
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        activeStatusFilter={statusFilter}
                        onClearStatusFilter={() => setStatusFilter(null)}
                    />
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
                    settings={safeSettings}
                    // Pass orders for busy slot calculation
                    existingOrders={activeOrders} 
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
                    onDeductInventory={handleDeductInventory}
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
                    settings={safeSettings}
                    onClose={() => setIsSettingsOpen(false)}
                />
            )}
            
            {isPrepListOpen && (
                <PrepListModal 
                    orders={filteredOrders} 
                    settings={safeSettings}
                    onClose={() => setIsPrepListOpen(false)} 
                    onUpdateSettings={updateSettingsInDb}
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
