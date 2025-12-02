
import React from 'react';
import { Order } from '../types';
import { CheckCircleIcon, XCircleIcon } from './icons/Icons';

const PendingOrderItem: React.FC<{ 
    order: Order; 
    onApprove: (id: string) => void; 
    onDeny: (id: string) => void; 
    onSelectOrder: (order: Order) => void;
}> = ({ order, onApprove, onDeny, onSelectOrder }) => {
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const packageLabel = order.originalPackages && order.originalPackages.length > 0 
        ? order.originalPackages.join(', ') 
        : null;

    // Helper to format ID timestamp
    const getOrderTimestamp = (id: string) => {
        // Check if ID is likely a timestamp (13 digits)
        if (/^\d{13}$/.test(id)) {
            const date = new Date(parseInt(id));
            return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        }
        return ''; // Fallback for legacy IDs
    };

    return (
        <li 
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-brand-tan/80 shadow-sm hover:bg-brand-tan/30 cursor-pointer transition-colors"
            onClick={() => onSelectOrder(order)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectOrder(order); }}
            aria-label={`View details for order from ${order.customerName}`}
        >
            <div className="flex-grow">
                <p className="font-semibold text-brand-brown">{order.customerName}</p>
                <div className="flex flex-col mt-1 gap-1">
                    <p className="text-sm text-gray-500">
                        Pickup: <span className="font-medium text-gray-700">{order.pickupDate} @ {order.pickupTime}</span>
                    </p>
                    
                    {packageLabel && (
                        <p className="text-sm font-bold text-brand-orange">
                            Package: {packageLabel}
                        </p>
                    )}

                    <p className="text-sm text-gray-500">
                        {totalItems} item{totalItems !== 1 ? 's' : ''} total
                    </p>
                </div>
                {/* Timestamp */}
                <p className="text-xs text-gray-400 mt-1.5 font-medium">
                    Placed: {getOrderTimestamp(order.id)}
                </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                <button
                    onClick={(e) => { e.stopPropagation(); onDeny(order.id); }}
                    className="w-1/2 sm:w-auto flex items-center justify-center gap-2 bg-red-100 text-red-700 font-semibold px-3 py-2 rounded-lg hover:bg-red-200 transition-colors"
                    aria-label={`Deny order for ${order.customerName}`}
                >
                    <XCircleIcon className="w-5 h-5" />
                    Deny
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onApprove(order.id); }}
                    className="w-1/2 sm:w-auto flex items-center justify-center gap-2 bg-emerald-100 text-emerald-800 font-semibold px-3 py-2 rounded-lg hover:bg-emerald-200 transition-colors"
                    aria-label={`Approve order for ${order.customerName}`}
                >
                    <CheckCircleIcon className="w-5 h-5" />
                    Approve
                </button>
            </div>
        </li>
    );
};


interface PendingOrdersProps {
    orders: Order[];
    onApprove: (id: string) => void;
    onDeny: (id: string) => void;
    onSelectOrder: (order: Order) => void;
}

export default function PendingOrders({ orders, onApprove, onDeny, onSelectOrder }: PendingOrdersProps) {
    if (orders.length === 0) {
        return null;
    }

    return (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-lg">
            <h2 className="text-2xl font-serif text-amber-900 mb-4">Pending Approval ({orders.length})</h2>
            <p className="text-sm text-amber-800 mb-4">
                These are new orders placed via the website. Click an order to review its details, then approve or deny it.
            </p>
            <ul className="space-y-3">
                {orders.map(order => (
                    <PendingOrderItem 
                        key={order.id} 
                        order={order}
                        onApprove={onApprove}
                        onDeny={onDeny}
                        onSelectOrder={onSelectOrder}
                    />
                ))}
            </ul>
        </div>
    );
}
