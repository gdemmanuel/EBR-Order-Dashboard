import React, { useState } from 'react';
import { AppSettings, updateSettingsInDb } from '../services/dbService';
import { MenuPackage, Flavor, Employee } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon, PencilIcon } from './icons/Icons';

interface SettingsModalProps {
    settings: AppSettings;
    onClose: () => void;
}

type Tab = 'packages' | 'flavors' | 'employees' | 'general';

export default function SettingsModal({ settings, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('packages');
    
    // --- Package Management ---
    const [packageForm, setPackageForm] = useState<Partial<MenuPackage>>({
        itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '', description: ''
    });
    const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

    const handleAddOrUpdatePackage = async () => {
        if (!packageForm.name || !packageForm.quantity || !packageForm.price) return;
        
        let newPackages = [...(settings.pricing.packages || [])];
        
        if (editingPackageId) {
            newPackages = newPackages.map(p => p.id === editingPackageId ? { ...p, ...packageForm } as MenuPackage : p);
        } else {
            const newPkg: MenuPackage = {
                id: Date.now().toString(),
                ...packageForm as MenuPackage
            };
            newPackages.push(newPkg);
        }

        await updateSettingsInDb({ 
            pricing: { ...settings.pricing, packages: newPackages } 
        });
        
        setEditingPackageId(null);
        setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '', description: '' });
    };

    const handleEditPackageClick = (pkg: MenuPackage) => {
        setEditingPackageId(pkg.id);
        setPackageForm(pkg);
    };

    const removePackage = async (id: string) => {
        const newPackages = settings.pricing.packages.filter(p => p.id !== id);
        await updateSettingsInDb({ pricing: { ...settings.pricing, packages: newPackages } });
    };

    const togglePackageVisibility = async (id: string) => {
        const newPackages = settings.pricing.packages.map(p => p.id === id ? { ...p, visible: !p.visible } : p);
        await updateSettingsInDb({ pricing: { ...settings.pricing, packages: newPackages } });
    };

    // --- Employee Management ---
    const [empName, setEmpName] = useState('');
    const [empWage, setEmpWage] = useState('15');

    const addEmployee = async () => {
        if (!empName) return;
        const newEmp: Employee = {
            id: Date.now().toString(),
            name: empName,
            hourlyWage: parseFloat(empWage),
            productionRates: { mini: 40, full: 25 },
            isActive: true
        };
        await updateSettingsInDb({ employees: [...(settings.employees || []), newEmp] });
        setEmpName('');
    };

    const removeEmployee = async (id: string) => {
        const newEmps = settings.employees.filter(e => e.id !== id);
        await updateSettingsInDb({ employees: newEmps });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-brand-tan">
                <header className="p-6 border-b border-brand-tan flex justify-between items-center bg-gray-50">
                    <h2 className="text-2xl font-serif text-brand-brown">Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex border-b border-gray-200 bg-white">
                    <button onClick={() => setActiveTab('packages')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'packages' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-gray-500 hover:bg-gray-50'}`}>Packages</button>
                    <button onClick={() => setActiveTab('employees')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'employees' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-gray-500 hover:bg-gray-50'}`}>Employees</button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow bg-gray-50">
                    
                    {/* PACKAGES TAB */}
                    {activeTab === 'packages' && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                <h4 className="font-bold text-gray-700 mb-3">{editingPackageId ? 'Edit Package' : 'Add New Package'}</h4>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <input type="text" placeholder="Package Name" value={packageForm.name} onChange={(e) => setPackageForm({...packageForm, name: e.target.value})} className="col-span-2 rounded-md border-gray-300 text-sm" />
                                    <select value={packageForm.itemType} onChange={(e) => setPackageForm({...packageForm, itemType: e.target.value as 'mini'|'full'})} className="rounded-md border-gray-300 text-sm">
                                        <option value="mini">Mini</option>
                                        <option value="full">Full Size</option>
                                    </select>
                                    <input type="number" placeholder="Qty" value={packageForm.quantity} onChange={(e) => setPackageForm({...packageForm, quantity: parseInt(e.target.value)})} className="rounded-md border-gray-300 text-sm" />
                                    <input type="number" placeholder="Price ($)" value={packageForm.price} onChange={(e) => setPackageForm({...packageForm, price: parseFloat(e.target.value)})} className="rounded-md border-gray-300 text-sm" />
                                    <input type="number" placeholder="Max Flavors" value={packageForm.maxFlavors} onChange={(e) => setPackageForm({...packageForm, maxFlavors: parseInt(e.target.value)})} className="rounded-md border-gray-300 text-sm" />
                                    <input type="number" placeholder="Increment (e.g. 1)" value={packageForm.increment || ''} onChange={(e) => setPackageForm({...packageForm, increment: parseInt(e.target.value)})} className="rounded-md border-gray-300 text-sm" />
                                    <label className="col-span-2 flex items-center gap-2 text-sm bg-purple-50 border border-purple-200 rounded px-2 py-2 text-purple-900 font-medium cursor-pointer">
                                        <input type="checkbox" checked={packageForm.isSpecial || false} onChange={(e) => setPackageForm({...packageForm, isSpecial: e.target.checked})} className="text-purple-600 focus:ring-purple-500 rounded" /> 
                                        Is Party Platter / Special?
                                    </label>
                                </div>
                                <input type="text" placeholder="Description (optional)" value={packageForm.description || ''} onChange={(e) => setPackageForm({...packageForm, description: e.target.value})} className="w-full rounded-md border-gray-300 text-sm mb-3" />
                                <div className="flex justify-end gap-2">
                                    {editingPackageId && <button onClick={() => { setEditingPackageId(null); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '', description: '' }); }} className="text-gray-500 text-sm underline">Cancel</button>}
                                    <button onClick={handleAddOrUpdatePackage} className="bg-brand-orange text-white px-4 py-1.5 rounded-md text-sm font-bold hover:bg-opacity-90">{editingPackageId ? 'Update' : 'Add'}</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(settings.pricing.packages || []).map(pkg => (
                                    <div key={pkg.id} className={`p-4 rounded-lg border relative group ${pkg.visible ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-200 opacity-70'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h5 className="font-bold text-brand-brown">{pkg.name}</h5>
                                                <p className="text-xs text-gray-500">{pkg.quantity} {pkg.itemType} empanadas • ${pkg.price}</p>
                                                <p className="text-xs text-gray-400">Max {pkg.maxFlavors} flavors • Step {pkg.increment || 1}</p>
                                                {pkg.isSpecial && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">Party Platter</span>}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => togglePackageVisibility(pkg.id)} className="text-gray-400 hover:text-blue-600"><CheckCircleIcon className={`w-4 h-4 ${pkg.visible ? 'text-green-500' : 'text-gray-300'}`} /></button>
                                                <button onClick={() => handleEditPackageClick(pkg)} className="text-gray-400 hover:text-brand-orange"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={() => removePackage(pkg.id)} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* EMPLOYEES TAB */}
                    {activeTab === 'employees' && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex gap-2 items-end">
                                <div className="flex-grow">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Name</label>
                                    <input type="text" value={empName} onChange={e => setEmpName(e.target.value)} className="w-full rounded-md border-gray-300 text-sm" />
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Wage ($/hr)</label>
                                    <input type="number" value={empWage} onChange={e => setEmpWage(e.target.value)} className="w-full rounded-md border-gray-300 text-sm" />
                                </div>
                                <button onClick={addEmployee} className="bg-brand-orange text-white px-3 py-2 rounded-md text-sm font-bold h-[38px] flex items-center gap-1">
                                    <PlusIcon className="w-4 h-4" /> Add
                                </button>
                            </div>
                            
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                {settings.employees?.map(emp => (
                                    <div key={emp.id} className="flex justify-between items-center p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <div>
                                            <p className="font-bold text-brand-brown">{emp.name}</p>
                                            <p className="text-xs text-gray-500">${emp.hourlyWage}/hr</p>
                                        </div>
                                        <button onClick={() => removeEmployee(emp.id)} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                {(!settings.employees || settings.employees.length === 0) && (
                                    <p className="p-4 text-center text-sm text-gray-400 italic">No employees added.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}