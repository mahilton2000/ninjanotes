import { useState, useCallback, useRef, useEffect } from 'react';
import { uploadAudioFile, createAudioBlobFromChunks, getMediaRecorderOptions, getAudioStream, getSystemAudioStream, createAudioContext, createMediaStreamDestination } from '../utils/audioHelpers';
import { transcribeAudio } from '../services/assemblyAI';
import { Speaker } from '../types/transcription';
import toast from 'react-hot-toast';
import { isMobile } from 'react-device-detect';
import { RealtimeTranscriber } from 'assemblyai';
import { auth } from '../lib/firebase';

interface UseAudioRecorderProps {
  meetingId: string;
  onAudioUrlUpdate: (url: string) => Promise<void>;
  onTranscriptUpdate: (transcript: string, speakers?: Speaker[], translatedTexts?: Record<string, string>) => void;
}

interface TranscriptWord {
  start: number;
  end: number;
  confidence: number;
  text: string;
}

interface TranscriptMessage {
  message_type: string;
  created: string;
  audio_start: number;
  audio_end: number;
  confidence: number;
  text: string;
  words: TranscriptWord[];
  punctuated: boolean;
  text_formatted: boolean;
}

// Add type for the event handlers
type TranscriberEvents = {
  'transcript': (message: TranscriptMessage) => void;
  'error': (error: any) => void;
  'close': () => void;
  'open': () => void;
};

