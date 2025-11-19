import React, { useState, useRef } from 'react';
import { generateSpeech } from '../../services/geminiService';
import { decodeAudio, decodeAudioData } from '../../services/audioUtils';

const TTSTool: React.FC = () => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const handleSpeak = async () => {
    if (!text.trim()) return;
    setLoading(true);
    
    try {
      const base64Audio = await generateSpeech(text);
      
      // Initialize Audio Context on user gesture
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioCtxRef.current;

      // Decode and play
      const audioBuffer = await decodeAudioData(
          decodeAudio(base64Audio),
          ctx,
          24000, 
          1
      );

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();

    } catch (err: any) {
      alert('Error generating speech: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col max-w-2xl mx-auto p-6 h-full justify-center">
        <h2 className="text-2xl font-bold text-white mb-2">Text-to-Speech (TTS)</h2>
        <p className="text-slate-400 mb-6">Convert text into natural sounding speech using Gemini.</p>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to speak..."
                className="w-full h-40 bg-slate-900 text-white rounded-lg border border-slate-700 p-4 focus:ring-1 focus:ring-indigo-500 outline-none resize-none text-lg"
            />
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleSpeak}
                    disabled={loading || !text}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {loading ? 'Generating...' : (
                        <>
                            <span>🔊</span> Speak
                        </>
                    )}
                </button>
            </div>
        </div>
    </div>
  );
};

export default TTSTool;