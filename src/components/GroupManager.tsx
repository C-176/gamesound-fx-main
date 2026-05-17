import { useState, useMemo } from 'react';
import type { Group, Sound } from '../data/sounds';
import { Cassette, Folder, Checkmark, CloseX } from './PixelIcons';
import ConfirmModal from './ConfirmModal';
import SectionTitle from './ui/SectionTitle';
import { copy, themeColor } from '../ui/copy';

interface GroupManagerProps {
  onClose: () => void;
  groups: Group[];
  onAddGroup: (name: string, color: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onUpdateGroupName: (groupId: string, name: string) => void;
  sounds: Sound[];
}

const COLORS = [
  '#0cf', '#f44', '#f6a', '#fc0', '#0e5',
  '#a371f7', '#79c0ff', '#ffa657', '#56d364', '#ff7b72'
];

function GroupManager({ onClose, groups, onAddGroup, onDeleteGroup, onUpdateGroupName }: GroupManagerProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const deleteConfirmName = deleteConfirmId ? groups.find(g => g.id === deleteConfirmId)?.name : '';

  const usedColors = useMemo(() => new Set(groups.map(g => g.color)), [groups]);
  const availableColors = useMemo(() => {
    const sorted = [...COLORS];
    sorted.sort((a, b) => {
      const aUsed = usedColors.has(a) ? 1 : 0;
      const bUsed = usedColors.has(b) ? 1 : 0;
      return aUsed - bUsed;
    });
    return sorted;
  }, [usedColors]);

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      onAddGroup(newGroupName.trim(), selectedColor);
      setNewGroupName('');
      const nextColor = availableColors.find(c => !usedColors.has(c)) || COLORS[0];
      setSelectedColor(nextColor);
    }
  };

  const handleStartEdit = (group: Group) => { setEditingId(group.id); setEditingName(group.name); };
  const handleSaveEdit = (groupId: string) => { if (editingName.trim()) onUpdateGroupName(groupId, editingName.trim()); setEditingId(null); setEditingName(''); };
  const handleCancelEdit = () => { setEditingId(null); setEditingName(''); };

  const isDefault = (groupId: string) => groupId === '__builtin__';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-secondary border-2 border-accent rounded-none p-4 w-[400px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3 border-b-2 border-border-default pb-2">
          <h2 className="font-pixel text-base text-accent flex items-center gap-1.5"><Cassette size={14} color={themeColor.cyan} /> {copy.group.manage}</h2>
          <div className="flex items-center gap-1">
            <span className="text-base font-pixel text-text-secondary">{groups.length}</span>
            <button onClick={onClose} className="w-6 h-6 border-2 border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-none">
              <CloseX size={12} color="var(--text-secondary)" />
            </button>
          </div>
        </div>

        {/* Create group */}
        <div className="mb-3">
          <SectionTitle icon={<Folder size={12} color={themeColor.cyan} />}>{copy.group.new}</SectionTitle>
          <div className="flex items-center gap-2">
            <input
              type="text" value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder={copy.group.namePlaceholder}
              className="flex-1 px-2 py-1.5 bg-bg-tertiary border-2 border-border-default text-text-primary text-base font-pixel outline-none focus:border-accent transition-none rounded-none"
              onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
            />
            <button
              onClick={handleAddGroup}
              disabled={!newGroupName.trim()}
              className="shrink-0 px-2.5 py-1.5 border-2 border-accent bg-accent text-black text-base font-pixel cursor-pointer hover:bg-accent-gold hover:border-accent-gold disabled:border-border-default disabled:bg-bg-tertiary disabled:text-text-secondary disabled:cursor-not-allowed transition-none rounded-none"
            >
              {copy.group.add}
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {availableColors.map(color => {
              const isUsed = usedColors.has(color);
              return (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-5 h-5 border-2 cursor-pointer transition-none rounded-none
                    ${selectedColor === color ? 'border-text-baserimary shadow-[1px_1px_0_rgba(0,0,0,0.5)] scale-110' : isUsed ? 'border-transparent opacity-30' : 'border-transparent hover:scale-110'}`}
                  style={{ backgroundColor: color }}
                  title={isUsed ? copy.group.alreadyUsed : color}
                />
              );
            })}
          </div>
        </div>

        <div className="border-t-2 border-border-default my-2" />

        {/* Group list */}
        <div>
          <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto">
            {groups.map(group => {
              const isDef = isDefault(group.id);
              return (
                <div key={group.id} className="bg-bg-tertiary border-2 border-border-default rounded-none overflow-hidden">
                  <div className="flex items-center gap-2 p-2">
                    <span className="w-1 h-7 shrink-0 rounded-none" style={{ backgroundColor: group.color }} />
                    <div className="flex-1 min-w-0">
                      {editingId === group.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text" value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            className="px-1.5 py-0.5 bg-bg-secondary border-2 border-accent text-text-primary text-base font-pixel outline-none w-[100px] transition-none rounded-none"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(group.id); if (e.key === 'Escape') handleCancelEdit(); }}
                          />
                          <button onClick={() => handleSaveEdit(group.id)} className="w-5 h-5 border-2 border-accent-green bg-accent-green/10 text-accent-green text-xs font-pixel cursor-pointer transition-none rounded-none flex items-center justify-center">
                            <Checkmark size={10} color="var(--accent-green)" />
                          </button>
                          <button onClick={handleCancelEdit} className="w-5 h-5 border-2 border-accent-red bg-accent-red/10 text-accent-red text-xs font-pixel cursor-pointer transition-none rounded-none flex items-center justify-center">
                            <CloseX size={10} color="var(--accent-red)" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-pixel text-text-primary">{group.name}</span>
                          {isDef && <span className="text-xs font-pixel px-1 py-0.5 bg-accent/10 text-accent rounded-none">{copy.group.default}</span>}
                        </div>
                      )}
                    </div>
                    {editingId !== group.id && (
                      <div className="flex gap-1">
                        {!isDef && (
                          <>
                            <button onClick={() => handleStartEdit(group)} className="w-5 h-5 border-2 border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent hover:text-accent transition-none rounded-none" title={copy.group.edit}>
                              <svg shapeRendering="crispEdges" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><polyline points="4,20 8,20 20,8 16,4 4,16" /><line x1="16" y1="4" x2="20" y2="8" /></svg>
                            </button>
                            <button onClick={() => setDeleteConfirmId(group.id)} className="w-5 h-5 border-2 border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent-red hover:text-accent-red transition-none rounded-none" title={copy.common.delete}>
                              <svg shapeRendering="crispEdges" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {groups.length === 0 && (
              <div className="flex flex-col items-center py-6 text-text-secondary">
                <div className="mb-2 opacity-50"><Folder size={24} color="#5a5a90" /></div>
                <span className="text-base font-pixel">{copy.group.empty}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={deleteConfirmId !== null}
        title={copy.group.deleteTitle}
        message={copy.group.deleteMessage(deleteConfirmName || '')}
        danger
        confirmLabel={copy.common.delete}
        onConfirm={() => {
          if (deleteConfirmId) onDeleteGroup(deleteConfirmId);
          setDeleteConfirmId(null);
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}

export default GroupManager;
