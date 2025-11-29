import React from 'react';
import { Order } from '../types';

interface PrintableTicketProps {
  order: Order;
}

export default function PrintableTicket({ order }: PrintableTicketProps) {
  const balanceDue = order.amountCharged - (order.amountCollected || 0);
  const isPartyPlatter = (order.specialInstructions || '').includes("PARTY PLATTER");

  return (
    <div className="p-4 bg-white text-black font-sans text-sm leading-normal h-full flex flex-col border border-gray-300">
      
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-4">
        <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight">Empanadas by Rose</h1>
            <p className="text-xs">Homemade • Fresh • Delicious</p>
        </div>
        <div className="text-right">
            <p className="font-bold text-lg">{order.customerName}</p>
            <p className="text-sm">{order.pickupDate} @ {order.pickupTime}</p>
            {order.deliveryRequired && <p className="text-xs font-bold mt-1">DELIVERY</p>}
        </div>
      </div>

      {/* Party Platter Banner */}
      {isPartyPlatter && (
          <div className="mb-4 text-center border-2 border-black p-2">
              <h2 className="text-xl font-black uppercase tracking-widest">*** PARTY PLATTER ***</h2>
          </div>
      )}

      {/* Items Table */}
      <div className="flex-grow mb-4">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="border-b border-black">
                    <th className="py-1 font-bold w-16 text-center">QTY</th>
                    <th className="py-1 font-bold">ITEM DESCRIPTION</th>
                </tr>
            </thead>
            <tbody>
                {order.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                        <td className="py-2 text-center font-bold text-lg align-top">{item.quantity}</td>
                        <td className="py-2 align-top">
                            <span className="font-medium text-base">{item.name}</span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* Footer / Notes / Totals */}
      <div className="mt-auto pt-2 border-t-2 border-black">
          <div className="flex justify-between items-start gap-4">
              <div className="flex-grow">
                  {order.deliveryRequired && (
                      <div className="mb-2 text-xs">
                          <span className="font-bold">Deliver To: </span>
                          {order.deliveryAddress}
                          {order.phoneNumber && <span> ({order.phoneNumber})</span>}
                      </div>
                  )}
                  
                  {order.specialInstructions && (
                      <div className="text-xs bg-gray-100 p-2 border border-gray-300">
                          <p className="font-bold">NOTES:</p>
                          <p className="whitespace-pre-wrap">{order.specialInstructions}</p>
                      </div>
                  )}
              </div>

              <div className="text-right min-w-[150px]">
                  {balanceDue > 0.01 ? (
                      <div className="border-2 border-black p-2 text-center">
                          <p className="text-xs font-bold">BALANCE DUE</p>
                          <p className="text-xl font-bold">${balanceDue.toFixed(2)}</p>
                      </div>
                  ) : (
                      <div className="border-2 border-black p-2 text-center bg-gray-100">
                          <p className="text-lg font-bold">PAID IN FULL</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}