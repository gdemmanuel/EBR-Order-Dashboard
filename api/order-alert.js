
import { Resend } from 'resend';

// Initialize Resend with the API Key from Vercel Environment Variables
const resend = new Resend(process.env.RESEND_API_KEY);

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
        deliveryAddress
    } = order;

    // 1. Format Items List
    const itemList = items
        .map(i => `${i.quantity}x ${i.name}`)
        .join('\n');

    // 2. Build the Message Body (Optimized for SMS readability)
    let msgBody = `NEW ORDER ($${Number(amountCharged).toFixed(2)})\n`;
    msgBody += `----------------\n`;
    msgBody += `${customerName}\n`;
    msgBody += `${phoneNumber}\n`;
    msgBody += `\nPickup: ${pickupDate} @ ${pickupTime}\n`;
    
    if (deliveryRequired) {
        msgBody += `DELIVERY: ${deliveryAddress}\n`;
    }
    
    msgBody += `\nITEMS:\n${itemList}`;
    
    if (specialInstructions) {
        msgBody += `\n\nNOTE: ${specialInstructions}`;
    }

    // 3. Send the Email
    // If RESEND_FROM is not set in Vercel, it defaults to the testing address.
    // If you verify your domain, add RESEND_FROM='orders@empanadasbyrose.com' in Vercel.
    const fromAddress = process.env.RESEND_FROM || 'Empanada Orders <onboarding@resend.dev>';

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: process.env.OWNER_EMAIL, 
      subject: `New Order: ${customerName}`,
      text: msgBody,
    });

    if (error) {
      console.error("Resend Error:", error);
      return res.status(400).json({ error });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
