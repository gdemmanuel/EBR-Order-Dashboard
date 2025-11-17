import React, { useEffect, useRef } from 'react';
import { Order } from '../types';
import PrintableTicket from './PrintableTicket';

interface PrintLayoutProps {
  orders: Order[];
  onDone: () => void;
}

export default function PrintLayout({ orders, onDone }: PrintLayoutProps) {
  const hasPrinted = useRef(false);

  useEffect(() => {
    const handleAfterPrint = () => {
      onDone();
    };

    window.addEventListener('afterprint', handleAfterPrint);

    // Trigger print only once, ensuring the component has mounted
    if (!hasPrinted.current) {
      window.print();
      hasPrinted.current = true;
    }

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [onDone]);

  return (
    <div id="printable-tickets-container">
      {orders.map((order) => (
        <div key={order.id} className="printable-ticket-wrapper">
          <PrintableTicket order={order} />
        </div>
      ))}
    </div>
  );
}
