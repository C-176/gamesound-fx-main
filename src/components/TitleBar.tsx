import { RetroTV, Satellite, UFO } from './PixelIcons';
import { copy, themeColor } from '../ui/copy';

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
    <div className="[-webkit-app-region:drag] shrink-0 bg-bg-secondary border-b border-border-default">
      <div className="titlebar-accent-line" />
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <RetroTV size={18} color={themeColor.cyan} />
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-base font-semibold text-accent tracking-wide truncate">{copy.app.title}</span>
            <span className="meta-label tracking-widest">{copy.app.tagline}</span>
          </div>
          <span className="w-1.5 h-1.5 shrink-0 bg-accent-green animate-[blink_1s_steps(1)_infinite]" title={copy.app.statusLive} />
        </div>

        <div className="[-webkit-app-region:no-drag] flex items-center gap-1">
          {onValorantToggle && (
            <button
              onClick={onValorantToggle}
              className={`win-btn rounded-lg ${showValorant ? 'border-accent bg-accent-dim text-accent' : valorantConnected ? 'border-accent-green bg-accent-green/10' : ''}`}
              title={`${copy.valorant.title}${valorantConnected ? ` · ${copy.valorant.connected}` : ''}`}
            >
              <Satellite size={12} color={showValorant ? themeColor.accent : valorantConnected ? themeColor.green : 'currentColor'} />
            </button>
          )}
          {onTeamToggle && (
            <button
              onClick={onTeamToggle}
              className={`win-btn rounded-lg ${teamMode ? 'border-accent bg-accent-dim text-accent' : ''}`}
              title={`${copy.settings.teamMode} · ${teamMode ? copy.common.on : copy.common.off}`}
            >
              <UFO size={12} color={teamMode ? themeColor.accent : 'currentColor'} />
            </button>
          )}
          <span className="w-px h-5 bg-border-bright mx-0.5" aria-hidden />
          <button onClick={onSettingsClick} className="win-btn rounded-lg" title={copy.settings.title}>
            <svg shapeRendering="crispEdges" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
              <rect x="9" y="9" width="6" height="6" />
              <rect x="7" y="7" width="10" height="10" />
              <rect x="5" y="11" width="4" height="2" />
              <rect x="15" y="11" width="4" height="2" />
              <rect x="11" y="5" width="2" height="4" />
              <rect x="11" y="15" width="2" height="4" />
            </svg>
          </button>
          <button onClick={minimize} className="win-btn rounded-lg" title="最小化">
            <svg shapeRendering="crispEdges" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
              <path d="M5 12h14"/>
            </svg>
          </button>
          <button onClick={close} className="win-btn win-btn-danger rounded-lg text-accent-red" title="关闭">
            <svg shapeRendering="crispEdges" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
              <path d="M6 6l12 12M18 6l-12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default TitleBar;
