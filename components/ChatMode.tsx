import React, { useState, useRef, useEffect } from 'react';
import { Send, Globe, Search } from 'lucide-react';
import { generateText } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';

export const ChatMode: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
        // Convert local history to API format
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const result = await generateText(userMsg.text, history, useSearch);
        
        let finalText = result.text || "";
        
        // Append grounding links if available
        if (result.grounding) {
            finalText += "\n\n**Sources:**\n";
            result.grounding.forEach((chunk: any) => {
                if (chunk.web?.uri && chunk.web?.title) {
                    finalText += `- [${chunk.web.title}](${chunk.web.uri})\n`;
                }
            });
        }

        const modelMsg: ChatMessage = { role: 'model', text: finalText, timestamp: Date.now() };
        setMessages(prev => [...prev, modelMsg]);

    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again.", timestamp: Date.now() }]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                <Search size={64} className="mb-4" />
                <p className="text-xl">Ask Aura anything...</p>
            </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-5 text-lg ${
                msg.role === 'user' 
                ? 'bg-aura-yellow text-black font-medium' 
                : 'bg-gray-800 text-white'
            }`}>
              <ReactMarkdown 
                components={{
                    a: ({node, ...props}) => <a {...props} className="underline font-bold" target="_blank" rel="noreferrer" />
                }}
              >
                {msg.text}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
            <div className="flex justify-start">
                <div className="bg-gray-800 rounded-2xl p-5 animate-pulse">
                    <span className="inline-block w-2 h-2 bg-gray-500 rounded-full mr-1 animate-bounce"></span>
                    <span className="inline-block w-2 h-2 bg-gray-500 rounded-full mr-1 animate-bounce delay-75"></span>
                    <span className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></span>
                </div>
            </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-black border-t border-gray-800">
        <div className="flex items-center space-x-2 mb-2">
            <button 
                onClick={() => setUseSearch(!useSearch)}
                className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-bold transition-colors ${
                    useSearch ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
            >
                <Globe size={16} />
                <span>Google Search {useSearch ? 'ON' : 'OFF'}</span>
            </button>
        </div>
        <div className="flex space-x-3">
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 bg-gray-900 border-2 border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:border-aura-yellow focus:outline-none text-lg"
            />
            <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-aura-yellow text-black p-4 rounded-xl hover:bg-yellow-400 disabled:opacity-50 disabled:hover:bg-aura-yellow"
                aria-label="Send Message"
            >
                <Send size={28} />
            </button>
        </div>
      </div>
    </div>
  );
};