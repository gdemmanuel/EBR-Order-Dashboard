import React from 'react';
import { Order } from '../types';
import { formatDateForDisplay } from '../utils/dateUtils';
import { groupOrderItems } from '../utils/orderUtils';

interface InvoiceProps {
  order: Order;
}

const logoBase64 =
  "data:image/png;base64,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";

export default function Invoice({ order }: InvoiceProps) {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const { packages, looseItems } = groupOrderItems(order);

  // Calculate financials
  const subtotal = (order.amountCharged || 0) - (order.deliveryFee || 0);
  const total = order.amountCharged || 0;

  return (
    <div className="w-[8.5in] min-h-[11in] bg-white text-brand-brown p-12 mx-auto box-border relative flex flex-col font-sans">
      {/* Header Section */}
      <div className="flex flex-col items-center mb-8">
        {/* Logo */}
        <div className="mb-6 h-32 w-full flex items-center justify-center">
          <img
            src={logoBase64}
            alt="Empanadas by Rose"
            className="h-full w-auto object-contain"
          />
        </div>

        <h2 className="text-2xl font-light tracking-[0.2em] text-brand-brown/80 uppercase mt-2">
          Receipt
        </h2>
      </div>

      <div className="w-full h-px bg-brand-tan mb-8"></div>

      {/* Info Section */}
      <div className="flex justify-between items-start mb-12">
        <div className="space-y-4 text-sm">
          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-brand-brown/60 block mb-1">
              Date:
            </span>
            <span className="font-medium">{today}</span>
          </div>

          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-brand-brown/60 block mb-1">
              Event Date:
            </span>
            <span className="font-medium">
              {formatDateForDisplay(order.pickupDate)}
            </span>
          </div>

          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-brand-brown/60 block mb-1">
              Event Time / Type:
            </span>
            <span className="font-medium">
              {order.pickupTime} ({order.deliveryRequired ? 'Delivery' : 'Pickup'})
            </span>
          </div>

          {order.deliveryRequired && order.deliveryAddress && (
            <div>
              <span className="font-bold text-xs uppercase tracking-wider text-brand-brown/60 block mb-1">
                Delivery Address:
              </span>
              <span className="font-medium max-w-[250px] block">
                {order.deliveryAddress}
              </span>
            </div>
          )}
        </div>

        <div className="text-right">
          <span className="font-bold text-xs uppercase tracking-wider text-brand-brown/60 block mb-1">
            To:
          </span>
          <span className="text-xl font-serif font-bold capitalize">
            {order.customerName}
          </span>
          <span className="block text-sm text-gray-500 mt-1">
            {order.phoneNumber}
          </span>
          {order.email && (
            <span className="block text-sm text-gray-500">{order.email}</span>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-grow">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-brand-tan">
              <th className="py-3 text-left font-bold uppercase tracking-wider text-xs w-16 text-brand-brown/60">
                Qty
              </th>
              <th className="py-3 text-left font-bold uppercase tracking-wider text-xs text-brand-brown/60">
                Description
              </th>
              <th className="py-3 text-right font-bold uppercase tracking-wider text-xs w-24 text-brand-brown/60">
                Unit Price
              </th>
              <th className="py-3 text-right font-bold uppercase tracking-wider text-xs w-24 text-brand-brown/60">
                Line Total
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {/* Packages */}
            {packages.map((pkg, idx) => (
              <React.Fragment key={`pkg-${idx}`}>
                <tr>
                  <td className="py-3 align-top font-medium">1</td>
                  <td className="py-3 align-top">
                    <span className="font-bold block text-brand-brown">
                      {pkg.name}
                    </span>
                    <ul className="mt-1 pl-4 text-xs text-gray-500 list-disc">
                      {pkg.items.map((item, i) => (
                        <li key={i}>
                          {item.quantity}x {item.name.replace('Full ', '')}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-3 align-top text-right text-gray-400">-</td>
                  <td className="py-3 align-top text-right font-medium">-</td>
                </tr>
              </React.Fragment>
            ))}

            {/* Loose Items / Extras */}
            {looseItems.map((item, idx) => (
              <tr key={`item-${idx}`}>
                <td className="py-3 font-medium">{item.quantity}</td>
                <td className="py-3">{item.name}</td>
                <td className="py-3 text-right text-gray-400">-</td>
                <td className="py-3 text-right font-medium">-</td>
              </tr>
            ))}

            {/* Filler rows */}
            {[1, 2, 3].map(i => (
              <tr key={`filler-${i}`}>
                <td className="py-4">&nbsp;</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end mt-8">
        <div className="w-64 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="font-bold uppercase tracking-wider text-brand-brown/60">
              Subtotal
            </span>
            <span className="font-bold">${subtotal.toFixed(2)}</span>
          </div>

          {order.deliveryRequired && (
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold uppercase tracking-wider text-brand-brown/60">
                Delivery Fee
              </span>
              <span className="font-bold">${order.deliveryFee.toFixed(2)}</span>
            </div>
          )}

          {Math.abs(total - (subtotal + order.deliveryFee)) > 0.01 && (
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold uppercase tracking-wider text-brand-brown/60">
                Fees / Adj
              </span>
              <span className="font-bold">
                ${(total - (subtotal + order.deliveryFee)).toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center bg-gray-100 p-2 rounded border border-gray-200 mt-2">
            <span className="font-bold uppercase tracking-wider text-brand-brown">
              Total Paid
            </span>
            <span className="font-bold text-lg">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-16 text-center">
        <p className="text-brand-brown/80 font-serif italic mb-8">
          Thank you for your business!
        </p>

        <div className="text-[10px] text-gray-500 uppercase tracking-widest space-y-1">
          <p>
            Empanadas by Rose | 27 Hastings Rd | Massapequa, NY 11758 | Phone:
            516-242-3221
          </p>
          <p>www.empanadasbyrose.com</p>
        </div>
      </div>
    </div>
  );
}
