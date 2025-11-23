
import React, { useMemo, useState, useEffect } from 'react';
import { Order, Expense, Shift } from '../types';
import { calculateSupplyCost } from '../utils/pricingUtils';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { parseOrderDateTime } from '../utils/dateUtils';
import { subscribeToShifts, AppSettings } from '../services/dbService';

interface ReportsViewProps {
    orders: Order[];
    expenses: Expense[];
    settings: AppSettings;
    dateRange: { start?: string; end?: string };
}

const COLORS = ['#c8441c', '#eab308', '#3b82f6', '#a855f7', '#10b981', '#6366f1'];

export default function ReportsView({ orders, expenses, settings, dateRange }: ReportsViewProps) {
    const [shifts, setShifts] = useState<Shift[]>([]);

    useEffect(() => {
        const unsub = subscribeToShifts(setShifts);
        return () => unsub();
    }, []);
    
    // Filter Data based on Date Range
    const filteredData = useMemo(() => {
        let filteredOrders = orders;
        let filteredExpenses = expenses;
        let filteredShifts = shifts;

        if (dateRange.start) {
            const start = new Date(dateRange.start);
            start.setHours(0,0,0,0);
            filteredOrders = filteredOrders.filter(o => parseOrderDateTime(o) >= start);
            filteredExpenses = filteredExpenses.filter(e => new Date(e.date) >= start);
            filteredShifts = filteredShifts.filter(s => new Date(s.date) >= start);
        }
        
        if (dateRange.end) {
            const end = new Date(dateRange.end);
            end.setHours(23,59,59,999);
            filteredOrders = filteredOrders.filter(o => parseOrderDateTime(o) <= end);
            filteredExpenses = filteredExpenses.filter(e => new Date(e.date) <= end);
            filteredShifts = filteredShifts.filter(s => new Date(s.date) <= end);
        }

        return { orders: filteredOrders, expenses: filteredExpenses, shifts: filteredShifts };
    }, [orders, expenses, shifts, dateRange]);

    // Aggregate Financials
    const financials = useMemo(() => {
        const { orders, expenses, shifts } = filteredData;

        const revenue = orders.reduce((sum, o) => sum + o.amountCharged, 0);
        
        // Actual Labor Cost from Shifts
        const laborCost = shifts.reduce((sum, s) => sum + s.projectedCost, 0);

        // Manual Expenses (Vendor Bills)
        const vendorExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        
        const totalExpenses = laborCost + vendorExpenses;
        const netProfit = revenue - totalExpenses;
        const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        // Theoretical COGS (Just for reference/visualization, not P&L per user request)
        const theoreticalCOGS = orders.reduce((sum, o) => sum + calculateSupplyCost(o.items, settings), 0);

        return { revenue, laborCost, vendorExpenses, totalExpenses, netProfit, margin, theoreticalCOGS };
    }, [filteredData, settings]);

    // Monthly P&L for Bar Chart
    const pnlChartData = useMemo(() => {
        const monthlyData = new Map<string, { revenue: number, expense: number }>();
        
        // Revenue
        filteredData.orders.forEach(o => {
            const d = parseOrderDateTime(o);
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const current = monthlyData.get(key) || { revenue: 0, expense: 0 };
            current.revenue += o.amountCharged;
            monthlyData.set(key, current);
        });

        // Expenses (Vendor)
        filteredData.expenses.forEach(e => {
            const key = e.date.substring(0, 7);
            const current = monthlyData.get(key) || { revenue: 0, expense: 0 };
            current.expense += e.amount;
            monthlyData.set(key, current);
        });
        
        // Labor
        filteredData.shifts.forEach(s => {
            const key = s.date.substring(0, 7);
            const current = monthlyData.get(key) || { revenue: 0, expense: 0 };
            current.expense += s.projectedCost;
            monthlyData.set(key, current);
        });

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
    }, [filteredData]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">${financials.revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Total Expenses (Vendor + Labor)</p>
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
                
                <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm flex flex-col justify-center">
                     <h3 className="text-lg font-semibold text-brand-brown mb-4">Expense Breakdown</h3>
                     <div className="space-y-4">
                         <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                             <span>Vendor Expenses (Supplies/Bills)</span>
                             <span className="font-bold">${financials.vendorExpenses.toFixed(2)}</span>
                         </div>
                         <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                             <span>Labor (Scheduled Shifts)</span>
                             <span className="font-bold">${financials.laborCost.toFixed(2)}</span>
                         </div>
                         <div className="mt-4 pt-4 border-t">
                             <p className="text-xs text-gray-500 italic">Note: "Theoretical Material Cost" based on recipes for this period would be ${financials.theoreticalCOGS.toFixed(2)}. This is not used in P&L but good for comparison.</p>
                         </div>
                     </div>
                </div>
            </div>
        </div>
    );
}
