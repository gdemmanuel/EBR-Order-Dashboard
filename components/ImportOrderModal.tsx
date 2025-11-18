

import React, { useState } from 'react';
import { Order } from '../types';
import { parseOrdersFromSheet } from '../services/geminiService';
import { XMarkIcon, SparklesIcon } from './icons/Icons';

interface ImportOrderModalProps {
  onClose: () => void;
  onOrdersImported: (orders: Partial<Order>[], newSignatures: string[]) => void;
  onUpdateSheetUrl: (url: string) => void;
  existingSignatures: Set<string>;
}

export default function ImportOrderModal({ onClose, onOrdersImported, onUpdateSheetUrl, existingSignatures }: ImportOrderModalProps) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');

  const handleImport = async () => {
    if (!sheetUrl.trim()) {
      setError('Please paste the Google Sheet URL.');
      return;
    }

    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = sheetUrl.match(regex);

    if (!match || !match[1]) {
        setError('Invalid Google Sheet URL. Please make sure your link is correct.');
        return;
    }
    const sheetId = match[1];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    
    setError(null);
    setIsLoading(true);
    setProgressMessage('Starting import...');

    try {
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet data (Status: ${response.status}). Please make sure your sheet's sharing setting is "Anyone with the link can view".`);
      }
      const csvText = await response.text();
      if (!csvText) {
          throw new Error("The Google Sheet appears to be empty.");
      }
      
      // Pass existing signatures to filtering logic
      const { newOrders, newSignatures } = await parseOrdersFromSheet(csvText, setProgressMessage, existingSignatures);
      
      onOrdersImported(newOrders, newSignatures);
      onUpdateSheetUrl(sheetUrl); // Save the URL for future auto-updates
      
    } catch (err: any) {
      const message = err?.message || (typeof err === 'object' ? JSON.stringify(err, null, 2) : String(err));
      setError(message);
    } finally {
      setIsLoading(false);
      setProgressMessage('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col border border-brand-tan">
        <header className="p-6 border-b border-brand-tan flex justify-between items-center">
          <h2 className="text-3xl font-serif text-brand-brown">Import Orders from Google Sheet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
             <h3 className="font-semibold text-amber-900">Instructions</h3>
             <ol className="list-decimal list-inside text-sm text-amber-800 mt-1 space-y-1">
                <li>In your Google Sheet, click the <span className="font-semibold">Share</span> button.</li>
                <li>Under "General access," change the setting to <span className="font-semibold">"Anyone with the link"</span> and set role to <span className="font-semibold">"Viewer"</span>.</li>
                <li>Click "Copy link" and paste it in the box below.</li>
             </ol>
          </div>
          <div>
            <label htmlFor="sheet-url" className="block text-sm font-medium text-brand-brown/90">
              Google Sheet Share URL
            </label>
            <input
              id="sheet-url"
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange bg-white text-brand-brown"
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-md whitespace-pre-wrap">{error}</p>}
        </div>

        <footer className="p-6 flex justify-between items-center gap-3 border-t border-brand-tan bg-gray-50 rounded-b-lg">
          <div className="text-sm text-gray-500 min-h-[1.25rem]">
            {isLoading && <p>{progressMessage}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-48 bg-brand-orange text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-opacity-90 transition-all disabled:bg-brand-orange/50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  Import Orders
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}