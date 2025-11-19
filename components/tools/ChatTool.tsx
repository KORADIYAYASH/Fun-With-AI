import React, { useState, useRef, useEffect } from 'react';
import { ToolId, ChatMessage } from '../../types';
import { generateTextContent, generateWithGrounding } from '../../services/geminiService';

interface ChatToolProps {
  toolId: ToolId;
  model: string;
  title: string;
  description: string;
}

const ChatTool: React.FC<ChatToolProps> = ({ toolId, model, title, description }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let result;
      if (toolId === ToolId.SEARCH_GROUNDING) {
        result = await generateWithGrounding(input, 'search');
      } else if (toolId === ToolId.MAPS_GROUNDING) {
         // Get Location
         let coords;
         try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => 
                navigator.geolocation.getCurrentPosition(resolve, reject)
            );
            coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
         } catch (err) {
            console.warn("Location access denied, proceeding without location");
         }
         result = await generateWithGrounding(input, 'maps', coords);
      } else {
         result = await generateTextContent(input, model);
      }

      setMessages(prev => [...prev, { 
          role: 'model', 
          text: result.text, 
          groundingChunks: (result as any).groundingChunks 
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${error.message}`, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
        <div className="mb-4 border-b border-slate-800 pb-4">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <p className="text-slate-400 text-sm mt-1">{description}</p>
        </div>

      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700 mb-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 mt-20">
            <p>Start a conversation to learn more.</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-4 ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white' 
                : msg.isError ? 'bg-red-900/50 text-red-200 border border-red-800' : 'bg-slate-700 text-slate-200'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
              
              {/* Render Grounding Chunks */}
              {msg.groundingChunks && (
                <div className="mt-4 pt-3 border-t border-white/10 text-sm">
                    <p className="font-semibold mb-2 opacity-75">Sources:</p>
                    <div className="flex flex-wrap gap-2">
                        {msg.groundingChunks.map((chunk: any, i: number) => {
                            const uri = chunk.web?.uri || chunk.maps?.uri;
                            const title = chunk.web?.title || chunk.maps?.title || 'Source';
                            if (!uri) return null;
                            return (
                                <a 
                                    key={i} 
                                    href={uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="bg-black/20 hover:bg-black/40 px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 text-indigo-200"
                                >
                                    <span>🔗</span> {title}
                                </a>
                            )
                        })}
                    </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
            <div className="flex justify-start">
                <div className="bg-slate-700 rounded-lg p-4 animate-pulse">
                    <div className="h-2 w-12 bg-slate-600 rounded"></div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={toolId === ToolId.CHAT_CODE ? "Ask me to write Python code..." : "Type your prompt here..."}
          className="w-full bg-slate-900 text-white rounded-xl border border-slate-700 p-4 pr-12 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ➤
        </button>
      </form>
    </div>
  );
};

export default ChatTool;