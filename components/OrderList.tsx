
import React, { useState, useMemo, useEffect } from 'react';
import { Order, PaymentStatus, FollowUpStatus, ApprovalStatus, AppSettings } from '../types';
import { TrashIcon, PrinterIcon, MagnifyingGlassIcon, XMarkIcon, CogIcon } from './icons/Icons';
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
    settings?: AppSettings; // Added settings to access colors
}

// Helper to render status badges with configured colors
const StatusBadge = ({ status, approvalStatus, colors }: { status: FollowUpStatus, approvalStatus: ApprovalStatus, colors?: Record<string, string> }) => {
    if (approvalStatus === ApprovalStatus.CANCELLED) {
        return <span className="text-xs font-medium px-2.5 py-0.5 rounded border" style={{ backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }}>Cancelled</span>;
    }

    const bgColor = colors?.[status] || '#f3f4f6'; // Default gray
    
    // Simple contrast check for text color (not perfect, but works for light bg expectation)
    const textColor = '#1f2937'; // Default dark gray text
    const borderColor = 'rgba(0,0,0,0.05)';

    return <span className="text-xs font-medium px-2.5 py-0.5 rounded border" style={{ backgroundColor: bgColor, color: textColor, borderColor }}>{status}</span>;
};

// Default column widths
const DEFAULT_WIDTHS = {
    date: '15%',
    customer: '20%',
    items: '30%',
    total: '10%',
    status: '15%',
    actions: '10%'
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
    
    // Column Width Config
    const [showColConfig, setShowColConfig] = useState(false);
    const [colWidths, setColWidths] = useState(DEFAULT_WIDTHS);

    useEffect(() => {
        const savedWidths = localStorage.getItem('orderListColWidths');
        if (savedWidths) {
            try { setColWidths(JSON.parse(savedWidths)); } catch (e) {}
        }
    }, []);

    const updateColWidth = (key: keyof typeof DEFAULT_WIDTHS, val: string) => {
        const newWidths = { ...colWidths, [key]: val };
        setColWidths(newWidths);
        localStorage.setItem('orderListColWidths', JSON.stringify(newWidths));
    };

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
        <div className="bg-white border border-brand-tan rounded-lg shadow-sm overflow-visible relative">
             <div className="p-4 border-b border-brand-tan bg-brand-tan/10 flex flex-col md:flex-row justify-between items-center gap-4">
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
                                <option value={FollowUpStatus.NEEDED}>Follow-up Needed</option>
                                <option value={FollowUpStatus.PENDING}>Pending</option>
                                <option value={FollowUpStatus.CONFIRMED}>Confirmed</option>
                                <option value={FollowUpStatus.PROCESSING}>Processing</option>
                                <option value={FollowUpStatus.COMPLETED}>Completed</option>
                                <option disabled>──────────</option>
                                <option value="CANCELLED">Cancelled Orders</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-brown">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    ) : (
                        // Fallback to old badge style if no dropdown handler
                        activeStatusFilter && onClearStatusFilter && (
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                                Filter: {activeStatusFilter}
                                <button onClick={onClearStatusFilter} className="hover:text-blue-900">
                                    <XMarkIcon className="w-3 h-3" />
                                </button>
                            </span>
                        )
                    )}
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {onSearchChange && (
                        <div className="relative flex-grow md:flex-grow-0">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input 
                                type="text"
                                placeholder="Search Customer..."
                                value={searchTerm || ''}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="pl-9 pr-3 py-1.5 text-sm border border-brand-tan rounded-lg focus:ring-brand-orange focus:border-brand-orange w-full md:w-64"
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
                    
                    {/* Column Config Button */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowColConfig(!showColConfig)}
                            className="p-2 text-gray-500 hover:text-brand-orange hover:bg-gray-100 rounded-full transition-colors"
                            title="Configure Columns"
                        >
                            <CogIcon className="w-5 h-5" />
                        </button>
                        {showColConfig && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowColConfig(false)}></div>
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-20 p-4">
                                    <h4 className="text-sm font-bold text-brand-brown mb-3 border-b pb-2">Column Widths</h4>
                                    <div className="space-y-2">
                                        {Object.entries(colWidths).map(([key, val]) => (
                                            <div key={key} className="flex items-center justify-between">
                                                <label className="text-xs font-medium text-gray-600 capitalize">{key}</label>
                                                <input 
                                                    type="text" 
                                                    value={val} 
                                                    onChange={(e) => updateColWidth(key as any, e.target.value)}
                                                    className="w-20 text-xs border border-gray-300 rounded px-2 py-1"
                                                />
                                            </div>
                                        ))}
                                        <div className="pt-2 text-[10px] text-gray-400 italic">Use % or px (e.g. 20% or 150px)</div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-brand-brown uppercase bg-brand-tan/20">
                        <tr>
                            <th scope="col" className="p-4 w-10">
                                <div className="flex items-center">
                                    <input type="checkbox" checked={selectedOrderIds.size === orders.length && orders.length > 0} onChange={toggleAll} className="w-4 h-4 text-brand-orange bg-gray-100 border-gray-300 rounded focus:ring-brand-orange" />
                                </div>
                            </th>
                            <th scope="col" className="px-4 py-3 w-10 text-center" title="Printed Status">
                                <PrinterIcon className="w-4 h-4 mx-auto" />
                            </th>
                            <th scope="col" className="px-6 py-3 cursor-pointer hover:text-brand-orange" style={{ width: colWidths.date }} onClick={() => handleSort('pickupDateObj')}>
                                Date/Time
                            </th>
                            <th scope="col" className="px-6 py-3 cursor-pointer hover:text-brand-orange" style={{ width: colWidths.customer }} onClick={() => handleSort('customerName')}>
                                Customer
                            </th>
                            <th scope="col" className="px-6 py-3" style={{ width: colWidths.items }}>
                                Items
                            </th>
                            <th scope="col" className="px-6 py-3 cursor-pointer hover:text-brand-orange" style={{ width: colWidths.total }} onClick={() => handleSort('amountCharged')}>
                                Total
                            </th>
                            <th scope="col" className="px-6 py-3" style={{ width: colWidths.status }}>
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-right" style={{ width: colWidths.actions }}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedOrders.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
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
                                    <td className="px-4 py-4 text-center">
                                        {order.hasPrinted ? (
                                            <div className="flex justify-center" title="Printed">
                                                <PrinterIcon className="w-5 h-5 text-green-600" />
                                            </div>
                                        ) : (
                                            <div className="flex justify-center" title="Not Printed">
                                                <PrinterIcon className="w-5 h-5 text-gray-300" />
                                            </div>
                                        )}
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
                                        <div className="truncate">
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
                                        <StatusBadge status={order.followUpStatus} approvalStatus={order.approvalStatus} colors={settings?.statusColors} />
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
