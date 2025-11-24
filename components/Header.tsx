import React from 'react';
import { logout } from '../services/authService';
import { User } from 'firebase/auth';

interface HeaderProps {
  user?: User | null;
  variant?: 'admin' | 'public';
}

export default function Header({ user, variant = 'public' }: HeaderProps) {
  return (
    <header className="bg-brand-cream border-b border-brand-tan/50 shadow-sm relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center h-24 ${variant === 'public' ? 'justify-center' : 'justify-between'}`}>
          
          {/* Admin Left Side */}
          {variant === 'admin' && (
            <div className="flex items-center gap-3">
                <div className="flex flex-col">
                    <h1 className="text-2xl sm:text-3xl font-serif text-brand-brown tracking-tight hover:text-brand-orange transition-colors cursor-default">
                        Empanadas by Rose
                    </h1>
                    <span className="text-xs text-brand-brown/50 font-medium uppercase tracking-wider">Admin Dashboard</span>
                </div>
            </div>
          )}

          {/* Public Center Logo */}
          {variant === 'public' && (
             <div className="flex flex-col items-center">
                <h1 className="text-4xl md:text-5xl font-serif text-brand-brown tracking-tighter cursor-default">
                    Empanadas by Rose
                </h1>
             </div>
          )}
          
          {/* Admin Right Side */}
          {variant === 'admin' && user && (
              <button 
                onClick={logout}
                className="text-sm font-medium text-brand-brown/70 hover:text-brand-orange transition-colors border border-brand-tan px-3 py-1.5 rounded-md hover:bg-brand-tan/30"
              >
                Sign Out
              </button>
          )}
          
          {/* Public Right Side (Hidden/Subtle contact link if needed, currently removed for cleaner centered look) */}
        </div>
      </div>
    </header>
  );
}