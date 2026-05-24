import React, { useState, useRef } from 'react';
import { CloseX } from './ModernIcons';

interface ImportFileEntry {
  entryName: string;
  size: number;
}

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;   // refresh sounds after import
}

export default function ImportDialog({ open, onClose, onImported }: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<ImportFileEntry[] | null>(null);
  const [error, setError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  const resetState = () => {
    setEntries(null);
    setError('');
    setFileData(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');
    setPreviewLoading(true);

    try {
      // Read file as base64
      const buf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));

      const api = (window as any).electron?.ipcRenderer;
      if (!api) { setError('IPC not available'); setPreviewLoading(false); return; }

      const result = await api.invoke('import-config-preview', base64);
      if (result?.error) {
        setError(result.error);
        setEntries(null);
        setFileData(null);
      } else {
        setEntries(result.entries);
        setFileData(base64);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to read file');
    } finally {
      setPreviewLoading(false);
    }
  };

  const applyImport = async () => {
    if (!fileData) return;
    setApplying(true);
    setError('');
    try {
      const api = (window as any).electron?.ipcRenderer;
      const result = await api.invoke('import-config-apply', fileData);
      if (result?.error) {
        setError(result.error);
      } else {
        resetState();
        onImported();
        onClose();
      }
    } catch (e: any) {
      setError(e?.message || 'Import failed');
    } finally {
      setApplying(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-[9998]" onClick={handleClose} />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto surface-card border-accent w-[460px] max-w-[95vw] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
            <h2 className="text-sm font-semibold text-text-primary">导入配置</h2>
            <button onClick={handleClose} className="w-6 h-6 flex items-center justify-center text-text-secondary hover:text-text-primary">
              <CloseX size={14} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-sm text-text-secondary">
              选择一个之前导出的 ZIP 文件，恢复音效和设置。
            </p>

            {/* File picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFilePick}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-2 border border-dashed border-border-default text-text-secondary text-sm rounded-lg hover:border-accent hover:text-accent transition-none"
            >
              {fileName ? fileName : '选择 .zip 文件...'}
            </button>

            {previewLoading && (
              <div className="text-sm text-text-secondary text-center py-2">正在解析...</div>
            )}

            {error && (
              <div className="text-sm text-accent-red bg-accent-red/8 border border-accent-red/20 rounded-lg px-3 py-2">{error}</div>
            )}

            {/* Entries preview */}
            {entries && entries.length > 0 && (
              <div className="bg-bg-tertiary rounded-lg p-3 max-h-[240px] overflow-y-auto">
                <div className="text-xs text-text-secondary mb-2">
                  包含 {entries.length} 个文件
                </div>
                {entries.map((e) => (
                  <div key={e.entryName} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-text-primary truncate">{e.entryName}</span>
                    <span className="text-text-secondary ml-2 shrink-0">{formatBytes(e.size)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 justify-end">
              <button onClick={handleClose} className="px-3 py-1.5 border border-border-default text-text-secondary text-xs rounded-lg">
                取消
              </button>
              <button
                onClick={applyImport}
                disabled={!fileData || applying}
                className="px-4 py-1.5 bg-accent text-black text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-40"
              >
                {applying ? '导入中...' : '开始导入'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
