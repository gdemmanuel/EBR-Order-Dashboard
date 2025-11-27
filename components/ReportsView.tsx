
import React, { useMemo, useState } from 'react';
import { Order, Expense, AppSettings, WorkShift } from '../types';
import { calculateSupplyCost } from '../utils/pricingUtils';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { parseOrderDateTime } from '../utils/dateUtils';
import { TrashIcon, CurrencyDollarIcon, ShoppingBagIcon, UsersIcon, PresentationChartBarIcon, ChartPieIcon, ClockIcon, XMarkIcon, ListBulletIcon } from './icons/Icons';

interface ReportsViewProps {
    orders: Order[];
    expenses: Expense[];
    shifts?: WorkShift[];
    settings: AppSettings;
    dateRange: { start?: string; end?: string };
    onDeleteExpense?: (id: string) => void;
}

const COLORS = ['#c8441c', '#eab308', '#3b82f6', '#a855f7', '#10b981', '#6366f1', '#ef4444', '#f97316'];

type SortKey = 'date' | 'category' | 'vendor' | 'item' | 'totalCost';
type ReportTab = 'financials' | 'labor' | 'operations';

// Drill Down Modal Component (unchanged)
const DrillDownModal = ({ 
    title, 
    items, 
    type, 
    onClose 
}: { 
    title: string, 
    items: any[], 
    type: 'orders' | 'expenses' | 'shifts' | 'mixed', 
    onClose: () => void 
}) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-brand-tan">
                <header className="p-4 border-b border-brand-tan flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 className="text-xl font-serif text-brand-brown">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="overflow-y-auto p-0 flex-grow">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 sticky top-0 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">
                                    {type === 'orders' ? 'Customer' : (type === 'shifts' ? 'Employee' : 'Name/Vendor')}
                                </th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Details</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {items.length === 0 ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No records found.</td></tr>
                            ) : (
                                items.map((item, idx) => {
                                    // Normalize Data for display
                                    let date = '';
                                    let name = '';
                                    let details = '';
                                    let amount = 0;
                                    let amountColor = 'text-gray-900';

                                    if (type === 'orders') {
                                        date = item.pickupDate;
                                        name = item.customerName;
                                        details = `${item.totalMini + item.totalFullSize} items (${item.items.length} types)`;
                                        amount = item.amountCharged;
                                        amountColor = 'text-green-600';
                                    } else if (type === 'shifts') {
                                        date = item.date;
                                        name = item.employeeName;
                                        details = `${item.hours.toFixed(1)} hrs (${item.startTime}-${item.endTime})`;
                                        amount = item.totalPay;
                                        amountColor = 'text-red-600';
                                    } else if (type === 'expenses' || type === 'mixed') {
                                        if (item.employeeName) { // It's a shift
                                            date = item.date;
                                            name = item.employeeName;
                                            details = `Labor: ${item.hours.toFixed(1)} hrs`;
                                            amount = item.totalPay;
                                        } else { // It's an expense
                                            date = item.date;
                                            name = item.vendor;
                                            details = `${item.category}: ${item.item}`;
                                            amount = item.totalCost;
                                        }
                                        amountColor = 'text-red-600';
                                    }

                                    return (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-600">{date}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                                            <td className="px-4 py-3 text-gray-500 truncate max-w-xs" title={details}>{details}</td>
                                            <td className={`px-4 py-3 text-right font-bold ${amountColor}`}>
                                                {type === 'orders' ? '+' : '-'}${amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-gray-200 bg-gray-50 text-right rounded-b-lg">
                    <span className="text-xs text-gray-500 uppercase mr-2">Total:</span>
                    <span className="text-lg font-bold text-gray-800">
                        ${items.reduce((sum, i) => sum + (i.amountCharged || i.totalCost || i.totalPay || 0), 0).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default function ReportsView({ orders, expenses, shifts = [], settings, dateRange, onDeleteExpense }: ReportsViewProps) {
    const [activeTab, setActiveTab] = useState<ReportTab>('financials');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
    const [drillDownData, setDrillDownData] = useState<{
        isOpen: boolean;
        title: string;
        type: 'orders' | 'expenses' | 'shifts' | 'mixed';
        items: any[];
    } | null>(null);
    const [selectedIngredientId, setSelectedIngredientId] = useState<string>('');

    const filteredData = useMemo(() => {
        let filteredOrders = orders;
        let filteredExpenses = expenses;
        let filteredShifts = shifts;

        if (dateRange.start) {
            const [y, m, d] = dateRange.start.split('-').map(Number);
            const start = new Date(y, m - 1, d, 0,0,0,0);
            filteredOrders = filteredOrders.filter(o => parseOrderDateTime(o) >= start);
            filteredExpenses = filteredExpenses.filter(e => { const [ey, em, ed] = e.date.split('-').map(Number); return new Date(ey, em - 1, ed) >= start; });
            filteredShifts = filteredShifts.filter(s => { const [sy, sm, sd] = s.date.split('-').map(Number); return new Date(sy, sm - 1, sd) >= start; });
        }
        
        if (dateRange.end) {
            const [y, m, d] = dateRange.end.split('-').map(Number);
            const end = new Date(y, m - 1, d, 23, 59, 59, 999);
            filteredOrders = filteredOrders.filter(o => parseOrderDateTime(o) <= end);
            filteredExpenses = filteredExpenses.filter(e => { const [ey, em, ed] = e.date.split('-').map(Number); return new Date(ey, em - 1, ed) <= end; });
            filteredShifts = filteredShifts.filter(s => { const [sy, sm, sd] = s.date.split('-').map(Number); return new Date(sy, sm - 1, sd) <= end; });
        }

        return { orders: filteredOrders, expenses: filteredExpenses, shifts: filteredShifts };
    }, [orders, expenses, shifts, dateRange]);

    // ... (Click Handlers for Drill Down unchanged) ...
    const handleRevenueClick = (data: any) => { if (!data || !data.rawDate) return; const [year, month] = data.rawDate.split('-').map(Number); const relevantOrders = filteredData.orders.filter(o => { const d = parseOrderDateTime(o); return d.getFullYear() === year && d.getMonth() === (month - 1); }); setDrillDownData({ isOpen: true, title: `Revenue Details - ${data.name}`, type: 'orders', items: relevantOrders }); };
    const handleExpenseClick = (data: any) => { if (!data || !data.rawDate) return; const key = data.rawDate; const relevantExpenses = filteredData.expenses.filter(e => e.date.startsWith(key)); const relevantShifts = filteredData.shifts.filter(s => s.date.startsWith(key)); setDrillDownData({ isOpen: true, title: `Expense Details - ${data.name}`, type: 'mixed', items: [...relevantExpenses, ...relevantShifts].sort((a, b) => a.date.localeCompare(b.date)) }); };
    const handleCategoryClick = (data: any) => { if (!data || !data.name) return; const categoryName = data.name; let items: any[] = []; if (categoryName === 'Employee Labor') { items = filteredData.shifts; } else { items = filteredData.expenses.filter(e => e.category === categoryName); } setDrillDownData({ isOpen: true, title: `Category Details - ${categoryName}`, type: categoryName === 'Employee Labor' ? 'shifts' : 'expenses', items: items.sort((a, b) => a.date.localeCompare(b.date)) }); };
    const handleLaborClick = (data: any) => { if (!data || !data.name) return; const employeeName = data.name; const relevantShifts = filteredData.shifts.filter(s => s.employeeName === employeeName); setDrillDownData({ isOpen: true, title: `Shift Details - ${employeeName}`, type: 'shifts', items: relevantShifts.sort((a, b) => b.date.localeCompare(a.date)) }); };
    const handleProductClick = (data: any) => { if (!data || !data.name) return; const productName = data.name; const relevantOrders = filteredData.orders.filter(o => o.items.some(i => i.name.includes(productName))); setDrillDownData({ isOpen: true, title: `Orders containing "${productName}"`, type: 'orders', items: relevantOrders }); };
    const handleDayClick = (data: any) => { if (!data || !data.name) return; const dayName = data.name; const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; const dayIndex = days.indexOf(dayName); const relevantOrders = filteredData.orders.filter(o => { const d = parseOrderDateTime(o); return !isNaN(d.getTime()) && d.getDay() === dayIndex; }); setDrillDownData({ isOpen: true, title: `Orders for ${dayName}s`, type: 'orders', items: relevantOrders }); };

    // --- Financials Logic (Updated to prefer snapshot cost) ---
    const financials = useMemo(() => {
        const { orders, expenses, shifts } = filteredData;

        const revenue = orders.reduce((sum, o) => sum + o.amountCharged, 0);
        
        // Updated logic: Use stored 'totalCost' if available, else fallback to live calculation
        const estimatedMaterialUsage = orders.reduce((sum, o) => {
            // Use snapshot if exists (order.totalCost), otherwise calculate current cost based on order date
            const cost = o.totalCost !== undefined ? o.totalCost : calculateSupplyCost(o.items, settings, parseOrderDateTime(o));
            return sum + cost;
        }, 0);
        
        const manualExpensesTotal = expenses.reduce((sum, e) => sum + (e.totalCost || 0), 0);
        const laborTotal = shifts.reduce((sum, s) => sum + (s.totalPay || 0), 0);
        
        const actualExpensesTotal = manualExpensesTotal + laborTotal;
        
        const netProfit = revenue - actualExpensesTotal;
        const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        return { revenue, estimatedMaterialUsage, manualExpensesTotal, laborTotal, actualExpensesTotal, netProfit, margin };
    }, [filteredData, settings]);

    // ... (Labor Logic, Product Logic, Day Logic unchanged) ...
    const laborStats = useMemo(() => { const stats = new Map<string, { name: string; hours: number; pay: number; shiftCount: number }>(); filteredData.shifts.forEach(shift => { const key = shift.employeeName; const current = stats.get(key) || { name: key, hours: 0, pay: 0, shiftCount: 0 }; current.hours += shift.hours; current.pay += shift.totalPay; current.shiftCount += 1; stats.set(key, current); }); return Array.from(stats.values()).sort((a, b) => b.hours - a.hours); }, [filteredData.shifts]);
    const productStats = useMemo(() => { const itemMap = new Map<string, number>(); filteredData.orders.forEach(order => { order.items.forEach(item => { const name = item.name.replace('Full ', '').replace(' (4oz)', '').replace(' (8oz)', ''); itemMap.set(name, (itemMap.get(name) || 0) + item.quantity); }); }); return Array.from(itemMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10); }, [filteredData.orders]);
    const dayStats = useMemo(() => { const dayCounts = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 }; const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; filteredData.orders.forEach(order => { const date = parseOrderDateTime(order); if (!isNaN(date.getTime())) { const dayName = days[date.getDay()]; (dayCounts as any)[dayName] = ((dayCounts as any)[dayName] || 0) + 1; } }); return days.map(d => ({ name: d, count: (dayCounts as any)[d] })); }, [filteredData.orders]);

    // ... (Helpers, expenseBreakdownData, pnlChartData unchanged) ...
    const sortedExpenses = useMemo(() => { const items = [...filteredData.expenses]; items.sort((a, b) => { let aVal: any = a[sortConfig.key]; let bVal: any = b[sortConfig.key]; if (sortConfig.key === 'totalCost') { aVal = a.totalCost || 0; bVal = b.totalCost || 0; } if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1; if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1; return 0; }); return items; }, [filteredData.expenses, sortConfig]);
    const handleSort = (key: SortKey) => { let direction: 'asc' | 'desc' = 'asc'; if (sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; } setSortConfig({ key, direction }); };
    const handleDeleteClick = (id: string) => { if (onDeleteExpense && window.confirm("Delete this expense entry?")) { onDeleteExpense(id); } };
    const SortHeader = ({ label, skey }: { label: string, skey: SortKey }) => ( <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hover:text-brand-orange transition-colors select-none" onClick={() => handleSort(skey)} > <div className="flex items-center gap-1"> {label} {sortConfig.key === skey && ( <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span> )} </div> </th> );
    const expenseBreakdownData = useMemo(() => { const categoryMap = new Map<string, number>(); filteredData.expenses.forEach(e => { const cost = e.totalCost || 0; categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + cost); }); const laborCost = filteredData.shifts.reduce((sum, s) => sum + (s.totalPay || 0), 0); if (laborCost > 0) { categoryMap.set('Employee Labor', (categoryMap.get('Employee Labor') || 0) + laborCost); } const data: {name: string, value: number}[] = []; categoryMap.forEach((val, key) => { data.push({ name: key, value: val }); }); return data.filter(d => d.value > 0); }, [filteredData]);
    const pnlChartData = useMemo(() => { const monthlyData = new Map<string, { revenue: number, expense: number }>(); filteredData.orders.forEach(o => { const d = parseOrderDateTime(o); if (isNaN(d.getTime())) return; const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; const current = monthlyData.get(key) || { revenue: 0, expense: 0 }; current.revenue += o.amountCharged; monthlyData.set(key, current); }); filteredData.expenses.forEach(e => { const key = e.date.substring(0, 7); const current = monthlyData.get(key) || { revenue: 0, expense: 0 }; current.expense += (e.totalCost || 0); monthlyData.set(key, current); }); filteredData.shifts.forEach(s => { const key = s.date.substring(0, 7); const current = monthlyData.get(key) || { revenue: 0, expense: 0 }; current.expense += (s.totalPay || 0); monthlyData.set(key, current); }); return Array.from(monthlyData.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([key, val]) => { const [y, m] = key.split('-'); const label = new Date(parseInt(y), parseInt(m)-1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); return { name: label, Revenue: val.revenue, Expenses: val.expense, Profit: val.revenue - val.expense, rawDate: key }; }); }, [filteredData]);

    // --- Ingredient Trend Logic ---
    const ingredientTrendData = useMemo(() => {
        if (!selectedIngredientId || !settings.ingredients) return [];
        const ing = settings.ingredients.find(i => i.id === selectedIngredientId);
        if (!ing || !ing.priceHistory) return [];

        const history = [...ing.priceHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        return history.map(entry => ({
            date: entry.date,
            price: entry.price
        }));
    }, [selectedIngredientId, settings.ingredients]);

    const trendStats = useMemo(() => {
        if (ingredientTrendData.length < 2) return null;
        const latest = ingredientTrendData[ingredientTrendData.length - 1];
        const previous = ingredientTrendData[ingredientTrendData.length - 2];
        const diff = latest.price - previous.price;
        const percent = previous.price > 0 ? (diff / previous.price) * 100 : 0;
        return { 
            diff, 
            percent, 
            currentPrice: latest.price 
        };
    }, [ingredientTrendData]);

    return (
        <div className="space-y-6">
            {/* Sub-Tabs Navigation */}
            <div className="flex border-b border-brand-tan/50 mb-6 overflow-x-auto">
                 <button
                    onClick={() => setActiveTab('financials')}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'financials' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <CurrencyDollarIcon className="w-4 h-4" /> Financials
                </button>
                <button
                    onClick={() => setActiveTab('labor')}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'labor' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <UsersIcon className="w-4 h-4" /> Labor & Staff
                </button>
                <button
                    onClick={() => setActiveTab('operations')}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'operations' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <PresentationChartBarIcon className="w-4 h-4" /> Operations & Menu
                </button>
            </div>

            {/* FINANCIALS TAB */}
            {activeTab === 'financials' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                            <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                            <p className="text-2xl font-bold text-green-600">${financials.revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                            <p className="text-sm text-gray-500 font-medium">Total Expenses</p>
                            <p className="text-2xl font-bold text-red-600">${financials.actualExpensesTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                            <p className="text-xs text-gray-400 mt-1">Labor: ${financials.laborTotal.toFixed(2)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                            <p className="text-sm text-gray-500 font-medium">Net Profit</p>
                            <p className={`text-2xl font-bold ${financials.netProfit >= 0 ? 'text-brand-brown' : 'text-red-600'}`}>${financials.netProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                            <p className="text-sm text-gray-500 font-medium">Profit Margin</p>
                            <p className="text-2xl font-bold text-brand-orange">{financials.margin.toFixed(1)}%</p>
                        </div>
                    </div>

                    {/* Theoretical Cost Note */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h4 className="font-bold text-blue-800 text-sm uppercase">Theoretical Supply Cost</h4>
                            <p className="text-xs text-blue-600">Calculated from historical ingredient prices at time of order. This cost is excluded from Net Profit above as it's a COGS estimate, but tracked here for pricing analysis.</p>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">${financials.estimatedMaterialUsage.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>

                    {/* Charts & Tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-brand-brown">Profit & Loss Trend</h3>
                                <span className="text-xs text-gray-400 italic">Click bars for details</span>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={pnlChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px' }}
                                        formatter={(value: number) => `$${value.toFixed(2)}`}
                                    />
                                    <Legend />
                                    <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} onClick={handleRevenueClick} cursor="pointer" />
                                    <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} onClick={handleExpenseClick} cursor="pointer" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-brand-brown">Expense Breakdown</h3>
                                <span className="text-xs text-gray-400 italic">Click slice for details</span>
                            </div>
                            {expenseBreakdownData.length > 0 ? (
                                <div className="w-full h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie 
                                                data={expenseBreakdownData} 
                                                cx="50%" 
                                                cy="50%" 
                                                innerRadius={60} 
                                                outerRadius={80} 
                                                paddingAngle={5} 
                                                dataKey="value"
                                                onClick={handleCategoryClick}
                                                cursor="pointer"
                                            >
                                                {expenseBreakdownData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                                            <Legend layout="vertical" verticalAlign="middle" align="right" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-gray-400 italic">No expenses recorded for this period.</div>
                            )}
                        </div>
                    </div>

                    {/* Expense Log Table */}
                    <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                        <h3 className="text-lg font-semibold text-brand-brown mb-4">Recent Manual Expenses</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <SortHeader label="Date" skey="date" />
                                        <SortHeader label="Vendor" skey="vendor" />
                                        <SortHeader label="Category" skey="category" />
                                        <SortHeader label="Details" skey="item" />
                                        <SortHeader label="Cost" skey="totalCost" />
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sortedExpenses.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No manual expenses found.</td></tr>
                                    ) : (
                                        sortedExpenses.map((expense) => (
                                            <tr key={expense.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.date}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{expense.vendor}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{expense.category}</span></td>
                                                <td className="px-6 py-4 text-sm text-gray-500"><div className="font-medium text-brand-brown">{expense.item}</div><div className="text-xs">({expense.quantity} {expense.unitName} @ ${expense.pricePerUnit})</div></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">-${(expense.totalCost || 0).toFixed(2)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">{onDeleteExpense && (<button onClick={() => handleDeleteClick(expense.id)} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* LABOR TAB */}
            {activeTab === 'labor' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-full"><UsersIcon className="w-6 h-6 text-blue-600" /></div>
                            <div><p className="text-sm text-gray-500 font-medium">Total Shifts</p><p className="text-2xl font-bold text-blue-900">{filteredData.shifts.length}</p></div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm flex items-center gap-4">
                             <div className="p-3 bg-yellow-100 rounded-full"><ClockIcon className="w-6 h-6 text-yellow-600" /></div>
                            <div><p className="text-sm text-gray-500 font-medium">Total Hours Worked</p><p className="text-2xl font-bold text-yellow-900">{laborStats.reduce((s, x) => s + x.hours, 0).toFixed(1)} hrs</p></div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm flex items-center gap-4">
                             <div className="p-3 bg-green-100 rounded-full"><CurrencyDollarIcon className="w-6 h-6 text-green-600" /></div>
                            <div><p className="text-sm text-gray-500 font-medium">Total Wages</p><p className="text-2xl font-bold text-green-900">${laborStats.reduce((s, x) => s + x.pay, 0).toFixed(2)}</p></div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-brand-brown">Hours by Employee</h3>
                            <span className="text-xs text-gray-400 italic">Click bar for shift details</span>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={laborStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                <Tooltip formatter={(value: number) => `${value.toFixed(1)} hrs`} cursor={{fill: 'transparent'}} />
                                <Bar dataKey="hours" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Hours Worked" barSize={30} onClick={handleLaborClick} cursor="pointer" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                        <h3 className="text-lg font-semibold text-brand-brown mb-4">Employee Breakdown</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Shifts</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Pay/Hr</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pay</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {laborStats.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No shifts recorded for this period.</td></tr>
                                    ) : (
                                        laborStats.map((emp) => (
                                            <tr key={emp.name} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">{emp.shiftCount}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 font-bold">{emp.hours.toFixed(2)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">${(emp.pay / (emp.hours || 1)).toFixed(2)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-700">${emp.pay.toFixed(2)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* OPERATIONS TAB */}
            {activeTab === 'operations' && (
                <div className="space-y-8 animate-fade-in">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Top Products */}
                        <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <ChartPieIcon className="w-5 h-5 text-brand-orange" />
                                    <h3 className="text-lg font-semibold text-brand-brown">Top Selling Items</h3>
                                </div>
                                <span className="text-xs text-gray-400 italic">Click for orders</span>
                            </div>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={productStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} interval={0} />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="count" fill="#ea580c" radius={[0, 4, 4, 0]} name="Quantity Sold" barSize={20} onClick={handleProductClick} cursor="pointer" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Busiest Days */}
                        <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <ShoppingBagIcon className="w-5 h-5 text-blue-600" />
                                    <h3 className="text-lg font-semibold text-brand-brown">Orders by Day of Week</h3>
                                </div>
                                <span className="text-xs text-gray-400 italic">Click for orders</span>
                            </div>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={dayStats}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Orders" onClick={handleDayClick} cursor="pointer" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* NEW: Ingredient Price Trend Chart */}
                    <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-brand-brown">Ingredient Price Trends</h3>
                                <p className="text-xs text-gray-500">Track how your costs have changed over time.</p>
                                {trendStats && (
                                    <div className="mt-2 flex items-baseline gap-3">
                                        <span className="text-2xl font-bold text-brand-brown">${trendStats.currentPrice.toFixed(2)}</span>
                                        <div className={`flex items-center text-sm font-medium ${trendStats.diff > 0 ? 'text-red-600' : trendStats.diff < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                            <span>{trendStats.diff > 0 ? '↑' : trendStats.diff < 0 ? '↓' : ''} {Math.abs(trendStats.percent).toFixed(1)}%</span>
                                            <span className="text-gray-400 text-xs font-normal ml-1">since last change</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <select 
                                value={selectedIngredientId} 
                                onChange={(e) => setSelectedIngredientId(e.target.value)}
                                className="border border-gray-300 rounded-md text-sm py-1.5 pl-3 pr-8 focus:ring-brand-orange focus:border-brand-orange"
                            >
                                <option value="" disabled>Select Ingredient...</option>
                                {settings.ingredients?.map(ing => (
                                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                                ))}
                            </select>
                        </div>
                        
                        {selectedIngredientId ? (
                            ingredientTrendData.length > 0 ? (
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={ingredientTrendData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="date" tick={{fontSize: 12}} />
                                            <YAxis domain={['auto', 'auto']} tick={{fontSize: 12}} tickFormatter={(val) => `$${val}`} />
                                            <Tooltip formatter={(val: number) => [`$${val.toFixed(2)}`, 'Unit Price']} labelStyle={{color: '#333'}} />
                                            <Legend />
                                            <Line type="monotone" dataKey="price" name="Price per Unit" stroke="#8884d8" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-200 text-gray-400">
                                    No price history found for this ingredient.
                                </div>
                            )
                        ) : (
                            <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-200 text-gray-400">
                                Please select an ingredient to view trends.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {drillDownData && drillDownData.isOpen && (
                <DrillDownModal 
                    title={drillDownData.title} 
                    items={drillDownData.items} 
                    type={drillDownData.type} 
                    onClose={() => setDrillDownData(null)} 
                />
            )}
        </div>
    );
}
