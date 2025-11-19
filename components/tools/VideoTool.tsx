import React, { useState, useEffect } from 'react';
import { generateVeoVideo, checkVeoOperation } from '../../services/geminiService';

const VideoTool: React.FC = () => {
  const [hasKey, setHasKey] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<'idle' | 'generating' | 'complete' | 'error'>('idle');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      const selected = await aiStudio.hasSelectedApiKey();
      setHasKey(selected);
    }
  };

  const handleSelectKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      try {
        await aiStudio.openSelectKey();
        // Assume success after dialog close/action
        setHasKey(true);
      } catch (e) {
        console.error("Key selection failed", e);
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setStatus('generating');
    setVideoUri(null);
    setErrorMessage('');

    try {
      let operation = await generateVeoVideo(prompt);
      
      // Polling loop
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
        operation = await checkVeoOperation(operation);
      }

      if (operation.response?.generatedVideos?.[0]?.video?.uri) {
        const downloadLink = operation.response.generatedVideos[0].video.uri;
        const finalUrl = `${downloadLink}&key=${process.env.API_KEY}`;
        setVideoUri(finalUrl);
        setStatus('complete');
      } else {
          throw new Error("Video generation completed but no URI returned.");
      }

    } catch (err: any) {
      setErrorMessage(err.message);
      setStatus('error');
      if (err.message.includes("Requested entity was not found")) {
          setHasKey(false); // Force re-selection
      }
    }
  };

  return (
    <div className="flex flex-col max-w-3xl mx-auto p-6 h-full">
       <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Veo Video Generator</h2>
        <p className="text-slate-400">Generate 1080p videos from text prompts using the state-of-the-art Veo model.</p>
      </div>

      {!hasKey ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
            <p className="text-lg text-slate-300 mb-6">
                Veo requires you to select an API Key specifically for this session.
            </p>
            <button 
                onClick={handleSelectKey}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
            >
                Select API Key
            </button>
             <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="mt-4 text-sm text-indigo-400 hover:underline">
                Billing Documentation
            </a>
        </div>
      ) : (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-2">Video Prompt</label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A neon hologram of a cat driving at top speed..."
                    className="w-full h-24 bg-slate-900 text-white rounded-lg border border-slate-700 p-3 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                />
                <button
                    onClick={handleGenerate}
                    disabled={status === 'generating' || !prompt}
                    className="mt-4 w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    {status === 'generating' ? 'Generating Video (this may take minutes)...' : 'Generate Video'}
                </button>
            </div>

            {status === 'generating' && (
                <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700 text-center animate-pulse">
                    <p className="text-slate-300">Veo is dreaming up your video...</p>
                    <p className="text-xs text-slate-500 mt-2">Please stay on this page.</p>
                </div>
            )}

            {status === 'error' && (
                 <div className="bg-red-900/20 p-4 rounded-lg border border-red-900 text-red-200">
                    Error: {errorMessage}
                 </div>
            )}

            {status === 'complete' && videoUri && (
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <video controls className="w-full rounded-lg bg-black aspect-video">
                        <source src={videoUri} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                    <div className="mt-4 text-center">
                        <a href={videoUri} download className="text-indigo-400 hover:text-indigo-300 text-sm">
                            Download MP4
                        </a>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default VideoTool;