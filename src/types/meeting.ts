import { Timestamp } from 'firebase/firestore';

export type MeetingType = 
  | 'general'
  | 'sales'
  | 'product'
  | 'client'
  | 'kickoff'
  | 'standup'
  | 'brainstorm'
  | 'financial'
  | 'performance'
  | 'strategic'
  | '360-summary'
  | 'quiz-generator';

export type ContentSource = 'record' | 'upload';

export interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: Array<{
    email: string;
    role: string;
  }>;
  content: string;
  userId: string;
  createDate: Timestamp;
  updatedAt: Timestamp;
  source?: ContentSource;
  personalNotes?: string;
  
  // Record Meeting content
  recordTranscription?: string;
  recordAudioUrl?: string;
  recordSummary?: string;
  recordMeetingType?: MeetingType;
  
  // MP3 Upload content
  uploadTranscription?: string;
  uploadAudioUrl?: string;
  uploadSummary?: string;
  uploadMeetingType?: MeetingType;
}

export const meetingTypes: Record<MeetingType, string> = {
  general: 'General Meeting',
  sales: 'Sales Meeting',
  product: 'Product Meeting',
  client: 'Client Meeting',
  kickoff: 'Project Kickoff',
  standup: 'Daily Standup',
  brainstorm: 'Brainstorming Session',
  financial: 'Financial Review',
  performance: 'Performance Review',
  strategic: 'Strategic Planning',
  '360-summary': '360° Content Summary',
  'quiz-generator': 'Interactive Quiz Generator'
};