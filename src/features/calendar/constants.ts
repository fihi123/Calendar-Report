import { TeamMember } from './types';

export const MEMBER_COLOR_OPTIONS = [
  { label: 'Rose',    value: 'bg-rose-100 text-rose-700 border-rose-200',       swatch: 'bg-rose-400' },
  { label: 'Blue',    value: 'bg-blue-100 text-blue-700 border-blue-200',       swatch: 'bg-blue-400' },
  { label: 'Emerald', value: 'bg-emerald-100 text-emerald-700 border-emerald-200', swatch: 'bg-emerald-400' },
  { label: 'Amber',   value: 'bg-amber-100 text-amber-700 border-amber-200',   swatch: 'bg-amber-400' },
  { label: 'Purple',  value: 'bg-purple-100 text-purple-700 border-purple-200', swatch: 'bg-purple-400' },
  { label: 'Cyan',    value: 'bg-cyan-100 text-cyan-700 border-cyan-200',       swatch: 'bg-cyan-400' },
  { label: 'Orange',  value: 'bg-orange-100 text-orange-700 border-orange-200', swatch: 'bg-orange-400' },
  { label: 'Indigo',  value: 'bg-indigo-100 text-indigo-700 border-indigo-200', swatch: 'bg-indigo-400' },
];

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: '신병모',
    role: '본부장',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    avatar: 'https://picsum.photos/100/100?random=1'
  },
  {
    id: '2',
    name: '백승현',
    role: '과장',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    avatar: 'https://picsum.photos/100/100?random=2'
  },
  {
    id: '3',
    name: '신동훈',
    role: '과장',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    avatar: 'https://picsum.photos/100/100?random=3'
  },
  {
    id: '4',
    name: '김한준',
    role: '마스터',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    avatar: 'https://picsum.photos/100/100?random=4'
  },
  {
    id: '5',
    name: '오현우',
    role: '마스터',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    avatar: 'https://picsum.photos/100/100?random=5'
  },
  {
    id: '6',
    name: '남상대',
    role: '마스터',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    avatar: 'https://picsum.photos/100/100?random=6'
  },
  {
    id: '7',
    name: '안은영',
    role: '사원',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    avatar: 'https://picsum.photos/100/100?random=7'
  },
  {
    id: '8',
    name: '윤성현',
    role: '사원',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    avatar: 'https://picsum.photos/100/100?random=8'
  },
];

export const INITIAL_EVENTS: {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  memberId: string;
  type: 'manufacturing' | 'packaging';
}[] = [];