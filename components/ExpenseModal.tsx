

import React, { useState, useMemo } from 'react';
import { Expense, Ingredient } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CalendarIcon, CurrencyDollarIcon, DocumentTextIcon, ListBulletIcon, PencilIcon } from './icons/Icons';
import { formatDateForDisplay } from '../utils/dateUtils';

interface ExpenseModalProps {
    expenses: Expense[];
    categories: string[];
    ingredients?: Ingredient[];
    onClose: () => void;
    onSave: (expense: Expense) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onUpdateIngredientCost?: (id: string, newCost: number, date: string) => Promise<void>;
}

type SortKey = 'date' | 'category' | 'vendor' | 'item' | 'totalCost';

const todayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Distinct values, most recently used first
const recentDistinct = (expenses: Expense[], pick: (e: Expense) => string) => {
    const seen = new Map<string, string>();
    [...expenses].sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach(e => {
        const v = (pick(e) || '').trim();
        if (v && !seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v);
    });
    return Array.from(seen.values());
};

export default function ExpenseModal({ expenses, categories, ingredients = [], onClose, onSave, onDelete, onUpdateIngredientCost }: ExpenseModalProps) {
    const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');
    
    // Form State
    const [date, setDate] = useState(todayLocal());
    const [editingId, setEditingId] = useState<string | null>(null); // set when editing an existing expense
    const [pricesTouched, setPricesTouched] = useState(false); // user typed cost/qty/unit, so don't auto-fill over it
    const [lastPurchaseHint, setLastPurchaseHint] = useState<string | null>(null);
    const [category, setCategory] = useState(categories[0] || 'Ingredients');
    const [vendor, setVendor] = useState('');
    const [item, setItem] = useState('');
    const [unitName, setUnitName] = useState('');
    const [inputTotalCost, setInputTotalCost] = useState('');
    const [quantity, setQuantity] = useState('');
    const [description, setDescription] = useState('');
    
    const [showIngredientLink, setShowIngredientLink] = useState(false);
    const [linkedIngredientId, setLinkedIngredientId] = useState<string>('');
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    // Derived Unit Price
    const totalCostVal = parseFloat(inputTotalCost) || 0;
    const qtyVal = parseFloat(quantity) || 0;
    const calculatedUnitCost = qtyVal > 0 ? (totalCostVal / qtyVal) : 0;

    // Suggestions for Vendor and Item Name as you type
    const vendorOptions = useMemo(() => recentDistinct(expenses, e => e.vendor), [expenses]);
    const itemOptions = useMemo(() => recentDistinct(expenses, e => e.item), [expenses]);

    // Most recent expense for each item name (case-insensitive)
    const lastExpenseByItem = useMemo(() => {
        const map = new Map<string, Expense>();
        [...expenses].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id || '').localeCompare(a.id || '')).forEach(e => {
            const key = (e.item || '').trim().toLowerCase();
            if (key && !map.has(key)) map.set(key, e);
        });
        return map;
    }, [expenses]);

    // Typing or picking an item: fill cost, qty and unit from its most recent purchase (new entries only)
    const handleItemChange = (value: string) => {
        setItem(value);
        if (editingId) return;
        const last = lastExpenseByItem.get(value.trim().toLowerCase());
        if (!last) { setLastPurchaseHint(null); return; }
        if (!pricesTouched) {
            setInputTotalCost(last.totalCost ? String(last.totalCost) : '');
            setQuantity(last.quantity ? String(last.quantity) : '');
            setUnitName(last.unitName || '');
            if (last.category && categories.includes(last.category)) setCategory(last.category);
        }
        // Link to the ingredient with the same name, if there is one
        const ing = ingredients.find(i => i.name.trim().toLowerCase() === value.trim().toLowerCase());
        if (ing && !linkedIngredientId) { setShowIngredientLink(true); setLinkedIngredientId(ing.id); }
        const summary = `${formatDateForDisplay(last.date)}${last.vendor ? ` at ${last.vendor}` : ''}: $${(last.totalCost || 0).toFixed(2)} for ${last.quantity} ${last.unitName || 'units'}`;
        setLastPurchaseHint(pricesTouched
            ? `Last purchase ${summary}.`
            : `Filled from your last purchase on ${summary}. Change anything that's different.`);
    };

    const resetForm = () => {
        setEditingId(null);
        setItem('');
        setInputTotalCost('');
        setQuantity('');
        setUnitName('');
        setDescription('');
        setLinkedIngredientId('');
        setShowIngredientLink(false);
        setPricesTouched(false);
        setLastPurchaseHint(null);
        setValidationError(null);
    };

    // Edit an existing expense in the form
    const startEdit = (expense: Expense) => {
        setEditingId(expense.id);
        setDate(expense.date || todayLocal());
        setCategory(expense.category || categories[0] || 'Ingredients');
        setVendor(expense.vendor || '');
        setItem(expense.item || '');
        setInputTotalCost(expense.totalCost !== undefined ? String(expense.totalCost) : '');
        setQuantity(expense.quantity !== undefined ? String(expense.quantity) : '');
        setUnitName(expense.unitName || '');
        setDescription(expense.description || '');
        const ing = ingredients.find(i => i.name.trim().toLowerCase() === (expense.item || '').trim().toLowerCase());
        setShowIngredientLink(!!ing);
        setLinkedIngredientId(ing ? ing.id : '');
        setPricesTouched(true);
        setLastPurchaseHint(null);
        setValidationError(null);
        setSaveSuccess(false);
        setActiveTab('add');
    };

    // Auto-fill from linked ingredient
    const handleLinkIngredient = (ingId: string) => {
        setLinkedIngredientId(ingId);
        const ing = ingredients.find(i => i.id === ingId);
        if (ing) {
            setItem(ing.name);
            setUnitName(ing.unit);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);
        setSaveSuccess(false);

        if (!vendor.trim()) { setValidationError("Vendor Name is required."); return; }
        if (!item.trim()) { setValidationError("Item Name is required."); return; }
        if (totalCostVal <= 0) { setValidationError("Total Cost is required."); return; }
        if (qtyVal <= 0) { setValidationError("Quantity is required."); return; }

        setIsSaving(true);
        try {
            const wasEditing = !!editingId;
            const newExpense: Expense = {
                id: editingId || Date.now().toString(),
                date,
                category,
                vendor,
                item,
                unitName: unitName || 'units', 
                pricePerUnit: calculatedUnitCost,
                quantity: qtyVal,
                totalCost: totalCostVal,
                description: description || '' 
            };
            
            await onSave(newExpense);

            // Update Ingredient Cost if Linked
            if (showIngredientLink && linkedIngredientId && onUpdateIngredientCost) {
                // Pass the expense date as the effective date for the new price
                await onUpdateIngredientCost(linkedIngredientId, calculatedUnitCost, date);
            }

            // Reset form but keep date/vendor for convenience
            resetForm();

            if (wasEditing) {
                // Back to the history after an edit
                setSaveSuccess(false);
                setActiveTab('list');
            } else {
                setSaveSuccess(true);
                setTimeout(() => {
                     setSaveSuccess(false);
                     setActiveTab('list');
                }, 1500);
            }
            
        } catch (error: any) {
            console.error("Failed to save expense", error);
            setValidationError(`Database Error: ${error.message || "Unknown error"}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Delete this expense record?")) {
            await onDelete(id);
        }
    };

    // Sorting Logic
    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedExpenses = useMemo(() => {
        let sortableItems = [...expenses];
        sortableItems.sort((a, b) => {
            let aVal: any = a[sortConfig.key];
            let bVal: any = b[sortConfig.key];
            if (sortConfig.key === 'totalCost') {
                aVal = a.totalCost || 0;
                bVal = b.totalCost || 0;
            }
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [expenses, sortConfig]);

    const SortHeader = ({ label, skey }: { label: string, skey: SortKey }) => (
        <th 
            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hover:text-brand-orange transition-colors select-none"
            onClick={() => handleSort(skey)}
        >
            <div className="flex items-center gap-1">
                {label}
                {sortConfig.key === skey && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
            </div>
        </th>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col border border-brand-tan max-h-[90vh]">
                <header className="p-6 border-b border-brand-tan flex justify-between items-center">
                    <h2 className="text-2xl font-serif text-brand-brown">Expense Manager</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex border-b border-gray-200">
                    <button className={`flex-1 py-3 text-sm font-medium ${activeTab === 'add' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => setActiveTab('add')}>
                        <div className="flex items-center justify-center gap-2">{editingId ? <><PencilIcon className="w-4 h-4" /> Edit Entry</> : <><PlusIcon className="w-4 h-4" /> Add Entry</>}</div>
                    </button>
                    <button className={`flex-1 py-3 text-sm font-medium ${activeTab === 'list' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => setActiveTab('list')}>
                        <div className="flex items-center justify-center gap-2"><ListBulletIcon className="w-4 h-4" /> History ({expenses.length})</div>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow bg-gray-50">
                    {activeTab === 'add' && (
                        <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <form onSubmit={handleSave} className="space-y-4">
                                {saveSuccess && (
                                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded relative mb-4 text-sm flex justify-between items-center">
                                        <span className="font-bold">Saved & Updated Cost!</span>
                                        <button type="button" onClick={() => setActiveTab('list')} className="underline font-semibold hover:text-green-900">View List</button>
                                    </div>
                                )}
                                
                                {editingId && (
                                    <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-2 rounded text-sm flex justify-between items-center">
                                        <span>Editing an expense from <b>{formatDateForDisplay(date)}</b>. Saving replaces it.</span>
                                        <button type="button" onClick={() => { resetForm(); setActiveTab('list'); }} className="underline font-semibold hover:text-amber-700">Cancel</button>
                                    </div>
                                )}

                                {validationError && (
                                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-4 text-sm">
                                        <strong>Error:</strong> {validationError}
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

                                {ingredients.length > 0 && (
                                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                        <div className="flex items-center mb-2">
                                            <input 
                                                type="checkbox" 
                                                id="linkIngredient"
                                                checked={showIngredientLink}
                                                onChange={e => setShowIngredientLink(e.target.checked)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="linkIngredient" className="ml-2 block text-xs font-bold text-blue-800">
                                                Link to Ingredient Cost?
                                            </label>
                                        </div>
                                        
                                        {showIngredientLink && (
                                            <select 
                                                value={linkedIngredientId} 
                                                onChange={e => handleLinkIngredient(e.target.value)} 
                                                className="block w-full rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                            >
                                                <option value="">-- Select Ingredient --</option>
                                                {ingredients.map(ing => (
                                                    <option key={ing.id} value={ing.id}>{ing.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Vendor <span className="text-red-500">*</span></label>
                                        <input type="text" required list="expense-vendor-options" autoComplete="off" value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Costco" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                        <datalist id="expense-vendor-options">
                                            {vendorOptions.map(v => <option key={v} value={v} />)}
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Item Name <span className="text-red-500">*</span></label>
                                        <input type="text" required list="expense-item-options" autoComplete="off" value={item} onChange={e => handleItemChange(e.target.value)} placeholder="e.g. Ground Beef" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                        <datalist id="expense-item-options">
                                            {itemOptions.map(v => <option key={v} value={v} />)}
                                        </datalist>
                                    </div>
                                </div>
                                {lastPurchaseHint && (
                                    <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2 -mt-1">{lastPurchaseHint}</p>
                                )}

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Total Cost ($) <span className="text-red-500">*</span></label>
                                            <input type="number" step="0.01" required value={inputTotalCost} onChange={e => { setInputTotalCost(e.target.value); setPricesTouched(true); }} placeholder="0.00" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Qty <span className="text-red-500">*</span></label>
                                            <input type="number" step="0.01" required value={quantity} onChange={e => { setQuantity(e.target.value); setPricesTouched(true); }} placeholder="1" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Unit</label>
                                            <input type="text" value={unitName} onChange={e => { setUnitName(e.target.value); setPricesTouched(true); }} placeholder="lbs, box" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                        <span className="text-sm font-bold text-gray-600">Calculated Unit Price:</span>
                                        <span className="text-xl font-bold text-brand-orange">
                                            ${calculatedUnitCost.toFixed(2)} <span className="text-xs font-normal text-gray-500">/ {unitName || 'unit'}</span>
                                        </span>
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
                                    {isSaving ? 'Saving...' : editingId ? 'Update Expense' : <><PlusIcon className="w-4 h-4" /> Save Expense</>}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* List View (Unchanged) */}
                    {activeTab === 'list' && (
                        <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
                            {expenses.length === 0 ? (
                                <p className="text-center text-gray-500 text-sm py-8">No expenses recorded yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <SortHeader label="Date" skey="date" />
                                                <SortHeader label="Vendor" skey="vendor" />
                                                <SortHeader label="Category" skey="category" />
                                                <SortHeader label="Details" skey="item" />
                                                <SortHeader label="Cost" skey="totalCost" />
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                            {sortedExpenses.map((expense) => (
                                                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">{formatDateForDisplay(expense.date)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{expense.vendor}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap"><span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{expense.category}</span></td>
                                                    <td className="px-4 py-3 text-gray-600"><div className="font-medium">{expense.item}</div><div className="text-xs text-gray-500 flex items-center gap-1"><span>${(expense.pricePerUnit || 0).toFixed(2)} / {expense.unitName}</span><span className="text-gray-300">|</span><span>Qty: {expense.quantity}</span></div>{expense.description && <div className="text-xs text-gray-400 italic">{expense.description}</div>}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-bold text-red-600">${(expense.totalCost || 0).toFixed(2)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right"><button onClick={() => startEdit(expense)} className="text-gray-400 hover:text-brand-orange transition-colors mr-3" title="Edit expense" aria-label="Edit expense"><PencilIcon className="w-4 h-4" /></button><button onClick={() => handleDelete(expense.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete expense" aria-label="Delete expense"><TrashIcon className="w-4 h-4" /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}