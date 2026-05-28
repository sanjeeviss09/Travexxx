import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, Play, AlertCircle, ShieldAlert, Sparkles, RefreshCw, BarChart2, Info } from 'lucide-react';
import axios from 'axios';
import { API } from '../config/api.js';

export default function AdminChatbot() {
  const adminUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: `Hello ${adminUser.name || 'Admin'}! I am your Revexy Intelligence Advisor. I have analyzed the live platform database state. Ask me anything about fleet inefficiencies, waitlists, routing mechanics, or request optimization suggestions!` 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    { 
      label: 'Analyze Fleet Inefficiencies', 
      query: 'Analyze the current state of the platform. Are there any active routes missing vehicles, unassigned drivers, or bookings waiting to be allocated to a vehicle?',
      icon: BarChart2
    },
    { 
      label: 'Recommend Improvements', 
      query: 'Based on the current database state, what operational improvements, vehicle reallocations, or scheduling changes do you suggest to reduce waitlists and increase seat efficiency?',
      icon: Sparkles
    },
    { 
      label: 'List Waitlisted Bookings', 
      query: 'Summarize all currently waitlisted bookings. What are the bottlenecks and how can we allocate vehicles to resolve them?',
      icon: AlertCircle
    },
    { 
      label: 'How booking flow works', 
      query: 'Can you explain the platform\'s priority levels (e.g. Director, Manager, Employee), waitlisting system, and vehicle relocation matching rules?',
      icon: Info
    }
  ];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend) => {
    const queryText = textToSend || input;
    if (!queryText.trim()) return;

    const newMessages = [...messages, { role: 'user', content: queryText.trim() }];
    setMessages(newMessages);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API}/ai/chat`, {
        messages: newMessages,
        user: adminUser,
        isAdvisor: true
      });

      if (response.data && response.data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error processing your query.' }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to communicate with the AI Advisor. Make sure the backend server is running.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-700 to-blue-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 dark:shadow-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
            <Bot className="h-8 w-8 text-white float" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              AI Platform Advisor <span className="text-[10px] uppercase font-bold tracking-widest bg-violet-400/30 px-2 py-0.5 rounded-full border border-violet-300/30">Admin Advisor</span>
            </h2>
            <p className="text-indigo-100/70 text-xs sm:text-sm mt-0.5 font-medium">Real-time database analysis, diagnostics auditing, and optimization recommendations.</p>
          </div>
        </div>
        <button 
          onClick={() => setMessages([{ role: 'assistant', content: `Advisor restarted. Let's do another analysis! Ask me anything about the live platform metrics.` }])}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all backdrop-blur-sm self-stretch md:self-auto justify-center"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reset Chat
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick Action Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-5 space-y-4 bg-white dark:bg-slate-800">
            <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-violet-500" /> Diagnostic Tools
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">Click any query below to audit the live platform state and database metrics instantly:</p>
            <div className="flex flex-col gap-2.5">
              {quickPrompts.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.query)}
                    disabled={isLoading}
                    className="w-full text-left p-3 rounded-xl border border-gray-150 dark:border-slate-700 bg-gray-50/50 hover:bg-violet-50/30 dark:bg-slate-900/30 dark:hover:bg-slate-700/30 hover:border-violet-300 dark:hover:border-violet-800 transition-all text-xs font-semibold text-gray-700 dark:text-slate-350 flex items-center gap-2 group disabled:opacity-50"
                  >
                    <Icon className="h-4 w-4 text-violet-500 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card p-5 bg-gradient-to-br from-violet-50/30 to-indigo-50/20 dark:from-violet-950/10 dark:to-indigo-950/10 border border-violet-100/50 dark:border-violet-900/20">
            <h4 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1.5">Self-Learning Active</h4>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
              Every query, action, and feedback log is processed to update the bot's persistent memory. It learns user preferences and logs system bottlenecks to improve recommendations automatically.
            </p>
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-3 card flex flex-col overflow-hidden bg-white dark:bg-slate-800" style={{ height: '600px' }}>
          {/* Chat Messages */}
          <div className="flex-1 p-5 overflow-y-auto bg-gray-50/40 dark:bg-slate-900/10 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-650 text-white rounded-br-sm font-medium' 
                    : 'bg-white dark:bg-[#1e293b] text-gray-800 dark:text-gray-100 border border-gray-150 dark:border-slate-700 rounded-bl-sm whitespace-pre-wrap'
                }`}>
                  {msg.role === 'assistant' && msg.content.includes('- ') ? (
                    // Simple markdown list rendering helper
                    <div>
                      {msg.content.split('\n').map((line, lIdx) => {
                        if (line.trim().startsWith('- ')) {
                          return (
                            <li key={lIdx} className="ml-4 list-disc mt-1 text-gray-700 dark:text-slate-300">
                              {line.trim().substring(2)}
                            </li>
                          );
                        }
                        if (line.trim().startsWith('### ')) {
                          return <h4 key={lIdx} className="font-bold text-gray-900 dark:text-white mt-4 mb-2 text-base">{line.replace('### ', '')}</h4>;
                        }
                        if (line.trim().startsWith('## ')) {
                          return <h3 key={lIdx} className="font-extrabold text-gray-900 dark:text-white mt-5 mb-2.5 text-lg">{line.replace('## ', '')}</h3>;
                        }
                        return <p key={lIdx} className={line.trim() ? "mt-2 font-medium" : "h-2"}>{line}</p>;
                      })}
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-[#1e293b] px-4 py-3 rounded-2xl rounded-bl-sm border border-gray-150 dark:border-slate-700 flex items-center gap-2 text-sm text-gray-500 shadow-sm">
                  <Loader2 size={16} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                  Querying live platform diagnostics...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-150 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="relative flex items-center shadow-sm rounded-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 focus-within:border-indigo-500 dark:focus-within:border-indigo-550 p-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about active routes, waitlisted passengers, or improvements..."
                className="w-full pl-5 pr-14 py-3 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="absolute right-1.5 p-2.5 rounded-full bg-indigo-650 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
