
import React from 'react';
import { Order } from '../types';
import Invoice from './Invoice';
import { PrinterIcon, ArrowUturnLeftIcon } from './icons/Icons';

interface InvoicePreviewPageProps {
  order: Order;
  onExit: () => void;
}

export default function InvoicePreviewPage({ order, onExit }: InvoicePreviewPageProps) {
  
  const handlePrint = () => {
    const printContent = document.getElementById('invoice-container');
    if (!printContent) {
      console.error("Invoice content not found!");
      return;
    }

    const printWindow = window.open('', '_blank', 'height=1100,width=850');
    if (!printWindow) {
      alert('Could not open print window. Please disable your pop-up blocker for this site.');
      return;
    }

    // Clone styles
    const stylesHtml = Array.from(document.head.querySelectorAll('link, style'))
      .map(el => el.outerHTML)
      .join('');
    
    const invoiceHtml = printContent.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Invoice - ${order.customerName}</title>
          ${stylesHtml}
          <style>
            body { background: white; margin: 0; padding: 0; }
            #invoice-wrapper { width: 100%; height: 100%; margin: 0; padding: 0; }
            @page { size: auto; margin: 0mm; }
          </style>
        </head>
        <body>
          <div id="invoice-wrapper" class="flex justify-center">
            ${invoiceHtml}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10 print:hidden">
        <div>
          <h1 className="text-2xl font-serif text-brand-brown">Invoice Preview</h1>
          <p className="text-sm text-brand-brown/70">Generating invoice for {order.customerName}</p>
        </div>
        <div className="flex items-center gap-3">
           <button
            onClick={onExit}
            className="flex items-center gap-2 bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <ArrowUturnLeftIcon className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-brand-brown text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-brand-brown/90 transition-all"
          >
            <PrinterIcon className="w-5 h-5" />
            Print Invoice
          </button>
        </div>
      </header>
      
      <main className="flex-grow p-8 flex justify-center overflow-auto">
         <div id="invoice-container" className="shadow-2xl">
             <Invoice order={order} />
         </div>
      </main>
    </div>
  );
}
