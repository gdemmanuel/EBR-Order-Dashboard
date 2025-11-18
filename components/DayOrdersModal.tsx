
import React from 'react';
import { Order } from '../types';
import OrderList from './OrderList';
import { XMarkIcon } from './icons/Icons';

interface DayOrdersModalProps {
    date: Date;
    orders: Order[];
    onClose: () => void;
    onSelectOrder: (order: Order) => void;
    onPrintSelected: (selectedOrders: Order[]) => void;
}

export default function DayOrdersModal({ date, orders, onClose, onSelectOrder, onPrintSelected }: DayOrdersModalProps) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
             <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col">
                 <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 z-10 bg-white rounded-full p-1 text-gray-400 hover:text-gray-600 shadow-sm border border-gray-200"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <div className="overflow-y-auto rounded-lg shadow-2xl">
                    <OrderList 
                        title={`Orders for ${date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`}
                        orders={orders}
                        onSelectOrder={onSelectOrder}
                        onPrintSelected={onPrintSelected}
                    />
                </div>
             </div>
        </div>
    );
}
