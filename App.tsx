import React, { useState, useEffect, useMemo } from 'react';
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
  Users, 
  BrainCircuit, 
  Calendar as CalendarIcon,
  Filter,
  Factory,
  Package
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from './components/Modal';
import { Button } from './components/Button';
import { AIAssistant } from './components/AIAssistant';
import { TEAM_MEMBERS, INITIAL_EVENTS } from './constants';
import { CalendarEvent, TeamMember, EventType } from './types';
import { generateWeeklySummary } from './services/geminiService';

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [isAIAddOpen, setIsAIAddOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string | null>(null);
  
  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventMember, setNewEventMember] = useState(TEAM_MEMBERS[0].id);
  const [newEventType, setNewEventType] = useState<EventType>('manufacturing');
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventEnd, setNewEventEnd] = useState('');

  // Weekly Summary
  const [summary, setSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const daysInMonth = useMemo(() => {
    // Explicitly set weekStartsOn: 0 for Sunday start
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
    // Pre-fill form
    setNewEventStart(format(date, "yyyy-MM-dd'T'09:00"));
    setNewEventEnd(format(date, "yyyy-MM-dd'T'17:00"));
    setNewEventType('manufacturing'); // Default
    setIsEventModalOpen(true);
  };

  const addEvent = (event: CalendarEvent) => {
    setEvents([...events, event]);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventStart || !newEventEnd) return;

    const newEvent: CalendarEvent = {
      id: uuidv4(),
      title: newEventTitle,
      start: new Date(newEventStart),
      end: new Date(newEventEnd),
      memberId: newEventMember,
      type: newEventType
    };

    addEvent(newEvent);
    setIsEventModalOpen(false);
    setNewEventTitle('');
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    // Get events for the currently viewed month
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    const visibleEvents = events.filter(e => 
      isWithinInterval(e.start, { start: monthStart, end: monthEnd }) ||
      isWithinInterval(e.end, { start: monthStart, end: monthEnd })
    );

    const result = await generateWeeklySummary(visibleEvents);
    setSummary(result);
    setIsGeneratingSummary(false);
  };

  const getMemberById = (id: string) => TEAM_MEMBERS.find(m => m.id === id);

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
            {TEAM_MEMBERS.map(member => (
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

          <Button variant="secondary" onClick={handleGenerateSummary} disabled={isGeneratingSummary}>
            <BrainCircuit className="w-4 h-4 mr-2 text-purple-600" />
            {isGeneratingSummary ? 'Analyzing...' : 'Summary'}
          </Button>

          <Button onClick={() => setIsAIAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Smart Add</span>
          </Button>
        </div>
      </header>
      
      {/* Summary Banner */}
      {summary && (
        <div className="bg-purple-50 px-6 py-3 border-b border-purple-100 flex justify-between items-start animate-fade-in">
           <div className="flex gap-3">
             <BrainCircuit className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
             <div>
                <h3 className="text-sm font-bold text-purple-900">Monthly Insight</h3>
                <p className="text-sm text-purple-800 mt-1 leading-relaxed">{summary}</p>
             </div>
           </div>
           <button onClick={() => setSummary(null)} className="text-purple-400 hover:text-purple-600">
              <span className="sr-only">Dismiss</span>
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L10 8.586 5.707 4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
           </button>
        </div>
      )}

      {/* Main Calendar Grid */}
      <div className="flex flex-auto overflow-hidden">
        <div className="flex flex-auto flex-col">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold leading-6 text-slate-500 lg:flex-none">
            <div className="bg-white py-2 text-rose-500">Sun</div>
            <div className="bg-white py-2">Mon</div>
            <div className="bg-white py-2">Tue</div>
            <div className="bg-white py-2">Wed</div>
            <div className="bg-white py-2">Thu</div>
            <div className="bg-white py-2">Fri</div>
            <div className="bg-white py-2 text-rose-500">Sat</div>
          </div>

          {/* Days Grid */}
          <div className="flex bg-slate-200 text-xs leading-6 text-slate-700 lg:flex-auto">
            <div className="hidden w-full lg:grid lg:grid-cols-7 lg:grid-rows-5 lg:gap-px">
              {daysInMonth.map((day) => {
                const dayEvents = filteredEvents.filter(event => 
                  isSameDay(event.start, day) || 
                  (isWithinInterval(day, { start: event.start, end: event.end }))
                );
                
                // Helper to detect if this is the start of a multi-day event to render the pill correctly
                const getEventStyle = (event: CalendarEvent) => {
                    const member = getMemberById(event.memberId);
                    
                    let classes = `group flex flex-col px-2 py-1 text-xs leading-5 hover:opacity-90 transition-opacity cursor-pointer mb-1 rounded mx-1 `;
                    
                    if (member) {
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
                        className={`
                            flex h-6 w-6 items-center justify-center rounded-full 
                            ${isToday(day) ? 'bg-primary-600 text-white font-bold' : isSameMonth(day, currentDate) ? 'font-medium' : ''}
                        `}
                    >
                      {format(day, 'd')}
                    </time>
                    <div className="mt-2 space-y-1 overflow-y-auto max-h-[100px] no-scrollbar">
                      {dayEvents.map(event => {
                         const member = getMemberById(event.memberId);
                         return (
                            <div key={event.id} className={getEventStyle(event)}>
                                <div className="flex items-center gap-1">
                                    {member && <img src={member.avatar} className="w-4 h-4 rounded-full border border-white/50 flex-shrink-0" />}
                                    <div className="overflow-hidden">
                                      <div className="flex items-center">
                                        {getTypeBadge(event.type)}
                                        <span className="font-semibold truncate">{event.title}</span>
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
            
            {/* Mobile View (simplified stack) */}
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
                                     return (
                                         <div key={event.id} className={`p-3 rounded-lg border-l-4 ${member?.color} bg-white shadow-sm border border-slate-100`}>
                                             <div className="flex justify-between items-start">
                                                 <div className="flex items-center gap-2">
                                                    {getTypeBadge(event.type)}
                                                    <span className="font-medium text-slate-900">{event.title}</span>
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
      </div>

      {/* Manual Add Event Modal */}
      <Modal 
        isOpen={isEventModalOpen} 
        onClose={() => setIsEventModalOpen(false)}
        title="Add New Event"
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
                    {TEAM_MEMBERS.map(member => (
                        <div 
                            key={member.id}
                            onClick={() => setNewEventMember(member.id)}
                            className={`
                                cursor-pointer flex items-center gap-2 p-2 rounded-md border transition-all
                                ${newEventMember === member.id ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-slate-200 hover:bg-slate-50'}
                            `}
                        >
                            <img src={member.avatar} className="w-6 h-6 rounded-full" />
                            <span className="text-sm font-medium text-slate-700">{member.name}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-end pt-4 gap-2">
                <Button variant="secondary" onClick={() => setIsEventModalOpen(false)} type="button">Cancel</Button>
                <Button type="submit">Save Event</Button>
            </div>
        </form>
      </Modal>

      {/* AI Sidebar */}
      <AIAssistant 
        isOpen={isAIAddOpen} 
        onClose={() => setIsAIAddOpen(false)} 
        onAddEvent={addEvent}
      />
    </div>
  );
};

export default App;