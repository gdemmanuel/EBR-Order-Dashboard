
import React, { useState, useMemo } from 'react';
import { Order, PaymentStatus, FollowUpStatus, ApprovalStatus, AppSettings } from '../types';
import { TrashIcon, PrinterIcon, MagnifyingGlassIcon, XMarkIcon, ChevronDownIcon, TruckIcon, SparklesIcon } from './icons/Icons';
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
    const textColor = '#1f2937'; 
    const borderColor = 'rgba(0,0,0,0.05)';

    return <span className="text-xs font-medium px-2.5 py-0.5 rounded border whitespace-nowrap block text-center truncate" style={{ backgroundColor: bgColor, color: textColor, borderColor }}>{status}</span>;
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

const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    // If YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-');
        return `${m}/${d}/${y}`;
    }
    return dateStr;
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
                <table className="min-w-full divide-y divide-brand-tan/30 table-fixed">
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
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-brand-orange w-32" onClick={() => handleSort('pickupDateObj')}>
                                Date {sortConfig.key === 'pickupDateObj' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>

                            {/* Customer - Constrained width */}
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-brand-orange w-48" onClick={() => handleSort('customerName')}>
                                Customer {sortConfig.key === 'customerName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>

                            {/* Items - Flexible width, takes remaining space */}
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
                                Items
                            </th>

                            {/* Total / Payment - Fixed width */}
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-brand-orange w-28" onClick={() => handleSort('amountCharged')}>
                                Total {sortConfig.key === 'amountCharged' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>

                            {/* Status - Tightened width */}
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-brand-orange w-32" onClick={() => handleSort('followUpStatus')}>
                                Status {sortConfig.key === 'followUpStatus' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>

                            {/* Printed - Fixed width */}
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                <PrinterIcon className="w-4 h-4 mx-auto" title="Printed Status" />
                            </th>

                            {/* Action - Fixed width for buttons */}
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
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
                                const isPartyPlatter = (order.specialInstructions || '').includes("PARTY PLATTER");
                                
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
                                            <div className="font-medium">{formatDateDisplay(order.pickupDate)}</div>
                                            <div className="text-xs text-gray-500">{order.pickupTime}</div>
                                            {order.deliveryRequired && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 mt-1 border border-blue-200">
                                                    <TruckIcon className="w-3 h-3" /> Delivery
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 truncate max-w-[12rem]">
                                            <div className="font-medium text-brand-brown truncate" title={order.customerName}>{order.customerName}</div>
                                            <div className="text-xs text-gray-500 mt-0.5 truncate" title={order.contactMethod}>{order.contactMethod}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-brand-brown font-medium whitespace-nowrap flex items-center gap-2">
                                                {totalItems} items
                                                {isPartyPlatter && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-800 border border-purple-300 uppercase tracking-wide">
                                                        <SparklesIcon className="w-3 h-3 mr-1"/> Platter
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 whitespace-normal leading-snug">{itemsSummary}</div>
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
                                                        className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"
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
