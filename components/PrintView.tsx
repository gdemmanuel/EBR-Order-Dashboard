import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Order } from '../types';
import PrintableTicket from './PrintableTicket';

interface PrintViewProps {
  orders: Order[];
  onDonePrinting: () => void;
}

const printPortalRoot = document.getElementById('print-portal-root');

export default function PrintView({ orders, onDonePrinting }: PrintViewProps) {
  useEffect(() => {
    // Add the printing class to the body to switch views via CSS
    document.body.classList.add('printing');

    const handleAfterPrint = () => {
      // Clean up after printing is done
      document.body.classList.remove('printing');
      onDonePrinting();
    };
    
    window.addEventListener('afterprint', handleAfterPrint);

    // This timeout ensures that the browser has time to apply the 'printing' class
    // and re-render the layout before the print dialog is triggered.
    const timer = setTimeout(() => {
      window.print();
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
      // Ensure the class is removed if the component unmounts unexpectedly.
      document.body.classList.remove('printing');
    };
  }, [onDonePrinting]);

  if (!printPortalRoot) {
    console.error("The 'print-portal-root' element was not found in the DOM.");
    return null;
  }

  const printContent = (
    <div>
      {orders.map((order) => (
        <div key={order.id} className="printable-ticket-wrapper">
          <PrintableTicket order={order} />
        </div>
      ))}
    </div>
  );

  return createPortal(printContent, printPortalRoot);
}