import React, { useState, useRef, useEffect } from 'react';
import {
    Send,
    User,
    Bot,
    Paperclip,
    MoreVertical,
    Image as ImageIcon,
    Smile,
    ShieldCheck,
    Zap
} from 'lucide-react';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    time: string;
}

export function ChatSoporteGerente({ userName }: { userName: string }) {
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: `Hola ${userName.split(' ')[0]}, soy tu Asistente de Procura. ¿En qué puedo apoyarte con tus aprobaciones hoy?`, sender: 'bot', time: '11:00 AM' },
    ]);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMessage: Message = {
            id: Date.now(),
            text: input,
            sender: 'user',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages([...messages, newMessage]);
        setInput('');

        // Mock bot response
        setTimeout(() => {
            const botResponse: Message = {
                id: Date.now() + 1,
                text: "Entendido. Estoy consultando el estado de la solicitud en el módulo de jurídica. Un momento por favor...",
                sender: 'bot',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, botResponse]);
        }, 1000);
    };

    return (
        <div className="p-8 h-full bg-[#FAFBFF]">
            <div className="max-w-4xl mx-auto h-full flex flex-col bg-white rounded-[2rem] shadow-xl shadow-slate-200 border border-slate-200 overflow-hidden">

                {/* Chat Header */}
                <div className="px-8 py-6 bg-[var(--brand-secondary)] text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30">
                                <Bot size={28} className="text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-4 border-[var(--brand-secondary)] rounded-full"></div>
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight" style={{ fontFamily: 'Gabarito, sans-serif' }}>Asistente Inteligente Procura</h3>
                            <p className="text-white/70 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                <ShieldCheck size={12} className="text-emerald-300" /> Canal de Soporte Gerencial
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-white/10 rounded-xl transition-all">
                            <Zap size={20} className="text-amber-300" />
                        </button>
                        <button className="p-2 hover:bg-white/10 rounded-xl transition-all">
                            <MoreVertical size={20} />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed"
                >
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            <div className={`flex gap-3 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden ${msg.sender === 'user' ? 'bg-[var(--brand-secondary)]' : 'bg-slate-100'
                                    }`}>
                                    {msg.sender === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-slate-500" />}
                                </div>
                                <div className="flex flex-col">
                                    <div className={`px-5 py-3 rounded-2xl text-sm font-medium shadow-sm transition-all ${msg.sender === 'user'
                                            ? 'bg-[var(--brand-secondary)] text-white rounded-tr-none'
                                            : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                                        }`}>
                                        {msg.text}
                                    </div>
                                    <span className={`text-[10px] font-black text-slate-400 mt-1 uppercase tracking-tighter ${msg.sender === 'user' ? 'text-right' : 'text-left'
                                        }`}>
                                        {msg.time}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="p-6 bg-slate-50 border-t border-slate-100">
                    <form
                        onSubmit={handleSend}
                        className="flex items-center gap-4 bg-white p-2 pl-6 rounded-2xl border border-slate-200 shadow-sm focus-within:ring-4 focus-within:ring-[var(--brand-secondary)]/10 focus-within:border-[var(--brand-secondary)]/50 transition-all"
                    >
                        <div className="flex items-center gap-2 text-slate-400">
                            <button type="button" className="hover:text-[var(--brand-secondary)] transition-colors"><Paperclip size={20} /></button>
                            <button type="button" className="hidden sm:block hover:text-[var(--brand-secondary)] transition-colors"><ImageIcon size={20} /></button>
                        </div>
                        <input
                            type="text"
                            placeholder="Escribe tu duda aquí (ej: ¿Cómo apruebo la solicitud SOL-001?)"
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 placeholder:text-slate-400"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                            <button type="button" className="hidden sm:block text-slate-400 hover:text-amber-500 transition-colors"><Smile size={20} /></button>
                            <button
                                type="submit"
                                disabled={!input.trim()}
                                className={`p-3 rounded-xl transition-all flex items-center justify-center ${input.trim()
                                        ? 'bg-[#E84922] text-white shadow-lg shadow-red-200 hover:scale-105 active:scale-95'
                                        : 'bg-slate-100 text-slate-300'
                                    }`}
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </form>
                    <p className="text-center text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest">
                        Soporte Gerencial Prioritario - Tiempo de respuesta promedio: 2 min
                    </p>
                </div>
            </div>
        </div>
    );
}
