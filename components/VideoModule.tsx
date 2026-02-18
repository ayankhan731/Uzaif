import React, { useState } from 'react';
import { generateVeoVideo } from '../services/gemini';
import { fileToBase64 } from '../utils/fileUtils';

const VideoModule: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setError('');
    setVideoUrl(null);
    try {
      const url = await generateVeoVideo(prompt, aspectRatio, baseImage || undefined);
      setVideoUrl(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-white">
      <div className="w-full md:w-96 p-6 border-r border-gray-200 flex flex-col gap-6 bg-gray-50 z-10">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span className="material-icons text-green-500">movie_filter</span> Veo Studio
        </h2>
        
        <div className="space-y-5">
           <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Prompt</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Cinematic drone shot of a cyberpunk city..."
                className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800 focus:ring-2 focus:ring-green-500 outline-none resize-none h-32 shadow-sm"
              />
           </div>

           <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Aspect Ratio</label>
              <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                 {['16:9', '9:16'].map((r) => (
                   <button
                     key={r}
                     onClick={() => setAspectRatio(r as any)}
                     className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${aspectRatio === r ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                     {r}
                   </button>
                 ))}
              </div>
           </div>

           <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Reference Image (Optional)</label>
              <div className="relative w-full h-32 bg-white rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden hover:border-green-500 transition-colors cursor-pointer group">
                  {baseImage ? (
                    <>
                      <img src={`data:image/png;base64,${baseImage}`} className="w-full h-full object-cover opacity-50" />
                      <button onClick={(e) => { e.stopPropagation(); setBaseImage(null); }} className="absolute bg-red-500 p-1 rounded-full text-white m-auto z-10 hover:bg-red-600 shadow-md">
                        <span className="material-icons text-sm">close</span>
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      <span className="material-icons text-gray-400 group-hover:text-green-500 text-3xl">add_photo_alternate</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={async (e) => e.target.files?.[0] && setBaseImage(await fileToBase64(e.target.files[0]))} 
                    accept="image/*" 
                  />
              </div>
           </div>

           <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl font-bold text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 transform active:scale-95"
            >
              {isLoading && <span className="material-icons animate-spin text-sm">refresh</span>}
              {isLoading ? 'Generating Video...' : 'Generate Video'}
            </button>
        </div>
      </div>

      <div className="flex-1 bg-gray-900 flex items-center justify-center relative">
         {videoUrl ? (
           <video src={videoUrl} controls autoPlay loop className="max-w-full max-h-[90vh] shadow-2xl rounded-lg border border-gray-800" />
         ) : (
           <div className="text-center text-gray-500">
             <span className="material-icons text-7xl mb-4 opacity-50">videocam</span>
             <p className="text-sm font-medium">Veo videos are 720p 24fps</p>
           </div>
         )}
         {error && (
            <div className="absolute top-8 bg-white text-red-600 px-6 py-3 rounded-lg shadow-xl max-w-md text-center border border-red-100">
              {error}
            </div>
         )}
      </div>
    </div>
  );
};

export default VideoModule;