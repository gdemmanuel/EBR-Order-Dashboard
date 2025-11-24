
import React, { useState, useEffect } from 'react';
import { Employee, WorkShift } from '../types';
import { XMarkIcon, ClockIcon } from './icons/Icons';

interface ShiftLogModalProps {
    employees: Employee[];
    onClose: () => void;
    onSave: (shift: WorkShift) => Promise<void>;
}

export default function ShiftLogModal({ employees, onClose, onSave }: ShiftLogModalProps) {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [notes, setNotes] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);
    
    // Derived values
    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
    
    const calculateHours = (start: string, end: string) => {
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        const date1 = new Date(2000, 0, 1, h1, m1);
        const date2 = new Date(2000, 0, 1, h2, m2);
        
        let diffMs = date2.getTime() - date1.getTime();
        if (diffMs < 0) {
            // Handle overnight shifts if needed, but for now simple same-day
            return 0;
        }
        return diffMs / (1000 * 60 * 60); // hours
    };
    
    const hours = calculateHours(startTime, endTime);
    const wage = selectedEmployee?.hourlyWage || 0;
    const totalPay = hours * wage;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee) return;
        
        setIsSaving(true);
        try {
            const shift: WorkShift = {
                id: Date.now().toString(),
                employeeId: selectedEmployee.id,
                employeeName: selectedEmployee.name,
                date,
                startTime,
                endTime,
                hours,
                hourlyWage: wage,
                totalPay,
                notes
            };
            await onSave(shift);
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to save shift");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col border border-brand-tan">
                <header className="p-5 border-b border-brand-tan flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h2 className="text-xl font-bold text-brand-brown flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-brand-orange" /> Log Work Hours
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    {employees.length === 0 ? (
                        <p className="text-red-500 text-sm text-center">Please add employees in Settings before logging hours.</p>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Employee</label>
                                <select 
                                    required
                                    value={selectedEmployeeId}
                                    onChange={e => setSelectedEmployeeId(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm"
                                >
                                    <option value="">Select Employee...</option>
                                    {employees.filter(e => e.isActive).map(e => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
                                <input 
                                    type="date" 
                                    required 
                                    value={date} 
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Start Time</label>
                                    <input 
                                        type="time" 
                                        required 
                                        value={startTime} 
                                        onChange={e => setStartTime(e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">End Time</label>
                                    <input 
                                        type="time" 
                                        required 
                                        value={endTime} 
                                        onChange={e => setEndTime(e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm"
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-center text-sm mb-1">
                                    <span className="text-gray-600">Total Hours:</span>
                                    <span className="font-bold">{hours.toFixed(2)} hrs</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Est. Pay (@${wage}/hr):</span>
                                    <span className="font-bold text-green-600">${totalPay.toFixed(2)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Notes (Optional)</label>
                                <textarea 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm"
                                    rows={2}
                                />
                            </div>

                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    disabled={isSaving || !selectedEmployee || hours <= 0}
                                    className="w-full bg-brand-orange text-white font-bold py-2 rounded-lg shadow-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? 'Saving...' : 'Log Hours'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
