import { CompetitorPrice } from '../types';

// Starter list from public menus and listings checked on 2026-10-16.
// Shown until competitor prices are saved in Settings → Menu and pricing → Competitors.
export const STARTER_COMPETITOR_PRICES: CompetitorPrice[] = [
    { id: 'seed-1', competitor: 'Island Empanada', location: 'Merrick', size: 'full', quantity: 1, price: 4.19, note: 'In-store menu, most savory flavors', checkedOn: '2026-10-16' },
    { id: 'seed-2', competitor: 'Island Empanada', location: 'Merrick', size: 'full', quantity: 10, price: 37.49, note: 'Box of any 10', checkedOn: '2026-10-16' },
    { id: 'seed-3', competitor: 'Island Empanada', location: 'Merrick', size: 'full', quantity: 20, price: 74.99, note: 'Box of any 20', checkedOn: '2026-10-16' },
    { id: 'seed-4', competitor: 'Island Empanada', location: 'Catering', size: 'full', quantity: 100, price: 369.99, note: '100 assorted, 5 flavors', checkedOn: '2026-10-16' },
    { id: 'seed-5', competitor: 'Island Empanada', location: 'Ronkonkoma / Medford', size: 'mini', quantity: 30, price: 59.59, note: '"Starting at" price; minis only at these two stores', checkedOn: '2026-10-16' },
    { id: 'seed-6', competitor: 'The Empanada Spot', location: 'Farmingdale', size: 'full', quantity: 1, price: 4.25, note: 'Delivery app price (usually higher than in-store)', checkedOn: '2026-10-16' },
    { id: 'seed-7', competitor: 'Empanada Papa', location: 'East Meadow', size: 'full', quantity: 2, price: 9.50, note: 'Older menu listing, 2 per order', checkedOn: '2026-10-16' },
    { id: 'seed-8', competitor: "Frida's Mexican Grill", location: 'Seaford', size: 'full', quantity: 3, price: 16.95, note: 'Restaurant menu, 3 per order', checkedOn: '2026-10-16' },
    { id: 'seed-9', competitor: 'La Isla Restaurant', location: 'Location not confirmed', size: 'mini', quantity: 12, price: 40.00, note: 'Catering menu, per dozen', checkedOn: '2026-10-16' },
];
