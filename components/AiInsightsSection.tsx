
import React, { useState, useEffect, useRef } from 'react';
import { Order, Expense, WorkShift, AppSettings, AiInsight, AiMessage } from '../types';
import { generateBusinessInsights, queryBusinessAi } from '../services/geminiService';
import { SparklesIcon, TrendingUpIcon, ExclamationCircleIcon, LightBulbIcon, PaperAirplaneIcon, UserIcon, CogIcon } from './icons/Icons';

interface AiInsightsSectionProps {
    orders: Order[];
    expenses: Expense[];
    shifts: WorkShift[];
    settings: AppSettings;
}

const InsightCard: React.FC<{ insight: AiInsight }> = ({ insight }) => {
    const iconMap = {
        win: <TrendingUpIcon className="w-6 h-6 text-green-600" />,
        warning: <ExclamationCircleIcon className="w-6 h-6 text-amber-600" />,
        idea: <LightBulbIcon className="w-6 h-6 text-blue-600" />
    };

    const bgMap = {
        win: 'bg-green-50 border-green-100',
        warning: 'bg-amber-50 border-amber-100',
        idea: 'bg-blue-50 border-blue-100'
    };

    return (
        <div className={`p-6 rounded-xl border-2 ${bgMap[insight.type]} transition-all hover:shadow-md animate-fade-in`}>
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                    {iconMap[insight.type]}
                </div>
                <h4 className="font-bold text-gray-800">{insight.title}</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{insight.description}</p>
            {insight.impact && (
                <div className="pt-3 border-t border-black/5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Potential Impact</span>
                    <p className="text-xs font-semibold text-gray-700 mt-0.5">{insight.impact}</p>
                </div>
            )}
        </div>
    );
};

export default function AiInsightsSection({ orders, expenses, shifts, settings }: AiInsightsSectionProps) {
    const [insights, setInsights] = useState<AiInsight[]>([]);
    const [loadingInsights, setLoadingInsights] = useState(true);
    const [chatHistory, setChatHistory] = useState<AiMessage[]>([]);
    const [userQuery, setUserQuery] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchInsights = async () => {
            setLoadingInsights(true);
            try {
                const results = await generateBusinessInsights(orders, expenses, shifts, settings);
                setInsights(results);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingInsights(false);
            }
        };
        fetchInsights();
    }, [orders.length, expenses.length, shifts.length]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isTyping]);

    const handleSendQuery = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!userQuery.trim() || isTyping) return;

        const currentQuery = userQuery;
        setUserQuery('');
        setChatHistory(prev => [...prev, { role: 'user', text: currentQuery }]);
        setIsTyping(true);

        try {
            const answer = await queryBusinessAi(currentQuery, chatHistory, orders, expenses, shifts, settings);
            setChatHistory(prev => [...prev, { role: 'model', text: answer }]);
        } catch (e) {
            setChatHistory(prev => [...prev, { role: 'model', text: "I'm sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 bg-brand-orange/5 p-6 rounded-2xl border border-brand-orange/10">
                <div className="p-3 bg-brand-orange text-white rounded-2xl shadow-lg shadow-brand-orange/20 animate-pulse">
                    <SparklesIcon className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-3xl font-serif text-brand-brown">Rose AI Insights</h2>
                    <p className="text-gray-500 font-light mt-1">AI-powered analysis of your business performance and growth opportunities.</p>
                </div>
            </div>

            {/* Insight Cards */}
            <section>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Strategic Summary</h3>
                {loadingInsights ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {insights.map((insight, idx) => (
                            <InsightCard key={idx} insight={insight} />
                        ))}
                    </div>
                )}
            </section>

            {/* Chat Section */}
            <section className="bg-white border border-brand-tan rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
                <header className="px-6 py-4 border-b border-brand-tan bg-brand-tan/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                        <h3 className="font-bold text-brand-brown">Ask Rose AI Business Partner</h3>
                    </div>
                    <span className="text-xs text-gray-400">Powered by Gemini 3</span>
                </header>

                <div className="flex-grow overflow-y-auto p-6 space-y-4">
                    {chatHistory.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-gray-400">
                            <div className="p-4 bg-gray-50 rounded-full">
                                <SparklesIcon className="w-12 h-12" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-600">I'm ready to help you grow!</p>
                                <p className="text-sm">Try asking: "What flavors should I feature next month?" or "How can I improve my margins?"</p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2 max-w-md">
                                {["Top selling flavors this month?", "Labor efficiency summary", "Predict sales for next week"].map(q => (
                                    <button 
                                        key={q}
                                        onClick={() => { setUserQuery(q); }}
                                        className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-full hover:border-brand-orange hover:text-brand-orange transition-colors"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                            <div className={`max-w-[80%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-brand-brown text-white' : 'bg-brand-orange text-white'}`}>
                                    {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
                                </div>
                                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-brand-brown text-white rounded-tr-none' : 'bg-brand-tan/30 text-gray-800 border border-brand-tan rounded-tl-none'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start animate-fade-in">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-sm">
                                    <SparklesIcon className="w-4 h-4 animate-spin-slow" />
                                </div>
                                <div className="p-4 rounded-2xl bg-brand-tan/30 text-gray-400 text-sm flex gap-1">
                                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendQuery} className="p-4 bg-gray-50 border-t border-brand-tan">
                    <div className="relative">
                        <input 
                            type="text"
                            value={userQuery}
                            onChange={e => setUserQuery(e.target.value)}
                            placeholder="Ask me anything about your business..."
                            className="w-full pl-6 pr-12 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-orange focus:border-brand-orange transition-all shadow-inner"
                        />
                        <button 
                            type="submit"
                            disabled={!userQuery.trim() || isTyping}
                            className="absolute right-2 top-2 p-2 bg-brand-orange text-white rounded-xl shadow-md hover:bg-opacity-90 transition-all disabled:opacity-50"
                        >
                            <PaperAirplaneIcon className="w-6 h-6" />
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
