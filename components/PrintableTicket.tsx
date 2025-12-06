
import React from 'react';
import { Order } from '../types';
import { formatDateForDisplay } from '../utils/dateUtils';
import { groupOrderItems } from '../utils/orderUtils';

interface PrintableTicketProps {
  order: Order;
}

export default function PrintableTicket({ order }: PrintableTicketProps) {
  const balanceDue = order.amountCharged - (order.amountCollected || 0);
  const isPartyPlatter = (order.specialInstructions || '').includes("PARTY PLATTER");
  const { packages, looseItems } = groupOrderItems(order);

  return (
    <div className="w-full h-full bg-white text-black font-mono text-[11px] leading-tight p-1 flex flex-col box-border">
      
      {/* Header: Name and Date */}
      <div className="text-center mb-1">
        <h1 className="text-sm font-bold uppercase leading-none mb-1">{order.customerName}</h1>
        <p className="font-bold">{formatDateForDisplay(order.pickupDate)} @ {order.pickupTime}</p>
        {order.deliveryRequired && <p className="font-bold mt-0.5 uppercase">** Delivery **</p>}
      </div>

      {/* Party Platter Banner */}
      {isPartyPlatter && (
          <div className="text-center font-black my-1 text-[12px] border-y border-black border-dashed py-0.5">
              *** PARTY PLATTER ***
          </div>
      )}

      {/* Columns Headers */}
      <div className="flex justify-between font-bold mb-1 border-b border-black border-dashed">
        <span>Item</span>
        <span>Qty</span>
      </div>

      {/* Items List */}
      <div className="flex-grow">
        
        {/* Packages */}
        {packages.map((pkg, idx) => (
            <div key={idx} className="mb-1">
                <div className="font-bold text-[10px] uppercase border-b border-black/30 mb-0.5">{pkg.name}</div>
                <ul className="pl-1">
                    {pkg.items.map((item, i) => (
                        <li key={i} className="flex justify-between items-start leading-snug">
                            <span className="pr-1 break-words max-w-[85%]">{item.name.replace('Full ', '')}</span>
                            <span className="font-bold">{item.quantity}</span>
                        </li>
                    ))}
                </ul>
            </div>
        ))}

        {/* Loose Items / Extras */}
        {looseItems.length > 0 && (
            <div className={packages.length > 0 ? "mt-1 pt-1 border-t border-black border-dotted" : ""}>
                {packages.length > 0 && <div className="font-bold text-[10px] uppercase mb-0.5">EXTRAS</div>}
                <ul>
                    {looseItems.map((item, index) => (
                        <li key={index} className="flex justify-between items-start leading-snug">
                            <span className="pr-1 break-words max-w-[85%]">{item.name}</span>
                            <span className="font-bold">{item.quantity}</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2">
          {/* Delivery Address */}
          {order.deliveryRequired && order.deliveryAddress && (
              <div className="mb-2 text-[10px] leading-3 border-l-2 border-black pl-1 my-1">
                  <span className="font-bold block">DELIVER TO:</span>
                  <span className="break-words">{order.deliveryAddress}</span>
              </div>
          )}

          {/* Contact Info - NEW */}
          <div className="mb-2 text-[10px] leading-3 text-gray-800 border-t border-black border-dotted pt-1">
              {order.phoneNumber && <span className="block font-medium">{order.phoneNumber}</span>}
              {order.contactMethod && <span className="block text-[9px]">Via: {order.contactMethod}</span>}
          </div>

          {/* Notes */}
          {order.specialInstructions && (
              <div className="mb-2 text-[10px] leading-3 border-l-2 border-black pl-1 my-1 italic">
                  {order.specialInstructions}
              </div>
          )}

          <div className="border-t border-black border-dashed my-1 w-full" />
          
          <div className="text-center font-bold text-xs py-1">
              {balanceDue > 0.01 ? (
                  <span>** BALANCE: ${balanceDue.toFixed(2)} **</span>
              ) : (
                  <span>** PAID IN FULL **</span>
              )}
          </div>
      </div>
    </div>
  );
}