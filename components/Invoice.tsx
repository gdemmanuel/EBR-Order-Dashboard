
import React from 'react';
import { Order } from '../types';
import { formatDateForDisplay } from '../utils/dateUtils';
import { groupOrderItems } from '../utils/orderUtils';

interface InvoiceProps {
  order: Order;
}

// Using the public logo path instead of embedding a massive Base64 string to prevent build errors
const logoSrc = "/logo.png";

export default function Invoice({ order }: InvoiceProps) {
  const { packages, looseItems } = groupOrderItems(order);

  // Calculate totals
  const subtotal = order.amountCharged - order.deliveryFee;
  const total = order.amountCharged;
  const paid = order.amountCollected || 0;
  const balance = total - paid;

  return (
    <div className="bg-white w-[8.5in] min-h-[11in] p-12 text-gray-800 font-sans box-border relative">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-brand-orange pb-8 mb-8">
        <div>
          <img 
            src={logoSrc} 
            alt="Empanadas by Rose" 
            className="h-24 w-auto object-contain mb-4" 
            onError={(e) => e.currentTarget.style.display = 'none'} 
          />
          <h1 className="text-4xl font-serif text-brand-brown font-bold tracking-tight">Empanadas by Rose</h1>
          <p className="text-sm text-gray-500 mt-1">Authentic Homemade Empanadas</p>
        </div>
        <div className="text-right">
          <h2 className="text-5xl font-extralight text-gray-300 uppercase tracking-widest mb-4">Invoice</h2>
          <div className="space-y-1 text-sm">
            <p><span className="font-bold text-gray-600">Invoice #:</span> {order.id.slice(-6).toUpperCase()}</p>
            <p><span className="font-bold text-gray-600">Date:</span> {new Date().toLocaleDateString()}</p>
            <p><span className="font-bold text-gray-600">Pickup Date:</span> {formatDateForDisplay(order.pickupDate)}</p>
          </div>
        </div>
      </div>

      {/* Addresses */}
      <div className="flex justify-between mb-12">
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</h3>
          <p className="font-bold text-xl text-brand-brown">{order.customerName}</p>
          {order.phoneNumber && <p className="text-sm text-gray-600">{order.phoneNumber}</p>}
          {order.email && <p className="text-sm text-gray-600">{order.email}</p>}
        </div>
        {order.deliveryRequired && (
            <div className="text-right">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ship To</h3>
            <p className="text-sm text-gray-600 max-w-xs ml-auto">{order.deliveryAddress}</p>
            </div>
        )}
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="text-left py-2 text-sm font-bold text-gray-600 uppercase tracking-wider">Description</th>
              <th className="text-center py-2 text-sm font-bold text-gray-600 uppercase tracking-wider w-24">Qty</th>
            </tr>
          </thead>
          <tbody className="text-sm">
             {/* Packages */}
             {packages.map((pkg, idx) => (
                 <React.Fragment key={`pkg-${idx}`}>
                     <tr className="border-b border-gray-200">
                         <td className="py-3 pr-4">
                             <p className="font-bold text-brand-brown">{pkg.name}</p>
                             <ul className="pl-4 mt-1 text-xs text-gray-500 list-disc">
                                 {pkg.items.map((item, i) => (
                                     <li key={i}>{item.quantity}x {item.name.replace('Full ', '')}</li>
                                 ))}
                             </ul>
                         </td>
                         <td className="py-3 text-center font-medium">1</td>
                     </tr>
                 </React.Fragment>
             ))}

             {/* Loose Items */}
             {looseItems.map((item, idx) => (
                <tr key={`item-${idx}`} className="border-b border-gray-100">
                    <td className="py-3 pr-4 text-gray-700">{item.name}</td>
                    <td className="py-3 text-center text-gray-700">{item.quantity}</td>
                </tr>
             ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-12">
        <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
            </div>
            {order.deliveryFee > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                    <span>Delivery Fee:</span>
                    <span>${order.deliveryFee.toFixed(2)}</span>
                </div>
            )}
            <div className="flex justify-between text-lg font-bold text-brand-brown border-t border-gray-300 pt-2 mt-2">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
            </div>
            {paid > 0 && (
                 <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Amount Paid:</span>
                    <span>-${paid.toFixed(2)}</span>
                </div>
            )}
            <div className="flex justify-between text-base font-bold bg-gray-100 p-2 rounded mt-2">
                <span>Balance Due:</span>
                <span className={balance > 0.01 ? "text-brand-orange" : "text-green-700"}>${balance.toFixed(2)}</span>
            </div>
        </div>
      </div>

      {/* Notes / Footer */}
      <div className="border-t-2 border-brand-tan pt-8">
        {order.specialInstructions && (
            <div className="mb-6 bg-brand-tan/20 p-4 rounded-lg border border-brand-tan/50">
                <h4 className="font-bold text-sm text-brand-brown mb-1">Notes:</h4>
                <p className="text-sm text-gray-600 italic">{order.specialInstructions}</p>
            </div>
        )}
        <div className="text-center text-gray-500 text-xs">
            <p className="font-bold text-brand-brown mb-1">Thank you for your business!</p>
            <p>Empanadas by Rose • empanadasbyrose@gmail.com</p>
        </div>
      </div>
    </div>
  );
}