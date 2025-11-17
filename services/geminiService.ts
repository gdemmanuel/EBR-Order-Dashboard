
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

    const prompt = `
        You are the owner of a friendly empanada business, and you're texting a customer to confirm their order.
        Write a short, friendly, and professional confirmation message. It should sound like a real person wrote it, not a robot.
        Do not use emojis.

        Here is the order information:
        - Customer Name: ${order.customerName}
        - Pickup/Delivery Date: ${order.pickupDate}
        - Pickup Time: ${order.pickupTime}
        - Items Ordered:
        ${itemsList}
        - Total Cost: $${order.amountCharged.toFixed(2)}
        ${order.deliveryRequired ? `- Delivery Address: ${order.deliveryAddress}` : ''}

        The message must:
        1. Greet the customer warmly by their first name.
        2. Provide a quick summary of their order details (date, time, items, and total cost).
        3. Politely ask them to reply to this message to confirm everything looks correct.
        4. End with a friendly closing like "Thanks!" or "Talk soon!".
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

interface Location {
    latitude: number;
    longitude: number;
}

export async function getAddressSuggestions(query: string, location: Location | null): Promise<string[]> {
    if (!query || query.trim().length < 3) {
        return [];
    }

    const model = 'gemini-2.5-flash';
    const prompt = `Based on the following address query, provide up to 3 valid, complete address suggestions. 
Return ONLY the addresses, each on a new line. Do not include any other text, numbering, or formatting.
Do not include the country (e.g., "USA") in the suggested addresses.
If no valid suggestions are found, return an empty response.

Query: "${query}"`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                tools: [{ googleMaps: {} }],
                ...(location && {
                    toolConfig: {
                        retrievalConfig: {
                            latLng: {
                                latitude: location.latitude,
                                longitude: location.longitude,
                            },
                        },
                    },
                }),
            },
        });

        const text = response.text;
        if (text) {
            return text.trim().split('\n').filter(addr => addr.trim() !== '');
        }
        return [];
    } catch (error) {
        console.error("Error getting address suggestions from Gemini API:", error);
        throw new Error("Failed to get address suggestions.");
    }
}
