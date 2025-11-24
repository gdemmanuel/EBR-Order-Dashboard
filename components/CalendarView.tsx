
import React, { useState, useMemo } from 'react';
import { Order, PaymentStatus } from '../types';
import { parseOrderDateTime, generateTimeSlots, normalizeDateStr } from '../utils/dateUtils';
import { ChevronLeftIcon, ChevronRightIcon } from './icons/Icons';
import DayOrdersModal from './DayOrdersModal';
import { getUSHolidays } from '../utils/holidayUtils';
import { AppSettings } from '../services/dbService';

interface CalendarViewProps {
    orders: Order[];
    onSelectOrder: (order: Order) => void;
    onPrintSelected: (orders: Order[]) => void;
    onDelete?: (orderId: string) => void;
    settings: AppSettings;
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ orders, onSelectOrder, onPrintSelected, onDelete, settings }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
    const [selectedDay, setSelectedDay] = useState<{ date: Date; orders: Order[] } | null>(null);

    // --- Navigation Handlers ---
    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
        else if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
        else newDate.setDate(newDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
        else if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
        else newDate.setDate(newDate.getDate() + 1);
        setCurrentDate(newDate);
    };

    // --- Holiday Logic ---
    const holidaysMap = useMemo(() => {
        const holidays = getUSHolidays(currentDate.getFullYear());
        const map = new Map<string, string>();
        holidays.forEach(h => {
            const key = `${h.date.getMonth()}-${h.date.getDate()}`;
            map.set(key, map.has(key) ? `${map.get(key)} / ${h.name}` : h.name);
        });
        return map;
    }, [currentDate.getFullYear()]);

    // --- Group Orders Logic ---
    const getOrdersForDate = (date: Date) => {
        return orders.filter(order => {
            const d = parseOrderDateTime(order);
            return d.getDate() === date.getDate() && 
                   d.getMonth() === date.getMonth() && 
                   d.getFullYear() === date.getFullYear();
        });
    };

    // --- Render Logic for Month View ---
    const renderMonthView = () => {
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

        const cells = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            cells.push(<div key={`empty-${i}`} className="min-h-[120px] bg-gray-50/50 border border-gray-200/50"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const cellDate = new Date(currentYear, currentMonth, day);
            const dailyOrders = getOrdersForDate(cellDate);
            const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
            const holidayName = holidaysMap.get(`${currentMonth}-${day}`);

            cells.push(
                <div 
                    key={day} 
                    className={`min-h-[120px] bg-white border border-gray-200 p-2 flex flex-col gap-1 transition-colors ${isToday ? 'bg-brand-tan/20' : ''} ${dailyOrders.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => dailyOrders.length > 0 && setSelectedDay({ date: cellDate, orders: dailyOrders })}
                >
                    <div className="flex justify-between items-start">
                        <span className={`text-sm font-semibold ${isToday ? 'bg-brand-orange text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-brand-brown/70'}`}>{day}</span>
                        {dailyOrders.length > 0 && <span className="text-xs font-medium text-gray-400">{dailyOrders.length} orders</span>}
                    </div>
                    {holidayName && <div className="text-[10px] font-medium text-purple-700 bg-purple-50 rounded px-1.5 py-0.5 mb-1 truncate border border-purple-100" title={holidayName}>{holidayName}</div>}
                    <div className="flex-grow flex flex-col gap-1 overflow-y-auto max-h-[100px]">
                        {dailyOrders.slice(0, 3).map(order => (
                            <button
                                key={order.id}
                                onClick={(e) => { e.stopPropagation(); onSelectOrder(order); }}
                                className={`text-left text-xs px-2 py-1 rounded truncate transition-colors w-full ${order.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-brand-orange/10 text-brand-brown hover:bg-brand-orange/20'}`}
                                title={`${order.customerName} - ${order.items.reduce((acc, i) => acc + i.quantity, 0)} items`}
                            >
                                {order.pickupTime.split(' ')[0]} {order.customerName.split(' ')[0]}
                            </button>
                        ))}
                        {dailyOrders.length > 3 && <div className="text-xs text-gray-500 text-center font-medium">+ {dailyOrders.length - 3} more</div>}
                    </div>
                </div>
            );
        }
        return <div className="grid grid-cols-7 bg-gray-200 gap-[1px]">{cells}</div>;
    };

    // --- Render Logic for Week View ---
    const renderWeekView = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Go to Sunday

        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + i);
            weekDays.push(dayDate);
        }

        return (
            <div className="grid grid-cols-7 bg-gray-200 gap-[1px] min-h-[600px]">
                {weekDays.map((date, i) => {
                    const dailyOrders = getOrdersForDate(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const holidayName = holidaysMap.get(`${date.getMonth()}-${date.getDate()}`);

                    return (
                        <div key={i} className={`bg-white p-2 flex flex-col gap-2 ${isToday ? 'bg-brand-tan/20' : ''}`}>
                            <div className="text-center border-b pb-2 mb-1">
                                <div className="text-xs font-bold text-gray-500 uppercase">{daysOfWeek[i]}</div>
                                <div className={`text-lg font-bold ${isToday ? 'text-brand-orange' : 'text-brand-brown'}`}>{date.getDate()}</div>
                                {holidayName && <div className="text-[10px] text-purple-700 bg-purple-50 rounded px-1 py-0.5 mt-1 truncate" title={holidayName}>{holidayName}</div>}
                            </div>
                            <div className="flex-grow space-y-2 overflow-y-auto">
                                {dailyOrders.map(order => (
                                    <button
                                        key={order.id}
                                        onClick={() => onSelectOrder(order)}
                                        className={`w-full text-left p-2 rounded border text-xs shadow-sm transition-all ${order.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100' : 'bg-white border-gray-200 hover:border-brand-orange hover:shadow-md'}`}
                                    >
                                        <div className="font-bold">{order.pickupTime}</div>
                                        <div className="truncate">{order.customerName}</div>
                                        <div className="text-gray-500">{order.totalMini + order.totalFullSize} items</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // --- Render Logic for Day View ---
    const renderDayView = () => {
        const dateStr = normalizeDateStr(currentDate.toISOString().split('T')[0]);
        const dailyOrders = getOrdersForDate(currentDate);
        
        // Calculate slots based on settings or default
        const override = settings.scheduling?.dateOverrides?.[dateStr];
        const start = override?.customHours?.start || settings.scheduling?.startTime || "08:00";
        const end = override?.customHours?.end || settings.scheduling?.endTime || "20:00";
        const slots = generateTimeSlots(dateStr, start, end, 60); // 1 hour slots for visualization

        // Group orders by hour
        const ordersByHour: Record<string, Order[]> = {};
        dailyOrders.forEach(o => {
            // Simple parsing: "12:30 PM" -> "12 PM" bucket
            const hourKey = o.pickupTime.split(':')[0] + (o.pickupTime.includes('PM') ? ' PM' : ' AM'); 
            // Note: This is a rough grouping for visualization. 
            // Better: convert both slot and order time to 24h and compare.
            // For simplicity in this view, we'll list orders under their closest slot or just list them sorted.
        });

        // Easier approach for Day View: Vertical Timeline
        // Sort orders by time
        const sortedOrders = [...dailyOrders].sort((a, b) => {
            return parseOrderDateTime(a).getTime() - parseOrderDateTime(b).getTime();
        });

        return (
            <div className="bg-white min-h-[600px] p-4 flex flex-col">
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-serif text-brand-brown">{currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                    <p className="text-gray-500 text-sm">Operating Hours: {start} - {end}</p>
                </div>

                <div className="max-w-3xl mx-auto w-full space-y-4">
                    {sortedOrders.length === 0 ? (
                        <div className="text-center text-gray-400 py-10 italic">No orders scheduled for this day.</div>
                    ) : (
                        sortedOrders.map(order => (
                            <div key={order.id} className="flex gap-4 group">
                                <div className="w-24 text-right pt-2 font-bold text-brand-orange text-sm shrink-0">
                                    {order.pickupTime}
                                </div>
                                <div className="relative pb-8 border-l-2 border-gray-200 pl-6 flex-grow last:border-0">
                                    <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-brand-orange border-2 border-white shadow-sm"></div>
                                    <div 
                                        onClick={() => onSelectOrder(order)}
                                        className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md hover:border-brand-orange transition-all cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-brand-brown text-lg">{order.customerName}</h4>
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${order.paymentStatus === PaymentStatus.PAID ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {order.paymentStatus}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">{order.phoneNumber}</p>
                                        <div className="text-sm bg-gray-50 p-2 rounded border border-gray-100">
                                            {order.items.map((item, idx) => (
                                                <span key={idx} className="block text-gray-700">
                                                    {item.quantity}x {item.name}
                                                </span>
                                            ))}
                                        </div>
                                        {order.deliveryRequired && (
                                            <div className="mt-2 text-xs text-blue-600 font-medium flex items-center gap-1">
                                                Delivery to: {order.deliveryAddress}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="bg-white border border-brand-tan rounded-lg overflow-hidden shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-brand-tan/20 border-b border-brand-tan gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrev} className="p-2 rounded-full hover:bg-gray-200 text-brand-brown transition-colors"><ChevronLeftIcon className="w-5 h-5" /></button>
                        <h2 className="text-xl font-serif text-brand-brown font-semibold min-w-[200px] text-center">
                            {viewMode === 'month' && currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            {viewMode === 'week' && `Week of ${currentDate.toLocaleDateString()}`}
                            {viewMode === 'day' && currentDate.toLocaleDateString()}
                        </h2>
                        <button onClick={handleNext} className="p-2 rounded-full hover:bg-gray-200 text-brand-brown transition-colors"><ChevronRightIcon className="w-5 h-5" /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="text-sm font-medium text-brand-orange hover:underline ml-2">Today</button>
                    </div>

                    <div className="flex bg-white rounded-lg p-1 border border-brand-tan shadow-sm">
                        <button 
                            onClick={() => setViewMode('month')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'month' ? 'bg-brand-orange text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Month
                        </button>
                        <button 
                            onClick={() => setViewMode('week')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'week' ? 'bg-brand-orange text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Week
                        </button>
                        <button 
                            onClick={() => setViewMode('day')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'day' ? 'bg-brand-orange text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Day
                        </button>
                    </div>
                </div>

                {/* Conditional Header for Month/Week grid */}
                {(viewMode === 'month' || viewMode === 'week') && (
                    <div className="grid grid-cols-7 bg-brand-brown text-white text-center py-2 text-xs font-medium uppercase tracking-wide">
                        {daysOfWeek.map(day => <div key={day}>{day}</div>)}
                    </div>
                )}

                {viewMode === 'month' && renderMonthView()}
                {viewMode === 'week' && renderWeekView()}
                {viewMode === 'day' && renderDayView()}
            </div>

            {selectedDay && (
                <DayOrdersModal 
                    date={selectedDay.date}
                    orders={selectedDay.orders}
                    onClose={() => setSelectedDay(null)}
                    onSelectOrder={onSelectOrder}
                    onPrintSelected={onPrintSelected}
                    onDelete={onDelete}
                />
            )}
        </>
    );
}
