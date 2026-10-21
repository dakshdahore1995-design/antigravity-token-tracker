import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  Upload,
  Download,
  Globe,
  Database,
  CheckCircle2,
  Copy,
  Terminal,
  ExternalLink
} from 'lucide-react';

export default function DataSyncModal({
  onClose,
  data,
  onImportData,
  onTriggerSync,
  isSyncing,
}) {
  const [copiedCmd, setCopiedCmd] = useState('');
  const [importStatus, setImportStatus] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.calendar_days && parsed.summary) {
          onImportData(parsed);
          setImportStatus('success');
        } else {
          setImportStatus('error');
        }
      } catch (err) {
        setImportStatus('error');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `antigravity-tokens-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const copyCommand = (cmd) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(''), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel modal-wide" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <Database className="text-neon" size={20} />
            <div>
              <h3 className="modal-title">Antigravity Telemetry Sync & Netlify Deployment</h3>
              <span className="modal-subtitle">
                Local SQLite extraction, data imports, and static hosting guide
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body modal-sync-body">
          {/* Section 1: Local Sync from Machine */}
          <div className="sync-section-card glass-panel">
            <div className="sync-card-header">
              <RefreshCw size={18} className="text-neon" />
              <div>
                <h4>1. Local Machine Live Sync</h4>
                <p>Scans your local Antigravity IDE SQLite databases in <code>~/.gemini/antigravity-ide/conversations/*.db</code></p>
              </div>
            </div>

            <div className="sync-card-body">
              <p className="sync-info-text">
                Your computer currently has <strong>{data?.summary?.total_sessions || 12}</strong> conversation databases containing over <strong>{((data?.summary?.total_tokens || 0) / 1_000_000).toFixed(1)}M</strong> tokens.
              </p>

              <div className="sync-btn-row">
                <button
                  className="btn-primary"
                  onClick={onTriggerSync}
                  disabled={isSyncing}
                >
                  <RefreshCw size={15} className={isSyncing ? 'spin-anim' : ''} />
                  <span>{isSyncing ? 'Extracting Protobuf Tokens...' : 'Run Sync Script Now'}</span>
                </button>

                <button className="btn-secondary" onClick={handleExport}>
                  <Download size={15} />
                  <span>Export JSON Backup</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Upload / Import */}
          <div className="sync-section-card glass-panel">
            <div className="sync-card-header">
              <Upload size={18} className="text-blue" />
              <div>
                <h4>2. Import Antigravity JSON (Netlify Web Mode)</h4>
                <p>When running hosted on Netlify, load new usage by dropping an exported file</p>
              </div>
            </div>

            <div className="sync-card-body">
              <label className="file-dropzone">
                <Upload size={24} className="text-muted" />
                <span className="dropzone-text">Click to choose or drop <code>antigravity-data.json</code></span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>

              {importStatus === 'success' && (
                <div className="status-banner banner-success">
                  <CheckCircle2 size={16} />
                  <span>Data imported successfully! Heatmaps and 3D matrix updated.</span>
                </div>
              )}
              {importStatus === 'error' && (
                <div className="status-banner banner-error">
                  <span>Failed to parse JSON. Please provide a valid Antigravity telemetry export.</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Netlify 1-Click Deployment */}
          <div className="sync-section-card glass-panel" id="deploy-section">
            <div className="sync-card-header">
              <Globe size={18} className="text-amber" />
              <div>
                <h4>3. Deploy Instantly to Netlify</h4>
                <p>This project is configured with <code>netlify.toml</code> for zero-config production deployment</p>
              </div>
            </div>

            <div className="sync-card-body">
              <div className="code-instruction-box">
                <div className="instruction-step">
                  <span className="step-num">A</span>
                  <span>Option 1: Deploy from Terminal (Netlify CLI)</span>
                </div>
                <div className="command-bar">
                  <code>npx -y netlify-cli deploy --prod --dir=dist</code>
                  <button
                    className="copy-btn"
                    onClick={() => copyCommand('npx -y netlify-cli deploy --prod --dir=dist')}
                  >
                    {copiedCmd === 'npx -y netlify-cli deploy --prod --dir=dist' ? <CheckCircle2 size={14} className="text-neon" /> : <Copy size={14} />}
                  </button>
                </div>

                <div className="instruction-step" style={{ marginTop: '14px' }}>
                  <span className="step-num">B</span>
                  <span>Option 2: Git Push to Netlify / GitHub</span>
                </div>
                <p className="step-desc">
                  Initialize a git repository in this project directory and link to your Netlify account. Build command is <code>npm run build</code> and publish directory is <code>dist</code>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
