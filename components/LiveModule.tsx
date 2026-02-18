import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData } from '../utils/audioUtils';

const LiveModule: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [logs, setLogs] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Audio Contexts
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  
  // Stream & Processing
  const streamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Initialization
  const connect = async () => {
    try {
      setStatus('connecting');
      addLog("Initializing audio contexts...");
      
      inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 640, height: 480 } });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      addLog("Connecting to Gemini Live...");
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            addLog("Session Connected!");
            setStatus('connected');
            setIsConnected(true);
            setupAudioInput();
            startVideoStreaming();
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              playAudio(base64Audio);
            }
            if (message.serverContent?.interrupted) {
               addLog("Interrupted by user");
               stopAudioPlayback();
            }
          },
          onclose: () => {
            addLog("Session Closed");
            disconnect();
          },
          onerror: (err) => {
            console.error(err);
            addLog("Session Error (check console)");
            disconnect();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
             voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: "You are a helpful, witty, and concise AI assistant. You can see the user via video.",
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (e: any) {
      addLog(`Error: ${e.message}`);
      setStatus('disconnected');
    }
  };

  const setupAudioInput = () => {
    if (!inputAudioContextRef.current || !streamRef.current) return;
    
    const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
    const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createPcmBlob(inputData);
      
      sessionPromiseRef.current?.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };
    
    source.connect(processor);
    processor.connect(inputAudioContextRef.current.destination);
  };

  const startVideoStreaming = () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    const interval = setInterval(() => {
       if (!ctx || !videoRef.current || status !== 'connected') {
         clearInterval(interval);
         return;
       }
       
       canvasRef.current.width = videoRef.current.videoWidth;
       canvasRef.current.height = videoRef.current.videoHeight;
       ctx.drawImage(videoRef.current, 0, 0);
       
       const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
       
       sessionPromiseRef.current?.then(session => {
         session.sendRealtimeInput({
            media: { mimeType: 'image/jpeg', data: base64 }
         });
       });

    }, 1000); // 1 FPS to save bandwidth
  };

  const playAudio = async (base64: string) => {
    if (!outputAudioContextRef.current) return;
    
    // Ensure accurate timing for gapless playback
    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
    
    const audioBuffer = await decodeAudioData(
      Uint8Array.from(atob(base64), c => c.charCodeAt(0)),
      outputAudioContextRef.current,
      24000,
      1
    );

    const source = outputAudioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputAudioContextRef.current.destination);
    source.start(nextStartTimeRef.current);
    
    nextStartTimeRef.current += audioBuffer.duration;
    
    source.onended = () => {
      sourcesRef.current.delete(source);
    };
    sourcesRef.current.add(source);
  };

  const stopAudioPlayback = () => {
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const disconnect = () => {
    sessionPromiseRef.current?.then(s => s.close()); // Try to close nicely
    setIsConnected(false);
    setStatus('disconnected');
    
    streamRef.current?.getTracks().forEach(t => t.stop());
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    
    stopAudioPlayback();
  };

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5));

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6 items-center justify-center gap-8 relative overflow-hidden">
      
      {/* Background Pulse Effect */}
      {isConnected && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
           <div className="w-96 h-96 bg-blue-400 rounded-full blur-3xl animate-pulse"></div>
         </div>
      )}

      {/* Video Preview */}
      <div className="relative w-full max-w-md aspect-video bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-xl">
        <video ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Status Badge */}
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          status === 'connected' ? 'bg-red-500 text-white animate-pulse shadow-md' : 
          status === 'connecting' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-500'
        }`}>
          {status === 'connected' ? 'LIVE' : status}
        </div>
      </div>

      {/* Controls */}
      <div className="z-10 flex flex-col items-center gap-6">
        <h2 className="text-3xl font-light text-gray-800">Gemini Live</h2>
        <p className="text-gray-500 text-center max-w-md">
          Real-time multimodal conversation. Speak naturally and show things to the camera.
        </p>
        
        <button
          onClick={isConnected ? disconnect : connect}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
            isConnected ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-white hover:bg-gray-50 text-blue-600 shadow-gray-200'
          }`}
        >
          <span className={`material-icons text-4xl ${isConnected ? 'text-white' : 'text-blue-600'}`}>
            {isConnected ? 'call_end' : 'mic'}
          </span>
        </button>
      </div>

      {/* Logs */}
      <div className="absolute bottom-6 left-6 right-6 pointer-events-none">
        <div className="flex flex-col items-center gap-2">
          {logs.map((log, i) => (
            <div key={i} className="text-xs text-gray-600 bg-white/90 shadow-sm border border-gray-100 px-3 py-1.5 rounded-full">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiveModule;