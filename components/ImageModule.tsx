import React, { useState } from 'react';
import { generateImage, editImage } from '../services/gemini';
import { fileToBase64, downloadUrl } from '../utils/fileUtils';

const ImageModule: React.FC = () => {
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setError('');
    setResultImage(null);

    try {
      if (mode === 'create') {
        const result = await generateImage(prompt, aspectRatio);
        setResultImage(result);
      } else {
        if (!baseImage) throw new Error("Please upload an image to edit");
        const result = await editImage(baseImage, prompt);
        setResultImage(result);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        setBaseImage(base64);
        setResultImage(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-white">
      {/* Controls Sidebar */}
      <div className="w-full md:w-80 p-6 border-r border-gray-200 flex flex-col gap-6 bg-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="material-icons text-pink-500">palette</span> Creative Studio
          </h2>
          
          <div className="flex bg-white p-1 rounded-lg mb-6 border border-gray-200 shadow-sm">
            <button 
              onClick={() => { setMode('create'); setBaseImage(null); setResultImage(null); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'create' ? 'bg-pink-50 text-pink-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Generate
            </button>
            <button 
              onClick={() => { setMode('edit'); setResultImage(null); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'edit' ? 'bg-pink-50 text-pink-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Edit
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Prompt</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'create' ? "A futuristic city on Mars..." : "Add fireworks in the sky..."}
                className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none resize-none h-32 shadow-sm"
              />
            </div>

            {mode === 'create' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  {['1:1', '16:9', '9:16', '3:4', '4:3'].map(ratio => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 rounded border text-xs font-medium transition-all ${aspectRatio === ratio ? 'bg-pink-600 border-pink-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'edit' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Reference Image</label>
                <div className="relative w-full aspect-square bg-white rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden hover:border-pink-400 transition-colors cursor-pointer group">
                  {baseImage ? (
                    <img src={`data:image/png;base64,${baseImage}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <span className="material-icons text-gray-400 text-3xl mb-2 group-hover:text-pink-400">upload_file</span>
                      <p className="text-xs text-gray-400">Click to upload</p>
                    </div>
                  )}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} accept="image/*" />
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt || (mode === 'edit' && !baseImage)}
              className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg font-bold text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all transform active:scale-95"
            >
              {isLoading ? 'Generating...' : mode === 'create' ? 'Generate Image' : 'Edit Image'}
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 bg-white flex items-center justify-center p-8 relative overflow-hidden">
        {/* Grid pattern background */}
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        {resultImage ? (
           <div className="relative group max-w-full max-h-full">
             <img src={resultImage} alt="Generated result" className="rounded-lg shadow-2xl max-w-full max-h-[80vh] border border-gray-100" />
             <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                 onClick={() => downloadUrl(resultImage!, `gemini-${Date.now()}.png`)}
                 className="bg-white text-gray-800 p-2 rounded-lg shadow-lg hover:bg-gray-50 border border-gray-200"
               >
                 <span className="material-icons">download</span>
               </button>
             </div>
           </div>
        ) : (
          <div className="text-center text-gray-400">
             <span className="material-icons text-6xl mb-4 text-gray-200">image</span>
             <p>Your creation will appear here</p>
          </div>
        )}

        {error && (
          <div className="absolute bottom-8 left-8 right-8 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm text-center shadow-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageModule;