
import React, { useState, useCallback } from 'react';
import { Order, FollowUpStatus } from '../types';
import { generateFollowUpMessage, generateOrderConfirmationMessage } from '../services/geminiService';
import { CalendarIcon, ClockIcon, UserIcon, PhoneIcon, MapPinIcon, CurrencyDollarIcon, SparklesIcon, XMarkIcon, PencilIcon, ClipboardDocumentCheckIcon, PaperAirplaneIcon, CreditCardIcon, ArrowTopRightOnSquareIcon } from './icons/Icons';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onUpdateFollowUp: (orderId: string, status: FollowUpStatus) => void;
  onEdit: (order: Order) => void;
}

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: string | number | null | undefined }> = ({ icon, label, value }) => {
    if (!value && value !== 0) return null;
    return (
        <div className="flex items-start space-x-3">
            <div className="text-gray-400 mt-1">{icon}</div>
            <div>
                <p className="text-sm font-medium text-brand-brown/70">{label}</p>
                <p className="text-base text-brand-brown">{value}</p>
            </div>
        </div>
    );
};

export default function OrderDetailModal({ order, onClose, onUpdateFollowUp, onEdit }: OrderDetailModalProps) {
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<'confirmation' | 'followup' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mapsUrl = order.deliveryAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}` : '#';

  const handleGenerateFollowUp = useCallback(async () => {
    setLoadingAction('followup');
    setError(null);
    setGeneratedMessage('');
    try {
      const message = await generateFollowUpMessage(order);
      setGeneratedMessage(message);
    } catch (err) {
      setError('Failed to generate message. Please check your API key and try again.');
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  }, [order]);

  const handleGenerateConfirmation = useCallback(async () => {
    setLoadingAction('confirmation');
    setError(null);
    setGeneratedMessage('');
    try {
      const message = await generateOrderConfirmationMessage(order);
      setGeneratedMessage(message);
    } catch (err) {
      setError('Failed to generate message. Please check your API key and try again.');
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  }, [order]);
  
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdateFollowUp(order.id, e.target.value as FollowUpStatus);
  };

  const handleSendText = () => {
    if (!order.phoneNumber || !generatedMessage) {
        setError("Customer phone number is missing or no message has been generated.");
        return;
    }
    // Clean phone number to remove formatting
    const cleanedPhoneNumber = order.phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanedPhoneNumber) {
        setError("Invalid phone number format.");
        return;
    }
    
    const encodedMessage = encodeURIComponent(generatedMessage);
    const smsLink = `sms:${cleanedPhoneNumber}?body=${encodedMessage}`;
    
    // Use window.open as a robust method for triggering the sms link
    window.open(smsLink, '_blank');
  };


  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-brand-tan">
          <header className="p-6 border-b border-brand-tan flex justify-between items-center">
            <h2 className="text-3xl font-serif text-brand-brown">Order Details</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(order)}
                className="flex items-center gap-2 bg-white text-brand-brown font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300"
              >
                <PencilIcon className="w-4 h-4" />
                Edit
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </header>
          
          <div className="overflow-y-auto p-6 space-y-6">
            {/* Customer & Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                  <DetailItem icon={<UserIcon className="w-5 h-5" />} label="Customer" value={order.customerName} />
                  <DetailItem icon={<PhoneIcon className="w-5 h-5" />} label="Phone" value={order.phoneNumber} />
                   {order.deliveryRequired && order.deliveryAddress && (
                      <div className="flex items-start space-x-3">
                          <div className="text-gray-400 mt-1"><MapPinIcon className="w-5 h-5" /></div>
                          <div>
                              <p className="text-sm font-medium text-brand-brown/70">Delivery Address</p>
                               <a 
                                  href={mapsUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-base text-brand-brown hover:text-brand-orange hover:underline transition-colors flex items-center gap-1.5"
                                  aria-label={`Open Google Maps for address: ${order.deliveryAddress}`}
                              >
                                  <span>{order.deliveryAddress}</span>
                                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                              </a>
                          </div>
                      </div>
                  )}
              </div>
              <div className="space-y-4">
                  <DetailItem icon={<CalendarIcon className="w-5 h-5" />} label="Pickup Date" value={order.pickupDate} />
                  <DetailItem icon={<ClockIcon className="w-5 h-5" />} label="Pickup Time" value={order.pickupTime} />
                  <DetailItem icon={<CurrencyDollarIcon className="w-5 h-5" />} label="Amount Charged" value={`$${order.amountCharged.toFixed(2)}`} />
                  <DetailItem icon={<CreditCardIcon className="w-5 h-5" />} label="Payment Status" value={order.paymentStatus} />
                   {order.deliveryRequired && <DetailItem icon={<CurrencyDollarIcon className="w-5 h-5" />} label="Delivery Fee" value={`$${order.deliveryFee.toFixed(2)}`} />}
              </div>
            </div>

            {/* Items Ordered */}
            <div>
              <h3 className="text-lg font-semibold text-brand-brown/90 mb-2">Items Ordered</h3>
              <div className="max-h-40 overflow-y-auto bg-brand-tan/30 p-3 rounded-lg border border-brand-tan">
                  <ul className="divide-y divide-brand-tan">
                      {order.items.map((item, index) => (
                      <li key={index} className="flex justify-between py-2 text-sm">
                          <span className="font-medium text-brand-brown">{item.name}</span>
                          <span className="text-gray-500">x {item.quantity}</span>
                      </li>
                      ))}
                  </ul>
              </div>
            </div>

            {/* Special Instructions */}
            {order.specialInstructions && (
              <div>
                  <h3 className="text-lg font-semibold text-brand-brown/90 mb-2">Special Instructions</h3>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-900 whitespace-pre-wrap">{order.specialInstructions}</p>
                  </div>
              </div>
            )}
            
            {/* Follow-up Section */}
            <div className="bg-brand-tan/40 border border-brand-tan p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-brand-brown/90 mb-3">Customer Communication</h3>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div>
                  <label htmlFor="followUpStatus" className="block text-sm font-medium text-brand-brown/90 mb-1">Status</label>
                  <select id="followUpStatus" value={order.followUpStatus} onChange={handleStatusChange} className="rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown">
                    {Object.values(FollowUpStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-grow w-full flex flex-col sm:flex-row gap-2">
                   <button
                    onClick={handleGenerateConfirmation}
                    disabled={loadingAction !== null}
                    className="w-full flex items-center justify-center gap-2 bg-stone-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-stone-700 transition-colors duration-200 disabled:bg-stone-300"
                  >
                    <ClipboardDocumentCheckIcon className="w-5 h-5" />
                    {loadingAction === 'confirmation' ? 'Drafting...' : 'Draft Confirmation'}
                  </button>
                  <button
                    onClick={handleGenerateFollowUp}
                    disabled={loadingAction !== null}
                    className="w-full flex items-center justify-center gap-2 bg-brand-orange text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-opacity-90 transition-colors duration-200 disabled:bg-brand-orange/50"
                  >
                    <SparklesIcon className="w-5 h-5" />
                    {loadingAction === 'followup' ? 'Generating...' : 'Draft Follow-up'}
                  </button>
                </div>
              </div>
              
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

              {generatedMessage && (
                <div className="mt-4">
                  <label htmlFor="message" className="block text-sm font-medium text-brand-brown/90 mb-1">Generated Message:</label>
                  <textarea
                    id="message"
                    readOnly
                    value={generatedMessage}
                    className="w-full h-32 p-2 border border-gray-300 rounded-md bg-white focus:ring-brand-orange focus:border-brand-orange"
                  />
                  <div className="mt-2 text-right">
                      <button
                          onClick={handleSendText}
                          disabled={!order.phoneNumber}
                          className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-emerald-700 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          title={!order.phoneNumber ? "Customer phone number is not available" : "Send message using your device's SMS app"}
                      >
                          <PaperAirplaneIcon className="w-5 h-5" />
                          Send via Text
                      </button>
                      {!order.phoneNumber && <p className="text-xs text-red-600 mt-1">No phone number available for this customer.</p>}
                       {order.phoneNumber && <p className="text-xs text-gray-500 mt-1">Opens your device's default messaging application.</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}