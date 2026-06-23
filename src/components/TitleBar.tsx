import { RetroTV, Satellite, Crosshair, UFO } from './ModernIcons';
import { copy, themeColor } from '../ui/copy';

interface TitleBarProps {
  onSettingsClick: () => void;
  valorantEnabled: boolean;
  onValorantMonitorToggle: () => void;
  valorantConnected: boolean;
  showValorant: boolean;
  onValorantPanelToggle: () => void;
  csgoEnabled: boolean;
  onCsgoMonitorToggle: () => void;
  csgoConnected: boolean;
  showCsgo: boolean;
  onCsgoPanelToggle: () => void;
  teamMode: boolean;
  onTeamToggle: () => void;
  version?: string;
  onUpdateCheck?: () => void;
  updateBadge?: 'none' | 'new-version' | 'checking';
}

function TitleBar({
  onSettingsClick,
  valorantEnabled,
  onValorantMonitorToggle,
  valorantConnected,
  showValorant,
  onValorantPanelToggle,
  csgoEnabled,
  onCsgoMonitorToggle,
  csgoConnected,
  showCsgo,
  onCsgoPanelToggle,
  teamMode,
  onTeamToggle,
  version,
  onUpdateCheck,
  updateBadge,
}: TitleBarProps) {
  const minimize = () => {
    (window as any).electron?.ipcRenderer?.send('minimize-window');
  };

  const close = () => {
    (window as any).electron?.ipcRenderer?.send('close-window');
  };

  const valorantMonitorIndicator = valorantEnabled && valorantConnected;

  return (
    <div className="[-webkit-app-region:drag] shrink-0 bg-bg-secondary/95 border-b border-border-default">
      <div className="titlebar-accent-line" />
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <RetroTV size={18} color={themeColor.cyan} />
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-[15px] font-semibold text-accent tracking-[0.3px] truncate">{copy.app.title}</span>
            <span className="meta-label tracking-widest">{copy.app.tagline}</span>
          </div>
          <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-accent-green animate-[blink_1s_steps(1)_infinite]" title={copy.app.statusLive} />
        </div>

        <div className="[-webkit-app-region:no-drag] flex items-center gap-1">
          {/* Valorant Monitor toggle */}
          <button
            onClick={onValorantMonitorToggle}
            className={`win-btn rounded-lg relative ${
              valorantEnabled
                ? 'border-accent bg-accent/20 text-accent shadow-[0_0_10px_rgba(255,94,156,0.5)]'
                : valorantConnected
                  ? 'border-accent/70 bg-accent/10 text-accent/80'
                  : 'border-border-default text-text-muted opacity-50'
            }`}
            title={
              valorantEnabled
                ? `${copy.valorant.title} · 监控已开启${valorantConnected ? ` · ${copy.valorant.connected}` : ' · 未检测'}`
                : valorantConnected
                  ? `${copy.valorant.title} · 点击开启监控${valorantConnected ? ` · ${copy.valorant.connected}` : ''}`
                  : `${copy.valorant.title} · 未检测`
            }
          >
            {valorantMonitorIndicator && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-green ring-1 ring-bg-primary" />}
            <Satellite size={13} color={valorantEnabled ? themeColor.accent : valorantConnected ? themeColor.accent : themeColor.muted} />
          </button>
          {/* Valorant Panel toggle */}
          {valorantEnabled && (
            <button
              onClick={onValorantPanelToggle}
              className={`win-btn rounded-lg relative ${
                showValorant
                  ? 'border-accent bg-accent/20 text-accent shadow-[0_0_10px_rgba(255,94,156,0.5)]'
                  : 'border-border-default text-text-muted opacity-80'
              }`}
              title={`${copy.valorant.bindings}${showValorant ? ' · 面板已展开' : ''}`}
            >
              {showValorant && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent ring-1 ring-bg-primary" />}
              <Satellite size={13} color={showValorant ? themeColor.accent : themeColor.muted} />
            </button>
          )}
          {/* CS2 Monitor toggle */}
          <button
            onClick={onCsgoMonitorToggle}
            className={`win-btn rounded-lg relative ${
              csgoEnabled
                ? 'border-accent-gold bg-accent-gold/20 text-accent-gold shadow-[0_0_10px_rgba(255,200,0,0.5)]'
                : csgoConnected
                  ? 'border-accent-gold/70 bg-accent-gold/10 text-accent-gold/80'
                  : 'border-border-default text-text-muted opacity-50'
            }`}
            title={
              csgoEnabled
                ? `CS2 · 监控已开启${csgoConnected ? ` · ${copy.valorant.connected}` : ' · 未检测'}`
                : csgoConnected
                  ? `CS2 · 点击开启监控${csgoConnected ? ` · ${copy.valorant.connected}` : ''}`
                  : `CS2 · 未检测`
            }
          >
            {csgoEnabled && csgoConnected && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-green ring-1 ring-bg-primary" />}
            <Crosshair size={13} color={csgoEnabled ? themeColor.gold : csgoConnected ? themeColor.gold : themeColor.muted} />
          </button>
          {/* CS2 Panel toggle */}
          {csgoEnabled && (
            <button
              onClick={onCsgoPanelToggle}
              className={`win-btn rounded-lg relative ${
                showCsgo
                  ? 'border-accent-gold bg-accent-gold/20 text-accent-gold shadow-[0_0_10px_rgba(255,200,0,0.5)]'
                  : 'border-border-default text-text-muted opacity-80'
              }`}
              title={`${copy.csgo.bindings}${showCsgo ? ' · 面板已展开' : ''}`}
            >
              {showCsgo && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-gold ring-1 ring-bg-primary" />}
              <Crosshair size={13} color={showCsgo ? themeColor.gold : themeColor.muted} />
            </button>
          )}
          {onTeamToggle && (
            <button
              onClick={onTeamToggle}
              className={`win-btn rounded-lg relative ${
                teamMode
                  ? 'border-accent-pink bg-accent-pink/20 text-accent-pink shadow-[0_0_12px_rgba(255,46,160,0.6)]'
                  : 'border-border-default text-text-muted opacity-50'
              }`}
              title={`团队按键 ${teamMode ? '· 已开启' : '· 已关闭'}`}
            >
              {teamMode && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-pink ring-1 ring-bg-primary" />}
              <UFO size={13} color={teamMode ? themeColor.pink : themeColor.muted} />
            </button>
          )}
          {/* Version badge */}
          {onUpdateCheck && version && (
            <button
              onClick={onUpdateCheck}
              className={`win-btn rounded-lg text-[11px] font-mono tabular-nums px-1.5 py-0.5 min-w-[48px] text-center relative ${
                updateBadge === 'new-version'
                  ? 'border-accent-gold bg-accent-gold/20 text-accent-gold'
                  : updateBadge === 'checking'
                    ? 'border-border-default text-text-secondary/60'
                    : 'border-border-default text-text-muted opacity-70'
              }`}
              title={updateBadge === 'new-version' ? '发现新版本' : updateBadge === 'checking' ? '正在检查更新…' : '点击检查更新'}
            >
              <span className="text-[9px] opacity-60 mr-0.5">v</span>{version}
              {updateBadge === 'new-version' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent-gold" />
              )}
            </button>
          )}
          <span className="w-px h-5 bg-border-bright mx-0.5" aria-hidden />
          <button onClick={onSettingsClick} className="win-btn rounded-lg" title={copy.settings.title}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="6" height="6" />
              <rect x="7" y="7" width="10" height="10" />
              <rect x="5" y="11" width="4" height="2" />
              <rect x="15" y="11" width="4" height="2" />
              <rect x="11" y="5" width="2" height="4" />
              <rect x="11" y="15" width="2" height="4" />
            </svg>
          </button>
          <button onClick={minimize} className="win-btn rounded-lg" title="最小化">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/>
            </svg>
          </button>
          <button onClick={close} className="win-btn win-btn-danger rounded-lg text-accent-red" title="关闭">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6l-12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default TitleBar;
