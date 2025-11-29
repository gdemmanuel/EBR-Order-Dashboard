import React, { useState } from 'react';
import { Order, FollowUpStatus, ApprovalStatus, AppSettings } from '../types';
import { TruckIcon, SparklesIcon, PrinterIcon, MagnifyingGlassIcon, XMarkIcon } from './icons/Icons';

interface OrderListProps {
    orders: Order[];
    title: string;
    onSelectOrder: (order: Order) => void;
    onPrintSelected?: (selectedOrders: Order[]) => void;
    onDelete?: (orderId: string) => void;
    searchTerm?: string;
    onSearchChange?: (term: string) => void;
    activeStatusFilter?: FollowUpStatus | null;
    onClearStatusFilter?: () => void;
    currentFilter?: string;
    onFilterChange?: (filter: string) => void;
    settings?: AppSettings;
}

export default function OrderList({ 
    orders, 
    title, 
    onSelectOrder, 
    onPrintSelected, 
    onDelete,
    searchTerm = '',
    onSearchChange,
    activeStatusFilter,
    onClearStatusFilter,
    currentFilter,
    onFilterChange,
    settings
}: OrderListProps) {
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedOrderIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedOrderIds(newSet);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedOrderIds(new Set(orders.map(o => o.id)));
        } else {
            setSelectedOrderIds(new Set());
        }
    };

    const handlePrintClick = () => {
        if (!onPrintSelected) return;
        const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));
        onPrintSelected(selectedOrders);
    };

    // Helper to summarize items string
    const getItemsSummary = (order: Order) => {
        const parts: string[] = [];
        if (order.totalMini > 0) parts.push(`${order.totalMini} Mini`);
        if (order.totalFullSize > 0) parts.push(`${order.totalFullSize} Full`);
        return parts.join(', ');
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-brand-tan/50 overflow-hidden">
            {/* Header / Toolbar */}
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-serif text-brand-brown font-semibold">{title} <span className="text-gray-400 text-sm font-normal">({orders.length})</span></h2>
                    
                    {activeStatusFilter && onClearStatusFilter && (
                         <div className="flex items-center bg-brand-orange/10 text-brand-orange px-2 py-1 rounded text-xs font-bold">
                            <span>Filter: {activeStatusFilter}</span>
                            <button onClick={onClearStatusFilter} className="ml-1 hover:text-brand-brown"><XMarkIcon className="w-3 h-3"/></button>
                         </div>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {onFilterChange && (
                        <div className="relative">
                            <select 
                                value={currentFilter} 
                                onChange={(e) => onFilterChange(e.target.value)}
                                className="pl-3 pr-8 py-2 text-sm border-gray-300 rounded-md focus:ring-brand-orange focus:border-brand-orange bg-gray-50 text-gray-700"
                            >
                                <option value="ALL">All Orders</option>
                                <option value={FollowUpStatus.NEEDED}>Follow-up Needed</option>
                                <option value={FollowUpStatus.PENDING}>Pending</option>
                                <option value={FollowUpStatus.CONFIRMED}>Confirmed</option>
                                <option value={FollowUpStatus.PROCESSING}>Processing</option>
                                <option value={FollowUpStatus.COMPLETED}>Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                    )}

                    {onSearchChange && (
                        <div className="relative flex-grow sm:flex-grow-0">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search orders..."
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="pl-9 block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedOrderIds.size > 0 && onPrintSelected && (
                <div className="bg-brand-orange/5 p-2 px-4 flex justify-between items-center border-b border-brand-orange/10 animate-fade-in">
                    <span className="text-sm font-medium text-brand-orange">{selectedOrderIds.size} selected</span>
                    <button 
                        onClick={handlePrintClick}
                        className="flex items-center gap-2 bg-white border border-brand-orange/30 text-brand-orange text-xs font-bold px-3 py-1.5 rounded hover:bg-brand-orange hover:text-white transition-colors shadow-sm"
                    >
                        <PrinterIcon className="w-4 h-4" /> Print Selected
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left w-10">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange"
                                    checked={selectedOrderIds.size === orders.length && orders.length > 0}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-gray-500 italic">No orders found.</td>
                            </tr>
                        ) : (
                            orders.map((order) => {
                                const isPartyPlatter = (order.specialInstructions || '').includes("PARTY PLATTER");
                                const totalItems = order.totalMini + order.totalFullSize;
                                const itemsSummary = getItemsSummary(order);
                                
                                // Status Color Logic
                                let statusColor = 'bg-gray-100 text-gray-800';
                                if (settings?.statusColors && settings.statusColors[order.followUpStatus]) {
                                    switch (order.followUpStatus) {
                                        case FollowUpStatus.NEEDED: statusColor = 'bg-amber-100 text-amber-800'; break;
                                        case FollowUpStatus.PENDING: statusColor = 'bg-blue-50 text-blue-800'; break;
                                        case FollowUpStatus.CONFIRMED: statusColor = 'bg-blue-100 text-blue-800'; break;
                                        case FollowUpStatus.PROCESSING: statusColor = 'bg-indigo-100 text-indigo-800'; break;
                                        case FollowUpStatus.COMPLETED: statusColor = 'bg-green-100 text-green-800'; break;
                                    }
                                }
                                if (order.approvalStatus === ApprovalStatus.CANCELLED) statusColor = 'bg-red-100 text-red-800 line-through';

                                return (
                                    <tr 
                                        key={order.id} 
                                        className={`transition-colors group cursor-pointer ${isPartyPlatter ? 'bg-purple-50 hover:bg-purple-100 border-l-4 border-l-purple-500' : 'hover:bg-gray-50'}`}
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
                                            {order.deliveryRequired && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 mt-1 border border-blue-200">
                                                    <TruckIcon className="w-3 h-3" /> Delivery
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="font-medium text-brand-brown" title={order.customerName}>{order.customerName}</div>
                                            <div className="text-xs text-gray-500 mt-0.5" title={order.contactMethod}>{order.contactMethod}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-brand-brown font-medium whitespace-nowrap flex items-center gap-2">
                                                {totalItems} items
                                                {isPartyPlatter && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-900 border border-purple-300 uppercase tracking-wide">
                                                        <SparklesIcon className="w-3 h-3 mr-1"/> Platter
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{itemsSummary}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                                                {order.approvalStatus === ApprovalStatus.CANCELLED ? 'Cancelled' : order.followUpStatus}
                                            </span>
                                            {order.hasPrinted && <div className="text-[10px] text-gray-400 mt-1 flex items-center"><PrinterIcon className="w-3 h-3 mr-1"/> Printed</div>}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-700">
                                            ${order.amountCharged.toFixed(2)}
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