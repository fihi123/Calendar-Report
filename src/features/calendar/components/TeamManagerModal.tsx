import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, UserPlus, Check, X } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { TeamMember } from '../types';
import { MEMBER_COLOR_OPTIONS } from '../constants';
import { v4 as uuidv4 } from 'uuid';

interface TeamManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  onUpdateMembers: (members: TeamMember[]) => void;
}

export const TeamManagerModal: React.FC<TeamManagerModalProps> = ({
  isOpen,
  onClose,
  teamMembers,
  onUpdateMembers,
}) => {
  const [localMembers, setLocalMembers] = useState<TeamMember[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editColor, setEditColor] = useState('');

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newColor, setNewColor] = useState(MEMBER_COLOR_OPTIONS[0].value);

  useEffect(() => {
    if (isOpen) {
      setLocalMembers([...teamMembers]);
      setEditingId(null);
      setNewName('');
      setNewRole('');
      setNewColor(MEMBER_COLOR_OPTIONS[0].value);
    }
  }, [isOpen, teamMembers]);

  const startEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditRole(member.role);
    setEditColor(member.color);
  };

  const confirmEdit = () => {
    if (!editingId || !editName.trim()) return;
    setLocalMembers(prev =>
      prev.map(m =>
        m.id === editingId
          ? { ...m, name: editName.trim(), role: editRole.trim(), color: editColor }
          : m
      )
    );
    setEditingId(null);
  };

  const deleteMember = (id: string) => {
    if (localMembers.length <= 1) return;
    setLocalMembers(prev => prev.filter(m => m.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const addMember = () => {
    if (!newName.trim()) return;
    const id = uuidv4();
    setLocalMembers(prev => [
      ...prev,
      {
        id,
        name: newName.trim(),
        role: newRole.trim(),
        color: newColor,
        avatar: `https://picsum.photos/100/100?random=${Date.now()}`,
      },
    ]);
    setNewName('');
    setNewRole('');
    setNewColor(MEMBER_COLOR_OPTIONS[0].value);
  };

  const handleSave = () => {
    let membersToSave = localMembers;
    if (editingId && editName.trim()) {
      membersToSave = localMembers.map(m =>
        m.id === editingId
          ? { ...m, name: editName.trim(), role: editRole.trim(), color: editColor }
          : m
      );
    }
    onUpdateMembers(membersToSave);
    onClose();
  };

  const ColorPicker: React.FC<{
    selected: string;
    onChange: (val: string) => void;
  }> = ({ selected, onChange }) => (
    <div className="flex gap-1.5 flex-wrap">
      {MEMBER_COLOR_OPTIONS.map(opt => (
        <button
          key={opt.label}
          type="button"
          title={opt.label}
          onClick={() => onChange(opt.value)}
          className={`w-6 h-6 rounded-full ${opt.swatch} transition-all ${
            selected === opt.value ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : 'hover:scale-110'
          }`}
        />
      ))}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Team Members">
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {localMembers.map(member => (
          <div
            key={member.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50"
          >
            <img
              src={member.avatar}
              alt=""
              className="w-9 h-9 rounded-full flex-shrink-0 border border-white shadow-sm"
            />

            {editingId === member.id ? (
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 text-sm border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Name"
                  />
                  <input
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    className="flex-1 text-sm border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Role"
                  />
                </div>
                <ColorPicker selected={editColor} onChange={setEditColor} />
                <div className="flex gap-1 justify-end">
                  <button
                    onClick={confirmEdit}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    title="Confirm"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        MEMBER_COLOR_OPTIONS.find(o => o.value === member.color)?.swatch || 'bg-slate-400'
                      }`}
                    />
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {member.name}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 ml-[18px]">{member.role}</span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(member)}
                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteMember(member.id)}
                    disabled={localMembers.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new member form */}
      <div className="mt-4 p-3 rounded-lg border border-dashed border-slate-300 bg-white space-y-2">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 text-sm border border-slate-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="New member name"
          />
          <input
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
            className="flex-1 text-sm border border-slate-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Role"
          />
        </div>
        <div className="flex items-center justify-between">
          <ColorPicker selected={newColor} onChange={setNewColor} />
          <button
            onClick={addMember}
            disabled={!newName.trim()}
            className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:text-slate-300 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-primary-50 transition-colors"
          >
            <UserPlus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-200">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </Modal>
  );
};
