
import React from 'react';
import { Order } from '../types';
import { CheckCircleIcon, XCircleIcon } from './icons/Icons';
import { formatDateForDisplay } from '../utils/dateUtils';
import { groupOrderItems } from '../utils/orderUtils';

const PendingOrderItem: React.FC<{ 
    order: Order; 
    onApprove: (id: string) => void; 
    onDeny: (id: string) => void; 
    onSelectOrder: (order: Order) => void;
}> = ({ order, onApprove, onDeny, onSelectOrder }) => {
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const { packages, looseItems } = groupOrderItems(order);

    // Helper to format ID timestamp
    const getOrderTimestamp = (id: string) => {
        if (/^\d{13}$/.test(id)) {
            const date = new Date(parseInt(id));
            return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        }
        return '';
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
            <div className="flex-grow w-full">
                <p className="font-semibold text-brand-brown">{order.customerName}</p>
                <div className="flex flex-col mt-1 gap-1">
                    <p className="text-sm text-gray-500">
                        Pickup: <span className="font-medium text-gray-700">{formatDateForDisplay(order.pickupDate)} @ {order.pickupTime}</span>
                    </p>
                    
                    {/* HIERARCHICAL DISPLAY */}
                    <div className="mt-2 text-sm text-brand-brown">
                        {packages.length > 0 && (
                            <div className="space-y-2 mb-2">
                                {packages.map((pkg, idx) => (
                                    <div key={idx} className="bg-brand-tan/20 p-2 rounded">
                                        <p className="font-bold text-brand-orange">{pkg.name}</p>
                                        <ul className="pl-1 space-y-0.5 text-xs text-gray-600 mt-1">
                                            {pkg.items.map((item, i) => (
                                                <li key={i} className="flex justify-between">
                                                    <span>{item.name.replace('Full ', '')}</span>
                                                    <span className="font-medium">x {item.quantity}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {looseItems.length > 0 && (
                            <div className="mt-1">
                                {packages.length > 0 && <p className="font-bold text-xs text-gray-500 mb-1">Extras:</p>}
                                <ul className="pl-1 space-y-0.5 text-xs text-gray-600">
                                    {looseItems.map((item, i) => (
                                        <li key={i} className="flex justify-between">
                                            <span>{item.name}</span>
                                            <span className="font-medium">x {item.quantity}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-gray-400 mt-1 font-medium border-t border-gray-100 pt-1">
                        {totalItems} items total
                    </p>
                </div>
                
                <p className="text-xs text-gray-400 mt-1.5 font-medium">
                    Placed: {getOrderTimestamp(order.id)}
                </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
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
