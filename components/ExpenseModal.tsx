
import React, { useState, useRef } from 'react';
import { Expense } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CalendarIcon, CurrencyDollarIcon, DocumentTextIcon, CameraIcon, CheckCircleIcon } from './icons/Icons';
import { parseReceiptImage } from '../services/geminiService';

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
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanSuccess, setScanSuccess] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !category || !date) return;

        setIsSaving(true);
        try {
            const newExpense: Expense = {
                id: Date.now().toString(),
                date,
                category,
                description,
                amount: parseFloat(amount)
            };
            await onSave(newExpense);
            // Reset form
            setDescription('');
            setAmount('');
            setScanSuccess(false);
            // Keep date and category for ease of entry
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setScanSuccess(false);
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
            // Strip prefix
            const base64Data = base64.split(',')[1];
            const mimeType = file.type;

            const extractedData = await parseReceiptImage(base64Data, mimeType, categories);
            
            if (extractedData.date) setDate(extractedData.date);
            if (extractedData.amount) setAmount(String(extractedData.amount));
            if (extractedData.description) setDescription(extractedData.description);
            if (extractedData.category && categories.includes(extractedData.category)) {
                setCategory(extractedData.category);
            } else if (extractedData.category) {
                 setCategory(categories.includes(extractedData.category) ? extractedData.category : 'Other');
            }
            setScanSuccess(true);

        } catch (error) {
            console.error("Scan failed", error);
            alert("Failed to scan receipt. Please enter details manually.");
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col border border-brand-tan max-h-[90vh]">
                <header className="p-6 border-b border-brand-tan flex justify-between items-center">
                    <h2 className="text-2xl font-serif text-brand-brown">Expenses</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex border-b border-gray-200">
                    <button 
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'add' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-gray-500 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('add')}
                    >
                        Add New
                    </button>
                    <button 
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'list' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-gray-500 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('list')}
                    >
                        Recent History
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow">
                    {activeTab === 'add' && (
                        <form onSubmit={handleSave} className="space-y-4">
                            {/* Hidden File Input */}
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                capture="environment"
                                onChange={handleFileChange}
                            />
                            
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isScanning}
                                className={`w-full flex justify-center items-center gap-2 py-3 px-4 border-2 border-dashed rounded-lg transition-colors mb-4 ${scanSuccess ? 'border-green-400 bg-green-50 text-green-700' : 'border-brand-orange/50 text-brand-orange bg-brand-orange/5 hover:bg-brand-orange/10'}`}
                            >
                                {isScanning ? (
                                    <>Scanning... <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-orange"></div></>
                                ) : scanSuccess ? (
                                    <><CheckCircleIcon className="w-5 h-5" /> Scan Complete! (Click to Retry)</>
                                ) : (
                                    <><CameraIcon className="w-5 h-5" /> Scan Receipt (Auto-fill)</>
                                )}
                            </button>
                            
                            <p className="text-[10px] text-gray-400 text-center -mt-3 mb-2">
                                Note: Receipt images are processed to extract data but are not saved to cloud storage.
                            </p>

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
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Amount ($)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><CurrencyDollarIcon className="w-4 h-4 text-gray-400"/></div>
                                    <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="pl-9 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Description / Items</label>
                                <div className="relative">
                                    <textarea 
                                        value={description} 
                                        onChange={e => setDescription(e.target.value)} 
                                        placeholder="e.g. Vendor Name - Item 1, Item 2..." 
                                        rows={3}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm p-2" 
                                    />
                                </div>
                            </div>
                            <button type="submit" disabled={isSaving || isScanning} className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-orange hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange disabled:opacity-50">
                                {isSaving ? 'Saving...' : <><PlusIcon className="w-4 h-4" /> Add Expense</>}
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
                                    <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200">
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold text-brand-brown">{expense.category}</p>
                                            <p className="text-xs text-gray-500 truncate">{expense.date} • {expense.description}</p>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                            <span className="font-bold text-red-600 text-sm">-${expense.amount.toFixed(2)}</span>
                                            <button onClick={() => handleDelete(expense.id)} className="text-gray-400 hover:text-red-500">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
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
