
import React, { useState } from 'react';
import { login } from '../services/authService';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await login(email, password);
        } catch (err: any) {
            console.error(err);
            let msg = "Failed to sign in.";
            if (err.code === 'auth/invalid-credential') {
                msg = "Invalid email or password.";
            } else if (err.code === 'auth/too-many-requests') {
                msg = "Too many failed attempts. Please try again later.";
            }
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-brand-tan overflow-hidden">
                <div className="bg-brand-tan/20 p-8 text-center border-b border-brand-tan">
                    <h1 className="text-3xl font-serif text-brand-brown mb-2">Empanadas by Rose</h1>
                    <p className="text-brand-brown/70">Please sign in to manage orders</p>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded border border-red-200">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-brand-brown mb-1">Email Address</label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange py-2 px-3 text-brand-brown"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-brand-brown mb-1">Password</label>
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange py-2 px-3 text-brand-brown"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-orange hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
            <p className="mt-8 text-center text-sm text-gray-500">
                &copy; {new Date().getFullYear()} Empanadas by Rose Order Tracker
            </p>
        </div>
    );
}
