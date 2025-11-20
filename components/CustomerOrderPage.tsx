
import React, { useState, useEffect } from 'react';
import { saveOrderToDb } from '../services/dbService';
import { Order, OrderItem, PaymentStatus, FollowUpStatus, ApprovalStatus, PricingSettings, Flavor, MenuPackage, SalsaProduct } from '../types';
import { SalsaSize } from '../config';
import { TrashIcon, CheckCircleIcon } from './icons/Icons';
import Header from './Header';
import PackageBuilderModal from './PackageBuilderModal';

interface CustomerOrderPageProps {
    empanadaFlavors: Flavor[];
    fullSizeEmpanadaFlavors: Flavor[];
    pricing?: PricingSettings;
}

interface CartPackage {
    id: string; // unique ID for this item in cart
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

    // --- Calculate Estimated Total ---
    useEffect(() => {
        const packagesTotal = cartPackages.reduce((sum, p) => sum + p.price, 0);
        const salsaTotal = salsaItems
            .filter(s => s.checked)
            .reduce((sum, s) => sum + (s.quantity * s.price), 0);
        setEstimatedTotal(packagesTotal + salsaTotal);
    }, [cartPackages, salsaItems, safePricing]);

    // --- Package Builder Logic ---
    const openPackageBuilder = (pkg: MenuPackage) => {
        setActivePackageBuilder(pkg);
    };

    const handlePackageConfirm = (items: { name: string; quantity: number }[]) => {
        if (!activePackageBuilder) return;
        
        const newCartItem: CartPackage = {
            id: Date.now().toString(),
            packageId: activePackageBuilder.id,
            name: activePackageBuilder.name,
            price: activePackageBuilder.price,
            items: items
        };
        
        setCartPackages([...cartPackages, newCartItem]);
        setActivePackageBuilder(null);
    };

    const removeCartPackage = (id: string) => {
        setCartPackages(cartPackages.filter(p => p.id !== id));
    };

