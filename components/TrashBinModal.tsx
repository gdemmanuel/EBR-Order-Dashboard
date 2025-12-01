
import React, { useEffect, useState } from 'react';
import { Order } from '../types';
import { restoreOrder, cleanupTrash } from '../services/dbService';
import { XMarkIcon, TrashIcon, ArrowUturnLeftIcon, ClockIcon } from './icons/Icons';

interface TrashBinModalProps {
    deletedOrders: Order[];
    onClose: () => void;
}

export default function TrashBinModal({ deletedOrders, onClose }: TrashBinModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Trigger cleanup on open to keep trash tidy
        // Wrap in try/catch to ensure it never crashes the modal
        const runCleanup = async () => {
            try {
                await cleanupTrash();
            } catch (e) {
                console.warn("Cleanup failed silently", e);
            }
        };
        runCleanup();
    }, []);

    const handleRestore = async (order: Order) => {
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

    const getDaysRemaining = (deletedAt?: string) => {
        if (!deletedAt) return 7;
        const deleteDate = new Date(deletedAt);
        const expiryDate = new Date(deleteDate);
        expiryDate.setDate(deleteDate.getDate() + 7);
        
        const now = new Date();
        const diffMs = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        return Math.max(0, diffDays);
    };

    // Sort: Newest deleted first
    const sortedOrders = [...deletedOrders].sort((a, b) => {
        const da = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
        const db = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
        return db - da;
    });

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