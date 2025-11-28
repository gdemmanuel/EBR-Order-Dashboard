
import React, { useState, useMemo, useEffect } from 'react';
import { Order, Flavor, PricingSettings, AppSettings, ContactMethod, PaymentStatus, FollowUpStatus, ApprovalStatus, OrderItem, MenuPackage } from '../types';
import { saveOrderToDb } from '../services/dbService';
import { calculateOrderTotal } from '../utils/pricingUtils';
import { generateTimeSlots, normalizeDateStr } from '../utils/dateUtils';
import { getAddressSuggestions } from '../services/geminiService';
import { 
    ShoppingBagIcon, CalendarIcon, UserIcon, CheckCircleIcon, 
    ExclamationCircleIcon, PlusIcon, MinusIcon, ChevronDownIcon,
    SparklesIcon, ListBulletIcon, PencilIcon
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

// Helper to format phone number as (XXX) XXX-XXXX
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

// Component for rendering a package card with "Empanadas by Rose" style
const PackageCard = ({ pkg, onClick }: { pkg: MenuPackage; onClick: () => void }) => (
    <div 
        className="group relative bg-white border border-brand-tan rounded-xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between h-full overflow-hidden hover:border-brand-orange/30" 
        onClick={onClick}
    >
        {/* Subtle top accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-tan via-brand-orange/50 to-brand-tan opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div>
            <div className="flex justify-between items-start mb-3 gap-2">
                <h3 className="font-serif font-bold text-xl text-brand-brown group-hover:text-brand-orange transition-colors leading-tight">
                    {pkg.name}
                </h3>
                <span className="font-sans font-bold text-lg text-brand-orange whitespace-nowrap">
                    ${pkg.price}
                </span>
            </div>
            <p className="text-sm text-gray-600 mb-6 font-light leading-relaxed">
                {pkg.description || `${pkg.quantity} items of your choice.`}
            </p>
        </div>
        
        <button type="button" className="w-full py-3 bg-brand-brown text-brand-cream text-sm font-bold uppercase tracking-widest rounded hover:bg-brand-orange transition-colors mt-auto flex items-center justify-center gap-2 shadow-sm group-hover:shadow-md">
            <span>Customize</span>
            <PlusIcon className="w-4 h-4" /> 
        </button>
    </div>
);

// Component for Flavor Card
const FlavorCard = ({ flavor }: { flavor: Flavor }) => (
    <div className="flex flex-col p-4 bg-white border border-brand-tan/40 rounded-lg shadow-sm hover:shadow-md transition-shadow h-full">
        <div className="flex items-start justify-between gap-2">
            <span className="font-serif font-bold text-brand-brown text-lg leading-tight">{flavor.name}</span>
            {flavor.isSpecial && (
                <span className="flex-shrink-0 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-purple-200">
                    Special
                </span>
            )}
        </div>
        {flavor.description && (
            <span className="text-xs text-gray-500 mt-2 leading-relaxed font-light">
                {flavor.description}
            </span>
        )}
        {flavor.surcharge ? (
            <span className="text-[10px] text-brand-orange font-bold mt-auto pt-2 self-start uppercase tracking-wider">
                +{formatPrice(flavor.surcharge)} Extra
            </span>
        ) : null}
    </div>
);

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
    const [email, setEmail] = useState(''); 
    
    const [deliveryRequired, setDeliveryRequired] = useState(false);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
    
    const [pickupDate, setPickupDate] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    
    const [specialInstructions, setSpecialInstructions] = useState('');
    
    // Cart: Key is item name
    const [cart, setCart] = useState<Record<string, number>>({});
    
    const [isReviewing, setIsReviewing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [lastOrder, setLastOrder] = useState<Order | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [activePackageBuilder, setActivePackageBuilder] = useState<MenuPackage | null>(null);
    const [showSpecialtyMenu, setShowSpecialtyMenu] = useState(false);

    // --- Derived Data ---
    const { regularFlavors, specialFlavors } = useMemo(() => {
        const visible = empanadaFlavors.filter(f => f.visible);
        return {
            regularFlavors: visible.filter(f => !f.isSpecial),
            specialFlavors: visible.filter(f => f.isSpecial)
        };
    }, [empanadaFlavors]);

    const availablePackages = useMemo(() => {
        return (pricing?.packages || []).filter(p => p.visible);
    }, [pricing]);

    // Categorize Packages
    const miniPackages = useMemo(() => availablePackages.filter(p => p.itemType === 'mini' && !p.isSpecial), [availablePackages]);
    const fullPackages = useMemo(() => availablePackages.filter(p => p.itemType === 'full' && !p.isSpecial), [availablePackages]);
    const specialPackages = useMemo(() => availablePackages.filter(p => p.isSpecial), [availablePackages]);

    const availableSalsas = useMemo(() => {
        return (pricing?.salsas || []).filter(s => s.visible);
    }, [pricing]);

    // Convert salsas to "Flavors" for the modal, using surcharge as price to be compatible with Flavor interface
    const salsaListForModal = useMemo(() => {
        return availableSalsas.map(s => ({
            name: s.name,
            visible: true,
            description: s.description,
            surcharge: s.price, 
            isSpecial: false
        }));
    }, [availableSalsas]);

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
            0, // Delivery fee is calculated later by admin
            pricing,
            empanadaFlavors,
            fullSizeEmpanadaFlavors
        );

        const miniCount = items.filter(i => !i.name.startsWith('Full ') && !pricing.salsas?.some(s => s.name === i.name)).reduce((sum, i) => sum + i.quantity, 0);
        const fullCount = items.filter(i => i.name.startsWith('Full ')).reduce((sum, i) => sum + i.quantity, 0);

        return { finalItems: items, totalMini: miniCount, totalFull: fullCount, estimatedTotal: total };
    }, [cart, pricing, empanadaFlavors, fullSizeEmpanadaFlavors]);

    // --- Handlers ---

    const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhoneNumber(formatted);
    };

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
        // Scroll back to order section
        const section = document.getElementById('order-section');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
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

    const openPackageBuilder = (pkg: MenuPackage) => {
        setActivePackageBuilder(pkg);
        // Small delay to ensure render, then scroll to section top
        setTimeout(() => {
            const section = document.getElementById('order-section');
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
            }
        }, 50);
    };

    // Step 1: Review
    const handleReview = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (finalItems.length === 0) {
            setError("Please add items to your order.");
            window.scrollTo(0,0);
            return;
        }
        if (!pickupDate) {
            setError("Please select a pickup date.");
            window.scrollTo(0,0);
            return;
        }
        if (!pickupTime) {
            setError("Please select a pickup time.");
            window.scrollTo(0,0);
            return;
        }
        if (!customerName.trim()) {
            setError("Please enter your name.");
            window.scrollTo(0,0);
            return;
        }
        if (!phoneNumber.trim()) {
            setError("Please enter your phone number.");
            window.scrollTo(0,0);
            return;
        }
        if (deliveryRequired && !deliveryAddress.trim()) {
            setError("Please enter a delivery address.");
            window.scrollTo(0,0);
            return;
        }

        setIsReviewing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Step 2: Final Submit
    const handleFinalSubmit = async () => {
        setError(null);
        setIsSubmitting(true);

        try {
            const formattedTime = pickupTime; 
            const formattedDate = normalizeDateStr(pickupDate);

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
                deliveryFee: 0,
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
            setIsReviewing(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong. Please try again.");
            window.scrollTo(0, 0);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditOrder = () => {
        setIsReviewing(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- Render ---

    if (isSubmitted && lastOrder) {
        return (
            <div className="min-h-screen bg-brand-cream flex items-center justify-center p-4">
                <div className="bg-white max-w-lg w-full rounded-xl shadow-2xl p-8 text-center border border-brand-tan">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <CheckCircleIcon className="w-10 h-10 text-green-700" />
                    </div>
                    <h2 className="text-4xl font-serif text-brand-brown mb-4">Order Received!</h2>
                    <p className="text-gray-600 mb-8 font-light">
                        Thank you, <strong className="text-brand-brown font-semibold">{lastOrder.customerName}</strong>! Your order has been placed.
                        <br/>We will contact you within 24 hours to confirm order.
                    </p>
                    <div className="bg-brand-cream p-6 rounded-lg mb-8 text-left border border-brand-tan/50 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-500 uppercase tracking-wide">Order #</span>
                            <span className="font-mono text-brand-brown">{lastOrder.id.slice(-6)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-500 uppercase tracking-wide">Pickup</span>
                            <span className="font-medium text-brand-brown">{lastOrder.pickupDate} @ {lastOrder.pickupTime}</span>
                        </div>
                        
                        {/* Final Receipt Summary */}
                        <div className="border-t border-brand-tan/30 my-4 pt-4">
                            <span className="text-xs text-gray-500 uppercase tracking-wide mb-2 block font-bold">Order Summary</span>
                            <ul className="space-y-1 text-sm text-brand-brown">
                                {lastOrder.items.map((item, idx) => (
                                    <li key={idx} className="flex justify-between">
                                        <span>{item.name}</span>
                                        <span className="font-medium">x {item.quantity}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="border-t border-brand-tan/30 my-2 pt-2 flex justify-between items-center">
                            <span className="text-sm text-gray-500 uppercase tracking-wide">Total Est.</span>
                            <span className="text-xl font-serif font-bold text-brand-orange">${lastOrder.amountCharged.toFixed(2)}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-brand-brown text-brand-cream text-sm font-bold uppercase tracking-widest py-4 px-10 rounded hover:bg-brand-orange transition-all shadow-md"
                    >
                        Place Another Order
                    </button>
                </div>
            </div>
        );
    }

    if (isReviewing) {
        return (
            <div className="min-h-screen bg-brand-cream font-sans flex items-center justify-center p-4">
                <div className="max-w-2xl w-full bg-white rounded-xl shadow-xl border border-brand-tan overflow-hidden">
                    <header className="bg-brand-brown text-white p-6 text-center">
                        <h2 className="text-3xl font-serif">Review Your Order</h2>
                        <p className="text-brand-tan/80 text-sm mt-1">Please confirm details before submitting</p>
                    </header>
                    
                    <div className="p-6 space-y-6">
                        {/* Customer Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-brand-tan/50 pb-6">
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Customer</h3>
                                <p className="font-medium text-brand-brown text-lg">{customerName}</p>
                                <p className="text-gray-600">{phoneNumber}</p>
                                {email && <p className="text-gray-600 text-sm">{email}</p>}
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pickup / Delivery</h3>
                                <p className="font-medium text-brand-brown text-lg">{new Date(normalizeDateStr(pickupDate) + 'T00:00:00').toLocaleDateString()} @ {pickupTime}</p>
                                {deliveryRequired ? (
                                    <div className="mt-1">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                            Delivery Requested
                                        </span>
                                        <p className="text-sm text-gray-600 mt-1">{deliveryAddress}</p>
                                    </div>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                                        Pickup
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Order Items */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Order Items</h3>
                            <div className="bg-brand-cream rounded-lg p-4 border border-brand-tan/50">
                                <ul className="space-y-3">
                                    {finalItems.map((item, idx) => (
                                        <li key={idx} className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-brand-brown">{item.name}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-gray-500">Qty: {item.quantity}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Special Instructions */}
                        {specialInstructions && (
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                <h3 className="text-xs font-bold text-yellow-800 uppercase tracking-wider mb-1">Special Instructions</h3>
                                <p className="text-sm text-yellow-900 italic">"{specialInstructions}"</p>
                            </div>
                        )}

                        {/* Total */}
                        <div className="flex justify-between items-center pt-4 border-t border-brand-tan">
                            <span className="text-lg font-bold text-brand-brown">Estimated Total</span>
                            <span className="text-2xl font-serif font-bold text-brand-orange">{formatPrice(estimatedTotal)}</span>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-4">
                            <button 
                                onClick={handleEditOrder}
                                className="flex-1 py-3 border-2 border-brand-brown text-brand-brown font-bold rounded-lg hover:bg-brand-brown hover:text-white transition-colors flex items-center justify-center gap-2"
                            >
                                <PencilIcon className="w-4 h-4" /> Edit Order
                            </button>
                            <button 
                                onClick={handleFinalSubmit}
                                disabled={isSubmitting}
                                className="flex-1 py-3 bg-brand-orange text-white font-bold rounded-lg shadow-md hover:bg-opacity-90 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    'Submitting...'
                                ) : (
                                    <>
                                        <CheckCircleIcon className="w-5 h-5" /> Confirm & Submit
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-cream font-sans">
            {/* Elegant Header */}
            <div className="bg-white shadow-sm border-b border-brand-tan sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {/* Use logo image if available, else text */}
                        <img src="/logo.png" alt="EBR" className="h-10 w-auto object-contain hidden sm:block" onError={(e) => e.currentTarget.style.display = 'none'} />
                        <h1 className="text-2xl font-serif text-brand-brown font-bold tracking-tight">Empanadas by Rose</h1>
                    </div>
                    
                    {Object.keys(cart).length > 0 && (
                        <div className="flex items-center gap-3 animate-fade-in">
                            <div className="text-right hidden sm:block">
                                <span className="block text-xs text-gray-500 uppercase tracking-wider">Estimated Total</span>
                                <span className="block text-lg font-serif font-bold text-brand-orange leading-none">{formatPrice(estimatedTotal)}</span>
                            </div>
                            <div className="bg-brand-orange text-white px-3 py-2 rounded-lg shadow-sm flex items-center gap-2">
                                <ShoppingBagIcon className="w-5 h-5" />
                                <span className="font-bold">{Object.values(cart).reduce((a, b) => a + b, 0)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {motd && (
                <div className="bg-brand-brown text-brand-cream text-center py-2 px-4 text-xs font-medium tracking-wide uppercase">
                    {motd}
                </div>
            )}

            <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-10 pb-32">
                
                {/* 1. Menu & Flavors (Visual) */}
                <section className="space-y-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-serif text-brand-brown">Our Menu</h2>
                        <div className="h-1 w-20 bg-brand-orange mx-auto rounded-full"></div>
                        <p className="text-gray-500 font-light max-w-lg mx-auto">Explore our delicious variety of handmade empanadas. Choose a package below to start your order.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {regularFlavors.map(flavor => (
                            <FlavorCard key={flavor.name} flavor={flavor} />
                        ))}
                    </div>

                    {/* Specialty Flavors Toggle */}
                    {specialFlavors.length > 0 && (
                        <div className="mt-4">
                            <button 
                                onClick={() => setShowSpecialtyMenu(!showSpecialtyMenu)}
                                className="w-full group flex items-center justify-between bg-purple-50 p-4 rounded-xl border border-purple-100 hover:border-purple-300 transition-all shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-full text-purple-600 shadow-sm group-hover:scale-110 transition-transform">
                                        <SparklesIcon className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-serif font-bold text-brand-brown text-lg">Specialty Flavors</span>
                                        <span className="text-xs text-purple-700 font-medium">Seasonal & Limited Time Options</span>
                                    </div>
                                </div>
                                <ChevronDownIcon className={`w-6 h-6 text-purple-400 transform transition-transform duration-300 ${showSpecialtyMenu ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {showSpecialtyMenu && (
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in px-1">
                                    {specialFlavors.map(flavor => (
                                        <FlavorCard key={flavor.name} flavor={flavor} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* 2. Packages (Ordering) - SWITCHES TO BUILDER WHEN ACTIVE */}
                {availablePackages.length > 0 && (
                    <section id="order-section" className="scroll-mt-24 space-y-8 pt-8 border-t border-brand-tan/50">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-brand-brown text-white p-2 rounded-lg">
                                <ShoppingBagIcon className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-serif text-brand-brown">Order Here</h2>
                        </div>
                        
                        {activePackageBuilder ? (
                            <div className="animate-fade-in">
                                <PackageBuilderModal 
                                    pkg={activePackageBuilder}
                                    standardFlavors={empanadaFlavors.filter(f => !f.isSpecial)}
                                    specialFlavors={empanadaFlavors.filter(f => f.isSpecial)}
                                    salsas={salsaListForModal} 
                                    onClose={() => setActivePackageBuilder(null)}
                                    onConfirm={handlePackageConfirm}
                                />
                            </div>
                        ) : (
                            <>
                                {/* Mini Packages */}
                                {miniPackages.length > 0 && (
                                    <div>
                                        <h3 className="text-xl font-serif text-brand-brown mb-4 pb-2 border-b border-brand-tan flex items-center gap-2">
                                            <span className="bg-brand-orange w-2 h-2 rounded-full inline-block"></span>
                                            Mini Empanada Packages
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {miniPackages.map(pkg => (
                                                <PackageCard key={pkg.id} pkg={pkg} onClick={() => openPackageBuilder(pkg)} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Full Size Packages */}
                                {fullPackages.length > 0 && (
                                    <div>
                                        <h3 className="text-xl font-serif text-brand-brown mb-4 pb-2 border-b border-brand-tan flex items-center gap-2">
                                            <span className="bg-brand-brown w-2 h-2 rounded-full inline-block"></span>
                                            Full-Size Empanada Packages
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {fullPackages.map(pkg => (
                                                <PackageCard key={pkg.id} pkg={pkg} onClick={() => openPackageBuilder(pkg)} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Specialty Packages */}
                                {specialPackages.length > 0 && (
                                    <div>
                                        <h3 className="text-xl font-serif text-purple-900 mb-4 pb-2 border-b border-purple-100 flex items-center gap-2">
                                            <span className="bg-purple-600 w-2 h-2 rounded-full inline-block"></span>
                                            Specialty Packages
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {specialPackages.map(pkg => (
                                                <PackageCard key={pkg.id} pkg={pkg} onClick={() => openPackageBuilder(pkg)} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                )}

                {/* 3. Extras & Salsas */}
                {availableSalsas.length > 0 && (
                    <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-brand-tan">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-brand-orange/10 text-brand-orange p-2 rounded-lg">
                                <PlusIcon className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-serif text-brand-brown">Extras</h2>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {availableSalsas.map(salsa => (
                                <div key={salsa.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                    <div className="pr-4">
                                        <p className="font-serif font-bold text-brand-brown text-lg">{salsa.name}</p>
                                        {salsa.description && <p className="text-sm text-gray-500 mt-1 font-light italic">{salsa.description}</p>}
                                        <p className="text-sm text-brand-orange font-bold mt-1">${salsa.price.toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                                        <button onClick={() => updateCart(salsa.name, -1)} className="w-8 h-8 bg-white rounded-md flex items-center justify-center text-gray-500 hover:text-brand-brown shadow-sm border border-gray-200 transition-colors"><MinusIcon className="w-3 h-3"/></button>
                                        <span className="w-8 text-center font-bold text-brand-brown">{cart[salsa.name] || 0}</span>
                                        <button onClick={() => updateCart(salsa.name, 1)} className="w-8 h-8 bg-brand-brown text-white rounded-md flex items-center justify-center hover:bg-brand-orange shadow-sm transition-colors"><PlusIcon className="w-3 h-3"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 4. Customer Details Form */}
                <section className="bg-white p-6 md:p-8 rounded-xl shadow-lg border-t-4 border-brand-brown">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="bg-brand-brown text-white p-2 rounded-lg">
                            <UserIcon className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-serif text-brand-brown">Your Details</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-brand-brown uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
                            <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange bg-brand-cream/30 py-3" placeholder="Enter your name" />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-brand-brown uppercase tracking-wider">Phone Number <span className="text-red-500">*</span></label>
                            <input type="tel" required value={phoneNumber} onChange={handlePhoneNumberChange} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange bg-brand-cream/30 py-3" placeholder="(555) 123-4567" />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="block text-sm font-bold text-brand-brown uppercase tracking-wider">Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange bg-brand-cream/30 py-3" placeholder="For order confirmation" />
                        </div>
                    </div>

                    <div className="border-t border-gray-100 my-8 pt-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-brand-brown text-white p-2 rounded-lg">
                                <CalendarIcon className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-serif text-brand-brown">Pickup & Delivery</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-brand-brown uppercase tracking-wider">Date <span className="text-red-500">*</span></label>
                                <input 
                                    type="date" 
                                    required 
                                    value={pickupDate} 
                                    onChange={e => { setPickupDate(e.target.value); setPickupTime(''); }} 
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange bg-brand-cream/30 py-3" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-brand-brown uppercase tracking-wider">Time <span className="text-red-500">*</span></label>
                                <select 
                                    required 
                                    value={pickupTime} 
                                    onChange={e => setPickupTime(e.target.value)} 
                                    disabled={!pickupDate}
                                    className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange bg-brand-cream/30 py-3 disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                    <option value="">Select Time</option>
                                    {timeSlots.map(slot => (
                                        <option key={slot} value={slot}>{slot}</option>
                                    ))}
                                </select>
                                {pickupDate && timeSlots.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1 font-medium bg-red-50 p-2 rounded">Limited availability! We will contact you for availability.</p>
                                )}
                            </div>
                            
                            <div className="md:col-span-2 pt-4">
                                <label className="flex items-center gap-3 cursor-pointer p-4 border border-brand-tan rounded-lg hover:bg-brand-cream transition-colors">
                                    <input type="checkbox" checked={deliveryRequired} onChange={e => setDeliveryRequired(e.target.checked)} className="h-5 w-5 rounded text-brand-orange focus:ring-brand-orange border-gray-300" />
                                    <span className="font-bold text-brand-brown">Request Delivery?</span>
                                </label>
                                
                                {deliveryRequired && (
                                    <div className="relative mt-4 animate-fade-in">
                                        <label className="block text-sm font-bold text-brand-brown uppercase tracking-wider mb-1">Delivery Address <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            required={deliveryRequired} 
                                            value={deliveryAddress} 
                                            onChange={handleAddressChange}
                                            placeholder="123 Main St, Town, NY"
                                            className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange bg-brand-cream/30 py-3" 
                                        />
                                        {addressSuggestions.length > 0 && (
                                            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-b-lg shadow-xl max-h-48 overflow-y-auto mt-1">
                                                {addressSuggestions.map((s, i) => (
                                                    <li key={i} onClick={() => { setDeliveryAddress(s); setAddressSuggestions([]); }} className="px-4 py-3 hover:bg-brand-cream cursor-pointer text-sm border-b border-gray-50 last:border-0 text-gray-700">
                                                        {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 my-8 pt-8">
                        <label className="block text-sm font-bold text-brand-brown uppercase tracking-wider mb-2">Special Instructions / Allergies</label>
                        <textarea 
                            rows={3} 
                            value={specialInstructions}
                            onChange={e => setSpecialInstructions(e.target.value)}
                            className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange bg-brand-cream/30 p-3 text-sm"
                            placeholder="Let us know if you have any special requests..."
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 flex items-start gap-3">
                            <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={handleReview}
                        className="w-full bg-brand-orange text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-opacity-90 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.99] flex justify-center items-center gap-3 uppercase tracking-widest"
                    >
                        <span>Review Order</span>
                        <span className="bg-white/20 px-3 py-1 rounded text-base font-serif">${estimatedTotal.toFixed(2)}</span>
                    </button>
                </section>

            </main>
        </div>
    );
}
