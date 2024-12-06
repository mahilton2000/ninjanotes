import React from 'react';
import { useRecordingStore } from '../../store/recordingStore';
import Header from '../Header';

interface HeaderSlideLayoutProps {
  children: React.ReactNode;
}

export default function HeaderSlideLayout({ children }: HeaderSlideLayoutProps) {
  const { isRecording } = useRecordingStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed height spacer to prevent content jump */}
      <div className="h-16" />
      
      {/* Header with slide animation */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
          isRecording ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <Header />
      </div>

      {/* Main content */}
      <main className="relative">
        {children}
      </main>
    </div>
  );
}