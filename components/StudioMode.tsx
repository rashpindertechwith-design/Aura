import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Video, Wand2, Loader2, Lock, Sparkles, Key } from 'lucide-react';
import { generateImage, generateVideo } from '../services/geminiService';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

type CreationType = 'image' | 'video';

const DEFAULT_CREDITS = 5;

export const StudioMode: React.FC = () => {
  const [type, setType] = useState<CreationType>('image');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Credit System
  const [credits, setCredits] = useState<number>(() => {
    const saved = localStorage.getItem('aura_studio_credits');
    return saved !== null ? parseInt(saved, 10) : DEFAULT_CREDITS;
  });

  // API Key State
  const [hasApiKey, setHasApiKey] = useState(false);
  const [checkingKey, setCheckingKey] = useState(true);

  useEffect(() => {
    localStorage.setItem('aura_studio_credits', credits.toString());
  }, [credits]);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        setHasApiKey(true);
      } else {
        // If window.aistudio is missing (local dev), check if process.env.API_KEY is available
        setHasApiKey(!!process.env.API_KEY);
      }
    } catch (e) {
      console.error("Error checking API key:", e);
      setHasApiKey(!!process.env.API_KEY);
    } finally {
      setCheckingKey(false);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // Race condition mitigation: assume success immediately
        setHasApiKey(true);
      } catch (e: any) {
        console.error("Select key error:", e);
        if (e.message && e.message.includes("Requested entity was not found")) {
            setHasApiKey(false);
        }
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    // Safety check for key
    if (!hasApiKey) {
        if (window.aistudio) {
            await handleSelectKey();
        } else {
            setError("API Key missing.");
        }
        return;
    }

    if (credits <= 0) {
      setError("You have used all your free generations.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultUrl(null);

    try {
        let result = null;
        if (type === 'image') {
            const images = await generateImage(prompt);
            if (images.length > 0) result = images[0];
        } else {
            const videoUrl = await generateVideo(prompt);
            result = videoUrl;
        }

        if (result) {
            setResultUrl(result);
            setCredits(prev => Math.max(0, prev - 1));
        } else {
            throw new Error("No result generated.");
        }

    } catch (e: any) {
        console.error(e);
        setError(e.message || "Generation failed. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  if (checkingKey) {
      return (
          <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="animate-spin text-aura-yellow mb-4" size={48} />
              <p className="text-gray-400">Checking permissions...</p>
          </div>
      );
  }

  if (!hasApiKey && window.aistudio) {
      return (
          <div className="flex flex-col items-center justify-center h-full p-6 space-y-6 text-center max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Wand2 className="w-10 h-10 text-aura-yellow" />
              </div>
              <h2 className="text-3xl font-bold text-white">Unlock Creative Studio</h2>
              <p className="text-gray-400 text-lg">
                  To generate high-quality images and videos with Gemini & Veo, you need to connect a paid API key from a Google Cloud Project.
              </p>
              
              <button 
                onClick={handleSelectKey}
                className="bg-aura-yellow text-black font-bold py-4 px-10 rounded-xl text-xl hover:bg-yellow-400 transition-colors flex items-center gap-3 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
              >
                <Key size={24} />
                Select API Key
              </button>
              
              <div className="pt-4">
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-aura-yellow underline transition-colors"
                  >
                    View Billing Documentation
                  </a>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-6 overflow-y-auto space-y-8">
      <header className="flex justify-between items-start">
        <div>
            <h2 className="text-3xl font-bold text-aura-yellow flex items-center gap-3">
                <Wand2 className="w-8 h-8" />
                Creative Studio
            </h2>
            <p className="text-gray-400 mt-2">Generate high-quality images and videos.</p>
        </div>
        
        <div className="bg-gray-800 rounded-full px-4 py-2 border border-gray-700 flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${credits > 0 ? 'text-aura-yellow' : 'text-gray-500'}`} />
            <span className="font-mono font-bold text-white">{credits}</span>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Credits Left</span>
        </div>
      </header>

      {/* Type Selector */}
      <div className="flex p-1 bg-gray-900 rounded-xl border border-gray-800">
        <button
            onClick={() => setType('image')}
            className={`flex-1 py-4 rounded-lg flex items-center justify-center space-x-2 font-bold transition-all ${
                type === 'image' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-500 hover:text-white'
            }`}
        >
            <ImageIcon size={20} />
            <span>Image</span>
        </button>
        <button
            onClick={() => setType('video')}
            className={`flex-1 py-4 rounded-lg flex items-center justify-center space-x-2 font-bold transition-all ${
                type === 'video' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-500 hover:text-white'
            }`}
        >
            <Video size={20} />
            <span>Video (Veo)</span>
        </button>
      </div>

      {/* Input */}
      <div className="space-y-4">
        <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe the ${type} you want to create...`}
            className="w-full bg-gray-900 border-2 border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:border-aura-yellow focus:outline-none min-h-[120px] text-lg"
        />
        
        <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim() || credits <= 0}
            className="w-full bg-aura-yellow text-black font-bold py-4 rounded-xl text-xl hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center justify-center shadow-lg shadow-yellow-900/20 disabled:bg-gray-700 disabled:text-gray-400"
        >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2" />}
            {loading ? 'Creating Magic...' : credits > 0 ? 'Generate (1 Credit)' : 'Out of Credits'}
        </button>
        
        {error && (
            <div className="bg-red-900/30 border border-red-800 p-4 rounded-lg text-red-200 flex items-center gap-2">
                <Lock size={16} />
                {error}
            </div>
        )}
      </div>

      {/* Result */}
      {resultUrl && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            {type === 'image' ? (
                <img src={resultUrl} alt="Generated" className="w-full h-auto rounded-lg shadow-2xl" />
            ) : (
                <video src={resultUrl} controls autoPlay loop className="w-full h-auto rounded-lg shadow-2xl" />
            )}
            <a 
                href={resultUrl} 
                download={`aura-generated.${type === 'image' ? 'png' : 'mp4'}`}
                className="mt-4 bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
            >
                Download File
            </a>
        </div>
      )}
    </div>
  );
};