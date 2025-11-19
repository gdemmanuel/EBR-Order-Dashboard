
import React, { useState, useEffect } from 'react';
import { Order, OrderItem, ContactMethod, PaymentStatus, FollowUpStatus, ApprovalStatus, PricingSettings, Flavor, MenuPackage } from '../types';
import { TrashIcon, PlusIcon, XMarkIcon, ShoppingBagIcon } from './icons/Icons';
import { getAddressSuggestions } from '../services/geminiService';
import { calculateOrderTotal, calculateSupplyCost } from '../utils/pricingUtils';
import { SalsaSize } from '../config';
import PackageBuilderModal from './PackageBuilderModal';
import { AppSettings } from '../services/dbService';

interface OrderFormModalProps {
    order?: Order;
    onClose: () => void;
    onSave: (order: Order | Omit<Order, 'id'>) => void;
    empanadaFlavors: Flavor[];
    fullSizeEmpanadaFlavors: Flavor[];
    onAddNewFlavor: (flavor: string, type: 'mini' | 'full') => void;
    onDelete?: (orderId: string) => void;
    pricing: PricingSettings;
    // Add settings prop to access cost data
    settings: AppSettings;
}

// Local state type to allow empty string for quantity and other number inputs
interface FormOrderItem {
    name: string;
    quantity: number | string;
    customName?: string;
}

