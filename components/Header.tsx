
import React from 'react';
import { logout } from '../services/authService';

export default function Header() {
  return (
    <header className="bg-brand-cream border-b border-brand-tan">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <h1 className="text-3xl font-serif text-brand-brown tracking-tight">Empanadas by Rose</h1>
          </div>
          <button 
            onClick={logout}
            className="text-sm font-medium text-brand-brown/70 hover:text-brand-orange transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
