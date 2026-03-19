
import { Resend } from 'resend';

// Initialize Resend with the API Key from Vercel Environment Variables
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to format date as MM/DD/YYYY
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-');
        return `${m}/${d}/${y}`;
    }
    return dateStr.replace(/-/g, '/');
};

// Sanitize a value to a plain string, capped at maxLen characters
const safeStr = (val, maxLen = 200) => {
    if (val === null || val === undefined) return '';
    return String(val).replace(/[\r\n]/g, ' ').slice(0, maxLen);
};

// Validate the request body shape — returns an error string or null
const validateBody = (order) => {
    if (!order || typeof order !== 'object') return 'Invalid request body.';
    if (!order.id || typeof order.id !== 'string') return 'Missing or invalid field: id';
    if (!order.customerName || typeof order.customerName !== 'string') return 'Missing or invalid field: customerName';
    if (!order.phoneNumber || typeof order.phoneNumber !== 'string') return 'Missing or invalid field: phoneNumber';
    if (!order.pickupDate || typeof order.pickupDate !== 'string') return 'Missing or invalid field: pickupDate';
    if (!order.pickupTime || typeof order.pickupTime !== 'string') return 'Missing or invalid field: pickupTime';
    if (!Array.isArray(order.items)) return 'Missing or invalid field: items (must be array)';
    if (order.packages !== undefined && !Array.isArray(order.packages)) return 'Invalid field: packages (must be array)';
    return null;
};

export default async function handler(req, res) {
    // CORS: restrict to your own origin
    const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://ebr-order-app.vercel.app';
    const origin = req.headers['origin'] || '';
    if (origin && origin !== allowedOrigin) {
        return res.status(403).json({ error: 'Forbidden: invalid origin' });
    }
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Internal-Secret');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Shared-secret check
    const secret = process.env.INTERNAL_API_SECRET;
    if (secret) {
        const provided = req.headers['x-internal-secret'];
        if (!provided || provided !== secret) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    // Input validation
    const validationError = validateBody(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const order = req.body;
        
        // Extract details, sanitizing all user-supplied strings
        const customerName = safeStr(order.customerName, 100);
        const phoneNumber = safeStr(order.phoneNumber, 30);
        const pickupDate = safeStr(order.pickupDate, 20);
        const pickupTime = safeStr(order.pickupTime, 20);
        const amountCharged = Number(order.amountCharged) || 0;
        const specialInstructions = safeStr(order.specialInstructions, 500);
        const deliveryRequired = Boolean(order.deliveryRequired);
        const deliveryAddress = safeStr(order.deliveryAddress, 200);
        const id = safeStr(order.id, 100);
        const items = Array.isArray(order.items) ? order.items : [];
        const packages = Array.isArray(order.packages) ? order.packages : [];

        // --- Build structured item list ---
        let itemsBody = '';

        // 1. Packages
        if (packages.length > 0) {
            itemsBody += `PACKAGES:\n`;
            packages.forEach(pkg => {
                if (!pkg || typeof pkg !== 'object') return;
                itemsBody += `  ${safeStr(pkg.name, 100)}:\n`;
                const pkgItems = Array.isArray(pkg.items) ? pkg.items : [];
                pkgItems.forEach(item => {
                    if (!item || typeof item !== 'object') return;
                    itemsBody += `    - ${Number(item.quantity) || 0}x ${safeStr(item.name, 100).replace('Full ', '')}\n`;
                });
                itemsBody += `\n`;
            });
        }

        // 2. Extras (Loose Items)
        const itemMap = new Map();
        items.forEach(i => {
            if (!i || typeof i !== 'object') return;
            const name = safeStr(i.name, 100);
            itemMap.set(name, (itemMap.get(name) || 0) + (Number(i.quantity) || 0));
        });
        
        if (packages.length > 0) {
            packages.forEach(pkg => {
                if (!pkg || typeof pkg !== 'object') return;
                const pkgItems = Array.isArray(pkg.items) ? pkg.items : [];
                pkgItems.forEach(pkgItem => {
                    if (!pkgItem || typeof pkgItem !== 'object') return;
                    const name = safeStr(pkgItem.name, 100);
                    const current = itemMap.get(name) || 0;
                    itemMap.set(name, Math.max(0, current - (Number(pkgItem.quantity) || 0)));
                });
            });
        }

        const looseItems = [];
        itemMap.forEach((qty, name) => { if (qty > 0) looseItems.push({ name, quantity: qty }); });

        if (looseItems.length > 0) {
            if (packages.length > 0) itemsBody += `EXTRAS:\n`;
            else itemsBody += `ITEMS:\n`;
            
            looseItems.forEach(item => {
                itemsBody += `  - ${item.quantity}x ${item.name}\n`;
            });
        }

        // --- End Build structured list ---

        // Build the Message Body
        let msgBody = `NEW ORDER #${id.slice(-4)}\n`;
        msgBody += `----------------\n`;
        msgBody += `${customerName}\n`;
        msgBody += `${phoneNumber}\n`;
        msgBody += `Total: $${amountCharged.toFixed(2)}\n`;
        msgBody += `\nPickup: ${formatDate(pickupDate)} @ ${pickupTime}\n`;
        
        if (deliveryRequired) {
            msgBody += `DELIVERY: ${deliveryAddress}\n`;
        }

        msgBody += `\n${itemsBody}`;
        
        if (specialInstructions) {
            msgBody += `\nNOTE: ${specialInstructions}`;
        }

        // Determine Sender Address
        const fromAddress = process.env.RESEND_FROM || 'Empanadas by Rose <orders@empanadasbyrose.com>';

        // Determine Receiver Address
        const toAddress = process.env.OWNER_EMAIL;
        if (!toAddress) {
            console.error("Missing OWNER_EMAIL environment variable");
            return res.status(500).json({ error: "Server config error: Missing OWNER_EMAIL" });
        }

        // Send the Email
        const { data, error } = await resend.emails.send({
            from: fromAddress,
            to: toAddress,
            subject: `Order #${id.slice(-4)}: ${customerName}`,
            text: msgBody,
        });

        if (error) {
            console.error("Resend API Error:", JSON.stringify(error, null, 2));
            return res.status(400).json({ error });
        }

        console.log(`Email sent successfully from ${fromAddress} to ${toAddress}`);
        return res.status(200).json(data);
    } catch (error) {
        console.error("Server Internal Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
