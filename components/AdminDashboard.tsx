
import React, { useState, useMemo, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { Order, AppSettings, PricingSettings, Flavor, FollowUpStatus, ApprovalStatus, Expense, WorkShift } from '../types';
import { saveOrderToDb, deleteOrderFromDb, saveOrdersBatch, saveExpenseToDb, deleteExpenseFromDb, saveShiftToDb, subscribeToExpenses, subscribeToShifts, updateSettingsInDb, deleteShiftFromDb } from '../services/dbService';
import { parseOrderDateTime } from '../utils/dateUtils';

import Header from './Header';
import DashboardMetrics from './DashboardMetrics';
import OrderList from './OrderList';
import CalendarView from './CalendarView';
import ReportsView from './ReportsView';
import PendingOrders from './PendingOrders';
import DateRangeFilter from './DateRangeFilter';

import OrderFormModal from './OrderFormModal';
import OrderDetailModal from './OrderDetailModal';
import SettingsModal from './SettingsModal';
import PrepListModal from './PrepListModal';
import ExpenseModal from './ExpenseModal';
import ShiftLogModal from './ShiftLogModal';
import PrintPreviewPage from './PrintPreviewPage';

import { 
    ChartPieIcon, ListBulletIcon, CalendarDaysIcon, PresentationChartBarIcon, 
    PlusIcon, CogIcon, ScaleIcon, CurrencyDollarIcon, 
    ClockIcon
} from './icons/Icons';

interface AdminDashboardProps {
    user: firebase.User;
    orders: Order[];
    empanadaFlavors: Flavor[];
    fullSizeEmpanadaFlavors: Flavor[];
    importedSignatures: Set<string>;
    sheetUrl: string;
    pricing: PricingSettings;
    prepSettings: AppSettings['prepSettings'];
    settings: AppSettings;
}

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
    // View State
    const [view, setView] = useState<'dashboard' | 'list' | 'calendar' | 'reports' | 'print'>('dashboard');
    
    // Data State (Expenses & Shifts loaded locally here)
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [shifts, setShifts] = useState<WorkShift[]>([]);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<FollowUpStatus | null>(null);
    
    // Helper to get local today string YYYY-MM-DD
    const getTodayStr = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Initialize Date Range to default to Today's start date
    const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({
        start: getTodayStr()
    });
    
    const [viewingCancelled, setViewingCancelled] = useState(false);

    // Modal State
    const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null); // For detail view
    const [editingOrder, setEditingOrder] = useState<Order | null>(null); // For form view
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPrepListOpen, setIsPrepListOpen] = useState(false);
    const [isExpenseOpen, setIsExpenseOpen] = useState(false);
    const [isShiftLogOpen, setIsShiftLogOpen] = useState(false);
    
    // Printing State
    const [ordersToPrint, setOrdersToPrint] = useState<Order[]>([]);

    // Subscribe to Expenses and Shifts
    useEffect(() => {
        const unsubExpenses = subscribeToExpenses(setExpenses);
        const unsubShifts = subscribeToShifts(setShifts);
        return () => { unsubExpenses(); unsubShifts(); };
    }, []);

    // --- Derived Data ---

    const allOrders = useMemo(() => orders, [orders]);

    // 1. Pending Orders
    const pendingOrders = useMemo(() => 
        allOrders.filter(o => o.approvalStatus === ApprovalStatus.PENDING)
    , [allOrders]);

    // 2. Cancelled Orders
    const cancelledOrders = useMemo(() => 
        allOrders.filter(o => o.approvalStatus === ApprovalStatus.CANCELLED || o.approvalStatus === ApprovalStatus.DENIED)
    , [allOrders]);

    // 3. Active Orders (Approved)
    const activeOrders = useMemo(() => 
        allOrders.filter(o => o.approvalStatus === ApprovalStatus.APPROVED)
    , [allOrders]);

    // 4. Date-Filtered Active Orders (For Dashboard Stats & Prep List)
    const dateFilteredDashboardOrders = useMemo(() => {
        let result = activeOrders;
        if (dateRange.start) {
            // Explicitly parse YYYY-MM-DD to local time components to avoid UTC offsets
            const [y, m, d] = dateRange.start.split('-').map(Number);
            const start = new Date(y, m - 1, d, 0, 0, 0, 0);
            result = result.filter(o => parseOrderDateTime(o) >= start);
        }
        if (dateRange.end) {
            // Explicitly parse YYYY-MM-DD to local time components
            const [y, m, d] = dateRange.end.split('-').map(Number);
            const end = new Date(y, m - 1, d, 23, 59, 59, 999);
            result = result.filter(o => parseOrderDateTime(o) <= end);
        }
        return result;
    }, [activeOrders, dateRange]);

    // 5. Filtered Active Orders (for List View - includes search/status)
    const filteredOrders = useMemo(() => {
        let result = viewingCancelled ? cancelledOrders : activeOrders;

        // Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(o => o.customerName.toLowerCase().includes(lower));
        }

        // Status Filter
        if (statusFilter) {
            result = result.filter(o => o.followUpStatus === statusFilter);
        }

        // Date Range Filter
        if (dateRange.start) {
            const [y, m, d] = dateRange.start.split('-').map(Number);
            const start = new Date(y, m - 1, d, 0, 0, 0, 0);
            result = result.filter(o => parseOrderDateTime(o) >= start);
        }
        if (dateRange.end) {
            const [y, m, d] = dateRange.end.split('-').map(Number);
            const end = new Date(y, m - 1, d, 23, 59, 59, 999);
            result = result.filter(o => parseOrderDateTime(o) <= end);
        }

        return result;
    }, [activeOrders, cancelledOrders, viewingCancelled, searchTerm, statusFilter, dateRange]);

    // Stats Calculation
    const stats = useMemo(() => {
        const relevantOrders = dateFilteredDashboardOrders; 
        const totalRevenue = relevantOrders.reduce((sum, o) => sum + o.amountCharged, 0);
        const ordersToFollowUp = relevantOrders.filter(o => o.followUpStatus === FollowUpStatus.NEEDED).length;
        const totalEmpanadasSold = relevantOrders.reduce((sum, o) => sum + o.totalMini + o.totalFullSize, 0);

        return { totalRevenue, ordersToFollowUp, totalEmpanadasSold };
    }, [dateFilteredDashboardOrders]);


    // --- Actions ---

    const handleSaveOrder = async (order: Order | Omit<Order, 'id'>) => {
        let orderToSave = order as Order;
        if (!orderToSave.id) {
            orderToSave.id = Date.now().toString();
        }
        await saveOrderToDb(orderToSave);
        setIsOrderFormOpen(false);
        setEditingOrder(null);
    };

    const handleDeleteOrder = async (id: string) => {
        await deleteOrderFromDb(id);
        if (selectedOrder?.id === id) setSelectedOrder(null);
        if (editingOrder?.id === id) setIsOrderFormOpen(false);
    };

    const handleUpdateStatus = async (id: string, status: FollowUpStatus, updates?: Partial<Order>) => {
        const order = allOrders.find(o => o.id === id);
        if (order) {
            await saveOrderToDb({ ...order, ...updates, followUpStatus: status });
        }
    };

    const handleApproval = async (id: string, approved: boolean) => {
        const order = allOrders.find(o => o.id === id);
        if (!order) return;
        const newStatus = approved ? ApprovalStatus.APPROVED : ApprovalStatus.DENIED;
        await saveOrderToDb({ ...order, approvalStatus: newStatus });
        setSelectedOrder(null); // Close modal on action
    };

    const handleDeductInventory = async (order: Order, updates?: Partial<Order>) => {
        const currentInventory = { ...(settings.inventory || {}) };
        
        order.items.forEach(item => {
            const isFull = item.name.startsWith('Full ');
            const flavorName = item.name.replace('Full ', '');
            
            if (!currentInventory[flavorName]) {
                currentInventory[flavorName] = { mini: 0, full: 0 };
            }
            
            if (isFull) {
                currentInventory[flavorName].full = Math.max(0, currentInventory[flavorName].full - item.quantity);
            } else {
                currentInventory[flavorName].mini = Math.max(0, currentInventory[flavorName].mini - item.quantity);
            }
        });

        await updateSettingsInDb({ inventory: currentInventory });
        await saveOrderToDb({ ...order, ...updates, followUpStatus: FollowUpStatus.COMPLETED });
        setSelectedOrder(null); 
    };

    const handlePrint = (selectedOrders: Order[]) => {
        setOrdersToPrint(selectedOrders);
        setView('print');
    };

    const markOrdersPrinted = async () => {
        // Only update orders that aren't already marked as printed to avoid unnecessary writes
        const toUpdate = ordersToPrint.filter(o => !o.hasPrinted).map(o => ({ ...o, hasPrinted: true }));
        if (toUpdate.length > 0) {
            await saveOrdersBatch(toUpdate);
        }
    };

    const handleUpdateIngredientCost = async (ingredientId: string, newCost: number, effectiveDate: string) => {
        const currentIngredients = settings.ingredients || [];
        const updatedIngredients = currentIngredients.map(ing => {
            if (ing.id === ingredientId) {
                const existingHistory = ing.priceHistory || [];
                // Add new history entry
                const newHistory = [
                    ...existingHistory,
                    { date: effectiveDate, price: newCost }
                ];
                // Keep history sorted by date descending for easier lookup
                newHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                return { 
                    ...ing, 
                    cost: newCost, // Always update current cost
                    priceHistory: newHistory
                };
            }
            return ing;
        });
        await updateSettingsInDb({ ingredients: updatedIngredients });
    };

    // Render
    if (view === 'print') {
        return (
            <PrintPreviewPage 
                orders={ordersToPrint} 
                onExit={() => setView('list')} 
                onMarkAsPrinted={markOrdersPrinted}
            />
        );
    }

    return (
        <div className="min-h-screen bg-brand-cream flex flex-col">
            <Header user={user} variant="admin" />
            
            {/* Improved Toolbar */}
            <div className="bg-white shadow-sm border-b border-brand-tan/50 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Top Row: View Switchers & Main Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-4">
                        
                        {/* View Switcher */}
                        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg self-start md:self-center">
                            <button 
                                onClick={() => setView('dashboard')}
                                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-white shadow-sm text-brand-orange' : 'text-gray-600 hover:text-brand-brown'}`}
                            >
                                <ChartPieIcon className="w-4 h-4 mr-2" /> Dashboard
                            </button>
                            <button 
                                onClick={() => setView('list')}
                                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'list' ? 'bg-white shadow-sm text-brand-orange' : 'text-gray-600 hover:text-brand-brown'}`}
                            >
                                <ListBulletIcon className="w-4 h-4 mr-2" /> Orders
                            </button>
                            <button 
                                onClick={() => setView('calendar')}
                                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-white shadow-sm text-brand-orange' : 'text-gray-600 hover:text-brand-brown'}`}
                            >
                                <CalendarDaysIcon className="w-4 h-4 mr-2" /> Calendar
                            </button>
                            <button 
                                onClick={() => setView('reports')}
                                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'reports' ? 'bg-white shadow-sm text-brand-orange' : 'text-gray-600 hover:text-brand-brown'}`}
                            >
                                <PresentationChartBarIcon className="w-4 h-4 mr-2" /> Reports
                            </button>
                        </div>

                        {/* Expanded Action Bar - Big Widgets */}
                        <div className="grid grid-cols-3 sm:flex sm:space-x-3 gap-2 w-full md:w-auto">
                            <button 
                                onClick={() => setIsOrderFormOpen(true)} 
                                className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 py-2 bg-brand-orange/10 hover:bg-brand-orange hover:text-white text-brand-brown rounded-lg transition-all group"
                                title="Add Order"
                            >
                                <PlusIcon className="w-5 h-5 sm:w-4 sm:h-4" /> 
                                <span className="text-xs sm:text-sm font-bold">New Order</span>
                            </button>
                            
                            <button 
                                onClick={() => setIsPrepListOpen(true)} 
                                className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 py-2 bg-white border border-brand-tan hover:border-brand-orange hover:text-brand-orange text-brand-brown rounded-lg transition-all"
                                title="Prep List"
                            >
                                <ScaleIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                                <span className="text-xs sm:text-sm font-medium">Prep List</span>
                            </button>
                            
                            <button 
                                onClick={() => setIsExpenseOpen(true)} 
                                className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 py-2 bg-white border border-brand-tan hover:border-brand-orange hover:text-brand-orange text-brand-brown rounded-lg transition-all"
                                title="Expenses"
                            >
                                <CurrencyDollarIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                                <span className="text-xs sm:text-sm font-medium">Expenses</span>
                            </button>
                            
                            <button 
                                onClick={() => setIsShiftLogOpen(true)} 
                                className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 py-2 bg-white border border-brand-tan hover:border-brand-orange hover:text-brand-orange text-brand-brown rounded-lg transition-all"
                                title="Log Shift"
                            >
                                <ClockIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                                <span className="text-xs sm:text-sm font-medium">Log Shift</span>
                            </button>
                            
                            <button 
                                onClick={() => setIsSettingsOpen(true)} 
                                className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
                                title="Settings"
                            >
                                <CogIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                                <span className="text-xs sm:text-sm font-medium">Config</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                {/* Pending Orders Alert */}
                {pendingOrders.length > 0 && (
                    <div className="mb-8">
                        <PendingOrders 
                            orders={pendingOrders}
                            onApprove={(id) => handleApproval(id, true)}
                            onDeny={(id) => handleApproval(id, false)}
                            onSelectOrder={setSelectedOrder}
                        />
                    </div>
                )}

                {/* Filter Bar */}
                <div className="mb-6">
                    <DateRangeFilter 
                        initialStartDate={dateRange.start} 
                        initialEndDate={dateRange.end} 
                        onDateChange={setDateRange} 
                    />
                </div>

                {/* VIEW CONTENT */}
                {view === 'dashboard' && (
                    <DashboardMetrics 
                        stats={stats} 
                        orders={dateFilteredDashboardOrders} 
                        allOrders={activeOrders}
                        empanadaFlavors={empanadaFlavors.map(f => f.name)} 
                        fullSizeEmpanadaFlavors={fullSizeEmpanadaFlavors.map(f => f.name)} 
                        pendingCount={pendingOrders.length}
                        cancelledCount={cancelledOrders.length}
                        onFilterStatus={(status) => {
                            if (status === 'CANCELLED') { 
                                setViewingCancelled(true); 
                                setStatusFilter(null); 
                            } else { 
                                setViewingCancelled(false); 
                                setStatusFilter(status); 
                            }
                            setView('list');
                        }}
                    />
                )}

                {view === 'list' && (
                    <OrderList 
                        orders={filteredOrders} 
                        title={viewingCancelled ? "Cancelled Orders" : "Active Orders"}
                        onSelectOrder={setSelectedOrder}
                        onPrintSelected={handlePrint}
                        onDelete={handleDeleteOrder}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        activeStatusFilter={statusFilter}
                        onClearStatusFilter={() => { setStatusFilter(null); setViewingCancelled(false); }}
                        currentFilter={viewingCancelled ? 'CANCELLED' : (statusFilter || 'ALL')}
                        onFilterChange={(val) => {
                            if (val === 'CANCELLED') {
                                setViewingCancelled(true);
                                setStatusFilter(null);
                            } else if (val === 'ALL') {
                                setViewingCancelled(false);
                                setStatusFilter(null);
                            } else {
                                setViewingCancelled(false);
                                setStatusFilter(val as FollowUpStatus);
                            }
                        }}
                        settings={settings}
                    />
                )}

                {view === 'calendar' && (
                    <CalendarView 
                        orders={filteredOrders}
                        shifts={shifts}
                        onSelectOrder={setSelectedOrder}
                        onPrintSelected={handlePrint}
                        onDelete={handleDeleteOrder}
                        settings={settings}
                    />
                )}

                {view === 'reports' && (
                    <ReportsView 
                        orders={filteredOrders}
                        expenses={expenses}
                        shifts={shifts}
                        settings={settings}
                        dateRange={dateRange}
                        onDeleteExpense={deleteExpenseFromDb}
                    />
                )}
            </main>

            {/* MODALS */}
            
            {(isOrderFormOpen || editingOrder) && (
                <OrderFormModal 
                    order={editingOrder || undefined}
                    onClose={() => { setIsOrderFormOpen(false); setEditingOrder(null); }}
                    onSave={handleSaveOrder}
                    empanadaFlavors={empanadaFlavors}
                    fullSizeEmpanadaFlavors={fullSizeEmpanadaFlavors}
                    onAddNewFlavor={(name, type) => {
                        const newFlavor: Flavor = { name, visible: true };
                        const newSettings = { ...settings };
                        if (type === 'mini') {
                            newSettings.empanadaFlavors = [...newSettings.empanadaFlavors, newFlavor];
                        } else {
                            newSettings.fullSizeEmpanadaFlavors = [...newSettings.fullSizeEmpanadaFlavors, newFlavor];
                        }
                        updateSettingsInDb(newSettings);
                    }}
                    onDelete={handleDeleteOrder}
                    pricing={pricing}
                    settings={settings}
                    existingOrders={activeOrders}
                />
            )}

            {selectedOrder && (
                <OrderDetailModal 
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onUpdateFollowUp={handleUpdateStatus}
                    onEdit={(order) => {
                        setEditingOrder(order);
                        setSelectedOrder(null);
                    }}
                    onApprove={(id) => handleApproval(id, true)}
                    onDeny={(id) => handleApproval(id, false)}
                    onDelete={handleDeleteOrder}
                    onDeductInventory={handleDeductInventory}
                    settings={settings}
                />
            )}

            {isSettingsOpen && (
                <SettingsModal 
                    settings={settings} 
                    onClose={() => setIsSettingsOpen(false)}
                />
            )}

            {isPrepListOpen && (
                <PrepListModal 
                    orders={dateFilteredDashboardOrders}
                    settings={settings}
                    onClose={() => setIsPrepListOpen(false)}
                    onUpdateSettings={updateSettingsInDb}
                    dateRange={dateRange}
                />
            )}

            {isExpenseOpen && (
                <ExpenseModal 
                    expenses={expenses}
                    categories={settings.expenseCategories || []}
                    ingredients={settings.ingredients || []}
                    onClose={() => setIsExpenseOpen(false)}
                    onSave={saveExpenseToDb}
                    onDelete={deleteExpenseFromDb}
                    onUpdateIngredientCost={handleUpdateIngredientCost}
                />
            )}

            {isShiftLogOpen && (
                <ShiftLogModal 
                    employees={settings.employees || []}
                    onClose={() => setIsShiftLogOpen(false)}
                    onSave={saveShiftToDb}
                />
            )}
        </div>
    );
}
