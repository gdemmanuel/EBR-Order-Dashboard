
import React from 'react';
import { Order, PaymentStatus } from '../types';

interface PrintableTicketProps {
    order: Order;
}

export default function PrintableTicket({ order }: PrintableTicketProps) {
  const isDelivery = order.deliveryRequired;
  const isPaid = order.paymentStatus === PaymentStatus.PAID;
  const balance = order.amountCharged - (order.amountCollected || 0);
  
  // Check for platter in notes or items
  const hasPlatterNote = (order.specialInstructions || '').includes('PARTY PLATTER');
  const hasPlatterItem = order.items.some(i => i.name.toLowerCase().includes('platter'));
  const isPartyPlatter = hasPlatterNote || hasPlatterItem;

  return (
    <div className="font-mono text-black p-4 w-[3.5in] bg-white mx-auto leading-tight relative">
      {/* Header */}
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold uppercase tracking-tight leading-none mb-1">{order.customerName}</h1>
        <p className="text-lg font-bold">{order.pickupDate} @ {order.pickupTime}</p>
      </div>

      {/* Separator */}
      <div className="border-b-2 border-dashed border-black my-2"></div>

      {/* Party Platter Banner */}
      {isPartyPlatter && (
          <div className="text-center my-2">
              <span className="block font-black text-xl border-2 border-black py-1 px-2 uppercase">*** PARTY PLATTER ***</span>
          </div>
      )}

      {/* Columns Header */}
      <div className="flex justify-between font-bold text-lg mb-1">
        <span>Item</span>
        <span>Qty</span>
      </div>

      {/* Items List */}
      <div className="space-y-1 text-lg">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-start">
            <span className="flex-grow pr-4 leading-snug">{item.name}</span>
            <span className="font-bold">{item.quantity}</span>
          </div>
        ))}
      </div>

      {/* Spacing for physical ticket length */}
      <div className="h-8"></div>

      {/* Notes / Delivery */}
      {(order.specialInstructions || isDelivery) && (
          <div className="mb-4 text-sm font-bold">
              {isDelivery && (
                  <div className="mb-2">
                      <p className="uppercase underline">DELIVERY TO:</p>
                      <p>{order.deliveryAddress}</p>
                  </div>
              )}
              {order.specialInstructions && (
                  <div>
                      <p className="uppercase underline">NOTES:</p>
                      <p className="whitespace-pre-wrap">{order.specialInstructions}</p>
                  </div>
              )}
          </div>
      )}

      {/* Footer */}
      <div className="mt-4">
        <div className="border-t-2 border-dashed border-black mb-3"></div>
        
        <div className="text-center">
            {isPaid ? (
                <div className="text-xl font-bold uppercase border-2 border-black inline-block px-4 py-2">
                    ** PAID IN FULL **
                </div>
            ) : (
                <div>
                    <div className="text-lg">Total: ${order.amountCharged.toFixed(2)}</div>
                    <div className="text-2xl font-bold mt-1">** DUE: ${balance.toFixed(2)} **</div>
                </div>
            )}
        </div>
        
        <div className="text-center mt-6 text-xs">
            <p>Empanadas by Rose</p>
            <p>Order #{order.id.slice(-6)}</p>
        </div>
      </div>
    </div>
  );
}
