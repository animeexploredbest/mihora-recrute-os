import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  Calendar,
  CalendarClock,
  Mail,
  Clock,
  Video,
  LogOut,
  Loader2,
  UserPlus,
  CalendarPlus,
  Settings,
  Edit,
  FileText,
  Search,
  LayoutDashboard,
  List,
  Sparkles,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Filter,
  RefreshCw,
  Globe,
  X,
  AlertTriangle,
  Users,
  UserCheck,
  Maximize2,
  Minimize2,
  MessageCircle,
  Award,
  Bell,
  Download,
  Printer,
  CheckSquare,
  Square,
  Linkedin,
  Github,
  Check,
  Database,
  Server,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Scale,
  History,
  FastForward,
  Zap,
  Link as LinkIcon,
  GraduationCap,
} from 'lucide-react';

import { initAuth, googleSignIn, logout, getAccessToken, hasCalendarAccess, requestCalendarAccess, clearCachedAccessToken } from './lib/auth';
import { verifyRealGoogleCalendarAccess, CalendarVerificationResult } from './lib/calendar-verifier';
import { scheduleInterview, deleteCalendarEvent } from './lib/google-api';
import {
  subscribeCandidates,
  addCandidate,
  updateCandidate,
  deleteCandidate,
  recordReminderSent,
  getUserSettings,
  UserSettings,
  updateUserPresence,
  setUserOffline,
  subscribeLivePresence,
  advanceCandidateRound,
  logCandidateActivity,
} from './lib/firebase-operations';
import { testFirestoreConnection } from './lib/firebase';
import { Candidate, InterviewScorecard, UserPresence, HiringRound } from './types';
import { CandidateModal } from './components/CandidateModal';
import { SettingsModal } from './components/SettingsModal';
import { BulkAddModal } from './components/BulkAddModal';
import { ScheduleModal } from './components/ScheduleModal';
import { GlobalGeoDashboard } from './components/GlobalGeoDashboard';
import { WhatsAppShareModal } from './components/WhatsAppShareModal';
import { ScorecardModal } from './components/ScorecardModal';
import { ReminderModal } from './components/ReminderModal';
import { CalendarScheduleView } from './components/CalendarScheduleView';
import { DatabaseAnalyticsView } from './components/DatabaseAnalyticsView';
import { AnalyticsView } from './components/AnalyticsView';
import { KanbanBoardView } from './components/KanbanBoardView';
import { CandidateRowCard } from './components/CandidateRowCard';
import { SystemStatusPopover } from './components/SystemStatusPopover';
import { UserProfileMenu } from './components/UserProfileMenu';
import { WorldClockBar } from './components/WorldClockBar';
import { LiveTeamPresence } from './components/LiveTeamPresence';
import { CandidateActivityTimelineModal } from './components/CandidateActivityTimelineModal';
import { CandidateSelfBookingPortal } from './components/CandidateSelfBookingPortal';
import { HerokuDeployModal } from './components/HerokuDeployModal';
import { CandidateComparisonModal } from './components/CandidateComparisonModal';
import { AutoSchedulerModal } from './components/AutoSchedulerModal';
import { AiBulkIntakeModal } from './components/AiBulkIntakeModal';
import { BulkStudentInviteModal } from './components/BulkStudentInviteModal';
import { StaffManagerModal } from './components/StaffManagerModal';
import { GoogleTasksModal } from './components/GoogleTasksModal';
import { GoogleMeetModal } from './components/GoogleMeetModal';
import { ThemeSelector } from './components/ThemeSelector';
import { LoginPage } from './components/LoginPage';
import { subscribeToLiveSync } from './lib/cross-tab-sync';
import { useTheme } from './lib/theme';
import { formatPktDateTime, formatLocalDateTime, formatRelativeTime, isInterviewPast } from './lib/date-utils';
import { detectCandidateGeo } from './lib/geo-utils';
import { exportCandidatesToCsv, printCandidateSummaryReport } from './lib/export-utils';
import appLogoImg from './assets/images/app_logo_1789732302179.jpg';
import { getConflictCandidateIdSet } from './lib/conflict-detector';
import { getTrackById, DEFAULT_INTERVIEW_TRACKS } from './lib/track-constants';
import { MattiOmemaBatchModal } from './components/MattiOmemaBatchModal';