export function useAudioRecorder({
  meetingId,
  onAudioUrlUpdate,
  onTranscriptUpdate
}: UseAudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSystemAudio, setIsSystemAudio] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'recording' | 'processing' | 'transcribing' | 'completed' | 'error'>('recording');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [isTranscriberLoading, setIsTranscriberLoading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeTranscriberRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastMessageRef = useRef<TranscriptMessage | null>(null);
  const partialTranscriptRef = useRef<string>('');

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const processAudioData = async (audioBlob: Blob) => {
    try {
      setNotificationStatus('processing');
      setShowNotification(true);

      const uploadedUrl = await uploadAudioFile(meetingId, audioBlob);
      setAudioUrl(uploadedUrl);
      await onAudioUrlUpdate(uploadedUrl);

      setNotificationStatus('transcribing');
      const result = await transcribeAudio(audioBlob);

      if (result.text) {
        onTranscriptUpdate(result.text, result.utterances);
      }

      setNotificationStatus('completed');
      setTimeout(() => setShowNotification(false), 3000);

      return { url: uploadedUrl, transcript: result.text };
    } catch (error: any) {
      console.error('Audio processing error:', error);
      setNotificationStatus('error');
      setNotificationMessage(error.message || 'Failed to process recording');
      setTimeout(() => setShowNotification(false), 3000);
      throw error;
    }
  };

  const handleTranscriptUpdate = (message: TranscriptMessage) => {
    console.log('Received transcript:', message);
    
    if (message.message_type === "PartialTranscript") {
      // Update the partial transcript
      partialTranscriptRef.current = message.text;
      
      // Get the latest transcript value using a callback to ensure we have the most recent state
      setCurrentTranscript(prev => {
        const displayText = `${prev}${message.text}`;
        onTranscriptUpdate(displayText);
        return prev; // Don't update the current transcript yet, just display it
      });
    }
    else if (message.message_type === "FinalTranscript" && message.text && message.text.trim()) {
      // Clear the partial transcript since we're getting a final version
      partialTranscriptRef.current = '';
      
      // Update the current transcript with the finalized text
      setCurrentTranscript(prev => {
        const needsSpace = prev && !prev.match(/[.!?,]$/);
        const newTranscript = prev 
          ? (needsSpace ? `${prev} ${message.text}` : `${prev}${message.text}`)
          : message.text;
        
        onTranscriptUpdate(newTranscript);
        return newTranscript;
      });
      
      lastMessageRef.current = message;
    }
  };

  const startRecording = useCallback(async () => {
    try {
      console.log('Starting recording...');
      setIsTranscriberLoading(true);
      
      // Get audio stream(s)
      const stream = await getAudioStream();
      setMicStream(stream);
      console.log('Got mic stream:', stream);
      
      // Get AssemblyAI token
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      const idToken = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/getAssemblyAIToken`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      const { token } = await response.json();
      console.log('Got AssemblyAI token');

      // Initialize realtime transcriber
      const rt = new RealtimeTranscriber({
        token,
        sampleRate: 16000,
        wordBoost: [],
      });
      console.log('Created RealtimeTranscriber instance');

      // Use type assertion to help TypeScript understand the event types
      (rt as unknown as {
        on<K extends keyof TranscriberEvents>(
          event: K,
          listener: TranscriberEvents[K]
        ): void;
      }).on("transcript", (message: TranscriptMessage) => {
        handleTranscriptUpdate(message);
      });

      (rt as unknown as {
        on<K extends keyof TranscriberEvents>(
          event: K,
          listener: TranscriberEvents[K]
        ): void;
      }).on("error", (error: any) => {
        console.error("Realtime transcription error:", error);
        toast.error("Transcription error occurred");
      });

      await rt.connect();
      console.log('Connected to AssemblyAI realtime service');
      realtimeTranscriberRef.current = rt;
      setIsTranscriberLoading(false);

      // Create audio context with correct sample rate
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const micSource = audioContextRef.current.createMediaStreamSource(stream);

      // Create audio worklet for processing
      const bufferSize = 4096;
      const numberOfInputChannels = 1;
      const numberOfOutputChannels = 1;

      const scriptProcessor = audioContextRef.current.createScriptProcessor(
        bufferSize,
        numberOfInputChannels,
        numberOfOutputChannels
      );

      micSource.connect(scriptProcessor);
      scriptProcessor.connect(audioContextRef.current.destination);

      scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
        const inputBuffer = audioProcessingEvent.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        if (realtimeTranscriberRef.current) {
          try {
            realtimeTranscriberRef.current.sendAudio(int16Data);
          } catch (error) {
            console.error('Error sending audio:', error);
          }
        }
      };

      setIsRecording(true);
      setElapsedTime(0);
      setNotificationStatus('recording');
      setShowNotification(true);

      clearTimer();
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      // Clear all transcripts when starting a new recording
      setCurrentTranscript('');
      lastMessageRef.current = null;
      partialTranscriptRef.current = '';

    } catch (error: any) {
      setIsTranscriberLoading(false);
      console.error('Error starting recording:', error);
      setIsRecording(false);
      setShowNotification(false);
      toast.error(error.message || 'Failed to start recording');
    }
  }, [meetingId, onAudioUrlUpdate, onTranscriptUpdate, clearTimer]);

  const stopRecording = useCallback(() => {
    if (isRecording) {
      try {
        console.log('Stopping recording...');
        clearTimer();
        setIsRecording(false);
        setShowNotification(false);

        // Stop all tracks in the media stream
        if (micStream) {
          micStream.getTracks().forEach(track => {
            track.stop();
          });
          setMicStream(null);
        }

        // Stop realtime transcription
        if (realtimeTranscriberRef.current) {
          console.log('Closing realtime transcriber...');
          realtimeTranscriberRef.current.close();
          realtimeTranscriberRef.current = null;
        }

        // Clean up audio context
        if (audioContextRef.current) {
          console.log('Closing audio context...');
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        // Clear all transcript references
        lastMessageRef.current = null;
        partialTranscriptRef.current = '';

      } catch (error) {
        console.error('Error stopping recording:', error);
        toast.error('Failed to stop recording properly');
      }
    }
  }, [isRecording, clearTimer, micStream]);

  const downloadRecording = useCallback(() => {
    if (audioUrl) {
      try {
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `recording_${Date.now()}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Download error:', error);
      }
    }
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      clearTimer();
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [clearTimer, isRecording]);

  return {
    isRecording,
    audioUrl,
    duration: elapsedTime,
    formatDuration,
    startRecording,
    stopRecording,
    downloadRecording,
    isSystemAudio,
    setIsSystemAudio,
    notificationStatus,
    showNotification,
    notificationMessage,
    isTranscriberLoading
  };
}