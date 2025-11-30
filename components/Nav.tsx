import React from 'react';
import { Mic, Eye, MessageSquare, Palette, Settings } from 'lucide-react';
import { AppMode } from '../types';

interface NavProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const Nav: React.FC<NavProps> = ({ mode, setMode }) => {
  const navItems = [
    { id: AppMode.LIVE, icon: Mic, label: 'Live' },
    { id: AppMode.VISION, icon: Eye, label: 'Vision' },
    { id: AppMode.CHAT, icon: MessageSquare, label: 'Chat' },
    { id: AppMode.CREATE, icon: Palette, label: 'Studio' },
    // { id: AppMode.SETTINGS, icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="bg-gray-900 border-t border-gray-800 h-20 flex items-center justify-around px-2 pb-safe">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setMode(item.id)}
          className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all ${
            mode === item.id 
              ? 'text-aura-yellow bg-gray-800 scale-110' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
          aria-label={item.label}
          aria-pressed={mode === item.id}
        >
          <item.icon size={28} strokeWidth={mode === item.id ? 3 : 2} />
          <span className="text-[10px] font-bold uppercase mt-1 tracking-wide">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};