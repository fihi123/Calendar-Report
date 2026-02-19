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
    name: 'Sarah Kim',
    role: 'Production Lead',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    avatar: 'https://picsum.photos/100/100?random=1'
  },
  {
    id: '2',
    name: 'Mike Chen',
    role: 'Operator',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    avatar: 'https://picsum.photos/100/100?random=2'
  },
  {
    id: '3',
    name: 'Jessica Lee',
    role: 'Quality Control',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    avatar: 'https://picsum.photos/100/100?random=3'
  },
  {
    id: '4',
    name: 'David Park',
    role: 'Packaging Mgr',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    avatar: 'https://picsum.photos/100/100?random=4'
  }
];

export const INITIAL_EVENTS = [
  {
    id: 'init-1',
    title: 'Batch A-101 Mixing',
    description: 'Initial mixing process for product A.',
    start: new Date(new Date().setHours(8, 0, 0, 0)),
    end: new Date(new Date().setHours(16, 0, 0, 0)),
    memberId: '1',
    type: 'manufacturing' as const
  },
  {
    id: 'init-2',
    title: 'Line 2 Packaging',
    description: 'Final boxing and labeling for Batch A-100.',
    start: new Date(new Date().setDate(new Date().getDate() + 1)),
    end: new Date(new Date().setDate(new Date().getDate() + 1)),
    memberId: '4',
    type: 'packaging' as const
  }
];