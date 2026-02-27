import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Factory,
  Package,
  ChevronRight,
  XCircle,
  Search,
} from 'lucide-react';
import { CalendarEvent, TeamMember } from '../types';
import { CompletionRecord } from '../CalendarApp';

type StatusTab = 'all' | 'todo' | 'done' | 'issue';
type TypeFilter = 'all' | 'manufacturing' | 'packaging';

interface StatusSidebarProps {
  events: CalendarEvent[];
  completedEventIds: Set<string>;
  completionRecords: CompletionRecord[];
  teamMembers: TeamMember[];
  onNavigateToReport: (event: CalendarEvent) => void;
  onViewReport: (event: CalendarEvent) => void;
}

const StatusSidebar: React.FC<StatusSidebarProps> = ({
  events,
  completedEventIds,
  completionRecords,
  teamMembers,
  onNavigateToReport,
  onViewReport,
}) => {
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const getMember = (id: string) => teamMembers.find(m => m.id === id);
  const getRecord = (eventId: string) => completionRecords.find(r => r.eventId === eventId);

  // All reportable events sorted by date
  const reportableEvents = useMemo(() => {
    return events
      .filter(e => e.type === 'manufacturing' || e.type === 'packaging')
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events]);

  // Apply search filter
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return reportableEvents;
    const q = searchQuery.toLowerCase();
    return reportableEvents.filter(e => {
      const member = getMember(e.memberId);
      return (
        e.title.toLowerCase().includes(q) ||
        (member?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [reportableEvents, searchQuery, teamMembers]);

  // Apply type filter
  const typeFiltered = useMemo(() => {
    if (typeFilter === 'all') return searchFiltered;
    return searchFiltered.filter(e => e.type === typeFilter);
  }, [searchFiltered, typeFilter]);

  // Categorize events
  const todoEvents = useMemo(
    () => typeFiltered.filter(e => !completedEventIds.has(e.id)),
    [typeFiltered, completedEventIds]
  );

  const doneEvents = useMemo(
    () => typeFiltered.filter(e => {
      if (!completedEventIds.has(e.id)) return false;
      const record = getRecord(e.id);
      return !record || record.decision !== '부적합';
    }),
    [typeFiltered, completedEventIds, completionRecords]
  );

  const issueEvents = useMemo(
    () => typeFiltered.filter(e => {
      if (!completedEventIds.has(e.id)) return false;
      const record = getRecord(e.id);
      return record?.decision === '부적합' || (record && record.issues?.trim());
    }),
    [typeFiltered, completedEventIds, completionRecords]
  );

  const allDoneEvents = useMemo(
    () => typeFiltered.filter(e => completedEventIds.has(e.id)),
    [typeFiltered, completedEventIds]
  );

  // Tab definitions with counts
  const tabs: { key: StatusTab; label: string; count: number }[] = [
    { key: 'all', label: '전체', count: typeFiltered.length },
    { key: 'todo', label: '미완료', count: todoEvents.length },
    { key: 'done', label: '완료', count: doneEvents.length },
    { key: 'issue', label: '이슈', count: issueEvents.length },
  ];

  // Determine which events to render based on active tab
  const getVisibleSections = () => {
    switch (activeTab) {
      case 'todo':
        return { todo: todoEvents, done: [] };
      case 'done':
        return { todo: [], done: doneEvents };
      case 'issue':
        return { todo: [], done: issueEvents };
      case 'all':
      default:
        return { todo: todoEvents, done: allDoneEvents };
    }
  };

  const { todo: visibleTodo, done: visibleDone } = getVisibleSections();

  const TypeBadge = ({ type }: { type: string }) =>
    type === 'manufacturing' ? (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200">
        <Factory className="w-3 h-3" /> 제조
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200">
        <Package className="w-3 h-3" /> 충진
      </span>
    );

  const QualityBadge = ({ record }: { record?: CompletionRecord }) => {
    if (!record) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
          <CheckCircle2 className="w-3 h-3" /> 완료
        </span>
      );
    }
    if (record.decision === '부적합') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600">
          <XCircle className="w-3 h-3" /> 부적합
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
        <CheckCircle2 className="w-3 h-3" /> 적합
      </span>
    );
  };

  const TodoCard = ({ event }: { event: CalendarEvent }) => {
    const member = getMember(event.memberId);
    return (
      <button
        onClick={() => onNavigateToReport(event)}
        className="w-full group flex flex-row items-center justify-between gap-2 py-2 px-3 rounded-md border border-amber-200 bg-amber-50/30 hover:bg-amber-50 hover:border-amber-300 transition-all"
      >
        <div className="flex items-center gap-2 min-w-0">
          <TypeBadge type={event.type} />
          <span className="text-sm font-semibold text-slate-900 truncate">{event.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {member && (
            <div className="flex items-center gap-1">
              <img src={member.avatar} alt="" className="w-4 h-4 rounded-full" />
              <span className="text-[11px] text-slate-500">{member.name}</span>
            </div>
          )}
          <span className="text-[10px] text-slate-400">{format(new Date(event.start), 'M/d')}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary-600 transition-colors" />
        </div>
      </button>
    );
  };

  const DoneCard = ({ event }: { event: CalendarEvent }) => {
    const member = getMember(event.memberId);
    const record = getRecord(event.id);
    const isFail = record?.decision === '부적합';

    return (
      <button
        onClick={() => onViewReport(event)}
        className={`w-full group flex flex-row items-center justify-between gap-2 py-2 px-3 rounded-md border transition-all cursor-pointer ${
          isFail
            ? 'border-rose-200 bg-rose-50/30 hover:bg-rose-50 hover:border-rose-300'
            : 'border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <TypeBadge type={event.type} />
          <span className="text-sm font-semibold text-slate-700 truncate">{event.title}</span>
          <QualityBadge record={record} />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {member && (
            <div className="flex items-center gap-1">
              <img src={member.avatar} alt="" className="w-4 h-4 rounded-full" />
              <span className="text-[11px] text-slate-500">{member.name}</span>
            </div>
          )}
          <span className="text-[10px] text-slate-400">{format(new Date(event.start), 'M/d')}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary-600 transition-colors" />
        </div>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      {/* Sidebar Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary-600" />
          <h2 className="font-bold text-sm text-slate-900">작업 현황</h2>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          미완료 <span className="font-bold text-amber-600">{todoEvents.length}</span>건 · 완료 <span className="font-bold text-emerald-600">{allDoneEvents.length}</span>건
        </p>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2 border-b border-slate-200 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="제품명, 담당자 검색..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex border-b border-slate-200 flex-shrink-0">
        {tabs.map(tab => {
          const isIssue = tab.key === 'issue';
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-[11px] font-semibold transition-all border-b-2 ${
                isActive
                  ? isIssue
                    ? 'text-rose-600 border-rose-500 bg-rose-50/50'
                    : 'text-primary-600 border-primary-600 bg-primary-50/50'
                  : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              <span className={`ml-1 text-[10px] px-1 py-0.5 rounded-full ${
                isActive
                  ? isIssue
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-primary-100 text-primary-600'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Type Filter Chips */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-200 flex-shrink-0">
        {([
          { key: 'all' as TypeFilter, label: '전체', icon: null },
          { key: 'manufacturing' as TypeFilter, label: '제조', icon: <Factory className="w-3 h-3" /> },
          { key: 'packaging' as TypeFilter, label: '충진', icon: <Package className="w-3 h-3" /> },
        ]).map(chip => (
          <button
            key={chip.key}
            onClick={() => setTypeFilter(chip.key)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
              typeFilter === chip.key
                ? chip.key === 'manufacturing'
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : chip.key === 'packaging'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-slate-700 text-white border border-slate-700'
                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            {chip.icon}
            {chip.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* To-Do Section */}
        {visibleTodo.length > 0 && (
          <div className="p-3">
            {activeTab === 'all' && (
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">미완료</span>
                <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                  {visibleTodo.length}
                </span>
              </div>
            )}
            <div className="space-y-1">
              {visibleTodo.map(event => (
                <TodoCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}

        {/* Divider between sections in 'all' tab */}
        {activeTab === 'all' && visibleTodo.length > 0 && visibleDone.length > 0 && (
          <div className="mx-3 border-t border-slate-200" />
        )}

        {/* Done / Issue Section */}
        {visibleDone.length > 0 && (
          <div className="p-3">
            {activeTab === 'all' && (
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">완료</span>
                <span className="ml-auto text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                  {visibleDone.length}
                </span>
              </div>
            )}
            <div className="space-y-1">
              {visibleDone.map(event => (
                <DoneCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}

        {/* Empty States */}
        {visibleTodo.length === 0 && visibleDone.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            {searchQuery ? (
              <>
                <Search className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs text-slate-400 text-center">
                  "<span className="font-medium text-slate-500">{searchQuery}</span>"에 대한 검색 결과가 없습니다
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {activeTab === 'todo' && '모든 보고서가 완료되었습니다'}
                {activeTab === 'done' && '완료된 보고서가 없습니다'}
                {activeTab === 'issue' && '이슈가 없습니다'}
                {activeTab === 'all' && '등록된 작업이 없습니다'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusSidebar;
