
import React from 'react';
import { logout } from '../services/authService';
import { User } from 'firebase/auth';

interface HeaderProps {
  user?: User | null;
  variant?: 'admin' | 'public';
}

export default function Header({ user, variant = 'public' }: HeaderProps) {
  return (
    <header className="bg-brand-cream border-b border-brand-tan shadow-sm relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
             {/* Logo placeholder or icon could go here */}
            <div className="flex flex-col">
                <h1 className="text-2xl sm:text-3xl font-serif text-brand-brown tracking-tight hover:text-brand-orange transition-colors cursor-default">
                    Empanadas by Rose
                </h1>
                {variant === 'admin' && (
                    <span className="text-xs text-brand-brown/50 font-medium uppercase tracking-wider">Admin Dashboard</span>
                )}
            </div>
          </div>
          
          {variant === 'admin' && user && (
              <button 
                onClick={logout}
                className="text-sm font-medium text-brand-brown/70 hover:text-brand-orange transition-colors border border-brand-tan px-3 py-1.5 rounded-md hover:bg-brand-tan/30"
              >
                Sign Out
              </button>
          )}
          
          {variant === 'public' && (
             <a href="tel:+" className="text-sm font-medium text-brand-orange hover:text-brand-brown transition-colors">
                 Contact Us
             </a>
          )}
        </div>
      </div>
    </header>
  );
}
