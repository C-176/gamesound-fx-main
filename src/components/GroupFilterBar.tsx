import type { Group } from '../data/sounds';
import { Folder } from './PixelIcons';

interface GroupFilterBarProps {
  groups: Group[];
  activeGroupFilter: string | null;
  onSelectGroupFilter: (groupId: string | null) => void;
  onGroupManagerClick: () => void;
  getGroupById: (groupId: string) => Group | undefined;
}

function GroupFilterBar({ groups, activeGroupFilter, onSelectGroupFilter, onGroupManagerClick, getGroupById }: GroupFilterBarProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b-2 border-border-default">
      <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
        <button
          onClick={() => onSelectGroupFilter(null)}
          className={`shrink-0 font-pixel cursor-pointer border-2 transition-none rounded-none whitespace-nowrap
            ${activeGroupFilter === null
              ? 'px-2.5 py-1 text-base border-accent bg-accent/15 text-accent shadow-[2px_2px_0_rgba(0,0,0,0.4)]'
              : 'px-2 py-0.5 text-base border-transparent text-text-secondary hover:border-border-default'
            }`}
        >
          ALL
        </button>
        {groups.map(group => (
          <button
            key={group.id}
            onClick={() => onSelectGroupFilter(group.id)}
            className={`shrink-0 font-pixel cursor-pointer border-2 transition-none rounded-none flex items-center gap-1 whitespace-nowrap
              ${activeGroupFilter === group.id
                ? 'px-2.5 py-1 text-base border-accent bg-accent/15 text-accent shadow-[2px_2px_0_rgba(0,0,0,0.4)]'
                : 'px-2 py-0.5 text-base border-transparent text-text-secondary hover:border-border-default'
              }`}
            style={activeGroupFilter === group.id ? { borderColor: group.color } : undefined}
          >
            {activeGroupFilter === group.id && (
              <span className="w-2 h-2 shrink-0 rounded-none" style={{ backgroundColor: group.color }} />
            )}
            {group.name}
          </button>
        ))}
      </div>
      <button
        onClick={onGroupManagerClick}
        className="shrink-0 px-2.5 py-1.5 text-accent font-pixel cursor-pointer border-2 border-dashed border-accent/40 hover:border-accent hover:bg-accent/10 transition-none rounded-none flex items-center gap-1"
        title="MANAGE GROUPS"
      >
        <Folder size={14} color="#0cf" />
      </button>
    </div>
  );
}

export default GroupFilterBar;
