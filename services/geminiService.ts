
import { GoogleGenAI } from "@google/genai";
import { Order } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This is a fallback for development environments where the key might not be set.
  // In the target runtime, process.env.API_KEY is expected to be available.
  console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function generateFollowUpMessage(order: Order): Promise<string> {
  const model = 'gemini-2.5-flash';

  const itemsList = order.items.map(item => `${item.quantity} ${item.name}`).join(', ');
  
  const prompt = `
    You are a friendly business owner of an empanada shop.
    Generate a short, friendly, and casual follow-up message for a customer via SMS or a messaging app.
    Do not use emojis. Keep it concise, around 2-3 sentences.
    
    Here is the customer and order information:
    - Customer Name: ${order.customerName}
    - Items Ordered: ${itemsList}
    
    The message should:
    1. Greet the customer by their first name (if their name is "John Doe", use "John").
    2. Mention their recent empanada order.
    3. Ask if they enjoyed everything.
    4. Thank them for their business.
  `;
  
  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt
    });

    const text = response.text;
    if (text) {
        return text.trim();
    } else {
        throw new Error("Received an empty response from the API.");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate message from Gemini API.");
  }
}

export async function generateOrderConfirmationMessage(order: Order): Promise<string> {
    const model = 'gemini-2.5-flash';
    const itemsList = order.items.map(item => `- ${item.quantity} ${item.name}`).join('\n');

    const deliveryInfo = order.deliveryRequired 
        ? `Your order will be delivered to: ${order.deliveryAddress}` 
        : `Your order will be ready for pickup at ${order.pickupTime}.`;

    const prompt = `
        You are the owner of a friendly empanada business.
        Generate a professional yet friendly order confirmation message suitable for SMS or a messaging app.
        Do not use emojis.

        Here is the order information:
        - Customer Name: ${order.customerName}
        - Pickup/Delivery Date: ${order.pickupDate}
        - Pickup Time: ${order.pickupTime}
        - Items Ordered:
        ${itemsList}
        - Total Cost: $${order.amountCharged.toFixed(2)}
        ${order.deliveryRequired ? `- Delivery Address: ${order.deliveryAddress}` : ''}

        The message should:
        1. Greet the customer by their first name.
        2. Confirm that their order for ${order.pickupDate} has been received.
        3. Confirm the pickup time or delivery details.
        4. Briefly list the items to confirm the order is correct.
        5. State the total amount charged.
        6. End with a friendly closing, like "We look forward to preparing your order!".
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt
        });

        const text = response.text;
        if (text) {
            return text.trim();
        } else {
            throw new Error("Received an empty response from the API.");
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to generate confirmation message from Gemini API.");
    }
}
