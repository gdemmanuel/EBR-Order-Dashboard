import React, { useState, useEffect } from 'react';
import { Order, OrderItem, ContactMethod, FollowUpStatus, PaymentStatus } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon } from './icons/Icons';
import { getAddressSuggestions } from '../services/geminiService';

interface OrderFormModalProps {
    order?: Order;
    onClose: () => void;
    onSave: (order: Order | Omit<Order, 'id'>) => void;
    empanadaFlavors: string[];
    fullSizeEmpanadaFlavors: string[];
    onAddNewFlavor: (flavor: string, type: 'mini' | 'full') => void;
}

// Local state type to allow empty string for quantity and other number inputs
interface FormOrderItem {
    name: string;
    quantity: number | string;
    customName?: string;
}

type SalsaName = 'Salsa Verde' | 'Salsa Rosada';
type SalsaSize = 'Small (4oz)' | 'Large (8oz)';
interface SalsaState {
    name: SalsaName;
    checked: boolean;
    quantity: number | string;
    size: SalsaSize;
}

const MINI_EMPANADA_PRICE = 1.75;
const FULL_SIZE_EMPANADA_PRICE = 3.00;
const SALSA_PRICES: Record<SalsaSize, number> = {
    'Small (4oz)': 2.00,
    'Large (8oz)': 4.00,
};

