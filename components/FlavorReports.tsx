import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AppSettings, ApprovalStatus, CompetitorPrice, Order, WorkShift } from '../types';
import { calculatePriceForType, getHistoricalIngredientPrice } from '../utils/pricingUtils';
import { parseOrderDateTime } from '../utils/dateUtils';
import { STARTER_COMPETITOR_PRICES } from '../data/competitorPrices';
import { findCompetitorPrices, FoundCompetitorPrice } from '../services/geminiService';
import {
    DEFAULT_TARGET_MARGIN, ItemSize, actualLabor, fullToMiniRatio, hasRecipe, isSalsaName, laborCostPerUnit, lowestPrice,
    profitByFlavor, supplyCostPerUnit
} from '../utils/costUtils';

interface FlavorReportsProps {
    orders: Order[]; // orders in the Reports date range
    shifts?: WorkShift[]; // shifts in the Reports date range (for actual labor)
    settings: AppSettings;
    dateRange: { start?: string; end?: string }; // the Reports date filter (defaults to the last 12 months)
    onUpdateCompetitorPrices?: (prices: CompetitorPrice[]) => Promise<void> | void;
}

const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromDateStr = (s: string, endOfDay = false) => {
    const [y, m, d] = s.split('-').map(Number);
    return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d);
};
// With no start date the charts cover the last 12 months; with no end date, through today
const resolveRange = (dateRange: { start?: string; end?: string }) => {
    const now = new Date();
    return {
        start: dateRange.start || toDateStr(new Date(now.getFullYear(), now.getMonth() - 11, 1)),
        end: dateRange.end || toDateStr(now),
    };
};

