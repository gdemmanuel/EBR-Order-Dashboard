import React, { useState } from 'react';
import { Shift, Employee } from '../types';
import { XMarkIcon, PlusIcon, ClockIcon, CurrencyDollarIcon, TrashIcon } from './icons/Icons';

interface ShiftModalProps {
    employees: Employee[];
    shifts: Shift[];
    date: string; // YYYY-MM-DD
    onClose: () => void;
    onSave: (shift: Shift) => Promise<void>;
    onDelete: (shiftId: string) => Promise<void>;
}

export default function ShiftModal({ employees, shifts, date, onClose, onSave, onDelete }: ShiftModalProps) {
    const [selectedEmp, setSelectedEmp] = useState(employees[0]?.id || '');
    const [start, setStart] = useState('09:00');
    const [end, setEnd] = useState('17:00');
    const [isSaving, setIsSaving] = useState(false);

    // Derived logic for preview
    const emp = employees.find(e => e.id === selectedEmp);
    
    const calculateCost = () => {
        if (!emp) return 0;
        const [sH, sM] = start.split(':').map(Number);
        const [eH, eM] = end.split(':').map(Number);
        let hours = (eH + eM/60) - (sH + sM/60);
        if (hours < 0) hours += 24; // Overnight shift
        return hours * emp.hourlyRate;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emp) return;
        setIsSaving(true);

        const [sH, sM] = start.split(':').map(Number);
        const [eH, eM] = end.split(':').map(Number);
        let hours = (eH + eM/60) - (sH + sM/60);
        if (hours < 0) hours += 24;

        const newShift: Shift = {
            id: Date.now().toString(),
            employeeId: emp.id,
            employeeName: emp.name,
            date,
            startTime: start,
            endTime: end,
            hours: parseFloat(hours.toFixed(2)),
            laborCost: parseFloat((hours * emp.hourlyRate).toFixed(2))
        };

        await onSave(newShift);
        setIsSaving(false);
    };

    // Filter shifts for this specific day
    const dailyShifts = shifts.filter(s => s.date === date);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-brand-tan">
                <header className="p-4 border-b border-brand-tan flex justify-between items-center bg-brand-tan/10">
                    <div>
                        <h3 className="text-lg font-bold text-brand-brown">Schedule Shifts</h3>
                        <p className="text-xs text-gray-500">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric'})}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-6 h-6" /></button>
                </header>

                <div className="p-4 space-y-6">
                    {/* List Existing */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase">Scheduled Today</h4>
                        {dailyShifts.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No shifts scheduled.</p>
                        ) : (
                            dailyShifts.map(s => (
                                <div key={s.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-200">
                                    <div>
                                        <p className="font-bold text-sm text-brand-brown">{s.employeeName}</p>
                                        <p className="text-xs text-gray-500">{s.startTime} - {s.endTime} ({s.hours}h)</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-medium text-green-700">${s.laborCost.toFixed(2)}</span>
                                        <button onClick={() => onDelete(s.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add New Form */}
                    {employees.length > 0 ? (
                        <form onSubmit={handleSave} className="border-t border-gray-200 pt-4">
                            <h4 className="text-xs font-bold text-brand-orange uppercase mb-3">Add Shift</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700">Employee</label>
                                    <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} className="w-full text-sm rounded border-gray-300 p-2">
                                        {employees.map(e => <option key={e.id} value={e.id}>{e.name} (${e.hourlyRate}/hr)</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700">Start</label>
                                        <input type="time" value={start} onChange={e => setStart(e.target.value)} className="w-full text-sm rounded border-gray-300 p-2"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700">End</label>
                                        <input type="time" value={end} onChange={e => setEnd(e.target.value)} className="w-full text-sm rounded border-gray-300 p-2"/>
                                    </div>
                                </div>
                                <div className="bg-green-50 p-2 rounded text-center text-xs text-green-800 font-medium">
                                    Est. Cost: ${calculateCost().toFixed(2)}
                                </div>
                                <button type="submit" disabled={isSaving} className="w-full bg-brand-brown text-white py-2 rounded-lg text-sm font-bold hover:bg-opacity-90">
                                    {isSaving ? 'Saving...' : 'Add Shift'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <p className="text-sm text-red-500 text-center border-t pt-4">
                            No employees found. Add them in Settings first.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}