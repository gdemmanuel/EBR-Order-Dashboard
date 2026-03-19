
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://ebr-order-app.vercel.app';

export default async function handler(req, res) {
    // CORS
    const origin = req.headers['origin'] || '';
    if (origin && origin !== ALLOWED_ORIGIN) {
        return res.status(403).json({ error: 'Forbidden: invalid origin' });
    }
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Internal-Secret');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

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

    const { model, contents, config, chatHistory, chatSystemInstruction } = req.body || {};

    if (!model || typeof model !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid field: model' });
    }
    if (contents === undefined && chatHistory === undefined) {
        return res.status(400).json({ error: 'Missing field: contents or chatHistory' });
    }

    try {
        // Chat mode: used by queryBusinessAi
        if (chatHistory !== undefined) {
            const chat = ai.chats.create({
                model,
                config: chatSystemInstruction ? { systemInstruction: chatSystemInstruction } : undefined,
            });
            const response = await chat.sendMessage({ message: contents });
            return res.status(200).json({ text: response.text });
        }

        // Standard generateContent
        const response = await ai.models.generateContent({
            model,
            contents,
            ...(config ? { config } : {}),
        });
        return res.status(200).json({ text: response.text });
    } catch (error) {
        console.error('Gemini proxy error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
