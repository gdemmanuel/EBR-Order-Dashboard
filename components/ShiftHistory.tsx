import React, { useEffect, useMemo, useState } from 'react';
import { Employee, WorkShift, WorkType } from '../types';
import { WORK_TYPES, resolveWorkType } from '../utils/laborUtils';
import { formatTimeDisplay } from '../utils/dateUtils';
import { PencilIcon, TrashIcon } from './icons/Icons';

interface ShiftHistoryProps {
    shifts: WorkShift[]; // shifts in the selected date range
    employeeFilter: string; // '' = everyone
    onEmployeeFilterChange: (name: string) => void;
    onEditShift?: (shift: WorkShift) => void;
    onDeleteShift?: (shiftId: string) => void;
    onUpdateShift?: (shift: WorkShift) => Promise<void> | void; // saves an inline work type change
    employees?: Employee[];
}

const PAGE_SIZE = 20;

const formatShiftDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

export default function ShiftHistory({ shifts, employeeFilter, onEmployeeFilterChange, onEditShift, onDeleteShift, onUpdateShift, employees = [] }: ShiftHistoryProps) {
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [typeFilter, setTypeFilter] = useState<WorkType | ''>('');

    const employeeNames = useMemo(() => Array.from(new Set(shifts.map(s => s.employeeName).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [shifts]);

    // Newest first
    const rows = useMemo(() => shifts
        .filter(s => !employeeFilter || s.employeeName === employeeFilter)
        .filter(s => !typeFilter || resolveWorkType(s, employees) === typeFilter)
        .sort((a, b) => b.date.localeCompare(a.date) || (b.startTime || '').localeCompare(a.startTime || '')), [shifts, employeeFilter, typeFilter, employees]);

    // Start back at 20 when the filter or date range changes
    useEffect(() => { setVisibleCount(PAGE_SIZE); }, [employeeFilter, typeFilter, shifts]);

    const shown = rows.slice(0, visibleCount);
    const totals = rows.reduce((t, s) => ({ hours: t.hours + (s.hours || 0), pay: t.pay + (s.totalPay || 0) }), { hours: 0, pay: 0 });

    return (
        <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-brand-brown">Shift history</h3>
                    <p className="text-xs text-gray-500">
                        {rows.length} shift{rows.length === 1 ? '' : 's'} · {totals.hours.toFixed(1)} hrs · ${totals.pay.toFixed(2)} in the selected dates, newest first
                    </p>
                </div>
                <label className="text-xs text-gray-500 flex items-center gap-2">
                    Employee
                    <select value={employeeFilter} onChange={(e) => onEmployeeFilterChange(e.target.value)} className="rounded-md border-gray-300 text-sm py-1">
                        <option value="">Everyone</option>
                        {employeeNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </label>
                <label className="text-xs text-gray-500 flex items-center gap-2">
                    Type
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as WorkType | '')} className="rounded-md border-gray-300 text-sm py-1">
                        <option value="">All types</option>
                        {WORK_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                </label>
            </div>

            {rows.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded border border-dashed border-gray-200">No shifts in these dates{employeeFilter ? ` for ${employeeFilter}` : ''}.</p>
            ) : (
                <div className="border border-gray-200 rounded-xl overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium">Date</th>
                                <th className="px-4 py-2 text-left font-medium">Employee</th>
                                <th className="px-4 py-2 text-left font-medium">Time</th>
                                <th className="px-4 py-2 text-left font-medium">Type</th>
                                <th className="px-4 py-2 text-right font-medium">Hours</th>
                                <th className="px-4 py-2 text-right font-medium">Rate</th>
                                <th className="px-4 py-2 text-right font-medium">Pay</th>
                                <th className="px-4 py-2 text-left font-medium">Notes</th>
                                <th className="px-2 py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {shown.map(shift => (
                                <tr key={shift.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 whitespace-nowrap text-gray-800">{formatShiftDate(shift.date)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <button onClick={() => onEmployeeFilterChange(shift.employeeName)} className="text-gray-900 hover:text-brand-orange" title={`Show only ${shift.employeeName}`}>{shift.employeeName}</button>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">{formatTimeDisplay(shift.startTime)} – {formatTimeDisplay(shift.endTime)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <select
                                            value={resolveWorkType(shift, employees)}
                                            onChange={(e) => onUpdateShift && onUpdateShift({ ...shift, workType: e.target.value as WorkType })}
                                            disabled={!onUpdateShift}
                                            title={shift.workType ? undefined : 'Default for this employee. Pick a type to save it on this shift.'}
                                            className={`rounded border-gray-200 text-xs py-0.5 pr-7 ${shift.workType ? 'text-gray-800' : 'text-gray-400 italic'} ${resolveWorkType(shift, employees) === 'production' ? '' : 'bg-amber-50'}`}
                                        >
                                            {WORK_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}{!shift.workType && resolveWorkType(shift, employees) === t.id ? ' (default)' : ''}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">{(shift.hours || 0).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right tabular-nums text-gray-600">${(shift.hourlyWage || 0).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right tabular-nums font-medium text-green-700">${(shift.totalPay || 0).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-xs text-gray-500 max-w-[220px] truncate" title={shift.notes || ''}>{shift.notes || ''}</td>
                                    <td className="px-2 py-2 whitespace-nowrap text-right">
                                        {onEditShift && <button onClick={() => onEditShift(shift)} className="p-1 text-gray-400 hover:text-brand-orange" aria-label="Edit shift"><PencilIcon className="w-4 h-4" /></button>}
                                        {onDeleteShift && <button onClick={() => { if (window.confirm(`Delete ${shift.employeeName}'s shift on ${formatShiftDate(shift.date)}?`)) onDeleteShift(shift.id); }} className="p-1 text-gray-400 hover:text-red-600" aria-label="Delete shift"><TrashIcon className="w-4 h-4" /></button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {rows.length > visibleCount && (
                <div className="flex justify-center items-center gap-3 mt-3 text-sm">
                    <span className="text-xs text-gray-500">Showing {shown.length} of {rows.length}</span>
                    <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)} className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:border-brand-orange hover:text-brand-orange">Show {Math.min(PAGE_SIZE, rows.length - visibleCount)} more</button>
                    <button onClick={() => setVisibleCount(rows.length)} className="px-3 py-1 rounded-md text-gray-500 hover:text-brand-orange">Show all</button>
                </div>
            )}
        </div>
    );
}
