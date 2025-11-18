import { GoogleGenAI, Type } from "@google/genai";
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

// A shared schema for a single order object.
const orderSchema = {
    type: Type.OBJECT,
    properties: {
        customerName: { type: Type.STRING },
        phoneNumber: { type: Type.STRING },
        pickupDate: { type: Type.STRING, description: "The pickup date, formatted as MM/DD/YYYY" },
        pickupTime: { type: Type.STRING, description: "The pickup time, formatted as HH:MM AM/PM or 24-hour time." },
        items: {
            type: Type.ARRAY,
            description: "A list of empanadas ordered.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.INTEGER }
                },
                required: ['name', 'quantity']
            }
        },
        deliveryRequired: { type: Type.BOOLEAN },
        deliveryAddress: { type: Type.STRING },
        specialInstructions: { type: Type.STRING, description: "ONLY populate this field with data from a column explicitly named 'Special Instructions' or 'Notes'. If no such column exists or the value is empty, this MUST be an empty string." }
    }
};

// Sleep helper for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * A simple, robust CSV parser to handle data before sending to the AI.
 * This handles fields that are quoted and may contain commas.
 */
function simpleCsvParser(csv: string): Record<string, string>[] {
    const lines = csv.trim().replace(/\r/g, '').split('\n');
    if (lines.length < 2) return [];

    const parseRow = (row: string) => {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"' && (i === 0 || row[i-1] !== '"')) {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);
        return values.map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    };

    const headers = parseRow(lines[0]);
    const result: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = parseRow(line);
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
            if (header) {
                obj[header] = values[index] || '';
            }
        });
        result.push(obj);
    }
    return result;
}

async function parseObjectsBatch(
    batchObjects: Record<string, string>[],
    batchNum: number,
    totalBatches: number
): Promise<Partial<Order>[]> {
    const model = 'gemini-2.5-flash';
    const knownNonItemHeaders = [
        'Timestamp', 'Your name', 'Phone number', 'E-mail', 'Preferred contact method',
        'Preferred Date of Pickup/Delivery', 'Preferred Time of Pickup/Delivery',
        'Pickup/Delivery', 'Any additional questions/comments', 'Special Instructions'
    ].map(h => h.toLowerCase());

    const prompt = `
    You are an expert data mapping AI. Your task is to convert the provided JSON array of objects into another JSON array of objects that conforms to the provided schema.
    Each object in the input array represents a row from a spreadsheet, where keys are column headers and values are cell contents.

    **CRITICAL MAPPING RULES:**
    1.  **Map Fields:** Map the input object properties to the fields in the output JSON schema. For example, 'Your name' maps to 'customerName'. 'Preferred Date of Pickup/Delivery' maps to 'pickupDate'.
    2.  **Extract Items:** Identify properties that represent empanada items. An item is any key-value pair where the key's lowercase version is NOT one of the known non-item headers: [${knownNonItemHeaders.map(h => `'${h}'`).join(', ')}] AND the value is a number greater than 0. The key is the item 'name', and the value is the 'quantity'. Clean the item 'name' by removing brackets or prefixes like 'Full Size Empanadas'.
    3.  **Field Integrity:** Each JSON field MUST correspond to a single property from the input object. DO NOT combine data from multiple properties into one field.
    4.  **Special Instructions:** ONLY use data from a column named 'Special Instructions', 'Any additional questions/comments', or 'Notes'. Otherwise, it MUST be an empty string.
    5.  **Normalize Flavors:** If an extracted item name contains "&" without spaces (e.g., "Beef&Cheese", "Chicken&Cheese"), you MUST add spaces around the ampersand (e.g., "Beef & Cheese", "Chicken & Cheese") to match the system's flavor list.
    6.  **Output:** Your entire response MUST be ONLY a single, valid JSON array of objects. Do not include any extra text, reasoning, or markdown formatting.

    Here is the input JSON data for the batch:
    ${JSON.stringify(batchObjects, null, 2)}
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: orderSchema },
                temperature: 0,
            }
        });
        
        const jsonText = response.text.trim();
        if (jsonText.length > batchObjects.length * 2000) { // Safeguard against abnormally large responses
             throw new Error("The AI returned an abnormally large response, which indicates a processing error (e.g., data repetition).");
        }
        
        const parsedData = JSON.parse(jsonText);
        return parsedData as Partial<Order>[];
    } catch (error: any) {
        const errorMessage = error?.message || (typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error));
        throw new Error(`Error processing batch ${batchNum}/${totalBatches}. The AI failed to process the structured data.\n\nGemini API Error:\n${errorMessage}`);
    }
}

/**
 * DEFINITIVE FIX: Re-architected for reliability and scalability.
 * 1. Uses a deterministic client-side CSV parser to handle file structure.
 * 2. Simplifies the AI's task to a more reliable structured data mapping job.
 * 3. Implements a delay between batches to respect API rate limits (prevents 429 errors).
 * 4. Provides robust, specific error messages to the user, fixing the "[object Object]" bug.
 */
export async function parseOrdersFromSheet(
    csvText: string,
    onProgress: (message: string) => void
): Promise<Partial<Order>[]> {
    
    let rowObjects: Record<string, string>[];
    try {
        rowObjects = simpleCsvParser(csvText);
    } catch (e: any) {
        throw new Error(`Failed to parse the sheet data. Please ensure it's a valid CSV file. Error: ${e.message}`);
    }

    if (rowObjects.length === 0) {
        onProgress('');
        return [];
    }
    
    const BATCH_SIZE = 15;
    const DELAY_MS = 5100;

    let allParsedOrders: Partial<Order>[] = [];
    const totalBatches = Math.ceil(rowObjects.length / BATCH_SIZE);

    for (let i = 0; i < rowObjects.length; i += BATCH_SIZE) {
        const batchNum = (i / BATCH_SIZE) + 1;
        const startRow = i + 2;
        const endRow = Math.min(i + BATCH_SIZE + 1, rowObjects.length + 1);
        onProgress(`Processing batch ${batchNum} of ${totalBatches} (rows ${startRow}-${endRow})...`);

        const batchObjects = rowObjects.slice(i, i + BATCH_SIZE);
        
        try {
            const parsedBatch = await parseObjectsBatch(batchObjects, batchNum, totalBatches);
            allParsedOrders.push(...parsedBatch);
        } catch (error: any) {
            onProgress('');
            throw error; // Error is already well-formatted by parseObjectsBatch
        }

        if (batchNum < totalBatches) {
            await sleep(DELAY_MS);
        }
    }

    onProgress('Import complete!');
    await sleep(1000);
    return allParsedOrders;
}