type SalsaName = 'Salsa Verde' | 'Salsa Rosada';
interface SalsaState {
    name: SalsaName;
    checked: boolean;
    quantity: number | string;
    size: SalsaSize;
}

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
}> = ({ title, items, flavors, onItemChange, onAddItem, onRemoveItem, itemType, availablePackages, onAddPackage }) => {
    const otherOption = itemType === 'mini' ? 'Other' : 'Full Other';
    return (
        <div>
            <div className="flex justify-between items-end mb-2">
                <h3 className="text-lg font-semibold text-brand-brown/90">{title}</h3>
                {availablePackages && availablePackages.length > 0 && (
                    <div className="relative group">
                         <button type="button" className="text-xs bg-brand-tan/50 hover:bg-brand-orange hover:text-white text-brand-brown px-2 py-1 rounded flex items-center gap-1 transition-colors">
                            <ShoppingBagIcon className="w-3 h-3" /> Quick Add Package
                         </button>
                         <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg z-20 hidden group-hover:block">
                            {availablePackages.map(pkg => (
                                <button 
                                    key={pkg.id} 
                                    type="button" 
                                    onClick={() => onAddPackage(pkg)}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    {pkg.name} ({pkg.quantity})
                                </button>
                            ))}
                         </div>
                    </div>
                )}
            </div>
            <div className="space-y-3 max-h-40 overflow-y-auto pr-2 border-l-4 border-brand-tan/60 pl-3">
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
                        <input type="number" min="1" value={item.quantity} onChange={e => onItemChange(index, 'quantity', e.target.value)} className="block w-full sm:w-24 rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm bg-white text-brand-brown" />
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

// Helper formatters
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
    const parts = dateStr.split('/');
    if (parts.length !== 3) return '';
    const [month, day, year] = parts;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export default function OrderFormModal({ order, onClose, onSave, empanadaFlavors, fullSizeEmpanadaFlavors, onAddNewFlavor, onDelete, pricing, settings }: OrderFormModalProps) {
    const [customerName, setCustomerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pickupDate, setPickupDate] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    const [contactMethod, setContactMethod] = useState<string>(ContactMethod.UNKNOWN);
    const [customContactMethod, setCustomContactMethod] = useState('');
    const [miniItems, setMiniItems] = useState<FormOrderItem[]>([]);
    const [fullSizeItems, setFullSizeItems] = useState<FormOrderItem[]>([]);
    const [salsaItems, setSalsaItems] = useState<SalsaState[]>([
        { name: 'Salsa Verde', checked: false, quantity: 1, size: 'Small (4oz)' },
        { name: 'Salsa Rosada', checked: false, quantity: 1, size: 'Small (4oz)' }
    ]);
    const [amountCharged, setAmountCharged] = useState(0);
    const [deliveryRequired, setDeliveryRequired] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState<number | string>(0);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.PENDING);
    const [amountCollected, setAmountCollected] = useState<number | string>(0);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');
    
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
    const [isSuggestingAddress, setIsSuggestingAddress] = useState(false);
    const [addressError, setAddressError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

    // Package Builder State
    const [activePackageBuilder, setActivePackageBuilder] = useState<MenuPackage | null>(null);

    const resetForm = () => {
        setCustomerName('');
        setPhoneNumber('');
        setPickupDate('');
        setPickupTime('');
        setContactMethod(ContactMethod.UNKNOWN);
        setCustomContactMethod('');
        setMiniItems([]);
        setFullSizeItems([]);
        setAmountCharged(0);
        setDeliveryRequired(false);
        setDeliveryFee(0);
        setDeliveryAddress('');
        setPaymentStatus(PaymentStatus.PENDING);
        setAmountCollected(0);
        setPaymentMethod('');
        setSalsaItems([
            { name: 'Salsa Verde', checked: false, quantity: 1, size: 'Small (4oz)' },
            { name: 'Salsa Rosada', checked: false, quantity: 1, size: 'Small (4oz)' }
        ]);
        setSpecialInstructions('');
        setInitialLoadComplete(false);
    };
    
    const populateForm = (data: Order | Partial<Order>) => {
        setCustomerName(data.customerName || '');
        setPhoneNumber(data.phoneNumber || '');
        setPickupDate(formatDateToYYYYMMDD(data.pickupDate));
        setPickupTime(formatTimeToHHMM(data.pickupTime));

        const contact = data.contactMethod || '';
        if (Object.values(ContactMethod).includes(contact as ContactMethod)) {
            setContactMethod(contact);
            setCustomContactMethod('');
        } else {
            setContactMethod('Other');
            setCustomContactMethod(contact);
        }

        setDeliveryRequired(data.deliveryRequired || false);
        setDeliveryFee(data.deliveryFee || 0);
        setDeliveryAddress(data.deliveryAddress || '');

        const items = data.items || [];
        const isSalsa = (name: string) => name.includes('Salsa Verde') || name.includes('Salsa Rosada');
        setMiniItems(items.filter(i => !i.name.startsWith('Full ') && !isSalsa(i.name)));
        setFullSizeItems(items.filter(i => i.name.startsWith('Full ')));
        
        setPaymentStatus((data as Order).paymentStatus || PaymentStatus.PENDING);
        setAmountCollected(data.amountCollected || 0);
        setPaymentMethod(data.paymentMethod || '');
        setSpecialInstructions(data.specialInstructions || '');

        // Populate salsa items
        const initialSalsaState: SalsaState[] = [
            { name: 'Salsa Verde', checked: false, quantity: 1, size: 'Small (4oz)' },
            { name: 'Salsa Rosada', checked: false, quantity: 1, size: 'Small (4oz)' }
        ];
        items.forEach(item => {
            if (item.name.includes('Salsa Verde')) {
                initialSalsaState[0].checked = true;
                initialSalsaState[0].quantity = item.quantity;
                initialSalsaState[0].size = item.name.includes('Large') ? 'Large (8oz)' : 'Small (4oz)';
            }
            if (item.name.includes('Salsa Rosada')) {
                initialSalsaState[1].checked = true;
                initialSalsaState[1].quantity = item.quantity;
                initialSalsaState[1].size = item.name.includes('Large') ? 'Large (8oz)' : 'Small (4oz)';
            }
        });
        setSalsaItems(initialSalsaState);

        if (data.amountCharged !== undefined) {
            setAmountCharged(data.amountCharged);
        }
        setInitialLoadComplete(true);
    };

    useEffect(() => {
        if (order) {
            populateForm(order);
        } else {
            resetForm();
            setInitialLoadComplete(true);
        }
    }, [order]);

     useEffect(() => {
        if (deliveryRequired) {
            navigator.geolocation.getCurrentPosition(
                (p) => setUserLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
                (e) => console.warn("Geolocation error", e.message)
            );
        }
    }, [deliveryRequired]);

    // Address Suggestions
    useEffect(() => {
        if (!deliveryRequired) { setAddressSuggestions([]); return; }
        const handler = setTimeout(async () => {
            if (deliveryAddress.length > 3) {
                setIsSuggestingAddress(true);
                setAddressError(null);
                try {
                    const suggestions = await getAddressSuggestions(deliveryAddress, userLocation);
                    setAddressSuggestions(suggestions);
                } catch (e) { setAddressError("Could not fetch address suggestions."); } 
                finally { setIsSuggestingAddress(false); }
            } else { setAddressSuggestions([]); }
        }, 500);
        return () => clearTimeout(handler);
    }, [deliveryAddress, deliveryRequired, userLocation]);

    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (isDirty) {
             const currentItems: OrderItem[] = [
                ...miniItems.map(i => ({ name: i.name, quantity: Number(i.quantity) || 0 })),
                ...fullSizeItems.map(i => ({ name: i.name, quantity: Number(i.quantity) || 0 })),
                ...salsaItems.filter(s => s.checked).map(s => ({ name: `${s.name} - ${s.size}`, quantity: Number(s.quantity) || 0 }))
            ];
            const currentFee = deliveryRequired ? (Number(deliveryFee) || 0) : 0;
            const newTotal = calculateOrderTotal(currentItems, currentFee, pricing);
            setAmountCharged(newTotal);
        }
    }, [miniItems, fullSizeItems, salsaItems, deliveryFee, deliveryRequired, pricing, isDirty]);

    const markDirty = () => setIsDirty(true);

    useEffect(() => {
        if ((Number(amountCollected) || 0) >= amountCharged && amountCharged > 0) {
            setPaymentStatus(PaymentStatus.PAID);
        } else if (pickupDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const pickup = new Date(pickupDate + 'T00:00:00');
            setPaymentStatus(pickup < today ? PaymentStatus.OVERDUE : PaymentStatus.PENDING);
        } else {
            setPaymentStatus(PaymentStatus.PENDING);
        }
    }, [amountCollected, amountCharged, pickupDate]);
    
    const handleItemChange = (type: 'mini' | 'full', index: number, field: keyof FormOrderItem, value: string | number) => {
        markDirty();
        const items = type === 'mini' ? miniItems : fullSizeItems;
        const updatedItems = items.map((item, i) => {
            if (i === index) {
                const updatedItem = { ...item };
                if (field === 'quantity') {
                    const strValue = String(value);
                    if (/^\d*$/.test(strValue)) updatedItem.quantity = strValue;
                } else if (field === 'customName') {
                    updatedItem.customName = value as string;
                } else {
                    updatedItem.name = value as string;
                    if (updatedItem.name !== 'Other' && updatedItem.name !== 'Full Other') delete updatedItem.customName;
                }
                return updatedItem;
            }
            return item;
        });
        if (type === 'mini') setMiniItems(updatedItems);
        else setFullSizeItems(updatedItems);
    };

    const addItem = (type: 'mini' | 'full') => {
        markDirty();
        // Safely access the first flavor name
        const firstFlavor = type === 'mini' 
            ? (empanadaFlavors[0]?.name || 'Other')
            : (fullSizeEmpanadaFlavors[0]?.name || 'Full Other');
            
        const newItem: FormOrderItem = { name: firstFlavor, quantity: 1 };
        if (type === 'mini') setMiniItems([...miniItems, newItem]);
        else setFullSizeItems([...fullSizeItems, newItem]);
    };

    const removeItem = (type: 'mini' | 'full', index: number) => {
        markDirty();
        if (type === 'mini') setMiniItems(miniItems.filter((_, i) => i !== index));
        else setFullSizeItems(fullSizeItems.filter((_, i) => i !== index));
    };

    const handleSalsaChange = (index: number, field: keyof SalsaState, value: string | number | boolean) => {
        markDirty();
        const newSalsaItems = [...salsaItems];
        const itemToUpdate = { ...newSalsaItems[index] };
        if (field === 'checked') itemToUpdate.checked = value as boolean;
        else if (field === 'quantity') {
            const strValue = String(value);
            if (/^\d*$/.test(strValue)) itemToUpdate.quantity = strValue;
        } else if (field === 'size') itemToUpdate.size = value as SalsaSize;
        newSalsaItems[index] = itemToUpdate;
        setSalsaItems(newSalsaItems);
    };

    const handleDeleteClick = () => {
        if (onDelete && order && window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
            onDelete(order.id);
            onClose();
        }
    };

    // Package Builder Handlers
    const handlePackageConfirm = (items: { name: string; quantity: number }[]) => {
        markDirty();
        if (!activePackageBuilder) return;
        
        const type = activePackageBuilder.itemType;
        const formItems: FormOrderItem[] = items.map(i => ({ name: i.name, quantity: i.quantity }));
        
        // Consolidate with existing items
        const currentItems = type === 'mini' ? miniItems : fullSizeItems;
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

        if (type === 'mini') setMiniItems(combinedItems);
        else setFullSizeItems(combinedItems);
        
        setActivePackageBuilder(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const processItems = (items: FormOrderItem[], type: 'mini' | 'full'): OrderItem[] => {
            const otherOption = type === 'mini' ? 'Other' : 'Full Other';
            return items.map(item => {
                let finalName = item.name;
                if (item.name === otherOption && item.customName?.trim()) {
                    const customName = item.customName.trim();
                    onAddNewFlavor(customName, type); 
                    finalName = type === 'full' ? `Full ${customName}` : customName;
                }
                return { name: finalName, quantity: Number(item.quantity) || 0 };
            }).filter(item => item.quantity > 0);
        };
        
        const miniOrderItems = processItems(miniItems, 'mini');
        const fullSizeOrderItems = processItems(fullSizeItems, 'full');
        const empanadaItems: OrderItem[] = [...miniOrderItems, ...fullSizeOrderItems];
        const salsaOrderItems: OrderItem[] = salsaItems
            .filter(salsa => salsa.checked && (Number(salsa.quantity) || 0) > 0)
            .map(salsa => ({ name: `${salsa.name} - ${salsa.size}`, quantity: Number(salsa.quantity) || 0 }));

        const allItems = [...empanadaItems, ...salsaOrderItems];
        const totalFullSize = fullSizeOrderItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        const totalMini = miniOrderItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

        const formattedDate = pickupDate ? `${pickupDate.split('-')[1]}/${pickupDate.split('-')[2]}/${pickupDate.split('-')[0]}` : '';

        let formattedTime = '';
        if (pickupTime) {
            const timeParts = pickupTime.split(':');
            let hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            formattedTime = `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`;
        }

        const finalContactMethod = contactMethod === 'Other' ? (customContactMethod.trim() || 'Other') : contactMethod;
        
        // Calculate Cost Logic:
        // We calculate cost now based on current settings and save it to the order.
        // This ensures historical costs don't change if settings change later.
        const calculatedCost = calculateSupplyCost(allItems, settings);

        const orderData = {
            customerName,
            phoneNumber,
            pickupDate: formattedDate,
            pickupTime: formattedTime,
            contactMethod: finalContactMethod,
            items: allItems,
            amountCharged,
            totalCost: calculatedCost, // Save cost snapshot
            totalFullSize,
            totalMini,
            deliveryRequired,
            deliveryFee: deliveryRequired ? (Number(deliveryFee) || 0) : 0,
            deliveryAddress: deliveryRequired ? deliveryAddress : null,
            followUpStatus: order?.followUpStatus || FollowUpStatus.NEEDED,
            paymentStatus: paymentStatus,
            amountCollected: Number(amountCollected) || 0,
            paymentMethod: paymentMethod.trim() || null,
            specialInstructions: specialInstructions || null,
            approvalStatus: order?.approvalStatus || ApprovalStatus.APPROVED,
        };

        if (order) onSave({ ...order, ...orderData });
        else onSave(orderData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-brand-tan">
                <header className="p-6 border-b border-brand-tan flex justify-between items-center">
                    <h2 className="text-3xl font-serif text-brand-brown">{order ? 'Edit Order' : 'Add New Order'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-brand-brown/90">Customer Name</label>
                            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-brown/90">Phone Number</label>
                            <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-brand-brown/90">Contact Method</label>
                            <select value={contactMethod} onChange={e => setContactMethod(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown">
                                {Object.values(ContactMethod).map(method => <option key={method} value={method}>{method}</option>)}
                                <option value="Other">Other</option>
                            </select>
                            {contactMethod === 'Other' && (
                                <input type="text" value={customContactMethod} onChange={e => setCustomContactMethod(e.target.value)} placeholder="Enter contact source" className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" required />
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-brown/90">Pickup Date</label>
                            <input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-brand-brown/90">Pickup Time</label>
                            <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-brand-brown/90">Amount Charged ($)</label>
                            <input type="number" step="0.01" value={amountCharged.toFixed(2)} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-gray-100 text-brand-brown/70" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-brown/90">Amount Collected ($)</label>
                            <input type="number" step="0.01" min="0" value={amountCollected} onChange={e => setAmountCollected(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-brand-brown/90">Payment Method</label>
                           <input type="text" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} placeholder="e.g., Cash, Zelle, Venmo" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" />
                        </div>
                         <div>
                           <label className="block text-sm font-medium text-brand-brown/90">Payment Status</label>
                            <input type="text" value={paymentStatus} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-gray-100 text-brand-brown/70" />
                        </div>
                    </div>
                    
                    <div className="border-t border-brand-tan pt-4">
                         <div className="flex items-center">
                            <input type="checkbox" id="delivery" checked={deliveryRequired} onChange={e => {setDeliveryRequired(e.target.checked); markDirty();}} className="h-4 w-4 rounded border-gray-300 text-brand-orange focus:ring-brand-orange" />
                            <label htmlFor="delivery" className="ml-2 block text-sm font-medium text-brand-brown">Delivery Required?</label>
                        </div>
                        {deliveryRequired && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4 animate-fade-in">
                                <div className="md:col-span-2 relative">
                                    <label className="block text-sm font-medium text-brand-brown/90">Delivery Address</label>
                                    <input type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} required={deliveryRequired} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" autoComplete="off" />
                                     {isSuggestingAddress && <div className="absolute right-3 top-8 animate-spin rounded-full h-5 w-5 border-b-2 border-brand-orange"></div>}
                                    {addressSuggestions.length > 0 && (
                                        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-40 overflow-y-auto">
                                            {addressSuggestions.map((suggestion, index) => (
                                                <li key={index} className="px-3 py-2 cursor-pointer hover:bg-brand-tan/60" onClick={() => { setDeliveryAddress(suggestion); setAddressSuggestions([]); }} role="option">{suggestion}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {addressError && <p className="text-sm text-red-500 mt-1">{addressError}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-brown/90">Delivery Fee ($)</label>
                                    <input type="number" step="1" min="0" value={deliveryFee} onChange={e => {setDeliveryFee(e.target.value); markDirty();}} required={deliveryRequired} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 border-t border-brand-tan pt-4">
                        <ItemInputSection 
                            title="Mini Empanadas"
                            items={miniItems}
                            flavors={empanadaFlavors}
                            onItemChange={(index, field, value) => handleItemChange('mini', index, field, value)}
                            onAddItem={() => addItem('mini')}
                            onRemoveItem={(index) => removeItem('mini', index)}
                            itemType="mini"
                            availablePackages={pricing.packages?.filter(p => p.itemType === 'mini')}
                            onAddPackage={setActivePackageBuilder}
                        />
                         <ItemInputSection 
                            title="Full-Size Empanadas"
                            items={fullSizeItems}
                            flavors={fullSizeEmpanadaFlavors}
                            onItemChange={(index, field, value) => handleItemChange('full', index, field, value)}
                            onAddItem={() => addItem('full')}
                            onRemoveItem={(index) => removeItem('full', index)}
                            itemType="full"
                            availablePackages={pricing.packages?.filter(p => p.itemType === 'full')}
                            onAddPackage={setActivePackageBuilder}
                        />
                    </div>

                    <div className="border-t border-brand-tan pt-4">
                        <h3 className="text-lg font-semibold text-brand-brown/90 mb-3">Salsas</h3>
                        <div className="space-y-4">
                            {salsaItems.map((salsa, index) => (
                                <div key={salsa.name} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <div className="flex items-center">
                                        <input type="checkbox" id={`salsa-${index}`} checked={salsa.checked} onChange={e => handleSalsaChange(index, 'checked', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-orange focus:ring-brand-orange" />
                                        <label htmlFor={`salsa-${index}`} className="font-medium text-brand-brown w-32 ml-2">{salsa.name}</label>
                                    </div>
                                    {salsa.checked && (
                                        <div className="flex items-center gap-2 animate-fade-in flex-grow sm:flex-grow-0">
                                            <label htmlFor={`salsa-qty-${index}`} className="text-sm">Qty:</label>
                                            <input type="number" id={`salsa-qty-${index}`} min="1" value={salsa.quantity} onChange={e => handleSalsaChange(index, 'quantity', e.target.value)} className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm bg-white text-brand-brown" />
                                            <select value={salsa.size} onChange={e => handleSalsaChange(index, 'size', e.target.value)} className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm bg-white text-brand-brown">
                                                <option value="Small (4oz)">Small</option>
                                                <option value="Large (8oz)">Large</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="border-t border-brand-tan pt-4">
                        <label htmlFor="special-instructions" className="block text-sm font-medium text-brand-brown/90">Special Instructions</label>
                        <textarea id="special-instructions" value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" placeholder="e.g., allergies, packaging requests, etc." />
                    </div>

                    <footer className="pt-6 flex justify-between border-t border-brand-tan">
                        <div>
                             {order && onDelete && (
                                <button type="button" onClick={handleDeleteClick} className="flex items-center gap-2 bg-red-50 text-red-600 font-semibold px-4 py-2 rounded-lg hover:bg-red-100 transition-colors border border-red-200">
                                    <TrashIcon className="w-4 h-4" /> Delete Order
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                            <button type="submit" className="bg-brand-orange text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-opacity-90 transition-all">{order ? 'Save Changes' : 'Add Order'}</button>
                        </div>
                    </footer>
                </form>
                
                {/* Package Builder Modal for Admin */}
                {activePackageBuilder && (
                    <PackageBuilderModal 
                        pkg={activePackageBuilder}
                        flavors={activePackageBuilder.itemType === 'mini' ? empanadaFlavors : fullSizeEmpanadaFlavors}
                        onClose={() => setActivePackageBuilder(null)}
                        onConfirm={handlePackageConfirm}
                    />
                )}
            </div>
        </div>
    );
}
