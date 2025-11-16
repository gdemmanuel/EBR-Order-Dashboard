import React, { useState, useEffect } from 'react';
import { Order, OrderItem, ContactMethod, FollowUpStatus } from '../types';
import { allEmpanadaFlavors, allFullSizeEmpanadaFlavors } from '../data/mockData';
import { XMarkIcon, PlusIcon, TrashIcon } from './icons/Icons';

interface OrderFormModalProps {
    order?: Order;
    onClose: () => void;
    onSave: (order: Order | Omit<Order, 'id'>) => void;
}

const MINI_EMPANADA_PRICE = 1.75;
const FULL_SIZE_EMPANADA_PRICE = 3.00;

const ItemInputSection: React.FC<{
    title: string;
    items: OrderItem[];
    flavors: string[];
    onItemChange: (index: number, field: keyof OrderItem, value: string | number) => void;
    onAddItem: () => void;
    onRemoveItem: (index: number) => void;
}> = ({ title, items, flavors, onItemChange, onAddItem, onRemoveItem }) => (
    <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
        <div className="space-y-3 max-h-40 overflow-y-auto pr-2 border-l-4 border-gray-100 pl-3">
            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2 animate-fade-in">
                    <select value={item.name} onChange={e => onItemChange(index, 'name', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm">
                        {flavors.map(flavor => <option key={flavor} value={flavor}>{flavor}</option>)}
                    </select>
                    <input type="number" min="1" value={item.quantity} onChange={e => onItemChange(index, 'quantity', e.target.value)} className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm" />
                    <button type="button" onClick={() => onRemoveItem(index)} className="text-red-500 hover:text-red-700 p-1">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            ))}
             {items.length === 0 && <p className="text-sm text-gray-500">No items added.</p>}
        </div>
        <button type="button" onClick={onAddItem} className="mt-2 flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-800">
            <PlusIcon className="w-4 h-4" /> Add Item
        </button>
    </div>
);


