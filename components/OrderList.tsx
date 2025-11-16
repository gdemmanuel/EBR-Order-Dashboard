import React from 'react';
import { Order, FollowUpStatus } from '../types';
import { CalendarIcon, TruckIcon } from './icons/Icons';

interface OrderListProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

const StatusBadge: React.FC<{ status: FollowUpStatus }> = ({ status }) => {
  const baseClasses = "px-2.5 py-1 text-xs font-semibold rounded-full";
  const statusClasses = {
    [FollowUpStatus.NEEDED]: "bg-yellow-100 text-yellow-800",
    [FollowUpStatus.CONTACTED]: "bg-blue-100 text-blue-800",
    [FollowUpStatus.COMPLETED]: "bg-green-100 text-green-800",
  };
  return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};


export default function OrderList({ orders, onSelectOrder }: OrderListProps) {
  return (
    <div className="bg-white shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">All Orders</h2>
        </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">Customer</th>
              <th scope="col" className="px-6 py-3 hidden md:table-cell">Pickup Details</th>
              <th scope="col" className="px-6 py-3 hidden sm:table-cell">Total Items</th>
              <th scope="col" className="px-6 py-3 hidden lg:table-cell">Amount</th>
              <th scope="col" className="px-6 py-3">Follow-up Status</th>
              <th scope="col" className="px-6 py-3"><span className="sr-only">View</span></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 shrink-0">
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
                    ${order.amountCharged.toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={order.followUpStatus} />
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onSelectOrder(order)}
                    className="font-medium text-orange-600 hover:underline"
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
