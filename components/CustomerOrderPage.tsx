
import React, { useState, useEffect } from 'react';
import { saveOrderToDb } from '../services/dbService';
import { Order, OrderItem, ContactMethod, PaymentStatus, FollowUpStatus, ApprovalStatus, PricingSettings } from '../types';
import { calculateOrderTotal } from '../utils/pricingUtils';
import { SalsaSize } from '../config';
import { PlusIcon, TrashIcon, CheckCircleIcon } from './icons/Icons';
import Header from './Header';

interface CustomerOrderPageProps {
    empanadaFlavors: string[];
    fullSizeEmpanadaFlavors: string[];
    pricing?: PricingSettings; // Now optional to handle load state
}

interface FormOrderItem {
    name: string;
    quantity: number;
}

interface SalsaState {
    name: 'Salsa Verde' | 'Salsa Rosada';
    checked: boolean;
    quantity: number;
    size: SalsaSize;
}

export default function CustomerOrderPage({ empanadaFlavors, fullSizeEmpanadaFlavors, pricing }: CustomerOrderPageProps) {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Customer Info
    const [customerName, setCustomerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [pickupDate, setPickupDate] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    
    // Order Items
    const [miniItems, setMiniItems] = useState<FormOrderItem[]>([]);
    const [fullSizeItems, setFullSizeItems] = useState<FormOrderItem[]>([]);
    const [salsaItems, setSalsaItems] = useState<SalsaState[]>([
        { name: 'Salsa Verde', checked: false, quantity: 1, size: 'Small (4oz)' },
        { name: 'Salsa Rosada', checked: false, quantity: 1, size: 'Small (4oz)' }
    ]);

    // Delivery
    const [deliveryRequired, setDeliveryRequired] = useState(false);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    
    // Other
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [estimatedTotal, setEstimatedTotal] = useState(0);

    // Fallback pricing if not yet loaded
    const safePricing = pricing || {
        mini: { basePrice: 1.75, tiers: [] },
        full: { basePrice: 3.00, tiers: [] },
        salsaSmall: 2.00,
        salsaLarge: 4.00
    };

    // Calculate Total using utility
    useEffect(() => {
        const currentItems: any[] = [
            ...miniItems.map(i => ({ name: i.name, quantity: i.quantity })),
            ...fullSizeItems.map(i => ({ name: i.name, quantity: i.quantity })),
            ...salsaItems.filter(s => s.checked).map(s => ({ name: `${s.name} - ${s.size}`, quantity: s.quantity }))
        ];
        
        const total = calculateOrderTotal(currentItems, 0, safePricing); // 0 Delivery fee for estimation
        setEstimatedTotal(total);
    }, [miniItems, fullSizeItems, salsaItems, safePricing]);

    const handleItemChange = (type: 'mini' | 'full', index: number, field: keyof FormOrderItem, value: string | number) => {
        const items = type === 'mini' ? miniItems : fullSizeItems;
        const updatedItems = items.map((item, i) => {
            if (i === index) {
                return { ...item, [field]: value };
            }
            return item;
        });
        if (type === 'mini') setMiniItems(updatedItems);
        else setFullSizeItems(updatedItems);
    };

    const addItem = (type: 'mini' | 'full') => {
        const newItem: FormOrderItem = type === 'mini' 
            ? { name: empanadaFlavors[0], quantity: 12 }
            : { name: fullSizeEmpanadaFlavors[0], quantity: 1 };
        if (type === 'mini') setMiniItems([...miniItems, newItem]);
        else setFullSizeItems([...fullSizeItems, newItem]);
    };

    const removeItem = (type: 'mini' | 'full', index: number) => {
        if (type === 'mini') setMiniItems(miniItems.filter((_, i) => i !== index));
        else setFullSizeItems(fullSizeItems.filter((_, i) => i !== index));
    };

    const handleSalsaChange = (index: number, field: keyof SalsaState, value: any) => {
        const newSalsaItems = [...salsaItems];
        newSalsaItems[index] = { ...newSalsaItems[index], [field]: value };
        setSalsaItems(newSalsaItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const finalItems: OrderItem[] = [
                ...miniItems.map(i => ({ name: i.name, quantity: i.quantity })),
                ...fullSizeItems.map(i => ({ name: i.name, quantity: i.quantity })),
                ...salsaItems.filter(s => s.checked).map(s => ({ name: `${s.name} - ${s.size}`, quantity: s.quantity }))
            ];

            if (finalItems.length === 0) {
                throw new Error("Please add at least one item to your order.");
            }

            const formattedDate = pickupDate ? `${pickupDate.split('-')[1]}/${pickupDate.split('-')[2]}/${pickupDate.split('-')[0]}` : '';
            
            let formattedTime = '';
            if (pickupTime) {
                const [h, m] = pickupTime.split(':');
                const hour = parseInt(h);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const hour12 = hour % 12 || 12;
                formattedTime = `${hour12}:${m} ${ampm}`;
            }

            const newOrder: Order = {
                id: Date.now().toString(),
                customerName,
                phoneNumber,
                contactMethod: email ? `Website (Email: ${email})` : 'Website Form',
                pickupDate: formattedDate,
                pickupTime: formattedTime,
                items: finalItems,
                totalMini: miniItems.reduce((acc, i) => acc + i.quantity, 0),
                totalFullSize: fullSizeItems.reduce((acc, i) => acc + i.quantity, 0),
                amountCharged: estimatedTotal,
                amountCollected: 0,
                deliveryRequired,
                deliveryFee: 0,
                deliveryAddress: deliveryRequired ? deliveryAddress : null,
                paymentStatus: PaymentStatus.PENDING,
                paymentMethod: null,
                followUpStatus: FollowUpStatus.NEEDED,
                specialInstructions: specialInstructions || null,
                approvalStatus: ApprovalStatus.PENDING
            };

            await saveOrderToDb(newOrder);
            setIsSubmitted(true);
            window.scrollTo(0, 0);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-brand-cream flex flex-col">
                <Header variant="public" />
                <div className="flex-grow flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full p-8 rounded-xl shadow-lg text-center border border-brand-tan">
                        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircleIcon className="w-12 h-12 text-green-600" />
                        </div>
                        <h2 className="text-3xl font-serif text-brand-brown mb-4">Order Received!</h2>
                        <p className="text-brand-brown/80 mb-8 text-lg">
                            Thank you, {customerName}! We have received your order request. 
                            We will contact you shortly at <strong>{phoneNumber}</strong> to confirm details and arrange payment.
                        </p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="bg-brand-orange text-white font-semibold px-6 py-3 rounded-lg hover:bg-opacity-90 transition-colors"
                        >
                            Place Another Order
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-cream">
            <Header variant="public" />
            <main className="max-w-3xl mx-auto px-4 py-8">
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-serif text-brand-brown mb-3">Place Your Order</h2>
                    <p className="text-brand-brown/70 max-w-lg mx-auto">
                        Select your favorite empanadas below. We make everything fresh to order!
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-tan">
                        <h3 className="text-xl font-serif text-brand-brown mb-4 border-b border-brand-tan pb-2">1. Your Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-brand-brown/80 mb-1">Full Name</label>
                                <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" placeholder="Rose Dough" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-brown/80 mb-1">Phone Number</label>
                                <input type="tel" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" placeholder="(555) 123-4567" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-brown/80 mb-1">Email Address</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" placeholder="rose@example.com" />
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-tan">
                        <h3 className="text-xl font-serif text-brand-brown mb-4 border-b border-brand-tan pb-2">2. Choose Your Empanadas</h3>
                        
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium text-brand-brown">Mini Empanadas (${safePricing.mini.basePrice.toFixed(2)})</h4>
                                <button type="button" onClick={() => addItem('mini')} className="text-sm text-brand-orange font-semibold hover:text-brand-brown flex items-center gap-1"><PlusIcon className="w-4 h-4" /> Add Flavor</button>
                            </div>
                            <div className="space-y-3">
                                {miniItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-3 items-center bg-brand-tan/20 p-2 rounded-lg">
                                        <select value={item.name} onChange={e => handleItemChange('mini', idx, 'name', e.target.value)} className="flex-grow rounded-md border-gray-300 text-sm focus:ring-brand-orange focus:border-brand-orange">{empanadaFlavors.map(f => <option key={f} value={f}>{f}</option>)}</select>
                                        <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange('mini', idx, 'quantity', parseInt(e.target.value) || 0)} className="w-20 rounded-md border-gray-300 text-sm focus:ring-brand-orange focus:border-brand-orange" />
                                        <button type="button" onClick={() => removeItem('mini', idx)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                ))}
                                {miniItems.length === 0 && <p className="text-sm text-gray-500 italic">No mini empanadas selected.</p>}
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium text-brand-brown">Full-Size Empanadas (${safePricing.full.basePrice.toFixed(2)})</h4>
                                <button type="button" onClick={() => addItem('full')} className="text-sm text-brand-orange font-semibold hover:text-brand-brown flex items-center gap-1"><PlusIcon className="w-4 h-4" /> Add Flavor</button>
                            </div>
                            <div className="space-y-3">
                                {fullSizeItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-3 items-center bg-brand-tan/20 p-2 rounded-lg">
                                        <select value={item.name} onChange={e => handleItemChange('full', idx, 'name', e.target.value)} className="flex-grow rounded-md border-gray-300 text-sm focus:ring-brand-orange focus:border-brand-orange">{fullSizeEmpanadaFlavors.map(f => <option key={f} value={f}>{f}</option>)}</select>
                                        <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange('full', idx, 'quantity', parseInt(e.target.value) || 0)} className="w-20 rounded-md border-gray-300 text-sm focus:ring-brand-orange focus:border-brand-orange" />
                                        <button type="button" onClick={() => removeItem('full', idx)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                ))}
                                {fullSizeItems.length === 0 && <p className="text-sm text-gray-500 italic">No full-size empanadas selected.</p>}
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-brand-brown mb-2">Add Salsa?</h4>
                            <div className="space-y-2">
                                {salsaItems.map((salsa, idx) => (
                                    <div key={salsa.name} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div className="flex items-center">
                                            <input type="checkbox" checked={salsa.checked} onChange={e => handleSalsaChange(idx, 'checked', e.target.checked)} className="h-5 w-5 text-brand-orange rounded focus:ring-brand-orange border-gray-300" />
                                            <span className="ml-2 text-brand-brown font-medium">{salsa.name}</span>
                                        </div>
                                        {salsa.checked && (
                                            <div className="flex gap-2">
                                                 <select value={salsa.size} onChange={e => handleSalsaChange(idx, 'size', e.target.value)} className="rounded-md border-gray-300 text-xs focus:ring-brand-orange focus:border-brand-orange py-1">
                                                    <option value="Small (4oz)">Small (${safePricing.salsaSmall})</option>
                                                    <option value="Large (8oz)">Large (${safePricing.salsaLarge})</option>
                                                </select>
                                                <input type="number" min="1" value={salsa.quantity} onChange={e => handleSalsaChange(idx, 'quantity', parseInt(e.target.value))} className="w-16 rounded-md border-gray-300 text-xs focus:ring-brand-orange focus:border-brand-orange py-1" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-tan">
                        <h3 className="text-xl font-serif text-brand-brown mb-4 border-b border-brand-tan pb-2">3. Pickup & Delivery</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-brown/80 mb-1">Preferred Date</label>
                                <input type="date" required value={pickupDate} onChange={e => setPickupDate(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-brand-brown/80 mb-1">Preferred Time</label>
                                <input type="time" required value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" />
                            </div>
                        </div>
                        <div className="flex items-start gap-3 mb-4 p-3 bg-blue-50 rounded-lg">
                            <input type="checkbox" id="delivery" checked={deliveryRequired} onChange={e => setDeliveryRequired(e.target.checked)} className="mt-1 h-5 w-5 text-brand-orange rounded focus:ring-brand-orange border-gray-300" />
                            <div>
                                <label htmlFor="delivery" className="font-medium text-brand-brown">I need this delivered</label>
                                <p className="text-xs text-gray-500">Delivery fees apply based on location. We will confirm the fee with you.</p>
                            </div>
                        </div>
                        {deliveryRequired && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-medium text-brand-brown/80 mb-1">Delivery Address</label>
                                <input type="text" required={deliveryRequired} value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" placeholder="123 Main St, Townsville" />
                            </div>
                        )}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-brand-brown/80 mb-1">Special Instructions / Notes</label>
                            <textarea rows={3} value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" placeholder="Allergies, gate codes, or specific requests..." />
                        </div>
                    </section>

                    <div className="bg-brand-brown text-brand-cream p-6 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-center sm:text-left">
                            <p className="text-sm opacity-80">Estimated Total</p>
                            <p className="text-3xl font-bold">${estimatedTotal.toFixed(2)}*</p>
                            <p className="text-xs opacity-60">*Final total may vary with delivery fees.</p>
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-brand-orange text-white font-bold text-lg px-8 py-3 rounded-lg hover:bg-brand-orange/90 transition-all shadow-md disabled:bg-gray-500 disabled:cursor-not-allowed">
                            {isSubmitting ? 'Sending Order...' : 'Submit Order'}
                        </button>
                    </div>
                    
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            <strong className="font-bold">Error: </strong><span className="block sm:inline">{error}</span>
                        </div>
                    )}
                </form>
            </main>
        </div>
    );
}
