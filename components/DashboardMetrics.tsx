
<change>
<file>components/DashboardMetrics.tsx</file>
<description>Restore valid TypeScript code by removing XML artifacts and ensure full-size product logic correctly identifies items.</description>
<content><![CDATA[
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
        orders.forEach(order => {
            order.items.forEach(item => {
                // Robust check: any item starting with "Full " is counted
                if (item.name.startsWith('Full ')) {
                    const cleanName = item.name.replace('Full ', '');
                    productCounts.set(cleanName, (productCounts.get(cleanName) || 0) + item.quantity);
                }
            });
        });

        return Array.from(productCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [orders]);
    
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
                </div>
                <div className="bg-white p-6 rounded-lg border border-brand-tan">
                    <h3 className="text-lg font-semibold text-brand-brown mb-4">Full-Size Empanadas Sold</h3>
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
]]></content>
</change>

<change>
<file>components/OrderList.tsx</file>
<description>Restore valid TypeScript code by removing XML artifacts and ensure clean actions column.</description>
<content><![CDATA[
import React, { useState, useMemo } from 'react';
import { Order, PaymentStatus, FollowUpStatus, ApprovalStatus, AppSettings } from '../types';
import { TrashIcon, PrinterIcon, MagnifyingGlassIcon, XMarkIcon, ChevronDownIcon, EyeIcon, TruckIcon } from './icons/Icons';
import { parseOrderDateTime } from '../utils/dateUtils';

interface OrderListProps {
    orders: Order[];
    title?: string;
    onSelectOrder: (order: Order) => void;
    onPrintSelected: (selectedOrders: Order[]) => void;
    onDelete?: (orderId: string) => void;
    searchTerm?: string;
    onSearchChange?: (term: string) => void;
    activeStatusFilter?: FollowUpStatus | null;
    onClearStatusFilter?: () => void;
    currentFilter?: string;
    onFilterChange?: (filter: string) => void;
    settings?: AppSettings;
}

// Helper to render status badges with configured colors
const StatusBadge = ({ status, approvalStatus, colors }: { status: FollowUpStatus, approvalStatus: ApprovalStatus, colors?: Record<string, string> }) => {
    if (approvalStatus === ApprovalStatus.CANCELLED) {
        return <span className="text-xs font-medium px-2.5 py-0.5 rounded border" style={{ backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }}>Cancelled</span>;
    }

    const bgColor = colors?.[status] || '#f3f4f6'; // Default gray
    
    // Simple contrast check logic or just default text color
    const textColor = '#1f2937'; 
    const borderColor = 'rgba(0,0,0,0.05)';

    return <span className="text-xs font-medium px-2.5 py-0.5 rounded border whitespace-nowrap" style={{ backgroundColor: bgColor, color: textColor, borderColor }}>{status}</span>;
};

const getPaymentStatusBadge = (status: PaymentStatus) => {
    if (status === PaymentStatus.PAID) {
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 border border-green-200">Paid</span>;
    }
    // Pending (Not Paid) and Overdue are both Red
    const label = status === PaymentStatus.PENDING ? 'Not Paid' : status;
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
        {label}
    </span>;
};

export default function OrderList({ 
    orders, 
    title, 
    onSelectOrder, 
    onPrintSelected, 
    onDelete, 
    searchTerm, 
    onSearchChange, 
    activeStatusFilter, 
    onClearStatusFilter,
    currentFilter,
    onFilterChange,
    settings
}: OrderListProps) {
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: keyof Order | 'pickupDateObj', direction: 'asc' | 'desc' }>({ key: 'pickupDateObj', direction: 'asc' });

    const handleSort = (key: keyof Order | 'pickupDateObj') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedOrders = useMemo(() => {
        let sortableOrders = [...orders];
        sortableOrders.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (sortConfig.key === 'pickupDateObj') {
                aValue = parseOrderDateTime(a).getTime();
                bValue = parseOrderDateTime(b).getTime();
            } else {
                aValue = a[sortConfig.key];
                bValue = b[sortConfig.key];
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        return sortableOrders;
    }, [orders, sortConfig]);

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedOrderIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedOrderIds(newSelection);
    };

    const toggleAll = () => {
        if (selectedOrderIds.size === orders.length) {
            setSelectedOrderIds(new Set());
        } else {
            setSelectedOrderIds(new Set(orders.map(o => o.id)));
        }
    };

    const handleBulkPrint = () => {
        const selected = orders.filter(o => selectedOrderIds.has(o.id));
        onPrintSelected(selected);
    };

    return (
        <div className="bg-white border border-brand-tan rounded-lg shadow-sm overflow-visible relative flex flex-col h-full">
             <div className="p-4 border-b border-brand-tan bg-brand-tan/10 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-4 flex-wrap w-full md:w-auto">
                    <h2 className="text-xl font-serif text-brand-brown whitespace-nowrap">{title || 'Orders'}</h2>
                    
                    {/* Render Filter Dropdown if handler provided */}
                    {onFilterChange ? (
                        <div className="relative w-full sm:w-auto">
                            <select 
                                value={currentFilter || 'ALL'} 
                                onChange={(e) => onFilterChange(e.target.value)}
                                className="appearance-none w-full sm:w-auto border border-brand-tan hover:border-brand-orange rounded-lg text-sm py-1.5 pl-3 pr-8 focus:ring-brand-orange focus:border-brand-orange bg-white text-brand-brown font-medium cursor-pointer shadow-sm transition-colors"
                            >
                                <option value="ALL">All Active</option>
                                <option value={FollowUpStatus.NEEDED}>{FollowUpStatus.NEEDED}</option>
                                <option value={FollowUpStatus.PENDING}>{FollowUpStatus.PENDING}</option>
                                <option value={FollowUpStatus.CONFIRMED}>{FollowUpStatus.CONFIRMED}</option>
                                <option value={FollowUpStatus.PROCESSING}>{FollowUpStatus.PROCESSING}</option>
                                <option value={FollowUpStatus.COMPLETED}>{FollowUpStatus.COMPLETED}</option>
                                <option disabled>──────────</option>
                                <option value="CANCELLED">Cancelled Orders</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                <ChevronDownIcon className="h-4 w-4" />
                            </div>
                        </div>
                    ) : (
                        // Legacy filter clearing
                        activeStatusFilter && onClearStatusFilter && (
                            <div className="flex items-center bg-brand-orange/10 text-brand-orange px-3 py-1 rounded-full text-sm font-medium">
                                <span>Filter: {activeStatusFilter}</span>
                                <button onClick={onClearStatusFilter} className="ml-2 hover:text-brand-brown">
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )
                    )}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {selectedOrderIds.size > 0 && (
                        <button 
                            onClick={handleBulkPrint}
                            className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-gray-300"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            <span>Print ({selectedOrderIds.size})</span>
                        </button>
                    )}
                    
                    {onSearchChange && (
                        <div className="relative flex-grow md:flex-grow-0">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search orders..."
                                value={searchTerm || ''}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="block w-full pl-9 rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto flex-grow">
                <table className="min-w-full divide-y divide-brand-tan/30">
                    <thead className="bg-gray-50">
                        <tr>
                            {/* Checkbox */}
                            <th scope="col" className="px-4 py-3 text-left w-12">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange"
                                    checked={orders.length > 0 && selectedOrderIds.size === orders.length}
                                    onChange={toggleAll}
                                />
                            </th>

                            {/* Date */}
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-brand-orange" onClick={() => handleSort('pickupDateObj')}>
                                Date {sortConfig.key === 'pickupDateObj' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>

                            {/* Customer */}
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-brand-orange" onClick={() => handleSort('customerName')}>
                                Customer {sortConfig.key === 'customerName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>

                            {/* Items */}
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Items
                            </th>

                            {/* Total / Payment */}
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-brand-orange" onClick={() => handleSort('amountCharged')}>
                                Total {sortConfig.key === 'amountCharged' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>

                            {/* Status */}
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-brand-orange" onClick={() => handleSort('followUpStatus')}>
                                Status {sortConfig.key === 'followUpStatus' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>

                            {/* Printed */}
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <PrinterIcon className="w-4 h-4 mx-auto" title="Printed Status" />
                            </th>

                            {/* Action */}
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100 text-sm">
                        {sortedOrders.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                    No orders found.
                                </td>
                            </tr>
                        ) : (
                            sortedOrders.map((order) => {
                                const totalItems = order.totalMini + order.totalFullSize;
                                const itemsSummary = order.items.map(i => `${i.quantity} ${i.name}`).join(', ');
                                
                                return (
                                    <tr 
                                        key={order.id} 
                                        className="hover:bg-gray-50 transition-colors group cursor-pointer"
                                        onClick={() => onSelectOrder(order)}
                                    >
                                        <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange"
                                                checked={selectedOrderIds.has(order.id)}
                                                onChange={() => toggleSelection(order.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-brand-brown">
                                            <div className="font-medium">{order.pickupDate}</div>
                                            <div className="text-xs text-gray-500">{order.pickupTime}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="font-medium text-brand-brown" title={order.customerName}>{order.customerName}</div>
                                            {order.deliveryRequired && (
                                                <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-1 border border-blue-100">
                                                    <TruckIcon className="w-3 h-3" /> Delivery
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-500 mt-0.5" title={order.contactMethod}>{order.contactMethod}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-brand-brown font-medium whitespace-nowrap">{totalItems} items</div>
                                            <div className="text-xs text-gray-500">{itemsSummary}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="font-medium text-brand-brown">${order.amountCharged.toFixed(2)}</div>
                                            {getPaymentStatusBadge(order.paymentStatus)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <StatusBadge 
                                                status={order.followUpStatus} 
                                                approvalStatus={order.approvalStatus} 
                                                colors={settings?.statusColors}
                                            />
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            {order.hasPrinted ? (
                                                <div className="text-green-600 mx-auto" title="Printed">
                                                    <PrinterIcon className="w-5 h-5 mx-auto" />
                                                </div>
                                            ) : (
                                                <div className="text-gray-200 mx-auto" title="Not Printed">
                                                    <PrinterIcon className="w-5 h-5 mx-auto" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end gap-2">
                                                {onDelete && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if(window.confirm('Delete this order permanently?')) onDelete(order.id);
                                                        }}
                                                        className="text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                                        title="Delete"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
]]></content>
</change>