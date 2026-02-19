export interface TeamMember {
  id: string;
  name: string;
  role: string;
  color: string;
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
  startDate: string;
  endDate: string;
  assigneeName: string;
  type: string;
}

export enum CalendarView {
  MONTH = 'MONTH',
  WEEK = 'WEEK'
}