export default function App() {
  const { theme, colors } = useTheme();
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [dbConnected, setDbConnected] = useState(true);

  const [candidates, setCandidates] = useState<
    (Candidate & { isScheduling?: boolean; draftId?: string; error?: string })[]
  >([]);
  const [loadingData, setLoadingData] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | undefined>(undefined);
  const [schedulingCandidate, setSchedulingCandidate] = useState<Candidate | null>(null);
  const [scorecardCandidate, setScorecardCandidate] = useState<Candidate | null>(null);
  const [reminderCandidate, setReminderCandidate] = useState<Candidate | null>(null);
  const [timelineCandidate, setTimelineCandidate] = useState<Candidate | null>(null);
  const [selfBookingCandidate, setSelfBookingCandidate] = useState<Candidate | null>(null);
  const [showHerokuModal, setShowHerokuModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonCandidateIds, setComparisonCandidateIds] = useState<string[]>([]);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppCandidate, setWhatsAppCandidate] = useState<Candidate | undefined>(undefined);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [isDeletingCandidate, setIsDeletingCandidate] = useState(false);
  const [isAutoSchedulerOpen, setIsAutoSchedulerOpen] = useState(false);
  const [showAiBulkIntakeModal, setShowAiBulkIntakeModal] = useState(false);
  const [showStudentInviteModal, setShowStudentInviteModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showMeetModal, setShowMeetModal] = useState(false);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const toolsMenuRef = React.useRef<HTMLDivElement>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error'; undoAction?: () => void } | null>(null);

  // Batch Selection State
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [isMattiOmemaBatchModalOpen, setIsMattiOmemaBatchModalOpen] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success', undoAction?: () => void) => {
    setToastMessage({ text, type, undoAction });
    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roundFilter, setRoundFilter] = useState<string>('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'mine'>('all');
  const [viewMode, setViewMode] = useState<'candidates' | 'kanban' | 'calendar' | 'global' | 'analytics' | 'database'>('candidates');
  const [candidateDensity, setCandidateDensity] = useState<'compact' | 'detailed'>('compact');
  const [expandedCandidateIds, setExpandedCandidateIds] = useState<Set<string>>(new Set());
  const [showDirectoryMetrics, setShowDirectoryMetrics] = useState<boolean>(false);

  const toggleCandidateExpand = (id: string) => {
    setExpandedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const [isCalendarConnected, setIsCalendarConnected] = useState(hasCalendarAccess());
  const [calendarVerification, setCalendarVerification] = useState<CalendarVerificationResult | null>(null);
  const [isValidatingCalendar, setIsValidatingCalendar] = useState<boolean>(false);
  const [livePresences, setLivePresences] = useState<UserPresence[]>([]);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  // Calendar sync and slot focus states
  const [calendarAnchorDate, setCalendarAnchorDate] = useState<Date>(() => new Date());
  const [calendarHighlightId, setCalendarHighlightId] = useState<string | null>(null);

  // Fullscreen & Immersive Layout State
  const [isNativeFullscreen, setIsNativeFullscreen] = useState<boolean>(false);
  const [isWideLayout, setIsWideLayout] = useState<boolean>(() => {
    const saved = localStorage.getItem('recruit_sync_widescreen_v1');
    return saved !== null ? saved === 'true' : true; // Default to fluid full width
  });
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);

    const handleOutsideClick = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setShowToolsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const toggleNativeFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Browser fullscreen request fallback to fluid mode:', err);
      toggleWideLayout();
    }
  };

  const toggleWideLayout = () => {
    setIsWideLayout((prev) => {
      const next = !prev;
      localStorage.setItem('recruit_sync_widescreen_v1', String(next));
      return next;
    });
  };

  const containerWidthClass = isWideLayout
    ? 'w-full max-w-[1760px] 2xl:max-w-full mx-auto px-3 sm:px-6 lg:px-8 2xl:px-10'
    : 'max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8';

  // Connection check and Auth initialization
  useEffect(() => {
    testFirestoreConnection().then(ok => setDbConnected(ok));

    const unsubscribe = initAuth(
      async (currentUser, token) => {
        setUser(currentUser);
        setNeedsAuth(false);
        setAuthInitialized(true);
        setAuthErrorMessage(null);
        if (token) {
          // Perform live verification against Google Calendar API
          setIsValidatingCalendar(true);
          const verifyResult = await verifyRealGoogleCalendarAccess(token);
          setCalendarVerification(verifyResult);
          setIsValidatingCalendar(false);
          if (verifyResult.valid) {
            setIsCalendarConnected(true);
          } else {
            console.warn('Google Calendar token expired or invalid:', verifyResult.error);
            clearCachedAccessToken();
            setIsCalendarConnected(false);
          }
        } else {
          setIsCalendarConnected(false);
          setCalendarVerification(null);
        }
      },
      (errorMsg) => {
        setUser(null);
        setNeedsAuth(true);
        setAuthInitialized(true);
        setIsCalendarConnected(false);
        setCalendarVerification(null);
        if (errorMsg) {
          setAuthErrorMessage(errorMsg);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time Firestore synchronization when user is available
  useEffect(() => {
    if (!user) {
      setCandidates([]);
      return;
    }

    setLoadingData(true);

    // Initial settings load
    getUserSettings(user.uid).then((settings) => {
      if (settings) {
        setUserSettings(settings);
      } else {
        setUserSettings({
          emailTemplate: `Hi {name},\n\nWe are pleased to invite you to a technical interview for the {role} position.\n\nDate & Time (PKT / UTC+5): {date}\nLocal Time: {time}\nMeeting Link: {meetLink}\nInterview Panel (CC): {interviewers}\n\nPlease join 5 minutes prior to the scheduled time.\n\nBest regards,\nThe Hiring Team`,
          userId: user.uid,
          interviewerEmails: 'm.mattiulhasnain@gmail.com, mihora.tech@gmail.com',
        });
      }
    });

    // Real-time candidate sync via onSnapshot across shared workspace
    const unsubscribeSnapshot = subscribeCandidates(
      (liveCandidates) => {
        // Sort by scheduled time ascending
        liveCandidates.sort(
          (a, b) => new Date(a.suggestedPktTime).getTime() - new Date(b.suggestedPktTime).getTime()
        );
        setCandidates(liveCandidates);
        setLoadingData(false);
        setDbConnected(true);
      },
      (err) => {
        console.error('Realtime sync error:', err);
        setDbConnected(false);
        setLoadingData(false);
      }
    );

    // Real-time live presence subscription
    const unsubscribePresence = subscribeLivePresence(
      (presences) => {
        setLivePresences(presences);
      },
      (err) => {
        console.warn('Presence sync warning:', err);
      }
    );

    // Universal Cross-Tab & Cross-Device live broadcast subscription
    const unsubscribeLiveSync = subscribeToLiveSync((msg) => {
      if (msg.type === 'BATCH_SCHEDULE_COMPLETED') {
        showToast(
          `⚡ Live Sync: ${msg.payload?.count || ''} candidate interviews synchronized in real-time!`,
          'success'
        );
      }
    });

    // Broadcast current user presence
    const currentViewLabel =
      viewMode === 'global'
        ? 'Global 3D Telemetry'
        : viewMode === 'calendar'
        ? 'Calendar & Schedule'
        : viewMode === 'kanban'
        ? 'Pipeline Board'
        : viewMode === 'analytics'
        ? 'Analytics & Reports'
        : viewMode === 'database'
        ? 'Database & Infrastructure'
        : 'Candidate Directory';
    updateUserPresence(user, 'online', currentViewLabel);

    // Heartbeat every 20 seconds
    const heartbeatTimer = setInterval(() => {
      const isVisible = document.visibilityState === 'visible';
      updateUserPresence(
        user,
        isVisible ? 'online' : 'idle',
        viewMode === 'global'
          ? 'Global 3D Telemetry'
          : viewMode === 'calendar'
          ? 'Calendar & Schedule'
          : viewMode === 'kanban'
          ? 'Pipeline Board'
          : viewMode === 'analytics'
          ? 'Analytics & Reports'
          : viewMode === 'database'
          ? 'Database & Infrastructure'
          : 'Candidate Directory'
      );
    }, 20000);

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      updateUserPresence(
        user,
        isVisible ? 'online' : 'idle',
        viewMode === 'global'
          ? 'Global 3D Telemetry'
          : viewMode === 'calendar'
          ? 'Calendar & Schedule'
          : viewMode === 'kanban'
          ? 'Pipeline Board'
          : viewMode === 'database'
          ? 'Database & Infrastructure'
          : 'Candidate Directory'
      );
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleBeforeUnload = () => {
      setUserOffline(user.uid);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribeSnapshot();
      unsubscribePresence();
      unsubscribeLiveSync();
      clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setUserOffline(user.uid);
    };
  }, [user, viewMode]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        setIsCalendarConnected(!!result.accessToken);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setAuthErrorMessage(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (user?.uid) {
      await setUserOffline(user.uid);
    }
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setIsCalendarConnected(false);
    setCandidates([]);
  };

  const handleConnectCalendar = async () => {
    try {
      setIsValidatingCalendar(true);
      const token = await requestCalendarAccess();
      if (token) {
        // Call Google Calendar API live to verify access
        const verifyResult = await verifyRealGoogleCalendarAccess(token);
        setCalendarVerification(verifyResult);
        if (verifyResult.valid) {
          setIsCalendarConnected(true);
          showToast(`Verified Google Calendar connected (${verifyResult.summary || 'Primary'})`, 'success');
        } else {
          setIsCalendarConnected(false);
          clearCachedAccessToken();
          showToast(`Calendar verification notice: ${verifyResult.error}`, 'error');
        }
      }
    } catch (err: any) {
      setIsCalendarConnected(false);
      clearCachedAccessToken();
      showToast(err.message || 'Could not connect Google Calendar.', 'error');
    } finally {
      setIsValidatingCalendar(false);
    }
  };

  const handleVerifyCalendar = async () => {
    const token = await getAccessToken();
    if (!token) {
      setIsCalendarConnected(false);
      showToast('No active Google token. Click "Connect Calendar" to authenticate.', 'error');
      return;
    }
    setIsValidatingCalendar(true);
    try {
      const verifyResult = await verifyRealGoogleCalendarAccess(token);
      setCalendarVerification(verifyResult);
      if (verifyResult.valid) {
        setIsCalendarConnected(true);
        showToast(`Real Google Calendar Live: "${verifyResult.summary || 'Primary'}" (${verifyResult.timeZone || 'UTC'})`, 'success');
      } else {
        setIsCalendarConnected(false);
        clearCachedAccessToken();
        showToast(`Calendar session expired. Click "Connect Calendar" to refresh permissions.`, 'error');
      }
    } catch (err: any) {
      setIsCalendarConnected(false);
      clearCachedAccessToken();
      showToast(`Verification error: ${err.message}`, 'error');
    } finally {
      setIsValidatingCalendar(false);
    }
  };

  const handleSaveCandidate = async (data: Omit<Candidate, 'id'>, shouldViewInCalendar?: boolean) => {
    if (!user) return;
    try {
      const candidateData = {
        ...data,
        userId: editingCandidate?.userId || user.uid,
        createdByEmail: editingCandidate?.createdByEmail || user.email || '',
        createdByName: editingCandidate?.createdByName || user.displayName || 'Team Member',
      };
      let savedCandidateId = editingCandidate?.id;
      if (editingCandidate?.id) {
        await updateCandidate(editingCandidate.id, candidateData);
        setCandidates((prev) =>
          prev.map((c) => (c.id === editingCandidate.id ? { ...c, ...candidateData } : c))
        );
        showToast(`Candidate "${data.name}" updated successfully.`, 'success');
      } else {
        const added = await addCandidate(candidateData);
        savedCandidateId = added?.id;
        if (savedCandidateId) {
          const newDoc: Candidate = {
            ...candidateData,
            id: savedCandidateId,
          };
          setCandidates((prev) => [newDoc, ...prev]);
        }
        showToast(`Candidate "${data.name}" added successfully.`, 'success');
      }

      if (data.suggestedPktTime) {
        const d = new Date(data.suggestedPktTime);
        if (!isNaN(d.getTime())) {
          setCalendarAnchorDate(d);
        }
      }

      setShowCandidateModal(false);
      setEditingCandidate(undefined);

      // If user requested to view in calendar or if scheduled with a slot
      if (shouldViewInCalendar || (data.status === 'Scheduled' && data.suggestedPktTime && shouldViewInCalendar !== false)) {
        if (savedCandidateId) {
          setCalendarHighlightId(savedCandidateId);
          setTimeout(() => setCalendarHighlightId(null), 5000);
        }
        setViewMode('calendar');
      }
    } catch (error: any) {
      console.error('Error saving candidate', error);
      showToast(`Failed to save candidate: ${error?.message || 'Database error'}`, 'error');
      throw error;
    }
  };

  const handleViewInCalendar = (candidate: Candidate) => {
    if (candidate.suggestedPktTime) {
      const d = new Date(candidate.suggestedPktTime);
      if (!isNaN(d.getTime())) {
        setCalendarAnchorDate(d);
      }
    }
    setCalendarHighlightId(candidate.id || null);
    setViewMode('calendar');
    setTimeout(() => {
      setCalendarHighlightId(null);
    }, 6000);
  };

  const handleDirectBookSlot = async (candidateId: string, slotIso: string, trackId: string) => {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return;
    const track = getTrackById(trackId);
    
    // Instant optimistic update for immediate feedback
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId
          ? {
              ...c,
              suggestedPktTime: slotIso,
              status: 'Scheduled',
              trackId: track.id,
              trackName: track.name,
            }
          : c
      )
    );
    setCalendarHighlightId(candidateId);
    const d = new Date(slotIso);
    if (!isNaN(d.getTime())) {
      setCalendarAnchorDate(d);
    }
    setTimeout(() => setCalendarHighlightId(null), 4000);

    try {
      await updateCandidate(candidateId, {
        suggestedPktTime: slotIso,
        status: 'Scheduled',
        trackId: track.id,
        trackName: track.name,
      });
      await logCandidateActivity(candidateId, {
        type: 'scheduled',
        title: `Booked into ${track.shortCode} Slot`,
        details: `Assigned to ${track.name} at ${formatPktDateTime(slotIso)}`,
        actor: user?.displayName || user?.email || 'Recruiter',
      });
      showToast(`Candidate "${candidate.name}" booked into ${track.shortCode} slot!`, 'success');
    } catch (err: any) {
      console.error('Direct booking failed:', err);
      showToast(`Direct booking failed: ${err.message || 'Database error'}`, 'error');
    }
  };

  const handleDeleteCandidate = async (id: string, candidateData?: Candidate) => {
    const candidate = candidateData || candidates.find((c) => c.id === id);
    setIsDeletingCandidate(true);
    try {
      // Optimistically remove from state for instant responsiveness
      setCandidates((prev) => prev.filter((c) => c.id !== id));

      // If they had a scheduled calendar event, attempt to cancel it in background
      try {
        const token = await getAccessToken();
        if (token && candidate?.calendarEventId) {
          await deleteCalendarEvent(token, candidate.calendarEventId);
        }
      } catch (calErr) {
        console.warn('Could not cancel calendar event for deleted candidate:', calErr);
      }

      // Delete document from Firestore
      await deleteCandidate(id);

      setShowCandidateModal(false);
      setEditingCandidate(undefined);
      setCandidateToDelete(null);
      showToast(`Candidate "${candidate?.name || 'Record'}" was deleted successfully.`, 'success');
    } catch (error: any) {
      console.error('Error deleting candidate:', error);
      showToast(`Failed to delete candidate: ${error?.message || 'Database error'}`, 'error');
    } finally {
      setIsDeletingCandidate(false);
    }
  };

  const handleAttachMeetToCandidate = async (candidateId: string, meetLink: string) => {
    try {
      await updateCandidate(candidateId, { meetLink });
      showToast('Google Meet room successfully linked to candidate.', 'success');
    } catch (e: any) {
      showToast(`Failed to link Meet room: ${e.message}`, 'error');
    }
  };

  const handleSaveBulkCandidates = async (
    candidatesData: Omit<Candidate, 'id' | 'userId' | 'meetLink'>[]
  ) => {
    if (!user) return;
    try {
      for (const data of candidatesData) {
        await addCandidate({
          ...data,
          userId: user.uid,
          createdByEmail: user.email || '',
          createdByName: user.displayName || 'Team Member',
        });
      }
      showToast(`${candidatesData.length} candidate(s) imported successfully!`, 'success');
    } catch (error) {
      console.error('Error saving bulk candidates', error);
      showToast('Failed to save some candidates to database.', 'error');
    }
  };

  const handleScheduleFromModal = async (
    candidateId: string,
    draftMode: boolean,
    scheduledIsoTime: string,
    customTemplate?: string,
    interviewerEmails?: string,
    isReschedule?: boolean,
    durationMinutes?: number,
    trackId?: string,
    trackName?: string
  ): Promise<{
    success: boolean;
    meetLink?: string;
    error?: string;
    calendarInviteSent?: boolean;
    gmailComposeUrl?: string;
    emailSent?: boolean;
    senderEmail?: string;
  }> => {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return { success: false, error: 'Candidate not found' };

    const effectiveIsReschedule =
      isReschedule ??
      (candidate.status === 'Scheduled' ||
        candidate.status === 'Rescheduled' ||
        Boolean(candidate.meetLink));

    const safeDuration =
      durationMinutes ||
      candidate.durationMinutes ||
      userSettings?.defaultDurationMinutes ||
      45;

    let token = (await getAccessToken()) || '';

    try {
      let result;
      try {
        result = await scheduleInterview(
          token,
          candidate.name,
          candidate.email,
          scheduledIsoTime,
          candidate.position || 'Technical Interview',
          draftMode,
          customTemplate || userSettings?.emailTemplate,
          interviewerEmails || userSettings?.interviewerEmails,
          effectiveIsReschedule,
          candidate.calendarEventId,
          safeDuration,
          trackName
        );
      } catch (firstErr: any) {
        // If expired token (401), clear cached token and retry with empty token so schedule doesn't fail
        const is401 = firstErr?.message?.includes('401') || firstErr?.message?.includes('UNAUTHENTICATED');
        if (is401 && token) {
          console.warn('Google Calendar token expired, falling back to direct scheduling...');
          clearCachedAccessToken();
          setIsCalendarConnected(false);
          result = await scheduleInterview(
            '',
            candidate.name,
            candidate.email,
            scheduledIsoTime,
            candidate.position || 'Technical Interview',
            draftMode,
            customTemplate || userSettings?.emailTemplate,
            interviewerEmails || userSettings?.interviewerEmails,
            effectiveIsReschedule,
            candidate.calendarEventId,
            safeDuration,
            trackName
          );
        } else {
          throw firstErr;
        }
      }

      // Parse assigned interviewers
      const assignedInterviewerList = interviewerEmails
        ? interviewerEmails.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
        : candidate.interviewerEmails || [];

      // Save directly to Firestore with updated schedule details, duration, track, and interviewers
      await updateCandidate(candidate.id!, {
        status: effectiveIsReschedule ? 'Rescheduled' : 'Scheduled',
        meetLink: result.meetLink,
        calendarEventId: result.calendarEventId || candidate.calendarEventId,
        calendarEventLink: result.calendarEventLink || candidate.calendarEventLink,
        suggestedPktTime: scheduledIsoTime,
        durationMinutes: safeDuration,
        trackId: trackId || candidate.trackId || 'track-alpha',
        trackName: trackName || candidate.trackName || 'Track A (Engineering Alpha)',
        interviewerEmails: assignedInterviewerList,
        assignedInterviewer: assignedInterviewerList[0] || candidate.assignedInterviewer || '',
      });

      return {
        success: true,
        meetLink: result.meetLink,
        error: result.emailError,
        calendarInviteSent: result.calendarInviteSent,
        gmailComposeUrl: result.gmailComposeUrl,
        emailSent: result.emailSent,
        senderEmail: result.senderEmail,
      };
    } catch (err: any) {
      console.error('Schedule error:', err);
      return { success: false, error: err.message || 'Failed to schedule interview' };
    }
  };

  const handleStatusChange = async (candidateId: string, newStatus: Candidate['status']) => {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate || candidate.status === newStatus) return;

    if (newStatus === 'Scheduled' && !candidate.suggestedPktTime) {
      // If moving to Scheduled without any slot time, open Schedule modal to pick time and create Meet
      setSchedulingCandidate(candidate);
      return;
    }

    if (newStatus === 'Rescheduled') {
      // Moving to Rescheduled prompts to select a new slot
      setSchedulingCandidate(candidate);
      return;
    }

    // Optimistically update candidate status
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
    );

    try {
      await updateCandidate(candidateId, { status: newStatus });
      await logCandidateActivity(candidateId, {
        type: 'status_change',
        title: `Status Changed to ${newStatus}`,
        details: candidate.suggestedPktTime
          ? `Stage changed to ${newStatus}. Calendar slot: ${formatPktDateTime(candidate.suggestedPktTime)}.`
          : `Stage changed to ${newStatus}.`,
        actor: user?.displayName || user?.email || 'Recruiter',
      });
      showToast(`Status updated to "${newStatus}"`, 'success');
    } catch (err: any) {
      console.error('Error updating status:', err);
      showToast('Failed to update status in database.', 'error');
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('candidateId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: Candidate['status']) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('candidateId');
    if (id) {
      handleStatusChange(id, status);
    }
  };

  // Overlap conflict detection across candidates using configured multi-track capacity
  const conflictCandidateIds = useMemo(() => {
    return getConflictCandidateIdSet(candidates, userSettings?.maxConcurrentSlots || 4);
  }, [candidates, userSettings?.maxConcurrentSlots]);

  const handleSaveScorecard = async (
    candidateId: string,
    scorecard: InterviewScorecard,
    autoStatus?: Candidate['status'],
    advanceRound?: HiringRound
  ) => {
    try {
      const payload: Partial<Candidate> = { scorecard };
      if (autoStatus) {
        payload.status = autoStatus;
      }
      if (advanceRound) {
        payload.hiringRound = advanceRound;
      }
      await updateCandidate(candidateId, payload);
      if (advanceRound) {
        await logCandidateActivity(candidateId, {
          type: 'round_advanced',
          title: `Moved to ${advanceRound}`,
          details: `Evaluation Score: ${scorecard.overallRating}/5. Recommendation: ${scorecard.recommendation}.`,
          actor: user?.displayName || user?.email || 'Interviewer',
        });
      } else {
        await logCandidateActivity(candidateId, {
          type: 'scorecard_added',
          title: `Scorecard Recorded (${scorecard.overallRating}/5)`,
          details: `Recommendation: ${scorecard.recommendation}.`,
          actor: user?.displayName || user?.email || 'Interviewer',
        });
      }
      showToast('Interview scorecard and evaluation saved live to database!', 'success');
    } catch (err: any) {
      console.error('Error saving scorecard:', err);
      showToast(`Failed to save scorecard: ${err.message || 'Error'}`, 'error');
    }
  };

  const handleAdvanceRound = async (candidateId: string, nextRound: HiringRound, note?: string) => {
    try {
      await advanceCandidateRound(
        candidateId,
        nextRound,
        user?.displayName || user?.email || 'Recruiter',
        note
      );
      showToast(`Candidate advanced to "${nextRound}"!`, 'success');
    } catch (err: any) {
      console.error('Error advancing candidate round:', err);
      showToast(`Failed to advance round: ${err.message || 'Error'}`, 'error');
    }
  };

  const handleSelfBookingConfirmed = async (candidateId: string, slotIso: string, notes?: string) => {
    try {
      await updateCandidate(candidateId, {
        suggestedPktTime: slotIso,
        status: 'Scheduled',
        notes: notes ? `Candidate booking note: ${notes}` : undefined,
      });
      await logCandidateActivity(candidateId, {
        type: 'self_booked',
        title: 'Candidate Self-Booked Interview',
        details: `Selected PKT slot: ${slotIso}. Note: ${notes || 'None'}`,
        actor: 'Candidate (Self-Booking Portal)',
      });
      showToast('Interview slot successfully booked & synced to database!', 'success');
    } catch (err: any) {
      console.error('Failed to confirm candidate self-booking:', err);
      showToast(`Failed to confirm booking: ${err.message || 'Error'}`, 'error');
    }
  };

  const handleReminderSent = async (candidateId: string) => {
    try {
      const candidate = candidates.find((c) => c.id === candidateId);
      const timestamp = await recordReminderSent(candidateId, candidate?.reminderCount || 0);
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId
            ? {
                ...c,
                lastReminderSentAt: timestamp,
                reminderCount: (c.reminderCount || 0) + 1,
              }
            : c
        )
      );
      showToast('Reminder logged to candidate database history.', 'success');
    } catch (err: any) {
      console.warn('Could not log reminder to database:', err);
    }
  };

  const handleWhatsAppSent = (candidateId: string) => {
    const timestamp = new Date().toISOString();
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId
          ? {
              ...c,
              lastWhatsAppSentAt: timestamp,
            }
          : c
      )
    );
    showToast('WhatsApp outreach logged to candidate record.', 'success');
  };

  const handleToggleSelectCandidate = (id: string) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const validFilteredIds = filteredCandidates.map((c) => c.id!).filter(Boolean);
    const allSelected =
      validFilteredIds.length > 0 &&
      validFilteredIds.every((id) => selectedCandidateIds.has(id));

    if (allSelected) {
      setSelectedCandidateIds(new Set());
    } else {
      setSelectedCandidateIds(new Set(validFilteredIds));
    }
  };

  const handleBatchStatusUpdate = async (newStatus: Candidate['status']) => {
    if (selectedCandidateIds.size === 0) return;
    const count = selectedCandidateIds.size;
    try {
      const ids = Array.from(selectedCandidateIds) as string[];
      const previousStatuses: Record<string, Candidate['status']> = {};
      for (const id of ids) {
        const found = candidates.find((c) => c.id === id);
        if (found) {
          previousStatuses[id] = found.status;
        }
      }

      for (const id of ids) {
        await updateCandidate(id, { status: newStatus });
      }
      setCandidates((prev) =>
        prev.map((c) => (c.id && selectedCandidateIds.has(c.id) ? { ...c, status: newStatus } : c))
      );
      setSelectedCandidateIds(new Set());

      const undoAction = async () => {
        try {
          for (const id of ids) {
            const prevStatus = previousStatuses[id] || 'Pending';
            await updateCandidate(id, { status: prevStatus });
          }
          setCandidates((prev) =>
            prev.map((c) => (c.id && previousStatuses[c.id] ? { ...c, status: previousStatuses[c.id] } : c))
          );
          setToastMessage(null);
          showToast(`Successfully undid status update for ${ids.length} candidate(s).`, 'success');
        } catch (undoErr: any) {
          showToast(`Undo failed: ${undoErr.message}`, 'error');
        }
      };

      showToast(`Updated status for ${count} candidate(s) to "${newStatus}".`, 'success', undoAction);
    } catch (err: any) {
      showToast(`Batch update failed: ${err.message}`, 'error');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedCandidateIds.size === 0) return;
    const count = selectedCandidateIds.size;
    setIsBatchDeleting(true);
    try {
      const ids = Array.from(selectedCandidateIds) as string[];
      const deletedCandidatesData: Candidate[] = [];
      for (const id of ids) {
        const found = candidates.find((c) => c.id === id);
        if (found) {
          deletedCandidatesData.push(found);
        }
      }

      for (const id of ids) {
        await deleteCandidate(id);
      }
      setCandidates((prev) => prev.filter((c) => !c.id || !selectedCandidateIds.has(c.id)));
      setSelectedCandidateIds(new Set());
      setShowBatchDeleteConfirm(false);

      const undoAction = async () => {
        try {
          for (const cand of deletedCandidatesData) {
            const { id, ...rest } = cand;
            await addCandidate(rest);
          }
          setToastMessage(null);
          showToast(`Successfully restored ${deletedCandidatesData.length} deleted candidate(s).`, 'success');
        } catch (undoErr: any) {
          showToast(`Restore failed: ${undoErr.message}`, 'error');
        }
      };

      showToast(`Successfully deleted ${count} candidate(s).`, 'success', undoAction);
    } catch (err: any) {
      showToast(`Batch deletion failed: ${err.message}`, 'error');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleBatchExport = () => {
    const selectedList = candidates.filter((c) => c.id && selectedCandidateIds.has(c.id));
    if (selectedList.length === 0) return;
    exportCandidatesToCsv(selectedList, `batch_candidates_${new Date().toISOString().split('T')[0]}.csv`);
    showToast(`Exported ${selectedList.length} candidate(s) to CSV!`, 'success');
  };

  const myCandidatesCount = useMemo(() => {
    if (!user) return 0;
    return candidates.filter(
      (c) =>
        (c.userId && c.userId === user.uid) ||
        (c.createdByEmail && user.email && c.createdByEmail.toLowerCase() === user.email.toLowerCase())
    ).length;
  }, [candidates, user]);

  // Filter candidates by search term, status tab, and team ownership
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.position && c.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.aiSkills && c.aiSkills.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

    const matchesRound = roundFilter === 'ALL' || (c.hiringRound || 'Screening') === roundFilter;

    const matchesOwnership =
      ownershipFilter === 'all' ||
      (c.userId && user && c.userId === user.uid) ||
      (c.createdByEmail && user?.email && c.createdByEmail.toLowerCase() === user.email.toLowerCase());

    return matchesSearch && matchesStatus && matchesRound && matchesOwnership;
  });

  // Global executive stats for telemetry ribbon
  const stats = useMemo(() => {
    const total = candidates.length;
    const appointed = candidates.filter(
      (c) => c.status === 'Scheduled' || c.status === 'Interviewed' || c.status === 'Selected'
    ).length;
    const pending = candidates.filter((c) => c.status === 'Pending' || c.status === 'Rescheduled').length;
    const countries = Array.from(new Set(candidates.map((c) => c.country || detectCandidateGeo(c).country)));
    return {
      total,
      appointed,
      pending,
      countriesCount: countries.length,
      sampleCountries: countries.slice(0, 4),
    };
  }, [candidates]);

  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-amber-600 to-orange-600 text-white',
      'from-rose-600 to-pink-600 text-white',
      'from-blue-600 to-indigo-600 text-white',
      'from-emerald-600 to-teal-600 text-white',
      'from-violet-600 to-purple-600 text-white',
      'from-stone-700 to-amber-800 text-amber-100',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return gradients[Math.abs(hash) % gradients.length];
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const columns: { title: string; status: Candidate['status'] }[] = [
    { title: 'Pending', status: 'Pending' },
    { title: 'Scheduled', status: 'Scheduled' },
    { title: 'Rescheduled', status: 'Rescheduled' },
    { title: 'Interviewed', status: 'Interviewed' },
    { title: 'Selected', status: 'Selected' },
    { title: 'Rejected', status: 'Rejected' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30';
      case 'Scheduled':
        return 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30';
      case 'Rescheduled':
        return 'bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30';
      case 'Interviewed':
        return 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30';
      case 'Selected':
        return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30';
      case 'Rejected':
        return 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30';
      default:
        return 'bg-stone-500/15 text-stone-800 dark:text-stone-300 border-stone-500/30';
    }
  };

  if (!authInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
        <Loader2 className="w-9 h-9 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-gray-500">Connecting to recruitment workspace...</p>
      </div>
    );
  }

  if (needsAuth || !user) {
    return (
      <LoginPage
        onSuccess={(loggedUser) => {
          setUser(loggedUser as any);
          setNeedsAuth(false);
          setAuthInitialized(true);
        }}
        onGoogleLogin={handleLogin}
        isLoggingIn={isLoggingIn}
        authErrorMessage={authErrorMessage}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${colors.pageBg} relative`}>
      {/* Subtle ambient lighting meshes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-80 h-80 rounded-full bg-orange-600/5 blur-3xl" />
      </div>

      {/* Top Header & Navigation */}
      <header className={`${colors.headerBg} border-b ${colors.border} sticky top-0 z-30 transition-colors shadow-2xs`}>
        {/* Tier 1: Main Brand & Unified Action Bar */}
        <div className={containerWidthClass}>
          <div className="flex justify-between items-center h-15 sm:h-16">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-3">
              <div
                className="relative group cursor-pointer"
                onClick={() => setViewMode('candidates')}
                title="RecruitSync Dashboard"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-xs border border-amber-500/30 transition-transform duration-200 group-hover:scale-105 bg-stone-900 p-0.5">
                  <img
                    src={appLogoImg}
                    alt="RecruitSync Logo"
                    className="w-full h-full object-cover rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <h1
                  onClick={() => setViewMode('candidates')}
                  className={`text-base sm:text-lg font-bold font-display ${colors.textPrimary} tracking-tight leading-none cursor-pointer`}
                >
                  RecruitSync
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25">
                  PKT (UTC+5)
                </span>
              </div>
            </div>

            {/* Right: De-crowded, high-contrast actions */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* 1. Consolidated Live Status Popover */}
              <SystemStatusPopover
                dbConnected={dbConnected}
                isCalendarConnected={isCalendarConnected}
                calendarVerification={calendarVerification}
                isValidatingCalendar={isValidatingCalendar}
                onConnectCalendar={handleConnectCalendar}
                onVerifyCalendar={handleVerifyCalendar}
                onOpenGoogleTasks={() => setShowTasksModal(true)}
                onOpenGoogleMeet={() => setShowMeetModal(true)}
              />

              {/* Dedicated Google Calendar Connect Button */}
              {!isCalendarConnected ? (
                <button
                  id="header-connect-calendar-btn"
                  type="button"
                  onClick={handleConnectCalendar}
                  title="Connect your Google Calendar, Meet & Tasks"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  <Video className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="hidden sm:inline">Connect Google</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleVerifyCalendar}
                  title={calendarVerification?.valid ? `Google Calendar: ${calendarVerification.summary || 'Primary'} (${calendarVerification.timeZone || 'UTC'}). Click to re-verify live.` : 'Click to re-verify Google Calendar connection'}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl cursor-pointer transition-colors"
                >
                  <Video className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px]">
                    {calendarVerification?.valid ? 'Calendar & Meet Synced' : 'Google Synced'}
                  </span>
                  {isValidatingCalendar && <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />}
                </button>
              )}

              {/* Quick Google Tasks Button */}
              <button
                type="button"
                onClick={() => setShowTasksModal(true)}
                title="View & manage Google Tasks follow-ups"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-xs ${colors.subtleBg} ${colors.border} ${colors.textPrimary} hover:brightness-95`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden lg:inline">Google Tasks</span>
              </button>

              {/* Quick Google Meet Button */}
              <button
                type="button"
                onClick={() => setShowMeetModal(true)}
                title="Launch an instant Google Meet room"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-xs ${colors.subtleBg} ${colors.border} ${colors.textPrimary} hover:brightness-95`}
              >
                <Video className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden lg:inline">Instant Meet</span>
              </button>

              {/* 2. Compact Live Team Presence (if team online) */}
              <LiveTeamPresence presences={livePresences} currentUserId={user?.uid} variant="compact" />

              {/* Tools & Automations Dropdown Menu */}
              <div className="relative" ref={toolsMenuRef}>
                <button
                  id="header-tools-dropdown-btn"
                  type="button"
                  onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-xs ${colors.subtleBg} ${colors.border} ${colors.textPrimary} hover:brightness-95`}
                  title="AI Scheduling, Ingest, Google Workspace Tools, and DB Tools"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span className="hidden md:inline">Tools &amp; AI</span>
                  <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${showToolsDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showToolsDropdown && (
                  <div className={`absolute right-0 mt-2 w-64 rounded-2xl p-2 border shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 ${colors.cardBg} ${colors.border}`}>
                    <div className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${colors.textMuted}`}>
                      Google Workspace &amp; Tasks
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowTasksModal(true);
                        setShowToolsDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2.5 p-2 text-xs rounded-xl transition text-left cursor-pointer hover:${colors.subtleBg}`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <CheckSquare className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className={`font-semibold ${colors.textPrimary}`}>Google Tasks</div>
                        <div className={`text-[10px] ${colors.textMuted}`}>Follow-ups &amp; reminders</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMeetModal(true);
                        setShowToolsDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2.5 p-2 text-xs rounded-xl transition text-left cursor-pointer hover:${colors.subtleBg}`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Video className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className={`font-semibold ${colors.textPrimary}`}>Instant Google Meet</div>
                        <div className={`text-[10px] ${colors.textMuted}`}>Generate video meeting room</div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-stone-200/60 dark:border-stone-800" />

                    <div className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${colors.textMuted}`}>
                      AI &amp; Batch Automations
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAutoSchedulerOpen(true);
                        setShowToolsDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2.5 p-2 text-xs rounded-xl transition text-left cursor-pointer hover:${colors.subtleBg}`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Zap className="w-3.5 h-3.5 fill-current" />
                      </div>
                      <div>
                        <div className={`font-semibold ${colors.textPrimary}`}>Auto-Scheduler</div>
                        <div className={`text-[10px] ${colors.textMuted}`}>Multi-track conflict-free booking</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAiBulkIntakeModal(true);
                        setShowToolsDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2.5 p-2 text-xs rounded-xl transition text-left cursor-pointer hover:${colors.subtleBg}`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className={`font-semibold ${colors.textPrimary}`}>AI Ingest &amp; Prompt</div>
                        <div className={`text-[10px] ${colors.textMuted}`}>LinkedIn, WhatsApp &amp; Raw Resumes</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowStudentInviteModal(true);
                        setShowToolsDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2.5 p-2 text-xs rounded-xl transition text-left cursor-pointer hover:${colors.subtleBg}`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className={`font-semibold ${colors.textPrimary}`}>Bulk Student Inviter</div>
                        <div className={`text-[10px] ${colors.textMuted}`}>Cohort Google Meet invites</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowHerokuModal(true);
                        setShowToolsDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2.5 p-2 text-xs rounded-xl transition text-left cursor-pointer hover:${colors.subtleBg}`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Server className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className={`font-semibold ${colors.textPrimary}`}>Database &amp; Heroku</div>
                        <div className={`text-[10px] ${colors.textMuted}`}>Postgres schema &amp; sync</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Team & Staff Management (For authorized logged-in users to register staff) */}
              <button
                id="header-staff-btn"
                type="button"
                onClick={() => setShowStaffModal(true)}
                title="Register and manage authorized staff members by username & password"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-xs ${colors.subtleBg} ${colors.border} ${colors.textPrimary} hover:brightness-95`}
              >
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Team</span>
              </button>

              {/* Theme Selector */}
              <ThemeSelector />

              {/* 3. Primary CTA: Add Candidate */}
              <button
                id="header-add-candidate-btn"
                type="button"
                onClick={() => {
                  setEditingCandidate(undefined);
                  setShowCandidateModal(true);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer ${colors.accentBg} ${colors.accentHover}`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Candidate</span>
              </button>

              {/* 4. Consolidated User Profile & System Controls Menu */}
              <UserProfileMenu
                user={user}
                isWideLayout={isWideLayout}
                onToggleWideLayout={toggleWideLayout}
                isNativeFullscreen={isNativeFullscreen}
                onToggleNativeFullscreen={toggleNativeFullscreen}
                onOpenSettings={() => setShowSettings(true)}
                onOpenStaffModal={() => setShowStaffModal(true)}
                onLogout={handleLogout}
                isCalendarConnected={isCalendarConnected}
                onConnectCalendar={handleConnectCalendar}
              />
            </div>
          </div>
        </div>

        {/* Tier 2: Sleek Sub-Navigation Tab Bar */}
        <div className={`border-t ${colors.borderLight} bg-stone-500/[0.02]`}>
          <div className={containerWidthClass}>
            <div className="flex items-center overflow-x-auto no-scrollbar py-1">
              <nav className="flex items-center gap-1 sm:gap-1.5 min-w-max py-0.5">
                <button
                  id="tab-candidates"
                  onClick={() => setViewMode('candidates')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'candidates'
                      ? `${colors.accentBg} text-white shadow-2xs font-bold`
                      : `${colors.textSecondary} hover:${colors.textPrimary} hover:${colors.subtleBg}`
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Candidates</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      viewMode === 'candidates' ? 'bg-white/20 text-white' : `${colors.subtleBg} ${colors.textPrimary}`
                    }`}
                  >
                    {candidates.length}
                  </span>
                </button>

                <button
                  id="tab-kanban"
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'kanban'
                      ? `${colors.accentBg} text-white shadow-2xs font-bold`
                      : `${colors.textSecondary} hover:${colors.textPrimary} hover:${colors.subtleBg}`
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Pipeline</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      viewMode === 'kanban' ? 'bg-white/20 text-white' : `${colors.subtleBg} ${colors.textPrimary}`
                    }`}
                  >
                    {stats.appointed + stats.pending}
                  </span>
                </button>

                <button
                  id="tab-calendar"
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'calendar'
                      ? `${colors.accentBg} text-white shadow-2xs font-bold`
                      : `${colors.textSecondary} hover:${colors.textPrimary} hover:${colors.subtleBg}`
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Calendar &amp; Slots</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      viewMode === 'calendar' ? 'bg-white/20 text-white' : `${colors.subtleBg} ${colors.textPrimary}`
                    }`}
                  >
                    {stats.appointed}
                  </span>
                </button>

                <button
                  id="tab-global"
                  onClick={() => setViewMode('global')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'global'
                      ? `${colors.accentBg} text-white shadow-2xs font-bold`
                      : `${colors.textSecondary} hover:${colors.textPrimary} hover:${colors.subtleBg}`
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Global 3D &amp; Clocks</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      viewMode === 'global' ? 'bg-white/20 text-white' : `${colors.subtleBg} ${colors.textPrimary}`
                    }`}
                  >
                    {stats.countriesCount}
                  </span>
                </button>

                <button
                  id="tab-analytics"
                  onClick={() => setViewMode('analytics')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'analytics'
                      ? `${colors.accentBg} text-white shadow-2xs font-bold`
                      : `${colors.textSecondary} hover:${colors.textPrimary} hover:${colors.subtleBg}`
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Analytics</span>
                </button>

                <button
                  id="tab-database"
                  onClick={() => setViewMode('database')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'database'
                      ? `${colors.accentBg} text-white shadow-2xs font-bold`
                      : `${colors.textSecondary} hover:${colors.textPrimary} hover:${colors.subtleBg}`
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>System</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${dbConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 ${containerWidthClass} py-5 sm:py-7 space-y-6 sm:space-y-7`}>

        {/* View Mode Content Router */}
        {viewMode === 'database' ? (
          <div className="space-y-6">
            <LiveTeamPresence presences={livePresences} currentUserId={user?.uid} variant="full" />
            <DatabaseAnalyticsView
              candidates={candidates}
              dbConnected={dbConnected}
              presences={livePresences}
              userSettings={userSettings}
              currentUserId={user?.uid}
              onOpenBulkAdd={() => setShowBulkAddModal(true)}
              onOpenSettings={() => setShowSettings(true)}
              onOpenHerokuDeploy={() => setShowHerokuModal(true)}
            />
          </div>
        ) : viewMode === 'global' ? (
          <div className="space-y-5">
            <WorldClockBar />
            <GlobalGeoDashboard
              candidates={candidates}
              onScheduleCandidate={(c) => setSchedulingCandidate(c)}
              onEditCandidate={(c) => {
                setEditingCandidate(c);
                setShowCandidateModal(true);
              }}
              onDeleteCandidate={(c) => setCandidateToDelete(c)}
              onShareWhatsApp={(c) => {
                setWhatsAppCandidate(c);
                setShowWhatsAppModal(true);
              }}
            />
          </div>
        ) : viewMode === 'calendar' ? (
          <CalendarScheduleView
            candidates={candidates}
            onScheduleCandidate={(c) => setSchedulingCandidate(c)}
            onOpenScorecard={(c) => setScorecardCandidate(c)}
            onOpenReminder={(c) => setReminderCandidate(c)}
            onOpenWhatsApp={(c) => {
              setWhatsAppCandidate(c);
              setShowWhatsAppModal(true);
            }}
            onAddNewCandidateAtSlot={(slotTimeIso, trackId) => {
              const track = getTrackById(trackId || 'track-alpha');
              setEditingCandidate({
                suggestedPktTime: slotTimeIso,
                trackId: track.id,
                trackName: track.name,
                status: 'Scheduled',
              } as any);
              setShowCandidateModal(true);
            }}
            onDirectBookSlot={handleDirectBookSlot}
            onStatusChange={handleStatusChange}
            onOpenAutoScheduler={() => setIsAutoSchedulerOpen(true)}
            maxConcurrentSlots={userSettings?.maxConcurrentSlots || 4}
            initialAnchorDate={calendarAnchorDate}
            highlightCandidateId={calendarHighlightId || undefined}
          />
        ) : viewMode === 'analytics' ? (
          <AnalyticsView
            candidates={candidates}
            onOpenWhatsAppSummary={() => {
              setWhatsAppCandidate(undefined);
              setShowWhatsAppModal(true);
            }}
            onOpenBulkImport={() => {
              setEditingCandidate(undefined);
              setShowBulkAddModal(true);
            }}
            onOpenCandidateModal={() => {
              setEditingCandidate(undefined);
              setShowCandidateModal(true);
            }}
          />
        ) : viewMode === 'kanban' ? (
          <KanbanBoardView
            candidates={filteredCandidates}
            columns={columns}
            conflictCandidateIds={conflictCandidateIds}
            onStatusChange={handleStatusChange}
            onEditCandidate={(candidate) => {
              setEditingCandidate(candidate);
              setShowCandidateModal(true);
            }}
            onDeleteCandidate={(candidate) => setCandidateToDelete(candidate)}
            onScheduleCandidate={(candidate) => setSchedulingCandidate(candidate)}
            onScorecardCandidate={(candidate) => setScorecardCandidate(candidate)}
            onReminderCandidate={(candidate) => setReminderCandidate(candidate)}
            onTimeline={(candidate) => setTimelineCandidate(candidate)}
            onSelfBooking={(candidate) => setSelfBookingCandidate(candidate)}
            onAdvanceRound={handleAdvanceRound}
            onViewInCalendar={handleViewInCalendar}
            onDirectBookSlot={handleDirectBookSlot}
            onWhatsAppCandidate={(candidate) => {
              setWhatsAppCandidate(candidate);
              setShowWhatsAppModal(true);
            }}
            onAddCandidate={() => {
              setEditingCandidate(undefined);
              setShowCandidateModal(true);
            }}
          />
        ) : (
          /* Candidates Directory View (De-crowded & Focused) */
          <div className="space-y-4">
            {/* Optional Collapsible Stats Ribbon (toggleable via Quick Stats button) */}
            {showDirectoryMetrics && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-in slide-in-from-top-2 duration-150">
                {/* Metric 1: Total Pipeline */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${colors.cardBg} group`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${colors.textSecondary}`}>
                      Total Pipeline
                    </span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colors.subtleBg} ${colors.accentText}`}>
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className={`text-2xl sm:text-3xl font-extrabold font-display tracking-tight ${colors.textPrimary}`}>
                      {stats.total}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Active Profiles
                    </span>
                  </div>
                  <p className={`text-[11px] ${colors.textMuted} mt-1.5 font-medium`}>
                    Verified across open roles
                  </p>
                </div>

                {/* Metric 2: Scheduled in PKT */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${colors.cardBg} group`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${colors.textSecondary}`}>
                      Scheduled (PKT)
                    </span>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className={`text-2xl sm:text-3xl font-extrabold font-display tracking-tight ${colors.textPrimary}`}>
                      {stats.appointed}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      UTC+5 Sync
                    </span>
                  </div>
                  <p className={`text-[11px] ${colors.textMuted} mt-1.5 font-medium`}>
                    Appointed Google Meet slots
                  </p>
                </div>

                {/* Metric 3: Action Pending */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${colors.cardBg} group`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${colors.textSecondary}`}>
                      Action Pending
                    </span>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className={`text-2xl sm:text-3xl font-extrabold font-display tracking-tight ${colors.textPrimary}`}>
                      {stats.pending}
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Awaiting Slot
                    </span>
                  </div>
                  <p className={`text-[11px] ${colors.textMuted} mt-1.5 font-medium`}>
                    Profiles needing timeslot review
                  </p>
                </div>

                {/* Metric 4: Global Reach */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${colors.cardBg} group`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${colors.textSecondary}`}>
                      World Coverage
                    </span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colors.accentSoft}`}>
                      <Globe className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className={`text-2xl sm:text-3xl font-extrabold font-display tracking-tight ${colors.textPrimary}`}>
                      {stats.countriesCount}
                    </span>
                    <span className={`text-[11px] font-semibold ${colors.accentText}`}>
                      Countries
                    </span>
                  </div>
                  <p className={`text-[11px] ${colors.textMuted} mt-1.5 font-medium flex items-center gap-1`}>
                    <span>Mapped on 3D Globe Radar</span>
                  </p>
                </div>
              </div>
            )}

            {/* Controls Bar: Search + Density + Stats Toggle + Actions */}
            <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border transition-colors ${colors.cardBg} ${colors.border}`}>
              {/* Search Box */}
              <div className="flex-1 max-w-lg relative">
                <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${colors.textMuted}`} />
                <input
                  id="search-candidates-input"
                  type="text"
                  placeholder="Search by candidate name, role, skill, email, or country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-9 py-2.5 border rounded-xl text-xs sm:text-sm outline-none transition-all ${colors.inputBg} ${colors.border} ${colors.accentRing}`}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* View Density Switcher */}
                <div className={`flex items-center p-1 rounded-xl border ${colors.border} ${colors.subtleBg}`}>
                  <button
                    type="button"
                    onClick={() => setCandidateDensity('compact')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      candidateDensity === 'compact'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                        : `${colors.textSecondary} hover:${colors.textPrimary}`
                    }`}
                    title="Compact scannable list view"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Compact</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCandidateDensity('detailed')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      candidateDensity === 'detailed'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                        : `${colors.textSecondary} hover:${colors.textPrimary}`
                    }`}
                    title="Detailed cards view"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Detailed</span>
                  </button>
                </div>

                {/* Quick Stats Toggle */}
                <button
                  type="button"
                  onClick={() => setShowDirectoryMetrics(!showDirectoryMetrics)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    showDirectoryMetrics
                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300 font-bold'
                      : `${colors.subtleBg} ${colors.border} ${colors.textSecondary} hover:${colors.textPrimary}`
                  }`}
                  title="Toggle overview metrics ribbon"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{showDirectoryMetrics ? 'Hide Stats' : 'Stats'}</span>
                </button>

                <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-0.5" />

                {/* AI Ingest & Import */}
                <button
                  id="bulk-add-button"
                  onClick={() => setShowAiBulkIntakeModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-all shadow-2xs cursor-pointer"
                  title="Master AI Prompt & Bulk Intake"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>AI Ingest</span>
                </button>

                {/* Export Actions */}
                <button
                  id="export-csv-button"
                  onClick={() => exportCandidatesToCsv(filteredCandidates)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border ${colors.border} ${colors.subtleBg} ${colors.textPrimary} hover:brightness-95 transition-all shadow-2xs cursor-pointer`}
                  title="Export Candidates to Excel/CSV"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>CSV</span>
                </button>

                <button
                  id="print-report-button"
                  onClick={() => printCandidateSummaryReport(filteredCandidates)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border ${colors.border} ${colors.subtleBg} ${colors.textPrimary} hover:brightness-95 transition-all shadow-2xs cursor-pointer`}
                  title="Generate Executive PDF Report"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                  <span>PDF</span>
                </button>

                <button
                  id="whatsapp-share-button"
                  onClick={() => {
                    setWhatsAppCandidate(undefined);
                    setShowWhatsAppModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all shadow-2xs cursor-pointer"
                  title="Export styled WhatsApp message"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-current text-emerald-600" />
                  <span>WhatsApp</span>
                </button>

                {/* Primary Add Candidate button */}
                <button
                  id="add-candidate-button"
                  onClick={() => {
                    setEditingCandidate(undefined);
                    setShowCandidateModal(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer ${colors.accentBg} ${colors.accentHover}`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Candidate</span>
                </button>
              </div>
            </div>

        {/* 3. Batch Action Bar (Appears when 1+ candidates are selected) */}
        {selectedCandidateIds.size > 0 && (
          <div className="p-3.5 rounded-2xl bg-indigo-900 text-white shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-indigo-700 text-white font-mono font-bold text-xs flex items-center justify-center">
                {selectedCandidateIds.size}
              </span>
              <span className="text-xs font-bold text-indigo-100">
                {selectedCandidateIds.size} Candidate{selectedCandidateIds.size > 1 ? 's' : ''} Selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedCandidateIds(new Set())}
                className="text-[11px] text-indigo-300 hover:text-white underline cursor-pointer"
              >
                Clear Selection
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-indigo-200 mr-1 hidden sm:inline">Set Status:</span>
              {(['Scheduled', 'Interviewed', 'Selected', 'Rejected'] as Candidate['status'][]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleBatchStatusUpdate(st)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                >
                  Mark {st}
                </button>
              ))}

              <div className="h-4 w-px bg-indigo-700 mx-1" />

              <button
                type="button"
                onClick={() => setIsAutoSchedulerOpen(true)}
                className="px-3 py-1 text-[11px] font-bold rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Auto-Schedule selected candidates into conflict-free slots"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Auto-Schedule Selected</span>
              </button>

              {selectedCandidateIds.size >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    setComparisonCandidateIds(Array.from(selectedCandidateIds).slice(0, 4));
                    setShowComparisonModal(true);
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center gap-1 transition-colors cursor-pointer font-bold shadow-xs"
                >
                  <Scale className="w-3 h-3" />
                  <span>Compare ({selectedCandidateIds.size})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleBatchExport}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Export Selected</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirm(true)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        )}

        {/* Matti & Omema Quick Batch Dispatch Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-500/30 dark:border-amber-500/20 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-600 to-indigo-600 text-white flex items-center justify-center shadow-md font-bold shrink-0">
              <Zap className="w-5 h-5 fill-current text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>Mihora Tech Live Interview Dispatches</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  Matti (36) + Omema (35)
                </span>
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                Generate real meeting links, email all candidates individually (with CC/interviewer routing), and dispatch master summary reports.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsMattiOmemaBatchModalOpen(true)}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white shadow-md flex items-center gap-2 transition-all cursor-pointer"
              title="Open intelligent schedule batch manager for Matti (36) and Omema (35) with custom start dates and real meeting links"
            >
              <Zap className="w-4 h-4 fill-current text-white" />
              <span>⚡ Configure & Dispatch Matti / Omema Batches</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs & Workspace Team Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-1 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
                <span className={`${colors.textSecondary} font-medium mr-1 flex items-center gap-1`}>
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </span>
                {['ALL', 'Pending', 'Scheduled', 'Rescheduled', 'Interviewed', 'Selected', 'Rejected'].map(
                  (status) => {
                    const count =
                      status === 'ALL'
                        ? candidates.length
                        : candidates.filter((c) => c.status === status).length;
                    const isActive = statusFilter === status;
                    return (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                          isActive
                            ? `${colors.accentBg} text-white ${colors.border} shadow-xs font-bold`
                            : `${colors.cardBg} ${colors.textSecondary} hover:${colors.subtleBg}`
                        }`}
                      >
                        {status} ({count})
                      </button>
                    );
                  }
                )}

                {/* Round Filter Dropdown */}
                <div className="flex items-center gap-1 pl-2 border-l border-stone-200 dark:border-stone-700">
                  <span className={`${colors.textMuted} text-[11px] font-medium`}>Round:</span>
                  <select
                    value={roundFilter}
                    onChange={(e) => setRoundFilter(e.target.value)}
                    className={`text-xs px-2 py-1 rounded-xl border ${colors.border} ${colors.cardBg} ${colors.textPrimary} font-medium outline-none cursor-pointer`}
                  >
                    <option value="ALL">All Rounds</option>
                    <option value="Screening">Screening</option>
                    <option value="Technical Round 1">Tech Round 1</option>
                    <option value="Technical Round 2">Tech Round 2</option>
                    <option value="Management / HR">Management / HR</option>
                    <option value="Final Offer">Final Offer</option>
                  </select>
                </div>
              </div>

              {/* Shared Team Workspace vs My Added Switcher */}
              <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl border border-stone-200 dark:border-stone-700">
                <button
                  type="button"
                  id="btn-filter-team-workspace"
                  onClick={() => setOwnershipFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    ownershipFilter === 'all'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                  title="View all candidates in shared team workspace"
                >
                  <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Team Workspace ({candidates.length})</span>
                </button>
                <button
                  type="button"
                  id="btn-filter-my-candidates"
                  onClick={() => setOwnershipFilter('mine')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    ownershipFilter === 'mine'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                  title="View candidates added by your current Google account"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>My Added ({myCandidatesCount})</span>
                </button>
              </div>
            </div>

            {/* Loading state */}
            {loadingData && candidates.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border space-y-3 ${colors.cardBg}`}>
                <Loader2 className={`w-8 h-8 ${colors.accentText} animate-spin`} />
                <p className={`text-sm ${colors.textSecondary} font-medium`}>Syncing candidates with database...</p>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className={`text-center py-16 rounded-2xl border space-y-3 ${colors.cardBg}`}>
                <div className={`w-12 h-12 ${colors.subtleBg} rounded-full flex items-center justify-center mx-auto ${colors.textMuted}`}>
                  <Search className="w-6 h-6" />
                </div>
                <h3 className={`text-base font-semibold ${colors.textPrimary}`}>No candidates match your criteria</h3>
                <p className={`text-xs ${colors.textSecondary} max-w-sm mx-auto`}>
                  {searchTerm || statusFilter !== 'ALL'
                    ? 'Try resetting your search query or status filter.'
                    : 'Get started by adding your first candidate profile or bulk import with AI.'}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('ALL');
                      setShowCandidateModal(true);
                    }}
                    className={`px-4 py-2 text-xs font-semibold text-white ${colors.accentBg} ${colors.accentHover} rounded-xl transition-colors shadow-xs`}
                  >
                    + Add New Candidate
                  </button>
                </div>
              </div>
            ) : (
              /* List View */
              <div className={candidateDensity === "compact" ? "space-y-2" : "space-y-3.5"}>
                {/* List Selection Header Bar */}
                <div className={`flex items-center justify-between px-4 py-2 rounded-xl border text-xs ${colors.cardBg} ${colors.border}`}>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="flex items-center gap-2 font-semibold text-stone-700 dark:text-stone-300 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      {filteredCandidates.length > 0 &&
                      filteredCandidates.every((c) => c.id && selectedCandidateIds.has(c.id)) ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-400" />
                      )}
                      <span>Select All Filtered ({filteredCandidates.length})</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-stone-500 text-[11px]">
                    {selectedCandidateIds.size > 0 && (
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {selectedCandidateIds.size} selected
                      </span>
                    )}
                    <span>Showing {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

            {filteredCandidates.map((candidate) => (
                <CandidateRowCard
                  key={candidate.id}
                  candidate={candidate}
                  density={candidateDensity}
                  isSelected={candidate.id ? selectedCandidateIds.has(candidate.id) : false}
                  hasConflict={candidate.id ? conflictCandidateIds.has(candidate.id) : false}
                  onToggleSelect={handleToggleSelectCandidate}
                  onSchedule={(c) => setSchedulingCandidate(c)}
                  onScorecard={(c) => setScorecardCandidate(c)}
                  onReminder={(c) => setReminderCandidate(c)}
                  onTimeline={(c) => setTimelineCandidate(c)}
                  onSelfBooking={(c) => setSelfBookingCandidate(c)}
                  onAdvanceRound={handleAdvanceRound}
                  onViewInCalendar={handleViewInCalendar}
                  onWhatsApp={(c) => {
                    setWhatsAppCandidate(c);
                    setShowWhatsAppModal(true);
                  }}
                  onEdit={(c) => {
                    setEditingCandidate(c);
                    setShowCandidateModal(true);
                  }}
                  onDelete={(c) => setCandidateToDelete(c)}
                  onStatusChange={handleStatusChange}
                />
              ))}
              </div>
            )}
        </div>
      )}
    </main>

      {/* Modals */}
      {showCandidateModal && (
        <CandidateModal
          initialData={editingCandidate}
          allCandidates={candidates}
          onClose={() => setShowCandidateModal(false)}
          onSave={handleSaveCandidate}
          onDelete={handleDeleteCandidate}
        />
      )}

      {schedulingCandidate && (
        <ScheduleModal
          candidate={schedulingCandidate}
          allCandidates={candidates}
          defaultTemplate={userSettings?.emailTemplate}
          defaultInterviewers={
            schedulingCandidate.assignedInterviewer ||
            (schedulingCandidate.interviewerEmails && schedulingCandidate.interviewerEmails[0]) ||
            userSettings?.interviewerEmails ||
            'm.mattiulhasnain@gmail.com'
          }
          defaultDurationMinutes={userSettings?.defaultDurationMinutes || 45}
          isCalendarConnected={isCalendarConnected}
          onConnectCalendar={handleConnectCalendar}
          onSchedule={handleScheduleFromModal}
          onClose={() => setSchedulingCandidate(null)}
        />
      )}

      {showBulkAddModal && (
        <BulkAddModal
          onClose={() => setShowBulkAddModal(false)}
          onSaveBulk={handleSaveBulkCandidates}
        />
      )}

      {showWhatsAppModal && (
        <WhatsAppShareModal
          isOpen={showWhatsAppModal}
          onClose={() => {
            setShowWhatsAppModal(false);
            setWhatsAppCandidate(undefined);
          }}
          allCandidates={candidates}
          defaultInterviewerEmails={userSettings?.interviewerEmails}
          initialSelectedCandidate={whatsAppCandidate}
          onWhatsAppSent={handleWhatsAppSent}
        />
      )}

      {showSettings && userSettings && user && (
        <SettingsModal
          userId={user.uid}
          settings={userSettings}
          onClose={() => setShowSettings(false)}
          onSave={setUserSettings}
          onOpenStaffModal={() => setShowStaffModal(true)}
        />
      )}

      {/* Scorecard / Evaluation Modal */}
      {scorecardCandidate && (
        <ScorecardModal
          candidate={scorecardCandidate}
          isOpen={!!scorecardCandidate}
          onClose={() => setScorecardCandidate(null)}
          onSaveScorecard={handleSaveScorecard}
          onSave={handleSaveScorecard}
        />
      )}

      {/* 1-Click Reminder Modal (WhatsApp / Email) */}
      {reminderCandidate && (
        <ReminderModal
          candidate={reminderCandidate}
          isOpen={!!reminderCandidate}
          onClose={() => setReminderCandidate(null)}
          onReminderSent={handleReminderSent}
        />
      )}

      {/* Candidate Activity Timeline / Audit Trail Modal */}
      {timelineCandidate && (
        <CandidateActivityTimelineModal
          candidate={timelineCandidate}
          isOpen={!!timelineCandidate}
          onClose={() => setTimelineCandidate(null)}
        />
      )}

      {/* Candidate Self-Booking Portal Simulator Modal */}
      {selfBookingCandidate && (
        <CandidateSelfBookingPortal
          candidate={selfBookingCandidate}
          isOpen={!!selfBookingCandidate}
          onClose={() => setSelfBookingCandidate(null)}
          onConfirmBooking={handleSelfBookingConfirmed}
        />
      )}

      {/* Side-by-Side Candidate Comparison Modal */}
      {showComparisonModal && (
        <CandidateComparisonModal
          isOpen={showComparisonModal}
          onClose={() => setShowComparisonModal(false)}
          candidates={
            comparisonCandidateIds.length > 0
              ? candidates.filter((c) => c.id && comparisonCandidateIds.includes(c.id))
              : candidates.slice(0, 4)
          }
          allCandidates={candidates}
          initialCandidateIds={comparisonCandidateIds}
          onSchedule={(c) => {
            setShowComparisonModal(false);
            setSchedulingCandidate(c);
          }}
          onScorecard={(c) => {
            setShowComparisonModal(false);
            setScorecardCandidate(c);
          }}
          onAdvanceRound={handleAdvanceRound}
        />
      )}

      {/* Automated Bulk Scheduler Modal */}
      {isAutoSchedulerOpen && (
        <AutoSchedulerModal
          isOpen={isAutoSchedulerOpen}
          onClose={() => setIsAutoSchedulerOpen(false)}
          allCandidates={candidates}
          selectedCandidateIds={Array.from(selectedCandidateIds)}
          onBatchScheduled={(count) => {
            showToast(`⚡ Successfully auto-scheduled ${count} candidate interviews!`, 'success');
            setSelectedCandidateIds(new Set());
          }}
          onViewInCalendar={() => {
            setViewMode('calendar');
          }}
          currentUserName={user?.displayName || 'Recruiter'}
        />
      )}

      {/* AI Master Prompt & Bulk Ingest Modal */}
      {showAiBulkIntakeModal && (
        <AiBulkIntakeModal
          isOpen={showAiBulkIntakeModal}
          onClose={() => setShowAiBulkIntakeModal(false)}
          existingCandidates={candidates}
          onSuccess={(added, scheduled) => {
            if (scheduled > 0) {
              showToast(`💥 Ingested ${added} candidates & auto-scheduled ${scheduled} interviews!`, 'success');
            } else {
              showToast(`📥 Successfully ingested ${added} candidates into pipeline!`, 'success');
            }
          }}
          onNavigateToCalendar={() => setViewMode('calendar')}
          onNavigateToDirectory={() => setViewMode('candidates')}
          currentUserName={user?.displayName || 'Recruiter'}
        />
      )}

      {/* Bulk Student Cohort Meet Inviter Modal */}
      {showStudentInviteModal && (
        <BulkStudentInviteModal
          isOpen={showStudentInviteModal}
          onClose={() => setShowStudentInviteModal(false)}
          existingCandidates={candidates}
          currentUserName={user?.displayName || 'Instructor & Mentor'}
          currentUserEmail={user?.email || 'hr@mihora.tech'}
          onSuccess={(count) => {
            showToast(`🎓 Successfully invited ${count} students to Google Meet session!`, 'success');
          }}
        />
      )}

      {/* In-App Delete Confirmation Modal */}
      {candidateToDelete && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-150 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl shrink-0 border border-red-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 pr-2">
                <h3 id="delete-dialog-title" className="text-base font-bold text-gray-900">
                  Delete Candidate?
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-gray-900">{candidateToDelete.name}</span>
                  {candidateToDelete.position ? ` (${candidateToDelete.position})` : ''}?
                </p>
              </div>
            </div>

            {candidateToDelete.calendarEventId && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                <p className="font-semibold flex items-center gap-1.5 text-amber-950">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  Scheduled Interview Notice
                </p>
                <p className="text-amber-800 leading-relaxed">
                  This candidate has an active scheduled interview. Deleting them will automatically cancel the associated Google Calendar invitation.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                id="btn-cancel-delete"
                disabled={isDeletingCandidate}
                onClick={() => setCandidateToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete"
                disabled={isDeletingCandidate}
                onClick={() => handleDeleteCandidate(candidateToDelete.id!, candidateToDelete)}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingCandidate ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Candidate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Tasks & Follow-ups Modal */}
      <GoogleTasksModal
        isOpen={showTasksModal}
        onClose={() => setShowTasksModal(false)}
        isCalendarConnected={isCalendarConnected}
        onConnectCalendar={handleConnectCalendar}
      />

      {/* Instant Google Meet Room Modal */}
      <GoogleMeetModal
        isOpen={showMeetModal}
        onClose={() => setShowMeetModal(false)}
        candidates={candidates}
        onAssignToCandidate={handleAttachMeetToCandidate}
        isCalendarConnected={isCalendarConnected}
        onConnectCalendar={handleConnectCalendar}
      />

      {/* Matti & Omema Batch Modal */}
      <MattiOmemaBatchModal
        isOpen={isMattiOmemaBatchModalOpen}
        onClose={() => setIsMattiOmemaBatchModalOpen(false)}
        candidates={candidates}
        userId={user?.uid || ''}
        onRefresh={() => {}}
        showToast={showToast}
        isCalendarConnected={isCalendarConnected}
        onConnectCalendar={handleConnectCalendar}
      />

      {/* Batch Delete Confirmation Modal */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl max-w-md w-full p-6 border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl shrink-0 border border-red-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 pr-2">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Delete {selectedCandidateIds.size} Selected Candidate(s)?
                </h3>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Are you sure you want to delete all selected candidates? You can undo/restore them from the notification toast if needed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                disabled={isBatchDeleting}
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBatchDeleting}
                onClick={handleBatchDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isBatchDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Selected
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-App Toast Notification */}
      {showHerokuModal && (
        <HerokuDeployModal
          onClose={() => setShowHerokuModal(false)}
          candidates={candidates}
          onRefreshData={() => {}}
        />
      )}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2.5 ${
              toastMessage.type === 'success'
                ? 'bg-gray-900 text-white border-gray-800'
                : 'bg-red-50 text-red-900 border-red-200'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
            {toastMessage.undoAction && (
              <button
                onClick={toastMessage.undoAction}
                className="ml-3 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <span>Undo</span>
              </button>
            )}
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
