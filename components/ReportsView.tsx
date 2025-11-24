
import React, { useMemo, useState } from 'react';
import { Order, Expense, AppSettings, WorkShift } from '../types';
import { calculateSupplyCost } from '../utils/pricingUtils';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { parseOrderDateTime } from '../utils/dateUtils';
import { TrashIcon } from './icons/Icons';

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

export default function ReportsView({ orders, expenses, shifts = [], settings, dateRange, onDeleteExpense }: ReportsViewProps) {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    const filteredData = useMemo(() => {
        let filteredOrders = orders;
        let filteredExpenses = expenses;
        let filteredShifts = shifts;

        if (dateRange.start) {
            const start = new Date(dateRange.start);
            start.setHours(0,0,0,0);
            filteredOrders = filteredOrders.filter(o => parseOrderDateTime(o) >= start);
            filteredExpenses = filteredExpenses.filter(e => new Date(e.date) >= start);
            filteredShifts = filteredShifts.filter(s => {
                const [y, m, d] = s.date.split('-').map(Number);
                return new Date(y, m - 1, d) >= start;
            });
        }
        
        if (dateRange.end) {
            const end = new Date(dateRange.end);
            end.setHours(23,59,59,999);
            filteredOrders = filteredOrders.filter(o => parseOrderDateTime(o) <= end);
            filteredExpenses = filteredExpenses.filter(e => new Date(e.date) <= end);
            filteredShifts = filteredShifts.filter(s => {
                const [y, m, d] = s.date.split('-').map(Number);
                return new Date(y, m - 1, d) <= end;
            });
        }

        return { orders: filteredOrders, expenses: filteredExpenses, shifts: filteredShifts };
    }, [orders, expenses, shifts, dateRange]);

    const financials = useMemo(() => {
        const { orders, expenses, shifts } = filteredData;

        const revenue = orders.reduce((sum, o) => sum + o.amountCharged, 0);
        const estimatedMaterialUsage = orders.reduce((sum, o) => {
            return sum + (o.totalCost !== undefined ? o.totalCost : calculateSupplyCost(o.items, settings));
        }, 0);
        
        const manualExpensesTotal = expenses.reduce((sum, e) => sum + (e.totalCost || 0), 0);
        const laborTotal = shifts.reduce((sum, s) => sum + (s.totalPay || 0), 0);
        
        const actualExpensesTotal = manualExpensesTotal + laborTotal;
        
        const netProfit = revenue - actualExpensesTotal;
        const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        return { revenue, estimatedMaterialUsage, manualExpensesTotal, laborTotal, actualExpensesTotal, netProfit, margin };
    }, [filteredData, settings]);

    const sortedExpenses = useMemo(() => {
        const items = [...filteredData.expenses];
        items.sort((a, b) => {
            let aVal: any = a[sortConfig.key];
            let bVal: any = b[sortConfig.key];
            if (sortConfig.key === 'totalCost') {
                aVal = a.totalCost || 0;
                bVal = b.totalCost || 0;
            }
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return items;
    }, [filteredData.expenses, sortConfig]);

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleDeleteClick = (id: string) => {
        if (onDeleteExpense && window.confirm("Delete this expense entry?")) {
            onDeleteExpense(id);
        }
    };

    const SortHeader = ({ label, skey }: { label: string, skey: SortKey }) => (
        <th 
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hover:text-brand-orange transition-colors select-none"
            onClick={() => handleSort(skey)}
        >
            <div className="flex items-center gap-1">
                {label}
                {sortConfig.key === skey && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
            </div>
        </th>
    );

    const expenseBreakdownData = useMemo(() => {
        const categoryMap = new Map<string, number>();
        
        // Add manual expenses
        filteredData.expenses.forEach(e => {
            const cost = e.totalCost || 0;
            categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + cost);
        });
        
        // Add Labor
        const laborCost = filteredData.shifts.reduce((sum, s) => sum + (s.totalPay || 0), 0);
        if (laborCost > 0) {
            categoryMap.set('Employee Labor', (categoryMap.get('Employee Labor') || 0) + laborCost);
        }
        
        const data: {name: string, value: number}[] = [];
        categoryMap.forEach((val, key) => { data.push({ name: key, value: val }); });
        return data.filter(d => d.value > 0);
    }, [filteredData]);

    const pnlChartData = useMemo(() => {
        const monthlyData = new Map<string, { revenue: number, expense: number }>();
        
        // Process Orders
        filteredData.orders.forEach(o => {
            const d = parseOrderDateTime(o);
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const current = monthlyData.get(key) || { revenue: 0, expense: 0 };
            current.revenue += o.amountCharged;
            monthlyData.set(key, current);
        });
        
        // Process Manual Expenses
        filteredData.expenses.forEach(e => {
            const key = e.date.substring(0, 7);
            const current = monthlyData.get(key) || { revenue: 0, expense: 0 };
            current.expense += (e.totalCost || 0);
            monthlyData.set(key, current);
        });
        
        // Process Shifts (Labor Expenses)
        filteredData.shifts.forEach(s => {
            const key = s.date.substring(0, 7);
            const current = monthlyData.get(key) || { revenue: 0, expense: 0 };
            current.expense += (s.totalPay || 0);
            monthlyData.set(key, current);
        });

        return Array.from(monthlyData.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([key, val]) => {
            const [y, m] = key.split('-');
            const label = new Date(parseInt(y), parseInt(m)-1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            return { name: label, Revenue: val.revenue, Expenses: val.expense, Profit: val.revenue - val.expense };
        });
    }, [filteredData]);

    return (
        <div className="space-y-8">
             {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">${financials.revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600">${financials.actualExpensesTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    <p className="text-xs text-gray-400 mt-1">Labor: ${financials.laborTotal.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Net Profit</p>
                    <p className={`text-2xl font-bold ${financials.netProfit >= 0 ? 'text-brand-brown' : 'text-red-600'}`}>${financials.netProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Profit Margin</p>
                    <p className="text-2xl font-bold text-brand-orange">{financials.margin.toFixed(1)}%</p>
                </div>
            </div>
            
             <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h4 className="font-bold text-blue-800 text-sm uppercase">Theoretical Material Cost</h4>
                    <p className="text-xs text-blue-600">Based on recipes & orders (Reference only - not deducted from profit)</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">${financials.estimatedMaterialUsage.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                    <h3 className="text-lg font-semibold text-brand-brown mb-4">Profit & Loss Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={pnlChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                            <Legend />
                            <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                    <h3 className="text-lg font-semibold text-brand-brown mb-4">Expense Breakdown (Includes Labor)</h3>
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
                        <div className="flex items-center justify-center h-[300px] text-gray-400 italic">
                            No expenses recorded for this period.
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                <h3 className="text-lg font-semibold text-brand-brown mb-4">Recent Manual Expenses Log</h3>
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
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No manual expenses found for this period. (Labor costs are calculated separately).</td>
                                </tr>
                            ) : (
                                sortedExpenses.map((expense) => (
                                    <tr key={expense.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{expense.vendor}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="font-medium text-brand-brown">{expense.item}</div>
                                            <div className="text-xs">({expense.quantity} {expense.unitName} @ ${expense.pricePerUnit})</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                                            -${(expense.totalCost || 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {onDeleteExpense && (
                                                <button onClick={() => handleDeleteClick(expense.id)} className="text-gray-400 hover:text-red-600">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
