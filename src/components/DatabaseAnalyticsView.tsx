import React, { useState, useEffect } from 'react';
import { Candidate, UserPresence } from '../types';
import { UserSettings, updateUserSettings } from '../lib/firebase-operations';
import { testFirestoreConnection } from '../lib/firebase';
import { getHerokuDbStatus, HerokuDbStatus } from '../lib/heroku-db';
import { HARD_BLOCKED_EMAILS } from '../lib/auth';
import { exportCandidatesToCsv } from '../lib/export-utils';
import { useTheme } from '../lib/theme';
import {
  Database,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Server,
  Mail,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  Clock,
  Key,
  HardDrive,
  FileSpreadsheet,
  Check,
  Radio,
  FileCode,
  UserX,
  Layers,
} from 'lucide-react';

interface DatabaseAnalyticsViewProps {
  candidates: Candidate[];
  dbConnected: boolean;
  presences: UserPresence[];
  userSettings: UserSettings | null;
  currentUserId?: string;
  onOpenBulkAdd: () => void;
  onOpenSettings: () => void;
  onOpenHerokuDeploy?: () => void;
}

export const DatabaseAnalyticsView: React.FC<DatabaseAnalyticsViewProps> = ({
  candidates,
  dbConnected: initialDbConnected,
  presences,
  userSettings,
  currentUserId,
  onOpenBulkAdd,
  onOpenSettings,
  onOpenHerokuDeploy,
}) => {
  const { colors } = useTheme();
  const [testingDb, setTestingDb] = useState(false);
  const [dbStatus, setDbStatus] = useState<boolean>(initialDbConnected);
  const [lastTestedTime, setLastTestedTime] = useState<string>(new Date().toLocaleTimeString());
  const [copiedRule, setCopiedRule] = useState(false);
  const [emailConfig, setEmailConfig] = useState<{ configured: boolean; email: string; provider: string } | null>(null);
  const [loadingEmailConfig, setLoadingEmailConfig] = useState(false);
  const [herokuDb, setHerokuDb] = useState<HerokuDbStatus | null>(null);
  const [loadingHerokuDb, setLoadingHerokuDb] = useState(false);

  const fetchEmailConfig = async () => {
    setLoadingEmailConfig(true);
    try {
      const res = await fetch('/api/email-config');
      if (res.ok) {
        const data = await res.json();
        setEmailConfig(data);
      }
    } catch (e) {
      console.warn('Failed to fetch email-config:', e);
    } finally {
      setLoadingEmailConfig(false);
    }
  };

  const fetchHerokuStatus = async () => {
    setLoadingHerokuDb(true);
    try {
      const status = await getHerokuDbStatus();
      setHerokuDb(status);
    } catch (e) {
      console.warn('Failed to fetch heroku db status:', e);
    } finally {
      setLoadingHerokuDb(false);
    }
  };

  useEffect(() => {
    fetchEmailConfig();
    fetchHerokuStatus();
  }, []);

  const handleTestConnection = async () => {
    setTestingDb(true);
    try {
      const ok = await testFirestoreConnection();
      setDbStatus(ok);
      setLastTestedTime(new Date().toLocaleTimeString());
    } catch (e) {
      setDbStatus(false);
    } finally {
      setTestingDb(false);
    }
  };

  const handleExportFullJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(candidates, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `recruit_sync_database_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Stats calculation
  const statusCounts = candidates.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const scheduledWithMeet = candidates.filter((c) => Boolean(c.meetLink)).length;
  const scorecardsCount = candidates.filter((c) => Boolean(c.scorecard)).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Overview Banner */}
      <div className={`p-5 sm:p-6 rounded-2xl border ${colors.cardBg} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-lg font-bold font-display ${colors.textPrimary}`}>
                Firebase Firestore &amp; System Infrastructure
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dbStatus ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                {dbStatus ? 'Operational' : 'Attention Required'}
              </span>
            </div>
            <p className={`text-xs ${colors.textSecondary} mt-0.5`}>
              Real-time multi-client document synchronization, Titan Mail SMTP dispatcher, and Firestore RBAC access rules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingDb}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border ${colors.border} ${colors.subtleBg} ${colors.textPrimary} hover:brightness-95 transition-all cursor-pointer disabled:opacity-50`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{testingDb ? 'Pinging DB...' : 'Ping Firestore'}</span>
          </button>
          {onOpenHerokuDeploy && (
            <button
              type="button"
              onClick={onOpenHerokuDeploy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all cursor-pointer"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Heroku &amp; DB Hub</span>
            </button>
          )}
        </div>
      </div>

      {/* Heroku Postgres Production Banner */}
      <div className={`p-5 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/50 dark:from-purple-950/20 dark:via-stone-900 dark:to-indigo-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Heroku &amp; Heroku Postgres Backend
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                herokuDb?.connected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300'
              }`}>
                {herokuDb?.connected ? 'Postgres Active' : 'Standby / Ready'}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-stone-300 mt-0.5">
              Dyno Procfile configured, PostgreSQL DDL schema auto-initialized, and full REST CRUD endpoints live at <code className="font-mono bg-purple-100 dark:bg-purple-900/40 px-1 py-0.2 rounded text-[11px]">/api/candidates</code>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchHerokuStatus}
            disabled={loadingHerokuDb}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-gray-700 dark:text-stone-200 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHerokuDb ? 'animate-spin text-purple-600' : ''}`} />
            <span>Ping Heroku DB</span>
          </button>
          {onOpenHerokuDeploy && (
            <button
              type="button"
              onClick={onOpenHerokuDeploy}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Deploy &amp; Sync Guide</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Firestore Live Sync Status */}
        <div className={`p-5 rounded-2xl border ${colors.cardBg} space-y-3`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${colors.textSecondary} flex items-center gap-1.5`}>
              <Activity className="w-4 h-4 text-emerald-600" />
              Realtime Database Sync
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className={colors.textSecondary}>Engine:</span>
              <span className={`font-semibold ${colors.textPrimary}`}>Google Cloud Firestore</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={colors.textSecondary}>Sync Mode:</span>
              <span className="font-semibold text-emerald-600">WebSocket / onSnapshot</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={colors.textSecondary}>Total Documents:</span>
              <span className={`font-bold font-mono ${colors.textPrimary}`}>{candidates.length} records</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={colors.textSecondary}>Last Ping:</span>
              <span className={`font-mono text-[11px] ${colors.textMuted}`}>{lastTestedTime}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Titan Mail Corporate Server */}
        <div className={`p-5 rounded-2xl border ${colors.cardBg} space-y-3`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${colors.textSecondary} flex items-center gap-1.5`}>
              <Mail className="w-4 h-4 text-blue-600" />
              Corporate Dispatcher
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${emailConfig?.configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                emailConfig?.configured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {emailConfig?.configured ? 'Active & Configured' : 'Credentials Pending'}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className={colors.textSecondary}>Sender Address:</span>
              <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {emailConfig?.email || 'hr@mihora.tech'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={colors.textSecondary}>SMTP Host:</span>
              <span className={`font-mono text-xs ${colors.textPrimary}`}>smtp.titan.email:465</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={colors.textSecondary}>Status:</span>
              <span className={`font-semibold ${emailConfig?.configured ? 'text-emerald-600' : 'text-amber-600'}`}>
                {emailConfig?.configured ? 'Automated SMTP Ready' : 'Awaiting Environment Keys'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={colors.textSecondary}>Verification:</span>
              <button
                type="button"
                onClick={fetchEmailConfig}
                disabled={loadingEmailConfig}
                className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${loadingEmailConfig ? 'animate-spin' : ''}`} />
                <span>{loadingEmailConfig ? 'Checking...' : 'Check Status'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Security & Access Control */}
        <div className={`p-5 rounded-2xl border ${colors.cardBg} space-y-3`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${colors.textSecondary} flex items-center gap-1.5`}>
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Access Control &amp; RBAC
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
              {HARD_BLOCKED_EMAILS.length} Hard Blocked
            </span>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className={colors.textSecondary}>Rules Layer:</span>
              <span className="font-semibold text-emerald-600">Firestore Security Rules</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={colors.textSecondary}>Auth Gate:</span>
              <span className="font-semibold text-indigo-600">Firebase Auth + Hard Blacklist</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={colors.textSecondary}>Calendar Tokens:</span>
              <span className={`font-semibold ${colors.textPrimary}`}>Client-Side Isolated</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={colors.textSecondary}>Workspace Scopes:</span>
              <span className={`font-semibold ${colors.textPrimary}`}>Calendar &amp; Meet Sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* Database Backup, Export, and Import Tools */}
      <div className={`p-5 sm:p-6 rounded-2xl border ${colors.cardBg} space-y-4`}>
        <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-stone-800 pb-3">
          <div>
            <h3 className={`text-sm font-bold ${colors.textPrimary} flex items-center gap-2`}>
              <HardDrive className="w-4 h-4 text-indigo-600" />
              Data Backup &amp; Pipeline Migration Tools
            </h3>
            <p className={`text-xs ${colors.textMuted} mt-0.5`}>
              Export your full pipeline to Excel / CSV or JSON backup, or import candidates via AI parser.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => exportCandidatesToCsv(candidates)}
            className={`p-4 rounded-xl border ${colors.border} ${colors.subtleBg} hover:brightness-95 flex flex-col items-start gap-2 transition-all cursor-pointer text-left`}
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className={`text-xs font-bold ${colors.textPrimary}`}>Export Full CSV / Excel</div>
              <div className={`text-[11px] ${colors.textMuted} mt-0.5`}>Complete dataset with all candidate fields &amp; notes</div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleExportFullJson}
            className={`p-4 rounded-xl border ${colors.border} ${colors.subtleBg} hover:brightness-95 flex flex-col items-start gap-2 transition-all cursor-pointer text-left`}
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className={`text-xs font-bold ${colors.textPrimary}`}>Export JSON Database Backup</div>
              <div className={`text-[11px] ${colors.textMuted} mt-0.5`}>Raw structured JSON for backup or database restoration</div>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenBulkAdd}
            className={`p-4 rounded-xl border ${colors.border} ${colors.subtleBg} hover:brightness-95 flex flex-col items-start gap-2 transition-all cursor-pointer text-left`}
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <div className={`text-xs font-bold ${colors.textPrimary}`}>Import Candidates with AI</div>
              <div className={`text-[11px] ${colors.textMuted} mt-0.5`}>Bulk parse resumes, CSV text, and candidate rosters</div>
            </div>
          </button>
        </div>
      </div>

      {/* Security Rules & Hard-Blocked Accounts Detailed Monitor */}
      <div className={`p-5 sm:p-6 rounded-2xl border ${colors.cardBg} space-y-4`}>
        <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-stone-800 pb-3">
          <div>
            <h3 className={`text-sm font-bold ${colors.textPrimary} flex items-center gap-2`}>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Hard-Blocked Accounts &amp; Security Enforcement Layer
            </h3>
            <p className={`text-xs ${colors.textMuted} mt-0.5`}>
              These accounts are prohibited from reading, writing, or accessing database collections.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-full">
            Active Security Rules
          </span>
        </div>

        <div className="space-y-2">
          {HARD_BLOCKED_EMAILS.map((email) => (
            <div
              key={email}
              className="flex items-center justify-between p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <UserX className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-mono font-bold text-rose-950">{email}</span>
                  <div className="text-[10px] text-rose-700">Blocked at Auth Gate &amp; Firestore Security Rules Layer</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-rose-800 bg-white border border-rose-300 px-2 py-1 rounded-md">
                DENY ALL ACCESS
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Team Realtime Presence Details */}
      <div className={`p-5 sm:p-6 rounded-2xl border ${colors.cardBg} space-y-4`}>
        <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-stone-800 pb-3">
          <div>
            <h3 className={`text-sm font-bold ${colors.textPrimary} flex items-center gap-2`}>
              <Users className="w-4 h-4 text-emerald-600" />
              Active Team Collaboration Radar ({presences.length} Online)
            </h3>
            <p className={`text-xs ${colors.textMuted} mt-0.5`}>
              Live presence heartbeat broadcasted every 20 seconds to coordinate interview panels.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {presences.map((p) => {
            const isSelf = p.userId === currentUserId;
            return (
              <div
                key={p.userId}
                className={`p-3.5 rounded-xl border ${isSelf ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20' : `${colors.border} ${colors.subtleBg}`} space-y-1.5`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className={`text-xs font-bold ${colors.textPrimary} truncate max-w-[150px]`}>
                      {p.userName || p.userEmail}
                    </span>
                  </div>
                  {isSelf && (
                    <span className="text-[9px] font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded">
                      YOU
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-stone-500 flex items-center justify-between">
                  <span>Current View:</span>
                  <span className="font-semibold text-stone-700 dark:text-stone-300">{p.currentView || 'Dashboard'}</span>
                </div>
                <div className="text-[10px] text-stone-400">
                  {p.userEmail}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
