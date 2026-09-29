import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  UploadCloud,
  DownloadCloud,
  ShieldCheck,
  Layers,
  X,
  Radio,
  FileCode,
} from 'lucide-react';
import { Candidate } from '../types';
import { getHerokuDbStatus, syncCandidatesToHeroku, HerokuDbStatus, getHerokuCandidates } from '../lib/heroku-db';
import { useTheme } from '../lib/theme';

interface HerokuDeployModalProps {
  onClose: () => void;
  candidates: Candidate[];
  onRefreshData?: () => void;
}

export const HerokuDeployModal: React.FC<HerokuDeployModalProps> = ({
  onClose,
  candidates,
  onRefreshData,
}) => {
  const { colors } = useTheme();
  const [status, setStatus] = useState<HerokuDbStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'guide' | 'env' | 'schema'>('status');

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const data = await getHerokuDbStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSyncToHeroku = async () => {
    if (candidates.length === 0) {
      setSyncErrorMsg('No candidates currently loaded to migrate.');
      return;
    }
    setIsSyncing(true);
    setSyncSuccessMsg(null);
    setSyncErrorMsg(null);
    try {
      const res = await syncCandidatesToHeroku(candidates);
      setSyncSuccessMsg(`Successfully synced ${res.count} candidates to Heroku Postgres!`);
      setStatus(res.dbStatus);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setSyncErrorMsg(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const cliCommands = [
    {
      title: '1. Login to Heroku CLI',
      cmd: 'heroku login',
      desc: 'Authenticates your terminal with your Heroku account.',
    },
    {
      title: '2. Create a New Heroku Web App',
      cmd: 'heroku create my-recruitment-scheduler',
      desc: 'Provisions a new web container (dyno) on Heroku.',
    },
    {
      title: '3. Attach Heroku Postgres Database',
      cmd: 'heroku addons:create heroku-postgresql:essential-0',
      desc: 'Automatically creates the PostgreSQL database and injects the DATABASE_URL environment variable.',
    },
    {
      title: '4. Set Required Environment Variables',
      cmd: 'heroku config:set NODE_ENV=production TITAN_EMAIL="hr@mihora.tech" TITAN_PASSWORD="your-password" GEMINI_API_KEY="your-gemini-key"',
      desc: 'Configures SMTP credentials and AI API access.',
    },
    {
      title: '5. Deploy Web App to Heroku',
      cmd: 'git add .\ngit commit -m "Deploy to Heroku with Heroku Postgres"\ngit push heroku main',
      desc: 'Builds Vite production assets and launches the Node/Express server on Heroku.',
    },
    {
      title: '6. Open & Verify in Browser',
      cmd: 'heroku open',
      desc: 'Opens your live Heroku application.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-3xl rounded-2xl shadow-2xl border ${colors.cardBg} ${colors.border} flex flex-col max-h-[92vh] overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Heroku &amp; Database Deployment Hub
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Heroku Postgres Ready
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-stone-400">
                Full production setup for running the web app and PostgreSQL database on Heroku
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-stone-200 hover:bg-gray-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-gray-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'status'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-stone-400'
            }`}
          >
            <Database className="w-4 h-4" />
            Live DB Status
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'guide'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-stone-400'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Deploy Commands
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'env'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-stone-400'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Config &amp; Procfile
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'schema'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-stone-400'
            }`}
          >
            <Layers className="w-4 h-4" />
            Postgres Schema
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Live Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-900/50 space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Database Status</span>
                    <button onClick={checkStatus} className="text-gray-400 hover:text-gray-600" title="Refresh">
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        status?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {status?.connected ? 'Active & Ready' : 'Standby / Connecting'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Engine: <strong className="text-gray-700 dark:text-stone-300">{status?.engine || 'Detecting...'}</strong>
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-900/50 space-y-1">
                  <div className="text-xs text-gray-500">Candidates in Postgres</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {status?.tableCounts.candidates ?? 0}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Loaded in current view: <strong className="text-gray-700 dark:text-stone-300">{candidates.length}</strong>
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-900/50 space-y-1">
                  <div className="text-xs text-gray-500">DATABASE_URL Config</div>
                  <div className="flex items-center gap-1.5 pt-1">
                    {status?.databaseUrlConfigured ? (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Attached (Heroku)
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Radio className="w-4 h-4" /> Using Local/Fallback
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">
                    Dyno: {status?.herokuDyno || 'Local/Cloud Container'}
                  </p>
                </div>
              </div>

              {/* 1-Click Migration Card */}
              <div className="p-5 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-purple-950 dark:text-purple-200 flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-purple-600" />
                      1-Click Heroku Database Synchronization
                    </h3>
                    <p className="text-xs text-purple-800 dark:text-purple-300">
                      Instantly migrate your currently loaded {candidates.length} candidates into Heroku Postgres.
                    </p>
                  </div>
                  <button
                    onClick={handleSyncToHeroku}
                    disabled={isSyncing || candidates.length === 0}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-semibold shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Migrating...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        Sync to Heroku DB ({candidates.length})
                      </>
                    )}
                  </button>
                </div>

                {syncSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{syncSuccessMsg}</span>
                  </div>
                )}

                {syncErrorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{syncErrorMsg}</span>
                  </div>
                )}
              </div>

              {/* Architecture Explanation */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2 text-xs text-gray-600 dark:text-stone-300">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Dual Database Architecture Built-In
                </h4>
                <p>
                  Your app is configured so it can run anywhere with zero manual reconfiguration:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>On Heroku</strong>: Automatically connects to Heroku Postgres via <code className="bg-gray-100 dark:bg-stone-800 px-1 py-0.5 rounded font-mono">DATABASE_URL</code> with SSL mode enabled. Tables and indexes are created automatically on dyno boot.
                  </li>
                  <li>
                    <strong>In AI Studio / Local Dev</strong>: Seamlessly falls back to memory/file storage and Firebase Firestore so you can test features without needing a local database instance.
                  </li>
                  <li>
                    <strong>REST API Endpoints</strong>: Express exposes full CRUD endpoints at <code className="bg-gray-100 dark:bg-stone-800 px-1 py-0.5 rounded font-mono">/api/candidates</code>, <code className="bg-gray-100 dark:bg-stone-800 px-1 py-0.5 rounded font-mono">/api/settings</code>, and <code className="bg-gray-100 dark:bg-stone-800 px-1 py-0.5 rounded font-mono">/api/db/status</code>.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600 dark:text-stone-400">
                  Follow these standard Heroku CLI commands to launch this app and its PostgreSQL database on Heroku:
                </p>
                <button
                  onClick={() =>
                    handleCopy(
                      cliCommands.map((c) => `# ${c.title}\n${c.cmd}`).join('\n\n'),
                      'all_cli'
                    )
                  }
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium"
                >
                  {copiedKey === 'all_cli' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy All Commands
                </button>
              </div>

              <div className="space-y-3">
                {cliCommands.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-900/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {step.title}
                      </span>
                      <button
                        onClick={() => handleCopy(step.cmd, `step_${idx}`)}
                        className="px-2 py-1 rounded bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 text-[11px] text-gray-600 dark:text-stone-300 hover:text-purple-600 flex items-center gap-1 transition"
                      >
                        {copiedKey === `step_${idx}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-2.5 rounded-lg bg-stone-950 text-purple-300 text-xs font-mono overflow-x-auto">
                      {step.cmd}
                    </pre>
                    <p className="text-[11px] text-gray-500 dark:text-stone-400">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-gray-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-600" />
                  Heroku Procfile &amp; Node Engines Configured
                </h4>
                <p className="text-xs text-gray-600 dark:text-stone-300">
                  Your project root already includes the verified <code className="font-mono bg-gray-100 dark:bg-stone-800 px-1 py-0.5 rounded">Procfile</code> and Heroku Manifest (<code className="font-mono bg-gray-100 dark:bg-stone-800 px-1 py-0.5 rounded">app.json</code>):
                </p>

                <div className="p-3 rounded-lg bg-stone-950 text-stone-200 font-mono text-xs space-y-1">
                  <div className="text-stone-500"># Procfile</div>
                  <div className="text-emerald-400">web: npm start</div>
                </div>

                <div className="p-3 rounded-lg bg-stone-950 text-stone-200 font-mono text-xs space-y-1">
                  <div className="text-stone-500"># package.json engines</div>
                  <div className="text-purple-300">&#123; &quot;engines&quot;: &#123; &quot;node&quot;: &quot;&gt;=20.0.0&quot; &#125; &#125;</div>
                </div>
              </div>

              {/* Required Heroku Config Vars */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                  Heroku Config Vars (Environment Variables)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-gray-200 dark:border-stone-800 text-gray-500">
                      <tr>
                        <th className="py-2 font-semibold">Key</th>
                        <th className="py-2 font-semibold">Source</th>
                        <th className="py-2 font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-stone-800 font-mono text-[11px]">
                      <tr>
                        <td className="py-2 font-bold text-purple-600 dark:text-purple-400">DATABASE_URL</td>
                        <td className="py-2 text-emerald-600 dark:text-emerald-400">Automatic (Postgres Addon)</td>
                        <td className="py-2 font-sans text-gray-600 dark:text-stone-400">Heroku Postgres connection string</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-bold text-purple-600 dark:text-purple-400">PORT</td>
                        <td className="py-2 text-emerald-600 dark:text-emerald-400">Automatic (Heroku Dyno)</td>
                        <td className="py-2 font-sans text-gray-600 dark:text-stone-400">Dynamically bound by web process</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-bold text-purple-600 dark:text-purple-400">TITAN_EMAIL</td>
                        <td className="py-2 text-stone-500">Manual / Settings</td>
                        <td className="py-2 font-sans text-gray-600 dark:text-stone-400">SMTP email sender for meeting invites</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-bold text-purple-600 dark:text-purple-400">TITAN_PASSWORD</td>
                        <td className="py-2 text-stone-500">Manual / Settings</td>
                        <td className="py-2 font-sans text-gray-600 dark:text-stone-400">Titan SMTP application password</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-bold text-purple-600 dark:text-purple-400">GEMINI_API_KEY</td>
                        <td className="py-2 text-stone-500">Manual / Optional</td>
                        <td className="py-2 font-sans text-gray-600 dark:text-stone-400">AI Resume parser &amp; Question synthesis</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-stone-400">
                  Heroku PostgreSQL schema initialized automatically:
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      `-- Table: candidates\nCREATE TABLE IF NOT EXISTS candidates (\n  id VARCHAR(64) PRIMARY KEY,\n  name TEXT NOT NULL,\n  email TEXT,\n  phone TEXT,\n  location TEXT,\n  country TEXT,\n  city TEXT,\n  timezone TEXT,\n  timezone_label TEXT,\n  position TEXT,\n  status VARCHAR(32) DEFAULT 'Pending',\n  hiring_round VARCHAR(64) DEFAULT 'Screening',\n  original_availability TEXT,\n  suggested_pkt_time TEXT,\n  duration_minutes INT DEFAULT 45,\n  meet_link TEXT,\n  notes TEXT,\n  resume_link TEXT,\n  linkedin_url TEXT,\n  github_url TEXT,\n  portfolio_url TEXT,\n  ai_summary TEXT,\n  ai_skills TEXT,\n  ai_rating TEXT,\n  scorecard JSONB,\n  activities JSONB,\n  ai_questions JSONB,\n  user_id TEXT,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);\n\n-- Table: user_settings\nCREATE TABLE IF NOT EXISTS user_settings (\n  user_id VARCHAR(128) PRIMARY KEY,\n  email_template TEXT,\n  interviewer_emails TEXT,\n  default_duration_minutes INT,\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);`,
                      'sql_schema'
                    )
                  }
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium"
                >
                  {copiedKey === 'sql_schema' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy SQL DDL
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-stone-950 text-emerald-400 text-xs font-mono overflow-x-auto leading-relaxed max-h-96">
{`-- Table: candidates
CREATE TABLE IF NOT EXISTS candidates (
  id VARCHAR(64) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  country TEXT,
  city TEXT,
  timezone TEXT,
  timezone_label TEXT,
  position TEXT,
  status VARCHAR(32) DEFAULT 'Pending',
  hiring_round VARCHAR(64) DEFAULT 'Screening',
  original_availability TEXT,
  suggested_pkt_time TEXT,
  duration_minutes INT DEFAULT 45,
  meet_link TEXT,
  notes TEXT,
  resume_link TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  ai_summary TEXT,
  ai_skills TEXT,
  ai_rating TEXT,
  scorecard JSONB,
  activities JSONB,
  ai_questions JSONB,
  user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: user_settings
CREATE TABLE IF NOT EXISTS user_settings (
  user_id VARCHAR(128) PRIMARY KEY,
  email_template TEXT,
  interviewer_emails TEXT,
  default_duration_minutes INT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Procfile, app.json, and PostgreSQL auto-initialization ready</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold dark:bg-white dark:text-black dark:hover:bg-stone-200 transition"
          >
            Close Hub
          </button>
        </div>
      </div>
    </div>
  );
};
