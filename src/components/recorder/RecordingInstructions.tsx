import React from 'react';
import { X } from 'lucide-react';

interface RecordingInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  onDontShowAgain: (value: boolean) => void;
}

export default function RecordingInstructions({ 
  isOpen, 
  onClose, 
  onStart,
  onDontShowAgain 
}: RecordingInstructionsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
        <div className="flex justify-between items-start p-6 border-b">
          <h3 className="text-xl font-medium text-gray-900">Recording Instructions</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-center mb-6">
            <img 
              src="https://res.cloudinary.com/dinqjfyij/image/upload/v1733440346/2024-12-05_17h12_19_pjtkqr.png"
              alt="Recording Instructions"
              className="w-full object-contain rounded-lg shadow-md"
              style={{ maxHeight: '60vh' }}
            />
          </div>

          <div className="flex items-center mb-6">
            <input
              type="checkbox"
              id="dontShowAgain"
              onChange={(e) => onDontShowAgain(e.target.checked)}
              className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="dontShowAgain" className="ml-3 text-base text-gray-600">
              Don't show this again
            </label>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onStart}
              className="px-6 py-2.5 bg-indigo-600 text-white text-lg rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}