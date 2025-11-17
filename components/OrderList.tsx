
import React from 'react';
import { Order, FollowUpStatus, PaymentStatus } from '../types';
import { CalendarIcon, TruckIcon } from './icons/Icons';

interface OrderListProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

const StatusBadge: React.FC<{ status: FollowUpStatus }> = ({ status }) => {
  const baseClasses = "px-2.5 py-1 text-xs font-semibold rounded-full";
  const statusClasses = {
    [FollowUpStatus.NEEDED]: "bg-amber-100 text-amber-800",
    [FollowUpStatus.CONTACTED]: "bg-stone-200 text-stone-800",
    [FollowUpStatus.COMPLETED]: "bg-emerald-100 text-emerald-800",
  };
  return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};


export default function OrderList({ orders, onSelectOrder }: OrderListProps) {
  return (
    <div className="bg-white border border-brand-tan rounded-lg overflow-hidden">
        <div className="px-6 py-4">
            <h2 className="text-2xl font-serif text-brand-brown">All Orders</h2>
        </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-brand-brown/90">
          <thead className="text-xs text-brand-brown/80 uppercase bg-brand-tan/40">
            <tr>
              <th scope="col" className="px-6 py-3 font-medium">Customer</th>
              <th scope="col" className="px-6 py-3 font-medium hidden md:table-cell">Pickup Details</th>
              <th scope="col" className="px-6 py-3 font-medium hidden sm:table-cell">Total Items</th>
              <th scope="col" className="px-6 py-3 font-medium hidden lg:table-cell">Payment</th>
              <th scope="col" className="px-6 py-3 font-medium">Follow-up Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr 
                key={order.id} 
                className="bg-white border-b border-brand-tan/60 hover:bg-brand-tan/30 cursor-pointer transition-colors"
                onClick={() => onSelectOrder(order)}
              >
                <td className="px-6 py-4 font-medium text-brand-brown whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-orange/20 flex items-center justify-center font-bold text-brand-orange shrink-0">
                      {order.customerName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {order.customerName}
                        {order.deliveryRequired && <TruckIcon className="w-4 h-4 text-gray-400" title="Delivery" />}
                      </div>
                      <div className="text-gray-500 text-xs flex items-center gap-1.5 md:hidden">
                        <CalendarIcon className="w-3 h-3" /> {order.pickupDate} @ {order.pickupTime}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                    <div>{order.pickupDate}</div>
                    <div className="text-gray-500">{order.pickupTime}</div>
                </td>
                <td className="px-6 py-4 hidden sm:table-cell">
                    {order.totalMini + order.totalFullSize}
                </td>
                <td className="px-6 py-4 hidden lg:table-cell">
                    {order.paymentStatus === PaymentStatus.PAID ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Paid
                        </span>
                    ) : (
                        <div className="text-brand-brown/90">
                           ${(order.amountCharged - (order.amountCollected || 0)).toFixed(2)}
                           <span className="text-gray-500"> left</span>
                        </div>
                    )}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={order.followUpStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
