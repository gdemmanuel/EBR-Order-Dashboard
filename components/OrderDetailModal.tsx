import React, { useState, useCallback, useEffect } from 'react';
import { Order, FollowUpStatus, ApprovalStatus, AppSettings, PaymentStatus } from '../types';
import { generateMessageForOrder } from '../services/geminiService';
import { subscribeToSettings } from '../services/dbService';
import { CalendarIcon, ClockIcon, UserIcon, PhoneIcon, MapPinIcon, CurrencyDollarIcon, SparklesIcon, XMarkIcon, PencilIcon, ClipboardDocumentCheckIcon, PaperAirplaneIcon, CreditCardIcon, ArrowTopRightOnSquareIcon, InstagramIcon, ChatBubbleOvalLeftEllipsisIcon, FacebookIcon, CheckCircleIcon, XCircleIcon, TrashIcon, TruckIcon } from './icons/Icons';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onUpdateFollowUp: (orderId: string, status: FollowUpStatus, updates?: Partial<Order>) => void;
  onEdit: (order: Order) => void;
  onApprove?: (orderId: string) => void;
  onDeny?: (orderId: string) => void;
  onDelete?: (orderId: string) => void;
  onDeductInventory?: (order: Order, updates?: Partial<Order>) => Promise<void>;
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
  // Local state for status to ensure immediate UI update
  const [localStatus, setLocalStatus] = useState<FollowUpStatus>(order.followUpStatus);
  
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<'message' | 'inventory' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedState, setCopiedState] = useState<'instagram' | 'facebook' | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [useAi, setUseAi] = useState(false);

  useEffect(() => {
      const unsubscribe = subscribeToSettings((s) => setSettings(s));
      return () => unsubscribe();
  }, []);

  // Sync local status if prop changes from external source
  useEffect(() => {
      setLocalStatus(order.followUpStatus);
  }, [order.followUpStatus]);

  const mapsUrl = order.deliveryAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}` : '#';

  const isPartyPlatter = (order.specialInstructions || '').includes("PARTY PLATTER");

  const handleGenerateMessage = useCallback(async () => {
    setLoadingAction('message');
    setError(null);
    try {
      // Pass custom templates if available, and useAi flag
      // Note: we use localStatus here so message reflects the currently selected dropdown value
      const tempOrder = { ...order, followUpStatus: localStatus };
      const message = await generateMessageForOrder(tempOrder, settings?.messageTemplates, useAi);
      setGeneratedMessage(message);
    } catch (err) {
      setError('Failed to generate message. Please check your API key and try again.');
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  }, [order, settings, localStatus, useAi]);
  
  const checkPaymentAndGetUpdates = () => {
      const balance = order.amountCharged - (order.amountCollected || 0);
      if (balance > 0.01) {
          if (window.confirm(`This order has a balance of $${balance.toFixed(2)}. Do you want to mark it as PAID?`)) {
              return {
                  amountCollected: order.amountCharged,
                  paymentStatus: PaymentStatus.PAID
              };
          }
      }
      return {};
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newStatus = e.target.value as FollowUpStatus;
      setLocalStatus(newStatus); // Immediate UI update
      
      let updates: Partial<Order> = {};

      // If user is changing status to COMPLETED
      if (newStatus === FollowUpStatus.COMPLETED && order.followUpStatus !== FollowUpStatus.COMPLETED) {
          
          // 1. Check Payment
          updates = checkPaymentAndGetUpdates();

          // 2. Ask about Inventory
          if (onDeductInventory) {
              const shouldDeduct = window.confirm("Do you want to deduct these items from your Inventory?");
              if (shouldDeduct) {
                   setLoadingAction('inventory');
                   try {
                       // Pass updates (payment info) to inventory handler
                       await onDeductInventory(order, updates);
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

      onUpdateFollowUp(order.id, newStatus, updates);
  };

  const handleDeductInventoryClick = async () => {
      if (!onDeductInventory) return;
      
      const updates = checkPaymentAndGetUpdates();

      if (!window.confirm("This will deduct the items from your inventory and mark the order as Completed. Continue?")) return;
      
      setLoadingAction('inventory');
      try {
          await onDeductInventory(order, updates);
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

  const handleCancelOrder = () => {
      if (window.confirm("Are you sure you want to cancel this order? It will be removed from active lists and totals.")) {
          if (onDeny) onDeny(order.id); 
          onClose();
      }
  };

  const handleSendInstagram = () => {
    if (!generatedMessage) {
      setError("Please enter a message first.");
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
      setError("Please enter a message first.");
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
      setError("Please enter a message first.");
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
          <header className={`p-6 border-b border-brand-tan flex justify-between items-center ${isPartyPlatter ? 'bg-purple-50' : ''}`}>
            <div>
                <h2 className="text-3xl font-serif text-brand-brown">Order Details</h2>
                {isPartyPlatter && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white shadow-sm mt-1 animate-pulse">
                        <SparklesIcon className="w-3 h-3 mr-1" />
                        INCLUDES PARTY PLATTER
                    </span>
                )}
            </div>
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
              {order.approvalStatus !== ApprovalStatus.CANCELLED && (
                  <button
                    onClick={() => onEdit(order)}
                    className="flex items-center gap-2 bg-white text-brand-brown font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit
                  </button>
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </header>
          
          <div className="overflow-y-auto p-6 space-y-6">
            {order.approvalStatus === ApprovalStatus.CANCELLED && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
                    <p className="font-bold">Order Cancelled</p>
                    <p className="text-sm">This order is cancelled and excluded from totals.</p>
                </div>
            )}

            {/* Customer & Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                  <DetailItem icon={<UserIcon className="w-5 h-5" />} label="Customer" value={`${order.customerName} ${order.items.length > 0 && order.id.length > 10 ? `(Ordered: ${new Date(parseInt(order.id)).toLocaleDateString()})` : ''}`} />
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
              <div className="bg-brand-tan/30 p-3 rounded-lg border border-brand-tan">
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
                                 return balance > 0.01 ? (
                                     <p className="text-base font-bold text-red-600">${balance.toFixed(2)}</p>
                                 ) : (
                                     <p className="text-base text-green-600 font-bold">PAID IN FULL</p>
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
                  <div className={`${isPartyPlatter ? 'bg-purple-100 border-purple-300' : 'bg-amber-50 border-amber-200'} p-3 rounded-lg border`}>
                      <p className={`text-sm ${isPartyPlatter ? 'text-purple-900 font-bold' : 'text-amber-900'} whitespace-pre-wrap`}>{order.specialInstructions}</p>
                  </div>
              </div>
            )}
            
            {/* Follow-up & Status Section */}
            <div className="bg-brand-tan/40 border border-brand-tan p-4 rounded-lg">
              <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-brand-brown/90">Order Status & Actions</h3>
                  
                  {/* CANCEL BUTTON - Positioned Here */}
                  {order.approvalStatus === ApprovalStatus.APPROVED && onDeny && (
                      <button 
                        onClick={handleCancelOrder} 
                        className="text-xs flex items-center gap-1 bg-white text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50 transition-colors shadow-sm"
                        title="Cancel this order (removes from active view)"
                      >
                          <XCircleIcon className="w-4 h-4" /> Cancel Order
                      </button>
                  )}
              </div>
              
              {/* Inventory Action */}
              {onDeductInventory && order.followUpStatus !== FollowUpStatus.COMPLETED && order.approvalStatus === ApprovalStatus.APPROVED && (
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
                <div className="flex-grow">
                  <label htmlFor="followUpStatus" className="block text-sm font-medium text-brand-brown/90 mb-1">Status</label>
                  <select 
                    id="followUpStatus" 
                    value={localStatus} 
                    onChange={handleStatusChange} 
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown"
                  >
                    <option value={FollowUpStatus.NEEDED}>{FollowUpStatus.NEEDED}</option>
                    <option value={FollowUpStatus.PENDING}>{FollowUpStatus.PENDING}</option>
                    <option value={FollowUpStatus.CONFIRMED}>{FollowUpStatus.CONFIRMED}</option>
                    <option value={FollowUpStatus.PROCESSING}>{FollowUpStatus.PROCESSING}</option>
                    <option value={FollowUpStatus.COMPLETED}>{FollowUpStatus.COMPLETED}</option>
                  </select>
                </div>
                <div className="flex-grow w-full sm:w-auto flex flex-col gap-2">
                   <div className="flex justify-end">
                       <label className="flex items-center text-xs text-gray-600 cursor-pointer select-none">
                           <input 
                                type="checkbox" 
                                checked={useAi} 
                                onChange={(e) => setUseAi(e.target.checked)} 
                                className="mr-1.5 rounded text-brand-orange focus:ring-brand-orange border-gray-300"
                           />
                           Use AI Generation (Ignore Template)
                       </label>
                   </div>
                   <button
                    onClick={handleGenerateMessage}
                    disabled={loadingAction === 'message'}
                    className="w-full flex items-center justify-center gap-2 bg-brand-orange text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-opacity-90 transition-colors duration-200 disabled:bg-brand-orange/50"
                  >
                    <SparklesIcon className="w-5 h-5" />
                    {loadingAction === 'message' ? 'Generating...' : `Draft "${localStatus}" Message`}
                  </button>
                </div>
              </div>
              
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

              {/* Message Box always visible to allow manual typing */}
              <div className="mt-4">
                <label htmlFor="message" className="block text-sm font-medium text-brand-brown/90 mb-1">Message Preview (Editable):</label>
                <textarea
                  id="message"
                  value={generatedMessage}
                  onChange={(e) => setGeneratedMessage(e.target.value)}
                  placeholder="Draft a message here or click the button above to auto-generate..."
                  className="w-full h-32 p-2 border border-gray-300 rounded-md bg-white focus:ring-brand-orange focus:border-brand-orange"
                />
                
                {/* Send Buttons visible if there is content */}
                {generatedMessage && (
                  <div className="mt-2 flex justify-end items-start gap-3 flex-wrap">
                    {order.contactMethod === 'Instagram' && (
                        <div className="text-right">
                            <button
                                onClick={handleSendInstagram}
                                className="inline-flex items-center justify-center gap-2 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-all duration-200 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
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
                                className="inline-flex items-center justify-center gap-2 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-all duration-200 bg-blue-600 hover:bg-blue-700"
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
                                className="inline-flex items-center justify-center gap-2 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-all duration-200 bg-emerald-600 hover:bg-emerald-700"
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}