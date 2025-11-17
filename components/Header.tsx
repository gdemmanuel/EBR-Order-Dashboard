
import React from 'react';

const logoUrl = "https://empanadasbyrose.com/cdn/shop/files/EBR_Main_Logo_Circle.png?v=1680193859&width=240";

export default function Header() {
  return (
    <header className="bg-brand-cream border-b border-brand-tan">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-20">
          <div className="flex items-center space-x-4">
            <img src={logoUrl} alt="Empanadas by Rose Logo" className="h-14 w-14" />
            <h1 className="text-3xl font-serif text-brand-brown tracking-tight">Empanadas by Rose</h1>
          </div>
        </div>
      </div>
    </header>
  );
}
