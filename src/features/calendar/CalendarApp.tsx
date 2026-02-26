import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isWithinInterval
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Factory,
  Package,
  Settings,
  FileText,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { TeamManagerModal } from './components/TeamManagerModal';
import StatusSidebar from './components/StatusSidebar';
import { TEAM_MEMBERS, INITIAL_EVENTS } from './constants';
import { CalendarEvent, EventType, TeamMember } from './types';

const STORAGE_KEY_TEAM = 'teamsync-team-members';
const STORAGE_KEY_EVENTS = 'teamsync-calendar-events';
const STORAGE_KEY_COMPLETED = 'teamsync-completed-reports';

const loadTeamMembers = (): TeamMember[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TEAM);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore corrupt data */ }
  return TEAM_MEMBERS;
};

const loadEvents = (): CalendarEvent[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((e: any) => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end),
        }));
      }
    }
  } catch { /* ignore */ }
  return INITIAL_EVENTS;
};

export interface CompletionRecord {
  eventId: string;
  decision: string;
  issues: string;
}

const loadCompletionRecords = (): CompletionRecord[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COMPLETED);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migrate: old format was string[], new format is CompletionRecord[]
        if (typeof parsed[0] === 'string') {
          return parsed.map((id: string) => ({ eventId: id, decision: '적합', issues: '' }));
        }
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return [];
};

