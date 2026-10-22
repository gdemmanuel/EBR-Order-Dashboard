import { Employee, WorkShift, WorkType } from '../types';

export const WORK_TYPES: { id: WorkType; label: string; hint: string }[] = [
    { id: 'production', label: 'Production', hint: 'Prep, cooking, packing. Counts toward cost per empanada.' },
    { id: 'events', label: 'Events & markets', hint: 'Fairs, farmers markets, pop-ups.' },
    { id: 'delivery', label: 'Delivery', hint: 'Driving orders to customers.' },
    { id: 'admin', label: 'Admin & other', hint: 'Ordering, office work, anything else.' },
];

export const workTypeLabel = (type: WorkType) => WORK_TYPES.find(t => t.id === type)?.label || type;

// Until a usual work type is saved for them in Team, these people's shifts default to Events & markets
const STARTER_EVENTS_STAFF = ['george', 'dayana', 'alyssa'];

const firstName = (name: string) => (name || '').trim().split(/\s+/)[0].toLowerCase();

/** An employee's usual work type: the one saved in Team, else the starter default. */
export const employeeDefaultWorkType = (employee?: Pick<Employee, 'name' | 'defaultWorkType'>): WorkType => {
    if (employee?.defaultWorkType) return employee.defaultWorkType;
    return employee && STARTER_EVENTS_STAFF.includes(firstName(employee.name)) ? 'events' : 'production';
};

const findEmployee = (shift: Pick<WorkShift, 'employeeId' | 'employeeName'>, employees: Employee[] = []) =>
    employees.find(e => shift.employeeId && e.id === shift.employeeId) ||
    employees.find(e => e.name.trim().toLowerCase() === (shift.employeeName || '').trim().toLowerCase());

/** A shift's work type: its own, else its employee's usual type, else Production. */
export const resolveWorkType = (shift: Pick<WorkShift, 'workType' | 'employeeId' | 'employeeName'>, employees: Employee[] = []): WorkType => {
    if (shift.workType) return shift.workType;
    const employee = findEmployee(shift, employees);
    // Employee not on the team list any more: still apply the starter default by name
    return employeeDefaultWorkType(employee || { name: shift.employeeName });
};

export const isProductionShift = (shift: WorkShift, employees: Employee[] = []) => resolveWorkType(shift, employees) === 'production';
