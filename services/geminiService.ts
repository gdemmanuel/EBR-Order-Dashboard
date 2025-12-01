
import { GoogleGenAI, Type } from "@google/genai";
import { Order, Expense, FollowUpStatus } from '../types';
import { parseOrderDateTime } from '../utils/dateUtils';

// Safe API Key retrieval for Vite/Vercel deployments
const getApiKey = () => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
            // @ts-ignore
            return import.meta.env.VITE_API_KEY;
        }
    } catch (e) {}
    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            // @ts-ignore
            return process.env.API_KEY;
        }
    } catch (e) {}
    console.warn("API Key not found. Please check your VITE_API_KEY environment variable.");
    return '';
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export async function generateMessageForOrder(order: Order, templates?: { followUpNeeded?: string; pendingConfirmation?: string; confirmed?: string; processing?: string; completed?: string; }, useAi: boolean = false): Promise<string> {
    const status = order.followUpStatus;
    const firstName = order.customerName.split(' ')[0];
    const deliveryType = order.deliveryRequired ? 'delivery' : 'pick up';
    
    // Get formatted Date with Day of Week
    let dateString = order.pickupDate;
    try {
        const dateObj = parseOrderDateTime(order);
        if (!isNaN(dateObj.getTime())) {
            const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            dateString = `${dayOfWeek}, ${order.pickupDate}`;
        }
    } catch (e) {
        console.warn("Date parsing error", e);
    }

    // Helper to populate templates
    const replacePlaceholders = (template: string) => {
        let itemsText = "";
        if (order.totalMini > 0 && order.totalFullSize === 0) {
            itemsText = `${order.totalMini} total mini empanadas`;
        } else if (order.totalFullSize > 0 && order.totalMini === 0) {
            itemsText = `${order.totalFullSize} total full-size empanadas`;
        } else {
            itemsText = `${order.totalMini} mini and ${order.totalFullSize} full-size empanadas`;
        }
        
        // Auto-format items as a list with dashes
        const itemsList = order.items.map(item => `- ${item.quantity} ${item.name}`).join('\n');
        
        // Smart Address Replacement
        let text = template;
        if (!order.deliveryRequired) {
            // If pickup, remove "Address: {deliveryAddress}" style patterns
            text = text.replace(/(Address|Delivery to):\s*{deliveryAddress},?\s*/gi, '');
            text = text.replace(/(Address|Delivery to):\s*{{deliveryAddress}},?\s*/gi, '');
            // Remove standalone lines
            text = text.replace(/^\s*{deliveryAddress}\s*$/gm, '');
            // Clean up any remaining placeholders
            text = text.replace(/{deliveryAddress}|{{deliveryAddress}}/g, '');
        } else {
            const address = order.deliveryAddress || "";
            text = text.replace(/{deliveryAddress}|{{deliveryAddress}}/g, address);
        }

        return text
            .replace(/{firstName}|{{firstName}}/g, firstName)
            .replace(/{name}|{{name}}/g, order.customerName)
            .replace(/{date}|{{date}}/g, dateString)
            .replace(/{time}|{{time}}/g, order.pickupTime)
            .replace(/{deliveryType}|{{deliveryType}}/g, deliveryType)
            .replace(/{total}|{{total}}/g, order.amountCharged.toFixed(2))
            .replace(/{totals}|{{totals}}/g, itemsText)
            .replace(/{items}|{{items}}/g, itemsList);
    };

    // If NOT using AI, check configurable templates first
    if (!useAi) {
        if (status === FollowUpStatus.NEEDED && templates?.followUpNeeded) {
            return replacePlaceholders(templates.followUpNeeded);
        }
        if (status === FollowUpStatus.PENDING && templates?.pendingConfirmation) {
            return replacePlaceholders(templates.pendingConfirmation);
        }
        if (status === FollowUpStatus.CONFIRMED && templates?.confirmed) {
            return replacePlaceholders(templates.confirmed);
        }
        if (status === FollowUpStatus.PROCESSING && templates?.processing) {
            return replacePlaceholders(templates.processing);
        }
        if (status === FollowUpStatus.COMPLETED && templates?.completed) {
            return replacePlaceholders(templates.completed);
        }

        // Fallbacks for default statuses if no template provided and no AI requested
        if (status === FollowUpStatus.NEEDED) {
            let totalsText = "";
            if (order.totalMini > 0 && order.totalFullSize === 0) {
                totalsText = `${order.totalMini} total mini empanadas`;
            } else if (order.totalFullSize > 0 && order.totalMini === 0) {
                totalsText = `${order.totalFullSize} total full-size empanadas`;
            } else {
                totalsText = `${order.totalMini} mini and ${order.totalFullSize} full-size empanadas`;
            }
            const itemsList = order.items.map(item => `- ${item.quantity} ${item.name}`).join('\n');
            return `Hi ${firstName}! This is Rose from Empanadas by Rose. Thank you for placing an order. Please confirm your order for ${deliveryType} on ${dateString} at ${order.pickupTime} as follows:\n${totalsText}\n${itemsList}`;
        }

        if (status === FollowUpStatus.PENDING) {
            return `Perfect! The total is $${order.amountCharged.toFixed(2)}. Cash on ${deliveryType}, please. I'll see you on ${dateString} at ${order.pickupTime}.
Thank you for your order!`;
        }
    }

    // AI GENERATION (Fallback or Explicit Request)
    const model = 'gemini-2.5-flash';
    const prompt = `
    You are Rose, the owner of "Empanadas by Rose". Write a short, friendly text message to a customer named ${firstName}.
    
    Context:
    - Order Status: ${status}
    - Items: ${order.totalMini + order.totalFullSize} empanadas
    - Pickup/Delivery: ${deliveryType} on ${dateString} at ${order.pickupTime}
    
    Instructions:
    - If status is 'Confirmed', confirm that everything is set.
    - If status is 'Processing', tell them you have started preparing their order.
    - If status is 'Completed', thank them for their business and hope they enjoyed the food.
    - Keep it brief and professional but warm.
    - Do not include subject lines.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt
        });
        return response.text?.trim() || "Message generation failed.";
    } catch (e) {
        console.error(e);
        return "Error generating message.";
    }
}

// --- Legacy/Other Functions ---

interface Location { latitude: number; longitude: number; }

export async function getAddressSuggestions(query: string, location: Location | null): Promise<string[]> {
    if (!query || query.trim().length < 3) return [];

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
        if (text) return text.trim().split('\n').filter(addr => addr.trim() !== '');
        return [];
    } catch (error) {
        console.error("Error getting address suggestions from Gemini API:", error);
        throw new Error("Failed to get address suggestions.");
    }
}

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

const expenseSchema = {
    type: Type.OBJECT,
    properties: {
        date: { type: Type.STRING, description: "YYYY-MM-DD" },
        amount: { type: Type.NUMBER },
        description: { type: Type.STRING },
        category: { type: Type.STRING }
    }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        
        const jsonText = response.text?.trim() || '';
        
        if (!jsonText) {
             throw new Error("Empty response from Gemini API");
        }

        if (jsonText.length > batchObjects.length * 2000) {
             throw new Error("The AI returned an abnormally large response, which indicates a processing error (e.g., data repetition).");
        }
        
        const parsedData = JSON.parse(jsonText);
        return parsedData as Partial<Order>[];
    } catch (error: any) {
        const errorMessage = error?.message || (typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error));
        throw new Error(`Error processing batch ${batchNum}/${totalBatches}. The AI failed to process the structured data.\n\nGemini API Error:\n${errorMessage}`);
    }
}

export interface ImportResult {
    newOrders: Partial<Order>[];
    newSignatures: string[];
}

export async function parseOrdersFromSheet(
    csvText: string,
    onProgress: (message: string) => void,
    existingSignatures: Set<string> = new Set()
): Promise<ImportResult> {
    
    let rowObjects: Record<string, string>[];
    try {
        const sanitizedCsv = csvText.replace(/"/g, '');
        rowObjects = simpleCsvParser(sanitizedCsv);
    } catch (e: any) {
        throw new Error(`Failed to parse the sheet data. Please ensure it's a valid CSV file. Error: ${e.message}`);
    }

    if (rowObjects.length === 0) {
        onProgress('');
        return { newOrders: [], newSignatures: [] };
    }
    
    const newRows: Record<string, string>[] = [];
    const newRowSignatures: string[] = [];

    rowObjects.forEach(row => {
        const signature = JSON.stringify(row);
        if (!existingSignatures.has(signature)) {
            newRows.push(row);
            newRowSignatures.push(signature);
        }
    });

    if (newRows.length === 0) {
        onProgress('No new orders found.');
        return { newOrders: [], newSignatures: [] };
    }

    const BATCH_SIZE = 15;
    const DELAY_MS = 5100;

    let allParsedOrders: Partial<Order>[] = [];
    const totalBatches = Math.ceil(newRows.length / BATCH_SIZE);

    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
        const batchNum = (i / BATCH_SIZE) + 1;
        const startRow = i + 1;
        const endRow = Math.min(i + BATCH_SIZE, newRows.length);
        onProgress(`Processing new orders: batch ${batchNum} of ${totalBatches} (${startRow}-${endRow})...`);

        const batchObjects = newRows.slice(i, i + BATCH_SIZE);
        
        try {
            const parsedBatch = await parseObjectsBatch(batchObjects, batchNum, totalBatches);
            allParsedOrders.push(...parsedBatch);
        } catch (error: any) {
            onProgress('');
            throw error;
        }

        if (batchNum < totalBatches) {
            await sleep(DELAY_MS);
        }
    }

    onProgress('Import complete!');
    await sleep(1000);
    
    return { 
        newOrders: allParsedOrders, 
        newSignatures: newRowSignatures 
    };
}

export async function parseReceiptImage(base64Image: string, mimeType: string, categories: string[]): Promise<Partial<Expense>> {
  const model = 'gemini-2.5-flash';
  const prompt = `
    Analyze this receipt image. Extract the following details:
    1. Date: The transaction date in YYYY-MM-DD format. If not found, use today's date.
    2. Amount: The total amount paid.
    3. Description: The Vendor Name followed by a concise list of the key items purchased (e.g. "Home Depot - Lumber, Paint, Screws"). If the item list is too long, just list the top 3-5 distinct items.
    4. Category: Choose the best fit from this list: [${categories.join(', ')}]. If unsure, use 'Other'.

    Return the result as a valid JSON object with keys: 'date', 'amount', 'description', 'category'.
    Do not include markdown formatting or code blocks. Just the JSON string.
  `;

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Image
    }
  };

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [
             { text: prompt },
             imagePart
        ] },
        config: {
            responseMimeType: "application/json",
            responseSchema: expenseSchema
        }
    });
    
    const jsonText = response.text?.trim();
    if (jsonText) {
        return JSON.parse(jsonText) as Partial<Expense>;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Error parsing receipt:", error);
    throw new Error("Failed to scan receipt.");
  }
}
