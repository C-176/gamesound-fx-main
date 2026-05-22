import type { Group } from '../data/sounds';
import { Folder } from './ModernIcons';
import { copy, themeColor } from '../ui/copy';

interface GroupFilterBarProps {
  groups: Group[];
  activeGroupFilter: string | null;
  onSelectGroupFilter: (groupId: string | null) => void;
  onGroupManagerClick: () => void;
  getGroupById: (groupId: string) => Group | undefined;
}

function GroupFilterBar({ groups, activeGroupFilter, onSelectGroupFilter, onGroupManagerClick, getGroupById }: GroupFilterBarProps) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-border-default bg-bg-secondary/70 backdrop-blur-[2px]">
      <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 scroll-fade-x pb-0.5">
        <button
          onClick={() => onSelectGroupFilter(null)}
          className={`shrink-0 text-sm cursor-pointer border transition-none rounded-lg whitespace-nowrap
            ${activeGroupFilter === null
              ? 'px-2.5 py-1 border-accent text-accent bg-accent/12'
              : 'px-2.5 py-1 border-transparent text-text-secondary hover:border-border-bright hover:text-text-primary hover:bg-bg-soft/35'
            }`}
        >
          {copy.common.all}
        </button>
        {groups.map(group => (
          <button
            key={group.id}
            onClick={() => onSelectGroupFilter(group.id)}
            className={`shrink-0 text-sm cursor-pointer border transition-none rounded-lg flex items-center gap-1 whitespace-nowrap
              ${activeGroupFilter === group.id
                ? 'px-2.5 py-1 border-accent text-accent bg-accent/12'
                : 'px-2.5 py-1 border-transparent text-text-secondary hover:border-border-bright hover:text-text-primary hover:bg-bg-soft/35'
              }`}
            style={activeGroupFilter === group.id ? { borderColor: group.color } : undefined}
          >
            {activeGroupFilter === group.id && (
              <span className="w-2 h-2 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
            )}
            {group.name}
          </button>
        ))}
      </div>
      <button
        onClick={onGroupManagerClick}
        className="shrink-0 px-2 py-1.5 text-accent-cyan text-sm cursor-pointer border border-dashed border-accent-cyan/35 hover:border-accent-cyan hover:bg-accent-cyan/10 transition-none rounded-lg flex items-center gap-1"
        title={copy.group.manage}
      >
        <Folder size={14} color={themeColor.cyan} />
      </button>
    </div>
  );
}

export default GroupFilterBar;
