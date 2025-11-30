
import React, { useEffect, useState } from 'react';
import { DeletedOrder } from '../types';
import { restoreOrder, cleanupTrash, subscribeToDeletedOrders } from '../services/dbService';
import { XMarkIcon, TrashIcon, ArrowUturnLeftIcon, ExclamationCircleIcon, ClockIcon } from './icons/Icons';

interface TrashBinModalProps {
    onClose: () => void;
}

export default function TrashBinModal({ onClose }: TrashBinModalProps) {
    const [deletedOrders, setDeletedOrders] = useState<DeletedOrder[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Subscribe to deleted orders collection
        const unsubscribe = subscribeToDeletedOrders(
            (orders) => {
                setDeletedOrders(orders);
                setError(null);
            },
            (err) => {
                console.error("Trash Bin Error:", err);
                setError("Failed to load trash bin contents.");
            }
        );
        
        // Trigger auto-cleanup on open
        cleanupTrash();

        return () => unsubscribe();
    }, []);

    const handleRestore = async (order: DeletedOrder) => {
        setIsLoading(true);
        try {
            await restoreOrder(order);
        } catch (error) {
            console.error("Failed to restore", error);
            alert("Failed to restore order.");
        } finally {
            setIsLoading(false);
        }
    };

    const getDaysRemaining = (deletedAt: string) => {
        const deleteDate = new Date(deletedAt);
        const expiryDate = new Date(deleteDate);
        expiryDate.setDate(deleteDate.getDate() + 7);
        
        const now = new Date();
        const diffMs = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        return Math.max(0, diffDays);
    };

    // Sort orders: Newest deleted first
    const sortedOrders = [...deletedOrders].sort((a, b) => 
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[90] p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-brand-tan">
                <header className="p-6 border-b border-brand-tan flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-200 text-gray-600 p-2 rounded-full">
                            <TrashIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif text-brand-brown">Trash Bin</h2>
                            <p className="text-xs text-gray-500">Items are permanently deleted after 7 days.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="overflow-y-auto p-6 flex-grow bg-gray-50/50">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 flex items-center gap-2 text-sm border border-red-200">
                            <ExclamationCircleIcon className="w-5 h-5" /> {error}
                        </div>
                    )}

                    {sortedOrders.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <TrashIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Trash is empty.</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {sortedOrders.map(order => {
                                const daysLeft = getDaysRemaining(order.deletedAt);
                                return (
                                    <li key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:shadow-md">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-gray-800">{order.customerName}</h4>
                                                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Deleted</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {order.pickupDate} @ {order.pickupTime} • {order.totalMini + order.totalFullSize} Items
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                <ClockIcon className="w-3 h-3" /> Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => handleRestore(order)}
                                            disabled={isLoading}
                                            className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 font-medium rounded hover:bg-green-100 transition-colors border border-green-200 text-sm whitespace-nowrap"
                                        >
                                            <ArrowUturnLeftIcon className="w-4 h-4" /> Restore
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
