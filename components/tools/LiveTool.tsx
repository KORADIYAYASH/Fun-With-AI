import React, { useEffect, useRef, useState } from 'react';
import { getLiveSession } from '../../services/geminiService';
import { createPcmBlob, decodeAudio, decodeAudioData, blobToBase64 } from '../../services/audioUtils';

const LiveTool: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Audio/Video Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<number | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 10));

  const stop = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (inputAudioCtxRef.current) inputAudioCtxRef.current.close();
    if (outputAudioCtxRef.current) outputAudioCtxRef.current.close();
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    
    // Stop all playing sources
    sourcesRef.current.forEach(s => {
        try { s.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();

    // Try to close session if possible (method might not exist on type, but good practice)
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => {
             // session.close() isn't strictly typed in some versions but required for cleanup
             if(session.close) session.close();
        }).catch(() => {});
    }

    setConnected(false);
    addLog("Session disconnected");
  };

  const start = async () => {
    setError(null);
    try {
      addLog("Requesting media permissions...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Initialize Audio Contexts
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      addLog("Connecting to Gemini Live...");

      // Callbacks
      const callbacks = {
        onopen: () => {
          addLog("Connection opened!");
          setConnected(true);
          setupAudioInput(stream);
          setupVideoInput();
        },
        onmessage: async (message: any) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioCtxRef.current) {
                try {
                    const ctx = outputAudioCtxRef.current;
                    // Use audioUtils decode function
                    const audioBuffer = await decodeAudioData(
                        decodeAudio(base64Audio),
                        ctx,
                        24000,
                        1
                    );
                    
                    const source = ctx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(ctx.destination);
                    
                    const now = ctx.currentTime;
                    // Schedule next chunk
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    
                    sourcesRef.current.add(source);
                    source.addEventListener('ended', () => sourcesRef.current.delete(source));
                } catch (e) {
                    console.error("Error decoding audio", e);
                }
            }

            // Handle Interruption
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
                addLog("Model interrupted");
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
        },
        onclose: () => {
            addLog("Connection closed by server");
            setConnected(false);
        },
        onerror: (e: any) => {
            console.error(e);
            setError("Connection error occurred");
            setConnected(false);
        }
      };

      sessionPromiseRef.current = getLiveSession(callbacks);

    } catch (err: any) {
      setError(err.message);
      stop();
    }
  };

  const setupAudioInput = (stream: MediaStream) => {
    if (!inputAudioCtxRef.current) return;
    const ctx = inputAudioCtxRef.current;
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
            });
        }
    };

    source.connect(processor);
    processor.connect(ctx.destination);
  };

  const setupVideoInput = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Send frames at ~2 FPS to save bandwidth/tokens
    videoIntervalRef.current = window.setInterval(() => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth / 4; // Downscale
            canvas.height = video.videoHeight / 4;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob(async (blob) => {
                if (blob && sessionPromiseRef.current) {
                    const base64 = await blobToBase64(blob);
                    sessionPromiseRef.current.then(session => {
                        session.sendRealtimeInput({
                            media: { mimeType: 'image/jpeg', data: base64 }
                        });
                    });
                }
            }, 'image/jpeg', 0.5);
        }
    }, 500); 
  };

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            Gemini Live (Audio + Vision)
        </h2>
        <p className="text-slate-400">
          Real-time multimodal conversation. Speak and show things to the camera.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Video Feed */}
        <div className="relative bg-black rounded-xl overflow-hidden aspect-video border border-slate-700">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            {!connected && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
                    <button 
                        onClick={start}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-lg transform transition hover:scale-105"
                    >
                        Start Live Session
                    </button>
                </div>
            )}
            {connected && (
                 <button 
                    onClick={stop}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold shadow-lg text-sm"
                >
                    End Session
                </button>
            )}
        </div>

        {/* Logs / Status */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col">
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Session Logs</h3>
            <div className="flex-1 overflow-y-auto font-mono text-xs text-slate-300 space-y-1">
                {logs.length === 0 && <span className="text-slate-600">Waiting for connection...</span>}
                {logs.map((log, i) => (
                    <div key={i}>&gt; {log}</div>
                ))}
            </div>
            {error && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded text-red-200 text-xs">
                    {error}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LiveTool;