    const handleSalsaChange = (index: number, field: keyof DynamicSalsaState, value: any) => {
        const newSalsaItems = [...salsaItems];
        newSalsaItems[index] = { ...newSalsaItems[index], [field]: value };
        setSalsaItems(newSalsaItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            // Flatten packages into a single list of items for the order
            const allEmpanadas: OrderItem[] = [];
            cartPackages.forEach(pkg => {
                pkg.items.forEach(item => {
                    const existing = allEmpanadas.find(i => i.name === item.name);
                    if (existing) existing.quantity += item.quantity;
                    else allEmpanadas.push({ ...item });
                });
            });

            const salsaOrderItems: OrderItem[] = salsaItems
                .filter(s => s.checked && s.quantity > 0)
                .map(salsa => ({ name: salsa.name, quantity: salsa.quantity }));

            const finalItems = [...allEmpanadas, ...salsaOrderItems];

            if (finalItems.length === 0) {
                throw new Error("Please add at least one package or item to your order.");
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

            // Helper for totals
            const totalMini = cartPackages
                .filter(p => safePricing.packages?.find(def => def.id === p.packageId)?.itemType === 'mini')
                .reduce((sum, p) => {
                    const qty = safePricing.packages?.find(def => def.id === p.packageId)?.quantity || 0;
                    return sum + qty;
                }, 0);

            const totalFull = cartPackages
                .filter(p => safePricing.packages?.find(def => def.id === p.packageId)?.itemType === 'full')
                .reduce((sum, p) => {
                    const qty = safePricing.packages?.find(def => def.id === p.packageId)?.quantity || 0;
                    return sum + qty;
                }, 0);


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
                        Choose from our delicious packages. Everything is made fresh to order!
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Step 1: Packages */}
                    <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-tan">
                        <h3 className="text-xl font-serif text-brand-brown mb-4 border-b border-brand-tan pb-2">1. Choose Your Package</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            {safePricing.packages?.filter(p => p.visible).map(pkg => (
                                <div key={pkg.id} className="border border-brand-tan rounded-lg p-4 hover:shadow-md transition-shadow bg-brand-cream/30 flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-bold text-brand-brown text-lg">{pkg.name}</h4>
                                        <p className="text-sm text-gray-600 mb-2">{pkg.quantity} {pkg.itemType === 'mini' ? 'Mini' : 'Full-Size'} Empanadas</p>
                                        <p className="text-xs text-gray-500">Select up to {pkg.maxFlavors} flavors</p>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="font-bold text-xl text-brand-orange">${pkg.price.toFixed(2)}</span>
                                        <button 
                                            type="button"
                                            onClick={() => openPackageBuilder(pkg)}
                                            className="bg-brand-brown text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-90 transition-colors"
                                        >
                                            Select
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {(!safePricing.packages || safePricing.packages.filter(p => p.visible).length === 0) && (
                                <div className="col-span-2 text-center py-8 text-gray-500">
                                    No packages available at the moment.
                                </div>
                            )}
                        </div>

                        {/* Flavors Preview */}
                         <div className="mb-4">
                             <p className="text-sm font-semibold text-brand-brown mb-2">Available Flavors:</p>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                 {empanadaFlavors.filter(f => f.visible).map(f => (
                                     <div key={f.name} className="p-2 bg-gray-50 rounded">
                                         <span className="font-medium block">{f.name}</span>
                                         {f.description && <span className="text-gray-500">{f.description}</span>}
                                     </div>
                                 ))}
                             </div>
                         </div>

                        {/* Cart Summary */}
                        {cartPackages.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <h4 className="font-bold text-brand-brown mb-3">Your Selections</h4>
                                <div className="space-y-3">
                                    {cartPackages.map((item, idx) => (
                                        <div key={item.id} className="flex justify-between items-start bg-white p-3 rounded border border-gray-200">
                                            <div>
                                                <p className="font-bold text-brand-brown">{item.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {item.items.map(i => `${i.quantity} ${i.name}`).join(', ')}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium">${item.price.toFixed(2)}</span>
                                                <button type="button" onClick={() => removeCartPackage(item.id)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Step 2: Salsas */}
                    <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-tan">
                        <h3 className="text-xl font-serif text-brand-brown mb-4 border-b border-brand-tan pb-2">2. Add Salsa & Extras (Optional)</h3>
                        <div className="space-y-2">
                            {salsaItems.length > 0 ? (
                                salsaItems.map((salsa, idx) => (
                                    <div key={salsa.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div className="flex items-center">
                                            <input type="checkbox" checked={salsa.checked} onChange={e => handleSalsaChange(idx, 'checked', e.target.checked)} className="h-5 w-5 text-brand-orange rounded focus:ring-brand-orange border-gray-300" />
                                            <span className="ml-2 text-brand-brown font-medium">{salsa.name} <span className="text-gray-500 font-normal text-sm">(${salsa.price.toFixed(2)})</span></span>
                                        </div>
                                        {salsa.checked && (
                                            <div className="flex gap-2 items-center">
                                                <span className="text-xs">Qty:</span>
                                                <input type="number" min="1" value={salsa.quantity} onChange={e => handleSalsaChange(idx, 'quantity', parseInt(e.target.value))} className="w-16 rounded-md border-gray-300 text-xs focus:ring-brand-orange focus:border-brand-orange py-1" />
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 italic">No extras available.</p>
                            )}
                        </div>
                    </section>

                    {/* Step 3: Info */}
                    <section className="bg-white p-6 rounded-xl shadow-sm border border-brand-tan">
                        <h3 className="text-xl font-serif text-brand-brown mb-4 border-b border-brand-tan pb-2">3. Your Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-brand-brown/80 mb-1">Full Name</label>
                                <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-brown/80 mb-1">Phone Number</label>
                                <input type="tel" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-brown/80 mb-1">Email Address</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-brown/80 mb-1">Preferred Date</label>
                                <input type="date" required value={pickupDate} onChange={e => setPickupDate(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" />
                            </div>
                                <div>
                                <label className="block text-sm font-medium text-brand-brown/80 mb-1">Preferred Time</label>
                                <input type="time" required value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" />
                            </div>
                        </div>

                         <div className="flex items-start gap-3 mt-4 p-3 bg-blue-50 rounded-lg">
                            <input type="checkbox" id="delivery" checked={deliveryRequired} onChange={e => setDeliveryRequired(e.target.checked)} className="mt-1 h-5 w-5 text-brand-orange rounded focus:ring-brand-orange border-gray-300" />
                            <div>
                                <label htmlFor="delivery" className="font-medium text-brand-brown">I need this delivered</label>
                                <p className="text-xs text-gray-500">Delivery fees apply based on location.</p>
                            </div>
                        </div>
                        {deliveryRequired && (
                            <div className="mt-2 animate-fade-in">
                                <label className="block text-sm font-medium text-brand-brown/80 mb-1">Delivery Address</label>
                                <input type="text" required={deliveryRequired} value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" />
                            </div>
                        )}
                        
                        <div className="mt-4">
                             <label className="block text-sm font-medium text-brand-brown/80 mb-1">Special Instructions</label>
                            <textarea rows={2} value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} className="w-full rounded-lg border-gray-300 focus:ring-brand-orange focus:border-brand-orange" />
                        </div>
                    </section>

                    {/* Footer Total */}
                    <div className="bg-brand-brown text-brand-cream p-6 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4 sticky bottom-4 z-10">
                        <div className="text-center sm:text-left">
                            <p className="text-sm opacity-80">Estimated Total</p>
                            <p className="text-3xl font-bold">${estimatedTotal.toFixed(2)}*</p>
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-brand-orange text-white font-bold text-lg px-8 py-3 rounded-lg hover:bg-brand-orange/90 transition-all shadow-md disabled:bg-gray-500 disabled:cursor-not-allowed">
                            {isSubmitting ? 'Sending...' : 'Submit Order'}
                        </button>
                    </div>
                    
                     {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            <strong className="font-bold">Error: </strong><span className="block sm:inline">{error}</span>
                        </div>
                    )}
                </form>

                {/* Package Builder Modal */}
                {activePackageBuilder && (
                    <PackageBuilderModal 
                        pkg={activePackageBuilder}
                        flavors={activePackageBuilder.itemType === 'mini' ? empanadaFlavors : fullSizeEmpanadaFlavors}
                        onClose={() => setActivePackageBuilder(null)}
                        onConfirm={handlePackageConfirm}
                    />
                )}
            </main>
        </div>
    );
}
