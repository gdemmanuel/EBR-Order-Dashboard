
import React, { useState, useEffect, useMemo } from 'react';
import { saveOrderToDb, AppSettings } from '../services/dbService';
import { Order, OrderItem, PaymentStatus, FollowUpStatus, ApprovalStatus, PricingSettings, Flavor, MenuPackage, SalsaProduct } from '../types';
import { SalsaSize } from '../config';
import { TrashIcon, CheckCircleIcon, StarIcon, ChevronRightIcon, ClockIcon } from './icons/Icons';
import Header from './Header';
import PackageBuilderModal from './PackageBuilderModal';
import { generateTimeSlots, normalizeDateStr } from '../utils/dateUtils';

interface CustomerOrderPageProps {
    empanadaFlavors: Flavor[];
    fullSizeEmpanadaFlavors: Flavor[];
    pricing?: PricingSettings;
    scheduling?: AppSettings['scheduling'];
    busySlots?: { date: string; time: string }[];
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

export default function CustomerOrderPage({ empanadaFlavors, fullSizeEmpanadaFlavors, pricing, scheduling, busySlots = [] }: CustomerOrderPageProps) {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    // --- Scheduling Logic ---
    const availableTimeSlots = useMemo(() => {
        if (!pickupDate || !scheduling || !scheduling.enabled) return [];

        const normalizedDate = normalizeDateStr(pickupDate); // ensure YYYY-MM-DD

        // Check blocked dates
        if (scheduling.blockedDates.includes(normalizedDate)) {
            return [];
        }

        // Generate slots
        const slots = generateTimeSlots(normalizedDate, scheduling.startTime, scheduling.endTime, scheduling.intervalMinutes);

        // Filter out busy slots
        // Compare standard time strings "HH:MM AM/PM"
        const todaysBusyTimes = new Set(
            busySlots
                .filter(slot => slot.date === normalizedDate)
                .map(slot => slot.time)
        );

        return slots.filter(time => !todaysBusyTimes.has(time));
    }, [pickupDate, scheduling, busySlots]);

    // --- Calculate Estimated Total ---
    useEffect(() => {
        const packagesTotal = cartPackages.reduce((sum, p) => sum + p.price, 0);
        let surchargeTotal = 0;
        cartPackages.forEach(pkg => {
            pkg.items.forEach(item => {
                const miniFlavor = empanadaFlavors.find(f => f.name === item.name);
                if (miniFlavor && miniFlavor.surcharge) surchargeTotal += (item.quantity * miniFlavor.surcharge);
                const fullFlavor = fullSizeEmpanadaFlavors.find(f => f.name === item.name);
                if (fullFlavor && fullFlavor.surcharge) surchargeTotal += (item.quantity * fullFlavor.surcharge);
            });
        });
        const salsaTotal = salsaItems.filter(s => s.checked).reduce((sum, s) => sum + (s.quantity * s.price), 0);
        setEstimatedTotal(packagesTotal + salsaTotal + surchargeTotal);
    }, [cartPackages, salsaItems, safePricing, empanadaFlavors, fullSizeEmpanadaFlavors]);

    // --- Package Builder Logic ---
    const openPackageBuilder = (pkg: MenuPackage) => { setActivePackageBuilder(pkg); };
    const handlePackageConfirm = (items: { name: string; quantity: number }[]) => { if (!activePackageBuilder) return; const newCartItem: CartPackage = { id: Date.now().toString(), packageId: activePackageBuilder.id, name: activePackageBuilder.name, price: activePackageBuilder.price, items: items }; setCartPackages([...cartPackages, newCartItem]); setActivePackageBuilder(null); };
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
                    if (isFullPackage && !finalName.startsWith('Full ')) finalName = `Full ${finalName}`;
                    const existing = allEmpanadas.find(i => i.name === finalName);
                    if (existing) existing.quantity += item.quantity; else allEmpanadas.push({ ...item, name: finalName });
                });
            });

            const salsaOrderItems: OrderItem[] = salsaItems.filter(s => s.checked && s.quantity > 0).map(salsa => ({ name: salsa.name, quantity: salsa.quantity }));
            const finalItems = [...allEmpanadas, ...salsaOrderItems];

            if (finalItems.length === 0) throw new Error("Please add at least one package or item to your order.");

            // Check if date is blocked (double check)
            if (scheduling?.enabled && scheduling.blockedDates.includes(normalizeDateStr(pickupDate))) {
                throw new Error("Sorry, this date is unavailable. Please select another date.");
            }

            // Check if time slot is still valid (simple check)
            // Ideally would check against DB again, but this is a basic check
            if (scheduling?.enabled && busySlots.some(s => s.date === normalizeDateStr(pickupDate) && s.time === pickupTime)) {
                throw new Error("Sorry, that time slot was just taken. Please select another time.");
            }

            const formattedDate = pickupDate ? `${pickupDate.split('-')[1]}/${pickupDate.split('-')[2]}/${pickupDate.split('-')[0]}` : '';
            
            // Reformat 24h time from native picker if not using smart scheduling, OR use existing 12h from dropdown
            let formattedTime = pickupTime;
            if (!scheduling?.enabled && pickupTime.includes(':') && !pickupTime.includes('M')) {
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
                pickupTime: formattedTime,
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
                        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircleIcon className="w-12 h-12 text-green-600" /></div>
                        <h2 className="text-3xl font-serif text-brand-brown mb-4">Order Received!</h2>
                        <p className="text-brand-brown/80 mb-8 text-lg">Thank you, {customerName}! We have received your order request. We will contact you shortly at <strong>{phoneNumber}</strong> to confirm details and arrange payment.</p>
                        <button onClick={() => window.location.reload()} className="bg-brand-orange text-white font-semibold px-6 py-3 rounded-lg hover:bg-opacity-90 transition-colors">Place Another Order</button>
                    </div>
                </div>
            </div>
        );
    }
    
    const miniPackages = safePricing.packages?.filter(p => p.itemType === 'mini' && p.visible && !p.isSpecial) || [];
    const fullPackages = safePricing.packages?.filter(p => p.itemType === 'full' && p.visible && !p.isSpecial) || [];
    const specialPackages = safePricing.packages?.filter(p => p.visible && p.isSpecial) || [];
    const allVisibleFlavors = empanadaFlavors.filter(f => f.visible);
    const standardFlavors = allVisibleFlavors.filter(f => !f.isSpecial);
    const specialFlavors = allVisibleFlavors.filter(f => f.isSpecial);

    return (
        <div className="min-h-screen bg-brand-cream">
            <Header variant="public" />
            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-serif text-brand-brown mb-3">Place Your Order</h2>
                    <p className="text-brand-brown/70 max-w-lg mx-auto">Choose from our delicious packages. Everything is made fresh to order!</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <section className="bg-white p-8 rounded-xl shadow-sm border border-brand-tan">
                        <h3 className="text-2xl font-serif text-brand-brown mb-6 text-center">Our Menu</h3>
                        <div className="space-y-8">
                            <div>
                                <h4 className="text-lg font-bold text-brand-orange uppercase tracking-wider mb-4 text-center sm:text-left">Empanada Flavors</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {standardFlavors.map(f => (
                                        <div key={f.name} className="p-3 border-b border-brand-tan/50 sm:border sm:rounded-lg sm:bg-brand-cream/20 hover:bg-brand-cream/40 transition-colors"><div className="flex justify-between items-baseline"><span className="font-bold text-brand-brown text-sm">{f.name}</span></div>{f.description && <p className="text-xs text-gray-500 mt-1 leading-tight">{f.description}</p>}</div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-4 text-center sm:text-left">* Flavors available for both Mini and Full-Size empanadas.</p>
                            </div>
                            {specialFlavors.length > 0 && (
                                <details className="group bg-purple-50 rounded-lg border border-purple-100 overflow-hidden">
                                    <summary className="list-none cursor-pointer flex items-center justify-between p-4 font-semibold text-purple-900 hover:bg-purple-100 transition-colors"><div className="flex items-center gap-2"><StarIcon className="w-5 h-5 text-purple-600" /><span>Specialty Flavors & Platters</span></div><ChevronRightIcon className="w-5 h-5 transition-transform group-open:rotate-90 text-purple-400" /></summary>
                                    <div className="p-4 border-t border-purple-100 animate-fade-in"><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">{specialFlavors.map(f => (<div key={f.name} className="p-3 bg-white rounded-lg border border-purple-100 shadow-sm"><div className="font-bold text-purple-900 text-sm">{f.name}</div>{f.description && <p className="text-xs text-gray-500 mt-1 leading-tight">{f.description}</p>}</div>))}</div></div>
                                </details>
                            )}
                        </div>
                    </section>
                    
                    <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-tan"><h3 className="text-xl font-serif text-brand-brown mb-4 border-b border-brand-tan pb-2">Mini Empanadas</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{miniPackages.map(pkg => (<div key={pkg.id} className="border border-brand-tan rounded-lg p-4 hover:shadow-md transition-shadow bg-brand-cream/30 flex flex-col justify-between"><div><h4 className="font-bold text-brand-brown text-lg">{pkg.name}</h4><p className="text-sm text-gray-600 mb-2">{pkg.quantity} Mini Empanadas</p><p className="text-xs text-gray-500">Select up to {pkg.maxFlavors} flavors</p></div><div className="mt-4 flex items-center justify-between"><span className="font-bold text-xl text-brand-orange">${pkg.price.toFixed(2)}</span><button type="button" onClick={() => openPackageBuilder(pkg)} className="bg-brand-brown text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-90 transition-colors">Select</button></div></div>))}{miniPackages.length === 0 && <p className="col-span-2 text-sm text-gray-500 italic">No mini packages available.</p>}</div></section>
                    <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-tan"><h3 className="text-xl font-serif text-brand-brown mb-4 border-b border-brand-tan pb-2">Full-Size Empanadas</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{fullPackages.map(pkg => (<div key={pkg.id} className="border border-brand-tan rounded-lg p-4 hover:shadow-md transition-shadow bg-brand-cream/30 flex flex-col justify-between"><div><h4 className="font-bold text-brand-brown text-lg">{pkg.name}</h4><p className="text-sm text-gray-600 mb-2">{pkg.quantity} Full-Size Empanadas</p><p className="text-xs text-gray-500">Select up to {pkg.maxFlavors} flavors</p></div><div className="mt-4 flex items-center justify-between"><span className="font-bold text-xl text-brand-orange">${pkg.price.toFixed(2)}</span><button type="button" onClick={() => openPackageBuilder(pkg)} className="bg-brand-brown text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-90 transition-colors">Select</button></div></div>))}{fullPackages.length === 0 && <p className="col-span-2 text-sm text-gray-500 italic">No full-size packages available.</p>}</div></section>
                     {(specialPackages.length > 0) && (<section className="bg-purple-50 p-6 rounded-xl shadow-sm border border-purple-200"><div className="flex items-center gap-2 mb-4 border-b border-purple-200 pb-2"><StarIcon className="w-5 h-5 text-purple-600" /><h3 className="text-xl font-serif text-purple-900">Party Platters & Specials</h3></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{specialPackages.map(pkg => (<div key={pkg.id} className="border border-purple-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white flex flex-col justify-between"><div><h4 className="font-bold text-purple-900 text-lg">{pkg.name}</h4><p className="text-sm text-gray-600 mb-2">{pkg.quantity} {pkg.itemType === 'mini' ? 'Mini' : 'Full-Size'} Items</p><p className="text-xs text-purple-600 font-medium">Special Item</p></div><div className="mt-4 flex items-center justify-between"><span className="font-bold text-xl text-brand-orange">${pkg.price.toFixed(2)}</span><button type="button" onClick={() => openPackageBuilder(pkg)} className="bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-800 transition-colors">Select</button></div></div>))}</div></section>)}

                    {cartPackages.length > 0 && (<div className="bg-gray-50 rounded-lg p-4 border border-gray-200"><h4 className="font-bold text-brand-brown mb-3">Your Selections</h4><div className="space-y-3">{cartPackages.map((item, idx) => (<div key={item.id} className="flex justify-between items-start bg-white p-3 rounded border border-gray-200"><div><p className="font-bold text-brand-brown">{item.name}</p><p className="text-xs text-gray-500">{item.items.map(i => `${i.quantity} ${i.name}`).join(', ')}</p></div><div className="flex items-center gap-3"><span className="font-medium">${item.price.toFixed(2)}</span><button type="button" onClick={() => removeCartPackage(item.id)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button></div></div>))}</div></div>)}

                    <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-tan"><h3 className="text-xl font-serif text-brand-brown mb-4 border-b border-brand-tan pb-2">Add Salsa & Extras (Optional)</h3><div className="space-y-2">{salsaItems.length > 0 ? (salsaItems.map((salsa, idx) => (<div key={salsa.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"><div className="flex items-center"><input type="checkbox" checked={salsa.checked} onChange={e => handleSalsaChange(idx, 'checked', e.target.checked)} className="h-5 w-5 text-brand-orange rounded focus:ring-brand-orange border-gray-300" /><span className="ml-2 text-brand-brown font-medium">{salsa.name} <span className="text-gray-500 font-normal text-sm">(${salsa.price.toFixed(2)})</span></span></div>{salsa.checked && (<div className="flex gap-2 items-center"><span className="text-xs">Qty:</span><input type="number" min="1" value={salsa.quantity} onChange={e => handleSalsaChange(idx, 'quantity', parseInt(e.target.value))} className="w-16 rounded-md border-gray-300 text-xs focus:ring-brand-orange focus:border-brand-orange py-1" /></div>)}</div>))) : (<p className="text-sm text-gray-500 italic">No extras available.</p>)}</div></section>

                    {/* Step 5: Info */}
                    <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-tan">
                        <h3 className="text-xl font-serif text-brand-brown mb-4 border-b border-brand-tan pb-2">Your Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2"><label className="block text-sm font-medium text-brand-brown/80 mb-1">Full Name</label><input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" /></div>
                            <div><label className="block text-sm font-medium text-brand-brown/80 mb-1">Phone Number</label><input type="tel" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" /></div>
                            <div><label className="block text-sm font-medium text-brand-brown/80 mb-1">Email Address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" /></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-brown/80 mb-1">Preferred Date</label>
                                <input type="date" required value={pickupDate} onChange={e => { setPickupDate(e.target.value); setPickupTime(''); }} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-brown/80 mb-1">Preferred Time</label>
                                {scheduling?.enabled ? (
                                    <div className="relative">
                                        <select 
                                            required 
                                            value={pickupTime} 
                                            onChange={e => setPickupTime(e.target.value)} 
                                            disabled={!pickupDate || availableTimeSlots.length === 0}
                                            className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange appearance-none"
                                        >
                                            <option value="">Select a time</option>
                                            {availableTimeSlots.map(time => (
                                                <option key={time} value={time}>{time}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                            <ClockIcon className="w-5 h-5 text-gray-400" />
                                        </div>
                                        {pickupDate && availableTimeSlots.length === 0 && !scheduling.blockedDates.includes(normalizeDateStr(pickupDate)) && (
                                            <p className="text-xs text-red-500 mt-1">No time slots available for this date.</p>
                                        )}
                                        {pickupDate && scheduling.blockedDates.includes(normalizeDateStr(pickupDate)) && (
                                            <p className="text-xs text-red-500 mt-1">This date is unavailable.</p>
                                        )}
                                    </div>
                                ) : (
                                    <input type="time" required value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" />
                                )}
                            </div>
                        </div>

                         <div className="flex items-start gap-3 mt-4 p-3 bg-blue-50 rounded-lg"><input type="checkbox" id="delivery" checked={deliveryRequired} onChange={e => setDeliveryRequired(e.target.checked)} className="mt-1 h-5 w-5 text-brand-orange rounded focus:ring-brand-orange border-gray-300" /><div><label htmlFor="delivery" className="font-medium text-brand-brown">I need this delivered</label><p className="text-xs text-gray-500">Delivery fees apply based on location.</p></div></div>
                        {deliveryRequired && (<div className="mt-2 animate-fade-in"><label className="block text-sm font-medium text-brand-brown/80 mb-1">Delivery Address</label><input type="text" required={deliveryRequired} value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" /></div>)}
                        <div className="mt-4"><label className="block text-sm font-medium text-brand-brown/80 mb-1">Special Instructions</label><textarea rows={2} value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" /></div>
                    </section>

                    {/* Footer Total */}
                    <div className="bg-brand-brown text-brand-cream p-6 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4 sticky bottom-4 z-10">
                        <div className="text-center sm:text-left"><p className="text-sm opacity-80">Estimated Total</p><p className="text-3xl font-bold">${estimatedTotal.toFixed(2)}*</p></div>
                        <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-brand-orange text-white font-bold text-lg px-8 py-3 rounded-lg hover:bg-brand-orange/90 transition-all shadow-md disabled:bg-gray-500 disabled:cursor-not-allowed">{isSubmitting ? 'Sending...' : 'Submit Order'}</button>
                    </div>
                    
                     {error && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert"><strong className="font-bold">Error: </strong><span className="block sm:inline">{error}</span></div>)}
                </form>

                {activePackageBuilder && (<PackageBuilderModal pkg={activePackageBuilder} flavors={allVisibleFlavors} onClose={() => setActivePackageBuilder(null)} onConfirm={handlePackageConfirm}/>)}
            </main>
        </div>
    );
}
