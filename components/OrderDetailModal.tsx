
import React, { useState } from 'react';
import { Order, FollowUpStatus, PaymentStatus, ApprovalStatus, AppSettings } from '../types';
import { XMarkIcon, PrinterIcon, TrashIcon, CheckCircleIcon, XCircleIcon, SparklesIcon, TruckIcon, ChatBubbleOvalLeftEllipsisIcon, DocumentTextIcon } from './icons/Icons';
import { generateMessageForOrder } from '../services/geminiService';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onUpdateFollowUp: (id: string, status: FollowUpStatus) => void;
  onEdit: (order: Order) => void;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  onDelete: (id: string) => void;
  onDeductInventory: (order: Order) => void;
  settings?: AppSettings; // Optional settings for templates
}

export default function OrderDetailModal({ 
    order, 
    onClose, 
    onUpdateFollowUp, 
    onEdit, 
    onApprove, 
    onDeny, 
    onDelete, 
    onDeductInventory,
    settings
}: OrderDetailModalProps) {
    
  const totalQty = order.totalMini + order.totalFullSize;
  const balanceDue = order.amountCharged - (order.amountCollected || 0);
  
  // Messaging State
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGeneratingMsg, setIsGeneratingMsg] = useState(false);
  const [showMsg, setShowMsg] = useState(false);

  // Format Date Ordered from ID timestamp
  let dateOrderedStr = "Unknown";
  try {
      if (/^\d{13}$/.test(order.id)) {
          dateOrderedStr = new Date(parseInt(order.id)).toLocaleString();
      }
  } catch(e) {}

  const handleGenerateMessage = async (useAi: boolean = false) => {
      setIsGeneratingMsg(true);
      setShowMsg(true);
      try {
          const msg = await generateMessageForOrder(order, settings?.messageTemplates, useAi);
          setGeneratedMessage(msg);
      } catch (e) {
          setGeneratedMessage("Error generating message.");
      } finally {
          setIsGeneratingMsg(false);
      }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(generatedMessage);
      alert("Message copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 animate-fade-in">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-brand-tan">
            {/* Header */}
            <header className="p-6 border-b border-brand-tan flex justify-between items-start bg-brand-tan/10 rounded-t-lg">
                <div>
                    <h2 className="text-2xl font-serif text-brand-brown">{order.customerName}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${order.approvalStatus === ApprovalStatus.APPROVED ? 'bg-green-100 text-green-800' : order.approvalStatus === ApprovalStatus.PENDING ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {order.approvalStatus}
                        </span>
                        <span className="text-sm text-gray-500">#{order.id.slice(-6)}</span>
                        <span className="text-xs text-gray-400">Ordered: {dateOrderedStr}</span>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </header>

            {/* Content */}
            <div className="overflow-y-auto p-6 space-y-6">
                
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-gray-500 font-bold text-xs uppercase">Contact</p>
                        <p className="text-gray-900 font-medium text-lg">{order.phoneNumber || 'N/A'}</p>
                        {order.email && <p className="text-gray-600 text-xs">{order.email}</p>}
                        <p className="text-gray-500 text-xs mt-0.5">{order.contactMethod}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 font-bold text-xs uppercase">Pickup / Delivery</p>
                        <p className="text-gray-900 font-bold text-lg">{order.pickupDate} @ {order.pickupTime}</p>
                        {order.deliveryRequired && (
                            <div className="flex items-start gap-1 mt-1 text-blue-600 font-medium">
                                <TruckIcon className="w-4 h-4 flex-shrink-0 mt-0.5"/>
                                <span className="text-xs">{order.deliveryAddress}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Communication Section */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-blue-900 text-sm uppercase flex items-center gap-2">
                            <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4" /> Customer Communication
                        </h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleGenerateMessage(false)} 
                                className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
                            >
                                Use Template
                            </button>
                            <button 
                                onClick={() => handleGenerateMessage(true)} 
                                className="text-xs bg-white border border-purple-200 text-purple-700 px-2 py-1 rounded hover:bg-purple-50 flex items-center gap-1"
                            >
                                <SparklesIcon className="w-3 h-3" /> AI Draft
                            </button>
                        </div>
                    </div>
                    
                    {showMsg && (
                        <div className="space-y-2 animate-fade-in">
                            <textarea 
                                value={isGeneratingMsg ? "Generating message..." : generatedMessage}
                                onChange={(e) => setGeneratedMessage(e.target.value)}
                                className="w-full text-sm p-2 rounded border border-blue-200 text-gray-800"
                                rows={4}
                            />
                            <div className="flex justify-end">
                                <button 
                                    onClick={copyToClipboard}
                                    disabled={isGeneratingMsg || !generatedMessage}
                                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 font-medium"
                                >
                                    Copy to Clipboard
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Items */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h3 className="font-bold text-brand-brown mb-3 text-sm uppercase">Order Items ({totalQty})</h3>
                    <ul className="space-y-2">
                        {order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between items-center text-sm border-b border-gray-200 last:border-0 pb-2 last:pb-0">
                                <div className="font-medium text-gray-700">
                                    {item.quantity}x <span className="text-gray-900">{item.name}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                    
                    {/* Financial Summary */}
                    <div className="mt-4 pt-3 border-t border-gray-200 space-y-1">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Total Charged</span>
                            <span className="font-bold text-gray-900">${order.amountCharged.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Amount Paid</span>
                            <span className="text-gray-900">${(order.amountCollected || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-lg border-t border-gray-200 pt-2 mt-2">
                            <span className="font-bold text-gray-700">Balance Due</span>
                            <span className={`font-bold ${balanceDue > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                                ${balanceDue.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Status & Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Workflow Status</label>
                         <select 
                            value={order.followUpStatus}
                            onChange={(e) => onUpdateFollowUp(order.id, e.target.value as FollowUpStatus)}
                            className="w-full rounded-md border-gray-300 text-sm focus:ring-brand-orange focus:border-brand-orange"
                         >
                             {Object.values(FollowUpStatus).map(s => (
                                 <option key={s} value={s}>{s}</option>
                             ))}
                         </select>
                    </div>
                    <div className="flex flex-col gap-2">
                         <label className="block text-xs font-bold text-gray-500 uppercase">Management</label>
                         <div className="flex gap-2">
                             <button onClick={() => onEdit(order)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded text-sm font-medium transition-colors">Edit Order</button>
                             <button onClick={() => { if(window.confirm("Delete order?")) onDelete(order.id); }} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded text-sm font-medium transition-colors">Delete</button>
                         </div>
                    </div>
                </div>

                {/* Special Instructions */}
                {order.specialInstructions && (
                  <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Special Instructions</h3>
                      {(() => {
                          const instructions = order.specialInstructions || '';
                          const isPlatter = instructions.includes('PARTY PLATTER');
                          return (
                              <div className={`p-3 rounded-lg border ${isPlatter ? 'bg-purple-50 border-purple-200' : 'bg-amber-50 border-amber-200'}`}>
                                  {isPlatter && (
                                      <div className="flex items-center gap-2 mb-2 text-purple-800 font-bold border-b border-purple-200 pb-2">
                                          <SparklesIcon className="w-5 h-5" />
                                          <span>INCLUDES PARTY PLATTER</span>
                                      </div>
                                  )}
                                  <p className={`text-sm whitespace-pre-wrap ${isPlatter ? 'text-purple-900' : 'text-amber-900'}`}>
                                      {instructions}
                                  </p>
                              </div>
                          );
                      })()}
                  </div>
                )}
            </div>

            {/* Footer Actions */}
            <footer className="p-4 border-t border-brand-tan bg-gray-50 rounded-b-lg flex justify-between items-center">
                 {order.approvalStatus === ApprovalStatus.PENDING ? (
                     <div className="flex gap-3 w-full">
                         <button onClick={() => onDeny(order.id)} className="flex-1 flex items-center justify-center gap-2 bg-red-100 text-red-700 py-2 rounded-lg font-bold hover:bg-red-200">
                             <XCircleIcon className="w-5 h-5" /> Deny
                         </button>
                         <button onClick={() => onApprove(order.id)} className="flex-1 flex items-center justify-center gap-2 bg-green-100 text-green-800 py-2 rounded-lg font-bold hover:bg-green-200">
                             <CheckCircleIcon className="w-5 h-5" /> Approve
                         </button>
                     </div>
                 ) : (
                     <div className="flex gap-3 w-full">
                         <button 
                            onClick={() => onDeductInventory(order)}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-colors"
                        >
                             Complete & Deduct Stock
                         </button>
                     </div>
                 )}
            </footer>
        </div>
    </div>
  );
}
