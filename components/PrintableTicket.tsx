
import React from 'react';
import { Order } from '../types';

interface PrintableTicketProps {
    order: Order;
}

export default function PrintableTicket({ order }: PrintableTicketProps) {
  const totalQty = order.totalMini + order.totalFullSize;
  const isDelivery = order.deliveryRequired;
  
  return (
    <div className="font-mono text-black p-4 max-w-[300px] border-2 border-dashed border-gray-300 bg-white mx-auto my-4 text-[11px] leading-tight">
      <div className="text-center mb-3">
        <h1 className="text-lg font-bold uppercase tracking-wider">Empanadas by Rose</h1>
        <p className="text-[10px] mt-1">Order #{order.id}</p>
        <p className="text-[10px]">{order.pickupDate}</p>
        <p className="font-bold text-sm mt-1">{order.pickupTime}</p>
      </div>

      <div className="border-b-2 border-black border-dashed mb-2 pb-1">
        <p className="font-bold text-sm uppercase">{order.customerName}</p>
        <p>{order.phoneNumber}</p>
        {isDelivery && (
            <p className="mt-1 font-bold">DELIVERY: {order.deliveryAddress}</p>
        )}
      </div>

      <div className="space-y-1 mb-3">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-start">
            <span className="font-bold">{item.quantity}</span>
            <span className="flex-grow ml-2">{item.name}</span>
          </div>
        ))}
      </div>

      <div className="border-t-2 border-black border-dashed pt-2 flex justify-between items-center font-bold text-sm">
        <span>Total Items:</span>
        <span>{totalQty}</span>
      </div>
      
      <div className="flex justify-between items-center font-bold text-sm mt-1">
        <span>Total:</span>
        <span>${order.amountCharged.toFixed(2)}</span>
      </div>

      {order.specialInstructions && (
          <div className="mt-3 border-t border-black border-dashed pt-2">
              <p className="font-bold">NOTES:</p>
              <div className="whitespace-pre-wrap break-words">
                  {(order.specialInstructions || '').split('\n').map((line, i) => (
                      <p key={i} className={line.includes('PARTY PLATTER') ? 'font-bold uppercase' : ''}>{line}</p>
                  ))}
              </div>
          </div>
      )}
      
      <div className="text-center mt-4 text-[9px]">
          Thank you for your order!
      </div>
    </div>
  );
}
