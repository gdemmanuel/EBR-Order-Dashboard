import React, { useMemo } from 'react';
import { Order } from '../types';
import { allEmpanadaFlavors, allFullSizeEmpanadaFlavors } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUpIcon, DocumentTextIcon, ShoppingBagIcon } from './icons/Icons';

interface DashboardMetricsProps {
    stats: {
        totalRevenue: number;
        ordersToFollowUp: number;
        totalEmpanadasSold: number;
    };
    orders: Order[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 transition-transform hover:scale-105">
        <div className="bg-orange-100 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);


export default function DashboardMetrics({ stats, orders }: DashboardMetricsProps) {
    const miniFlavorsSet = useMemo(() => new Set(allEmpanadaFlavors), []);
    const fullSizeFlavorsSet = useMemo(() => new Set(allFullSizeEmpanadaFlavors), []);

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

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="Total Revenue" 
                    value={`$${stats.totalRevenue.toLocaleString()}`} 
                    icon={<TrendingUpIcon className="w-6 h-6 text-orange-600" />} 
                />
                <StatCard 
                    title="Follow-ups Needed" 
                    value={stats.ordersToFollowUp}
                    icon={<DocumentTextIcon className="w-6 h-6 text-orange-600" />} 
                />
                <StatCard 
                    title="Total Empanadas Sold" 
                    value={stats.totalEmpanadasSold.toLocaleString()}
                    icon={<ShoppingBagIcon className="w-6 h-6 text-orange-600" />} 
                />
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Popular Mini Empanadas</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={popularMiniProductsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    background: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '0.5rem',
                                }}
                            />
                            <Legend wrapperStyle={{fontSize: "14px"}}/>
                            <Bar dataKey="count" fill="#ea580c" name="Quantity Sold" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Popular Full-Size Empanadas</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={popularFullSizeProductsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    background: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '0.5rem',
                                }}
                            />
                            <Legend wrapperStyle={{fontSize: "14px"}}/>
                            <Bar dataKey="count" fill="#f97316" name="Quantity Sold" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}