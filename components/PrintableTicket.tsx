import React from 'react';
import { Order } from '../types';

interface PrintableTicketProps {
  order: Order;
}

export default function PrintableTicket({ order }: PrintableTicketProps) {
  const balanceDue = order.amountCharged - (order.amountCollected || 0);

  return (
    <div className="printable-ticket bg-white text-black p-2 font-mono text-[9pt] leading-snug h-full flex flex-col">
      {/* Header section */}
      <div className="text-center font-bold text-[10pt] mb-1.5">
        <p className="break-words">{order.customerName}</p>
        <p>{order.pickupDate} @ {order.pickupTime}</p>
      </div>
      
      {/* Delivery information */}
      {order.deliveryRequired && (
        <div className="border-t border-black border-dashed pt-1.5 mb-1.5">
          <p className="font-bold">
            DELIVERY TO:{order.deliveryFee > 0 && ` ($${order.deliveryFee.toFixed(2)})`}
          </p>
          {order.deliveryAddress && <p className="break-words">{order.deliveryAddress}</p>}
          {order.phoneNumber && <p>Phone: {order.phoneNumber}</p>}
        </div>
      )}
      
      {/* Items list - this section will grow to fill available space */}
      <div className="border-y border-black border-dashed py-1.5 flex-grow min-h-0 overflow-hidden">
        <div className="grid grid-cols-4 font-bold">
          <p className="col-span-3">Item</p>
          <p className="text-right">Qty</p>
        </div>
        {order.items.map((item, index) => (
          <div key={index} className="grid grid-cols-4">
            <p className="col-span-3 break-words pr-1">{item.name}</p>
            <p className="text-right">{item.quantity}</p>
          </div>
        ))}
      </div>

      {/* Footer section - pushed to the bottom by flex-grow above */}
      <div className="mt-auto pt-1.5">
        <div className="text-right">
          {balanceDue > 0 ? (
            <p className="font-bold text-[10pt]">BALANCE DUE: ${balanceDue.toFixed(2)}</p>
          ) : (
            <p className="font-bold text-[10pt]">** PAID IN FULL **</p>
          )}
        </div>

        {order.specialInstructions && (
          <div className="mt-1.5 border-t border-black border-dashed pt-1.5">
              <p className="font-bold">NOTES:</p>
              <p className="text-[8pt] whitespace-pre-wrap break-words">{order.specialInstructions}</p>
          </div>
        )}
      </div>
    </div>
  );
}