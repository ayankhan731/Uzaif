import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatModelType, AppMode } from '../types';
import { sendChatMessage } from '../services/gemini';
import { fileToBase64 } from '../utils/fileUtils';

interface ChatModuleProps {
  mode: AppMode;
}

const ChatModule: React.FC<ChatModuleProps> = ({ mode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Settings
  const [useSearch, setUseSearch] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const [useFast, setUseFast] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration based on mode
  const getModeConfig = () => {
    switch (mode) {
      case AppMode.CODE:
        return {
          title: 'Code Studio',
          icon: 'code',
          placeholder: 'Describe a programming task or paste code to debug...',
          systemInstruction: 'You are an expert software engineer and coding assistant. Generate clean, efficient, and well-documented code in Python, JavaScript, Java, or any requested language. When explaining code, be concise but thorough.',
          accent: 'blue'
        };
      case AppMode.WRITE:
        return {
          title: 'Creative Writer',
          icon: 'edit_note',
          placeholder: 'What are we writing today? Story, email, or blog post?',
          systemInstruction: 'You are a creative writing partner. Help with story arcs, character development, drafting content, proofreading, and stylistic improvements. Be imaginative and articulate.',
          accent: 'purple'
        };
      default:
        return {
          title: 'Gemini Chat',
          icon: 'chat_bubble',
          placeholder: 'Ask anything...',
          systemInstruction: 'You are a helpful and knowledgeable AI assistant.',
          accent: 'blue'
        };
    }
  };

  const config = getModeConfig();

  // Reset messages when mode changes
  useEffect(() => {
    setMessages([]);
    setUseSearch(false);
    setUseThinking(false);
  }, [mode]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    let base64File: string | null = null;
    let fileType: 'image' | 'video' | null = null;

    if (selectedFile) {
      try {
        base64File = await fileToBase64(selectedFile);
        if (selectedFile.type.startsWith('image/')) fileType = 'image';
        if (selectedFile.type.startsWith('video/')) fileType = 'video';
      } catch (e) {
        console.error("File processing error", e);
        return;
      }
    }

    const userMsg: ChatMessage = {
      role: 'user',
      text: input,
      timestamp: Date.now(),
      images: fileType === 'image' && base64File ? [base64File] : undefined,
      videos: fileType === 'video' && base64File ? [base64File] : undefined,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedFile(null);
    setIsLoading(true);

    try {
      // Determine model and mode
      let modelType = ChatModelType.PRO;
      if (useSearch) modelType = ChatModelType.FLASH_SEARCH;
      if (useFast) modelType = ChatModelType.FLASH_LITE;
      
      const result = await sendChatMessage(
        modelType,
        userMsg.text,
        messages, 
        userMsg.images || [],
        userMsg.videos || [],
        useThinking,
        config.systemInstruction
      );

      const modelMsg: ChatMessage = {
        role: 'model',
        text: result.text,
        timestamp: Date.now(),
        groundingUrls: result.groundingUrls
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: `Error: ${error.message || "Something went wrong."}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-800">
      {/* Header / Options */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <h2 className={`text-xl font-bold mr-auto flex items-center gap-2 text-${config.accent}-600`}>
          <span className="material-icons">{config.icon}</span>
          {config.title}
        </h2>
        
        <div className="flex items-center gap-2 text-sm bg-gray-50 p-1 rounded-xl border border-gray-200">
          <button
            onClick={() => { setUseThinking(!useThinking); if(!useThinking) { setUseFast(false); setUseSearch(false); } }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 font-medium ${useThinking ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            <span className="material-icons text-xs">psychology</span> Reasoning
          </button>
          <button
            onClick={() => { setUseSearch(!useSearch); if(!useSearch) { setUseFast(false); setUseThinking(false); } }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 font-medium ${useSearch ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            <span className="material-icons text-xs">public</span> Search
          </button>
          <button
            onClick={() => { setUseFast(!useFast); if(!useFast) { setUseThinking(false); setUseSearch(false); } }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 font-medium ${useFast ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            <span className="material-icons text-xs">bolt</span> Fast
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 bg-white">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <div className={`p-6 rounded-full bg-${config.accent}-50 mb-4`}>
                <span className={`material-icons text-6xl text-${config.accent}-200`}>{config.icon}</span>
            </div>
            <p className="text-xl font-medium text-gray-400">Start your {config.title.toLowerCase()} session</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] lg:max-w-[70%] rounded-2xl p-5 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none shadow-blue-200' 
                : 'bg-white text-gray-800 rounded-bl-none border border-gray-100 shadow-gray-200'
            }`}>
              {/* Media Attachments */}
              {msg.images?.map((img, i) => (
                <img key={i} src={`data:image/jpeg;base64,${img}`} className="max-w-full rounded-xl mb-4 border border-white/20" alt="User upload" />
              ))}
              {msg.videos?.map((vid, i) => (
                 <video key={i} controls className="max-w-full rounded-xl mb-4 border border-white/20">
                   <source src={`data:video/mp4;base64,${vid}`} type="video/mp4" />
                 </video>
              ))}

              {/* Text Content */}
              <div className={`whitespace-pre-wrap leading-7 ${msg.role === 'user' ? 'font-medium' : 'font-normal text-gray-700'}`}>
                {msg.text}
              </div>

              {/* Grounding Sources */}
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                    <span className="material-icons text-xs">public</span> Sources
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingUrls.map((source, i) => (
                      <a 
                        key={i} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200 text-blue-600 truncate max-w-[200px] transition-colors"
                      >
                        {source.title || new URL(source.uri).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white rounded-2xl rounded-bl-none p-4 border border-gray-100 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 lg:p-6 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto relative bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all shadow-sm">
          
          {selectedFile && (
            <div className="absolute -top-12 left-0 bg-white border border-gray-200 p-2 rounded-xl flex items-center gap-3 text-sm text-gray-600 shadow-md">
              <span className="material-icons text-blue-500 bg-blue-50 p-1 rounded-lg">attach_file</span>
              <span className="truncate max-w-[150px] font-medium">{selectedFile.name}</span>
              <button onClick={() => setSelectedFile(null)} className="hover:text-red-500 p-1 hover:bg-red-50 rounded-full transition-colors">
                <span className="material-icons text-base">close</span>
              </button>
            </div>
          )}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={config.placeholder}
            className="w-full bg-transparent border-none text-gray-800 p-4 pr-32 resize-none focus:ring-0 min-h-[60px] max-h-[200px] placeholder-gray-400"
            rows={1}
            style={{ minHeight: '60px' }}
          />
          
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept="image/*,video/*"
              onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
              title="Upload Image/Video"
            >
              <span className="material-icons">add_photo_alternate</span>
            </button>
            <button 
              onClick={handleSend}
              disabled={!input.trim() && !selectedFile}
              className={`p-2 rounded-xl transition-all shadow-md flex items-center justify-center ${
                 !input.trim() && !selectedFile 
                 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                 : `bg-${config.accent}-600 text-white hover:bg-${config.accent}-700 shadow-${config.accent}-200`
              }`}
            >
              <span className="material-icons">send</span>
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-3">Gemini can make mistakes. Double check responses.</p>
      </div>
    </div>
  );
};

export default ChatModule;