const ItemInputSection: React.FC<{
    title: string;
    items: FormOrderItem[];
    flavors: string[];
    onItemChange: (index: number, field: keyof FormOrderItem, value: string | number) => void;
    onAddItem: () => void;
    onRemoveItem: (index: number) => void;
    itemType: 'mini' | 'full';
}> = ({ title, items, flavors, onItemChange, onAddItem, onRemoveItem, itemType }) => {
    const otherOption = itemType === 'mini' ? 'Other' : 'Full Other';
    return (
        <div>
            <h3 className="text-lg font-semibold text-brand-brown/90 mb-2">{title}</h3>
            <div className="space-y-3 max-h-40 overflow-y-auto pr-2 border-l-4 border-brand-tan/60 pl-3">
                {items.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-fade-in">
                        <div className="flex-grow w-full">
                            <select value={item.name} onChange={e => onItemChange(index, 'name', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm bg-white text-brand-brown">
                                {flavors.map(flavor => <option key={flavor} value={flavor}>{flavor}</option>)}
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
                <PlusIcon className="w-4 h-4" /> Add Item
            </button>
        </div>
    );
};

/**
 * Formats a time string into the HH:mm format required by <input type="time">.
 * It handles various formats like "4:30", "5:00 PM", etc., making assumptions
 * for ambiguous times based on logic from App.tsx.
 */
const formatTimeToHHMM = (timeStr: string | undefined): string => {
    if (!timeStr) return '';
    
    let tempTimeStr = timeStr.split('-')[0].trim().toLowerCase();
    const hasAmPm = tempTimeStr.includes('am') || tempTimeStr.includes('pm');
    let [hoursStr, minutesStr] = tempTimeStr.replace('am', '').replace('pm', '').split(':');

    let hours = parseInt(hoursStr, 10);
    let minutes = parseInt(minutesStr, 10);

    if (isNaN(hours)) hours = 0;
    if (isNaN(minutes)) minutes = 0;

    // Logic adapted from parseOrderDateTime in App.tsx
    if (hasAmPm && tempTimeStr.includes('pm') && hours < 12) {
        hours += 12;
    } else if (hasAmPm && tempTimeStr.includes('am') && hours === 12) { // 12am is 00 hours
        hours = 0;
    } else if (!hasAmPm && hours > 0 && hours < 8) { // Assumption for times like '4:30' without AM/PM are likely afternoon
        hours += 12;
    }

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}`;
};


export default function OrderFormModal({ order, onClose, onSave, empanadaFlavors, fullSizeEmpanadaFlavors, onAddNewFlavor }: OrderFormModalProps) {
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

    const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
    const [isSuggestingAddress, setIsSuggestingAddress] = useState(false);
    const [addressError, setAddressError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

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
        setAddressSuggestions([]);
        setAddressError(null);
    };

    useEffect(() => {
        if (order) {
            setCustomerName(order.customerName);
            setPhoneNumber(order.phoneNumber || '');
            const dateParts = order.pickupDate.split('/');
            // Format to YYYY-MM-DD for input type=date
            const formattedDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
            setPickupDate(formattedDate);
            setPickupTime(formatTimeToHHMM(order.pickupTime));
            
            const isStandardMethod = Object.values(ContactMethod).includes(order.contactMethod as ContactMethod);
            if (isStandardMethod) {
                setContactMethod(order.contactMethod);
                setCustomContactMethod('');
            } else {
                setContactMethod('Other');
                setCustomContactMethod(order.contactMethod);
            }

            setDeliveryRequired(order.deliveryRequired);
            setDeliveryFee(order.deliveryFee);
            setDeliveryAddress(order.deliveryAddress || '');

            const isSalsa = (name: string) => name.includes('Salsa Verde') || name.includes('Salsa Rosada');
            setMiniItems(order.items.filter(i => !i.name.startsWith('Full ') && !isSalsa(i.name)));
            setFullSizeItems(order.items.filter(i => i.name.startsWith('Full ')));

            setPaymentStatus(order.paymentStatus);
            setAmountCollected(order.amountCollected || 0);
            setPaymentMethod(order.paymentMethod || '');
            setSpecialInstructions(order.specialInstructions || '');

            // Populate salsa items from order
            const initialSalsaState: SalsaState[] = [
                { name: 'Salsa Verde', checked: false, quantity: 1, size: 'Small (4oz)' },
                { name: 'Salsa Rosada', checked: false, quantity: 1, size: 'Small (4oz)' }
            ];
            
            const salsaVerdeItem = order.items.find(i => i.name.includes('Salsa Verde'));
            if (salsaVerdeItem) {
                initialSalsaState[0].checked = true;
                initialSalsaState[0].quantity = salsaVerdeItem.quantity;
                initialSalsaState[0].size = salsaVerdeItem.name.includes('Large') ? 'Large (8oz)' : 'Small (4oz)';
            }
            
            const salsaRosadaItem = order.items.find(i => i.name.includes('Salsa Rosada'));
            if (salsaRosadaItem) {
                initialSalsaState[1].checked = true;
                initialSalsaState[1].quantity = salsaRosadaItem.quantity;
                initialSalsaState[1].size = salsaRosadaItem.name.includes('Large') ? 'Large (8oz)' : 'Small (4oz)';
            }
            setSalsaItems(initialSalsaState);

        } else {
            resetForm();
        }
    }, [order]);

     useEffect(() => {
        if (deliveryRequired) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (error: GeolocationPositionError) => {
                    let warningMessage = "Could not get user location for address suggestions: ";
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            warningMessage += "User denied the request for Geolocation.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            warningMessage += "Location information is unavailable.";
                            break;
                        case error.TIMEOUT:
                            warningMessage += "The request to get user location timed out.";
                            break;
                        default:
                            warningMessage += "An unknown error occurred.";
                            break;
                    }
                    console.warn(warningMessage, error.message);
                    setUserLocation(null);
                }
            );
        }
    }, [deliveryRequired]);

    useEffect(() => {
        if (!deliveryRequired) {
            setAddressSuggestions([]);
            return;
        }

        const handler = setTimeout(async () => {
            if (deliveryAddress.length > 3) {
                setIsSuggestingAddress(true);
                setAddressError(null);
                try {
                    const suggestions = await getAddressSuggestions(deliveryAddress, userLocation);
                    setAddressSuggestions(suggestions);
                } catch (e) {
                    setAddressError("Could not fetch address suggestions.");
                } finally {
                    setIsSuggestingAddress(false);
                }
            } else {
                setAddressSuggestions([]);
            }
        }, 500); // 500ms debounce

        return () => {
            clearTimeout(handler);
        };
    }, [deliveryAddress, deliveryRequired, userLocation]);

    useEffect(() => {
        const miniTotal = miniItems.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * MINI_EMPANADA_PRICE), 0);
        const fullSizeTotal = fullSizeItems.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * FULL_SIZE_EMPANADA_PRICE), 0);
        const salsaTotal = salsaItems.reduce((sum, item) => {
            if (item.checked) {
                return sum + ((Number(item.quantity) || 0) * SALSA_PRICES[item.size]);
            }
            return sum;
        }, 0);
        const total = miniTotal + fullSizeTotal + salsaTotal + (deliveryRequired ? (Number(deliveryFee) || 0) : 0);
        setAmountCharged(total);
    }, [miniItems, fullSizeItems, deliveryFee, deliveryRequired, salsaItems]);

    useEffect(() => {
        if ((Number(amountCollected) || 0) >= amountCharged && amountCharged > 0) {
            setPaymentStatus(PaymentStatus.PAID);
        } else {
            if (pickupDate) {
                // Compare date part only, ignoring time and timezone.
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                // pickupDate is 'YYYY-MM-DD', create date object as local time to avoid timezone issues.
                const pickup = new Date(pickupDate + 'T00:00:00');
                
                if (pickup < today) {
                    setPaymentStatus(PaymentStatus.OVERDUE);
                } else {
                    setPaymentStatus(PaymentStatus.PENDING);
                }
            } else {
                setPaymentStatus(PaymentStatus.PENDING);
            }
        }
    }, [amountCollected, amountCharged, pickupDate]);
    
    const handleItemChange = (
        type: 'mini' | 'full',
        index: number, 
        field: keyof FormOrderItem, 
        value: string | number
    ) => {
        const items = type === 'mini' ? miniItems : fullSizeItems;
        const updatedItems = items.map((item, i) => {
            if (i === index) {
                const updatedItem = { ...item };
                if (field === 'quantity') {
                    const strValue = String(value);
                    if (/^\d*$/.test(strValue)) { // Allow only digits or empty string
                        updatedItem.quantity = strValue;
                    }
                } else if (field === 'customName') {
                    updatedItem.customName = value as string;
                } else {
                    updatedItem.name = value as string;
                    if (updatedItem.name !== 'Other' && updatedItem.name !== 'Full Other') {
                        delete updatedItem.customName;
                    }
                }
                return updatedItem;
            }
            return item;
        });

        if (type === 'mini') {
            setMiniItems(updatedItems);
        } else {
            setFullSizeItems(updatedItems);
        }
    };

    const addItem = (type: 'mini' | 'full') => {
        const newItem: FormOrderItem = type === 'mini' 
            ? { name: empanadaFlavors[0], quantity: 1 } 
            : { name: fullSizeEmpanadaFlavors[0], quantity: 1 };
        if (type === 'mini') setMiniItems([...miniItems, newItem]);
        else setFullSizeItems([...fullSizeItems, newItem]);
    };

    const removeItem = (type: 'mini' | 'full', index: number) => {
        if (type === 'mini') setMiniItems(miniItems.filter((_, i) => i !== index));
        else setFullSizeItems(fullSizeItems.filter((_, i) => i !== index));
    };

    const handleSalsaChange = (index: number, field: keyof SalsaState, value: string | number | boolean) => {
        const newSalsaItems = [...salsaItems];
        const itemToUpdate = { ...newSalsaItems[index] };
        
        if (field === 'checked') {
            itemToUpdate.checked = value as boolean;
        } else if (field === 'quantity') {
            const strValue = String(value);
            if (/^\d*$/.test(strValue)) {
               itemToUpdate.quantity = strValue;
            }
        } else if (field === 'size') {
            itemToUpdate.size = value as SalsaSize;
        }
        
        newSalsaItems[index] = itemToUpdate;
        setSalsaItems(newSalsaItems);
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
                return {
                    name: finalName,
                    quantity: Number(item.quantity) || 0
                };
            }).filter(item => item.quantity > 0);
        };
        
        const miniOrderItems = processItems(miniItems, 'mini');
        const fullSizeOrderItems = processItems(fullSizeItems, 'full');
        const empanadaItems: OrderItem[] = [...miniOrderItems, ...fullSizeOrderItems];

        const salsaOrderItems: OrderItem[] = salsaItems
            .filter(salsa => salsa.checked && (Number(salsa.quantity) || 0) > 0)
            .map(salsa => ({
                name: `${salsa.name} - ${salsa.size}`,
                quantity: Number(salsa.quantity) || 0
            }));

        const allItems = [...empanadaItems, ...salsaOrderItems];
        
        const totalFullSize = fullSizeOrderItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        const totalMini = miniOrderItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

        // Format date back to MM/DD/YYYY
        const dateParts = pickupDate.split('-');
        const formattedDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;

        const finalContactMethod = contactMethod === 'Other' ? (customContactMethod.trim() || 'Other') : contactMethod;

        const orderData = {
            customerName,
            phoneNumber,
            pickupDate: formattedDate,
            pickupTime,
            contactMethod: finalContactMethod,
            items: allItems,
            amountCharged,
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
        };

        if (order) {
            onSave({ ...order, ...orderData });
        } else {
            onSave(orderData);
        }
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
                                <input
                                    type="text"
                                    value={customContactMethod}
                                    onChange={e => setCustomContactMethod(e.target.value)}
                                    placeholder="Enter contact source"
                                    className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown"
                                    required
                                />
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
                            <input 
                                type="number" 
                                step="0.01" 
                                min="0"
                                value={amountCollected} 
                                onChange={e => setAmountCollected(e.target.value)} 
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown"
                            />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-brand-brown/90">Payment Method</label>
                           <input
                               type="text"
                               value={paymentMethod}
                               onChange={e => setPaymentMethod(e.target.value)}
                               placeholder="e.g., Cash, Zelle, Venmo"
                               className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown"
                           />
                        </div>
                         <div>
                           <label className="block text-sm font-medium text-brand-brown/90">Payment Status</label>
                            <input
                                type="text"
                                value={paymentStatus}
                                readOnly
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-gray-100 text-brand-brown/70"
                            />
                        </div>
                    </div>
                    
                    <div className="border-t border-brand-tan pt-4">
                         <div className="flex items-center">
                            <input type="checkbox" id="delivery" checked={deliveryRequired} onChange={e => setDeliveryRequired(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-orange focus:ring-brand-orange" />
                            <label htmlFor="delivery" className="ml-2 block text-sm font-medium text-brand-brown">Delivery Required?</label>
                        </div>
                        {deliveryRequired && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4 animate-fade-in">
                                <div className="md:col-span-2 relative">
                                    <label className="block text-sm font-medium text-brand-brown/90">Delivery Address</label>
                                    <input 
                                        type="text" 
                                        value={deliveryAddress} 
                                        onChange={e => setDeliveryAddress(e.target.value)} 
                                        required={deliveryRequired} 
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" 
                                        autoComplete="off"
                                    />
                                     {isSuggestingAddress && (
                                        <div className="absolute right-3 top-8 animate-spin rounded-full h-5 w-5 border-b-2 border-brand-orange"></div>
                                    )}
                                    {addressSuggestions.length > 0 && (
                                        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-40 overflow-y-auto">
                                            {addressSuggestions.map((suggestion, index) => (
                                                <li 
                                                    key={index}
                                                    className="px-3 py-2 cursor-pointer hover:bg-brand-tan/60"
                                                    onClick={() => {
                                                        setDeliveryAddress(suggestion);
                                                        setAddressSuggestions([]);
                                                    }}
                                                    role="option"
                                                >
                                                    {suggestion}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {addressError && <p className="text-sm text-red-500 mt-1">{addressError}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-brown/90">Delivery Fee ($)</label>
                                    <input type="number" step="1" min="0" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} required={deliveryRequired} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" />
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
                        />
                         <ItemInputSection 
                            title="Full-Size Empanadas"
                            items={fullSizeItems}
                            flavors={fullSizeEmpanadaFlavors}
                            onItemChange={(index, field, value) => handleItemChange('full', index, field, value)}
                            onAddItem={() => addItem('full')}
                            onRemoveItem={(index) => removeItem('full', index)}
                            itemType="full"
                        />
                    </div>

                    <div className="border-t border-brand-tan pt-4">
                        <h3 className="text-lg font-semibold text-brand-brown/90 mb-3">Salsas</h3>
                        <div className="space-y-4">
                            {salsaItems.map((salsa, index) => (
                                <div key={salsa.name} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <div className="flex items-center">
                                        <input 
                                            type="checkbox" 
                                            id={`salsa-${index}`} 
                                            checked={salsa.checked} 
                                            onChange={e => handleSalsaChange(index, 'checked', e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-brand-orange focus:ring-brand-orange" 
                                        />
                                        <label htmlFor={`salsa-${index}`} className="font-medium text-brand-brown w-32 ml-2">{salsa.name}</label>
                                    </div>
                                    {salsa.checked && (
                                        <div className="flex items-center gap-2 animate-fade-in flex-grow sm:flex-grow-0">
                                            <label htmlFor={`salsa-qty-${index}`} className="text-sm">Qty:</label>
                                            <input 
                                                type="number" 
                                                id={`salsa-qty-${index}`}
                                                min="1" 
                                                value={salsa.quantity} 
                                                onChange={e => handleSalsaChange(index, 'quantity', e.target.value)}
                                                className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm bg-white text-brand-brown"
                                            />
                                            <select 
                                                value={salsa.size} 
                                                onChange={e => handleSalsaChange(index, 'size', e.target.value)}
                                                className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm bg-white text-brand-brown"
                                            >
                                                <option value="Small (4oz)">Small (4oz)</option>
                                                <option value="Large (8oz)">Large (8oz)</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="border-t border-brand-tan pt-4">
                        <label htmlFor="special-instructions" className="block text-sm font-medium text-brand-brown/90">Special Instructions</label>
                        <textarea
                            id="special-instructions"
                            value={specialInstructions}
                            onChange={e => setSpecialInstructions(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown"
                            placeholder="e.g., allergies, packaging requests, etc."
                        />
                    </div>

                    <footer className="pt-6 flex justify-end gap-3 border-t border-brand-tan">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                        <button type="submit" className="bg-brand-orange text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-opacity-90 transition-all">{order ? 'Save Changes' : 'Add Order'}</button>
                    </footer>
                </form>
            </div>
        </div>
    );
}