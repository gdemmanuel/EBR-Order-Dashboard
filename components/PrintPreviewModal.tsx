import React from 'react';
import ReactDOM from 'react-dom';
import { Order } from '../types';
import PrintableTicket from './PrintableTicket';
import { XMarkIcon, PrinterIcon } from './icons/Icons';

interface PrintPreviewModalProps {
  orders: Order[];
  onClose: () => void;
}

// Find the portal root element once, outside the component.
const modalRoot = document.getElementById('print-portal-root');

export default function PrintPreviewModal({ orders, onClose }: PrintPreviewModalProps) {
  
  const handlePrint = () => {
    // This direct call is now reliable because the modal content is
    // rendered outside of the main app root that gets hidden.
    window.print();
  };
  
  // If the portal root isn't on the page for some reason, don't render anything.
  if (!modalRoot) {
    return null; 
  }

  const modalContent = (
    // The `id` here is critical for the @media print styles in index.html
    <div id="print-preview-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-brand-tan">
        <header className="p-4 border-b border-brand-tan flex justify-between items-center flex-shrink-0">
          <h2 className="text-2xl font-serif text-brand-brown">Print Preview ({orders.length} Tickets)</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-brand-orange text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-opacity-90 transition-all"
            >
              <PrinterIcon className="w-5 h-5" />
              Print
            </button>
          </div>
        </header>

        <main id="printable-tickets-container" className="overflow-y-auto p-6 bg-gray-100 flex-grow">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {orders.map((order) => (
              <div key={order.id} className="printable-ticket-wrapper">
                <PrintableTicket order={order} />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
  
  // Use the portal to render the modal content into the dedicated div in index.html
  return ReactDOM.createPortal(modalContent, modalRoot);
}
