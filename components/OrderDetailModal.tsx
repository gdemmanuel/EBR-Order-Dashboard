
import React, { useState, useCallback } from 'react';
import { Order, FollowUpStatus } from '../types';
import { generateFollowUpMessage, generateOrderConfirmationMessage } from '../services/geminiService';
import { CalendarIcon, ClockIcon, UserIcon, PhoneIcon, MapPinIcon, CurrencyDollarIcon, SparklesIcon, XMarkIcon, PencilIcon, ClipboardDocumentCheckIcon } from './icons/Icons';

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
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <p className="text-base text-gray-800">{value}</p>
            </div>
        </div>
    );
};

export default function OrderDetailModal({ order, onClose, onUpdateFollowUp, onEdit }: OrderDetailModalProps) {
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<'confirmation' | 'followup' | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <header className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(order)}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
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
                {order.deliveryRequired && <DetailItem icon={<MapPinIcon className="w-5 h-5" />} label="Delivery Address" value={order.deliveryAddress} />}
            </div>
            <div className="space-y-4">
                <DetailItem icon={<CalendarIcon className="w-5 h-5" />} label="Pickup Date" value={order.pickupDate} />
                <DetailItem icon={<ClockIcon className="w-5 h-5" />} label="Pickup Time" value={order.pickupTime} />
                <DetailItem icon={<CurrencyDollarIcon className="w-5 h-5" />} label="Amount Charged" value={`$${order.amountCharged.toFixed(2)}`} />
                 {order.deliveryRequired && <DetailItem icon={<CurrencyDollarIcon className="w-5 h-5" />} label="Delivery Fee" value={`$${order.deliveryFee.toFixed(2)}`} />}
            </div>
          </div>

          {/* Items Ordered */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Items Ordered</h3>
            <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded-lg border">
                <ul className="divide-y divide-gray-200">
                    {order.items.map((item, index) => (
                    <li key={index} className="flex justify-between py-2 text-sm">
                        <span className="font-medium text-gray-800">{item.name}</span>
                        <span className="text-gray-500">x {item.quantity}</span>
                    </li>
                    ))}
                </ul>
            </div>
          </div>
          
          {/* Follow-up Section */}
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Customer Communication</h3>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div>
                <label htmlFor="followUpStatus" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="followUpStatus" value={order.followUpStatus} onChange={handleStatusChange} className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500">
                  {Object.values(FollowUpStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="flex-grow w-full flex flex-col sm:flex-row gap-2">
                 <button
                  onClick={handleGenerateConfirmation}
                  disabled={loadingAction !== null}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-300"
                >
                  <ClipboardDocumentCheckIcon className="w-5 h-5" />
                  {loadingAction === 'confirmation' ? 'Drafting...' : 'Draft Confirmation'}
                </button>
                <button
                  onClick={handleGenerateFollowUp}
                  disabled={loadingAction !== null}
                  className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-orange-700 transition-colors duration-200 disabled:bg-orange-300"
                >
                  <SparklesIcon className="w-5 h-5" />
                  {loadingAction === 'followup' ? 'Generating...' : 'Draft Follow-up'}
                </button>
              </div>
            </div>
            
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

            {generatedMessage && (
              <div className="mt-4">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Generated Message:</label>
                <textarea
                  id="message"
                  readOnly
                  value={generatedMessage}
                  className="w-full h-32 p-2 border border-gray-300 rounded-md bg-gray-50 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}