
import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderItem, ContactMethod, PaymentStatus, FollowUpStatus, ApprovalStatus, PricingSettings, Flavor, MenuPackage } from '../types';
import { TrashIcon, PlusIcon, XMarkIcon, ShoppingBagIcon, CogIcon, ArrowUturnLeftIcon, ClockIcon, UserIcon } from './icons/Icons';
import { getAddressSuggestions } from '../services/geminiService';
import { calculateOrderTotal, calculateSupplyCost } from '../utils/pricingUtils';
import { SalsaSize } from '../config';
import PackageBuilderModal from './PackageBuilderModal';
import { AppSettings } from '../services/dbService';
import { generateTimeSlots, normalizeDateStr, parseOrderDateTime } from '../utils/dateUtils';

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
    existingOrders?: Order[]; // Needed for smart slot calc
}

// ... (Rest of the file imports and interfaces unchanged) ...
// Local state type to allow empty string for quantity and other number inputs
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
    // ... (ItemInputSection logic unchanged) ...
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
                         {/* Overlay to close menu when clicking outside */}
                         {isPackageMenuOpen && <div className="fixed inset-0 z-10" onClick={() => setIsPackageMenuOpen(false)}></div>}
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

// ... (Helper formatters, getLocalTodayDate unchanged) ...
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
    // ... (State definitions unchanged) ...
    const [customerName, setCustomerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pickupDate, setPickupDate] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    const [contactMethod, setContactMethod] = useState<string>(ContactMethod.UNKNOWN);
    const [customContactMethod, setCustomContactMethod] = useState('');
    const [miniItems, setMiniItems] = useState<FormOrderItem[]>([]);
    const [fullSizeItems, setFullSizeItems] = useState<FormOrderItem[]>([]);
    const [specialItems, setSpecialItems] = useState<FormOrderItem[]>([]);
    const [salsaItems, setSalsaItems] = useState<DynamicSalsaState[]>([]);
    
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
    const [isSuggestingAddress, setIsSuggestingAddress] = useState(false);
    const [addressError, setAddressError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

    const [showTimePicker, setShowTimePicker] = useState(false);
    
    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
    const [filteredCustomers, setFilteredCustomers] = useState<{name: string, phone: string | null, method: string, address: string | null}[]>([]);

    const [activePackageBuilder, setActivePackageBuilder] = useState<MenuPackage | null>(null);

    const standardFlavors = empanadaFlavors;
    const specialFlavors = empanadaFlavors.filter(f => f.isSpecial);
    
    const salsaFlavors: Flavor[] = useMemo(() => 
        (pricing.salsas || [])
            .filter(s => s.visible)
            .map(s => ({ name: s.name, visible: true, description: 'Dipping Sauce', price: s.price })),
        [pricing.salsas]
    );

    // ... (Rest of component logic unchanged up to handleSubmit) ...
    const uniqueCustomers = useMemo(() => {
        const customers = new Map<string, {name: string, phone: string | null, method: string, address: string | null}>();
        existingOrders.forEach(o => {
            if (o.customerName && !customers.has(o.customerName.toLowerCase())) {
                customers.set(o.customerName.toLowerCase(), {
                    name: o.customerName,
                    phone: o.phoneNumber,
                    method: o.contactMethod,
                    address: o.deliveryAddress
                });
            }
        });
        return Array.from(customers.values());
    }, [existingOrders]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCustomerName(val);
        if (val.length > 1) {
            const matches = uniqueCustomers.filter(c => c.name.toLowerCase().includes(val.toLowerCase()));
            setFilteredCustomers(matches.slice(0, 5)); 
            setShowCustomerSuggestions(matches.length > 0);
        } else {
            setShowCustomerSuggestions(false);
        }
    };

    const selectCustomer = (customer: {name: string, phone: string | null, method: string, address: string | null}) => {
        setCustomerName(customer.name);
        if (customer.phone) setPhoneNumber(customer.phone);
        if (Object.values(ContactMethod).includes(customer.method as ContactMethod)) {
            setContactMethod(customer.method);
            setCustomContactMethod('');
        } else {
            setContactMethod('Other');
            setCustomContactMethod(customer.method);
        }
        if (customer.address) {
            setDeliveryAddress(customer.address);
            setDeliveryRequired(true);
        }
        setShowCustomerSuggestions(false);
    };

    const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhoneNumber(formatted);
    };

    useEffect(() => {
        if (!pricing.salsas) return;
        if (!order && salsaItems.length === 0) {
            const initialSalsas = pricing.salsas.map(s => ({
                id: s.id,
                name: s.name,
                checked: false,
                quantity: 1
            }));
            setSalsaItems(initialSalsas);
        }
    }, [pricing.salsas]);

    const availableTimeSlots = useMemo(() => {
        if (!pickupDate || !settings.scheduling || !settings.scheduling.enabled) return [];
        const normalizedDate = normalizeDateStr(pickupDate);
        const override = settings.scheduling.dateOverrides?.[normalizedDate];
        const start = override?.customHours?.start || settings.scheduling.startTime;
        const end = override?.customHours?.end || settings.scheduling.endTime;
        const slots = generateTimeSlots(normalizedDate, start, end, settings.scheduling.intervalMinutes);
        const busySlots = existingOrders.map(o => ({
            date: normalizeDateStr(o.pickupDate),
            time: o.pickupTime
        }));
        const todaysBusyTimes = new Set(busySlots.filter(slot => slot.date === normalizedDate).map(slot => slot.time));
        return slots.filter(time => !todaysBusyTimes.has(time));
    }, [pickupDate, settings.scheduling, existingOrders]);

    const resetForm = () => {
        setCustomerName('');
        setPhoneNumber('');
        setPickupDate('');
        setPickupTime('');
        setContactMethod(ContactMethod.UNKNOWN);
        setCustomContactMethod('');
        setMiniItems([]);
        setFullSizeItems([]);
        setSpecialItems([]);
        setAmountCharged(0);
        setIsAutoPrice(true);
        setDeliveryRequired(false);
        setDeliveryFee(0);
        setDeliveryAddress('');
        setPaymentStatus(PaymentStatus.PENDING);
        setAmountCollected(0);
        setPaymentMethod('');
        setSalsaItems((pricing.salsas || []).map(s => ({ id: s.id, name: s.name, checked: false, quantity: 1 })));
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
        const isSalsa = (name: string) => (pricing.salsas || []).some(s => name === s.name || name.includes(s.name));
        const isSpecial = (name: string) => { const cleanName = name.replace('Full ', ''); return specialFlavors.some(f => f.name === cleanName); };
        
        const pMiniItems = items.filter(i => !i.name.startsWith('Full ') && !isSalsa(i.name) && !isSpecial(i.name));
        const pFullItems = items.filter(i => i.name.startsWith('Full ') && !isSalsa(i.name) && !isSpecial(i.name)).map(i => ({ ...i, name: i.name.replace('Full ', '') }));
        const pSpecialItems = items.filter(i => !isSalsa(i.name) && isSpecial(i.name));

        setMiniItems(pMiniItems);
        setFullSizeItems(pFullItems);
        setSpecialItems(pSpecialItems);
        setPaymentStatus((data as Order).paymentStatus || PaymentStatus.PENDING);
        setAmountCollected(data.amountCollected || 0);
        setPaymentMethod(data.paymentMethod || '');
        setSpecialInstructions(data.specialInstructions || '');

        const currentSalsas = (pricing.salsas || []).map(product => {
            const foundItem = items.find(i => i.name === product.name || i.name.includes(product.name));
            return { id: product.id, name: product.name, checked: !!foundItem, quantity: foundItem ? foundItem.quantity : 1 };
        });
        setSalsaItems(currentSalsas);

        if (data.amountCharged !== undefined) {
            setAmountCharged(data.amountCharged);
            const expected = calculateOrderTotal(items, data.deliveryFee || 0, pricing, empanadaFlavors, fullSizeEmpanadaFlavors);
            if (Math.abs(expected - data.amountCharged) > 0.01) setIsAutoPrice(false);
            else setIsAutoPrice(true);
        } else setIsAutoPrice(true);
        
        setInitialLoadComplete(true);
    };

    useEffect(() => {
        if (order) populateForm(order);
        else { resetForm(); setInitialLoadComplete(true); }
    }, [order]);

     useEffect(() => {
        if (deliveryRequired) {
            navigator.geolocation.getCurrentPosition(
                (p) => setUserLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
                (e) => console.warn("Geolocation error", e.message)
            );
        }
    }, [deliveryRequired]);

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
        if (isDirty && isAutoPrice) {
             const currentItems: OrderItem[] = [
                ...miniItems.map(i => ({ name: i.name, quantity: Number(i.quantity) || 0 })),
                ...fullSizeItems.map(i => ({ name: `Full ${i.name}`, quantity: Number(i.quantity) || 0 })),
                ...specialItems.map(i => ({ name: i.name, quantity: Number(i.quantity) || 0 })),
                ...salsaItems.filter(s => s.checked).map(s => ({ name: s.name, quantity: Number(s.quantity) || 0 }))
            ];
            const currentFee = deliveryRequired ? (Number(deliveryFee) || 0) : 0;
            const newTotal = calculateOrderTotal(currentItems, currentFee, pricing, empanadaFlavors, fullSizeEmpanadaFlavors);
            setAmountCharged(newTotal);
        }
    }, [miniItems, fullSizeItems, specialItems, salsaItems, deliveryFee, deliveryRequired, pricing, isDirty, isAutoPrice, empanadaFlavors, fullSizeEmpanadaFlavors]);

    const markDirty = () => setIsDirty(true);

    useEffect(() => {
        const charged = Number(amountCharged) || 0;
        const collected = Number(amountCollected) || 0;
        if (collected >= charged && charged > 0) setPaymentStatus(PaymentStatus.PAID);
        else if (pickupDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const pickup = new Date(pickupDate + 'T00:00:00');
            setPaymentStatus(pickup < today ? PaymentStatus.OVERDUE : PaymentStatus.PENDING);
        } else setPaymentStatus(PaymentStatus.PENDING);
    }, [amountCollected, amountCharged, pickupDate]);
    
    const handleItemChange = (type: 'mini' | 'full' | 'special', index: number, field: keyof FormOrderItem, value: string | number) => {
        markDirty();
        let items: FormOrderItem[];
        let updateFn: (i: FormOrderItem[]) => void;
        if (type === 'mini') { items = miniItems; updateFn = setMiniItems; }
        else if (type === 'full') { items = fullSizeItems; updateFn = setFullSizeItems; }
        else { items = specialItems; updateFn = setSpecialItems; }
        const updatedItems = items.map((item, i) => {
            if (i === index) {
                const updatedItem = { ...item };
                if (field === 'quantity') {
                    const strValue = String(value);
                    if (/^\d*$/.test(strValue)) updatedItem.quantity = strValue;
                } else if (field === 'customName') { updatedItem.customName = value as string; } 
                else { updatedItem.name = value as string; if (updatedItem.name !== 'Other' && updatedItem.name !== 'Full Other') delete updatedItem.customName; }
                return updatedItem;
            }
            return item;
        });
        updateFn(updatedItems);
    };

    const addItem = (type: 'mini' | 'full' | 'special') => {
        markDirty();
        let firstFlavor = 'Other';
        if (type === 'mini') firstFlavor = standardFlavors[0]?.name || 'Other';
        else if (type === 'full') firstFlavor = standardFlavors[0]?.name || 'Other'; 
        else firstFlavor = specialFlavors[0]?.name || 'Other';
        const newItem: FormOrderItem = { name: firstFlavor, quantity: 1 };
        if (type === 'mini') setMiniItems([...miniItems, newItem]);
        else if (type === 'full') setFullSizeItems([...fullSizeItems, newItem]);
        else setSpecialItems([...specialItems, newItem]);
    };

    const removeItem = (type: 'mini' | 'full' | 'special', index: number) => {
        markDirty();
        if (type === 'mini') setMiniItems(miniItems.filter((_, i) => i !== index));
        else if (type === 'full') setFullSizeItems(fullSizeItems.filter((_, i) => i !== index));
        else setSpecialItems(specialItems.filter((_, i) => i !== index));
    };

    const handleSalsaChange = (index: number, field: keyof DynamicSalsaState, value: string | number | boolean) => {
        markDirty();
        const newSalsaItems = [...salsaItems];
        const itemToUpdate = { ...newSalsaItems[index] };
        if (field === 'checked') itemToUpdate.checked = value as boolean;
        else if (field === 'quantity') {
            const strValue = String(value);
            if (/^\d*$/.test(strValue)) itemToUpdate.quantity = strValue;
        }
        newSalsaItems[index] = itemToUpdate;
        setSalsaItems(newSalsaItems);
    };

    const handleDeleteClick = () => {
        if (onDelete && order && window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
            onDelete(order.id);
            onClose();
        }
    };

    const handlePackageConfirm = (items: { name: string; quantity: number }[]) => {
        markDirty();
        if (!activePackageBuilder) return;
        const type = activePackageBuilder.itemType;
        const isSpecial = activePackageBuilder.isSpecial;
        const formItems: FormOrderItem[] = items.map(i => ({ name: i.name, quantity: i.quantity }));
        let currentItems: FormOrderItem[];
        let updateFn: (i: FormOrderItem[]) => void;
        if (isSpecial) { currentItems = specialItems; updateFn = setSpecialItems; } 
        else if (type === 'mini') { currentItems = miniItems; updateFn = setMiniItems; } 
        else { currentItems = fullSizeItems; updateFn = setFullSizeItems; }
        const combinedItems = [...currentItems];
        formItems.forEach(newItem => {
            const existingIndex = combinedItems.findIndex(existing => existing.name === newItem.name);
            if (existingIndex >= 0) {
                const existingQty = Number(combinedItems[existingIndex].quantity) || 0;
                combinedItems[existingIndex].quantity = existingQty + Number(newItem.quantity);
            } else { combinedItems.push(newItem); }
        });
        updateFn(combinedItems);
        setActivePackageBuilder(null);
    };
    
    const toggleAutoPrice = () => { if (!isAutoPrice) { markDirty(); setIsAutoPrice(true); } else setIsAutoPrice(false); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const processItems = (items: FormOrderItem[], type: 'mini' | 'full' | 'special'): OrderItem[] => {
            return items.map(item => {
                let finalName = item.name;
                if ((item.name === 'Other' || item.name === 'Full Other') && item.customName?.trim()) {
                    const customName = item.customName.trim();
                    onAddNewFlavor(customName, type === 'full' ? 'full' : 'mini'); 
                    finalName = customName;
                }
                const isSalsa = pricing.salsas.some(s => s.name === item.name);
                if (type === 'full' && !finalName.startsWith('Full ') && !isSalsa) {
                    finalName = `Full ${finalName}`;
                }
                return { name: finalName, quantity: Number(item.quantity) || 0 };
            }).filter(item => item.quantity > 0);
        };
        
        const miniOrderItems = processItems(miniItems, 'mini');
        const fullSizeOrderItems = processItems(fullSizeItems, 'full');
        const specialOrderItems = processItems(specialItems, 'special');
        
        const empanadaItems: OrderItem[] = [...miniOrderItems, ...fullSizeOrderItems, ...specialOrderItems];
        const salsaOrderItems: OrderItem[] = salsaItems
            .filter(salsa => salsa.checked && (Number(salsa.quantity) || 0) > 0)
            .map(salsa => ({ name: salsa.name, quantity: Number(salsa.quantity) || 0 }));

        const allItems = [...empanadaItems, ...salsaOrderItems];
        const finalTotalFull = allItems.filter(i => i.name.startsWith('Full ')).reduce((s, i) => s + i.quantity, 0);
        const finalTotalMini = allItems.filter(i => !i.name.startsWith('Full ') && !pricing.salsas.some(s => i.name.includes(s.name))).reduce((s, i) => s + i.quantity, 0);
        const formattedDate = pickupDate ? `${pickupDate.split('-')[1]}-${pickupDate.split('-')[2]}-${pickupDate.split('-')[0]}` : '';

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
        
        // Calculate and Snapshot Supply Cost using the specific Pickup Date
        // This ensures the cost is based on historical ingredient prices at that time.
        const orderDateObj = pickupDate ? new Date(`${pickupDate}T00:00:00`) : new Date();
        const snapshotCost = calculateSupplyCost(allItems, settings, orderDateObj);

        const orderData = {
            customerName,
            phoneNumber,
            pickupDate: formattedDate,
            pickupTime: formattedTime,
            contactMethod: finalContactMethod,
            items: allItems,
            amountCharged: Number(amountCharged),
            totalCost: snapshotCost, // Save cost snapshot
            totalFullSize: finalTotalFull,
            totalMini: finalTotalMini,
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
                        <div className="md:col-span-2 relative">
                             <label className="block text-sm font-medium text-brand-brown/90">Customer Name</label>
                            <input type="text" value={customerName} onChange={handleNameChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" autoComplete="off" />
                            {showCustomerSuggestions && (
                                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md mt-1 shadow-lg max-h-40 overflow-y-auto">
                                    {filteredCustomers.map((customer, idx) => (
                                        <button 
                                            key={idx}
                                            type="button"
                                            onClick={() => selectCustomer(customer)}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-brand-tan/30 flex justify-between items-center"
                                        >
                                            <span className="font-medium">{customer.name}</span>
                                            <div className="text-right">
                                                <span className="text-xs text-gray-500 block">{customer.phone || 'No Phone'}</span>
                                                {customer.address && <span className="text-[10px] text-green-600 block truncate max-w-[120px]">📍 {customer.address}</span>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* ... (Rest of form fields unchanged) ... */}
                        <div>
                            <label className="block text-sm font-medium text-brand-brown/90">Phone Number</label>
                            <input type="tel" value={phoneNumber} onChange={handlePhoneNumberChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" />
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
                            <div className="flex gap-2">
                                <input type="date" value={pickupDate} onChange={e => { setPickupDate(e.target.value); setPickupTime(''); }} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown appearance-none" style={{ colorScheme: 'light' }} />
                                <button type="button" onClick={() => { setPickupDate(getLocalTodayDate()); setPickupTime(''); }} className="mt-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-semibold text-gray-600 border border-gray-300">Today</button>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-brand-brown/90">Pickup Time</label>
                            <div className="relative flex gap-2 mt-1">
                                <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} required className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" />
                                {settings.scheduling?.enabled && (
                                    <div className="relative">
                                        <button type="button" disabled={!pickupDate} onClick={() => setShowTimePicker(!showTimePicker)} className="h-full px-3 bg-brand-tan/50 hover:bg-brand-orange hover:text-white text-brand-brown rounded-md text-xs font-semibold border border-brand-tan whitespace-nowrap disabled:opacity-50 flex items-center gap-1"><ClockIcon className="w-4 h-4" /> Select Slot</button>
                                        {showTimePicker && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setShowTimePicker(false)}></div>
                                                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 shadow-lg rounded-md w-48 max-h-60 overflow-y-auto z-20">
                                                    {availableTimeSlots.length > 0 ? ( availableTimeSlots.map(slot => ( <button key={slot} type="button" onClick={() => { const [time, modifier] = slot.split(' '); let [hours, minutes] = time.split(':'); if (hours === '12') hours = '00'; if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12); setPickupTime(`${hours.padStart(2, '0')}:${minutes}`); setShowTimePicker(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-gray-700" > {slot} </button> )) ) : ( <div className="p-3 text-xs text-gray-500 text-center">No slots available for this date.</div> )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                         <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-brand-brown/90">Amount Charged ($)</label>
                                <button type="button" onClick={toggleAutoPrice} className={`text-xs font-medium px-2 py-0.5 rounded transition-colors border ${isAutoPrice ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`} title={isAutoPrice ? "Calculated automatically. Click to switch to manual." : "Manual price set. Click to auto-calculate."}> {isAutoPrice ? "Auto-Calc ON" : "Manual Price"} </button>
                            </div>
                            <div className="relative">
                                <input type="number" step="0.01" value={amountCharged === 0 ? '' : amountCharged} onChange={(e) => { setAmountCharged(e.target.value); setIsAutoPrice(false); }} className={`mt-1 block w-full rounded-md shadow-sm focus:border-brand-orange focus:ring-brand-orange ${isAutoPrice ? 'bg-gray-50 text-brand-brown/70 border-gray-300' : 'bg-white text-brand-brown border-brand-orange ring-1 ring-brand-orange/20'}`} />
                                {!isAutoPrice && ( <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={toggleAutoPrice} title="Revert to Auto-Calculation" > <ArrowUturnLeftIcon className="h-4 w-4 text-gray-400 hover:text-brand-orange" /> </div> )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-brown/90">Amount Collected ($)</label>
                            <input type="number" step="0.01" min="0" value={amountCollected === 0 ? '' : amountCollected} onChange={e => setAmountCollected(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" />
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
                                    <input type="number" step="1" min="0" value={deliveryFee === 0 ? '' : deliveryFee} onChange={e => {setDeliveryFee(e.target.value); markDirty();}} required={deliveryRequired} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6 border-t border-brand-tan pt-6">
                        <ItemInputSection 
                            title="Mini Empanadas"
                            items={miniItems}
                            flavors={standardFlavors}
                            onItemChange={(index, field, value) => handleItemChange('mini', index, field, value)}
                            onAddItem={() => addItem('mini')}
                            onRemoveItem={(index) => removeItem('mini', index)}
                            itemType="mini"
                            availablePackages={pricing.packages?.filter(p => p.itemType === 'mini' && !p.isSpecial)}
                            onAddPackage={setActivePackageBuilder}
                        />
                        <ItemInputSection 
                            title="Full-Size Empanadas"
                            items={fullSizeItems}
                            flavors={standardFlavors}
                            onItemChange={(index, field, value) => handleItemChange('full', index, field, value)}
                            onAddItem={() => addItem('full')}
                            onRemoveItem={(index) => removeItem('full', index)}
                            itemType="full"
                            availablePackages={pricing.packages?.filter(p => p.itemType === 'full' && !p.isSpecial)}
                            onAddPackage={setActivePackageBuilder}
                        />
                        <ItemInputSection 
                            title="Party Platters & Specials"
                            items={specialItems}
                            flavors={empanadaFlavors}
                            onItemChange={(index, field, value) => handleItemChange('special', index, field, value)}
                            onAddItem={() => addItem('special')}
                            onRemoveItem={(index) => removeItem('special', index)}
                            itemType="mini"
                            availablePackages={pricing.packages?.filter(p => p.isSpecial)}
                            onAddPackage={setActivePackageBuilder}
                            bgColor="bg-purple-50 border-purple-200"
                        />
                    </div>

                    <div className="border-t border-brand-tan pt-4">
                        <h3 className="text-lg font-semibold text-brand-brown/90 mb-3">Salsa & Extras</h3>
                        <div className="space-y-4">
                            {(salsaItems.length > 0) ? (
                                salsaItems.map((salsa, index) => (
                                    <div key={salsa.id} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                        <div className="flex items-center">
                                            <input type="checkbox" id={`salsa-${index}`} checked={salsa.checked} onChange={e => handleSalsaChange(index, 'checked', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-orange focus:ring-brand-orange" />
                                            <label htmlFor={`salsa-${index}`} className="font-medium text-brand-brown min-w-[150px] ml-2">{salsa.name}</label>
                                        </div>
                                        {salsa.checked && (
                                            <div className="flex items-center gap-2 animate-fade-in flex-grow sm:flex-grow-0">
                                                <label htmlFor={`salsa-qty-${index}`} className="text-sm">Qty:</label>
                                                <input type="number" id={`salsa-qty-${index}`} min="1" value={salsa.quantity === 0 ? '' : salsa.quantity} onChange={e => handleSalsaChange(index, 'quantity', e.target.value)} className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm bg-white text-brand-brown" />
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : ( <p className="text-sm text-gray-500 italic">No salsas available.</p> )}
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
                
                {activePackageBuilder && (
                    <PackageBuilderModal pkg={activePackageBuilder} standardFlavors={empanadaFlavors.filter(f => !f.isSpecial)} specialFlavors={empanadaFlavors.filter(f => f.isSpecial)} salsas={salsaFlavors} onClose={() => setActivePackageBuilder(null)} onConfirm={handlePackageConfirm} />
                )}
            </div>
        </div>
    );
}
