
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

export default async function handler(req, res) {
  // Ensure we only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const order = req.body;
    
    // Extract details for the alert
    const { 
        customerName, 
        phoneNumber, 
        pickupDate, 
        pickupTime, 
        items, 
        amountCharged,
        specialInstructions,
        deliveryRequired,
        deliveryAddress,
        id,
        packages 
    } = order;

    // --- Build structured item list ---
    let itemsBody = '';

    // 1. Packages
    if (packages && packages.length > 0) {
        itemsBody += `PACKAGES:\n`;
        packages.forEach(pkg => {
            itemsBody += `  ${pkg.name}:\n`;
            pkg.items.forEach(item => {
                itemsBody += `    - ${item.quantity}x ${item.name.replace('Full ', '')}\n`;
            });
            itemsBody += `\n`; // Spacer between packages
        });
    }

    // 2. Extras (Loose Items)
    // Re-calculate loose items here since we don't have access to shared utils in API function easily
    // Copy total counts
    const itemMap = new Map();
    items.forEach(i => itemMap.set(i.name, (itemMap.get(i.name) || 0) + i.quantity));
    
    // Subtract packages
    if (packages && packages.length > 0) {
        packages.forEach(pkg => {
            pkg.items.forEach(pkgItem => {
                const current = itemMap.get(pkgItem.name) || 0;
                itemMap.set(pkgItem.name, Math.max(0, current - pkgItem.quantity));
            });
        });
    }

    const looseItems = [];
    itemMap.forEach((qty, name) => { if (qty > 0) looseItems.push({ name, quantity: qty }); });

    if (looseItems.length > 0) {
        if (packages && packages.length > 0) itemsBody += `EXTRAS:\n`;
        else itemsBody += `ITEMS:\n`;
        
        looseItems.forEach(item => {
            itemsBody += `  - ${item.quantity}x ${item.name}\n`;
        });
    }

    // --- End Build structured list ---

    // 2. Build the Message Body
    let msgBody = `NEW ORDER #${id.slice(-4)}\n`;
    msgBody += `----------------\n`;
    msgBody += `${customerName}\n`;
    msgBody += `${phoneNumber}\n`;
    msgBody += `Total: $${Number(amountCharged).toFixed(2)}\n`;
    msgBody += `\nPickup: ${formatDate(pickupDate)} @ ${pickupTime}\n`;
    
    if (deliveryRequired) {
        msgBody += `DELIVERY: ${deliveryAddress}\n`;
    }

    msgBody += `\n${itemsBody}`;
    
    if (specialInstructions) {
        msgBody += `\nNOTE: ${specialInstructions}`;
    }

    // 3. Determine Sender Address (Production)
    let fromAddress = process.env.RESEND_FROM;
    
    if (!fromAddress) {
        fromAddress = 'Empanadas by Rose <orders@empanadasbyrose.com>';
    }

    // 4. Determine Receiver Address
    const toAddress = process.env.OWNER_EMAIL;

    if (!toAddress) {
        console.error("Missing OWNER_EMAIL environment variable");
        return res.status(500).json({ error: "Server config error: Missing OWNER_EMAIL" });
    }

    // 5. Send the Email
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
