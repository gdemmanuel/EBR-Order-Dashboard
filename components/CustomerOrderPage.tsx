import React, { useState, useMemo, useEffect } from 'react';
import { Order, Flavor, PricingSettings, AppSettings, PaymentStatus, FollowUpStatus, ApprovalStatus, OrderItem, MenuPackage } from '../types';
import { saveOrderToDb } from '../services/dbService';
import { generateTimeSlots, normalizeDateStr } from '../utils/dateUtils';
import { getAddressSuggestions } from '../services/geminiService';
import { 
    ShoppingBagIcon, CalendarIcon, UserIcon, CheckCircleIcon, 
    ExclamationCircleIcon, PlusIcon, MinusIcon, ChevronDownIcon,
    SparklesIcon, ListBulletIcon, PencilIcon, TrashIcon
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

// Internal type for a selected package in the cart
interface SelectedPackage {
    internalId: string; // Unique ID for this specific instance in the cart
    pkgId: string;
    name: string;
    basePrice: number;
    totalPrice: number; // base + surcharges
    items: { name: string; quantity: number }[];
}

// Component for rendering a package card with "Empanadas by Rose" style
const PackageCard = ({ pkg, onClick }: { pkg: MenuPackage; onClick: () => void }) => (
    <div 
        className="group relative bg-white border border-brand-tan rounded-xl p-4 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between h-full overflow-hidden hover:border-brand-orange/30" 
        onClick={onClick}
    >
        {/* Subtle top accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-tan via-brand-orange/50 to-brand-tan opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div>
            <div className="flex justify-between items-start mb-2 gap-2">
                <h3 className="font-serif font-bold text-lg text-brand-brown group-hover:text-brand-orange transition-colors leading-tight">
                    {pkg.name}
                </h3>
                <span className="font-sans font-bold text-base text-brand-orange whitespace-nowrap">
                    ${pkg.price}
                </span>
            </div>
            <p className="text-xs text-gray-600 mb-4 font-light leading-relaxed">
                {pkg.description || `${pkg.quantity} items of your choice.`}
            </p>
        </div>
        
        <button type="button" className="w-full py-2 bg-brand-brown text-brand-cream text-xs font-bold uppercase tracking-widest rounded hover:bg-brand-orange transition-colors mt-auto flex items-center justify-center gap-2 shadow-sm group-hover:shadow-md">
            <span>Customize</span>
            <PlusIcon className="w-3 h-3" /> 
        </button>
    </div>
);

// Component for Flavor Card
const FlavorCard = ({ flavor }: { flavor: Flavor }) => (
    <div className="flex flex-col p-3 bg-white border border-brand-tan/40 rounded-lg shadow-sm hover:shadow-md transition-shadow h-full">
        <div className="flex items-start justify-between gap-2">
            <span className="font-serif font-bold text-brand-brown text-base leading-tight break-words">{flavor.name}</span>
            {flavor.isSpecial && (
                <span className="flex-shrink-0 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide border border-purple-200">
                    Special
                </span>
            )}
        </div>
        {flavor.description && (
            <span className="text-[10px] text-gray-500 mt-1 leading-relaxed font-light whitespace-normal break-words">
                {flavor.description}
            </span>
        )}
        {flavor.surcharge ? (
            <span className="text-[10px] text-brand-orange font-bold mt-auto pt-1 self-start uppercase tracking-wider">
                +{formatPrice(flavor.surcharge)} Extra
            </span>
        ) : null}
    </div>
);

export default function CustomerOrderPage({
    empanadaFlavors = [],
    fullSizeEmpanadaFlavors = [],
    pricing,
    scheduling,
    busySlots,
    motd
}: CustomerOrderPageProps) {
    
    // Auto-resize iframe height for embedding - Robust Implementation
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const sendHeight = () => {
            try {
                const height = document.body.scrollHeight;
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: "embedHeight", height }, "*");
                }
            } catch (e) {
                // Ignore cross-origin errors if parent is restricted
                console.debug("Embed resize warning:", e);
            }
        };

        let observer: ResizeObserver | null = null;

        try {
            if (typeof ResizeObserver !== 'undefined') {
                observer = new ResizeObserver(sendHeight);
                observer.observe(document.body);
            } else {
                // Fallback for older browsers
                window.addEventListener('resize', sendHeight);
                const i = setInterval(sendHeight, 1000);
                return () => {
                    window.removeEventListener('resize', sendHeight);
                    clearInterval(i);
                };
            }
        } catch (e) {
            console.warn("ResizeObserver init failed", e);
        }

        // Initial send with delay to ensure rendering
        setTimeout(sendHeight, 100);
        setTimeout(sendHeight, 1000);

        return () => {
            if (observer) observer.disconnect();
        };
    }, []);

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
    
    // Cart State: Split into explicit Packages and Salsas (Extras)
    const [cartPackages, setCartPackages] = useState<SelectedPackage[]>([]);
    const [cartSalsas, setCartSalsas] = useState<Record<string, number>>({});
    
    const [isReviewing, setIsReviewing] = useState(false); // kept for layout compatibility
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [lastOrder, setLastOrder] = useState<Order | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [activePackageBuilder, setActivePackageBuilder] = useState<MenuPackage | null>(null);
    const [showSpecialtyMenu, setShowSpecialtyMenu] = useState(false);

    // Scroll success message into view when submitted (inside iframe / direct view)
    useEffect(() => {
        if (isSubmitted) {
            setTimeout(() => {
                const el = document.getElementById("order-success");
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }, 50);
        }
    }, [isSubmitted]);

    // --- Derived Data ---
    const { regularFlavors, specialFlavors } = useMemo(() => {
        const visible = empanadaFlavors ? empanadaFlavors.filter(f => f.visible) : [];
        return {
            regularFlavors: visible.filter(f => !f.isSpecial),
            specialFlavors: visible.filter(f => f.isSpecial)
        };
    }, [empanadaFlavors]);

    const availablePackages = useMemo(() => {
        return (pricing?.packages || []).filter(p => p.visible);
    }, [pricing]);

    // Categorize Packages
    const miniPackages = useMemo(() => availablePackages.filter(p => p.itemType === 'mini' && !p.isSpecial && !p.isPartyPlatter), [availablePackages]);
    const fullPackages = useMemo(() => availablePackages.filter(p => p.itemType === 'full' && !p.isSpecial && !p.isPartyPlatter), [availablePackages]);
    const specialPackages = useMemo(() => availablePackages.filter(p => p.isSpecial && !p.isPartyPlatter), [availablePackages]);
    const platterPackages = useMemo(() => availablePackages.filter(p => p.isPartyPlatter), [availablePackages]);

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
        
        // Generate slots even if closed/full to populate dropdown (warning shown separately)
        // If it's a closed day, customHours might be undefined, so we fallback to global. 
        // This ensures times are "available" even on closed days as requested.
        const start = override?.customHours?.start || scheduling.startTime;
        const end = override?.customHours?.end || scheduling.endTime;
        
        const allSlots = generateTimeSlots(dateStr, start, end, scheduling.intervalMinutes);
        
        const busyForDate = busySlots
            .filter(s => s.date === dateStr)
            .map(s => s.time);
            
        return allSlots.filter(t => !busyForDate.includes(t));
    }, [pickupDate, scheduling, busySlots]);
    
    // Check if date is restricted for UI warning
    const isDateRestricted = useMemo(() => {
        if (!pickupDate || !scheduling?.enabled) return false;
        
        // Check overrides
        const dateStr = normalizeDateStr(pickupDate);
        const override = scheduling.dateOverrides?.[dateStr];
        if (override?.isClosed || override?.isFull) return true;

        // Check regular closed days (e.g., Sundays)
        const dateObj = new Date(dateStr + 'T00:00:00');
        const dayIndex = dateObj.getDay();
        if (scheduling.closedDays?.includes(dayIndex) && !override) return true;

        return false;
    }, [pickupDate, scheduling]);

    // Totals Calculation
    const { finalItems, totalMini, totalFull, estimatedTotal } = useMemo(() => {
        // Flatten Packages into Items
        const flatItems: OrderItem[] = [];
        let runningTotal = 0;

        // Process Packages
        cartPackages.forEach(pkg => {
            runningTotal += pkg.totalPrice;
            pkg.items.forEach(pkgItem => {
                // Check if this flavor already exists in flatItems to merge counts (good for database compactness)
                const existing = flatItems.find(i => i.name === pkgItem.name);
                if (existing) {
                    existing.quantity += pkgItem.quantity;
                } else {
                    flatItems.push({ name: pkgItem.name, quantity: pkgItem.quantity });
                }
            });
        });

        // Process Salsas
        Object.entries(cartSalsas).forEach(([name, quantity]) => {
            if (quantity > 0) {
                flatItems.push({ name, quantity });
                const salsaDef = pricing?.salsas?.find(s => s.name === name);
                if (salsaDef) {
                    runningTotal += quantity * salsaDef.price;
                }
            }
        });

        // Counts
        const miniCount = flatItems
            .filter(i => !i.name.startsWith('Full ') && !pricing?.salsas?.some(s => s.name === i.name))
            .reduce((sum, i) => sum + i.quantity, 0);

        const fullCount = flatItems
            .filter(i => i.name.startsWith('Full '))
            .reduce((sum, i) => sum + i.quantity, 0);

        return { finalItems: flatItems, totalMini: miniCount, totalFull: fullCount, estimatedTotal: runningTotal };
    }, [cartPackages, cartSalsas, pricing]);

    // --- Handlers ---

    const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhoneNumber(formatted);
    };

    const updateSalsaCart = (name: string, delta: number) => {
        setCartSalsas(prev => {
            const current = prev[name] || 0;
            const next = Math.max(0, current + delta);
            const newCart = { ...prev, [name]: next };
            if (next === 0) delete newCart[name];
            return newCart;
        });
    };

    const handlePackageConfirm = (items: { name: string; quantity: number }[]) => {
        if (!activePackageBuilder) return;

        // Calculate Surcharges
        let surchargeTotal = 0;
        const normalizedItems = items.map(item => {
            // Check for Full Size naming convention
            let flavorName = item.name;
            const isFullSizePackage = activePackageBuilder.itemType === 'full' && !activePackageBuilder.isSpecial;
            const isSpecialFlavor = specialFlavors.some(f => f.name === item.name); // Don't prepend Full to Specials if they are already unique
            
            // Standardize name for "Full" if needed
            if (isFullSizePackage && !item.name.startsWith('Full ') && !isSpecialFlavor) {
                flavorName = `Full ${item.name}`;
            }

            // Find surcharge info
            // We check both the raw name and the display name
            const flavorDef = [...empanadaFlavors, ...fullSizeEmpanadaFlavors].find(f => f.name === item.name || f.name === flavorName);
            if (flavorDef && flavorDef.surcharge) {
                surchargeTotal += (item.quantity * flavorDef.surcharge);
            }

            return { name: flavorName, quantity: item.quantity };
        });

        const newPackage: SelectedPackage = {
            internalId: Date.now().toString() + Math.random().toString().slice(2, 6),
            pkgId: activePackageBuilder.id,
            name: activePackageBuilder.name,
            basePrice: activePackageBuilder.price,
            totalPrice: activePackageBuilder.price + surchargeTotal,
            items: normalizedItems
        };

        setCartPackages(prev => [...prev, newPackage]);
        setActivePackageBuilder(null);
        
        // Smoothly scroll to the "Your Selection" area so user sees the added item and form on mobile
        setTimeout(() => {
            const section = document.getElementById('your-selection');
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 500);
    };

    const removePackageFromCart = (internalId: string) => {
        setCartPackages(prev => prev.filter(p => p.internalId !== internalId));
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

    // Scroll to the "Your Selection" section
    const scrollToSelection = () => {
        const section = document.getElementById('your-selection');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // (Review handler kept but not used; your button now goes straight to final submit)
    const handleReview = (e?: React.SyntheticEvent) => {
        if (e) e.preventDefault();
        setError(null);

        if (activePackageBuilder) {
            alert("Please finish customizing your package first.");
            const section = document.getElementById('order-section');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        if (cartPackages.length === 0 && Object.keys(cartSalsas).length === 0) {
            setError("Please add items to your order.");
            window.scrollTo(0,0);
            return;
        }

        setIsReviewing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Final Submit - Validation
    const handleFinalSubmit = async () => {
        setError(null);

        // Validation Checks
        if (!customerName.trim()) { setError("Please enter your name."); return; }
        if (!phoneNumber.trim()) { setError("Please enter your phone number."); return; }
        if (!pickupDate) { setError("Please select a pickup date."); return; }
        if (!pickupTime) { setError("Please select a pickup time."); return; }
        if (deliveryRequired && !deliveryAddress.trim()) { setError("Please enter a delivery address."); return; }

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

            // After success screen is rendered, compute its offset and tell parent
            setTimeout(() => {
                if (typeof window === 'undefined') return;

                const successEl = document.getElementById('order-success');
                const successTop = successEl
                    ? successEl.getBoundingClientRect().top + window.scrollY
                    : 0;

                if (window.parent && window.parent !== window) {
                    window.parent.postMessage(
                        { type: 'orderSubmitted', successTop },
                        '*'
                    );
                } else {
                    // Direct view fallback: scroll this window to the success section
                    if (successEl) {
                        successEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }
            }, 100);

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
            <div id="order-success" className="min-h-screen bg-brand-cream flex items-center justify-center p-4 pb-20">
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

    return (
        <div className="min-h-screen bg-brand-cream font-sans">
            {/* Elegant Header */}
            <div className="bg-white shadow-sm border-b border-brand-tan sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {/* Use logo image if available, else text */}
                        <img src="/logo.png" alt="EBR" className="h-10 w-auto object-contain hidden sm:block" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        <h1 className="text-2xl font-serif text-brand-brown font-bold tracking-tight">Empanadas by Rose</h1>
                    </div>
                    
                    {(cartPackages.length > 0 || Object.keys(cartSalsas).length > 0) && (
                        <div 
                            className="flex items-center gap-3 animate-fade-in cursor-pointer group" 
                            onClick={scrollToSelection}
                            title="View Your Selection"
                        >
                            <div className="text-right hidden sm:block">
                                <span className="block text-xs text-gray-500 uppercase tracking-wider group-hover:text-brand-orange transition-colors">Estimated Total</span>
                                <span className="block text-lg font-serif font-bold text-brand-orange leading-none">{formatPrice(estimatedTotal)}</span>
                            </div>
                            <div className="bg-brand-orange text-white px-3 py-2 rounded-lg shadow-sm flex items-center gap-2 group-hover:bg-opacity-90 transition-all">
                                <ShoppingBagIcon className="w-5 h-5" />
                                <span className="font-bold">{cartPackages.length + Object.values(cartSalsas).reduce((a,b)=>a+b, 0)}</span>
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

            <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-10 pb-[600px]">
                
                {/* 1. Menu & Flavors (Visual) */}
                <section className="space-y-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-serif text-brand-brown">Our Menu</h2>
                        <div className="h-1 w-20 bg-brand-orange mx-auto rounded-full"></div>
                        <p className="text-gray-500 font-light max-w-lg mx-auto">Explore our delicious variety of handmade empanadas.</p>
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
                            <div>
                                <h2 className="text-2xl font-serif text-brand-brown">Pre-Order Here</h2>
                                <p className="text-xs text-gray-500 mt-1 font-medium">Choose a package below to start your order. Please allow 2-3 days pre-order.</p>
                            </div>
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

                                {/* Party Platters */}
                                {platterPackages.length > 0 && (
                                    <div>
                                        <h3 className="text-xl font-serif text-emerald-900 mb-4 pb-2 border-b border-emerald-100 flex items-center gap-2">
                                            <span className="bg-emerald-600 w-2 h-2 rounded-full inline-block"></span>
                                            Party Platters
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {platterPackages.map(pkg => (
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

                {/* 3. Extras & Salsas - TIGHTER */}
                {!activePackageBuilder && availableSalsas.length > 0 && (
                    <section className="bg-white p-3 rounded-xl shadow-sm border border-brand-tan">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="bg-brand-orange/10 text-brand-orange p-1.5 rounded-lg">
                                <PlusIcon className="w-4 h-4" />
                            </div>
                            <h2 className="text-lg font-serif text-brand-brown">Extras</h2>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {availableSalsas.map(salsa => (
                                <div key={salsa.id} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                                    <div className="pr-4">
                                        <p className="font-serif font-bold text-brand-brown text-sm">{salsa.name}</p>
                                        {salsa.description && <p className="text-[10px] text-gray-500 mt-0.5 font-light italic">{salsa.description}</p>}
                                        <p className="text-[10px] text-brand-orange font-bold mt-0.5">${salsa.price.toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
                                        <button onClick={() => updateSalsaCart(salsa.name, -1)} className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-gray-500 hover:text-brand-brown shadow-sm border border-gray-200 transition-colors"><MinusIcon className="w-2.5 h-2.5"/></button>
                                        <span className="w-5 text-center font-bold text-brand-brown text-xs">{cartSalsas[salsa.name] || 0}</span>
                                        <button onClick={() => updateSalsaCart(salsa.name, 1)} className="w-6 h-6 bg-brand-brown text-white rounded-md flex items-center justify-center hover:bg-brand-orange shadow-sm transition-colors"><PlusIcon className="w-2.5 h-2.5"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 3.5. Order Summary (Refactored) */}
                {!activePackageBuilder && (cartPackages.length > 0 || Object.keys(cartSalsas).length > 0) && (
                    <section id="your-selection" className="bg-white rounded-xl shadow-2xl border-4 border-brand-orange/30 relative overflow-hidden animate-fade-in ring-4 ring-brand-orange/10 transform transition-all duration-300">
                        {/* Distinct Header - TIGHTER (p-3) */}
                        <div className="bg-brand-orange/10 p-3 border-b border-brand-orange/20 flex items-center gap-3 relative z-10">
                            <div className="bg-brand-orange text-white p-2 rounded-full shadow-lg">
                                <ListBulletIcon className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-serif text-brand-brown font-bold">Your Selection</h2>
                        </div>
                        
                        <div className="p-3 md:p-4 relative z-10">
                            {/* Packages List - TIGHTER spacing */}
                            <div className="space-y-2 mb-3">
                                {cartPackages.map((pkg) => (
                                    <div key={pkg.internalId} className="bg-gray-50 rounded-lg p-2 border border-gray-200 shadow-sm relative group">
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <h4 className="font-serif font-bold text-brand-brown text-sm">{pkg.name}</h4>
                                                <span className="text-xs font-bold text-brand-orange">{formatPrice(pkg.totalPrice)}</span>
                                            </div>
                                            <button 
                                                onClick={() => removePackageFromCart(pkg.internalId)} 
                                                className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-full transition-colors"
                                                title="Remove Package"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="text-xs text-gray-600 bg-white p-1.5 rounded border border-gray-100">
                                            <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                                {pkg.items.map((item, idx) => (
                                                    <li key={idx} className="flex justify-between border-b border-gray-50 last:border-0 py-0.5">
                                                        <span>{item.name.replace('Full ', '')}</span>
                                                        <span className="font-bold">x {item.quantity}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Salsas List */}
                            {Object.keys(cartSalsas).length > 0 && (
                                <div className="border-t-2 border-dashed border-gray-200 pt-2 mb-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Extras</h4>
                                    <div className="space-y-1">
                                        {Object.entries(cartSalsas).map(([name, quantity]) => (
                                            <div key={name} className="flex items-center justify-between bg-brand-tan/20 p-1.5 rounded-lg border border-brand-tan/50">
                                                <span className="font-medium text-brand-brown text-xs">{name}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <button 
                                                        onClick={() => updateSalsaCart(name, -1)} 
                                                        className="w-5 h-5 flex items-center justify-center bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                                                    >
                                                        <MinusIcon className="w-2.5 h-2.5"/>
                                                    </button>
                                                    <span className="font-bold text-brand-brown w-3 text-center text-xs">{quantity}</span>
                                                    <button 
                                                        onClick={() => updateSalsaCart(name, 1)} 
                                                        className="w-5 h-5 flex items-center justify-center bg-white border border-gray-300 rounded text-brand-orange hover:bg-orange-50"
                                                    >
                                                        <PlusIcon className="w-2.5 h-2.5"/>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Total Footer - TIGHTER */}
                            <div className="flex justify-between items-center pt-3 border-t-2 border-brand-brown/10 mt-2 bg-brand-orange/5 -mx-3 -mb-3 md:-mx-4 md:-mb-4 p-3 md:p-4">
                                <span className="text-brand-brown/70 font-bold uppercase tracking-widest text-xs">Estimated Total</span>
                                <span className="text-2xl font-serif font-bold text-brand-orange drop-shadow-sm">{formatPrice(estimatedTotal)}</span>
                            </div>
                        </div>
                    </section>
                )}

                {/* 4. Customer Details Form - TIGHTER */}
                {!activePackageBuilder && (
                    <section className="bg-white p-4 rounded-xl shadow-lg border-t-4 border-brand-brown">
                        {error && !isReviewing && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4 flex items-start gap-2">
                                <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-medium">{error}</p>
                            </div>
                        )}
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-brand-brown text-white p-1 rounded-lg">
                                <UserIcon className="w-4 h-4" />
                            </div>
                            <h2 className="text-lg font-serif text-brand-brown">Your Details</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div className="space-y-0.5">
                                <label className="block text-[10px] font-bold text-brand-brown uppercase tracking-wider">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    className="w-full rounded border-gray-300 focus:ring-brand-orange focus:border-brand-orange bg-brand-cream/30 py-1.5 text-sm"
                                    placeholder="Enter your name"
                                />
                            </div>
                            <div className="space-y-0.5">
                                <label className="block text-[10px] font-bold text-brand-brown uppercase tracking-wider">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={phoneNumber}
                                    onChange={handlePhoneNumberChange}
                                    className="w-full rounded border-gray-300 focus:ring-brand-orange focus:border-brand-orange bg-brand-cream/30 py-1.5 text-sm"
                                    placeholder="(555) 123-4567"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-0.5">
                                <label className="block text-[10px] font-bold text-brand-brown uppercase tracking-wider">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full rounded border-gray-300 focus:ring-brand-orange focus:border-brand-orange bg-brand-cream/30 py-1.5 text-sm"
                                    placeholder="For order confirmation"
                                />
                            </div>
                        </div>

                        <div className="border-t border-gray-100 my-4 pt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="bg-brand-brown text-white p-1 rounded-lg">
                                    <CalendarIcon className="w-4 h-4" />
                                </div>
                                <h2 className="text-lg font-serif text-brand-brown">Pickup & Delivery</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-0.5">
                                    <label className="block text-[10px] font-bold text-brand-brown uppercase tracking-wider">
                                        Date <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="date" 
                                        required 
                                        value={pickupDate} 
                                        onChange={e => { setPickupDate(e.target.value); setPickupTime(''); }} 
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full rounded border-gray-300 focus:ring-brand-orange focus:border-brand-orange bg-brand-cream/30 py-1.5 text-sm" 
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="block text-[10px] font-bold text-brand-brown uppercase tracking-wider">
                                        Time <span className="text-red-500">*</span>
                                    </label>
                                    <select 
                                        required 
                                        value={pickupTime} 
                                        onChange={e => setPickupTime(e.target.value)} 
                                        disabled={!pickupDate}
                                        className="w-full rounded border-gray-300 focus:ring-brand-orange focus:border-brand-orange bg-brand-cream/30 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                                    >
                                        <option value="">Select Time</option>
                                        {timeSlots.map(slot => (
                                            <option key={slot} value={slot}>{slot}</option>
                                        ))}
                                    </select>
                                    {/* WARNING MESSAGE FOR RESTRICTED DATES */}
                                    {pickupDate && isDateRestricted && (
                                        <p className="text-[10px] text-red-500 mt-0.5 font-medium bg-red-50 p-1 rounded border border-red-100">
                                            Limited availability! We will contact you for availability.
                                        </p>
                                    )}
                                </div>
                                
                                <div className="md:col-span-2 pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer p-2 border border-brand-tan rounded hover:bg-brand-cream transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={deliveryRequired}
                                            onChange={e => setDeliveryRequired(e.target.checked)}
                                            className="h-4 w-4 rounded text-brand-orange focus:ring-brand-orange border-gray-300"
                                        />
                                        <span className="font-bold text-brand-brown text-sm">Request Delivery?</span>
                                    </label>
                                    
                                    {deliveryRequired && (
                                        <div className="relative mt-2 animate-fade-in">
                                            <label className="block text-[10px] font-bold text-brand-brown uppercase tracking-wider mb-0.5">
                                                Delivery Address <span className="text-red-500">*</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                required={deliveryRequired} 
                                                value={deliveryAddress} 
                                                onChange={handleAddressChange}
                                                placeholder="123 Main St, Town, NY"
                                                className="w-full rounded border-gray-300 focus:ring-brand-orange focus:border-brand-orange bg-brand-cream/30 py-1.5 text-sm" 
                                            />
                                            {addressSuggestions.length > 0 && (
                                                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-xl max-h-40 overflow-y-auto mt-0.5">
                                                    {addressSuggestions.map((s, i) => (
                                                        <li
                                                            key={i}
                                                            onClick={() => { setDeliveryAddress(s); setAddressSuggestions([]); }}
                                                            className="px-3 py-2 hover:bg-brand-cream cursor-pointer text-xs border-b border-gray-50 last:border-0 text-gray-700"
                                                        >
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

                        <div className="border-t border-gray-100 my-4 pt-4">
                            <label className="block text-[10px] font-bold text-brand-brown uppercase tracking-wider mb-1">
                                Special Instructions / Allergies
                            </label>
                            <textarea 
                                rows={2} 
                                value={specialInstructions}
                                onChange={e => setSpecialInstructions(e.target.value)}
                                className="w-full rounded border-gray-300 focus:ring-brand-orange focus:border-brand-orange bg-brand-cream/30 p-2 text-sm"
                                placeholder="Let us know if you have any special requests..."
                            />
                        </div>

                        <button
                            onClick={() => handleFinalSubmit()}
                            className="w-full bg-brand-orange text-white font-bold text-lg py-3 rounded-xl shadow-lg hover:bg-opacity-90 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.99] flex justify-center items-center gap-3 uppercase tracking-widest mt-2"
                        >
                            <span>Submit Order</span>
                            <span className="bg-white/20 px-3 py-0.5 rounded text-base font-serif">
                                ${estimatedTotal.toFixed(2)}
                            </span>
                        </button>
                    </section>
                )}

            </main>
        </div>
    );
}
