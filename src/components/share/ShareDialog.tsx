import React, { useState } from 'react';
import { X, Copy, Mail, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: string;
  summary: string;
}

export default function ShareDialog({ isOpen, onClose, transcript, summary }: ShareDialogProps) {
  const [includeTranscript, setIncludeTranscript] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);

  if (!isOpen) return null;

  const getShareContent = () => {
    let content = '';
    
    if (includeTranscript) {
      content += '## Transcript\n\n' + transcript + '\n\n';
    }
    
    if (includeSummary) {
      content += '## AI Summary\n\n' + summary.replace(/<[^>]*>/g, '') + '\n\n';
    }

    return content.trim();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getShareContent());
      toast.success('Content copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy content');
    }
  };

  const shareViaEmail = () => {
    try {
      // Split content into chunks if too long
      const content = getShareContent();
      const maxChunkSize = 1500; // Safe size for mailto
      const chunks = [];
      
      for (let i = 0; i < content.length; i += maxChunkSize) {
        chunks.push(content.slice(i, i + maxChunkSize));
      }

      // Create email body with chunked content
      const emailBody = chunks.length > 1 
        ? `${chunks[0]}\n\n... Content truncated due to length. Please use 'Copy to Clipboard' for full content.`
        : chunks[0];

      // Create mailto link
      const mailtoLink = `mailto:?subject=${encodeURIComponent('Meeting Notes')}&body=${encodeURIComponent(emailBody)}`;
      
      // Create and click a temporary link
      const link = document.createElement('a');
      link.href = mailtoLink;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (chunks.length > 1) {
        toast.info('Content was truncated. Use "Copy to Clipboard" for full content.');
      } else {
        toast.success('Opening email client...');
      }
    } catch (error) {
      console.error('Email share error:', error);
      toast.error('Failed to open email client. Try using Copy to Clipboard instead.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-medium text-gray-900">Share Meeting Notes</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="includeTranscript"
                checked={includeTranscript}
                onChange={(e) => setIncludeTranscript(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="includeTranscript" className="text-sm text-gray-700">
                Include Transcript
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="includeSummary"
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="includeSummary" className="text-sm text-gray-700">
                Include AI Summary
              </label>
            </div>

            <div className="mt-6 space-y-4">
              <button
                onClick={copyToClipboard}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </button>

              <button
                onClick={shareViaEmail}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Mail className="w-4 h-4 mr-2" />
                Share via Email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}