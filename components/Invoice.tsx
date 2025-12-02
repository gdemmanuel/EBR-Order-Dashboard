import React from 'react';
import { Order } from '../types';
import { formatDateForDisplay } from '../utils/dateUtils';
import { groupOrderItems } from '../utils/orderUtils';

interface InvoiceProps {
  order: Order;
}

const logoBase64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwCAYAAAA+VemSAAAAAXNSR0IArs4c6QA...AQAAAABAAAATgAAAAAAAAOqAAAAAQAAA6oAAAABAASShgAHAAAAMwAAAISgAQAD";

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
