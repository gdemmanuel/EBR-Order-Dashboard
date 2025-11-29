
import React, { useState, useMemo } from 'react';
import { Order, PaymentStatus } from '../types';
import { parseOrderDateTime } from '../utils/dateUtils';
import { ChevronLeftIcon, ChevronRightIcon } from './icons/Icons';
import DayOrdersModal from './DayOrdersModal';
import { getUSHolidays } from '../utils/holidayUtils';

interface CalendarViewProps {
    orders: Order[];
    onSelectOrder: (order: Order) => void;
    onPrintSelected: (orders: Order[]) => void;
    onDelete?: (orderId: string) => void;
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ orders, onSelectOrder, onPrintSelected, onDelete }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<{ date: Date; orders: Order[] } | null>(null);

    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    };

    // Calculate holidays for the current year
    const holidaysMap = useMemo(() => {
        const holidays = getUSHolidays(currentYear);
        const map = new Map<string, string>();
        holidays.forEach(h => {
            // Key format: "MonthIndex-Day"
            map.set(`${h.date.getMonth()}-${h.date.getDate()}`, h.name);
        });
        return map;
    }, [currentYear]);

    const ordersByDate = useMemo(() => {
        const grouped: Record<number, Order[]> = {};
        orders.forEach(order => {
            const orderDate = parseOrderDateTime(order);
            if (!isNaN(orderDate.getTime()) && 
                orderDate.getMonth() === currentMonth && 
                orderDate.getFullYear() === currentYear) {
                
                const day = orderDate.getDate();
                if (!grouped[day]) {
                    grouped[day] = [];
                }
                grouped[day].push(order);
            }
        });
        return grouped;
    }, [orders, currentMonth, currentYear]);

    const handleDayClick = (day: number, dailyOrders: Order[]) => {
        if (dailyOrders.length > 0) {
            setSelectedDay({
                date: new Date(currentYear, currentMonth, day),
                orders: dailyOrders
            });
        }
    };

    const renderCalendarCells = () => {
        const cells = [];
        
        // Empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            cells.push(<div key={`empty-${i}`} className="min-h-[120px] bg-gray-50/50 border border-gray-200/50"></div>);
        }

        // Cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dailyOrders = ordersByDate[day] || [];
            const isToday = 
                day === new Date().getDate() && 
                currentMonth === new Date().getMonth() && 
                currentYear === new Date().getFullYear();
            
            const hasOrders = dailyOrders.length > 0;
            const holidayName = holidaysMap.get(`${currentMonth}-${day}`);

            cells.push(
                <div 
                    key={day} 
                    className={`min-h-[120px] bg-white border border-gray-200 p-2 flex flex-col gap-1 transition-colors ${isToday ? 'bg-brand-tan/20' : ''} ${hasOrders ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => handleDayClick(day, dailyOrders)}
                >
                    <div className="flex justify-between items-start">
                        <span className={`text-sm font-semibold ${isToday ? 'bg-brand-orange text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-brand-brown/70'}`}>
                            {day}
                        </span>
                        {dailyOrders.length > 0 && (
                             <span className="text-xs font-medium text-gray-400">{dailyOrders.length} orders</span>
                        )}
                    </div>

                    {/* Holiday Indicator */}
                    {holidayName && (
                        <div className="text-[10px] font-medium text-purple-700 bg-purple-50 rounded px-1.5 py-0.5 mb-1 truncate border border-purple-100" title={holidayName}>
                            {holidayName}
                        </div>
                    )}
                    
                    <div className="flex-grow flex flex-col gap-1 overflow-y-auto max-h-[100px]">
                        {dailyOrders.slice(0, 3).map(order => (
                            <button
                                key={order.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectOrder(order);
                                }}
                                className={`text-left text-xs px-2 py-1 rounded truncate transition-colors w-full ${
                                    order.paymentStatus === PaymentStatus.PAID 
                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                        : 'bg-brand-orange/10 text-brand-brown hover:bg-brand-orange/20'
                                }`}
                                title={`${order.customerName} - ${order.items.reduce((acc, i) => acc + i.quantity, 0)} items`}
                            >
                                {order.pickupTime.split(' ')[0]} {order.customerName.split(' ')[0]}
                            </button>
                        ))}
                        {dailyOrders.length > 3 && (
                            <div className="text-xs text-gray-500 text-center font-medium">
                                + {dailyOrders.length - 3} more
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return cells;
    };

    return (
        <>
            <div className="bg-white border border-brand-tan rounded-lg overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-6 py-4 bg-brand-tan/20 border-b border-brand-tan">
                    <h2 className="text-xl font-serif text-brand-brown font-semibold">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200 text-brand-brown transition-colors">
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <button onClick={handlePrevMonth} className="text-sm font-medium text-brand-brown hover:underline hidden sm:block">
                            Prev
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="text-sm font-medium text-brand-orange hover:underline px-2">
                            Today
                        </button>
                        <button onClick={handleNextMonth} className="text-sm font-medium text-brand-brown hover:underline hidden sm:block">
                            Next
                        </button>
                        <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200 text-brand-brown transition-colors">
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 bg-brand-brown text-white text-center py-2 text-xs font-medium uppercase tracking-wide">
                    {daysOfWeek.map(day => (
                        <div key={day}>{day}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 bg-gray-200 gap-[1px]">
                    {renderCalendarCells()}
                </div>
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