export default function OrderFormModal({ order, onClose, onSave }: OrderFormModalProps) {
    const [customerName, setCustomerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pickupDate, setPickupDate] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    const [contactMethod, setContactMethod] = useState<ContactMethod>(ContactMethod.UNKNOWN);
    const [miniItems, setMiniItems] = useState<OrderItem[]>([]);
    const [fullSizeItems, setFullSizeItems] = useState<OrderItem[]>([]);
    const [amountCharged, setAmountCharged] = useState(0);
    const [deliveryRequired, setDeliveryRequired] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [deliveryAddress, setDeliveryAddress] = useState('');

    useEffect(() => {
        if (order) {
            setCustomerName(order.customerName);
            setPhoneNumber(order.phoneNumber || '');
            const dateParts = order.pickupDate.split('/');
            // Format to YYYY-MM-DD for input type=date
            const formattedDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
            setPickupDate(formattedDate);
            setPickupTime(order.pickupTime);
            setContactMethod(order.contactMethod);
            // Amount charged will be recalculated by the other useEffect
            setDeliveryRequired(order.deliveryRequired);
            setDeliveryFee(order.deliveryFee);
            setDeliveryAddress(order.deliveryAddress || '');
            setMiniItems(order.items.filter(i => allEmpanadaFlavors.includes(i.name)));
            setFullSizeItems(order.items.filter(i => allFullSizeEmpanadaFlavors.includes(i.name)));
        } else {
             setMiniItems([{ name: allEmpanadaFlavors[0], quantity: 12 }]);
        }
    }, [order]);

    useEffect(() => {
        const miniTotal = miniItems.reduce((sum, item) => sum + (item.quantity * MINI_EMPANADA_PRICE), 0);
        const fullSizeTotal = fullSizeItems.reduce((sum, item) => sum + (item.quantity * FULL_SIZE_EMPANADA_PRICE), 0);
        const total = miniTotal + fullSizeTotal + (deliveryRequired ? deliveryFee : 0);
        setAmountCharged(total);
    }, [miniItems, fullSizeItems, deliveryFee, deliveryRequired]);
    
    const handleItemChange = (
        type: 'mini' | 'full',
        index: number, 
        field: keyof OrderItem, 
        value: string | number
    ) => {
        const items = type === 'mini' ? [...miniItems] : [...fullSizeItems];
        if (field === 'quantity') {
            items[index][field] = Number(value) < 0 ? 0 : Number(value);
        } else {
            items[index][field] = value as string;
        }
        if (type === 'mini') setMiniItems(items);
        else setFullSizeItems(items);
    };

    const addItem = (type: 'mini' | 'full') => {
        const newItem = type === 'mini' 
            ? { name: allEmpanadaFlavors[0], quantity: 1 } 
            : { name: allFullSizeEmpanadaFlavors[0], quantity: 1 };
        if (type === 'mini') setMiniItems([...miniItems, newItem]);
        else setFullSizeItems([...fullSizeItems, newItem]);
    };

    const removeItem = (type: 'mini' | 'full', index: number) => {
        if (type === 'mini') setMiniItems(miniItems.filter((_, i) => i !== index));
        else setFullSizeItems(fullSizeItems.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const allItems = [...miniItems, ...fullSizeItems];
        const totalFullSize = fullSizeItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalMini = miniItems.reduce((sum, item) => sum + item.quantity, 0);

        // Format date back to MM/DD/YYYY
        const dateParts = pickupDate.split('-');
        const formattedDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;

        const orderData = {
            customerName,
            phoneNumber,
            pickupDate: formattedDate,
            pickupTime,
            contactMethod,
            items: allItems,
            amountCharged,
            totalFullSize,
            totalMini,
            deliveryRequired,
            deliveryFee: deliveryRequired ? deliveryFee : 0,
            deliveryAddress: deliveryRequired ? deliveryAddress : null,
            // Retain existing fields if editing
            followUpStatus: order?.followUpStatus || FollowUpStatus.NEEDED,
            amountCollected: order?.amountCollected || null,
            paymentMethod: order?.paymentMethod || null,
        };

        if (order) {
            onSave({ ...order, ...orderData });
        } else {
            onSave(orderData);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <header className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">{order ? 'Edit Order' : 'Add New Order'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                            <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500" />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700">Contact Method</label>
                            <select value={contactMethod} onChange={e => setContactMethod(e.target.value as ContactMethod)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500">
                                {Object.values(ContactMethod).map(method => <option key={method} value={method}>{method}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Pickup Date</label>
                            <input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Pickup Time</label>
                            <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500" />
                        </div>
                         <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Amount Charged ($)</label>
                            <input type="number" step="0.01" value={amountCharged.toFixed(2)} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 bg-gray-100" />
                        </div>
                    </div>
                    
                    <div className="border-t pt-4">
                         <div className="flex items-center">
                            <input type="checkbox" id="delivery" checked={deliveryRequired} onChange={e => setDeliveryRequired(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                            <label htmlFor="delivery" className="ml-2 block text-sm font-medium text-gray-900">Delivery Required?</label>
                        </div>
                        {deliveryRequired && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4 animate-fade-in">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Delivery Address</label>
                                    <input type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} required={deliveryRequired} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Delivery Fee ($)</label>
                                    <input type="number" step="0.01" value={deliveryFee} onChange={e => setDeliveryFee(Number(e.target.value))} required={deliveryRequired} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 border-t pt-4">
                        <ItemInputSection 
                            title="Mini Empanadas"
                            items={miniItems}
                            flavors={allEmpanadaFlavors}
                            onItemChange={(index, field, value) => handleItemChange('mini', index, field, value)}
                            onAddItem={() => addItem('mini')}
                            onRemoveItem={(index) => removeItem('mini', index)}
                        />
                         <ItemInputSection 
                            title="Full-Size Empanadas"
                            items={fullSizeItems}
                            flavors={allFullSizeEmpanadaFlavors}
                            onItemChange={(index, field, value) => handleItemChange('full', index, field, value)}
                            onAddItem={() => addItem('full')}
                            onRemoveItem={(index) => removeItem('full', index)}
                        />
                    </div>

                    <footer className="pt-6 flex justify-end gap-3 border-t">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                        <button type="submit" className="bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-orange-700 transition-colors">{order ? 'Save Changes' : 'Add Order'}</button>
                    </footer>
                </form>
            </div>
        </div>
    );
}