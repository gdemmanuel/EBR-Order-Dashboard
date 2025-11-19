
import React, { useState, useMemo } from 'react';
import { Order, PaymentStatus, FollowUpStatus } from '../types';
import { TrashIcon, PrinterIcon, MagnifyingGlassIcon } from './icons/Icons';
import { parseOrderDateTime } from '../utils/dateUtils';

interface OrderListProps {
    orders: Order[];
    title?: string;
    onSelectOrder: (order: Order) => void;
    onPrintSelected: (selectedOrders: Order[]) => void;
    onDelete?: (orderId: string) => void;
    searchTerm?: string;
    onSearchChange?: (term: string) => void;
}

export default function OrderList({ orders, title, onSelectOrder, onPrintSelected, onDelete, searchTerm, onSearchChange }: OrderListProps) {
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
        <div className="bg-white border border-brand-tan rounded-lg shadow-sm overflow-hidden">
             <div className="p-4 border-b border-brand-tan bg-brand-tan/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-serif text-brand-brown">{title || 'All Orders'}</h2>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {onSearchChange && (
                        <div className="relative flex-grow sm:flex-grow-0 w-full sm:w-auto">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input 
                                type="text"
                                placeholder="Search Customer..."
                                value={searchTerm || ''}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="pl-9 pr-3 py-1.5 text-sm border border-brand-tan rounded-lg focus:ring-brand-orange focus:border-brand-orange w-full sm:w-64"
                            />
                        </div>
                    )}

                    {selectedOrderIds.size > 0 && (
                        <button 
                            onClick={handleBulkPrint}
                            className="flex items-center gap-2 bg-brand-orange text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-opacity-90 transition-colors whitespace-nowrap"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            Print ({selectedOrderIds.size})
                        </button>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-brand-brown uppercase bg-brand-tan/20">
                        <tr>
                            <th scope="col" className="p-4">
                                <div className="flex items-center">
                                    <input type="checkbox" checked={selectedOrderIds.size === orders.length && orders.length > 0} onChange={toggleAll} className="w-4 h-4 text-brand-orange bg-gray-100 border-gray-300 rounded focus:ring-brand-orange" />
                                </div>
                            </th>
                            <th scope="col" className="px-6 py-3 cursor-pointer hover:text-brand-orange" onClick={() => handleSort('pickupDateObj')}>
                                Date/Time
                            </th>
                            <th scope="col" className="px-6 py-3 cursor-pointer hover:text-brand-orange" onClick={() => handleSort('customerName')}>
                                Customer
                            </th>
                            <th scope="col" className="px-6 py-3">
                                Items
                            </th>
                            <th scope="col" className="px-6 py-3 cursor-pointer hover:text-brand-orange" onClick={() => handleSort('amountCharged')}>
                                Total
                            </th>
                            <th scope="col" className="px-6 py-3">
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-right">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedOrders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                    {searchTerm ? 'No orders found matching your search.' : 'No orders found.'}
                                </td>
                            </tr>
                        ) : (
                            sortedOrders.map((order) => (
                                <tr 
                                    key={order.id} 
                                    className="bg-white border-b hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => onSelectOrder(order)}
                                >
                                    <td className="w-4 p-4" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center">
                                            <input type="checkbox" checked={selectedOrderIds.has(order.id)} onChange={() => toggleSelection(order.id)} className="w-4 h-4 text-brand-orange bg-gray-100 border-gray-300 rounded focus:ring-brand-orange" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-brand-brown whitespace-nowrap">
                                        {order.pickupDate}
                                        <span className="block text-xs text-gray-500">{order.pickupTime}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {order.customerName}
                                        {order.deliveryRequired && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">DELIVERY</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-xs truncate">
                                            {order.items.map(i => `${i.quantity} ${i.name}`).join(', ')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        ${order.amountCharged.toFixed(2)}
                                        {order.paymentStatus === PaymentStatus.PAID ? (
                                            <span className="ml-2 inline-block w-2 h-2 rounded-full bg-emerald-500" title="Paid"></span>
                                        ) : (
                                            <span className="ml-2 inline-block w-2 h-2 rounded-full bg-red-500" title="Pending Payment"></span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {order.followUpStatus === FollowUpStatus.NEEDED && (
                                            <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded">Follow-up</span>
                                        )}
                                        {order.followUpStatus === FollowUpStatus.COMPLETED && (
                                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Done</span>
                                        )}
                                         {order.followUpStatus === FollowUpStatus.CONTACTED && (
                                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Contacted</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {onDelete && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onDelete(order.id); }} 
                                                className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                                title="Delete Order"
                                            >
                                                <TrashIcon className="w-5 h-5" />
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
    );
}
