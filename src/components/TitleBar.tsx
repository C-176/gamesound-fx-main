import { RetroTV, Saturn, Satellite, UFO } from './PixelIcons';

interface TitleBarProps {
  onSettingsClick: () => void;
  onValorantToggle?: () => void;
  showValorant?: boolean;
  valorantConnected?: boolean;
  teamMode?: boolean;
  onTeamToggle?: () => void;
}

function TitleBar({ onSettingsClick, onValorantToggle, showValorant, valorantConnected, teamMode, onTeamToggle }: TitleBarProps) {
  const minimize = () => {
    (window as any).electron?.ipcRenderer?.send('minimize-window');
  };

  const close = () => {
    (window as any).electron?.ipcRenderer?.send('close-window');
  };

  return (
    <div className="[-webkit-app-region:drag] px-3 py-2.5 bg-bg-secondary border-b-2 border-accent flex items-center justify-between">
      <div className="flex items-center gap-2">
        <RetroTV size={16} color="#0cf" />
        <span className="text-lg font-pixel text-accent tracking-wider">GAMESOUND FX</span>
        <span className="w-1.5 h-1.5 bg-accent animate-[blink_1s_steps(1)_infinite]" />
        <Saturn size={12} />
      </div>

      <div className="[-webkit-app-region:no-drag] flex gap-0.5">
        {onValorantToggle && (
          <button onClick={onValorantToggle} className={`[-webkit-app-region:no-drag] w-7 h-7 border-2 flex items-center justify-center cursor-pointer active:translate-x-0.5 active:translate-y-0.5 rounded-none ${
            showValorant
              ? 'border-accent bg-accent/10'
              : valorantConnected
                ? 'border-accent-green bg-accent-green/10'
                : 'border-border-default bg-bg-tertiary text-text-secondary hover:border-accent hover:text-accent'
          }`} title={`VALORANT 绑定${valorantConnected ? ' (已连接)' : ''}`}>
            <Satellite size={12} color={
              showValorant ? '#c04dff'
              : valorantConnected ? '#00ff66'
              : 'currentColor'
            } />
          </button>
        )}
        {onTeamToggle && (
          <button onClick={onTeamToggle} className={`[-webkit-app-region:no-drag] w-7 h-7 border-2 flex items-center justify-center cursor-pointer active:translate-x-0.5 active:translate-y-0.5 rounded-none ${
            teamMode
              ? 'border-accent bg-accent/10'
              : 'border-border-default bg-bg-tertiary text-text-secondary hover:border-accent hover:text-accent'
          }`} title={teamMode ? 'TEAM MODE ON' : 'TEAM MODE OFF'}>
            <UFO size={12} color={teamMode ? '#c04dff' : 'currentColor'} />
          </button>
        )}
        <button onClick={onSettingsClick} className="[-webkit-app-region:no-drag] w-7 h-7 border-2 border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent hover:text-accent active:translate-x-0.5 active:translate-y-0.5 rounded-none" title="设置">
          <svg shapeRendering="crispEdges" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <rect x="9" y="9" width="6" height="6" />
            <rect x="7" y="7" width="10" height="10" />
            <rect x="5" y="11" width="4" height="2" />
            <rect x="15" y="11" width="4" height="2" />
            <rect x="11" y="5" width="2" height="4" />
            <rect x="11" y="15" width="2" height="4" />
          </svg>
        </button>
        <button onClick={minimize} className="[-webkit-app-region:no-drag] w-7 h-7 border-2 border-border-default bg-bg-tertiary text-text-secondary flex items-center justify-center cursor-pointer hover:border-accent hover:text-accent active:translate-x-0.5 active:translate-y-0.5 rounded-none" title="最小化">
          <svg shapeRendering="crispEdges" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
            <path d="M5 12h14"/>
          </svg>
        </button>
        <button onClick={close} className="[-webkit-app-region:no-drag] w-7 h-7 border-2 border-accent-red bg-bg-tertiary text-accent-red flex items-center justify-center cursor-pointer hover:bg-accent-red hover:text-white active:translate-x-0.5 active:translate-y-0.5 rounded-none" title="关闭">
          <svg shapeRendering="crispEdges" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
            <path d="M6 6l12 12M18 6l-12 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default TitleBar;
