
import React, { useState } from 'react';
import { Employee, WorkShift } from '../types';
import { XMarkIcon, ClockIcon, CurrencyDollarIcon } from './icons/Icons';

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
    const [error, setError] = useState<string | null>(null);
    
    // Derived values
    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
    
    const calculateHours = (start: string, end: string) => {
        if (!start || !end) return 0;
        
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        
        if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;

        const date1 = new Date(2000, 0, 1, h1, m1);
        const date2 = new Date(2000, 0, 1, h2, m2);
        
        let diffMs = date2.getTime() - date1.getTime();
        if (diffMs < 0) {
            // Simple handling for same-day shifts. 
            // If negative, assume user input error or needs next-day logic (omitted for simplicity here)
            return 0;
        }
        return diffMs / (1000 * 60 * 60); // hours
    };
    
    const hours = calculateHours(startTime, endTime);
    const wage = selectedEmployee?.hourlyWage || 0;
    const totalPay = hours * wage;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedEmployee) {
            setError("Please select an employee.");
            return;
        }
        if (hours <= 0 || isNaN(hours)) {
            setError("Invalid start or end time.");
            return;
        }
        if (isNaN(totalPay)) {
            setError("Invalid pay calculation. Check employee wage.");
            return;
        }
        
        setIsSaving(true);
        try {
            // Sanitize object to ensure no undefined values are passed to Firestore
            const shift: WorkShift = {
                id: Date.now().toString(),
                employeeId: selectedEmployee.id,
                employeeName: selectedEmployee.name || 'Unknown',
                date: date || new Date().toISOString().split('T')[0],
                startTime: startTime || '00:00',
                endTime: endTime || '00:00',
                hours: Number(hours) || 0,
                hourlyWage: Number(wage) || 0,
                totalPay: Number(totalPay) || 0,
                notes: notes || ''
            };
            
            console.log("Saving shift:", shift); // Debug log
            await onSave(shift);
            onClose();
        } catch (error: any) {
            console.error("Save Error:", error);
            setError(error.message || "Failed to save shift. Please check your connection.");
        } finally {
            setIsSaving(false);
        }
    };

    const isValid = selectedEmployee && hours > 0 && !isNaN(totalPay);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col border border-brand-tan">
                <header className="p-5 border-b border-brand-tan flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h2 className="text-xl font-bold text-brand-brown flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-brand-orange" /> Log Work Hours
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <form onSubmit={handleSave} className="p-6 space-y-5">
                    {employees.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-red-600 font-medium mb-2">No Employees Found</p>
                            <p className="text-sm text-gray-500">Go to Settings &gt; Employees to add your team first.</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Employee</label>
                                <select 
                                    required
                                    value={selectedEmployeeId}
                                    onChange={e => setSelectedEmployeeId(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm bg-white py-2"
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
                            
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-blue-800 font-medium">Duration:</span>
                                    <span className="font-bold text-blue-900">{hours > 0 ? hours.toFixed(2) : '0.00'} hrs</span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-t border-blue-200 pt-2">
                                    <span className="text-blue-800 font-medium">Estimated Pay:</span>
                                    <div className="flex items-center gap-1 text-green-700 font-bold">
                                        <CurrencyDollarIcon className="w-4 h-4" />
                                        <span>{isNaN(totalPay) ? '0.00' : totalPay.toFixed(2)}</span>
                                        <span className="text-[10px] font-normal text-blue-600 ml-1">(@${wage}/hr)</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Notes (Optional)</label>
                                <textarea 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm"
                                    rows={2}
                                    placeholder="Task details, breaks, etc."
                                />
                            </div>

                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    disabled={isSaving || !isValid}
                                    className="w-full bg-brand-orange text-white font-bold py-3 rounded-lg shadow-md hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex justify-center items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>Saving...</> 
                                    ) : (
                                        <>
                                            <ClockIcon className="w-5 h-5" /> Log Shift
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
