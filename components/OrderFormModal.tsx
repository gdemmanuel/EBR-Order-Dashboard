
import React, { useState, useEffect, useMemo } from 'react';
import { Order, Flavor, PricingSettings, AppSettings, PaymentStatus, FollowUpStatus, ApprovalStatus } from '../types';
import { normalizeDateStr } from '../utils/dateUtils';
import { calculateOrderTotal } from '../utils/pricingUtils';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon, CubeIcon, ExclamationCircleIcon } from './icons/Icons';
import PackageBuilderModal from './PackageBuilderModal';

interface OrderFormModalProps {
    order?: Order;
    onClose: () => void;
    onSave: (order: Order | Omit<Order, 'id'>) => Promise<void>;
    empanadaFlavors: Flavor[];
    fullSizeEmpanadaFlavors: Flavor[];
    onAddNewFlavor?: (name: string, type: 'mini' | 'full') => void;
    onDelete?: (id: string) => void;
    pricing: PricingSettings;
    settings: AppSettings;
    existingOrders?: Order[];
}

interface FormOrderItem {
    name: string;
    quantity: number;
}

export default function OrderFormModal({ 
    order, 
    onClose, 
    onSave, 
    empanadaFlavors, 
    fullSizeEmpanadaFlavors, 
    onAddNewFlavor,
    pricing,
    settings
}: OrderFormModalProps) {
    // --- Form State ---
    const [customerName, setCustomerName] = useState(order?.customerName || '');
    const [phoneNumber, setPhoneNumber] = useState(order?.phoneNumber || '');
    const [contactMethod, setContactMethod] = useState(order?.contactMethod || 'Instagram');
    const [pickupDate, setPickupDate] = useState(order ? normalizeDateStr(order.pickupDate) : new Date().toISOString().split('T')[0]);
    const [pickupTime, setPickupTime] = useState(order?.pickupTime || '');
    
    // Items split by category
    const [miniItems, setMiniItems] = useState<FormOrderItem[]>([]);
    const [fullSizeItems, setFullSizeItems] = useState<FormOrderItem[]>([]);
    const [specialItems, setSpecialItems] = useState<FormOrderItem[]>([]); // Salsas, packages, extras
    
    const [deliveryRequired, setDeliveryRequired] = useState(order?.deliveryRequired || false);
    const [deliveryFee, setDeliveryFee] = useState(order?.deliveryFee || 0);
    const [deliveryAddress, setDeliveryAddress] = useState(order?.deliveryAddress || '');
    
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order?.paymentStatus || PaymentStatus.PENDING);
    const [amountCollected, setAmountCollected] = useState(order?.amountCollected || 0);
    const [specialInstructions, setSpecialInstructions] = useState(order?.specialInstructions || '');
    
    // Package Builder
    const [activePackageBuilder, setActivePackageBuilder] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // --- Initialize Items from Order ---
    useEffect(() => {
        if (order) {
            const minis: FormOrderItem[] = [];
            const fulls: FormOrderItem[] = [];
            const specials: FormOrderItem[] = [];
            
            order.items.forEach(item => {
                const isFull = item.name.startsWith('Full ');
                const isSalsa = pricing.salsas.some(s => s.name === item.name);
                
                if (isSalsa) {
                    specials.push(item);
                } else if (isFull) {
                    fulls.push(item);
                } else {
                    minis.push(item);
                }
            });
            setMiniItems(minis);
            setFullSizeItems(fulls);
            setSpecialItems(specials);
        }
    }, [order, pricing.salsas]);

    // --- Derived Values ---
    const allItems = [...miniItems, ...fullSizeItems, ...specialItems];
    const estimatedTotal = useMemo(() => calculateOrderTotal(allItems, deliveryFee, pricing, empanadaFlavors, fullSizeEmpanadaFlavors), [allItems, deliveryFee, pricing, empanadaFlavors, fullSizeEmpanadaFlavors]);
    
    // --- Handlers ---
    
    const addItem = (type: 'mini' | 'full' | 'special', name: string) => {
        const itemSet = type === 'mini' ? miniItems : type === 'full' ? fullSizeItems : specialItems;
        const setFn = type === 'mini' ? setMiniItems : type === 'full' ? setFullSizeItems : setSpecialItems;
        
        const existing = itemSet.find(i => i.name === name);
        if (existing) {
            setFn(itemSet.map(i => i.name === name ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setFn([...itemSet, { name, quantity: 1 }]);
        }
    };
    
    const updateQuantity = (type: 'mini' | 'full' | 'special', index: number, val: number) => {
        const setFn = type === 'mini' ? setMiniItems : type === 'full' ? setFullSizeItems : setSpecialItems;
        const itemSet = type === 'mini' ? miniItems : type === 'full' ? fullSizeItems : specialItems;
        
        const newItems = [...itemSet];
        if (val <= 0) {
            newItems.splice(index, 1);
        } else {
            newItems[index].quantity = val;
        }
        setFn(newItems);
    };

    const handlePackageConfirm = (items: { name: string; quantity: number }[]) => {
        if (!activePackageBuilder) return;
        const type = activePackageBuilder.itemType;
        const isSpecial = activePackageBuilder.isSpecial;
        const isPlatter = activePackageBuilder.isPlatter;
        const formItems: FormOrderItem[] = items.map(i => ({ name: i.name, quantity: i.quantity }));
        
        let updateFn: React.Dispatch<React.SetStateAction<FormOrderItem[]>>;
        let currentItems: FormOrderItem[];
        
        // Group specials AND platters into the 'specialItems' list for the admin form as they are structurally similar
        if (isSpecial || isPlatter) { 
            currentItems = specialItems; 
            updateFn = setSpecialItems; 
        } else if (type === 'mini') { 
            currentItems = miniItems; 
            updateFn = setMiniItems; 
        } else { 
            currentItems = fullSizeItems; 
            updateFn = setFullSizeItems; 
        }
        
        const combinedItems = [...currentItems];
        formItems.forEach(newItem => {
            const existingIndex = combinedItems.findIndex(existing => existing.name === newItem.name);
            if (existingIndex >= 0) {
                const existingQty = Number(combinedItems[existingIndex].quantity) || 0;
                combinedItems[existingIndex].quantity = existingQty + Number(newItem.quantity);
            } else { 
                combinedItems.push(newItem); 
            }
        });
        updateFn(combinedItems);

        // Add visual marker to notes if it's a platter
        if (activePackageBuilder.isPlatter) {
            const header = `*** PARTY PLATTER: ${activePackageBuilder.name} ***`;
            if (!specialInstructions.includes(header)) {
                setSpecialInstructions(prev => prev ? `${header}\n\n${prev}` : header);
            }
        }

        setActivePackageBuilder(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const finalOrder: Order | Omit<Order, 'id'> = {
                id: order?.id,
                customerName,
                phoneNumber,
                contactMethod,
                pickupDate: normalizeDateStr(pickupDate),
                pickupTime,
                items: allItems,
                totalMini: miniItems.reduce((s, i) => s + i.quantity, 0),
                totalFullSize: fullSizeItems.reduce((s, i) => s + i.quantity, 0),
                amountCharged: estimatedTotal,
                amountCollected: amountCollected,
                deliveryRequired,
                deliveryFee,
                deliveryAddress: deliveryRequired ? deliveryAddress : null,
                paymentStatus,
                paymentMethod: order?.paymentMethod || null,
                followUpStatus: order?.followUpStatus || FollowUpStatus.NEEDED,
                specialInstructions,
                approvalStatus: order?.approvalStatus || ApprovalStatus.APPROVED
            };
            await onSave(finalOrder);
        } catch (err) {
            console.error(err);
            alert("Failed to save order");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-brand-tan">
                <header className="p-5 border-b border-brand-tan flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h2 className="text-xl font-bold text-brand-brown">{order ? 'Edit Order' : 'New Order'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <div className="flex-grow overflow-y-auto p-6">
                    <form id="order-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Customer Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Customer Name</label>
                                <input required type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full rounded-md border-gray-300 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Phone</label>
                                <input type="text" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full rounded-md border-gray-300 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Source</label>
                                <select value={contactMethod} onChange={e => setContactMethod(e.target.value)} className="w-full rounded-md border-gray-300 text-sm">
                                    <option value="Instagram">Instagram</option>
                                    <option value="Facebook">Facebook</option>
                                    <option value="Text/Call">Text/Call</option>
                                    <option value="Google Forms">Google Forms</option>
                                </select>
                            </div>
                        </div>

                        {/* Scheduling */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
                                <input required type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} className="w-full rounded-md border-gray-300 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Time</label>
                                <input required type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full rounded-md border-gray-300 text-sm" />
                            </div>
                        </div>

                        {/* Item Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Mini Column */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h4 className="font-bold text-brand-brown mb-2 text-sm uppercase">Mini Empanadas</h4>
                                <select onChange={e => { addItem('mini', e.target.value); e.target.value = ''; }} className="w-full mb-3 rounded-md border-gray-300 text-sm">
                                    <option value="">+ Add Flavor...</option>
                                    {empanadaFlavors.filter(f => f.visible).map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                                </select>
                                <div className="space-y-2">
                                    {miniItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                                            <span className="text-sm font-medium">{item.name}</span>
                                            <div className="flex items-center gap-1">
                                                <input type="number" value={item.quantity} onChange={e => updateQuantity('mini', idx, parseInt(e.target.value))} className="w-12 text-center border-gray-300 rounded text-sm p-1" />
                                                <button type="button" onClick={() => updateQuantity('mini', idx, 0)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Full Size Column */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h4 className="font-bold text-brand-brown mb-2 text-sm uppercase">Full Size</h4>
                                <select onChange={e => { addItem('full', `Full ${e.target.value}`); e.target.value = ''; }} className="w-full mb-3 rounded-md border-gray-300 text-sm">
                                    <option value="">+ Add Flavor...</option>
                                    {fullSizeEmpanadaFlavors.filter(f => f.visible).map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                                </select>
                                <div className="space-y-2">
                                    {fullSizeItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                                            <span className="text-sm font-medium truncate w-24" title={item.name}>{item.name.replace('Full ', '')}</span>
                                            <div className="flex items-center gap-1">
                                                <input type="number" value={item.quantity} onChange={e => updateQuantity('full', idx, parseInt(e.target.value))} className="w-12 text-center border-gray-300 rounded text-sm p-1" />
                                                <button type="button" onClick={() => updateQuantity('full', idx, 0)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Packages / Extras */}
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                <h4 className="font-bold text-orange-900 mb-2 text-sm uppercase">Packages & Extras</h4>
                                <div className="flex gap-2 mb-3">
                                     <select onChange={e => { 
                                         const pkg = pricing.packages.find(p => p.id === e.target.value);
                                         if (pkg) setActivePackageBuilder(pkg);
                                         e.target.value = '';
                                     }} className="flex-grow rounded-md border-gray-300 text-sm">
                                        <option value="">+ Add Package...</option>
                                        {pricing.packages.filter(p => p.visible).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <select onChange={e => { addItem('special', e.target.value); e.target.value = ''; }} className="w-24 rounded-md border-gray-300 text-sm">
                                        <option value="">+ Salsa...</option>
                                        {pricing.salsas.filter(s => s.visible).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    {specialItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                                            <span className="text-sm font-medium truncate w-24" title={item.name}>{item.name}</span>
                                            <div className="flex items-center gap-1">
                                                <input type="number" value={item.quantity} onChange={e => updateQuantity('special', idx, parseInt(e.target.value))} className="w-12 text-center border-gray-300 rounded text-sm p-1" />
                                                <button type="button" onClick={() => updateQuantity('special', idx, 0)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Financials & Delivery */}
                        <div className="bg-gray-100 p-4 rounded-lg flex flex-col md:flex-row gap-8 items-start">
                            <div className="flex-grow space-y-4 w-full">
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm font-bold">
                                        <input type="checkbox" checked={deliveryRequired} onChange={e => setDeliveryRequired(e.target.checked)} className="rounded text-brand-orange" />
                                        Delivery?
                                    </label>
                                    {deliveryRequired && (
                                        <>
                                            <input type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Address" className="flex-grow rounded-md border-gray-300 text-sm" />
                                            <input type="number" value={deliveryFee} onChange={e => setDeliveryFee(parseFloat(e.target.value))} placeholder="Fee" className="w-20 rounded-md border-gray-300 text-sm" />
                                        </>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
                                    <textarea value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} className="w-full rounded-md border-gray-300 text-sm" rows={2} />
                                </div>
                            </div>
                            <div className="w-full md:w-64 bg-white p-4 rounded border border-gray-200 shadow-sm">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-bold text-gray-600">Total:</span>
                                    <span className="text-xl font-bold text-brand-orange">${estimatedTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-600">Paid:</span>
                                    <input type="number" value={amountCollected} onChange={e => setAmountCollected(parseFloat(e.target.value))} className="w-20 text-right text-sm border-gray-300 rounded p-1" />
                                </div>
                                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as PaymentStatus)} className="w-full text-sm border-gray-300 rounded">
                                    <option value={PaymentStatus.PENDING}>Pending</option>
                                    <option value={PaymentStatus.PAID}>Paid</option>
                                    <option value={PaymentStatus.OVERDUE}>Overdue</option>
                                </select>
                            </div>
                        </div>

                    </form>
                </div>

                <footer className="p-5 border-t border-brand-tan bg-gray-50 rounded-b-lg flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                    <button form="order-form" type="submit" disabled={isSaving} className="px-6 py-2 bg-brand-orange text-white font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-md">{isSaving ? 'Saving...' : 'Save Order'}</button>
                </footer>
            </div>
            
            {activePackageBuilder && (
                <div className="absolute inset-0 z-[80] flex items-center justify-center p-4">
                    <PackageBuilderModal 
                        pkg={activePackageBuilder}
                        standardFlavors={empanadaFlavors}
                        specialFlavors={empanadaFlavors.filter(f => f.isSpecial)} // Or maintain separate list
                        salsas={pricing.salsas}
                        onClose={() => setActivePackageBuilder(null)}
                        onConfirm={handlePackageConfirm}
                    />
                </div>
            )}
        </div>
    );
}
