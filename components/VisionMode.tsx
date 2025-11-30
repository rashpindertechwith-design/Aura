import React, { useState, useRef } from 'react';
import { Camera, FileVideo, Upload, Loader2, Play } from 'lucide-react';
import { analyzeMedia } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

export const VisionMode: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');
    setResult("");
    
    const reader = new FileReader();
    reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!preview || !mediaType) return;
    setLoading(true);
    setResult("");

    try {
        // Strip base64 prefix
        const base64Data = preview.split(',')[1];
        const mimeType = preview.split(';')[0].split(':')[1];
        
        const prompt = mediaType === 'video' 
            ? "Analyze this video. Describe the action, setting, and key events in detail for a blind user."
            : "Describe this image in high detail. Mention colors, text, objects, and layout for a blind user.";

        const text = await analyzeMedia(base64Data, mimeType, prompt);
        setResult(text || "No analysis returned.");
    } catch (err) {
        setResult("Error analyzing media. Please try again.");
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 space-y-6 overflow-y-auto">
      <header className="space-y-2">
        <h2 className="text-3xl font-bold text-aura-yellow">Vision & Video</h2>
        <p className="text-gray-400">Upload a photo or video for detailed AI analysis.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Area */}
        <div className="space-y-4">
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-4 border-dashed border-gray-700 rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer hover:border-aura-yellow hover:bg-gray-900 transition-colors bg-gray-900/30"
                role="button"
                aria-label="Upload image or video"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
                {preview ? (
                    mediaType === 'video' ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <video src={preview} className="max-h-full max-w-full rounded-lg" controls />
                        </div>
                    ) : (
                         <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg" />
                    )
                ) : (
                    <>
                        <Upload size={48} className="text-gray-500 mb-4" />
                        <span className="text-xl font-semibold text-gray-300">Tap to Upload</span>
                        <span className="text-sm text-gray-500 mt-2">Supports Images & Videos</span>
                    </>
                )}
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="image/*,video/*" 
                className="hidden" 
            />

            {preview && (
                <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="w-full bg-aura-yellow text-black font-bold py-4 rounded-xl text-xl hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : (mediaType === 'video' ? <FileVideo className="mr-2"/> : <Camera className="mr-2"/>)}
                    {loading ? 'Analyzing...' : `Analyze ${mediaType === 'video' ? 'Video' : 'Image'}`}
                </button>
            )}
        </div>

        {/* Result Area */}
        <div className="bg-gray-900 rounded-2xl p-6 min-h-[300px] border border-gray-800">
            <h3 className="text-lg font-bold text-gray-400 mb-4 uppercase tracking-wider">Analysis Result</h3>
            {loading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-4">
                    <Loader2 size={48} className="animate-spin text-aura-yellow" />
                    <p className="text-gray-300 animate-pulse">Processing visual data...</p>
                </div>
            ) : result ? (
                <div className="prose prose-invert prose-lg max-w-none text-gray-200">
                    <ReactMarkdown>{result}</ReactMarkdown>
                </div>
            ) : (
                <p className="text-gray-600 italic">Analysis will appear here...</p>
            )}
        </div>
      </div>
    </div>
  );
};