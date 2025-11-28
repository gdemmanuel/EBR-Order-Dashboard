
import React, { useState, useMemo, useEffect } from 'react';
import { Order, Flavor, PricingSettings, AppSettings, ContactMethod, PaymentStatus, FollowUpStatus, ApprovalStatus, OrderItem, MenuPackage } from '../types';
import { saveOrderToDb } from '../services/dbService';
import { calculateOrderTotal } from '../utils/pricingUtils';
import { generateTimeSlots, normalizeDateStr } from '../utils/dateUtils';
import { getAddressSuggestions } from '../services/geminiService';
import { 
    ShoppingBagIcon, CalendarIcon, UserIcon, PhoneIcon, CheckCircleIcon, 
    ExclamationCircleIcon, PlusIcon, MinusIcon, TrashIcon
} from './icons/Icons';
import PackageBuilderModal from './PackageBuilderModal';

interface CustomerOrderPageProps {
    empanadaFlavors: Flavor[];
    fullSizeEmpanadaFlavors: Flavor[];
    pricing?: PricingSettings;
    scheduling: AppSettings['scheduling'];
    busySlots: { date: string; time: string }[];
    motd: string;
}

// Helper for formatting currency
const formatPrice = (price: number) => `$${price.toFixed(2)}`;

export default function CustomerOrderPage({
    empanadaFlavors,
    fullSizeEmpanadaFlavors,
    pricing,
    scheduling,
    busySlots,
    motd
}: CustomerOrderPageProps) {
    // --- State ---
    const [customerName, setCustomerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState(''); // Optional for contact method
    
    const [deliveryRequired, setDeliveryRequired] = useState(false);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
    
    const [pickupDate, setPickupDate] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    
    const [specialInstructions, setSpecialInstructions] = useState('');
    
    // Cart: Key is item name (or unique ID if needed)
    const [cart, setCart] = useState<Record<string, number>>({});
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [lastOrder, setLastOrder] = useState<Order | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [activePackageBuilder, setActivePackageBuilder] = useState<MenuPackage | null>(null);
    const [activeCategory, setActiveCategory] = useState<'mini' | 'full' | 'packages'>('mini');

    // --- Derived Data ---
    
    const availableFlavors = useMemo(() => {
        return empanadaFlavors.filter(f => f.visible);
    }, [empanadaFlavors]);

    const availableFullFlavors = useMemo(() => {
        return fullSizeEmpanadaFlavors.filter(f => f.visible);
    }, [fullSizeEmpanadaFlavors]);

    const availablePackages = useMemo(() => {
        return (pricing?.packages || []).filter(p => p.visible);
    }, [pricing]);

    const availableSalsas = useMemo(() => {
        return (pricing?.salsas || []).filter(s => s.visible);
    }, [pricing]);

    // Time Slots Logic
    const timeSlots = useMemo(() => {
        if (!pickupDate || !scheduling?.enabled) return [];
        
        const dateStr = normalizeDateStr(pickupDate);
        const override = scheduling.dateOverrides?.[dateStr];
        
        if (override?.isClosed) return [];
        if (override?.isFull) return [];

        const start = override?.customHours?.start || scheduling.startTime;
        const end = override?.customHours?.end || scheduling.endTime;
        
        const allSlots = generateTimeSlots(dateStr, start, end, scheduling.intervalMinutes);
        
        // Filter out busy slots
        const busyForDate = busySlots
            .filter(s => s.date === dateStr)
            .map(s => s.time);
            
        return allSlots.filter(t => !busyForDate.includes(t));
    }, [pickupDate, scheduling, busySlots]);

    // Totals Calculation
    const { finalItems, totalMini, totalFull, estimatedTotal } = useMemo(() => {
        const items: OrderItem[] = Object.entries(cart).map(([name, quantity]) => ({ name, quantity }));
        
        if (!pricing) return { finalItems: [], totalMini: 0, totalFull: 0, estimatedTotal: 0 };

        const total = calculateOrderTotal(
            items, 
            0, // Delivery fee is TBD/calculated by admin usually
            pricing,
            empanadaFlavors,
            fullSizeEmpanadaFlavors
        );

        const miniCount = items.filter(i => !i.name.startsWith('Full ') && !pricing.salsas?.some(s => s.name === i.name)).reduce((sum, i) => sum + i.quantity, 0);
        const fullCount = items.filter(i => i.name.startsWith('Full ')).reduce((sum, i) => sum + i.quantity, 0);

        return { finalItems: items, totalMini: miniCount, totalFull: fullCount, estimatedTotal: total };
    }, [cart, pricing, empanadaFlavors, fullSizeEmpanadaFlavors]);

    // --- Handlers ---

    const updateCart = (name: string, delta: number) => {
        setCart(prev => {
            const current = prev[name] || 0;
            const next = Math.max(0, current + delta);
            const newCart = { ...prev, [name]: next };
            if (next === 0) delete newCart[name];
            return newCart;
        });
    };

    const handlePackageConfirm = (items: { name: string; quantity: number }[]) => {
        setCart(prev => {
            const newCart = { ...prev };
            items.forEach(item => {
                newCart[item.name] = (newCart[item.name] || 0) + item.quantity;
            });
            return newCart;
        });
        setActivePackageBuilder(null);
    };

    const handleAddressChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDeliveryAddress(val);
        if (val.length > 5) {
            try {
                const suggestions = await getAddressSuggestions(val, null);
                setAddressSuggestions(suggestions);
            } catch (e) {
                // ignore
            }
        } else {
            setAddressSuggestions([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            if (finalItems.length === 0) throw new Error("Please add items to your order.");
            if (!pickupDate) throw new Error("Please select a pickup date.");
            if (!pickupTime) throw new Error("Please select a pickup time.");
            
            // Format time if needed, ensuring standard format
            const formattedTime = pickupTime; 
            // Ensure date is consistent
            const formattedDate = normalizeDateStr(pickupDate); // YYYY-MM-DD

            const newOrder: Order = {
                id: Date.now().toString(),
                customerName,
                phoneNumber,
                contactMethod: email ? `Website (Email: ${email})` : 'Website Form',
                pickupDate: formattedDate,
                pickupTime: formattedTime || 'TBD',
                items: finalItems,
                totalMini,
                totalFullSize: totalFull,
                amountCharged: estimatedTotal,
                amountCollected: 0,
                deliveryRequired,
                deliveryFee: 0, // Admin sets this later usually
                deliveryAddress: deliveryRequired ? deliveryAddress : null,
                paymentStatus: PaymentStatus.PENDING,
                paymentMethod: null,
                followUpStatus: FollowUpStatus.NEEDED,
                specialInstructions: specialInstructions || null,
                approvalStatus: ApprovalStatus.PENDING
            };

            await saveOrderToDb(newOrder);
            setLastOrder(newOrder);
            setIsSubmitted(true);
            
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong. Please try again.");
            window.scrollTo(0, 0);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render ---

    if (isSubmitted && lastOrder) {
        return (
            <div className="min-h-screen bg-brand-cream flex items-center justify-center p-4">
                <div className="bg-white max-w-lg w-full rounded-xl shadow-xl p-8 text-center border border-brand-tan">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircleIcon className="w-12 h-12 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-serif text-brand-brown mb-4">Order Received!</h2>
                    <p className="text-gray-600 mb-6">
                        Thank you, <strong>{lastOrder.customerName}</strong>! Your order has been placed successfully.
                        <br/>We will contact you shortly to confirm details.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left text-sm">
                        <p><strong>Order #:</strong> {lastOrder.id.slice(-6)}</p>
                        <p><strong>Pickup:</strong> {lastOrder.pickupDate} @ {lastOrder.pickupTime}</p>
                        <p><strong>Total Estimate:</strong> ${lastOrder.amountCharged.toFixed(2)}</p>
                    </div>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-brand-orange text-white font-bold py-3 px-8 rounded-full hover:bg-opacity-90 transition-all"
                    >
                        Place Another Order
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-cream">
            {/* Header / Nav */}
            <div className="bg-white shadow-sm border-b border-brand-tan sticky top-0 z-20">
                <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-serif text-brand-brown font-bold">Empanadas by Rose</h1>
                    {Object.keys(cart).length > 0 && (
                        <div className="text-sm font-bold text-brand-orange bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                            {Object.values(cart).reduce((a, b) => a + b, 0)} Items | {formatPrice(estimatedTotal)}
                        </div>
                    )}
                </div>
            </div>

            {motd && (
                <div className="bg-brand-brown text-brand-cream text-center py-2 px-4 text-sm font-medium">
                    {motd}
                </div>
            )}

            <main className="max-w-3xl mx-auto p-4 space-y-6 pb-24">
                
                {/* 1. Contact Info */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-tan">
                    <h2 className="text-lg font-bold text-brand-brown mb-4 flex items-center gap-2">
                        <UserIcon className="w-5 h-5" /> Contact Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                            <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                            <input type="tel" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" />
                        </div>
                    </div>
                </section>

                {/* 2. Date & Time */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-tan">
                    <h2 className="text-lg font-bold text-brand-brown mb-4 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5" /> Pickup / Delivery Time
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                            <input 
                                type="date" 
                                required 
                                value={pickupDate} 
                                onChange={e => { setPickupDate(e.target.value); setPickupTime(''); }} 
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                            <select 
                                required 
                                value={pickupTime} 
                                onChange={e => setPickupTime(e.target.value)} 
                                disabled={!pickupDate}
                                className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange disabled:bg-gray-100"
                            >
                                <option value="">Select Time</option>
                                {timeSlots.map(slot => (
                                    <option key={slot} value={slot}>{slot}</option>
                                ))}
                            </select>
                            {pickupDate && timeSlots.length === 0 && (
                                <p className="text-xs text-red-500 mt-1">No available slots for this date.</p>
                            )}
                        </div>
                        
                        <div className="md:col-span-2 border-t pt-4 mt-2">
                            <label className="flex items-center gap-2 cursor-pointer mb-3">
                                <input type="checkbox" checked={deliveryRequired} onChange={e => setDeliveryRequired(e.target.checked)} className="rounded text-brand-orange focus:ring-brand-orange" />
                                <span className="font-medium text-gray-700">Request Delivery?</span>
                            </label>
                            
                            {deliveryRequired && (
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address *</label>
                                    <input 
                                        type="text" 
                                        required={deliveryRequired} 
                                        value={deliveryAddress} 
                                        onChange={handleAddressChange}
                                        placeholder="123 Main St, Town, NY"
                                        className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" 
                                    />
                                    {addressSuggestions.length > 0 && (
                                        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-b-lg shadow-lg max-h-40 overflow-y-auto">
                                            {addressSuggestions.map((s, i) => (
                                                <li key={i} onClick={() => { setDeliveryAddress(s); setAddressSuggestions([]); }} className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm">
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* 3. Menu Selection */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-tan">
                    <h2 className="text-lg font-bold text-brand-brown mb-6 flex items-center gap-2">
                        <ShoppingBagIcon className="w-5 h-5" /> Build Your Order
                    </h2>
                    
                    {/* Category Tabs */}
                    <div className="flex space-x-2 border-b border-gray-200 mb-6 overflow-x-auto pb-1">
                        <button onClick={() => setActiveCategory('mini')} className={`px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeCategory === 'mini' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-brand-brown'}`}>
                            Mini Empanadas
                        </button>
                        <button onClick={() => setActiveCategory('full')} className={`px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeCategory === 'full' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-brand-brown'}`}>
                            Full-Size
                        </button>
                        <button onClick={() => setActiveCategory('packages')} className={`px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeCategory === 'packages' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-brand-brown'}`}>
                            Packages & Deals
                        </button>
                    </div>

                    <div className="space-y-4">
                        {activeCategory === 'mini' && availableFlavors.map(flavor => (
                            <div key={flavor.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <div className="flex-grow">
                                    <p className="font-bold text-brand-brown">{flavor.name} {flavor.isSpecial && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-2">SPECIAL</span>}</p>
                                    {flavor.description && <p className="text-xs text-gray-500">{flavor.description}</p>}
                                    {flavor.surcharge ? <p className="text-xs text-orange-600 font-bold">+${flavor.surcharge.toFixed(2)}</p> : null}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => updateCart(flavor.name, -1)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200"><MinusIcon className="w-4 h-4"/></button>
                                    <span className="w-6 text-center font-bold">{cart[flavor.name] || 0}</span>
                                    <button onClick={() => updateCart(flavor.name, 1)} className="w-8 h-8 bg-brand-orange text-white rounded-full flex items-center justify-center hover:bg-opacity-90"><PlusIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}

                        {activeCategory === 'full' && availableFullFlavors.map(flavor => (
                            <div key={flavor.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <div className="flex-grow">
                                    <p className="font-bold text-brand-brown">{flavor.name.replace('Full ', '')}</p>
                                    {flavor.description && <p className="text-xs text-gray-500">{flavor.description}</p>}
                                    {flavor.surcharge ? <p className="text-xs text-orange-600 font-bold">+${flavor.surcharge.toFixed(2)}</p> : null}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => updateCart(flavor.name, -1)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200"><MinusIcon className="w-4 h-4"/></button>
                                    <span className="w-6 text-center font-bold">{cart[flavor.name] || 0}</span>
                                    <button onClick={() => updateCart(flavor.name, 1)} className="w-8 h-8 bg-brand-orange text-white rounded-full flex items-center justify-center hover:bg-opacity-90"><PlusIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}

                        {activeCategory === 'packages' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {availablePackages.map(pkg => (
                                    <div key={pkg.id} className="border border-brand-tan rounded-lg p-4 hover:shadow-md transition-shadow bg-brand-cream/20 cursor-pointer" onClick={() => setActivePackageBuilder(pkg)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-brand-brown">{pkg.name}</h3>
                                            <span className="bg-white border border-brand-tan px-2 py-1 rounded text-sm font-bold text-brand-orange">${pkg.price}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-3">{pkg.description || `${pkg.quantity} items of your choice.`}</p>
                                        <button className="w-full py-2 bg-brand-orange text-white text-sm font-bold rounded-lg hover:bg-opacity-90">Customize</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {availableSalsas.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-dashed border-gray-300">
                            <h3 className="font-bold text-brand-brown mb-4">Extras & Salsas</h3>
                            <div className="space-y-3">
                                {availableSalsas.map(salsa => (
                                    <div key={salsa.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-800">{salsa.name}</p>
                                            <p className="text-xs text-brand-orange font-bold">${salsa.price.toFixed(2)}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => updateCart(salsa.name, -1)} className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200"><MinusIcon className="w-3 h-3"/></button>
                                            <span className="w-6 text-center text-sm font-bold">{cart[salsa.name] || 0}</span>
                                            <button onClick={() => updateCart(salsa.name, 1)} className="w-7 h-7 bg-brand-orange text-white rounded-full flex items-center justify-center hover:bg-opacity-90"><PlusIcon className="w-3 h-3"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* 4. Special Instructions */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-tan">
                    <label className="block text-sm font-bold text-brand-brown mb-2">Special Instructions / Allergies</label>
                    <textarea 
                        rows={3} 
                        value={specialInstructions}
                        onChange={e => setSpecialInstructions(e.target.value)}
                        className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange text-sm"
                        placeholder="Let us know if you have any special requests..."
                    />
                </section>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
                        <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-brand-orange text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-3"
                >
                    {isSubmitting ? (
                        <span>Processing...</span>
                    ) : (
                        <>
                            <span>Submit Order</span>
                            <span className="bg-white/20 px-2 py-0.5 rounded text-sm">${estimatedTotal.toFixed(2)}</span>
                        </>
                    )}
                </button>

            </main>

            {/* Modals */}
            {activePackageBuilder && (
                <PackageBuilderModal 
                    pkg={activePackageBuilder}
                    standardFlavors={empanadaFlavors.filter(f => !f.isSpecial)}
                    specialFlavors={empanadaFlavors.filter(f => f.isSpecial)}
                    salsas={[]} // Salsas usually added separately in main cart
                    onClose={() => setActivePackageBuilder(null)}
                    onConfirm={handlePackageConfirm}
                />
            )}
        </div>
    );
}
