
import React, { useState, useCallback } from 'react';
import { Order, FollowUpStatus, ApprovalStatus } from '../types';
import { generateFollowUpMessage, generateOrderConfirmationMessage } from '../services/geminiService';
import { CalendarIcon, ClockIcon, UserIcon, PhoneIcon, MapPinIcon, CurrencyDollarIcon, SparklesIcon, XMarkIcon, PencilIcon, ClipboardDocumentCheckIcon, PaperAirplaneIcon, CreditCardIcon, ArrowTopRightOnSquareIcon, InstagramIcon, ChatBubbleOvalLeftEllipsisIcon, FacebookIcon, CheckCircleIcon, XCircleIcon, TrashIcon, TruckIcon } from './icons/Icons';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onUpdateFollowUp: (orderId: string, status: FollowUpStatus) => void;
  onEdit: (order: Order) => void;
  onApprove?: (orderId: string) => void;
  onDeny?: (orderId: string) => void;
  onDelete?: (orderId: string) => void;
  onDeductInventory?: (order: Order) => Promise<void>;
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

export default function OrderDetailModal({ order, onClose, onUpdateFollowUp, onEdit, onApprove, onDeny, onDelete, onDeductInventory }: OrderDetailModalProps) {
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<'confirmation' | 'followup' | 'inventory' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedState, setCopiedState] = useState<'instagram' | 'facebook' | null>(null);

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
  
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newStatus = e.target.value as FollowUpStatus;
      
      // If user is changing status to COMPLETED, ask about inventory
      if (newStatus === FollowUpStatus.COMPLETED && order.followUpStatus !== FollowUpStatus.COMPLETED) {
          // If inventory handler exists, prompt user
          if (onDeductInventory) {
              const shouldDeduct = window.confirm("Do you want to deduct these items from your Inventory?");
              if (shouldDeduct) {
                   setLoadingAction('inventory');
                   try {
                       await onDeductInventory(order);
                       // onDeductInventory handles the status update to COMPLETED internally in parent
                       return; 
                   } catch (e) {
                       setError("Failed to update inventory.");
                   } finally {
                       setLoadingAction(null);
                   }
                   return;
              }
          }
      }

      onUpdateFollowUp(order.id, newStatus);
  };

  const handleDeductInventoryClick = async () => {
      if (!onDeductInventory) return;
      if (!window.confirm("This will deduct the items from your inventory and mark the order as Completed. Continue?")) return;
      
      setLoadingAction('inventory');
      try {
          await onDeductInventory(order);
          // We don't close automatically so user can see the update, 
          // but the parent usually updates the order prop which triggers re-render
      } catch (e) {
          setError("Failed to update inventory.");
      } finally {
          setLoadingAction(null);
      }
  };

  const handleDeleteClick = () => {
      if (onDelete && window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
          onDelete(order.id);
      }
  };

  const handleSendInstagram = () => {
    if (!generatedMessage) {
      setError("No message has been generated.");
      return;
    }
    navigator.clipboard.writeText(generatedMessage).then(() => {
        setCopiedState('instagram');
        window.open('https://www.instagram.com/direct/inbox/', '_blank');
        setTimeout(() => setCopiedState(null), 2500);
    }).catch(err => {
        setError("Failed to copy message to clipboard.");
        console.error("Clipboard write failed: ", err);
    });
  };

  const handleSendFacebook = () => {
    if (!generatedMessage) {
      setError("No message has been generated.");
      return;
    }
    navigator.clipboard.writeText(generatedMessage).then(() => {
        setCopiedState('facebook');
        window.open('https://www.facebook.com/messages/', '_blank');
        setTimeout(() => setCopiedState(null), 2500);
    }).catch(err => {
        setError("Failed to copy message to clipboard.");
        console.error("Clipboard write failed: ", err);
    });
  };

  const handleSendText = () => {
    if (!generatedMessage) {
      setError("No message has been generated.");
      return;
    }
    if (!order.phoneNumber) {
      setError("Customer phone number is missing.");
      return;
    }
    const cleanedPhoneNumber = order.phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanedPhoneNumber) {
      setError("Invalid phone number format.");
      return;
    }
    const encodedMessage = encodeURIComponent(generatedMessage);
    const smsLink = `sms:${cleanedPhoneNumber}?body=${encodedMessage}`;
    window.open(smsLink, '_blank');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-brand-tan">
          <header className="p-6 border-b border-brand-tan flex justify-between items-center">
            <h2 className="text-3xl font-serif text-brand-brown">Order Details</h2>
            <div className="flex items-center gap-2">
              {order.approvalStatus === ApprovalStatus.PENDING && onApprove && onDeny && (
                  <>
                    <button
                        onClick={() => { onDeny(order.id); onClose(); }}
                        className="flex items-center gap-2 bg-red-100 text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors border border-red-200"
                    >
                        <XCircleIcon className="w-4 h-4" />
                        Deny
                    </button>
                    <button
                        onClick={() => { onApprove(order.id); onClose(); }}
                        className="flex items-center gap-2 bg-emerald-100 text-emerald-800 font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors border border-emerald-200"
                    >
                        <CheckCircleIcon className="w-4 h-4" />
                        Approve
                    </button>
                  </>
              )}
              {onDelete && order.approvalStatus !== ApprovalStatus.PENDING && (
                  <button
                    onClick={handleDeleteClick}
                    className="flex items-center gap-2 bg-white text-red-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors border border-gray-300"
                    title="Delete this order"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete
                  </button>
              )}
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
                  <DetailItem icon={<ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5" />} label="Contact Method" value={order.contactMethod} />
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
              <div className="mt-2 text-right text-sm font-medium text-brand-brown/80 space-x-4">
                {order.totalMini > 0 && <span>Total Minis: {order.totalMini}</span>}
                {order.totalFullSize > 0 && <span>Total Full-Size: {order.totalFullSize}</span>}
              </div>
            </div>

            {/* Payment Summary */}
            <div>
                <h3 className="text-lg font-semibold text-brand-brown/90 mb-2">Payment Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-brand-tan/30 p-4 rounded-lg border border-brand-tan">
                    <DetailItem icon={<CurrencyDollarIcon className="w-5 h-5" />} label="Amount Charged" value={`$${order.amountCharged.toFixed(2)}`} />
                    <DetailItem icon={<CurrencyDollarIcon className="w-5 h-5" />} label="Amount Collected" value={`$${(order.amountCollected || 0).toFixed(2)}`} />
                    <div className="flex items-start space-x-3">
                        <div className="text-gray-400 mt-1"><CurrencyDollarIcon className="w-5 h-5" /></div>
                        <div>
                            <p className="text-sm font-medium text-brand-brown/70">Balance Due</p>
                             {(() => {
                                 const balance = order.amountCharged - (order.amountCollected || 0);
                                 return balance > 0 ? (
                                     <p className="text-base font-bold text-red-600">${balance.toFixed(2)}</p>
                                 ) : (
                                     <p className="text-base text-gray-500 font-medium">Paid</p>
                                 );
                             })()}
                        </div>
                    </div>
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
            
            {/* Follow-up & Status Section */}
            <div className="bg-brand-tan/40 border border-brand-tan p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-brand-brown/90 mb-3">Order Status & Actions</h3>
              
              {/* Inventory Action */}
              {onDeductInventory && order.followUpStatus !== FollowUpStatus.COMPLETED && (
                  <div className="mb-4 p-3 bg-white rounded border border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                          <p className="font-medium text-brand-brown">Ready for Pickup/Delivery?</p>
                          <p className="text-xs">Mark as completed and update stock levels.</p>
                      </div>
                      <button 
                        onClick={handleDeductInventoryClick}
                        disabled={loadingAction !== null}
                        className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded shadow-sm text-sm font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400"
                      >
                          {loadingAction === 'inventory' ? 'Updating...' : <>Mark Picked Up & Deduct Inventory <TruckIcon className="w-4 h-4" /></>}
                      </button>
                  </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 items-end border-t border-gray-200 pt-4">
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
                  <label htmlFor="message" className="block text-sm font-medium text-brand-brown/90 mb-1">Message Preview (Editable):</label>
                  <textarea
                    id="message"
                    value={generatedMessage}
                    onChange={(e) => setGeneratedMessage(e.target.value)}
                    className="w-full h-32 p-2 border border-gray-300 rounded-md bg-white focus:ring-brand-orange focus:border-brand-orange"
                  />
                  <div className="mt-2 flex justify-end items-start gap-3 flex-wrap">
                    {order.contactMethod === 'Instagram' && (
                        <div className="text-right">
                            <button
                                onClick={handleSendInstagram}
                                disabled={!generatedMessage}
                                className="inline-flex items-center justify-center gap-2 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-all duration-200 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                title="Copy message and open Instagram DMs"
                            >
                                <InstagramIcon className="w-5 h-5" />
                                {copiedState === 'instagram' ? 'Copied!' : 'Follow-up on Instagram'}
                            </button>
                            <p className="text-xs text-gray-500 mt-1">
                                Copies message and opens DMs.
                            </p>
                        </div>
                    )}
                    {order.contactMethod === 'Facebook' && (
                        <div className="text-right">
                            <button
                                onClick={handleSendFacebook}
                                disabled={!generatedMessage}
                                className="inline-flex items-center justify-center gap-2 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-all duration-200 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                title="Copy message and open Facebook Messenger"
                            >
                                <FacebookIcon className="w-5 h-5" />
                                {copiedState === 'facebook' ? 'Copied!' : 'Follow-up on Facebook'}
                            </button>
                            <p className="text-xs text-gray-500 mt-1">
                                Copies message and opens Messenger.
                            </p>
                        </div>
                    )}
                    {order.phoneNumber && (
                        <div className="text-right">
                            <button
                                onClick={handleSendText}
                                disabled={!generatedMessage}
                                className="inline-flex items-center justify-center gap-2 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-all duration-200 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                title="Send message using your device's SMS app"
                            >
                                <PaperAirplaneIcon className="w-5 h-5" />
                                Send via Text
                            </button>
                            <p className="text-xs text-gray-500 mt-1">
                                Opens your messaging app.
                            </p>
                        </div>
                    )}
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
