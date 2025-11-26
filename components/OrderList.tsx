
import React, { useState, useMemo } from 'react';
import { Order, PaymentStatus, FollowUpStatus, ApprovalStatus, AppSettings } from '../types';
import { TrashIcon, PrinterIcon, MagnifyingGlassIcon, XMarkIcon } from './icons/Icons';
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
    
    // Simple contrast check for text color (not perfect, but works for light bg expectation)
    const textColor = '#1f2937'; // Default dark gray text
    const borderColor = 'rgba(0,0,0,0.05)';

    return <span className="text-xs font-medium px-2.5 py-0.5 rounded border" style={{ backgroundColor: bgColor, color: textColor, borderColor }}>{status}</span>;
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
                            <div className="pointer-events-none absolute inset-y