
import React, { useMemo } from 'react';
import { Order, FollowUpStatus } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { TrendingUpIcon, DocumentTextIcon, ShoppingBagIcon, ClockIcon, XCircleIcon } from './icons/Icons';
import { parseOrderDateTime } from '../utils/dateUtils';

interface DashboardMetricsProps {
    stats: {
        totalRevenue: number;
        ordersToFollowUp: number;
        totalEmpanadasSold: number;
    };
    orders: Order[]; // Filtered orders for stats and top products
    allOrders: Order[]; // Unfiltered orders for sales history trend
    empanadaFlavors: string[];
    fullSizeEmpanadaFlavors: string[];
    onFilterStatus?: (status: FollowUpStatus | 'CANCELLED') => void;
    pendingCount: number;
    cancelledCount: number;
}

const StatCard: React.FC<{ 
    title: string; 
    value: string | number; 
    icon: React.ReactNode;
    onClick?: () => void;
    colorClass?: string;
}> = ({ title, value, icon, onClick, colorClass = "bg-brand-orange" }) => (
    <div 
        onClick={onClick}
        className={`bg-white p-6 rounded-lg border border-brand-tan flex items-center space-x-4 transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:bg-gray-50 hover:border-brand-orange/50' : ''}`}
    >
        <div className={`${colorClass} p-3 rounded-full text-white`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-brand-brown/70 font-medium">{title}</p>
            <p className="text-2xl font-bold text-brand-brown">{value}</p>
        </div>
    </div>
);

// Helper function to get the start of the week (Sunday)
const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay(); // Sunday - 0, Monday - 1, ...
    const diff = date.getDate() - day;
    date.setHours(0, 0, 0, 0);
    return new Date(date.setDate(diff));
};


