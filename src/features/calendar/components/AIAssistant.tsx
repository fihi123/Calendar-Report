import React, { useState } from 'react';
import { Sparkles, Send, CalendarPlus, Check, X, Package, Factory } from 'lucide-react';
import { Button } from '../../../components/Button';
import { parseEventFromText } from '../services/geminiService';
import { AIParsedEvent, CalendarEvent, TeamMember } from '../types';
import { TEAM_MEMBERS } from '../constants';
import { parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

interface AIAssistantProps {
  onAddEvent: (event: CalendarEvent) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ onAddEvent, isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResult, setParsedResult] = useState<AIParsedEvent | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsProcessing(true);
    setParsedResult(null);

    const result = await parseEventFromText(input, new Date());

    setIsProcessing(false);
    if (result) {
      setParsedResult(result);
    } else {
      alert("I couldn't understand that. Please try to be more specific with dates and names.");
    }
  };

  const handleConfirm = () => {
    if (!parsedResult) return;

    const assignee = TEAM_MEMBERS.find(m =>
      m.name.toLowerCase().includes(parsedResult.assigneeName.toLowerCase()) ||
      parsedResult.assigneeName.toLowerCase().includes(m.name.split(' ')[0].toLowerCase())
    );

    const newEvent: CalendarEvent = {
      id: uuidv4(),
      title: parsedResult.title,
      description: parsedResult.description || '',
      start: parseISO(parsedResult.startDate),
      end: parseISO(parsedResult.endDate),
      memberId: assignee ? assignee.id : TEAM_MEMBERS[0].id,
      type: (parsedResult.type as any) || 'other'
    };

    onAddEvent(newEvent);
    setInput('');
    setParsedResult(null);
    onClose();
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'manufacturing': return { label: '제조 (Manufacturing)', icon: <Factory className="w-4 h-4" /> };
      case 'packaging': return { label: '충진포장 (Packaging)', icon: <Package className="w-4 h-4" /> };
      default: return { label: type, icon: null };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40 border-l border-slate-200 flex flex-col">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-primary-50/50">
        <div className="flex items-center gap-2 text-primary-700">
          <Sparkles className="w-5 h-5" />
          <h2 className="font-semibold text-lg">AI Scheduler</h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-600">
          <p className="font-medium mb-2 text-slate-800">Try saying:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>"Sarah 제조 A-101 배치 내일 오전 8시부터 4시까지."</li>
            <li>"Mike will handle packaging for Batch B next Friday."</li>
            <li>"David 다음주 월요일 충진포장 작업 일정 잡아줘."</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Describe the schedule
          </label>
          <textarea
            className="w-full h-32 p-3 text-slate-700 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none shadow-sm"
            placeholder="e.g., Jessica is mixing the new formula tomorrow..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
          />
          <div className="mt-2 flex justify-end">
             <Button type="submit" isLoading={isProcessing} disabled={!input.trim()}>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze
             </Button>
          </div>
        </form>

        {parsedResult && (
          <div className="bg-white rounded-xl border-2 border-primary-100 shadow-sm overflow-hidden animate-fade-in">
             <div className="bg-primary-50 px-4 py-2 border-b border-primary-100 flex items-center gap-2">
                <Check className="w-4 h-4 text-primary-600" />
                <span className="text-xs font-semibold text-primary-700 uppercase tracking-wide">Suggested Event</span>
             </div>
             <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold">Event</label>
                  <p className="font-medium text-slate-900">{parsedResult.title}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold">Type</label>
                  <div className="flex items-center gap-2 text-sm text-slate-700 mt-1">
                     {getTypeLabel(parsedResult.type).icon}
                     <span>{getTypeLabel(parsedResult.type).label}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div>
                      <label className="text-xs text-slate-500 uppercase font-bold">Start</label>
                      <p className="text-sm text-slate-700">{new Date(parsedResult.startDate).toLocaleString()}</p>
                   </div>
                   <div>
                      <label className="text-xs text-slate-500 uppercase font-bold">End</label>
                      <p className="text-sm text-slate-700">{new Date(parsedResult.endDate).toLocaleString()}</p>
                   </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold">Assignee</label>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-700">
                        {parsedResult.assigneeName || 'Unassigned'}
                     </span>
                  </div>
                </div>
                <div className="pt-2 flex gap-2">
                   <Button onClick={handleConfirm} className="w-full justify-center">
                      <CalendarPlus className="w-4 h-4 mr-2" />
                      Add to Calendar
                   </Button>
                   <Button variant="secondary" onClick={() => setParsedResult(null)} className="w-full justify-center">
                      Discard
                   </Button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};