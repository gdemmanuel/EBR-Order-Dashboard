
import React, { useState } from 'react';
import { Expense } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CalendarIcon, CurrencyDollarIcon, DocumentTextIcon, ReceiptIcon } from './icons/Icons';

interface ExpenseModalProps {
    expenses: Expense[];
    categories: string[];
    onClose: () => void;
    onSave: (expense: Expense) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export default function ExpenseModal({ expenses, categories, onClose, onSave, onDelete }: ExpenseModalProps) {
    const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');
    
    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState(categories[0] || 'Other');
    const [vendor, setVendor] = useState('');
    const [item, setItem] = useState('');
    const [unitName, setUnitName] = useState('');
    const [pricePerUnit, setPricePerUnit] = useState('');
    const [quantity, setQuantity] = useState('');
    const [description, setDescription] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);

    const calculateTotal = () => {
        const price = parseFloat(pricePerUnit) || 0;
        const qty = parseFloat(quantity) || 0;
        return (price * qty).toFixed(2);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const total = parseFloat(calculateTotal());
        if (!vendor || !item || total <= 0) return;

        setIsSaving(true);
        try {
            const newExpense: Expense = {
                id: Date.now().toString(),
                date,
                category,
                vendor,
                item,
                unitName,
                pricePerUnit: parseFloat(pricePerUnit) || 0,
                quantity: parseFloat(quantity) || 1,
                amount: total,
                description
            };
            await onSave(newExpense);
            
            // Reset form details but keep date/vendor for ease of batch entry
            setItem('');
            setPricePerUnit('');
            setQuantity('');
            setUnitName('');
            setDescription('');
        } catch (error) {
            console.error("Failed to save expense", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Delete this expense record?")) {
            await onDelete(id);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col border border-brand-tan max-h-[90vh]">
                <header className="p-6 border-b border-brand-tan flex justify-between items-center bg-brand-tan/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-brand-orange text-white p-2 rounded-full">
                            <ReceiptIcon className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-serif text-brand-brown">Expense Manager</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex border-b border-gray-200">
                    <button 
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'add' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-gray-500 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('add')}
                    >
                        Add Expense
                    </button>
                    <button 
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'list' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-gray-500 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('list')}
                    >
                        History ({expenses.length})
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow">
                    {activeTab === 'add' && (
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><CalendarIcon className="w-4 h-4 text-gray-400"/></div>
                                        <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="pl-9 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                                    <select value={category} onChange={e => setCategory(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm">
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Vendor</label>
                                    <input type="text" required value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Restaurant Depot" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Item Name</label>
                                    <input type="text" required value={item} onChange={e => setItem(e.target.value)} placeholder="e.g. Ground Beef" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Price / Unit</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-xs">$</span>
                                        <input type="number" step="0.01" required value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} placeholder="0.00" className="pl-6 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Unit Name</label>
                                    <input type="text" value={unitName} onChange={e => setUnitName(e.target.value)} placeholder="lbs, box, ea" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Quantity</label>
                                    <input type="number" step="0.01" required value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="1" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded border border-gray-200">
                                <span className="font-bold text-gray-700">Total Cost:</span>
                                <span className="text-xl font-bold text-brand-orange">${calculateTotal()}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Notes (Optional)</label>
                                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                            </div>
                            
                            <button type="submit" disabled={isSaving} className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-orange hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange disabled:opacity-50">
                                {isSaving ? 'Saving...' : <><PlusIcon className="w-4 h-4" /> Add Expense</>}
                            </button>
                        </form>
                    )}

                    {activeTab === 'list' && (
                        <div className="space-y-2">
                            {expenses.length === 0 ? (
                                <p className="text-center text-gray-500 text-sm py-4">No expenses recorded yet.</p>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-2 py-2 text-left font-medium text-gray-500">Date</th>
                                            <th className="px-2 py-2 text-left font-medium text-gray-500">Vendor/Item</th>
                                            <th className="px-2 py-2 text-right font-medium text-gray-500">Cost</th>
                                            <th className="w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {expenses
                                            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map(expense => (
                                            <tr key={expense.id}>
                                                <td className="px-2 py-2 text-gray-500 whitespace-nowrap text-xs">{expense.date}</td>
                                                <td className="px-2 py-2">
                                                    <div className="font-medium text-gray-900">{expense.vendor}</div>
                                                    <div className="text-xs text-gray-500">{expense.item} ({expense.quantity} {expense.unitName})</div>
                                                </td>
                                                <td className="px-2 py-2 text-right font-bold text-brand-brown">${expense.amount.toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right">
                                                    <button onClick={() => handleDelete(expense.id)} className="text-gray-400 hover:text-red-500">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
