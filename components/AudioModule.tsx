import React, { useState } from 'react';
import { generateSpeech, transcribeAudio } from '../services/gemini';
import { fileToBase64 } from '../utils/fileUtils';

const AudioModule: React.FC = () => {
  const [tab, setTab] = useState<'tts' | 'stt'>('tts');
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState('');

  const handleTTS = async () => {
    if (!text) return;
    setIsLoading(true);
    setAudioUrl(null);
    try {
      const audioBuffer = await generateSpeech(text);
      // Convert AudioBuffer to WAV blob for playback (simplified approach)
      const wav = audioBufferToWav(audioBuffer);
      const blob = new Blob([wav], { type: 'audio/wav' });
      setAudioUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert('Generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranscribe = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsLoading(true);
    setTranscription('');
    try {
      const base64 = await fileToBase64(e.target.files[0]);
      const result = await transcribeAudio(base64);
      setTranscription(result);
    } catch (e) {
      console.error(e);
      alert('Transcription failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-12 text-gray-800">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setTab('tts')}
            className={`flex-1 py-6 text-center font-bold text-lg transition-colors ${tab === 'tts' ? 'bg-orange-50 text-orange-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
          >
            Text to Speech
          </button>
          <button 
             onClick={() => setTab('stt')}
             className={`flex-1 py-6 text-center font-bold text-lg transition-colors ${tab === 'stt' ? 'bg-orange-50 text-orange-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
          >
            Transcription
          </button>
        </div>

        <div className="p-8">
          {tab === 'tts' ? (
            <div className="space-y-6">
              <textarea 
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Enter text to convert to speech..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 min-h-[200px] text-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none placeholder-gray-400"
              />
              <button 
                onClick={handleTTS}
                disabled={isLoading || !text}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 rounded-xl font-bold text-white transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
              >
                {isLoading ? 'Generating Audio...' : 'Generate Speech'}
              </button>
              {audioUrl && (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col items-center gap-4">
                  <h3 className="text-gray-500 uppercase text-xs font-bold tracking-widest">Output Audio</h3>
                  <audio controls src={audioUrl} className="w-full" />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 flex flex-col items-center justify-center min-h-[300px]">
              <label className="cursor-pointer bg-gray-50 border-2 border-dashed border-gray-300 hover:border-orange-500 rounded-2xl p-12 text-center w-full transition-all group">
                <span className="material-icons text-5xl text-gray-400 mb-4 group-hover:text-orange-500">upload_file</span>
                <p className="text-gray-500 font-medium">Click to upload Audio (WAV/MP3)</p>
                <input type="file" className="hidden" accept="audio/*" onChange={handleTranscribe} />
              </label>
              
              {isLoading && <p className="animate-pulse text-orange-600 font-medium">Transcribing audio...</p>}

              {transcription && (
                <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-gray-400 uppercase text-xs font-bold tracking-widest mb-4">Transcription Result</h3>
                  <p className="leading-relaxed text-gray-800 whitespace-pre-wrap">{transcription}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple WAV header generator for the AudioBuffer (Helper)
function audioBufferToWav(buffer: AudioBuffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"

  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);  // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit (hardcoded in this specific dec)

  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  for(i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  while(pos < buffer.length) {
    for(i = 0; i < numOfChan; i++) {             // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
      view.setInt16(44 + offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return bufferArr;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}

export default AudioModule;