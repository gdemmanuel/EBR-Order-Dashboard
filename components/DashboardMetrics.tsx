
import React, { useMemo } from 'react';
import { Order } from '../types';
// FIX: Corrected the import names for empanada flavors from `all...` to `initial...` to match the exported members in `mockData.ts`.
import { initialOrders, initialEmpanadaFlavors, initialFullSizeEmpanadaFlavors } from '../data/mockData';
import { 
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { TrendingUpIcon, DocumentTextIcon, ShoppingBagIcon } from './icons/Icons';

interface DashboardMetricsProps {
    stats: {
        totalRevenue: number;
        ordersToFollowUp: number;
        totalEmpanadasSold: number;
    };
    orders: Order[];
    startDate?: string;
    endDate?: string;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-lg border border-brand-tan flex items-center space-x-4 transition-shadow hover:shadow-lg">
        <div className="bg-brand-orange p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-brand-brown/70 font-medium">{title}</p>
            <p className="text-2xl font-bold text-brand-brown">{value}</p>
        </div>
    </div>
);

// Helper function to parse order date/time (adapted from App.tsx)
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
    hours += 12;
  }
  
  return new Date(year, month - 1, day, hours, minutes);
};

// Helper function to get the start of the week (Sunday)
const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay(); // Sunday - 0, Monday - 1, ...
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
};


export default function DashboardMetrics({ stats, orders, startDate, endDate }: DashboardMetricsProps) {
    // FIX: Updated variable names to use the correctly imported flavor arrays.
    const miniFlavorsSet = useMemo(() => new Set(initialEmpanadaFlavors), []);
    const fullSizeFlavorsSet = useMemo(() => new Set(initialFullSizeEmpanadaFlavors), []);

    const popularMiniProductsData = useMemo(() => {
        const productCounts = new Map<string, number>();
        orders.forEach(order => {
            order.items.forEach(item => {
                if (miniFlavorsSet.has(item.name)) {
                   productCounts.set(item.name, (productCounts.get(item.name) || 0) + item.quantity);
                }
            });
        });

        return Array.from(productCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 7);
    }, [orders, miniFlavorsSet]);

    const popularFullSizeProductsData = useMemo(() => {
        const productCounts = new Map<string, number>();
        orders.forEach(order => {
            order.items.forEach(item => {
                if (fullSizeFlavorsSet.has(item.name)) {
                    const cleanName = item.name.replace('Full ', '');
                    productCounts.set(cleanName, (productCounts.get(cleanName) || 0) + item.quantity);
                }
            });
        });

        return Array.from(productCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 7);
    }, [orders, fullSizeFlavorsSet]);
    
    const weeklySalesData = useMemo(() => {
        const dateRangeProvided = startDate && endDate;
        
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // Use filtered orders from props, which are already in the date range if selected
        // If no range is selected, filter all original orders for the last 6 months
        const relevantOrders = dateRangeProvided 
            ? orders 
            : initialOrders.filter(order => parseOrderDateTime(order) >= sixMonthsAgo);

        const weeklyTotals = new Map<string, { mini: number; full: number }>();
        
        relevantOrders.forEach(order => {
            try {
                const orderDate = parseOrderDateTime(order);
                const weekStartDate = getStartOfWeek(orderDate);
                const weekKey = weekStartDate.toISOString().split('T')[0]; // YYYY-MM-DD

                const currentTotals = weeklyTotals.get(weekKey) || { mini: 0, full: 0 };
                currentTotals.mini += order.totalMini;
                currentTotals.full += order.totalFullSize;
                weeklyTotals.set(weekKey, currentTotals);
            } catch (e) {
                // Ignore orders with invalid dates
            }
        });
        
        return Array.from(weeklyTotals.entries())
            .map(([week, totals]) => ({
                week,
                ...totals,
            }))
            .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
            .map(item => ({
                ...item,
                weekLabel: new Date(item.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            }));
    }, [orders, startDate, endDate]);

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="Total Revenue" 
                    value={`$${stats.totalRevenue.toLocaleString()}`} 
                    icon={<TrendingUpIcon className="w-6 h-6 text-white" />} 
                />
                <StatCard 
                    title="Follow-ups Needed" 
                    value={stats.ordersToFollowUp}
                    icon={<DocumentTextIcon className="w-6 h-6 text-white" />} 
                />
                <StatCard 
                    title="Total Empanadas Sold" 
                    value={stats.totalEmpanadasSold.toLocaleString()}
                    icon={<ShoppingBagIcon className="w-6 h-6 text-white" />} 
                />
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg border border-brand-tan">
                    <h3 className="text-lg font-semibold text-brand-brown mb-4">Most Popular Mini Empanadas</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={popularMiniProductsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#3c2f2f' }} />
                            <YAxis tick={{ fontSize: 12, fill: '#3c2f2f' }} />
                            <Tooltip
                                contentStyle={{
                                    background: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '0.5rem',
                                }}
                            />
                            <Legend wrapperStyle={{fontSize: "14px"}}/>
                            <Bar dataKey="count" fill="#c8441c" name="Quantity Sold" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg border border-brand-tan">
                    <h3 className="text-lg font-semibold text-brand-brown mb-4">Most Popular Full-Size Empanadas</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={popularFullSizeProductsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#3c2f2f' }} />
                            <YAxis tick={{ fontSize: 12, fill: '#3c2f2f' }} />
                            <Tooltip
                                contentStyle={{
                                    background: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '0.5rem',
                                }}
                            />
                            <Legend wrapperStyle={{fontSize: "14px"}}/>
                            <Bar dataKey="count" fill="#e25e31" name="Quantity Sold" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="mt-8">
                <div className="bg-white p-6 rounded-lg border border-brand-tan">
                    <h3 className="text-lg font-semibold text-brand-brown mb-4">Weekly Sales Volume</h3>
                    {weeklySalesData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={weeklySalesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="weekLabel" tick={{ fontSize: 12, fill: '#3c2f2f' }} />
                                <YAxis tick={{ fontSize: 12, fill: '#3c2f2f' }} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'white',
                                        border: '1px solid #ddd',
                                        borderRadius: '0.5rem',
                                    }}
                                />
                                <Legend wrapperStyle={{fontSize: "14px"}}/>
                                <Line type="monotone" dataKey="mini" name="Mini Empanadas" stroke="#c8441c" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}/>
                                <Line type="monotone" dataKey="full" name="Full-Size Empanadas" stroke="#e25e31" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}/>
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                         <div className="flex items-center justify-center h-[300px]">
                            <p className="text-brand-brown/70">No sales data available for the selected period.</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
