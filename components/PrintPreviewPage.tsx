
import React from 'react';
import { Order } from '../types';
import PrintableTicket from './PrintableTicket';
import { PrinterIcon, ArrowUturnLeftIcon } from './icons/Icons';

interface PrintPreviewPageProps {
  orders: Order[];
  onExit: () => void;
  onMarkAsPrinted?: () => void;
}

export default function PrintPreviewPage({ orders, onExit, onMarkAsPrinted }: PrintPreviewPageProps) {
  
  // This is the definitive fix for printing in complex environments.
  // It creates a new, clean window with only the ticket content and styles,
  // isolating it from the main app and any potential interference.
  const handlePrint = () => {
    const printContent = document.getElementById('printable-tickets-container');
    if (!printContent) {
      console.error("Printable content not found!");
      return;
    }

    // Trigger the "Mark as Printed" callback if provided
    if (onMarkAsPrinted) {
        onMarkAsPrinted();
    }

    const printWindow = window.open('', '_blank', 'height=800,width=1000');
    if (!printWindow) {
      alert('Could not open print window. Please disable your pop-up blocker for this site.');
      return;
    }

    // Clone all style and link tags from the main document's head to preserve styling.
    const stylesHtml = Array.from(document.head.querySelectorAll('link, style'))
      .map(el => el.outerHTML)
      .join('');
    
    // Get the HTML of the tickets.
    const ticketsHtml = printContent.innerHTML;

    // Construct a full HTML document for the new window.
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Print Order Tickets</title>
          ${stylesHtml}
        </head>
        <body>
          <div id="printable-tickets-container">
            ${ticketsHtml}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    // Use a short timeout to ensure the content and styles have been rendered by the browser
    // in the new window before triggering the print dialog. This is more robust than `onload`.
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  };
  
  return (
    <div id="print-preview-page" className="min-h-screen">
      <header id="print-preview-header" className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-serif text-brand-brown">Print Preview</h1>
          <p className="text-sm text-brand-brown/70">{orders.length} ticket(s) selected</p>
        </div>
        <div className="flex items-center gap-3">
           <button
            onClick={onExit}
            className="flex items-center gap-2 bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <ArrowUturnLeftIcon className="w-5 h-5" />
            Back to Dashboard
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-brand-orange text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-opacity-90 transition-all"
          >
            <PrinterIcon className="w-5 h-5" />
            Print Tickets
          </button>
        </div>
      </header>
      
      <main id="print-preview-content" className="p-4">
         <div id="printable-tickets-container">
           {orders.map((order) => (
             <div key={order.id} className="printable-ticket-wrapper bg-white">
               <PrintableTicket order={order} />
             </div>
           ))}
         </div>
      </main>
    </div>
  );
}