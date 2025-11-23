
import React, { useState } from 'react';
import { Expense } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CalendarIcon, CurrencyDollarIcon, DocumentTextIcon } from './icons/Icons';

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
    const [category, setCategory] = useState(categories[0] || 'Ingredients');
    const [vendor, setVendor] = useState('');
    const [item, setItem] = useState('');
    const [unitName, setUnitName] = useState('');
    const [pricePerUnit, setPricePerUnit] = useState('');
    const [quantity, setQuantity] = useState('');
    const [description, setDescription] = useState(''); // Optional notes
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Derived Total
    const calculatedTotal = (parseFloat(pricePerUnit) || 0) * (parseFloat(quantity) || 0);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!category || !date || !vendor || !item) return;

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
                quantity: parseFloat(quantity) || 0,
                totalCost: calculatedTotal,
                description
            };
            await onSave(newExpense);
            
            // Success Feedback
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            
            // Reset form specific fields (keep date/category/vendor for speed of multiple entries)
            setItem('');
            setPricePerUnit('');
            setQuantity('');
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
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col border border-brand-tan max-h-[90vh]">
                <header className="p-6 border-b border-brand-tan flex justify-between items-center">
                    <h2 className="text-2xl font-serif text-brand-brown">Expense Manager</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex border-b border-gray-200">
                    <button 
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'add' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-gray-500 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('add')}
                    >
                        Add Entry
                    </button>
                    <button 
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'list' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-gray-500 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('list')}
                    >
                        History
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow">
                    {activeTab === 'add' && (
                        <form onSubmit={handleSave} className="space-y-4">
                            {saveSuccess && (
                                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded relative mb-4 text-sm flex justify-between items-center">
                                    <span>Item Saved!</span>
                                    <button type="button" onClick={() => setActiveTab('list')} className="underline font-bold">View List</button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Vendor</label>
                                    <input type="text" required value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Costco" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Item Name</label>
                                    <input type="text" required value={item} onChange={e => setItem(e.target.value)} placeholder="e.g. Ground Beef" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Price ($)</label>
                                        <input type="number" step="0.01" required value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} placeholder="0.00" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Unit</label>
                                        <input type="text" value={unitName} onChange={e => setUnitName(e.target.value)} placeholder="lbs, box" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Qty</label>
                                        <input type="number" step="0.01" required value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="1" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                    <span className="text-sm font-bold text-gray-600">Total Item Cost:</span>
                                    <span className="text-xl font-bold text-brand-orange">${calculatedTotal.toFixed(2)}</span>
                                </div>
                            </div>
                            
                             <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Notes (Optional)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><DocumentTextIcon className="w-4 h-4 text-gray-400"/></div>
                                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Extra details..." className="pl-9 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                </div>
                            </div>

                            <button type="submit" disabled={isSaving} className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-orange hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange disabled:opacity-50">
                                {isSaving ? 'Saving...' : <><PlusIcon className="w-4 h-4" /> Add Expense Entry</>}
                            </button>
                        </form>
                    )}

                    {activeTab === 'list' && (
                        <div className="space-y-2">
                            {expenses.length === 0 ? (
                                <p className="text-center text-gray-500 text-sm py-4">No expenses recorded yet.</p>
                            ) : (
                                expenses
                                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(expense => (
                                    <div key={expense.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-white bg-gray-500 px-1.5 py-0.5 rounded">{expense.category}</span>
                                                    <span className="text-xs text-gray-400">{expense.date}</span>
                                                </div>
                                                <p className="font-bold text-brand-brown mt-1">{expense.vendor} - {expense.item}</p>
                                                <p className="text-xs text-gray-600">
                                                    {expense.quantity} {expense.unitName} @ ${expense.pricePerUnit}/{expense.unitName}
                                                </p>
                                                {expense.description && <p className="text-xs text-gray-400 italic">{expense.description}</p>}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-red-600">-${expense.totalCost.toFixed(2)}</p>
                                                <button onClick={() => handleDelete(expense.id)} className="text-xs text-gray-400 hover:text-red-500 mt-1 flex items-center justify-end gap-1 ml-auto">
                                                    <TrashIcon className="w-3 h-3" /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
