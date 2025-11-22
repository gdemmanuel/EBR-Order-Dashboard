
import React, { useMemo } from 'react';
import { Order, Expense } from '../types';
import { AppSettings } from '../services/dbService';
import { calculateSupplyCost } from '../utils/pricingUtils';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { parseOrderDateTime } from '../utils/dateUtils';

interface ReportsViewProps {
    orders: Order[];
    expenses: Expense[];
    settings: AppSettings;
    dateRange: { start?: string; end?: string };
}

const COLORS = ['#c8441c', '#eab308', '#3b82f6', '#a855f7', '#10b981', '#6366f1'];

export default function ReportsView({ orders, expenses, settings, dateRange }: ReportsViewProps) {
    
    // Filter Data based on Date Range
    const filteredData = useMemo(() => {
        let filteredOrders = orders;
        let filteredExpenses = expenses;

        if (dateRange.start) {
            const start = new Date(dateRange.start);
            start.setHours(0,0,0,0); // Normalize time
            filteredOrders = filteredOrders.filter(o => parseOrderDateTime(o) >= start);
            filteredExpenses = filteredExpenses.filter(e => new Date(e.date) >= start);
        }
        
        if (dateRange.end) {
            const end = new Date(dateRange.end);
            end.setHours(23,59,59,999); // End of day
            filteredOrders = filteredOrders.filter(o => parseOrderDateTime(o) <= end);
            filteredExpenses = filteredExpenses.filter(e => new Date(e.date) <= end);
        }

        return { orders: filteredOrders, expenses: filteredExpenses };
    }, [orders, expenses, dateRange]);

    // Aggregate Financials
    const financials = useMemo(() => {
        const { orders, expenses } = filteredData;

        const revenue = orders.reduce((sum, o) => sum + o.amountCharged, 0);
        
        // COGS Calculation
        // Use saved historical cost if available, otherwise calculate using current prices
        const cogsIngredients = orders.reduce((sum, o) => {
            return sum + (o.totalCost !== undefined ? o.totalCost : calculateSupplyCost(o.items, settings));
        }, 0);

        // Fixed Expenses
        const fixedExpensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
        
        const totalExpenses = cogsIngredients + fixedExpensesTotal;
        const netProfit = revenue - totalExpenses;
        const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        return { revenue, cogsIngredients, fixedExpensesTotal, totalExpenses, netProfit, margin };
    }, [filteredData, settings]);

    // Expense Breakdown for Pie Chart
    const expenseBreakdownData = useMemo(() => {
        const data = [
            { name: 'Ingredients (COGS)', value: financials.cogsIngredients },
        ];
        
        // Group fixed expenses by category
        const categoryMap = new Map<string, number>();
        filteredData.expenses.forEach(e => {
            categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
        });
        
        categoryMap.forEach((val, key) => {
            data.push({ name: key, value: val });
        });

        return data.filter(d => d.value > 0);
    }, [financials, filteredData.expenses]);

    // Monthly P&L for Bar Chart (Last 6 months or current selection)
    const pnlChartData = useMemo(() => {
        const monthlyData = new Map<string, { revenue: number, expense: number }>();
        
        // Process Orders
        filteredData.orders.forEach(o => {
            const d = parseOrderDateTime(o);
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; // YYYY-MM
            const current = monthlyData.get(key) || { revenue: 0, expense: 0 };
            
            const cost = o.totalCost !== undefined ? o.totalCost : calculateSupplyCost(o.items, settings);
            
            current.revenue += o.amountCharged;
            current.expense += cost;
            monthlyData.set(key, current);
        });

        // Process Expenses
        filteredData.expenses.forEach(e => {
            const key = e.date.substring(0, 7); // YYYY-MM
            const current = monthlyData.get(key) || { revenue: 0, expense: 0 };
            current.expense += e.amount;
            monthlyData.set(key, current);
        });

        // Calculate Profit per month and format
        return Array.from(monthlyData.entries())
            .sort((a,b) => a[0].localeCompare(b[0]))
            .map(([key, val]) => {
                const [y, m] = key.split('-');
                const label = new Date(parseInt(y), parseInt(m)-1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                return {
                    name: label,
                    Revenue: val.revenue,
                    Expenses: val.expense,
                    Profit: val.revenue - val.expense
                };
            });
    }, [filteredData, settings]);

    return (
        <div className="space-y-8">
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">${financials.revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Total Expenses (COGS + Fixed)</p>
                    <p className="text-2xl font-bold text-red-600">${financials.totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profit & Loss Trend */}
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

                {/* Expense Breakdown */}
                <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                    <h3 className="text-lg font-semibold text-brand-brown mb-4">Expense Breakdown</h3>
                    <div className="flex flex-col md:flex-row items-center">
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
                                    <Tooltip />
                                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
