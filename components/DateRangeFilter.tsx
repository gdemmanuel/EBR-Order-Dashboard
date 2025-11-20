
import React, { useState } from 'react';

interface DateRangeFilterProps {
    initialStartDate?: string;
    initialEndDate?: string;
    onDateChange: (range: { start?: string; end?: string }) => void;
}

const getISODateString = (date: Date) => {
    // Returns YYYY-MM-DD using local time
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function DateRangeFilter({ initialStartDate = '', initialEndDate = '', onDateChange }: DateRangeFilterProps) {
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);

    const handleApplyFilter = () => {
        if (startDate || endDate) {
            onDateChange({ start: startDate, end: endDate });
        }
    };

    const handleClearFilter = () => {
        setStartDate('');
        setEndDate('');
        onDateChange({});
    };

    const setPreset = (preset: 'today' | 'week' | 'month') => {
        const today = new Date();
        let start = new Date(today);
        let end = new Date(today);

        switch (preset) {
            case 'today':
                break;
            case 'week':
                start.setDate(today.getDate() - today.getDay()); // Sunday
                end.setDate(start.getDate() + 6); // Saturday
                break;
            case 'month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
        }

        const startStr = getISODateString(start);
        const endStr = getISODateString(end);
        setStartDate(startStr);
        setEndDate(endStr);
        onDateChange({ start: startStr, end: endStr });
    };

    return (
        <div className="bg-white p-4 rounded-lg border border-brand-tan/80 shadow-sm mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
                <div>
                    <label htmlFor="start-date" className="block text-sm font-medium text-brand-brown/80">Start Date</label>
                    <input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="end-date" className="block text-sm font-medium text-brand-brown/80">End Date</label>
                    <input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown sm:text-sm"
                    />
                </div>
                <div className="self-end">
                     <button
                        onClick={handleApplyFilter}
                        className="bg-brand-orange text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-opacity-90 transition-all text-sm"
                    >
                        Apply Filter
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-4">
                <button onClick={() => setPreset('today')} className="text-sm font-medium text-brand-brown/80 hover:text-brand-orange px-3 py-1 rounded-md bg-brand-tan/60 hover:bg-brand-tan transition-colors">Today</button>
                <button onClick={() => setPreset('week')} className="text-sm font-medium text-brand-brown/80 hover:text-brand-orange px-3 py-1 rounded-md bg-brand-tan/60 hover:bg-brand-tan transition-colors">This Week</button>
                <button onClick={() => setPreset('month')} className="text-sm font-medium text-brand-brown/80 hover:text-brand-orange px-3 py-1 rounded-md bg-brand-tan/60 hover:bg-brand-tan transition-colors">This Month</button>
                 <button
                    onClick={handleClearFilter}
                    className="text-sm font-medium text-red-600 hover:text-red-800 px-3 py-1"
                    title="Clear date filter"
                >
                    Clear
                </button>
            </div>
        </div>
    );
}