// Points for the cost chart: weekly for ranges up to ~3 months, otherwise monthly (mid-month, clamped to the range)
const chartPoints = (start: Date, end: Date): { date: Date; label: string }[] => {
    const days = (end.getTime() - start.getTime()) / 86400000;
    const points: { date: Date; label: string }[] = [];
    if (days <= 95) {
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
            points.push({ date: new Date(d), label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
        }
    } else {
        for (let m = new Date(start.getFullYear(), start.getMonth(), 1); m <= end; m.setMonth(m.getMonth() + 1)) {
            const mid = new Date(m.getFullYear(), m.getMonth(), 15);
            const date = mid < start ? start : mid > end ? end : mid;
            points.push({ date, label: m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) });
        }
    }
    const last = points[points.length - 1];
    if (!last || last.date.getTime() !== end.getTime()) {
        if (days <= 95 || !last) points.push({ date: end, label: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
    }
    return points;
};

// Shown first and on by default in the cost chart, in this order
const CORE_FLAVORS = ['Beef', 'Beef & Cheese', 'Chicken', 'Chicken & Cheese', 'Buffalo Chicken', 'Cheese', 'Philly Cheesesteak'];
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#0f766e', '#a16207', '#7c3aed', '#be185d'];
const DASHES = ['', '6 3', '', '6 3', '2 3', '', '2 3', '6 3', '', '2 3', '6 3', ''];

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;
const roundUpTo5Cents = (n: number) => Math.ceil(n * 20 - 1e-9) / 20;

export default function FlavorReports({ orders, shifts = [], settings, dateRange, onUpdateCompetitorPrices }: FlavorReportsProps) {
    const [size, setSize] = useState<ItemSize>('mini');
    const recipeFlavors = useMemo(() => {
        const visible = (settings.empanadaFlavors || []).filter(f => f.visible !== false).map(f => f.name);
        const withRecipe = visible.filter(f => hasRecipe(settings, f));
        const core = CORE_FLAVORS.filter(f => withRecipe.includes(f));
        const others = withRecipe.filter(f => !core.includes(f)).sort((a, b) => a.localeCompare(b));
        return [...core, ...others];
    }, [settings]);
    // Core flavors show by default, others are hidden; clicking a flavor flips it
    const [toggled, setToggled] = useState<Set<string>>(new Set());
    const isHidden = (f: string) => (CORE_FLAVORS.includes(f) ? toggled.has(f) : !toggled.has(f));

    const targetMargin = (Number(settings.prepSettings?.targetMargin) || DEFAULT_TARGET_MARGIN) / 100;

    // Dates come from the Reports date filter at the top of the page
    const range = resolveRange(dateRange);
    const [hoverFlavor, setHoverFlavor] = useState<string | null>(null);
    const rangeStart = fromDateStr(range.start);
    const rangeEnd = fromDateStr(range.end, true);
    const rangeValid = rangeStart <= rangeEnd;
    const rangeLabel = `${rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${rangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // --- 1. Flavor cost over time ---
    const costSeries = useMemo(() => {
        if (!rangeValid) return [];
        return chartPoints(rangeStart, fromDateStr(range.end)).map(({ date, label }) => {
            const point: Record<string, any> = { month: label };
            recipeFlavors.forEach(f => { point[f] = Math.round(supplyCostPerUnit(settings, f, size, date) * 1000) / 1000; });
            return point;
        });
    }, [settings, recipeFlavors, size, range.start, range.end]);

    const costSummary = useMemo(() => {
        const shown = recipeFlavors.filter(f => !isHidden(f));
        if (shown.length === 0 || costSeries.length < 2) return null;
        const first = costSeries[0], last = costSeries[costSeries.length - 1];
        const changes = shown.map(f => ({ flavor: f, from: first[f], to: last[f], change: first[f] > 0 ? (last[f] - first[f]) / first[f] : 0 }));
        const rise = [...changes].sort((a, b) => b.change - a.change)[0];
        const drop = [...changes].sort((a, b) => a.change - b.change)[0];
        const costliest = [...changes].sort((a, b) => b.to - a.to)[0];
        return { rise, drop, costliest };
    }, [costSeries, recipeFlavors, toggled]);

    // --- Labor per empanada: estimate (Prep settings) vs actual (logged shifts) ---
    const labor = useMemo(() => actualLabor(settings, orders, shifts, range.start, range.end), [settings, orders, shifts, range.start, range.end]);
    const estimatedLabor = { mini: laborCostPerUnit(settings, 'mini'), full: laborCostPerUnit(settings, 'full') };
    const [laborBasis, setLaborBasisState] = useState<'estimated' | 'actual'>(() => {
        try { return localStorage.getItem('reports.laborBasis') === 'actual' ? 'actual' : 'estimated'; } catch { return 'estimated'; }
    });
    const setLaborBasis = (basis: 'estimated' | 'actual') => {
        setLaborBasisState(basis);
        try { localStorage.setItem('reports.laborBasis', basis); } catch { /* storage unavailable */ }
    };
    const usingActualLabor = laborBasis === 'actual' && labor.perMini !== null && labor.perFull !== null;
    const laborUnit = usingActualLabor ? { mini: labor.perMini as number, full: labor.perFull as number } : estimatedLabor;

    // --- 2. Profit by flavor (approved orders in the date range) ---
    const profit = useMemo(() => {
        const sold = orders.filter(o => {
            if (o.approvalStatus !== ApprovalStatus.APPROVED || o.deleted || !rangeValid) return false;
            const d = parseOrderDateTime(o);
            return !isNaN(d.getTime()) && d >= rangeStart && d <= rangeEnd;
        });
        const rows = profitByFlavor(settings, sold, laborUnit).map(r => {
            const cost = r.supplyCost + r.laborCost;
            return { ...r, cost, profit: r.revenue - cost, margin: r.revenue > 0 ? (r.revenue - cost) / r.revenue : 0 };
        });
        const empanadas = rows.filter(r => !r.isSalsa).sort((a, b) => b.profit - a.profit);
        const salsas = rows.filter(r => r.isSalsa).sort((a, b) => b.profit - a.profit);
        const totals = rows.reduce((t, r) => ({ revenue: t.revenue + r.revenue, cost: t.cost + r.cost, supply: t.supply + r.supplyCost, labor: t.labor + r.laborCost }), { revenue: 0, cost: 0, supply: 0, labor: 0 });
        const minis = empanadas.reduce((s, r) => s + r.miniSold, 0);
        const fulls = empanadas.reduce((s, r) => s + r.fullSold, 0);
        const maxProfit = Math.max(1, ...empanadas.map(r => Math.abs(r.profit)), ...salsas.map(r => Math.abs(r.profit)));
        return { empanadas, salsas, totals, minis, fulls, orderCount: sold.length, maxProfit };
    }, [orders, settings, range.start, range.end, laborUnit.mini, laborUnit.full]);

    // --- 3. Margin alerts (today's costs vs lowest price a customer can pay) ---
    const alerts = useMemo(() => {
        const list: { level: 'danger' | 'warning' | 'info'; title: string; detail: string }[] = [];
        const today = new Date();
        const visible = (settings.empanadaFlavors || []).filter(f => f.visible !== false);

        visible.forEach(f => {
            if (!hasRecipe(settings, f.name)) return;
            (['mini', 'full'] as ItemSize[]).forEach(sz => {
                const cost = supplyCostPerUnit(settings, f.name, sz, today) + laborUnit[sz];
                const price = lowestPrice(settings, f.name, sz);
                if (price <= 0) return;
                const margin = 1 - cost / price;
                if (margin >= targetMargin) return;
                const currentSurcharge = Number(sz === 'full' ? f.fullSurcharge : f.surcharge) || 0;
                const neededPrice = cost / (1 - targetMargin);
                const newSurcharge = roundUpTo5Cents(currentSurcharge + (neededPrice - price));
                list.push({
                    level: margin < targetMargin - 0.1 ? 'danger' : 'warning',
                    title: `${f.name} (${sz === 'full' ? 'full size' : 'mini'}) is at ${pct(margin)} at its lowest price`,
                    detail: `Costs ${money(cost)} each (${money(cost - laborUnit[sz])} supplies + ${money(laborUnit[sz])} ${usingActualLabor ? "actual" : "estimated"} labor) and can sell for as little as ${money(price)}. A ${sz === 'full' ? 'full size' : 'mini'} surcharge of ${money(newSurcharge)}${currentSurcharge ? ` (now ${money(currentSurcharge)})` : ''} brings it to ${pct(targetMargin)}.`,
                });
            });
        });

        // Ingredient prices up 10% or more over the selected dates, for ingredients in menu recipes
        const periodStart = rangeValid ? rangeStart : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90);
        const periodEnd = rangeValid && rangeEnd < today ? rangeEnd : today;
        const recipes = settings.prepSettings?.recipes || {};
        (settings.ingredients || []).forEach(ing => {
            const usedBy = visible.filter(f => (recipes[f.name] || []).some(r => r.ingredientId === ing.id)).map(f => f.name);
            if (usedBy.length === 0 || !ing.priceHistory?.length) return;
            const then = getHistoricalIngredientPrice(ing, periodStart);
            const now = getHistoricalIngredientPrice(ing, periodEnd);
            if (then <= 0 || (now - then) / then < 0.1) return;
            list.push({
                level: 'warning',
                title: `${ing.name} is up ${pct((now - then) / then)} since ${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
                detail: `${money(then)} → ${money(now)} per ${ing.unit}. Used in ${usedBy.join(', ')}.`,
            });
        });

        const noRecipe = visible.filter(f => !hasRecipe(settings, f.name) && !isSalsaName(settings, f.name)).map(f => f.name);
        if (noRecipe.length > 0) {
            list.push({ level: 'info', title: `${noRecipe.length} menu flavor${noRecipe.length === 1 ? ' has' : 's have'} no recipe`, detail: `Margins can't be checked for ${noRecipe.join(', ')}. Add recipes in Settings → Kitchen and costs → Recipes.` });
        }

        const order = { danger: 0, warning: 1, info: 2 };
        return list.sort((a, b) => order[a.level] - order[b.level]);
    }, [settings, targetMargin, range.start, range.end, laborUnit.mini, laborUnit.full, usingActualLabor]);

    // --- 4. Market comparison: competitor price per empanada vs yours for the same quantity ---
    const market = useMemo(() => {
        const competitors = settings.competitorPrices ?? STARTER_COMPETITOR_PRICES;
        const regularPackages = (settings.pricing?.packages || []).filter(p => !p.isPartyPlatter && !p.isSpecial && p.visible !== false);
        const yourTotal = (size: ItemSize, qty: number) => {
            const product = size === 'full' ? settings.pricing?.full : settings.pricing?.mini;
            return calculatePriceForType(qty, Number(product?.basePrice) || 0, product?.tiers || [], regularPackages, size);
        };
        const rows = competitors
            .filter(c => c.quantity > 0 && c.price > 0)
            .map(c => {
                const theirEach = c.price / c.quantity;
                const yourEach = yourTotal(c.size, c.quantity) / c.quantity;
                return { ...c, theirEach, yourEach, diff: theirEach > 0 ? (yourEach - theirEach) / theirEach : 0 };
            })
            .sort((a, b) => a.size.localeCompare(b.size) || a.quantity - b.quantity || a.theirEach - b.theirEach);
        const summary = (['full', 'mini'] as ItemSize[]).map(size => {
            const list = rows.filter(r => r.size === size);
            if (list.length === 0) return null;
            const avgDiff = list.reduce((s, r) => s + r.diff, 0) / list.length;
            const avgTheirs = list.reduce((s, r) => s + r.theirEach, 0) / list.length;
            return { size, avgDiff, avgTheirs, count: list.length };
        }).filter(Boolean) as { size: ItemSize; avgDiff: number; avgTheirs: number; count: number }[];
        return { rows, summary, usingStarter: !settings.competitorPrices };
    }, [settings]);

    // "Check for updated prices": web search via the AI proxy, reviewed by the user before saving
    const [priceCheck, setPriceCheck] = useState<{ status: 'idle' | 'checking' | 'done' | 'error'; found: FoundCompetitorPrice[]; selected: Set<number>; message: string }>(
        { status: 'idle', found: [], selected: new Set(), message: '' });
    const savedCompetitors = settings.competitorPrices ?? STARTER_COMPETITOR_PRICES;
    const sameKey = (a: { competitor: string; location?: string; size: string; quantity: number }, b: typeof a) =>
        a.competitor.trim().toLowerCase() === b.competitor.trim().toLowerCase() &&
        (a.location || '').trim().toLowerCase() === (b.location || '').trim().toLowerCase() &&
        a.size === b.size && Number(a.quantity) === Number(b.quantity);
    const findMatch = (f: FoundCompetitorPrice) =>
        savedCompetitors.find(c => sameKey(c, f)) ||
        savedCompetitors.find(c => c.competitor.trim().toLowerCase() === f.competitor.trim().toLowerCase() && c.size === f.size && Number(c.quantity) === f.quantity);
    const checkPrices = async () => {
        setPriceCheck({ status: 'checking', found: [], selected: new Set(), message: '' });
        try {
            const found = await findCompetitorPrices(savedCompetitors);
            // Pre-select new prices and changed prices
            const selected = new Set<number>();
            found.forEach((f, idx) => { const m = findMatch(f); if (!m || Math.abs(Number(m.price) - f.price) > 0.005) selected.add(idx); });
            setPriceCheck({ status: 'done', found, selected, message: '' });
        } catch (e: any) {
            const local = typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname);
            setPriceCheck({
                status: 'error', found: [], selected: new Set(),
                message: local
                    ? 'The price check runs through the app\'s server functions, which aren\'t running with "npm run dev". Try it on the live site or a Vercel preview (or run "vercel dev").'
                    : `Couldn't check prices right now. ${e?.message || ''}`.trim(),
            });
        }
    };
    const toggleFound = (idx: number) => setPriceCheck(p => { const s = new Set(p.selected); if (s.has(idx)) s.delete(idx); else s.add(idx); return { ...p, selected: s }; });
    const saveFound = async () => {
        if (!onUpdateCompetitorPrices) return;
        const today = toDateStr(new Date());
        let next = [...savedCompetitors];
        priceCheck.found.forEach((f, idx) => {
            if (!priceCheck.selected.has(idx)) return;
            const note = [f.note, f.sourceUrl].filter(Boolean).join(' · ') || undefined;
            const existing = findMatch(f);
            if (existing) {
                next = next.map(c => c.id === existing.id ? { ...c, price: f.price, note: note || c.note, checkedOn: today } : c);
            } else {
                next.push({ id: 'comp-' + Date.now() + '-' + idx, competitor: f.competitor, location: f.location, size: f.size, quantity: f.quantity, price: f.price, note, checkedOn: today });
            }
        });
        try {
            await onUpdateCompetitorPrices(next);
            setPriceCheck({ status: 'idle', found: [], selected: new Set(), message: '' });
        } catch (e: any) {
            setPriceCheck(p => ({ ...p, status: 'error', message: `Couldn't save prices. ${e?.message || ''}`.trim() }));
        }
    };

    const toggleFlavor = (f: string) => setToggled(prev => { const next = new Set(prev); if (next.has(f)) next.delete(f); else next.add(f); return next; });
    const card = 'bg-white p-6 rounded-lg border border-brand-tan shadow-sm';
    const stat = (label: string, value: string, sub: string) => (
        <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-semibold text-brand-brown">{value}</p>
            <p className="text-xs text-gray-500">{sub}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Labor per empanada */}
            <div className={card}>
                <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-brand-brown">Labor per empanada</h3>
                        <p className="text-xs text-gray-500">
                            Estimated from Prep settings (${Number(settings.laborWage) || 0}/hr at {Number(settings.prepSettings?.productionRates?.mini) || 0} minis or {Number(settings.prepSettings?.productionRates?.full) || 0} full per hour)
                            vs actual from logged shifts ÷ empanadas on approved orders. A full size counts as {fullToMiniRatio(settings).toFixed(1)} minis.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        Use for margins
                        <div className="flex rounded-md border border-gray-300 overflow-hidden">
                            <button onClick={() => setLaborBasis('estimated')} className={`px-3 py-1.5 ${!usingActualLabor ? 'bg-brand-brown text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Estimated</button>
                            <button onClick={() => setLaborBasis('actual')} disabled={labor.perMini === null} title={labor.perMini === null ? 'No logged shifts with orders in these dates yet' : undefined} className={`px-3 py-1.5 ${usingActualLabor ? 'bg-brand-brown text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} disabled:opacity-40 disabled:cursor-not-allowed`}>Actual</button>
                        </div>
                    </div>
                </div>

                {!labor.tracked ? (
                    <p className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg px-4 py-6 text-center">
                        Shift tracking started {fromDateStr(labor.trackingStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. Pick dates after that to see actual labor.
                    </p>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            {stat('Per mini', labor.perMini !== null ? money(labor.perMini) : '–', `estimate ${money(estimatedLabor.mini)}`)}
                            {stat('Per full size', labor.perFull !== null ? money(labor.perFull) : '–', `estimate ${money(estimatedLabor.full)}`)}
                            {stat('Minis per labor hour', labor.minisPerHour !== null ? labor.minisPerHour.toFixed(1) : '–', `setting ${Number(settings.prepSettings?.productionRates?.mini) || 0}/hr`)}
                            {stat('Labor paid', money(labor.pay), `${labor.hours.toFixed(1)} hrs · ${labor.minis} mini + ${labor.fulls} full`)}
                        </div>

                        {labor.series.filter(w => w.perMini !== null).length >= 2 && (
                            <div className="h-[200px] w-full mb-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={labor.series.map(w => ({ week: `Wk of ${w.label}`, actual: w.perMini !== null ? Math.round(w.perMini * 100) / 100 : null, estimate: Math.round(estimatedLabor.mini * 100) / 100 }))} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid stroke="#e1e0d9" vertical={false} />
                                        <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#898781' }} axisLine={false} tickLine={false} />
                                        <YAxis domain={[0, 'auto']} tick={{ fontSize: 12, fill: '#898781' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Number(v).toFixed(2)}`} width={56} />
                                        <Tooltip formatter={(v: any, name: any) => [`$${Number(v).toFixed(2)}`, name === 'actual' ? 'Actual per mini' : 'Estimate per mini']} />
                                        <Line type="monotone" dataKey="actual" stroke="#2a78d6" strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
                                        <Line type="monotone" dataKey="estimate" stroke="#898781" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        <div className="space-y-1 text-xs">
                            <p className="text-gray-500">
                                Tracking since {fromDateStr(labor.trackingStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {labor.weeks} week{labor.weeks === 1 ? '' : 's'} of data in these dates
                                {labor.start !== range.start ? ' (dates before tracking started are left out)' : ''}.
                            </p>
                            {labor.early && (
                                <p className="text-amber-700">Early numbers: less than 4 weeks or 300 minis of data, so actual labor can swing a lot week to week.</p>
                            )}
                            {labor.minisPerHour !== null && labor.perMini !== null && Math.abs(labor.perMini - estimatedLabor.mini) / (estimatedLabor.mini || 1) > 0.15 && (
                                <p className="text-blue-700">
                                    Actual labor is {pct(Math.abs(labor.perMini - estimatedLabor.mini) / (estimatedLabor.mini || 1))} {labor.perMini > estimatedLabor.mini ? 'higher' : 'lower'} than the estimate.
                                    {!labor.early && <> Consider setting minis per hour to about {Math.round(labor.minisPerHour)} in Settings → Kitchen and costs → Prep settings.</>}
                                </p>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* 1. Flavor cost over time */}
            <div className={card}>
                <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-brand-brown">Flavor cost over time</h3>
                        <p className="text-xs text-gray-500">Supply cost per {size === 'full' ? 'full size' : 'mini'}, {rangeLabel}. Uses the ingredient prices you recorded and today's recipes. Hover a line or a flavor to highlight it.</p>
                    </div>
                    <div className="flex rounded-md border border-gray-300 overflow-hidden text-xs">
                        {(['mini', 'full'] as ItemSize[]).map(sz => (
                            <button key={sz} onClick={() => setSize(sz)} className={`px-3 py-1.5 ${size === sz ? 'bg-brand-brown text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{sz === 'mini' ? 'Mini' : 'Full size'}</button>
                        ))}
                    </div>
                </div>

                {costSummary && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                        {stat('Biggest rise', `${costSummary.rise.flavor} ${costSummary.rise.change >= 0 ? '+' : ''}${pct(costSummary.rise.change)}`, `${money(costSummary.rise.from)} → ${money(costSummary.rise.to)}`)}
                        {stat('Biggest drop', `${costSummary.drop.flavor} ${costSummary.drop.change >= 0 ? '+' : ''}${pct(costSummary.drop.change)}`, `${money(costSummary.drop.from)} → ${money(costSummary.drop.to)}`)}
                        {stat('Costliest now', `${costSummary.costliest.flavor}`, `${money(costSummary.costliest.to)} per ${size === 'full' ? 'full size' : 'mini'}`)}
                    </div>
                )}

                <div className="flex flex-wrap gap-1.5 mb-3">
                    {recipeFlavors.map((f, i) => (
                        <button key={f} onClick={() => toggleFlavor(f)} onMouseEnter={() => !isHidden(f) && setHoverFlavor(f)} onMouseLeave={() => setHoverFlavor(null)} className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs ${isHidden(f) ? 'border-gray-200 text-gray-400' : 'border-gray-300 text-gray-700'}`}>
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length], opacity: isHidden(f) ? 0.3 : 1 }} />
                            {f}
                        </button>
                    ))}
                </div>

                {recipeFlavors.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-200 text-gray-400 text-sm">Add recipes to see flavor costs.</div>
                ) : (
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={costSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid stroke="#e1e0d9" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#898781' }} axisLine={false} tickLine={false} />
                                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: '#898781' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Number(v).toFixed(2)}`} width={56} />
                                <Tooltip content={({ active, payload, label }: any) => {
                                    if (!active || !payload?.length) return null;
                                    const items = [...payload].sort((a: any, b: any) => b.value - a.value);
                                    return (
                                        <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-xs">
                                            <p className="font-semibold text-gray-800 mb-1">{label}</p>
                                            {items.map((p: any) => (
                                                <div key={p.dataKey} className={`flex items-center justify-between gap-4 ${hoverFlavor && hoverFlavor !== p.dataKey ? 'text-gray-400' : 'text-gray-800'} ${hoverFlavor === p.dataKey ? 'font-semibold' : ''}`}>
                                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />{p.dataKey}</span>
                                                    <span className="tabular-nums">${Number(p.value).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }} />
                                {recipeFlavors.map((f, i) => isHidden(f) ? null : (
                                    <Line
                                        key={f}
                                        type="monotone"
                                        dataKey={f}
                                        stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                                        strokeDasharray={DASHES[i % DASHES.length]}
                                        strokeWidth={hoverFlavor === f ? 3.5 : 2}
                                        strokeOpacity={hoverFlavor && hoverFlavor !== f ? 0.2 : 1}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                        onMouseEnter={() => setHoverFlavor(f)}
                                        onMouseLeave={() => setHoverFlavor(null)}
                                        isAnimationActive={false}
                                        label={hoverFlavor === f ? ({ x, y, index }: any) => index === costSeries.length - 1 ? (
                                            <text x={x} y={y - 10} textAnchor="end" fontSize={12} fontWeight={600} fill={SERIES_COLORS[i % SERIES_COLORS.length]}>{f}</text>
                                        ) : <g /> : undefined}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* 2. Profit by flavor */}
            <div className={card}>
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-brand-brown">Profit by flavor</h3>
                    <p className="text-xs text-gray-500">
                        {profit.orderCount} approved orders, {rangeLabel}. Each order's total (less delivery) is split across its items by list price.
                        Cost is supplies at the order date plus {usingActualLabor ? 'actual labor from logged shifts' : 'estimated labor from Prep settings'} ({money(laborUnit.mini)} per mini, {money(laborUnit.full)} per full).
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {stat('Revenue', money(profit.totals.revenue), `${profit.minis} mini · ${profit.fulls} full`)}
                    {stat('Cost', money(profit.totals.cost), `${money(profit.totals.supply)} supplies + ${money(profit.totals.labor)} labor`)}
                    {stat('Profit', money(profit.totals.revenue - profit.totals.cost), 'before other expenses')}
                    {stat('Margin', profit.totals.revenue > 0 ? pct((profit.totals.revenue - profit.totals.cost) / profit.totals.revenue) : '–', `target ${pct(targetMargin)}`)}
                </div>

                {profit.empanadas.length + profit.salsas.length === 0 ? (
                    <div className="h-[120px] flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-200 text-gray-400 text-sm">No approved orders in these dates.</div>
                ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_90px_90px_90px_64px] gap-3 px-4 py-2 bg-gray-50 text-xs text-gray-500 font-medium">
                            <span>Flavor</span><span>Profit</span><span className="text-right">Sold</span><span className="text-right">Revenue</span><span className="text-right">Cost</span><span className="text-right">Margin</span>
                        </div>
                        {[...profit.empanadas, ...profit.salsas].map(r => {
                            const barColor = r.margin < targetMargin - 0.1 ? 'bg-red-400' : r.margin < targetMargin ? 'bg-amber-400' : 'bg-blue-500';
                            return (
                                <div key={r.flavor} className={`grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_90px_90px_90px_64px] gap-3 px-4 py-2 border-t border-gray-100 text-sm items-center ${r.isSalsa ? 'bg-amber-50/40' : ''}`}>
                                    <span className="truncate text-gray-900">
                                        {r.flavor}
                                        {!r.hasRecipe && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-medium">no recipe</span>}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <span className={`h-2.5 rounded-r ${barColor}`} style={{ width: `${Math.max(2, (Math.max(0, r.profit) / profit.maxProfit) * 100)}%` }} />
                                        <span className="text-xs text-gray-600 tabular-nums whitespace-nowrap">{money(r.profit)}</span>
                                    </span>
                                    <span className="text-right tabular-nums text-gray-700">{r.isSalsa ? r.miniSold : `${r.miniSold}${r.fullSold ? ` + ${r.fullSold}F` : ''}`}</span>
                                    <span className="text-right tabular-nums">{money(r.revenue)}</span>
                                    <span className="text-right tabular-nums text-gray-600">{money(r.cost)}</span>
                                    <span className={`text-right tabular-nums font-medium ${r.margin < targetMargin ? 'text-red-600' : 'text-gray-800'}`}>{r.revenue > 0 ? pct(r.margin) : '–'}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                <p className="text-xs text-gray-400 mt-2">"F" = full size. Flavors marked "no recipe" only include disco and labor cost, so their margin reads high.</p>
            </div>

            {/* 4. Market comparison */}
            <div className={card}>
                <div className="flex flex-wrap justify-between items-baseline gap-2 mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-brand-brown">Market comparison</h3>
                        <p className="text-xs text-gray-500">Your price per empanada for the same quantity, using your volume tiers and packages (before flavor surcharges).</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">Edit in Settings → Menu and pricing → Competitors</span>
                        <button onClick={checkPrices} disabled={priceCheck.status === 'checking'} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:border-brand-orange hover:text-brand-orange disabled:opacity-60">
                            <svg className={`w-4 h-4 ${priceCheck.status === 'checking' ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            {priceCheck.status === 'checking' ? 'Checking prices (up to a minute)…' : 'Check for updated prices'}
                        </button>
                    </div>
                </div>

                {priceCheck.status === 'error' && (
                    <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{priceCheck.message}</p>
                )}
                {priceCheck.status === 'done' && (
                    <div className="mb-4 border border-orange-200 bg-orange-50/40 rounded-xl p-4">
                        <div className="flex flex-wrap justify-between items-baseline gap-2 mb-2">
                            <h4 className="text-sm font-semibold text-brand-brown">Prices found online</h4>
                            <span className="text-xs text-gray-500">Found with web search. Check the source links before saving.</span>
                        </div>
                        {priceCheck.found.length === 0 ? (
                            <p className="text-sm text-gray-500">No prices found this time. Try again later, or add prices by hand in Settings.</p>
                        ) : (
                            <>
                                <div className="divide-y divide-orange-100">
                                    {priceCheck.found.map((f, idx) => {
                                        const match = findMatch(f);
                                        const changed = !match || Math.abs(Number(match.price) - f.price) > 0.005;
                                        return (
                                            <label key={idx} className="flex items-start gap-3 py-2 text-sm cursor-pointer">
                                                <input type="checkbox" checked={priceCheck.selected.has(idx)} onChange={() => toggleFound(idx)} className="mt-1 rounded border-gray-300 text-brand-orange focus:ring-brand-orange" />
                                                <span className="flex-grow min-w-0">
                                                    <span className="text-gray-900">{f.competitor}{f.location ? <span className="text-gray-500"> · {f.location}</span> : null}</span>
                                                    <span className="text-gray-600"> — {f.quantity} {f.size === 'full' ? 'full size' : 'mini'} for <b>{money(f.price)}</b> ({money(f.price / f.quantity)} each)</span>
                                                    <span className="block text-xs text-gray-500">
                                                        {!match ? <span className="text-blue-700 font-medium">New</span> : changed ? <>Was {money(Number(match.price))}</> : 'No change'}
                                                        {f.note ? ` · ${f.note}` : ''}
                                                        {f.sourceUrl && <> · <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand-orange hover:underline" onClick={(e) => e.stopPropagation()}>source</a></>}
                                                    </span>
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-end gap-3 mt-3">
                                    <button onClick={() => setPriceCheck({ status: 'idle', found: [], selected: new Set(), message: '' })} className="text-sm text-gray-500 hover:text-gray-700">Dismiss</button>
                                    <button onClick={saveFound} disabled={priceCheck.selected.size === 0 || !onUpdateCompetitorPrices} className="bg-brand-orange text-white px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-50">
                                        Save {priceCheck.selected.size} selected
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {market.summary.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        {market.summary.map(s => <React.Fragment key={s.size}>{stat(
                            s.size === 'full' ? 'Full size vs market' : 'Mini vs market',
                            Math.abs(s.avgDiff) < 0.005 ? 'Same as market' : `${pct(Math.abs(s.avgDiff))} ${s.avgDiff < 0 ? 'below' : 'above'}`,
                            `Competitors average ${money(s.avgTheirs)} each · ${s.count} price${s.count === 1 ? '' : 's'}`
                        )}</React.Fragment>)}
                    </div>
                )}

                {market.rows.length === 0 ? (
                    <div className="h-[120px] flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-200 text-gray-400 text-sm">Add competitor prices in Settings to compare.</div>
                ) : (
                    <div className="border border-gray-200 rounded-xl overflow-x-auto">
                        <div className="min-w-[680px]">
                            <div className="grid grid-cols-[minmax(0,1.6fr)_80px_50px_80px_70px_70px_90px] gap-3 px-4 py-2 bg-gray-50 text-xs text-gray-500 font-medium">
                                <span>Competitor</span><span>Size</span><span className="text-right">Qty</span><span className="text-right">Their price</span><span className="text-right">Their each</span><span className="text-right">Your each</span><span className="text-right">You are</span>
                            </div>
                            {market.rows.map(r => (
                                <div key={r.id} className="grid grid-cols-[minmax(0,1.6fr)_80px_50px_80px_70px_70px_90px] gap-3 px-4 py-2 border-t border-gray-100 text-sm items-center">
                                    <span className="min-w-0">
                                        <span className="block truncate text-gray-900">{r.competitor}{r.location ? <span className="text-gray-500"> · {r.location}</span> : null}</span>
                                        {(r.note || r.checkedOn) && <span className="block text-[11px] text-gray-400 truncate">{[r.note, r.checkedOn ? `checked ${r.checkedOn}` : ''].filter(Boolean).join(' · ')}</span>}
                                    </span>
                                    <span className="text-gray-600">{r.size === 'full' ? 'Full size' : 'Mini'}</span>
                                    <span className="text-right tabular-nums">{r.quantity}</span>
                                    <span className="text-right tabular-nums">{money(r.price)}</span>
                                    <span className="text-right tabular-nums">{money(r.theirEach)}</span>
                                    <span className="text-right tabular-nums font-medium">{money(r.yourEach)}</span>
                                    <span className={`text-right text-xs font-medium ${Math.abs(r.diff) < 0.005 ? 'text-gray-500' : r.diff < 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                                        {Math.abs(r.diff) < 0.005 ? 'same' : `${pct(Math.abs(r.diff))} ${r.diff < 0 ? 'cheaper' : 'higher'}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <p className="text-xs text-gray-400 mt-2">
                    {market.usingStarter ? 'Showing the starter list researched on Oct 16, 2026. Save Settings once to keep your own copy. ' : ''}
                    Delivery app prices usually run 15–30% above in-store prices.
                </p>
            </div>

            {/* 3. Margin alerts */}
            <div className={card}>
                <div className="flex flex-wrap justify-between items-baseline gap-2 mb-3">
                    <div>
                        <h3 className="text-lg font-semibold text-brand-brown">Margin alerts</h3>
                        <p className="text-xs text-gray-500">Today's costs against the lowest price a customer can pay (volume tiers and packages).</p>
                    </div>
                    <span className="text-xs text-gray-500">Target margin <b className="text-gray-800">{pct(targetMargin)}</b> · change it in Settings → Kitchen and costs → Prep settings</span>
                </div>
                {alerts.length === 0 ? (
                    <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">Every menu flavor is at or above your target margin, and no recipe ingredient has jumped in price.</p>
                ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                        {alerts.map((a, idx) => (
                            <div key={idx} className="flex gap-3 px-4 py-3 text-sm">
                                <span className={`mt-1 w-2.5 h-2.5 rounded-full flex-none ${a.level === 'danger' ? 'bg-red-500' : a.level === 'warning' ? 'bg-amber-400' : 'bg-gray-300'}`} aria-hidden="true" />
                                <div>
                                    <p className="font-medium text-gray-900">{a.title}</p>
                                    <p className="text-xs text-gray-500">{a.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
