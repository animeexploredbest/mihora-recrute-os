import React, { useState, useEffect } from 'react';
import {
  X,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertCircle,
  Clock,
  Sparkles,
  Link,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../lib/theme';
import {
  GoogleTaskItem,
  listGoogleTasks,
  createGoogleTask,
  updateGoogleTaskStatus,
  deleteGoogleTask,
} from '../lib/google-api';
import { getAccessToken, requestCalendarAccess } from '../lib/auth';

interface GoogleTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCalendarConnected: boolean;
  onConnectCalendar: () => Promise<void>;
}

export const GoogleTasksModal: React.FC<GoogleTasksModalProps> = ({
  isOpen,
  onClose,
  isCalendarConnected,
  onConnectCalendar,
}) => {
  const { colors } = useTheme();
  const [tasks, setTasks] = useState<GoogleTaskItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [submittingTask, setSubmittingTask] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Destructive deletion confirmation state
  const [taskToDelete, setTaskToDelete] = useState<GoogleTaskItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchTasks = async () => {
    const token = await getAccessToken();
    if (!token) {
      setTasks([]);
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const items = await listGoogleTasks(token);
      setTasks(items);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch tasks from Google Tasks.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen, isCalendarConnected]);

  const handleToggleTask = async (task: GoogleTaskItem) => {
    const token = await getAccessToken();
    if (!token) return;

    const newStatus = task.status === 'completed' ? false : true;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: newStatus ? 'completed' : 'needsAction' }
          : t
      )
    );

    try {
      await updateGoogleTaskStatus(token, task.id, newStatus);
    } catch (err) {
      console.error('Failed to update task:', err);
      // Revert on failure
      fetchTasks();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const token = await getAccessToken();
    if (!token) {
      setErrorMsg('Please connect your Google Account first.');
      return;
    }

    setSubmittingTask(true);
    setErrorMsg(null);
    try {
      const created = await createGoogleTask(token, {
        title: newTitle.trim(),
        notes: newNotes.trim() || undefined,
        due: newDueDate ? new Date(newDueDate).toISOString() : undefined,
      });

      if (created) {
        setTasks((prev) => [created, ...prev]);
        setNewTitle('');
        setNewNotes('');
        setNewDueDate('');
        setIsCreating(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create task in Google Tasks.');
    } finally {
      setSubmittingTask(false);
    }
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    const token = await getAccessToken();
    if (!token) return;

    setIsDeleting(true);
    try {
      await deleteGoogleTask(token, taskToDelete.id);
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      setTaskToDelete(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete task.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return t.status !== 'completed';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${colors.cardBg} ${colors.border}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-bold font-display ${colors.textPrimary}`}>
                  Google Tasks &amp; Follow-ups
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Live Sync
                </span>
              </div>
              <p className={`text-xs ${colors.textMuted}`}>
                Candidate interviews and recruitment tasks synced to your Google Workspace account
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://tasks.google.com"
              target="_blank"
              rel="noopener noreferrer"
              title="Open Google Tasks in new tab"
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all hover:bg-stone-100 dark:hover:bg-stone-800 ${colors.border} ${colors.textSecondary}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">tasks.google.com</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Calendar / Workspace Connection Alert */}
          {!isCalendarConnected ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">Google Tasks Connection Inactive</p>
                  <p className="opacity-90">
                    Connect your Google Account to view and sync interview follow-up tasks.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onConnectCalendar}
                className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Connect Google Tasks</span>
              </button>
            </div>
          ) : null}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-stone-400 hover:text-stone-700 text-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Action Row & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filter === 'pending'
                    ? 'bg-white dark:bg-stone-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                Pending ({tasks.filter((t) => t.status !== 'completed').length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('completed')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filter === 'completed'
                    ? 'bg-white dark:bg-stone-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                Completed ({tasks.filter((t) => t.status === 'completed').length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                All ({tasks.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchTasks}
                disabled={isLoading}
                title="Refresh tasks from Google"
                className={`p-2 rounded-xl border text-xs transition-all hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer ${colors.border} ${colors.textSecondary}`}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(!isCreating)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{isCreating ? 'Cancel' : 'New Task'}</span>
              </button>
            </div>
          </div>

          {/* New Task Form */}
          {isCreating && (
            <form
              onSubmit={handleCreateTask}
              className={`p-4 rounded-2xl border space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 ${colors.subtleBg} ${colors.border}`}
            >
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-bold font-display ${colors.textPrimary}`}>
                  Create New Google Task
                </h4>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                  Direct sync to @default task list
                </span>
              </div>

              <div>
                <input
                  type="text"
                  required
                  placeholder="Task title (e.g., Review Sarah Jenkins Code Test)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${colors.cardBg} ${colors.border} ${colors.textPrimary}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${colors.textMuted}`}>
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${colors.cardBg} ${colors.border} ${colors.textPrimary}`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${colors.textMuted}`}>
                    Notes / Candidate Reference
                  </label>
                  <input
                    type="text"
                    placeholder="Candidate email, position, or links..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className={`w-full px-3.5 py-1.5 rounded-xl border text-xs focus:outline-none ${colors.cardBg} ${colors.border} ${colors.textPrimary}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTask || !newTitle.trim()}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingTask ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Google...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Google Tasks</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Task List */}
          {isLoading && tasks.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs">Fetching Google Tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-stone-200 dark:border-stone-800">
              <CheckSquare className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-700 mb-2" />
              <p className={`text-sm font-semibold ${colors.textPrimary}`}>
                No {filter !== 'all' ? filter : ''} tasks found
              </p>
              <p className={`text-xs ${colors.textMuted} mt-1 max-w-sm mx-auto`}>
                Scheduled interview follow-ups will automatically appear here and sync to your Google Tasks account.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTasks.map((task) => {
                const isDone = task.status === 'completed';
                return (
                  <div
                    key={task.id}
                    className={`group p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                      isDone
                        ? 'opacity-60 bg-stone-50 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800'
                        : `${colors.subtleBg} ${colors.borderLight} hover:border-blue-400/40`
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task)}
                      className="mt-0.5 shrink-0 text-stone-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      title={isDone ? 'Mark as pending' : 'Mark as complete'}
                    >
                      {isDone ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5 text-stone-400 hover:text-blue-500" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs sm:text-sm font-semibold leading-snug ${
                          isDone ? 'line-through text-stone-400 dark:text-stone-500' : colors.textPrimary
                        }`}
                      >
                        {task.title}
                      </p>

                      {task.notes && (
                        <p className={`text-xs mt-1 whitespace-pre-line leading-relaxed ${colors.textMuted}`}>
                          {task.notes}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-stone-400">
                        {task.due && (
                          <span className="flex items-center gap-1 font-mono text-blue-600 dark:text-blue-400">
                            <Clock className="w-3 h-3" />
                            <span>Due: {new Date(task.due).toLocaleDateString()}</span>
                          </span>
                        )}
                        {isDone && task.completed && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Done</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTaskToDelete(task)}
                      title="Delete task from Google Tasks"
                      className="p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200/80 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between text-xs text-stone-500">
          <span>Synced directly via Google Tasks REST API</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border bg-white dark:bg-stone-900 hover:bg-stone-100 text-stone-700 dark:text-stone-200 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog for Destructive Delete */}
      {taskToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Delete Google Task?</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete the task{' '}
              <strong className="text-white">"{taskToDelete.title}"</strong> from your Google Tasks account? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteTask}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Task</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
