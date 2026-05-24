import React, { useState } from 'react';
import { CloseX } from './ModernIcons';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ExportDialog({ open, onClose }: ExportDialogProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const doExport = async () => {
    setExporting(true);
    setError('');
    try {
      const api = (window as any).electron?.ipcRenderer;
      if (!api) { setError('IPC not available'); setExporting(false); return; }
      const result = await api.invoke('export-config');
      if (!result?.data) { setError('Export returned no data'); setExporting(false); return; }

      // Convert base64 to blob and trigger download
      const bytes = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gamesound-fx-config.zip';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-[9998]" onClick={onClose} />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto surface-card border-accent w-[400px] max-w-[95vw] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
            <h2 className="text-sm font-semibold text-text-primary">导出配置</h2>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-text-secondary hover:text-text-primary">
              <CloseX size={14} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-sm text-text-secondary">
              将所有音效、分组和设置导出为 ZIP 压缩包。
            </p>

            {error && (
              <div className="text-sm text-accent-red bg-accent-red/8 border border-accent-red/20 rounded-lg px-3 py-2">{error}</div>
            )}

            <div className="flex items-center gap-2 justify-end">
              <button onClick={onClose} className="px-3 py-1.5 border border-border-default text-text-secondary text-xs rounded-lg">
                取消
              </button>
              <button
                onClick={doExport}
                disabled={exporting}
                className="px-4 py-1.5 bg-accent text-black text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-40"
              >
                {exporting ? '导出中...' : '导出 ZIP'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
