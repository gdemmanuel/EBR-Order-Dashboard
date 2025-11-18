

import React from 'react';
import { Order } from '../types';
import { CheckCircleIcon, XCircleIcon, PencilIcon } from './icons/Icons';

const PendingOrderItem: React.FC<{ 
    order: Order; 
    onApprove: (id: string) => void; 
    onDeny: (id: string) => void; 
    onSelectOrder: (order: Order) => void;
    onEdit: (order: Order) => void;
}> = ({ order, onApprove, onDeny, onSelectOrder, onEdit }) => {
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

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
                <p className="text-sm text-gray-500">
                    Pickup: {order.pickupDate} @ {order.pickupTime}
                </p>
                <p className="text-sm text-gray-500">
                    {totalItems} item{totalItems !== 1 ? 's' : ''}
                </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                <button
                    onClick={(e) => { e.stopPropagation(); onDeny(order.id); }}
                    className="w-1/3 sm:w-auto flex items-center justify-center gap-2 bg-red-100 text-red-700 font-semibold px-3 py-2 rounded-lg hover:bg-red-200 transition-colors"
                    aria-label={`Deny order for ${order.customerName}`}
                >
                    <XCircleIcon className="w-5 h-5" />
                    Deny
                </button>
                 <button
                    onClick={(e) => { e.stopPropagation(); onEdit(order); }}
                    className="w-1/3 sm:w-auto flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-semibold px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                    aria-label={`Edit order for ${order.customerName}`}
                >
                    <PencilIcon className="w-5 h-5" />
                    Edit
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onApprove(order.id); }}
                    className="w-1/3 sm:w-auto flex items-center justify-center gap-2 bg-emerald-100 text-emerald-800 font-semibold px-3 py-2 rounded-lg hover:bg-emerald-200 transition-colors"
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
    onEdit: (order: Order) => void;
}

export default function PendingOrders({ orders, onApprove, onDeny, onSelectOrder, onEdit }: PendingOrdersProps) {
    if (orders.length === 0) {
        return null;
    }

    return (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-lg">
            <h2 className="text-2xl font-serif text-amber-900 mb-4">Pending Approval ({orders.length})</h2>
            <p className="text-sm text-amber-800 mb-4">
                These orders were imported from your Google Sheet. Click an order to review its details, then approve or deny it.
            </p>
            <ul className="space-y-3">
                {orders.map(order => (
                    <PendingOrderItem 
                        key={order.id} 
                        order={order}
                        onApprove={onApprove}
                        onDeny={onDeny}
                        onSelectOrder={onSelectOrder}
                        onEdit={onEdit}
                    />
                ))}
            </ul>
        </div>
    );
}