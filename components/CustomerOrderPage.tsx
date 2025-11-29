import React, { useState, useMemo } from 'react';
import { AppSettings, saveOrderToDb } from '../services/dbService';
import { Flavor, PricingSettings, OrderItem, FollowUpStatus, ApprovalStatus, MenuPackage } from '../types';
import { calculateOrderTotal } from '../utils/pricingUtils';
import { generateTimeSlots, normalizeDateStr } from '../utils/dateUtils';
import { PlusIcon, TrashIcon, ShoppingBagIcon, XMarkIcon } from './icons/Icons';
import PackageBuilderModal from './PackageBuilderModal';

interface CustomerOrderPageProps {
    empanadaFlavors: Flavor[];
    fullSizeEmpanadaFlavors: Flavor[];
    pricing: PricingSettings;
    scheduling: AppSettings['scheduling'];
    busySlots: { date: string, time: string }[];
    motd: string;
}

// Re-implementing simplified ItemInputSection locally since it's not exported
const ItemInputSection: React.FC<{
    title: string;
    items: { name: string; quantity: number | string }[];
    flavors: Flavor[];
    onItemChange: (index: number, field: 'name' | 'quantity', value: string | number) => void;
    onAddItem: () => void;
    onRemoveItem: (index: number) => void;
    availablePackages?: MenuPackage[];
    onAddPackage: (pkg: MenuPackage) => void;
    bgColor?: string;
}> = ({ title, items, flavors, onItemChange, onAddItem, onRemoveItem, availablePackages, onAddPackage, bgColor = "bg-white" }) => {
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
                             <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg z-20">
                                {availablePackages.map(pkg => (
                                    <button 
                                        key={pkg.id} 
                                        type="button" 
                                        onClick={() => { onAddPackage(pkg); setIsPackageMenuOpen(false); }}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-50 last:border-0"
                                    >
                                        {pkg.name}
                                    </button>
                                ))}
                             </div>
                         )}
                         {isPackageMenuOpen && <div className="fixed inset-0 z-10" onClick={() => setIsPackageMenuOpen(false)}></div>}
                    </div>
                )}
            </div>
            <div className="space-y-3 pr-2 border-l-4 border-brand-tan/60 pl-3">
                {items.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select 
                            value={item.name} 
                            onChange={e => onItemChange(index, 'name', e.target.value)} 
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm bg-white text-brand-brown"
                        >
                            {flavors.map(flavor => <option key={flavor.name} value={flavor.name}>{flavor.name}</option>)}
                        </select>
                        <input 
                            type="number" 
                            min="1" 
                            value={item.quantity === 0 ? '' : item.quantity} 
                            onChange={e => onItemChange(index, 'quantity', e.target.value)} 
                            className="block w-full sm:w-24 rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm bg-white text-brand-brown" 
                            placeholder="Qty"
                        />
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

export default function CustomerOrderPage({ 
    empanadaFlavors, 
    fullSizeEmpanadaFlavors, 
    pricing,
    scheduling,
    busySlots,
    motd
}: CustomerOrderPageProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Info, 2: Order, 3: Success
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        contactMethod: 'Google Forms', // Default for web
        date: '',
        time: '',
        delivery: false,
        address: '',
        instructions: ''
    });

    const [miniItems, setMiniItems] = useState<{name: string, quantity: number | string}[]>([]);
    const [fullSizeItems, setFullSizeItems] = useState<{name: string, quantity: number | string}[]>([]);
    const [specialItems, setSpecialItems] = useState<{name: string, quantity: number | string}[]>([]);
    const [activePackageBuilder, setActivePackageBuilder] = useState<MenuPackage | null>(null);

    const availableTimeSlots = useMemo(() => {
        if (!formData.date || !scheduling?.enabled) return [];
        const normDate = normalizeDateStr(formData.date);
        
        // Check if date is blocked or closed
        if (scheduling.blockedDates?.includes(normDate)) return [];
        const dayOfWeek = new Date(formData.date + 'T00:00:00').getDay(); // 0=Sun
        if (scheduling.closedDays?.includes(dayOfWeek)) return [];
        
        const override = scheduling.dateOverrides?.[normDate];
        if (override?.isClosed) return [];

        const start = override?.customHours?.start || scheduling.startTime;
        const end = override?.customHours?.end || scheduling.endTime;

        const slots = generateTimeSlots(normDate, start, end, scheduling.intervalMinutes);
        
        // Filter out busy slots
        const busyTimes = new Set(busySlots.filter(s => s.date === normDate).map(s => s.time));
        return slots.filter(t => !busyTimes.has(t));
    }, [formData.date, scheduling, busySlots]);

    const handleAddItem = (type: 'mini' | 'full' | 'special') => {
        const newItem = { name: type === 'mini' ? empanadaFlavors[0].name : (type === 'full' ? fullSizeEmpanadaFlavors[0].name : 'Other'), quantity: 1 };
        if (type === 'mini') setMiniItems([...miniItems, newItem]);
        else if (type === 'full') setFullSizeItems([...fullSizeItems, newItem]);
        else setSpecialItems([...specialItems, newItem]);
    };

    const handleRemoveItem = (type: 'mini' | 'full' | 'special', index: number) => {
        if (type === 'mini') setMiniItems(miniItems.filter((_, i) => i !== index));
        else if (type === 'full') setFullSizeItems(fullSizeItems.filter((_, i) => i !== index));
        else setSpecialItems(specialItems.filter((_, i) => i !== index));
    };

    const handleItemChange = (type: 'mini' | 'full' | 'special', index: number, field: 'name' | 'quantity', value: string | number) => {
        const list = type === 'mini' ? miniItems : (type === 'full' ? fullSizeItems : specialItems);
        const setList = type === 'mini' ? setMiniItems : (type === 'full' ? setFullSizeItems : setSpecialItems);
        const newList = [...list];
        newList[index] = { ...newList[index], [field]: value };
        setList(newList);
    };

    const handlePackageConfirm = (items: { name: string; quantity: number }[]) => {
        if (!activePackageBuilder) return;
        const type = activePackageBuilder.itemType;
        const isSpecial = activePackageBuilder.isSpecial;
        
        // Determine target list
        let currentItems = isSpecial ? specialItems : (type === 'mini' ? miniItems : fullSizeItems);
        let setFunction = isSpecial ? setSpecialItems : (type === 'mini' ? setMiniItems : setFullSizeItems);

        const newItems = [...currentItems];
        items.forEach(newItem => {
            const existing = newItems.find(i => i.name === newItem.name);
            if (existing) {
                existing.quantity = (Number(existing.quantity) || 0) + newItem.quantity;
            } else {
                newItems.push({ name: newItem.name, quantity: newItem.quantity });
            }
        });
        setFunction(newItems);
        
        // Auto-add note for special
        if (isSpecial && !formData.instructions.includes("PARTY PLATTER")) {
            setFormData(prev => ({ ...prev, instructions: "*** PARTY PLATTER ***\n" + prev.instructions }));
        }

        setActivePackageBuilder(null);
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.name || !formData.phone || !formData.date || !formData.time) {
            alert("Please fill in all required fields.");
            return;
        }

        const allItems: OrderItem[] = [
            ...miniItems.map(i => ({ name: i.name, quantity: Number(i.quantity) })),
            ...fullSizeItems.map(i => ({ name: 'Full ' + i.name.replace('Full ', ''), quantity: Number(i.quantity) })),
            ...specialItems.map(i => ({ name: i.name, quantity: Number(i.quantity) }))
        ].filter(i => i.quantity > 0);

        if (allItems.length === 0) {
            alert("Please add at least one item.");
            return;
        }

        const totalCost = calculateOrderTotal(
            allItems, 
            formData.delivery ? 10 : 0, // Approx delivery fee for estimation
            pricing, 
            empanadaFlavors, 
            fullSizeEmpanadaFlavors
        );

        const newOrder: Order = {
            id: Date.now().toString(),
            customerName: formData.name,
            phoneNumber: formData.phone,
            contactMethod: formData.contactMethod,
            pickupDate: formData.date,
            pickupTime: formData.time,
            deliveryRequired: formData.delivery,
            deliveryAddress: formData.address,
            deliveryFee: 0, // Will be set by admin
            items: allItems,
            totalMini: miniItems.reduce((s, i) => s + Number(i.quantity), 0),
            totalFullSize: fullSizeItems.reduce((s, i) => s + Number(i.quantity), 0),
            amountCharged: totalCost,
            amountCollected: 0,
            paymentMethod: null,
            paymentStatus: null as any, // Pending
            followUpStatus: FollowUpStatus.NEEDED,
            approvalStatus: ApprovalStatus.PENDING,
            specialInstructions: formData.instructions
        };

        try {
            await saveOrderToDb(newOrder);
            setStep(3);
        } catch (e) {
            console.error(e);
            alert("Failed to submit order. Please try again.");
        }
    };

    // Render Logic
    if (step === 3) {
        return (
            <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl text-center border-t-4 border-brand-orange">
                <h2 className="text-3xl font-serif text-brand-brown mb-4">Thank You!</h2>
                <p className="text-lg text-gray-700 mb-6">Your order has been placed successfully.</p>
                <p className="text-gray-600 mb-8">Rose will review your order and contact you at <span className="font-bold">{formData.phone}</span> to confirm details and arrange payment.</p>
                <button onClick={() => window.location.reload()} className="bg-brand-orange text-white px-6 py-2 rounded-lg font-bold hover:bg-opacity-90">Place Another Order</button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <header className="text-center mb-10">
                <h1 className="text-4xl font-serif text-brand-brown mb-2">Order Online</h1>
                <p className="text-brand-brown/70">Fresh Homemade Empanadas</p>
                {motd && <div className="mt-4 bg-brand-orange/10 p-3 rounded-lg text-brand-brown text-sm font-medium">{motd}</div>}
            </header>

            <div className="space-y-8">
                {/* Step 1: Info */}
                <section className="bg-white p-6 rounded-lg shadow-sm border border-brand-tan">
                    <h2 className="text-xl font-bold text-brand-brown mb-4 flex items-center gap-2">
                        <span className="bg-brand-orange text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                        Your Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700">Name</label>
                            <input type="text" className="w-full mt-1 border-gray-300 rounded-md shadow-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700">Phone Number</label>
                            <input type="tel" className="w-full mt-1 border-gray-300 rounded-md shadow-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="(555) 555-5555" />
                        </div>
                    </div>
                </section>

                {/* Step 2: Date/Time */}
                <section className="bg-white p-6 rounded-lg shadow-sm border border-brand-tan">
                    <h2 className="text-xl font-bold text-brand-brown mb-4 flex items-center gap-2">
                        <span className="bg-brand-orange text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                        Pickup / Delivery
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-bold text-gray-700">Date</label>
                            <input type="date" className="w-full mt-1 border-gray-300 rounded-md shadow-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value, time: ''})} min={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700">Time</label>
                            <select className="w-full mt-1 border-gray-300 rounded-md shadow-sm" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} disabled={!formData.date || availableTimeSlots.length === 0}>
                                <option value="">Select a time...</option>
                                {availableTimeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            {formData.date && availableTimeSlots.length === 0 && <p className="text-xs text-red-500 mt-1">No slots available for this date.</p>}
                        </div>
                    </div>
                    
                    <div className="mt-4">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={formData.delivery} onChange={e => setFormData({...formData, delivery: e.target.checked})} className="text-brand-orange focus:ring-brand-orange rounded" />
                            <span className="text-sm font-bold text-gray-700">I need delivery</span>
                        </label>
                        {formData.delivery && (
                            <div className="mt-2">
                                <label className="block text-sm font-bold text-gray-700">Delivery Address</label>
                                <input type="text" className="w-full mt-1 border-gray-300 rounded-md shadow-sm" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Full address..." />
                            </div>
                        )}
                    </div>
                </section>

                {/* Step 3: Menu */}
                <section className="bg-white p-6 rounded-lg shadow-sm border border-brand-tan">
                    <h2 className="text-xl font-bold text-brand-brown mb-4 flex items-center gap-2">
                        <span className="bg-brand-orange text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                        Menu Selection
                    </h2>
                    
                    <div className="space-y-6">
                        <ItemInputSection 
                            title="Mini Empanadas" 
                            items={miniItems} 
                            flavors={empanadaFlavors} 
                            onItemChange={(i, f, v) => handleItemChange('mini', i, f, v)} 
                            onAddItem={() => handleAddItem('mini')} 
                            onRemoveItem={(i) => handleRemoveItem('mini', i)} 
                            availablePackages={pricing.packages?.filter(p => p.itemType === 'mini' && !p.isSpecial)}
                            onAddPackage={setActivePackageBuilder}
                        />
                         <ItemInputSection 
                            title="Full-Size Empanadas" 
                            items={fullSizeItems} 
                            flavors={fullSizeEmpanadaFlavors} 
                            onItemChange={(i, f, v) => handleItemChange('full', i, f, v)} 
                            onAddItem={() => handleAddItem('full')} 
                            onRemoveItem={(i) => handleRemoveItem('full', i)} 
                            availablePackages={pricing.packages?.filter(p => p.itemType === 'full' && !p.isSpecial)}
                            onAddPackage={setActivePackageBuilder}
                        />
                        <ItemInputSection 
                            title="Party Platters" 
                            items={specialItems} 
                            flavors={empanadaFlavors} 
                            onItemChange={(i, f, v) => handleItemChange('special', i, f, v)} 
                            onAddItem={() => handleAddItem('special')} 
                            onRemoveItem={(i) => handleRemoveItem('special', i)} 
                            availablePackages={pricing.packages?.filter(p => p.isSpecial)}
                            onAddPackage={setActivePackageBuilder}
                            bgColor="bg-purple-50"
                        />
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm font-bold text-gray-700">Special Instructions / Notes</label>
                        <textarea className="w-full mt-1 border-gray-300 rounded-md shadow-sm" rows={3} value={formData.instructions} onChange={e => setFormData({...formData, instructions: e.target.value})} placeholder="Allergies, specific requests..." />
                    </div>
                </section>

                <div className="flex justify-end pt-4">
                    <button 
                        onClick={handleSubmit} 
                        className="bg-brand-orange text-white text-lg font-bold px-8 py-3 rounded-lg shadow-lg hover:bg-opacity-90 transform transition-transform hover:scale-105"
                    >
                        Submit Order
                    </button>
                </div>
            </div>

            {/* Package Builder Modal Overlay */}
            {activePackageBuilder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
                        <PackageBuilderModal 
                            pkg={activePackageBuilder} 
                            standardFlavors={empanadaFlavors.filter(f => !f.isSpecial)} 
                            specialFlavors={empanadaFlavors.filter(f => f.isSpecial)} 
                            onClose={() => setActivePackageBuilder(null)} 
                            onConfirm={handlePackageConfirm} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}