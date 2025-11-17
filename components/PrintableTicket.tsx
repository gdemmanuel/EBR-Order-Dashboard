
import React from 'react';
import { Order } from '../types';

interface PrintableTicketProps {
  order: Order;
}

export default function PrintableTicket({ order }: PrintableTicketProps) {
  const balanceDue = order.amountCharged - (order.amountCollected || 0);

  return (
    <div className="printable-ticket bg-white text-black p-1 font-mono text-[9pt] leading-tight">
      <div className="text-center font-bold text-[10pt] mb-2">
        <p>{order.customerName}</p>
        <p>{order.pickupDate} @ {order.pickupTime}</p>
      </div>
      
      {order.deliveryRequired && order.deliveryAddress && (
        <div className="mb-2 border-t border-black border-dashed pt-1">
          <p className="font-bold">DELIVERY TO:</p>
          <p>{order.deliveryAddress}</p>
        </div>
      )}
      
      <div className="border-y border-black border-dashed py-1 my-1">
        <div className="grid grid-cols-4 font-bold">
          <p className="col-span-3">Item</p>
          <p className="text-right">Qty</p>
        </div>
        {order.items.map((item, index) => (
          <div key={index} className="grid grid-cols-4">
            <p className="col-span-3 truncate">{item.name}</p>
            <p className="text-right">{item.quantity}</p>
          </div>
        ))}
      </div>

      <div className="mt-2 text-right">
        {balanceDue > 0 ? (
          <p className="font-bold text-sm">BALANCE DUE: ${balanceDue.toFixed(2)}</p>
        ) : (
          <p className="font-bold text-sm">** PAID IN FULL **</p>
        )}
      </div>

      {order.specialInstructions && (
        <div className="mt-2 border-t border-black border-dashed pt-1">
            <p className="font-bold">NOTES:</p>
            <p className="text-xs whitespace-pre-wrap">{order.specialInstructions}</p>
        </div>
      )}

    </div>
  );
}