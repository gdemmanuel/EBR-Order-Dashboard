
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
        originalPackages 
    } = order;

    // 1. Format Items List
    const itemList = items
        .map(i => `${i.quantity}x ${i.name}`)
        .join('\n');

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

    if (originalPackages && originalPackages.length > 0) {
        msgBody += `\nPACKAGES:\n${originalPackages.map(p => `• ${p}`).join('\n')}\n`;
    }
    
    msgBody += `\nITEMS:\n${itemList}`;
    
    if (specialInstructions) {
        msgBody += `\n\nNOTE: ${specialInstructions}`;
    }

    // 3. Determine Sender Address (Production)
    // Now that your domain is verified, we use it by default.
    // If RESEND_FROM is set in Vercel, we use that. Otherwise, we default to orders@empanadasbyrose.com
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
