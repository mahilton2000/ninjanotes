import React, { useState } from 'react';
import { Copy, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { translateText, SUPPORTED_LANGUAGES } from '../../utils/translate';

interface Speaker {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

interface TranscriptDisplayProps {
  transcript: string;
  speakers?: Speaker[];
}

export function TranscriptDisplay({ transcript, speakers }: TranscriptDisplayProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetLanguage = e.target.value;
    setSelectedLanguage(targetLanguage);

    if (!targetLanguage) {
      setTranslatedText('');
      return;
    }

    setIsTranslating(true);
    try {
      const translated = await translateText(transcript, targetLanguage);
      setTranslatedText(translated);
      toast.success(`Translated to ${SUPPORTED_LANGUAGES[targetLanguage as keyof typeof SUPPORTED_LANGUAGES]}`);
    } catch (error) {
      toast.error('Translation failed. Please try again.');
      setSelectedLanguage('');
    } finally {
      setIsTranslating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      const textToCopy = translatedText || transcript;
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Text copied to clipboard');
    } catch (error) {
      console.error('Failed to copy text:', error);
      toast.error('Failed to copy text');
    }
  };

  if (!transcript) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 h-[400px] relative">
        <p className="text-gray-400 italic">
          Your transcribed text will appear here...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 h-[400px] relative">
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <Globe className="w-4 h-4 text-gray-400" />
        <select
          value={selectedLanguage}
          onChange={handleLanguageChange}
          disabled={isTranslating}
          className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="">Original (English)</option>
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="prose max-w-none h-full overflow-y-auto pt-12">
        {isTranslating ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : speakers && speakers.length > 0 && !translatedText ? (
          <div className="space-y-4">
            {speakers.map((utterance, index) => (
              <div key={index} className="flex space-x-3">
                <div className="flex-shrink-0">
                  <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm font-medium">
                    Speaker {utterance.speaker}
                  </span>
                </div>
                <p className="flex-1">{utterance.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{translatedText || transcript}</p>
        )}
      </div>
      
      <div className="absolute bottom-4 right-4">
        <button
          onClick={copyToClipboard}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Copy className="w-4 h-4 mr-1" />
          Copy Text
        </button>
      </div>
    </div>
  );
}