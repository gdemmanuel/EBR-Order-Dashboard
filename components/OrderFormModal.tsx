
import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderItem, ContactMethod, PaymentStatus, FollowUpStatus, ApprovalStatus, PricingSettings, Flavor, MenuPackage, OrderPackageSelection } from '../types';
import { TrashIcon, PlusIcon, XMarkIcon, ShoppingBagIcon, ClockIcon, ArrowUturnLeftIcon } from './icons/Icons';
import { getAddressSuggestions } from '../services/geminiService';
import { calculateOrderTotal, calculateSupplyCost } from '../utils/pricingUtils';
import PackageBuilderModal from './PackageBuilderModal';
import { AppSettings } from '../services/dbService';
import { generateTimeSlots, normalizeDateStr } from '../utils/dateUtils';

interface OrderFormModalProps {
    order?: Order;
    onClose: () => void;
    onSave: (order: Order | Omit<Order, 'id'>) => void;
    empanadaFlavors: Flavor[];
    fullSizeEmpanadaFlavors: Flavor[];
    onAddNewFlavor: (flavor: string, type: 'mini' | 'full') => void;
    onDelete?: (orderId: string) => void;
    pricing: PricingSettings;
    settings: AppSettings;
    existingOrders?: Order[]; 
}

interface FormOrderItem {
    name: string;
    quantity: number | string;
    customName?: string;
}

interface DynamicSalsaState {
    id: string;
    name: string;
    checked: boolean;
    quantity: number | string;
}

const formatPhoneNumber = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
};

