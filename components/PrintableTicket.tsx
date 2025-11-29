import React from 'react';
import { Order } from '../types';

interface PrintableTicketProps {
    order: Order;
}

export default function PrintableTicket({ order }: PrintableTicketProps) {
    const isPartyPlatter = (order.specialInstructions || '').includes("PARTY PLATTER");
    
    const items = order.items;

    return (
        <div className="ticket-container p-4 border border-gray-300 bg-white text-black font-mono text-sm max-w-[350px] mx-auto mb-8 break-inside-avoid">
            {/* Header: Name and Date */}
            <div className="text-center mb-2 border-b-2 border-black pb-2">
                <h1 className="text-xl font-bold uppercase leading-tight mb-1">{order.customerName}</h1>
                <p className="font-bold text-lg">{order.pickupDate} @ {order.pickupTime}</p>
                {order.deliveryRequired && (
                    <div className="mt-1 border border-black p-1 inline-block">
                        <p className="font-bold uppercase text-lg">** DELIVERY **</p>
                        <p className="text-xs break-words max-w-[250px]">{order.deliveryAddress}</p>
                    </div>
                )}
            </div>

            {/* Party Platter Banner */}
            {isPartyPlatter && (
                <div className="text-center font-black my-2 text-sm border-y-2 border-black py-1 uppercase bg-gray-100">
                    *** PARTY PLATTER ***
                </div>
            )}

            {/* Items List */}
            <table className="w-full mb-3 border-collapse">
                <thead>
                    <tr className="border-b border-black">
                        <th className="text-left py-1 w-12">Qty</th>
                        <th className="text-left py-1">Item</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-300 border-dashed">
                            <td className="py-1 align-top font-bold text-lg">{item.quantity}</td>
                            <td className="py-1 align-top font-semibold">
                                {item.name}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            <div className="flex justify-between items-center font-bold text-lg border-t-2 border-black pt-2 mb-2">
                <span>Total Items:</span>
                <span>{order.totalMini + order.totalFullSize}</span>
            </div>

            {/* Special Instructions */}
            {order.specialInstructions && (
                <div className="border border-black p-2 mb-2 bg-gray-50">
                    <p className="font-bold underline text-xs uppercase mb-1">Notes:</p>
                    <p className="whitespace-pre-wrap font-bold">{order.specialInstructions}</p>
                </div>
            )}

            {/* Footer / Payment Info */}
            <div className="text-center text-xs border-t border-black pt-2 mt-2">
                <div className="flex justify-between mb-1">
                    <span>Total:</span>
                    <span>${order.amountCharged.toFixed(2)}</span>
                </div>
                {order.amountCollected && order.amountCollected > 0 ? (
                   <div className="flex justify-between mb-1">
                        <span>Paid:</span>
                        <span>-${order.amountCollected.toFixed(2)}</span>
                   </div> 
                ) : null}
                <div className="flex justify-between font-bold text-sm">
                    <span>Due:</span>
                    <span>${(order.amountCharged - (order.amountCollected || 0)).toFixed(2)}</span>
                </div>
                
                <p className="mt-3 italic">Thank you for your order!</p>
                <p className="font-bold">Empanadas by Rose</p>
            </div>
        </div>
    );
}