const CalendarApp: React.FC = () => {
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(loadTeamMembers);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(teamMembers));
  }, [teamMembers]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(loadEvents);
  const [completionRecords, setCompletionRecords] = useState<CompletionRecord[]>(loadCompletionRecords);

  const completedEventIds = useMemo(
    () => new Set(completionRecords.map(r => r.eventId)),
    [completionRecords]
  );
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string | null>(null);

  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventMember, setNewEventMember] = useState(teamMembers[0]?.id ?? '');
  const [newEventType, setNewEventType] = useState<EventType>('manufacturing');
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventEnd, setNewEventEnd] = useState('');

  // Persist events to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
  }, [events]);

  // Reload completion records on focus (when returning from report page)
  useEffect(() => {
    const handleFocus = () => {
      setCompletionRecords(loadCompletionRecords());
    };
    window.addEventListener('focus', handleFocus);
    setCompletionRecords(loadCompletionRecords());
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const filteredEvents = useMemo(() => {
    if (!selectedMemberFilter) return events;
    return events.filter(e => e.memberId === selectedMemberFilter);
  }, [events, selectedMemberFilter]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setNewEventTitle('');
    setNewEventStart(format(date, "yyyy-MM-dd'T'09:00"));
    setNewEventEnd(format(date, "yyyy-MM-dd'T'17:00"));
    setNewEventType('manufacturing');
    setNewEventMember(teamMembers[0]?.id ?? '');
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setNewEventTitle(event.title);
    setNewEventStart(format(event.start, "yyyy-MM-dd'T'HH:mm"));
    setNewEventEnd(format(event.end, "yyyy-MM-dd'T'HH:mm"));
    setNewEventType(event.type);
    setNewEventMember(event.memberId);
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = () => {
    if (!editingEvent) return;
    setEvents(prev => prev.filter(ev => ev.id !== editingEvent.id));
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  const navigateToReport = (event: CalendarEvent) => {
    navigate('/report', {
      state: {
        eventId: event.id,
        date: format(event.start, 'yyyy-MM-dd'),
        title: event.title,
        type: event.type,
        mode: 'write',
      },
    });
  };

  const viewReport = (event: CalendarEvent) => {
    navigate('/report', {
      state: {
        eventId: event.id,
        date: format(event.start, 'yyyy-MM-dd'),
        title: event.title,
        type: event.type,
        mode: 'view',
      },
    });
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    handleEditEvent(event, e);
  };

  const addEvent = (event: CalendarEvent) => {
    setEvents(prev => [...prev, event]);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventStart || !newEventEnd) return;

    if (editingEvent) {
      setEvents(prev => prev.map(ev =>
        ev.id === editingEvent.id
          ? { ...ev, title: newEventTitle, start: new Date(newEventStart), end: new Date(newEventEnd), memberId: newEventMember, type: newEventType }
          : ev
      ));
    } else {
      addEvent({
        id: uuidv4(),
        title: newEventTitle,
        start: new Date(newEventStart),
        end: new Date(newEventEnd),
        memberId: newEventMember,
        type: newEventType
      });
    }

    setIsEventModalOpen(false);
    setEditingEvent(null);
    setNewEventTitle('');
  };

  const getMemberById = (id: string) => teamMembers.find(m => m.id === id);

  const getTypeBadge = (type: EventType) => {
    if (type === 'manufacturing') {
      return <span className="inline-flex items-center px-1 rounded bg-amber-500/10 text-amber-700 text-[10px] font-bold mr-1 border border-amber-200">제조</span>;
    }
    if (type === 'packaging') {
      return <span className="inline-flex items-center px-1 rounded bg-blue-500/10 text-blue-700 text-[10px] font-bold mr-1 border border-blue-200">충진</span>;
    }
    return null;
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <header className="flex flex-none items-center justify-between border-b border-slate-200 px-6 py-4 bg-white z-10">
        <div className="flex items-center gap-4">
          <div className="bg-primary-50 p-2 rounded-lg">
             <CalendarIcon className="w-6 h-6 text-primary-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 hidden sm:block">TeamSync Calendar</h1>
          <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
          <div className="flex items-center rounded-md bg-white shadow-sm border border-slate-200">
            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-50 text-slate-500 rounded-l-md border-r border-slate-100">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="px-4 py-1.5 font-semibold text-slate-900 min-w-[140px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-50 text-slate-500 rounded-r-md border-l border-slate-100">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 mr-4 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setSelectedMemberFilter(null)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${!selectedMemberFilter ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              All
            </button>
            {teamMembers.map(member => (
              <button
                key={member.id}
                onClick={() => setSelectedMemberFilter(member.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${selectedMemberFilter === member.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <img src={member.avatar} alt="" className="w-4 h-4 rounded-full" />
                <span className="hidden lg:inline">{member.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsTeamModalOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Manage Team"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main: Calendar (70%) + Status Sidebar (30%) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex flex-col w-full lg:w-[70%] overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold leading-6 text-slate-500">
            <div className="bg-white py-2 text-rose-500">Sun</div>
            <div className="bg-white py-2">Mon</div>
            <div className="bg-white py-2">Tue</div>
            <div className="bg-white py-2">Wed</div>
            <div className="bg-white py-2">Thu</div>
            <div className="bg-white py-2">Fri</div>
            <div className="bg-white py-2 text-rose-500">Sat</div>
          </div>

          <div className="flex bg-slate-200 text-xs leading-6 text-slate-700 flex-auto">
            <div className="hidden w-full lg:grid lg:grid-cols-7 lg:grid-rows-5 lg:gap-px">
              {daysInMonth.map((day) => {
                const dayEvents = filteredEvents.filter(event =>
                  isSameDay(event.start, day) ||
                  (isWithinInterval(day, { start: event.start, end: event.end }))
                );

                const getEventStyle = (event: CalendarEvent) => {
                    const member = getMemberById(event.memberId);
                    const isCompleted = completedEventIds.has(event.id);
                    let classes = `group flex flex-col px-2 py-1 text-xs leading-5 hover:opacity-90 transition-opacity cursor-pointer mb-1 rounded mx-1 `;
                    if (isCompleted) {
                        classes += 'bg-emerald-50 text-emerald-700 border border-emerald-200 ';
                    } else if (member) {
                        classes += member.color;
                    } else {
                        classes += ' bg-gray-100 text-gray-700';
                    }
                    return classes;
                };

                return (
                  <div
                    key={day.toString()}
                    onClick={() => handleDateClick(day)}
                    className={`relative min-h-[120px] bg-white px-2 py-2 hover:bg-slate-50 transition-colors ${
                      !isSameMonth(day, currentDate) ? 'bg-slate-50 text-slate-400' : ''
                    }`}
                  >
                    <time
                        dateTime={format(day, 'yyyy-MM-dd')}
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${isToday(day) ? 'bg-primary-600 text-white font-bold' : isSameMonth(day, currentDate) ? 'font-medium' : ''}`}
                    >
                      {format(day, 'd')}
                    </time>
                    <div className="mt-2 space-y-1 overflow-y-auto max-h-[100px] no-scrollbar">
                      {dayEvents.map(event => {
                         const member = getMemberById(event.memberId);
                         const isCompleted = completedEventIds.has(event.id);
                         return (
                            <div key={event.id} className={getEventStyle(event)} onClick={(e) => handleEventClick(event, e)}>
                                <div className="flex items-center gap-1">
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                    ) : (
                                      member && <img src={member.avatar} className="w-4 h-4 rounded-full border border-white/50 flex-shrink-0" />
                                    )}
                                    <div className="overflow-hidden">
                                      <div className="flex items-center">
                                        {getTypeBadge(event.type)}
                                        <span className={`font-semibold truncate ${isCompleted ? 'line-through opacity-70' : ''}`}>{event.title}</span>
                                        {!isCompleted && (event.type === 'manufacturing' || event.type === 'packaging') && (
                                          <FileText size={10} className="ml-1 opacity-40 flex-shrink-0" />
                                        )}
                                      </div>
                                    </div>
                                </div>
                                <span className="opacity-80 truncate text-[10px] pl-5">{format(event.start, 'h:mm a')}</span>
                            </div>
                         );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile View */}
            <div className="lg:hidden w-full bg-white overflow-y-auto">
                 {daysInMonth.map((day) => {
                     const dayEvents = filteredEvents.filter(event => isWithinInterval(day, { start: event.start, end: event.end }));
                     if (!isSameMonth(day, currentDate)) return null;

                     return (
                         <div key={day.toString()} className="border-b border-slate-100 p-4">
                             <div className="flex items-center mb-3">
                                 <div className={`text-lg font-bold w-10 ${isToday(day) ? 'text-primary-600' : 'text-slate-900'}`}>{format(day, 'd')}</div>
                                 <div className="text-sm text-slate-500 uppercase">{format(day, 'EEE')}</div>
                                 <button onClick={() => handleDateClick(day)} className="ml-auto text-primary-600 hover:bg-primary-50 p-1 rounded">
                                     <Plus size={16} />
                                 </button>
                             </div>
                             <div className="space-y-2 pl-10">
                                 {dayEvents.length === 0 && <span className="text-slate-400 text-sm italic">No events</span>}
                                 {dayEvents.map(event => {
                                     const member = getMemberById(event.memberId);
                                     const isCompleted = completedEventIds.has(event.id);
                                     return (
                                         <div key={event.id} className={`p-3 rounded-lg border-l-4 ${isCompleted ? 'border-emerald-400 bg-emerald-50' : member?.color + ' bg-white'} shadow-sm border border-slate-100 cursor-pointer`} onClick={(e) => handleEventClick(event, e)}>
                                             <div className="flex justify-between items-start">
                                                 <div className="flex items-center gap-2">
                                                    {getTypeBadge(event.type)}
                                                    <span className={`font-medium text-slate-900 ${isCompleted ? 'line-through opacity-70' : ''}`}>{event.title}</span>
                                                    {isCompleted && <CheckCircle2 size={14} className="text-emerald-500" />}
                                                 </div>
                                                 <span className="text-xs text-slate-500">{format(event.start, 'h:mm a')}</span>
                                             </div>
                                             <div className="flex items-center gap-2 mt-2">
                                                 {member && <img src={member.avatar} className="w-5 h-5 rounded-full" />}
                                                 <span className="text-xs text-slate-600">{member?.name}</span>
                                             </div>
                                         </div>
                                     );
                                 })}
                             </div>
                         </div>
                     );
                 })}
            </div>
          </div>
        </div>

        {/* Status Sidebar (30%) - hidden on mobile */}
        <div className="hidden lg:block w-[30%] flex-shrink-0">
          <StatusSidebar
            events={events}
            completedEventIds={completedEventIds}
            completionRecords={completionRecords}
            teamMembers={teamMembers}
            onNavigateToReport={navigateToReport}
            onViewReport={viewReport}
          />
        </div>
      </div>

      {/* Add / Edit Event Modal */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => { setIsEventModalOpen(false); setEditingEvent(null); }}
        title={editingEvent ? '일정 수정' : '새 일정 추가'}
      >
        <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700">Event Title</label>
                <input
                    type="text"
                    required
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                    placeholder="e.g. Batch #404"
                />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Event Type</label>
              <div className="grid grid-cols-2 gap-3">
                 <div
                    onClick={() => setNewEventType('manufacturing')}
                    className={`cursor-pointer border rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${newEventType === 'manufacturing' ? 'bg-amber-50 border-amber-500 text-amber-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                 >
                    <Factory className="w-5 h-5" />
                    <span className="font-medium">제조 (Mfg)</span>
                 </div>
                 <div
                    onClick={() => setNewEventType('packaging')}
                    className={`cursor-pointer border rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${newEventType === 'packaging' ? 'bg-blue-50 border-blue-500 text-blue-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                 >
                    <Package className="w-5 h-5" />
                    <span className="font-medium">충진포장 (Pkg)</span>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Start</label>
                    <input
                        type="datetime-local"
                        required
                        value={newEventStart}
                        onChange={(e) => setNewEventStart(e.target.value)}
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">End</label>
                    <input
                        type="datetime-local"
                        required
                        value={newEventEnd}
                        onChange={(e) => setNewEventEnd(e.target.value)}
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Assign To</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                    {teamMembers.map(member => (
                        <div
                            key={member.id}
                            onClick={() => setNewEventMember(member.id)}
                            className={`cursor-pointer flex items-center gap-2 p-2 rounded-md border transition-all ${newEventMember === member.id ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-slate-200 hover:bg-slate-50'}`}
                        >
                            <img src={member.avatar} className="w-6 h-6 rounded-full" />
                            <span className="text-sm font-medium text-slate-700">{member.name}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex items-center pt-4 gap-2">
                {editingEvent && (
                  <>
                    <button
                      type="button"
                      onClick={handleDeleteEvent}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      삭제
                    </button>
                    {(editingEvent.type === 'manufacturing' || editingEvent.type === 'packaging') && (
                      <button
                        type="button"
                        onClick={() => { setIsEventModalOpen(false); setEditingEvent(null); navigateToReport(editingEvent); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 border border-primary-200 rounded-md transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        보고서
                      </button>
                    )}
                  </>
                )}
                <div className="flex-1" />
                <Button variant="secondary" onClick={() => { setIsEventModalOpen(false); setEditingEvent(null); }} type="button">취소</Button>
                <Button type="submit">{editingEvent ? '수정' : '저장'}</Button>
            </div>
        </form>
      </Modal>

      <TeamManagerModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        teamMembers={teamMembers}
        onUpdateMembers={setTeamMembers}
      />
    </div>
  );
};

export default CalendarApp;
