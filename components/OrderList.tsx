
import React, { useState, useEffect, useRef } from 'react';
import { Order, FollowUpStatus, PaymentStatus } from '../types';
import { CalendarIcon, TruckIcon, MagnifyingGlassIcon, PrinterIcon } from './icons/Icons';

interface OrderListProps {
  title?: string;
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onPrintSelected: (selectedOrders: Order[]) => void;
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


export default function OrderList({ title, orders, onSelectOrder, onPrintSelected }: OrderListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // FIX: Use a ref to imperatively set the indeterminate property on the checkbox,
  // resolving the TypeScript error where `indeterminate` is not a recognized prop.
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const filteredOrders = orders.filter(order =>
    order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset selection when the underlying order list changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [orders]);
  
  const handleSelectOne = (id: string, isChecked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (isChecked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    } else {
      setSelectedIds(new Set());
    }
  };
  
  const handlePrint = () => {
    const selectedOrders = orders.filter(o => selectedIds.has(o.id));
    onPrintSelected(selectedOrders);
  };

  const numSelected = selectedIds.size;
  const rowCount = filteredOrders.length;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < rowCount;
    }
  }, [numSelected, rowCount]);


  return (
    <div className="bg-white border border-brand-tan rounded-lg overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center flex-wrap gap-4">
            <h2 className="text-2xl font-serif text-brand-brown">{title || 'All Orders'}</h2>
            <div className="flex items-center gap-4">
              {numSelected > 0 && (
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-white text-brand-brown font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300 animate-fade-in"
                >
                  <PrinterIcon className="w-5 h-5" />
                  Print {numSelected} Ticket{numSelected > 1 ? 's' : ''}
                </button>
              )}
              <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3" aria-hidden="true">
                      <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                  </span>
                  <input
                      type="search"
                      placeholder="Search by customer..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-lg border-gray-300 shadow-sm focus:ring-brand-orange focus:border-brand-orange bg-white text-brand-brown"
                      aria-label="Search orders by customer name"
                  />
              </div>
            </div>
        </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-brand-brown/90">
          <thead className="text-xs text-brand-brown/80 uppercase bg-brand-tan/40">
            <tr>
              <th scope="col" className="p-4">
                <div className="flex items-center">
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    className="w-4 h-4 text-brand-orange bg-gray-100 border-gray-300 rounded focus:ring-brand-orange"
                    onChange={handleSelectAll}
                    checked={rowCount > 0 && numSelected === rowCount}
                    aria-label="Select all orders"
                  />
                </div>
              </th>
              <th scope="col" className="px-6 py-3 font-medium">Customer</th>
              <th scope="col" className="px-6 py-3 font-medium hidden md:table-cell">Pickup Details</th>
              <th scope="col" className="px-6 py-3 font-medium hidden sm:table-cell">Total Items</th>
              <th scope="col" className="px-6 py-3 font-medium hidden lg:table-cell">Balance Due</th>
              <th scope="col" className="px-6 py-3 font-medium">Follow-up Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? filteredOrders.map((order) => (
              <tr 
                key={order.id} 
                className="bg-white border-b border-brand-tan/60 hover:bg-brand-tan/30 cursor-pointer transition-colors"
                onClick={() => onSelectOrder(order)}
              >
                <td className="p-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-brand-orange bg-gray-100 border-gray-300 rounded focus:ring-brand-orange"
                      checked={selectedIds.has(order.id)}
                      onChange={(e) => handleSelectOne(order.id, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      aria-labelledby={`customer-name-${order.id}`}
                    />
                  </div>
                </td>
                <td id={`customer-name-${order.id}`} className="px-6 py-4 font-medium text-brand-brown whitespace-nowrap">
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
                     {(() => {
                        const balance = order.amountCharged - (order.amountCollected || 0);
                        return order.paymentStatus === PaymentStatus.PAID || balance <= 0 ? (
                            <span className="text-gray-400 font-medium">$0.00</span>
                        ) : (
                            <span className="text-red-600 font-bold">
                                ${balance.toFixed(2)}
                            </span>
                        );
                    })()}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={order.followUpStatus} />
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="text-center py-10 text-brand-brown/70">
                  No orders found for "{searchQuery}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
