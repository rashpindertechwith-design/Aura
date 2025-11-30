import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, MicOff, Activity } from 'lucide-react';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../services/audioUtils';

const MODEL_LIVE = 'gemini-2.5-flash-native-audio-preview-09-2025';

export const LiveMode: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Audio Context Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session & Stream Refs
  const sessionRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);

  const cleanup = useCallback(() => {
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    
    setIsActive(false);
    setStatus('idle');
    sessionRef.current = null;
  }, []);

  const startSession = async () => {
    try {
      setStatus('connecting');
      setError(null);
      
      // Initialize AI Client
      // Ensure API key is present
      if (!process.env.API_KEY) {
          throw new Error("API Key is missing.");
      }
      aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Setup Audio Contexts
      inputContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      
      const outputNode = outputContextRef.current.createGain();
      outputNode.connect(outputContextRef.current.destination);
      
      // Get Mic Stream
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Connect to Gemini Live
      sessionRef.current = aiRef.current.live.connect({
        model: MODEL_LIVE,
        callbacks: {
          onopen: () => {
            console.log("Live Session Opened");
            setStatus('listening');
            
            // Setup Input Pipeline
            if (!inputContextRef.current || !streamRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
            // Buffer size 4096 matches system instruction example
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              
              if (sessionRef.current) {
                sessionRef.current.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                }).catch(err => {
                    console.error("Error sending input:", err);
                });
              }
            };
            
            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (!outputContextRef.current) return;

            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio) {
              setStatus('speaking');
              
              const ctx = outputContextRef.current;
              // Resume context if it was suspended (browser policy)
              if (ctx.state === 'suspended') {
                  await ctx.resume();
              }

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBytes = base64ToUint8Array(base64Audio);
              const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000);
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                    setStatus('listening');
                }
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
            
            // Handle interruption
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setStatus('listening');
            }
          },
          onclose: () => {
            console.log("Session Closed");
            cleanup();
          },
          onerror: (err) => {
            console.error("Session Error", err);
            // The error object might contain details, convert to string safely
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(`Connection error: ${errorMessage}`);
            cleanup();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: "You are Aura, an intelligent assistant for the blind. Speak clearly, concisely, and describe things vividly. Be helpful and empathetic. Your creator and developer is Rashpinder.",
        }
      });
      
      setIsActive(true);
      
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to start session.");
      cleanup();
    }
  };

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const toggleSession = () => {
    if (isActive) {
      cleanup();
    } else {
      startSession();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-aura-yellow tracking-tight">Live Conversation</h2>
        <p className="text-xl text-gray-300">
          {status === 'idle' && "Tap to start speaking"}
          {status === 'connecting' && "Connecting to Aura..."}
          {status === 'listening' && "Aura is listening..."}
          {status === 'speaking' && "Aura is speaking..."}
        </p>
        {error && <p className="text-red-500 bg-red-900/20 p-2 rounded">{error}</p>}
      </div>

      <button
        onClick={toggleSession}
        aria-label={isActive ? "Stop Conversation" : "Start Conversation"}
        className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 ${
          isActive 
            ? 'bg-red-600 hover:bg-red-700 shadow-[0_0_50px_rgba(220,38,38,0.5)]' 
            : 'bg-aura-yellow hover:bg-yellow-400 text-black shadow-[0_0_50px_rgba(251,191,36,0.3)]'
        }`}
      >
        {/* Pulse Effect */}
        {status === 'speaking' && (
           <span className="absolute inset-0 rounded-full animate-ping bg-aura-yellow opacity-20"></span>
        )}
        
        {isActive ? (
          <MicOff size={64} className="text-white" />
        ) : (
          <Mic size={64} className="text-black" />
        )}
      </button>

      <div className="h-16 flex items-center justify-center w-full">
         {status !== 'idle' && (
             <div className="flex space-x-2">
                 {[1,2,3,4,5].map(i => (
                     <div 
                        key={i} 
                        className={`w-3 bg-aura-yellow rounded-full transition-all duration-150 ${
                            status === 'speaking' ? 'animate-pulse h-12' : 
                            status === 'listening' ? 'h-4 opacity-50' : 'h-2'
                        }`}
                        style={{ animationDelay: `${i * 0.1}s` }}
                     />
                 ))}
             </div>
         )}
      </div>
    </div>
  );
};
