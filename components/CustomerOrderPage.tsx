
import React, { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { saveOrderToDb, AppSettings } from '../services/dbService';
import { Order, OrderItem, PaymentStatus, FollowUpStatus, ApprovalStatus, PricingSettings, Flavor, MenuPackage } from '../types';
import { CheckCircleIcon, StarIcon, ClockIcon, ChevronDownIcon, MegaphoneIcon, ShoppingBagIcon, ArrowUturnLeftIcon, TrashIcon } from './icons/Icons';
import Header from './Header';
import PackageBuilderModal from './PackageBuilderModal';
import { generateTimeSlots, normalizeDateStr } from '../utils/dateUtils';

interface CustomerOrderPageProps {
    empanadaFlavors: Flavor[];
    fullSizeEmpanadaFlavors: Flavor[];
    pricing?: PricingSettings;
    scheduling?: AppSettings['scheduling'];
    busySlots?: { date: string; time: string }[];
    motd?: string;
}

interface CartPackage {
    id: string; 
    packageId: string;
    name: string;
    price: number;
    items: { name: string; quantity: number }[];
}

interface DynamicSalsaState {
    id: string;
    name: string;
    price: number;
    checked: boolean;
    quantity: number;
}

// Helper for local date min attribute
const getLocalMinDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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

// --- Inline Receipt Component ---
// Added 'pointer-events-auto' to ensure clicks work even if parent container is disabled
const InlineReceiptCard = ({ order }: { order: Order }) => {
    return (
        <div className="bg-white w-full rounded-xl shadow-xl border-t-8 border-brand-orange overflow-hidden relative animate-fade-in my-4 pointer-events-auto z-50">
            {/* Success Header */}
            <div className="bg-green-50 p-6 text-center border-b border-green-100">
                <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-sm">
                    <CheckCircleIcon className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-serif text-brand-brown mb-1">Order Received!</h2>
                <p className="text-sm text-brand-brown/70">
                    Thank you, <strong>{order.customerName.split(' ')[0]}</strong>.
                </p>
                <p className="text-xs text-gray-500 mt-1">We'll contact you at {order.phoneNumber} shortly.</p>
            </div>

            {/* Receipt Details */}
            <div className="p-5 space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-dashed border-gray-200 pb-3">
                    <span className="text-gray-500 font-medium">Pickup Time</span>
                    <span className="font-bold text-brand-brown">{order.pickupDate} @ {order.pickupTime}</span>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order Summary</p>
                    <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm items-start">
                                <span className="text-gray-700 font-medium">{item.name}</span>
                                <span className="text-gray-500 whitespace-nowrap ml-4">x {item.quantity}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-3 flex justify-between items-end">
                    <span className="font-bold text-brand-brown text-lg">Total</span>
                    <div className="text-right">
                        <span className="text-2xl font-serif font-bold text-brand-orange">${order.amountCharged.toFixed(2)}</span>
                        {order.deliveryRequired && <p className="text-[10px] text-gray-400 uppercase">Includes Delivery</p>}
                    </div>
                </div>
            </div>

            {/* Action */}
            <div className="p-5 bg-gray-50 border-t border-gray-100">
                <a 
                    href="https://www.empanadasbyrose.com" 
                    target="_top"
                    className="block w-full bg-brand-brown text-white font-serif py-3 rounded-lg text-center hover:bg-brand-brown/90 transition-all uppercase tracking-wider text-sm font-bold shadow-md no-underline flex items-center justify-center gap-2 cursor-pointer pointer-events-auto"
                >
                    <ArrowUturnLeftIcon className="w-4 h-4" /> Return to Website
                </a>
                <div className="mt-3 text-center">
                        <button 
                        onClick={() => window.location.reload()} 
                        className="text-brand-orange hover:underline text-xs font-medium cursor-pointer pointer-events-auto"
                    >
                        Place Another Order
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function CustomerOrderPage({ empanadaFlavors, fullSizeEmpanadaFlavors, pricing, scheduling, busySlots = [], motd }: CustomerOrderPageProps) {
    const [searchParams] = useSearchParams();
    const isEmbedded = searchParams.get('embed') === 'true';

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastOrder, setLastOrder] = useState<Order | null>(null);

    // Customer Info
    const [customerName, setCustomerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [pickupDate, setPickupDate] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    
    // Order State
    const [cartPackages, setCartPackages] = useState<CartPackage[]>([]);
    const [salsaItems, setSalsaItems] = useState<DynamicSalsaState[]>([]);

    // Delivery
    const [deliveryRequired, setDeliveryRequired] = useState(false);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    
    // Other
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [estimatedTotal, setEstimatedTotal] = useState(0);

    // Modal State for Package Builder
    const [activePackageBuilder, setActivePackageBuilder] = useState<MenuPackage | null>(null);

    // UI State for Sections
    const [isSpecialtyOpen, setIsSpecialtyOpen] = useState(false);
    const [sectionsState, setSectionsState] = useState({
        mini: true,
        full: true,
        platters: true
    });

    const toggleSection = (key: 'mini' | 'full' | 'platters') => {
        setSectionsState(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Safe pricing fallback
    const safePricing = pricing || {
        mini: { basePrice: 1.75 },
        full: { basePrice: 3.00 },
        packages: [],
        salsas: []
    };

    // Initialize salsas
    useEffect(() => {
        if (safePricing.salsas && safePricing.salsas.length > 0) {
            const initialSalsas = safePricing.salsas
                .filter(s => s.visible)
                .map(s => ({
                    id: s.id,
                    name: s.name,
                    price: s.price,
                    checked: false,
                    quantity: 1
                }));
            setSalsaItems(initialSalsas);
        }
    }, [safePricing.salsas]);

    // Phone Number Handler
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhoneNumber(formatted);
    };

    // --- Scheduling Logic ---
    const availableTimeSlots = useMemo(() => {
        if (!pickupDate || !scheduling || !scheduling.enabled) return [];

        const normalizedDate = normalizeDateStr(pickupDate); 
        const override = scheduling.dateOverrides?.[normalizedDate];
        
        if (override) {
            if (override.isClosed) return [];
            if (override.customHours) {
                const slots = generateTimeSlots(normalizedDate, override.customHours.start, override.customHours.end, scheduling.intervalMinutes);
                const todaysBusyTimes = new Set(busySlots.filter(slot => slot.date === normalizedDate).map(slot => slot.time));
                return slots.filter(time => !todaysBusyTimes.has(time));
            }
        }

        const [y, m, d] = normalizedDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        if (!override && scheduling.closedDays && scheduling.closedDays.includes(dateObj.getDay())) return [];
        if (!override && scheduling.blockedDates.includes(normalizedDate)) return [];

        const start = override?.customHours?.start || scheduling.startTime;
        const end = override?.customHours?.end || scheduling.endTime;
        const slots = generateTimeSlots(normalizedDate, start, end, scheduling.intervalMinutes);
        const todaysBusyTimes = new Set(busySlots.filter(slot => slot.date === normalizedDate).map(slot => slot.time));

        return slots.filter(time => !todaysBusyTimes.has(time));
    }, [pickupDate, scheduling, busySlots]);

    // --- Calculate Estimated Total ---
    useEffect(() => {
        const packagesTotal = cartPackages.reduce((sum, p) => sum + p.price, 0);
        let surchargeTotal = 0;
        let packageSalsaTotal = 0;

        cartPackages.forEach(pkg => {
            pkg.items.forEach(item => {
                const miniFlavor = empanadaFlavors.find(f => f.name === item.name);
                if (miniFlavor && miniFlavor.surcharge) surchargeTotal += (item.quantity * miniFlavor.surcharge);
                const fullFlavor = fullSizeEmpanadaFlavors.find(f => f.name === item.name);
                if (fullFlavor && fullFlavor.surcharge) surchargeTotal += (item.quantity * fullFlavor.surcharge);
                
                const salsaProduct = safePricing.salsas.find(s => s.name === item.name);
                if (salsaProduct) packageSalsaTotal += (item.quantity * salsaProduct.price);
            });
        });

        const globalSalsaTotal = salsaItems.filter(s => s.checked).reduce((sum, s) => sum + (s.quantity * s.price), 0);
        setEstimatedTotal(packagesTotal + globalSalsaTotal + surchargeTotal + packageSalsaTotal);
    }, [cartPackages, salsaItems, safePricing, empanadaFlavors, fullSizeEmpanadaFlavors]);

    // --- Package Builder Logic ---
    const openPackageBuilder = (pkg: MenuPackage) => { setActivePackageBuilder(pkg); };
    
    const handlePackageConfirm = (items: { name: string; quantity: number }[]) => { 
        if (!activePackageBuilder) return; 
        const newCartItem: CartPackage = { id: Date.now().toString(), packageId: activePackageBuilder.id, name: activePackageBuilder.name, price: activePackageBuilder.price, items: items }; 
        setCartPackages([...cartPackages, newCartItem]); 
        setActivePackageBuilder(null); 
    };
    
    const removeCartPackage = (id: string) => { setCartPackages(cartPackages.filter(p => p.id !== id)); };
    const handleSalsaChange = (index: number, field: keyof DynamicSalsaState, value: any) => { const newSalsaItems = [...salsaItems]; newSalsaItems[index] = { ...newSalsaItems[index], [field]: value }; setSalsaItems(newSalsaItems); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const allEmpanadas: OrderItem[] = [];
            cartPackages.forEach(pkg => {
                const pkgDef = safePricing.packages?.find(def => def.id === pkg.packageId);
                const isFullPackage = pkgDef?.itemType === 'full';
                pkg.items.forEach(item => {
                    let finalName = item.name;
                    const isSalsa = safePricing.salsas.some(s => s.name === item.name);
                    if (isFullPackage && !finalName.startsWith('Full ') && !isSalsa) finalName = `Full ${finalName}`;
                    
                    const existing = allEmpanadas.find(i => i.name === finalName);
                    if (existing) existing.quantity += item.quantity; else allEmpanadas.push({ ...item, name: finalName });
                });
            });

            const salsaOrderItems: OrderItem[] = salsaItems.filter(s => s.checked && s.quantity > 0).map(salsa => ({ name: salsa.name, quantity: salsa.quantity }));
            const finalItems = [...allEmpanadas, ...salsaOrderItems];

            if (finalItems.length === 0) throw new Error("Please add at least one package or item to your order.");

            if (scheduling?.enabled && pickupTime) {
                const normalizedDate = normalizeDateStr(pickupDate);
                const override = scheduling.dateOverrides?.[normalizedDate];
                const [y, m, d] = normalizedDate.split('-').map(Number);
                const dayOfWeek = new Date(y, m - 1, d).getDay();
                const isClosed = override?.isClosed || (!override && scheduling.blockedDates.includes(normalizedDate)) || (!override && scheduling.closedDays?.includes(dayOfWeek));

                if (isClosed) throw new Error("Sorry, this date is unavailable. Please select another date.");
                if (busySlots.some(s => s.date === normalizedDate && s.time === pickupTime)) throw new Error("Sorry, that time slot was just taken. Please select another time.");
            }

            const formattedDate = pickupDate ? `${pickupDate.split('-')[1]}/${pickupDate.split('-')[2]}/${pickupDate.split('-')[0]}` : '';
            let formattedTime = pickupTime;
            if (pickupTime && !pickupTime.includes('M') && pickupTime.includes(':')) {
                 const [h, m] = pickupTime.split(':');
                 const hour = parseInt(h);
                 const ampm = hour >= 12 ? 'PM' : 'AM';
                 const hour12 = hour % 12 || 12;
                 formattedTime = `${hour12}:${m} ${ampm}`;
            }

            const totalMini = cartPackages.filter(p => safePricing.packages?.find(def => def.id === p.packageId)?.itemType === 'mini').reduce((sum, p) => sum + (safePricing.packages?.find(def => def.id === p.packageId)?.quantity || 0), 0);
            const totalFull = cartPackages.filter(p => safePricing.packages?.find(def => def.id === p.packageId)?.itemType === 'full').reduce((sum, p) => sum + (safePricing.packages?.find(def => def.id === p.packageId)?.quantity || 0), 0);

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
            
            // We do NOT force scroll to top here.
            // The user stays at the bottom where they clicked, and sees the Inline Receipt immediately.

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong. Please try again.");
            window.scrollTo(0, 0);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const miniPackages = safePricing.packages?.filter(p => p.itemType === 'mini' && p.visible && !p.isSpecial) || [];
    const fullPackages = safePricing.packages?.filter(p => p.itemType === 'full' && p.visible && !p.isSpecial) || [];
    const specialPackages = safePricing.packages?.filter(p => p.visible && p.isSpecial) || [];
    const allVisibleFlavors = empanadaFlavors.filter(f => f.visible);
    const standardFlavors = allVisibleFlavors.filter(f => !f.isSpecial);
    const specialFlavors = allVisibleFlavors.filter(f => f.isSpecial);
    
    const salsaFlavors: Flavor[] = useMemo(() => 
        (safePricing.salsas || [])
            .filter(s => s.visible)
            .map(s => ({ name: s.name, visible: true, description: 'Dipping Sauce', price: s.price })), 
        [safePricing.salsas]
    );

    const isDateBlocked = (dateStr: string) => {
        if (!scheduling?.enabled) return false;
        const override = scheduling.dateOverrides?.[dateStr];
        if (override) return override.isClosed;
        if (scheduling.blockedDates.includes(dateStr)) return true;
        const [y, m, d] = dateStr.split('-').map(Number);
        const day = new Date(y, m - 1, d).getDay();
        return scheduling.closedDays?.includes(day);
    };

    const isDateFull = useMemo(() => {
        if (!pickupDate || !scheduling) return false;
        const normalizedDate = normalizeDateStr(pickupDate);
        return scheduling.dateOverrides?.[normalizedDate]?.isFull || false;
    }, [pickupDate, scheduling]);

    return (
        <div className={`font-sans flex flex-col ${isEmbedded ? 'h-auto bg-white' : 'min-h-screen bg-brand-cream'}`}>
            {/* AGGRESSIVE SCROLLBAR HIDING for Embedded View */}
            {isEmbedded && (
                <style>
                    {`
                        /* Chrome, Safari, Edge, Opera */
                        html, body { 
                            overflow-y: auto; 
                            overscroll-behavior-y: none; 
                            -ms-overflow-style: none;  /* IE and Edge */
                            scrollbar-width: none;  /* Firefox */
                        }
                        ::-webkit-scrollbar { 
                            display: none; 
                            width: 0px; 
                            background: transparent; 
                        }
                    `}
                </style>
            )}

            {!isEmbedded && <Header variant="public" />}
            
            {/* MOTD Banner */}
            {motd && !isEmbedded && (
                <div className="bg-brand-brown text-brand-tan overflow-hidden py-2 border-b border-brand-tan/20 flex select-none">
                    <div className="animate-marquee flex-shrink-0 flex items-center whitespace-nowrap text-sm font-medium tracking-wide">
                        {Array(10).fill(motd).map((msg, i) => (
                            <span key={`a-${i}`} className="mx-8 inline-flex items-center">
                                <MegaphoneIcon className="w-4 h-4 mr-2" />{String(msg)}
                            </span>
                        ))}
                    </div>
                    <div className="animate-marquee flex-shrink-0 flex items-center whitespace-nowrap text-sm font-medium tracking-wide" aria-hidden="true">
                        {Array(10).fill(motd).map((msg, i) => (
                            <span key={`b-${i}`} className="mx-8 inline-flex items-center">
                                <MegaphoneIcon className="w-4 h-4 mr-2" />{String(msg)}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <main className={`max-w-5xl mx-auto px-4 ${isEmbedded ? 'py-2 pb-64' : 'py-12 pb-32'} w-full`}>
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-center mb-8" role="alert">
                        <strong className="block font-bold mb-1">Oops!</strong>
                        <span>{error}</span>
                    </div>
                )}

                {/* TOP RECEIPT - For users scrolled to top */}
                {isSubmitted && lastOrder && (
                    <div className="mb-8">
                        <InlineReceiptCard order={lastOrder} />
                    </div>
                )}

                <form onSubmit={handleSubmit} className={`space-y-16 ${isSubmitted ? 'opacity-30 pointer-events-none grayscale transition-opacity duration-1000' : ''}`}>
                    
                    {/* FLAVORS SECTION */}
                    <section>
                        <h3 className="text-3xl font-serif text-brand-brown mb-8 text-center">Our Flavors</h3>
                        <div className="bg-white p-8 sm:p-12 rounded-xl shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-6">
                                {standardFlavors.map(f => (
                                    <div key={f.name} className="flex flex-col items-center text-center">
                                        <span className="font-serif text-xl text-brand-brown">{f.name}</span>
                                        {f.description && <span className="text-sm text-gray-500 mt-1 font-light">{f.description}</span>}
                                    </div>
                                ))}
                            </div>
                            <p className="text-center text-xs text-gray-400 mt-10 font-medium uppercase tracking-widest">Available for both Mini and Full-Size</p>
                        </div>
                        
                        {specialFlavors.length > 0 && (
                            <div className="mt-8 rounded-xl shadow-sm border border-purple-100 bg-white overflow-hidden transition-all">
                                <button 
                                    type="button"
                                    onClick={() => setIsSpecialtyOpen(!isSpecialtyOpen)}
                                    className="w-full p-6 flex items-center justify-between bg-purple-50 hover:bg-purple-100 transition-colors text-left group"
                                >
                                    <h4 className="text-xl font-serif text-purple-900 flex items-center gap-3">
                                        <StarIcon className="w-6 h-6 text-purple-400" /> Specialty & Seasonal Flavors
                                    </h4>
                                    <div className={`transform transition-transform duration-300 ${isSpecialtyOpen ? 'rotate-180' : ''}`}>
                                        <ChevronDownIcon className="w-6 h-6 text-purple-400" />
                                    </div>
                                </button>
                                
                                {isSpecialtyOpen && (
                                    <div className="p-8 border-t border-purple-100 bg-white">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {specialFlavors.map(f => (
                                                <div key={f.name} className="text-center">
                                                    <p className="font-serif text-lg text-brand-brown">{f.name}</p>
                                                    {f.description && <p className="text-sm text-gray-500 mt-1 font-light italic">{f.description}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Header Section - HIDDEN IN EMBEDDED MODE */}
                    {!isEmbedded && (
                        <div className="text-center py-8 border-t border-brand-tan/20">
                            <h3 className="text-3xl font-serif text-brand-brown mb-4">Place Your Order</h3>
                            <div className="w-24 h-1 bg-brand-orange mx-auto mb-6"></div>
                            <p className="text-brand-brown/70 max-w-2xl mx-auto text-lg font-light">Select your packages below. Everything is made fresh to order with love.</p>
                        </div>
                    )}

                    {/* PACKAGES SECTION */}
                    <div className="space-y-8">
                        {/* Mini Packages */}
                        <section className="scroll-mt-20" id="section-mini">
                            <button 
                                type="button" 
                                onClick={() => toggleSection('mini')} 
                                className="w-full flex items-center justify-between gap-4 mb-4 group cursor-pointer"
                            >
                                <div className="flex items-center gap-4 flex-grow">
                                    <h3 className="text-2xl md:text-3xl font-serif text-brand-brown group-hover:text-brand-orange transition-colors">Mini Empanadas</h3>
                                    <div className="flex-grow h-px bg-brand-tan group-hover:bg-brand-orange/30 transition-colors"></div>
                                </div>
                                <div className={`transform transition-transform duration-200 ${sectionsState.mini ? 'rotate-180' : ''}`}>
                                    <ChevronDownIcon className="w-6 h-6 text-brand-brown/50 group-hover:text-brand-orange" />
                                </div>
                            </button>
                            
                            {sectionsState.mini && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {miniPackages.map(pkg => (
                                        <div key={pkg.id} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all border border-transparent hover:border-brand-tan flex flex-col items-center text-center">
                                            <h4 className="font-serif text-lg font-bold text-brand-brown mb-0.5">{pkg.name}</h4>
                                            <div className="text-brand-orange font-bold text-base mb-2">${pkg.price.toFixed(2)}</div>
                                            <p className="text-xs text-gray-600 mb-0.5">{pkg.quantity} Mini Empanadas</p>
                                            <p className="text-[10px] text-gray-400 mb-3 uppercase tracking-wide">Up to {pkg.maxFlavors} {pkg.maxFlavors === 1 ? 'flavor' : 'flavors'}</p>
                                            {pkg.description && <p className="text-xs text-gray-500 italic mb-3 px-2">{pkg.description}</p>}
                                            <button type="button" onClick={() => openPackageBuilder(pkg)} className="mt-auto bg-brand-brown text-white px-4 py-1.5 rounded hover:bg-brand-brown/90 transition-colors text-xs uppercase tracking-wider font-bold w-full">Select</button>
                                        </div>
                                    ))}
                                    {miniPackages.length === 0 && <p className="col-span-3 text-center text-gray-400 italic py-8">Sold out or unavailable.</p>}
                                </div>
                            )}
                        </section>

                        {/* Full Packages */}
                        <section className="scroll-mt-20" id="section-full">
                            <button 
                                type="button" 
                                onClick={() => toggleSection('full')} 
                                className="w-full flex items-center justify-between gap-4 mb-4 group cursor-pointer"
                            >
                                <div className="flex items-center gap-4 flex-grow">
                                    <h3 className="text-2xl md:text-3xl font-serif text-brand-brown group-hover:text-brand-orange transition-colors">Full-Size Empanadas</h3>
                                    <div className="flex-grow h-px bg-brand-tan group-hover:bg-brand-orange/30 transition-colors"></div>
                                </div>
                                <div className={`transform transition-transform duration-200 ${sectionsState.full ? 'rotate-180' : ''}`}>
                                    <ChevronDownIcon className="w-6 h-6 text-brand-brown/50 group-hover:text-brand-orange" />
                                </div>
                            </button>

                            {sectionsState.full && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {fullPackages.map(pkg => (
                                        <div key={pkg.id} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all border border-transparent hover:border-brand-tan flex flex-col items-center text-center">
                                            <h4 className="font-serif text-lg font-bold text-brand-brown mb-0.5">{pkg.name}</h4>
                                            <div className="text-brand-orange font-bold text-base mb-2">${pkg.price.toFixed(2)}</div>
                                            <p className="text-xs text-gray-600 mb-0.5">{pkg.quantity} Full-Size Empanadas</p>
                                            <p className="text-[10px] text-gray-400 mb-3 uppercase tracking-wide">Up to {pkg.maxFlavors} {pkg.maxFlavors === 1 ? 'flavor' : 'flavors'}</p>
                                            <button type="button" onClick={() => openPackageBuilder(pkg)} className="mt-auto bg-brand-brown text-white px-4 py-1.5 rounded hover:bg-brand-brown/90 transition-colors text-xs uppercase tracking-wider font-bold w-full">Select</button>
                                        </div>
                                    ))}
                                    {fullPackages.length === 0 && <p className="col-span-3 text-center text-gray-400 italic py-8">Sold out or unavailable.</p>}
                                </div>
                            )}
                        </section>

                        {/* Specials */}
                        {specialPackages.length > 0 && (
                            <section className="scroll-mt-20" id="section-platters">
                                <button 
                                    type="button" 
                                    onClick={() => toggleSection('platters')} 
                                    className="w-full flex items-center justify-between gap-4 mb-4 group cursor-pointer"
                                >
                                    <div className="flex items-center gap-4 flex-grow">
                                        <h3 className="text-2xl md:text-3xl font-serif text-purple-900 group-hover:text-purple-700 transition-colors">Platters & Specials</h3>
                                        <div className="flex-grow h-px bg-purple-100 group-hover:bg-purple-200 transition-colors"></div>
                                    </div>
                                    <div className={`transform transition-transform duration-200 ${sectionsState.platters ? 'rotate-180' : ''}`}>
                                        <ChevronDownIcon className="w-6 h-6 text-purple-300 group-hover:text-purple-500" />
                                    </div>
                                </button>

                                {sectionsState.platters && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {specialPackages.map(pkg => (
                                            <div key={pkg.id} className="bg-purple-50/50 p-4 rounded-lg shadow-sm hover:shadow-md transition-all border border-purple-100 flex flex-col items-center text-center">
                                                <h4 className="font-serif text-lg font-bold text-purple-900 mb-0.5">{pkg.name}</h4>
                                                <div className="text-purple-700 font-bold text-base mb-2">${pkg.price.toFixed(2)}</div>
                                                <p className="text-xs text-gray-600 mb-0.5">{pkg.quantity} Items</p>
                                                <p className="text-[10px] text-purple-400 mb-3 uppercase tracking-wide font-bold">Limited Time</p>
                                                {pkg.description && <p className="text-xs text-gray-500 italic mb-3 px-2">{pkg.description}</p>}
                                                <button type="button" onClick={() => openPackageBuilder(pkg)} className="mt-auto bg-purple-900 text-white px-4 py-1.5 rounded hover:bg-purple-800 transition-colors text-xs uppercase tracking-wider font-bold w-full">Select</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}
                    </div>

                    {/* EXTRAS SECTION */}
                    {salsaItems.length > 0 && (
                        <section className="bg-white p-8 rounded-xl shadow-sm">
                            <h3 className="text-3xl font-serif text-brand-brown mb-6 text-center">Add Extras</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {salsaItems.map((salsa, idx) => (
                                    <div key={salsa.id} className={`flex items-center justify-between p-4 rounded border transition-all ${salsa.checked ? 'border-brand-orange bg-orange-50' : 'border-gray-100 bg-gray-50'}`}>
                                        <div className="flex items-center">
                                            <input type="checkbox" checked={salsa.checked} onChange={e => handleSalsaChange(idx, 'checked', e.target.checked)} className="h-5 w-5 text-brand-orange rounded focus:ring-brand-orange border-gray-300 cursor-pointer" />
                                            <div className="ml-3">
                                                <span className="block font-medium text-brand-brown">{salsa.name}</span>
                                                <span className="text-sm text-gray-500">${salsa.price.toFixed(2)}</span>
                                            </div>
                                        </div>
                                        {salsa.checked && (
                                            <div className="flex items-center gap-2 bg-white rounded border border-gray-200 px-2 py-1">
                                                <span className="text-xs text-gray-400 uppercase">Qty</span>
                                                <input type="number" min="1" value={salsa.quantity} onChange={e => handleSalsaChange(idx, 'quantity', parseInt(e.target.value))} className="w-12 text-center border-none p-0 text-sm focus:ring-0" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Cart Summary Block */}
                    {cartPackages.length > 0 && (
                        <div className="bg-white rounded-xl p-8 shadow-xl border-l-8 border-brand-orange relative">
                            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                                <div className="bg-brand-orange text-white p-2 rounded-full shadow-sm">
                                    <ShoppingBagIcon className="w-6 h-6" />
                                </div>
                                <h4 className="font-serif text-2xl text-brand-brown font-bold">Your Selection</h4>
                            </div>
                            <div className="space-y-4">
                                {cartPackages.map((item) => {
                                    const extraSalsaCost = item.items.reduce((sum, i) => {
                                        const salsa = safePricing.salsas.find(s => s.name === i.name);
                                        return sum + (salsa ? (salsa.price * i.quantity) : 0);
                                    }, 0);
                                    const displayPrice = (item.price || 0) + (extraSalsaCost || 0);

                                    return (
                                        <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-5 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                                            <div>
                                                <p className="font-serif text-lg text-brand-brown font-bold">{item.name}</p>
                                                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{item.items.map(i => `${i.quantity} ${i.name}`).join(', ')}</p>
                                            </div>
                                            <div className="flex items-center gap-6 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                                                <span className="font-bold text-xl text-brand-brown">${displayPrice.toFixed(2)}</span>
                                                <button type="button" onClick={() => removeCartPackage(item.id)} className="text-gray-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full"><TrashIcon className="w-5 h-5" /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* CONTACT & DETAILS FORM */}
                    <section className="bg-white p-8 sm:p-12 rounded-xl shadow-sm">
                        <h3 className="text-3xl font-serif text-brand-brown mb-8 text-center">Your Details</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                                <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-brand-cream/50 border-0 border-b-2 border-gray-200 focus:border-brand-orange focus:ring-0 px-0 py-3 text-lg placeholder-gray-300 transition-colors" placeholder="Jane Doe" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Phone Number</label>
                                <input type="tel" required value={phoneNumber} onChange={handlePhoneChange} className="w-full bg-brand-cream/50 border-0 border-b-2 border-gray-200 focus:border-brand-orange focus:ring-0 px-0 py-3 text-lg placeholder-gray-300 transition-colors" placeholder="(555) 123-4567" maxLength={14} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-brand-cream/50 border-0 border-b-2 border-gray-200 focus:border-brand-orange focus:ring-0 px-0 py-3 text-lg placeholder-gray-300 transition-colors" placeholder="jane@example.com" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Preferred Pickup Date</label>
                                <input 
                                    type="date" 
                                    required 
                                    min={getLocalMinDate()}
                                    value={pickupDate} 
                                    onChange={e => { setPickupDate(e.target.value); setPickupTime(''); }} 
                                    className={`w-full bg-brand-cream/50 border-0 border-b-2 border-gray-200 focus:border-brand-orange focus:ring-0 px-0 py-3 text-lg text-brand-brown appearance-none rounded-none ${isDateFull ? 'border-amber-300 bg-amber-50' : ''}`} 
                                    style={{ colorScheme: 'light' }}
                                />
                                {isDateFull && <p className="text-xs text-amber-700 mt-1 font-bold">⚠️ High Volume - Approval Required</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Preferred Time</label>
                                {scheduling?.enabled ? (
                                    <div className="relative">
                                        <select 
                                            value={pickupTime} 
                                            onChange={e => setPickupTime(e.target.value)} 
                                            disabled={!pickupDate}
                                            className="w-full bg-brand-cream/50 border-0 border-b-2 border-gray-200 focus:border-brand-orange focus:ring-0 px-0 py-3 text-lg text-brand-brown appearance-none disabled:opacity-50"
                                        >
                                            <option value="">Select a time...</option>
                                            {availableTimeSlots.map(time => (
                                                <option key={time} value={time}>{time}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-gray-400">
                                            <ClockIcon className="w-5 h-5" />
                                        </div>
                                        {pickupDate && !isDateBlocked(normalizeDateStr(pickupDate)) && availableTimeSlots.length === 0 && (
                                            <p className="text-xs text-red-500 mt-2">No slots available for this date.</p>
                                        )}
                                    </div>
                                ) : (
                                    <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full bg-brand-cream/50 border-0 border-b-2 border-gray-200 focus:border-brand-orange focus:ring-0 px-0 py-3 text-lg text-brand-brown" />
                                )}
                            </div>
                        </div>

                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <input type="checkbox" id="delivery" checked={deliveryRequired} onChange={e => setDeliveryRequired(e.target.checked)} className="h-5 w-5 text-brand-orange rounded border-gray-300 focus:ring-brand-orange cursor-pointer" />
                                <label htmlFor="delivery" className="text-brand-brown cursor-pointer select-none">I need delivery <span className="text-sm text-gray-500">(Fees apply based on location)</span></label>
                            </div>
                            {deliveryRequired && (
                                <div className="pl-8">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Delivery Address</label>
                                    <input type="text" required={deliveryRequired} value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="w-full bg-brand-cream/50 border-0 border-b-2 border-gray-200 focus:border-brand-orange focus:ring-0 px-0 py-3 text-lg placeholder-gray-300" placeholder="123 Main St, Town, NY" />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Special Instructions / Notes</label>
                            <textarea rows={3} value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} className="w-full bg-brand-cream/50 border-0 border-b-2 border-gray-200 focus:border-brand-orange focus:ring-0 px-0 py-3 text-brand-brown resize-none" placeholder="Allergies, gate code, etc." />
                        </div>
                    </section>

                    {/* BOTTOM INLINE RECEIPT - Replaces the button after submission */}
                    {isSubmitted && lastOrder ? (
                        <div className="mt-8 mb-32">
                            <InlineReceiptCard order={lastOrder} />
                        </div>
                    ) : (
                        /* Footer with Submit Button - Standard Layout for both modes, but embedded gets relative positioning + padding */
                        <div className={`${isEmbedded ? 'relative mt-8 border-t border-brand-tan/20 pt-6 pb-20' : 'fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 p-4 sm:p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20'}`}>
                            <div className={`max-w-5xl mx-auto flex flex-row justify-between items-center gap-4 ${isEmbedded ? '' : ''}`}>
                                <div className="text-left">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Estimated Total</p>
                                    <p className="text-3xl font-serif text-brand-brown font-bold">${estimatedTotal.toFixed(2)}*</p>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting} 
                                    className="bg-brand-orange text-white font-bold text-sm sm:text-base px-8 py-3 sm:py-4 rounded shadow-lg hover:bg-brand-orange/90 hover:shadow-xl transition-all disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none uppercase tracking-widest"
                                >
                                    {isSubmitting ? 'Sending Request...' : 'Submit Order'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                {activePackageBuilder && (
                    <PackageBuilderModal 
                        pkg={activePackageBuilder} 
                        standardFlavors={empanadaFlavors.filter(f => !f.isSpecial)}
                        specialFlavors={empanadaFlavors.filter(f => f.isSpecial)}
                        salsas={salsaFlavors}
                        onClose={() => setActivePackageBuilder(null)} 
                        onConfirm={handlePackageConfirm}
                    />
                )}
            </main>
            
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 60s linear infinite;
                }
            `}</style>
        </div>
    );
}
