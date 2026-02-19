export interface TeamMember {
  id: string;
  name: string;
  role: string;
  color: string; // Tailwind class for background, e.g., 'bg-red-100 text-red-700'
  avatar: string;
}

export type EventType = 'manufacturing' | 'packaging' | 'meeting' | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  memberId: string;
  type: EventType;
}

export interface AIParsedEvent {
  title: string;
  description: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  assigneeName: string; // To match against TeamMember
  type: string;
}

export enum CalendarView {
  MONTH = 'MONTH',
  WEEK = 'WEEK'
}