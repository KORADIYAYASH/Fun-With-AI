import React, { useState } from 'react';
import { generateImage, editImage } from '../../services/geminiService';

interface ImageToolProps {
  mode: 'generate' | 'edit';
}

const ImageTool: React.FC<ImageToolProps> = ({ mode }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      let url;
      if (mode === 'edit' && sourceImage) {
        url = await editImage(prompt, sourceImage);
      } else {
        url = await generateImage(prompt);
      }
      setResultImage(url || null);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto p-4 h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
            {mode === 'generate' ? 'AI Image Generator' : 'AI Image Editor'}
        </h2>
        <p className="text-slate-400">
            {mode === 'generate' 
                ? 'Create high-quality images from text descriptions using Imagen.' 
                : 'Upload an image and describe how to modify it using Gemini.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Controls */}
        <div className="flex flex-col gap-4 bg-slate-800 p-6 rounded-xl border border-slate-700">
            {mode === 'edit' && (
                <div className="mb-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Source Image</label>
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    {sourceImage && (
                        <div className="mt-4 relative aspect-video rounded-lg overflow-hidden bg-black/40">
                            <img src={sourceImage} alt="Source" className="object-contain w-full h-full" />
                        </div>
                    )}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Prompt</label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={mode === 'generate' ? "A cyberpunk city in the rain..." : "Add a red hat to the person..."}
                    className="w-full h-32 bg-slate-900 text-white rounded-lg border border-slate-700 p-3 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                />
            </div>

            <button
                onClick={handleGenerate}
                disabled={loading || !prompt || (mode === 'edit' && !sourceImage)}
                className="mt-auto w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
                {loading ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </span>
                ) : (
                    "Generate"
                )}
            </button>
        </div>

        {/* Result */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center relative min-h-[300px]">
            {resultImage ? (
                <>
                    <img src={resultImage} alt="Result" className="max-w-full max-h-full rounded shadow-lg object-contain" />
                    <a 
                        href={resultImage} 
                        download="generated-image.png" 
                        className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                        title="Download"
                    >
                        ⬇️
                    </a>
                </>
            ) : (
                <div className="text-center text-slate-500">
                    <p className="text-4xl mb-2">🖼️</p>
                    <p>Result will appear here</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ImageTool;