const ItemInputSection: React.FC<{
    title: string;
    items: FormOrderItem[];
    flavors: Flavor[];
    onItemChange: (index: number, field: keyof FormOrderItem, value: string | number) => void;
    onAddItem: () => void;
    onRemoveItem: (index: number) => void;
    itemType: 'mini' | 'full';
    availablePackages?: MenuPackage[];
    onAddPackage: (pkg: MenuPackage) => void;
    bgColor?: string;
}> = ({ title, items, flavors, onItemChange, onAddItem, onRemoveItem, itemType, availablePackages, onAddPackage, bgColor = "bg-white" }) => {
    const otherOption = itemType === 'mini' ? 'Other' : 'Full Other';
    const [isPackageMenuOpen, setIsPackageMenuOpen] = useState(false);

    return (
        <div className={`${bgColor} p-4 rounded-lg border border-brand-tan/50 shadow-sm`}>
            <div className="flex justify-between items-end mb-2">
                <h3 className="text-lg font-semibold text-brand-brown/90">{title}</h3>
                {availablePackages && availablePackages.length > 0 && (
                    <div className="relative">
                         <button 
                            type="button" 
                            onClick={() => setIsPackageMenuOpen(!isPackageMenuOpen)}
                            className="text-xs bg-brand-tan/50 hover:bg-brand-orange hover:text-white text-brand-brown px-2 py-1 rounded flex items-center gap-1 transition-colors"
                         >
                            <ShoppingBagIcon className="w-3 h-3" /> Quick Add Package
                         </button>
                         {isPackageMenuOpen && (
                             <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg z-20 animate-fade-in">
                                {availablePackages.map(pkg => (
                                    <button 
                                        key={pkg.id} 
                                        type="button" 
                                        onClick={() => { onAddPackage(pkg); setIsPackageMenuOpen(false); }}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-50 last:border-0"
                                    >
                                        {pkg.name} ({pkg.quantity})
                                    </button>
                                ))}
                             </div>
                         )}
                         {isPackageMenuOpen && <div className="fixed inset-0 z-10" onClick={() => setIsPackageMenuOpen(false)}></div>}
                    </div>
                )}
            </div>
            <div className="space-y-3 pr-2 border-l-4 border-brand-tan/60 pl-3">
                {items.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-fade-in">
                        <div className="flex-grow w-full">
                            <select value={item.name} onChange={e => onItemChange(index, 'name', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm bg-white text-brand-brown">
                                {flavors.map(flavor => <option key={flavor.name} value={flavor.name}>{flavor.name}</option>)}
                            </select>
                            {item.name === otherOption && (
                                <input
                                    type="text"
                                    placeholder="Enter new flavor name"
                                    value={item.customName || ''}
                                    onChange={e => onItemChange(index, 'customName', e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm bg-white text-brand-brown mt-2"
                                    required
                                />
                            )}
                        </div>
                        <input type="number" min="1" value={item.quantity === 0 ? '' : item.quantity} onChange={e => onItemChange(index, 'quantity', e.target.value)} className="block w-full sm:w-24 rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm bg-white text-brand-brown" />
                        <button type="button" onClick={() => onRemoveItem(index)} className="text-red-500 hover:text-red-700 p-1 self-center">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                ))}
                 {items.length === 0 && <p className="text-sm text-gray-500">No items added.</p>}
            </div>
            <button type="button" onClick={onAddItem} className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-orange hover:text-brand-orange/80 transition-colors">
                <PlusIcon className="w-4 h-4" /> Add Single Item
            </button>
        </div>
    );
};

const formatTimeToHHMM = (timeStr: string | undefined): string => {
    if (!timeStr) return '';
    let tempTimeStr = timeStr.split('-')[0].trim().toLowerCase();
    const hasAmPm = tempTimeStr.includes('am') || tempTimeStr.includes('pm');
    let [hoursStr, minutesStr] = tempTimeStr.replace('am', '').replace('pm', '').split(':');
    let hours = parseInt(hoursStr, 10);
    let minutes = parseInt(minutesStr, 10);
    if (isNaN(hours)) hours = 0;
    if (isNaN(minutes)) minutes = 0;
    if (hasAmPm && tempTimeStr.includes('pm') && hours < 12) hours += 12;
    else if (hasAmPm && tempTimeStr.includes('am') && hours === 12) hours = 0;
    else if (!hasAmPm && hours > 0 && hours < 8) hours += 12;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const formatDateToYYYYMMDD = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = dateStr.replace(/-/g, '/').split('/');
    if (parts.length !== 3) return '';
    const [month, day, year] = parts;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const getLocalTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function OrderFormModal({ order, onClose, onSave, empanadaFlavors, fullSizeEmpanadaFlavors, onAddNewFlavor, onDelete, pricing, settings, existingOrders = [] }: OrderFormModalProps) {
    const [customerName, setCustomerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pickupDate, setPickupDate] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    const [contactMethod, setContactMethod] = useState<string>(ContactMethod.UNKNOWN);
    const [customContactMethod, setCustomContactMethod] = useState('');
    const [miniItems, setMiniItems] = useState<FormOrderItem[]>([]);
    const [fullSizeItems, setFullSizeItems] = useState<FormOrderItem[]>([]);
    const [specialItems, setSpecialItems] = useState<FormOrderItem[]>([]); // Not explicitly used but kept for structure if needed
    const [salsaItems, setSalsaItems] = useState<DynamicSalsaState[]>([]);
    const [email, setEmail] = useState('');
    
    // New: Track packages added in this session for reporting
    const [addedPackages, setAddedPackages] = useState<string[]>([]);
    
    // New: Preserve existing structured packages when editing
    const [preservedPackages, setPreservedPackages] = useState<OrderPackageSelection[]>([]);
    
    const [amountCharged, setAmountCharged] = useState<number | string>(0);
    const [isAutoPrice, setIsAutoPrice] = useState(true); 

    const [deliveryRequired, setDeliveryRequired] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState<number | string>(0);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.PENDING);
    const [amountCollected, setAmountCollected] = useState<number | string>(0);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');
    
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
    const [activePackageBuilder, setActivePackageBuilder] = useState<MenuPackage | null>(null);

    // Load order data if editing
    useEffect(() => {
        if (order) {
            setCustomerName(order.customerName);
            setPhoneNumber(order.phoneNumber || '');
            setEmail(order.email || '');
            setPickupDate(formatDateToYYYYMMDD(order.pickupDate));
            setPickupTime(formatTimeToHHMM(order.pickupTime));
            
            // Handle Contact Method
            const stdMethods = Object.values(ContactMethod) as string[];
            let method = order.contactMethod;
            // Try to parse out email if stored in contact method string
            if (method && method.includes('Email: ')) {
                // e.g. "Website (Email: foo@bar.com)"
                // We typically just set the dropdown. The email state is handled separately.
                // If the email field on order object was empty, we could extract it here, but we trust order.email mostly.
            }
            
            if (stdMethods.includes(method)) {
                setContactMethod(method);
            } else {
                setContactMethod('Other');
                setCustomContactMethod(method);
            }

            // Items
            const minis: FormOrderItem[] = [];
            const fulls: FormOrderItem[] = [];
            const salsas: DynamicSalsaState[] = (pricing.salsas || []).map(s => ({ 
                id: s.id, name: s.name, checked: false, quantity: 0 
            }));

            // Preserve packages
            if (order.packages) {
                setPreservedPackages(order.packages);
                // Also load legacy package names if present
                if (order.originalPackages) setAddedPackages(order.originalPackages);
            }

            // Filter out package items if they are structured, otherwise load all
            // Ideally for admin editing we might want to flatten everything to allow easy modification
            // OR keep them separated. Flattening is easier for quick edits.
            // Let's load loose items. If we have packages, we keep them in `preservedPackages`.
            // Any items NOT in packages should be loaded into the inputs.
            
            // To simplify Admin Edit: We will Flatten everything into the inputs. 
            // Warning: This "breaks" the package structure visually in the modal, 
            // but ensures all items are accounted for and editable.
            // If the user saves, it will be saved as loose items + potentially preserved package metadata if we don't clear it.
            // Decision: Flatten for editing. Clear preserved packages to avoid double counting or confusion upon re-save.
            setPreservedPackages([]); 
            setAddedPackages([]); 

            order.items.forEach(item => {
                // Check if Salsa
                const salsaIdx = salsas.findIndex(s => s.name === item.name);
                if (salsaIdx !== -1) {
                    salsas[salsaIdx].checked = true;
                    salsas[salsaIdx].quantity = item.quantity;
                    return;
                }

                if (item.name.startsWith('Full ')) {
                    fulls.push({ name: item.name.replace('Full ', ''), quantity: item.quantity });
                } else {
                    minis.push({ name: item.name, quantity: item.quantity });
                }
            });

            setMiniItems(minis);
            setFullSizeItems(fulls);
            setSalsaItems(salsas);

            setAmountCharged(order.amountCharged);
            setAmountCollected(order.amountCollected || 0);
            setDeliveryRequired(order.deliveryRequired);
            setDeliveryFee(order.deliveryFee);
            setDeliveryAddress(order.deliveryAddress || '');
            setPaymentStatus(order.paymentStatus);
            setPaymentMethod(order.paymentMethod || '');
            setSpecialInstructions(order.specialInstructions || '');
            
            // Disable auto price initially to respect saved price
            setIsAutoPrice(false);
        } else {
            // New Order Defaults
            setPickupDate(getLocalTodayDate());
            setPaymentStatus(PaymentStatus.PENDING);
            setContactMethod(ContactMethod.PHONE);
            // Initialize Salsas
            setSalsaItems((pricing.salsas || []).map(s => ({ 
                id: s.id, name: s.name, checked: false, quantity: 0 
            })));
            setIsAutoPrice(true);
        }
        setInitialLoadComplete(true);
    }, [order, pricing.salsas]);

    // Auto Pricing Logic
    useEffect(() => {
        if (!initialLoadComplete || !isAutoPrice) return;

        const currentMiniItems: OrderItem[] = miniItems
            .filter(i => i.quantity && (i.name !== 'Other' || i.customName))
            .map(i => ({ name: i.name === 'Other' ? i.customName! : i.name, quantity: Number(i.quantity) }));

        const currentFullItems: OrderItem[] = fullSizeItems
            .filter(i => i.quantity && (i.name !== 'Full Other' || i.customName))
            .map(i => ({ name: i.name === 'Full Other' ? `Full ${i.customName!}` : `Full ${i.name}`, quantity: Number(i.quantity) }));

        const currentSalsaItems: OrderItem[] = salsaItems
            .filter(s => s.checked && s.quantity > 0)
            .map(s => ({ name: s.name, quantity: Number(s.quantity) }));

        const allItems = [...currentMiniItems, ...currentFullItems, ...currentSalsaItems];
        
        // Note: Preserved packages are not easily editable in this view if we flattened them.
        // If we didn't flatten them (see above logic), we would need to add their value.
        // Since we flattened them on load, allItems covers everything.

        const delivery = Number(deliveryFee) || 0;
        const total = calculateOrderTotal(allItems, delivery, pricing, empanadaFlavors, fullSizeEmpanadaFlavors);
        setAmountCharged(total);

    }, [miniItems, fullSizeItems, salsaItems, deliveryFee, isAutoPrice, initialLoadComplete, pricing, empanadaFlavors, fullSizeEmpanadaFlavors]);

    // Helpers
    const handleAddressChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDeliveryAddress(val);
        if (val.length > 5) {
            try {
                const suggestions = await getAddressSuggestions(val, null);
                setAddressSuggestions(suggestions);
            } catch (e) {}
        } else {
            setAddressSuggestions([]);
        }
    };

    const addMiniItem = () => setMiniItems([...miniItems, { name: empanadaFlavors[0]?.name || 'Beef', quantity: 12 }]);
    const removeMiniItem = (idx: number) => setMiniItems(miniItems.filter((_, i) => i !== idx));
    const updateMiniItem = (idx: number, field: keyof FormOrderItem, value: any) => {
        const newItems = [...miniItems];
        newItems[idx] = { ...newItems[idx], [field]: value };
        setMiniItems(newItems);
    };

    const addFullItem = () => setFullSizeItems([...fullSizeItems, { name: fullSizeEmpanadaFlavors[0]?.name || 'Full Beef', quantity: 1 }]);
    const removeFullItem = (idx: number) => setFullSizeItems(fullSizeItems.filter((_, i) => i !== idx));
    const updateFullItem = (idx: number, field: keyof FormOrderItem, value: any) => {
        const newItems = [...fullSizeItems];
        newItems[idx] = { ...newItems[idx], [field]: value };
        setFullSizeItems(newItems);
    };

    // Package Helper (Adds items to list)
    const handlePackageAdd = (pkg: MenuPackage) => {
        // Just open the builder
        setActivePackageBuilder(pkg);
    };

    const handlePackageConfirm = (items: {name: string, quantity: number}[]) => {
        if (!activePackageBuilder) return;
        
        // Add items to the appropriate lists
        const newMinis = [...miniItems];
        const newFulls = [...fullSizeItems];
        const newSalsas = [...salsaItems];

        items.forEach(item => {
            // Check if salsa
            const salsaIdx = newSalsas.findIndex(s => s.name === item.name);
            if (salsaIdx !== -1) {
                newSalsas[salsaIdx].checked = true;
                newSalsas[salsaIdx].quantity = Number(newSalsas[salsaIdx].quantity) + item.quantity;
                return;
            }

            if (item.name.startsWith('Full ')) {
                // Check if already exists to merge
                const existing = newFulls.find(i => i.name === item.name.replace('Full ', ''));
                if (existing) {
                    existing.quantity = Number(existing.quantity) + item.quantity;
                } else {
                    newFulls.push({ name: item.name.replace('Full ', ''), quantity: item.quantity });
                }
            } else {
                const existing = newMinis.find(i => i.name === item.name);
                if (existing) {
                    existing.quantity = Number(existing.quantity) + item.quantity;
                } else {
                    newMinis.push({ name: item.name, quantity: item.quantity });
                }
            }
        });

        setMiniItems(newMinis);
        setFullSizeItems(newFulls);
        setSalsaItems(newSalsas);
        
        // Track package name
        setAddedPackages(prev => [...prev, activePackageBuilder.name]);
        setActivePackageBuilder(null);
    };

    const handleSaveForm = (e: React.FormEvent) => {
        e.preventDefault();
        
        const finalMethod = contactMethod === 'Other' ? customContactMethod : contactMethod;
        
        const currentMiniItems: OrderItem[] = miniItems
            .filter(i => i.quantity && (i.name !== 'Other' || i.customName))
            .map(i => {
                if (i.name === 'Other' && i.customName && onAddNewFlavor) {
                    // Trigger add new flavor callback if needed, 
                    // though usually we just save the name. 
                    // To register it globally:
                    // onAddNewFlavor(i.customName, 'mini'); 
                }
                return { name: i.name === 'Other' ? i.customName! : i.name, quantity: Number(i.quantity) };
            });

        const currentFullItems: OrderItem[] = fullSizeItems
            .filter(i => i.quantity && (i.name !== 'Full Other' || i.customName))
            .map(i => {
                const cleanName = i.name === 'Full Other' ? i.customName! : i.name;
                return { name: `Full ${cleanName}`, quantity: Number(i.quantity) };
            });

        const currentSalsaItems: OrderItem[] = salsaItems
            .filter(s => s.checked && s.quantity > 0)
            .map(s => ({ name: s.name, quantity: Number(s.quantity) }));

        const allItems = [...currentMiniItems, ...currentFullItems, ...currentSalsaItems];

        // Total Calc for verification
        const miniCount = currentMiniItems.reduce((sum, i) => sum + i.quantity, 0);
        const fullCount = currentFullItems.reduce((sum, i) => sum + i.quantity, 0);

        const orderData: Order | Omit<Order, 'id'> = {
            ...(order || {}), // Keep existing ID if editing
            customerName,
            phoneNumber,
            email: email || null,
            pickupDate: normalizeDateStr(pickupDate),
            pickupTime: pickupTime,
            contactMethod: finalMethod,
            items: allItems,
            totalMini: miniCount,
            totalFullSize: fullCount,
            amountCharged: Number(amountCharged),
            amountCollected: Number(amountCollected),
            deliveryRequired,
            deliveryFee: Number(deliveryFee),
            deliveryAddress: deliveryRequired ? deliveryAddress : null,
            paymentStatus,
            paymentMethod: paymentStatus === PaymentStatus.PAID ? paymentMethod : null,
            specialInstructions: specialInstructions || null,
            followUpStatus: order?.followUpStatus || FollowUpStatus.NEEDED,
            approvalStatus: order?.approvalStatus || ApprovalStatus.APPROVED,
            // Track packages
            originalPackages: addedPackages.length > 0 ? addedPackages : (order?.originalPackages || []),
            // We are NOT reconstructing structured packages here because we flattened them.
            // If we wanted to preserve, we would merge `preservedPackages` but since we edited items, sync is hard.
            // Sending empty packages array or undefined implies "Custom/Mixed" or purely flat list.
            packages: [], 
        };

        onSave(orderData);
    };

    const handleDelete = () => {
        if (order && onDelete && window.confirm("Are you sure you want to delete this order?")) {
            onDelete(order.id);
            onClose();
        }
    };

    const visiblePackages = (pricing.packages || []).filter(p => p.visible);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-brand-tan">
                <header className="p-4 border-b border-brand-tan flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <ShoppingBagIcon className="w-6 h-6 text-brand-orange" />
                        <h2 className="text-2xl font-serif text-brand-brown">{order ? 'Edit Order' : 'New Order'}</h2>
                    </div>
                    <div className="flex gap-2">
                        {order && onDelete && (
                            <button onClick={handleDelete} className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50" title="Delete">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded hover:bg-gray-200">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                <div className="overflow-y-auto p-6 space-y-6 flex-grow">
                    {/* Active Builder Overlay */}
                    {activePackageBuilder && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                            <PackageBuilderModal 
                                pkg={activePackageBuilder}
                                standardFlavors={empanadaFlavors.filter(f => !f.isSpecial)}
                                specialFlavors={empanadaFlavors.filter(f => f.isSpecial)}
                                salsas={(pricing.salsas||[]).map(s => ({ name: s.name, visible: true, surcharge: s.price }))}
                                onClose={() => setActivePackageBuilder(null)}
                                onConfirm={handlePackageConfirm}
                                className="max-w-2xl max-h-[80vh]"
                            />
                        </div>
                    )}

                    <form id="order-form" onSubmit={handleSaveForm}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column: Details */}
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase">Customer Info</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase">Name</label>
                                            <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full rounded border-gray-300" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase">Phone</label>
                                                <input type="text" required value={phoneNumber} onChange={e => setPhoneNumber(formatPhoneNumber(e.target.value))} className="w-full rounded border-gray-300" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase">Email</label>
                                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded border-gray-300" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase">Source</label>
                                            <div className="flex gap-2">
                                                <select value={contactMethod} onChange={e => setContactMethod(e.target.value)} className="w-full rounded border-gray-300 text-sm">
                                                    {Object.values(ContactMethod).map(m => <option key={m} value={m}>{m}</option>)}
                                                    <option value="Other">Other</option>
                                                </select>
                                                {contactMethod === 'Other' && (
                                                    <input type="text" value={customContactMethod} onChange={e => setCustomContactMethod(e.target.value)} placeholder="Specify..." className="w-full rounded border-gray-300 text-sm" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase">Pickup / Delivery</h3>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase">Date</label>
                                            <input type="date" required value={pickupDate} onChange={e => setPickupDate(e.target.value)} className="w-full rounded border-gray-300 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase">Time</label>
                                            <div className="relative">
                                                <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full rounded border-gray-300 text-sm" />
                                                {pickupDate && (
                                                    <select 
                                                        onChange={e => setPickupTime(e.target.value)} 
                                                        className="absolute inset-y-0 right-0 w-6 opacity-0 cursor-pointer"
                                                        title="Select from slots"
                                                    >
                                                        {generateTimeSlots(normalizeDateStr(pickupDate), settings.scheduling.startTime, settings.scheduling.endTime, settings.scheduling.intervalMinutes).map(s => (
                                                            <option key={s} value={formatTimeToHHMM(s)}>{s}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 mb-2">
                                        <input type="checkbox" checked={deliveryRequired} onChange={e => setDeliveryRequired(e.target.checked)} className="rounded text-brand-orange focus:ring-brand-orange" />
                                        <span className="text-sm font-medium text-gray-700">Delivery Required?</span>
                                    </label>
                                    {deliveryRequired && (
                                        <div className="space-y-2 animate-fade-in">
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    placeholder="Address" 
                                                    value={deliveryAddress} 
                                                    onChange={handleAddressChange} 
                                                    className="w-full rounded border-gray-300 text-sm" 
                                                />
                                                {addressSuggestions.length > 0 && (
                                                    <ul className="absolute z-10 w-full bg-white border border-gray-300 shadow-lg max-h-40 overflow-y-auto">
                                                        {addressSuggestions.map((s, i) => (
                                                            <li key={i} onClick={() => { setDeliveryAddress(s); setAddressSuggestions([]); }} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer">{s}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-600">Fee: $</span>
                                                <input type="number" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} className="w-20 rounded border-gray-300 text-sm" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Items */}
                            <div className="space-y-4">
                                <ItemInputSection 
                                    title="Mini Empanadas" 
                                    items={miniItems} 
                                    flavors={empanadaFlavors}
                                    onItemChange={updateMiniItem}
                                    onAddItem={addMiniItem}
                                    onRemoveItem={removeMiniItem}
                                    itemType="mini"
                                    availablePackages={visiblePackages.filter(p => p.itemType === 'mini')}
                                    onAddPackage={handlePackageAdd}
                                />
                                <ItemInputSection 
                                    title="Full Size Empanadas" 
                                    items={fullSizeItems} 
                                    flavors={fullSizeEmpanadaFlavors.map(f => ({...f, name: f.name.replace('Full ', '')}))} // Strip prefix for display
                                    onItemChange={updateFullItem}
                                    onAddItem={addFullItem}
                                    onRemoveItem={removeFullItem}
                                    itemType="full"
                                    bgColor="bg-brand-tan/10"
                                    availablePackages={visiblePackages.filter(p => p.itemType === 'full' || p.isPartyPlatter)}
                                    onAddPackage={handlePackageAdd}
                                />
                                
                                {/* Salsas */}
                                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                    <h3 className="font-bold text-orange-800 mb-2 text-sm">Salsas & Extras</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {salsaItems.map((s, idx) => (
                                            <div key={s.id} className="flex items-center justify-between bg-white p-2 rounded border border-orange-100">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={s.checked} 
                                                        onChange={e => {
                                                            const newSalsas = [...salsaItems];
                                                            newSalsas[idx].checked = e.target.checked;
                                                            if (e.target.checked && !newSalsas[idx].quantity) newSalsas[idx].quantity = 1;
                                                            setSalsaItems(newSalsas);
                                                        }} 
                                                        className="rounded text-brand-orange" 
                                                    />
                                                    <span className="text-xs font-medium text-gray-700">{s.name}</span>
                                                </label>
                                                {s.checked && (
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        value={s.quantity} 
                                                        onChange={e => {
                                                            const newSalsas = [...salsaItems];
                                                            newSalsas[idx].quantity = e.target.value;
                                                            setSalsaItems(newSalsas);
                                                        }} 
                                                        className="w-12 text-center text-xs rounded border-gray-300 p-1" 
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom: Payment & Totals */}
                        <div className="mt-6 border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase">Payment</h3>
                                <div className="grid grid-cols-2 gap-3 mb-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase">Status</label>
                                        <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as PaymentStatus)} className="w-full rounded border-gray-300 text-sm">
                                            {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase">Method</label>
                                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full rounded border-gray-300 text-sm">
                                            <option value="">Select...</option>
                                            <option value="Cash">Cash</option>
                                            <option value="Zelle">Zelle</option>
                                            <option value="Venmo">Venmo</option>
                                            <option value="Card">Card</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Amount Collected</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                                        <input type="number" step="0.01" value={amountCollected} onChange={e => setAmountCollected(e.target.value)} className="w-full pl-6 rounded border-gray-300 text-sm" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between bg-brand-orange/10 p-4 rounded-lg border border-brand-orange/20">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-brand-brown">Total Charged:</span>
                                        <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                                            <input type="checkbox" checked={isAutoPrice} onChange={e => setIsAutoPrice(e.target.checked)} />
                                            Auto-Calc
                                        </label>
                                    </div>
                                    <div className="relative w-32">
                                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            value={amountCharged} 
                                            onChange={e => { setAmountCharged(e.target.value); setIsAutoPrice(false); }} 
                                            className="w-full pl-6 rounded border-brand-orange focus:ring-brand-orange text-lg font-bold text-right text-brand-brown" 
                                        />
                                    </div>
                                </div>
                                
                                <textarea 
                                    rows={2} 
                                    value={specialInstructions} 
                                    onChange={e => setSpecialInstructions(e.target.value)} 
                                    placeholder="Notes / Special Instructions" 
                                    className="w-full rounded border-gray-300 text-sm"
                                />
                            </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 font-bold rounded hover:bg-gray-300">Cancel</button>
                            <button type="submit" className="px-8 py-2 bg-brand-orange text-white font-bold rounded shadow hover:bg-opacity-90 flex items-center gap-2">
                                <ClockIcon className="w-5 h-5" /> Save Order
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