export default function DashboardMetrics({ stats, orders, allOrders, empanadaFlavors, fullSizeEmpanadaFlavors, onFilterStatus, pendingCount, cancelledCount }: DashboardMetricsProps) {
    const miniFlavorsSet = useMemo(() => new Set(empanadaFlavors), [empanadaFlavors]);
    
    // We no longer strictly rely on fullSizeEmpanadaFlavors set for the chart to ensure 
    // custom flavors (which get "Full " prepended) show up correctly.

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
            .sort((a, b) => b.count - a.count);
    }, [orders, miniFlavorsSet]);

    const popularFullSizeProductsData = useMemo(() => {
        const productCounts = new Map<string, number>();
        const knownFullFlavors = new Set(fullSizeEmpanadaFlavors);

        orders.forEach(order => {
            order.items.forEach(item => {
                const name = item.name.trim();
                
                // Case 1: Item name explicitly starts with "Full " (e.g., "Full Beef")
                if (name.startsWith('Full ')) {
                    const cleanName = name.replace('Full ', '').trim();
                    productCounts.set(cleanName, (productCounts.get(cleanName) || 0) + item.quantity);
                } 
                // Case 2: Item name is in the configured list of full-size flavors
                else if (knownFullFlavors.has(name)) {
                    // Clean it up just in case the list name also has "Full " prefix
                    const cleanName = name.startsWith('Full ') ? name.replace('Full ', '').trim() : name;
                    productCounts.set(cleanName, (productCounts.get(cleanName) || 0) + item.quantity);
                }
            });
        });

        return Array.from(productCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [orders, fullSizeEmpanadaFlavors]);
    
    const weeklySalesData = useMemo(() => {
        const weeklyTotals = new Map<string, { mini: number; full: number }>();
        
        // Use allOrders to show full history regardless of date filter
        allOrders.forEach(order => {
            const orderDate = parseOrderDateTime(order);
            
            if (isNaN(orderDate.getTime())) {
                return; 
            }

            const weekStartDate = getStartOfWeek(orderDate);
            const weekKey = weekStartDate.toISOString().split('T')[0]; // YYYY-MM-DD

            const currentTotals = weeklyTotals.get(weekKey) || { mini: 0, full: 0 };
            currentTotals.mini += order.totalMini;
            currentTotals.full += order.totalFullSize;
            weeklyTotals.set(weekKey, currentTotals);
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
    }, [allOrders]);

    // Calculate dynamic height for charts based on number of items to ensure readability
    const miniChartHeight = Math.max(400, popularMiniProductsData.length * 40);
    const fullChartHeight = Math.max(400, popularFullSizeProductsData.length * 40);

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <StatCard 
                    title="Total Revenue" 
                    value={`$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    icon={<TrendingUpIcon className="w-6 h-6" />} 
                    colorClass="bg-green-600"
                />
                <StatCard 
                    title="Follow-ups Needed" 
                    value={stats.ordersToFollowUp}
                    icon={<DocumentTextIcon className="w-6 h-6" />}
                    colorClass="bg-amber-500"
                    onClick={() => onFilterStatus && onFilterStatus(FollowUpStatus.NEEDED)}
                />
                <StatCard 
                    title="Pending Status" 
                    value={pendingCount}
                    icon={<ClockIcon className="w-6 h-6" />}
                    colorClass="bg-blue-500"
                    onClick={() => onFilterStatus && onFilterStatus(FollowUpStatus.PENDING)}
                />
                <StatCard 
                    title="Cancelled" 
                    value={cancelledCount}
                    icon={<XCircleIcon className="w-6 h-6" />}
                    colorClass="bg-red-500"
                    onClick={() => onFilterStatus && onFilterStatus('CANCELLED')}
                />
                <StatCard 
                    title="Total Empanadas" 
                    value={stats.totalEmpanadasSold.toLocaleString()}
                    icon={<ShoppingBagIcon className="w-6 h-6" />}
                    colorClass="bg-brand-orange" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg border border-brand-tan">
                    <h3 className="text-lg font-semibold text-brand-brown mb-4">Mini Empanadas Sold</h3>
                    {popularMiniProductsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={miniChartHeight}>
                            <BarChart 
                                layout="vertical" 
                                data={popularMiniProductsData} 
                                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} />
                                <XAxis type="number" tick={{ fontSize: 12, fill: '#3c2f2f' }} />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={130} 
                                    tick={{ fontSize: 12, fill: '#3c2f2f' }} 
                                    interval={0}
                                />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ background: 'white', border: '1px solid #ddd', borderRadius: '0.5rem' }} />
                                <Legend wrapperStyle={{fontSize: "14px"}}/>
                                <Bar dataKey="count" fill="#c8441c" name="Quantity Sold" radius={[0, 4, 4, 0]} barSize={24}>
                                    <LabelList dataKey="count" position="right" fill="#3c2f2f" fontSize={12} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-40 text-gray-400 italic border border-dashed border-gray-200 rounded">
                            No mini empanada sales in this period.
                        </div>
                    )}
                </div>
                <div className="bg-white p-6 rounded-lg border border-brand-tan">
                    <h3 className="text-lg font-semibold text-brand-brown mb-4">Full-Size Empanadas Sold</h3>
                    {popularFullSizeProductsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={fullChartHeight}>
                            <BarChart 
                                layout="vertical" 
                                data={popularFullSizeProductsData} 
                                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} />
                                <XAxis type="number" tick={{ fontSize: 12, fill: '#3c2f2f' }} />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={130} 
                                    tick={{ fontSize: 12, fill: '#3c2f2f' }} 
                                    interval={0}
                                />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ background: 'white', border: '1px solid #ddd', borderRadius: '0.5rem' }} />
                                <Legend wrapperStyle={{fontSize: "14px"}}/>
                                <Bar dataKey="count" fill="#e25e31" name="Quantity Sold" radius={[0, 4, 4, 0]} barSize={24}>
                                    <LabelList dataKey="count" position="right" fill="#3c2f2f" fontSize={12} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-40 text-gray-400 italic border border-dashed border-gray-200 rounded">
                            No full-size empanada sales in this period.
                        </div>
                    )}
                </div>
            </div>
            
            <div className="mt-8">
                <div className="bg-white p-6 rounded-lg border border-brand-tan">
                    <h3 className="text-lg font-semibold text-brand-brown mb-4">Weekly Sales Volume (All Time)</h3>
                    {weeklySalesData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={weeklySalesData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="weekLabel" tick={{ fontSize: 12, fill: '#3c2f2f' }} />
                                <YAxis tick={{ fontSize: 12, fill: '#3c2f2f' }} />
                                <Tooltip contentStyle={{ background: 'white', border: '1px solid #ddd', borderRadius: '0.5rem' }} />
                                <Legend wrapperStyle={{fontSize: "14px"}}/>
                                <Line type="monotone" dataKey="mini" name="Mini Empanadas" stroke="#c8441c" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}/>
                                <Line type="monotone" dataKey="full" name="Full-Size Empanadas" stroke="#e25e31" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}/>
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                         <div className="flex items-center justify-center h-[300px]">
                            <p className="text-brand-brown/70">No sales data available.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
