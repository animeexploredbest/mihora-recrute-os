import React, { useState, useMemo, useEffect } from 'react';
import { Candidate, InterviewTrack } from '../types';
import { useTheme } from '../lib/theme';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Zap,
  Calendar,
  Clock,
  Users,
  Layers,
  FileText,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Trash2,
  Globe,
  Sliders,
  CheckCircle2,
  Table,
  Code2,
  Info,
  ExternalLink,
  Scale,
  Target,
  Award,
  Radio,
  RefreshCw,
  Send,
  Mail,
  Download,
  ShieldCheck,
  ChevronRight,
  Eye,
  Briefcase,
  Sun,
  Moon,
  Sunset,
} from 'lucide-react';
import {
  DEFAULT_MASTER_AI_PROMPT,
  JSON_MASTER_AI_PROMPT,
  generateMasterPrompt,
} from '../lib/prompt-templates';
import {
  parseAnyRecruitmentInput,
  ParsedCandidateItem,
  ParseResult,
} from '../lib/bulk-ai-parser';
import {
  runAutoScheduler,
  ScheduledSlotAllocation,
  AutoSchedulerConfig,
} from '../lib/auto-scheduler';
import { batchAddCandidates } from '../lib/firebase-operations';
import { DEFAULT_INTERVIEW_TRACKS } from '../lib/track-constants';
import { broadcastLiveSync } from '../lib/cross-tab-sync';
import { syncCandidatesToHeroku } from '../lib/heroku-db';
import {
  InterviewerProfile,
  QuotaAllocationStrategy,
  computeLiveInterviewerWorkloads,
  calculateSmartInterviewAssignments,
  saveInterviewerProfiles,
} from '../lib/interviewer-workload';
import { InterviewerQuotaManager } from './InterviewerQuotaManager';
import {
  generateLuxuryInterviewEmailHtml,
  generateLuxuryInterviewPlainText,
  downloadBatchIcsFile,
  LuxuryEmailTheme,
  LUXURY_EMAIL_THEMES,
} from '../lib/interview-invite-luxury';
import { formatPktDateTime, formatLocalDateTime } from '../lib/date-utils';
import { resolveCandidateTimezone, formatInTimezone } from '../lib/timezone-utils';

/**
 * Intelligent Sector & Role Classifier
 */
export function detectCandidateSector(position?: string, notes?: string): string {
  const text = `${position || ''} ${notes || ''}`.toLowerCase();
  if (
    text.includes('front') ||
    text.includes('react') ||
    text.includes('vue') ||
    text.includes('angular') ||
    text.includes('next') ||
    text.includes('ui') ||
    text.includes('ux') ||
    text.includes('tailwind') ||
    text.includes('css')
  ) {
    return 'Frontend / Web UI';
  }
  if (
    text.includes('back') ||
    text.includes('node') ||
    text.includes('express') ||
    text.includes('python') ||
    text.includes('django') ||
    text.includes('fastapi') ||
    text.includes('golang') ||
    text.includes('go ') ||
    text.includes('java') ||
    text.includes('spring') ||
    text.includes('postgres') ||
    text.includes('sql') ||
    text.includes('api')
  ) {
    return 'Backend & Cloud APIs';
  }
  if (
    text.includes('ai') ||
    text.includes('machine learning') ||
    text.includes('ml') ||
    text.includes('data') ||
    text.includes('llm') ||
    text.includes('nlp') ||
    text.includes('deep learning')
  ) {
    return 'AI / ML & Data Systems';
  }
  if (
    text.includes('mobile') ||
    text.includes('flutter') ||
    text.includes('react native') ||
    text.includes('ios') ||
    text.includes('swift') ||
    text.includes('android') ||
    text.includes('kotlin')
  ) {
    return 'Mobile Engineering';
  }
  if (
    text.includes('devops') ||
    text.includes('sre') ||
    text.includes('infra') ||
    text.includes('cloud') ||
    text.includes('aws') ||
    text.includes('azure') ||
    text.includes('gcp') ||
    text.includes('docker') ||
    text.includes('kubernetes')
  ) {
    return 'DevOps & Infrastructure';
  }
  if (
    text.includes('qa') ||
    text.includes('test') ||
    text.includes('automation') ||
    text.includes('quality') ||
    text.includes('cypress') ||
    text.includes('playwright')
  ) {
    return 'QA & Automation';
  }
  if (
    text.includes('design') ||
    text.includes('product') ||
    text.includes('manager') ||
    text.includes('pm') ||
    text.includes('scrum')
  ) {
    return 'Product & Design';
  }
  if (text.includes('full') || text.includes('stack')) {
    return 'Full-Stack Development';
  }
  return 'General Technical';
}

interface AiBulkIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCandidates: Candidate[];
  onSuccess?: (addedCount: number, scheduledCount: number) => void;
  onNavigateToCalendar?: () => void;
  onNavigateToDirectory?: () => void;
  currentUserName?: string;
}

export const AiBulkIntakeModal: React.FC<AiBulkIntakeModalProps> = ({
  isOpen,
  onClose,
  existingCandidates,
  onSuccess,
  onNavigateToCalendar,
  onNavigateToDirectory,
  currentUserName,
}) => {
  const { colors } = useTheme();

  // Active top-level tab: 1. Ingest (default), 2. Quotas & Time, 3. Plan Preview, 4. Dispatch, 5. Master Prompt
  const [activeTab, setActiveTab] = useState<'ingest' | 'quotas' | 'preview' | 'dispatch' | 'prompt'>('ingest');

  // AI Extraction & Direct Ingest State
  const [isExtractingWithAi, setIsExtractingWithAi] = useState<boolean>(false);
  const [aiExtractionError, setAiExtractionError] = useState<string | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Tab 1: Master Prompt Configuration State (optional external generator)
  const [promptFormat, setPromptFormat] = useState<'markdown' | 'json'>('markdown');
  const [targetRole, setTargetRole] = useState<string>('');
  const [defaultTimezone, setDefaultTimezone] = useState<string>('Asia/Karachi');
  const [interviewWindow, setInterviewWindow] = useState<string>('Next 5 business days');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Tab 2: Ingest & Parse State
  const [rawInput, setRawInput] = useState<string>('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parsedCandidates, setParsedCandidates] = useState<ParsedCandidateItem[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);

  // Tab 3: Interviewer Quota & Workload State
  const [interviewerProfiles, setInterviewerProfiles] = useState<InterviewerProfile[]>(() => {
    return computeLiveInterviewerWorkloads(existingCandidates, undefined, {
      displayName: currentUserName,
      email: currentUserName?.includes('@') ? currentUserName : undefined,
    });
  });

  // Re-synchronize live workloads whenever existingCandidates changes from Firestore real-time listener
  useEffect(() => {
    setInterviewerProfiles((prev) =>
      computeLiveInterviewerWorkloads(existingCandidates, prev, {
        displayName: currentUserName,
        email: currentUserName?.includes('@') ? currentUserName : undefined,
      })
    );
  }, [existingCandidates, currentUserName]);

  const [allocationStrategy, setAllocationStrategy] = useState<QuotaAllocationStrategy>('workload_aware');
  const [manualQuotas, setManualQuotas] = useState<Record<string, number>>({});
  const [candidateOverrides, setCandidateOverrides] = useState<Record<string, string>>({});

  // Auto-Scheduling Time Period & Hours Parameters
  const defaultDates = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const end = new Date(tomorrow);
    end.setDate(end.getDate() + 4);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      startStr: `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`,
      endStr: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
    };
  }, []);

  const [startDate, setStartDate] = useState<string>(defaultDates.startStr);
  const [endDate, setEndDate] = useState<string>(defaultDates.endStr);
  const [dailyStartTimePkt, setDailyStartTimePkt] = useState<string>('11:00');
  const [dailyEndTimePkt, setDailyEndTimePkt] = useState<string>('21:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [bufferMinutes, setBufferMinutes] = useState<number>(15);
  const [maxConcurrentTracks, setMaxConcurrentTracks] = useState<number>(3);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([
    'track-alpha',
    'track-beta',
    'track-gamma',
  ]);
  const [respectWakingHours, setRespectWakingHours] = useState<boolean>(true);
  const [excludeWeekends, setExcludeWeekends] = useState<boolean>(true);

  // Tab 4: Plan Review & Interactive Adjustment Matrix State (PREVIEW)
  const [planAllocations, setPlanAllocations] = useState<ScheduledSlotAllocation[]>([]);
  const [unallocatedList, setUnallocatedList] = useState<{ candidate: Candidate; reason: string }[]>([]);
  const [isPlanGenerated, setIsPlanGenerated] = useState<boolean>(false);

  // Tab 5: Dispatch & Live Committed State
  const [committedCandidates, setCommittedCandidates] = useState<Candidate[]>([]);
  const [selectedPreviewCandidateId, setSelectedPreviewCandidateId] = useState<string>('');
  const [luxuryTheme, setLuxuryTheme] = useState<LuxuryEmailTheme>('amber');
  const [isCopiedHtml, setIsCopiedHtml] = useState<boolean>(false);
  const [isCopiedText, setIsCopiedText] = useState<boolean>(false);

  // Execution states
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionPhase, setExecutionPhase] = useState<string>('');

  // Generate current prompt text dynamically
  const activePromptText = useMemo(() => {
    if (promptFormat === 'json') {
      return JSON_MASTER_AI_PROMPT;
    }
    return generateMasterPrompt({
      targetRole: targetRole || undefined,
      defaultTimezone: defaultTimezone || undefined,
      interviewWindow: interviewWindow || undefined,
      specialInstructions: specialInstructions || undefined,
    });
  }, [promptFormat, targetRole, defaultTimezone, interviewWindow, specialInstructions]);

  // Real-time Interviewer Quota & Assignment Engine calculation
  const allocationResult = useMemo(() => {
    return calculateSmartInterviewAssignments({
      candidates: parsedCandidates,
      interviewers: interviewerProfiles,
      strategy: allocationStrategy,
      manualQuotas,
      candidateOverrides,
    });
  }, [parsedCandidates, interviewerProfiles, allocationStrategy, manualQuotas, candidateOverrides]);

  // Group parsed candidates by sector
  const sectorGroups = useMemo(() => {
    const groups: Record<string, ParsedCandidateItem[]> = {};
    parsedCandidates.forEach((c) => {
      const sec = detectCandidateSector(c.position, c.notes);
      if (!groups[sec]) groups[sec] = [];
      groups[sec].push(c);
    });
    return groups;
  }, [parsedCandidates]);

  if (!isOpen) return null;

  // Copy prompt to clipboard
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(activePromptText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = activePromptText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const processAiExtractedData = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) {
      setAiExtractionError('No candidates could be recognized from the text.');
      return;
    }

    const existingEmailSet = new Set(
      existingCandidates.map((c) => c.email.trim().toLowerCase()).filter(Boolean)
    );

    const items: ParsedCandidateItem[] = data.map((item: any, idx: number) => {
      const name = (item.name || `Candidate ${idx + 1}`).trim();
      const email = (item.email || '').trim().toLowerCase();
      const phone = (item.phone || '').trim();
      const city = item.city || '';
      const country = item.country || '';
      const location = item.location || (city && country ? `${city}, ${country}` : city || country || '');
      const tzInfo = resolveCandidateTimezone({ timezone: item.timezone, country, location });
      const isDup = Boolean(email && existingEmailSet.has(email));

      return {
        id: `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${idx}`,
        name,
        email,
        phone,
        city,
        country,
        location,
        timezone: tzInfo.tz,
        timezoneLabel: tzInfo.label,
        position: item.position || 'Software Engineer',
        originalAvailability: item.originalAvailability || item.availability || '',
        notes: item.summary
          ? `${item.summary}${item.skills ? ` • Skills: ${item.skills}` : ''}`
          : item.skills || 'Extracted via Gemini AI',
        resumeLink: item.resumeLink || '',
        linkedinUrl: item.linkedinUrl,
        githubUrl: item.githubUrl,
        portfolioUrl: item.portfolioUrl,
        assignedInterviewer: item.assignedInterviewer,
        isDuplicate: isDup,
        status: 'Pending' as const,
      };
    });

    const dups = items.filter((i) => i.isDuplicate).length;
    setParseResult({
      candidates: items,
      detectedFormat: 'json',
      duplicateCount: dups,
      totalParsed: items.length,
      warnings: dups > 0 ? [`${dups} candidate(s) already in pipeline`] : [],
    });
    setParsedCandidates(items);
    setAiSuccessMsg(`✨ Successfully extracted ${items.length} candidate profile(s) with Gemini AI!`);
  };

  // Run Gemini AI extractor on pasted text
  const handleAiGeminiExtract = async (textToParse?: string) => {
    const input = (textToParse || rawInput).trim();
    if (!input) return;
    setIsExtractingWithAi(true);
    setAiExtractionError(null);
    setAiSuccessMsg(null);

    try {
      const res = await fetch('/api/bulk-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        const fallback = parseAnyRecruitmentInput(input, existingCandidates);
        if (fallback.candidates.length > 0) {
          setParseResult(fallback);
          setParsedCandidates(fallback.candidates);
          setAiSuccessMsg(`Parsed ${fallback.candidates.length} candidate(s) via structured text detection.`);
        } else {
          setAiExtractionError('No candidate profiles could be extracted. Please paste candidate details or use sample data.');
        }
        return;
      }

      processAiExtractedData(data);
    } catch (err: any) {
      console.warn('Gemini extraction error, falling back to local regex:', err);
      const fallback = parseAnyRecruitmentInput(input, existingCandidates);
      if (fallback.candidates.length > 0) {
        setParseResult(fallback);
        setParsedCandidates(fallback.candidates);
        setAiSuccessMsg(`Parsed ${fallback.candidates.length} candidate(s) via fallback detection.`);
      } else {
        setAiExtractionError(`AI extraction notice: ${err?.message || 'Could not parse text'}. Please try again or test with sample buttons.`);
      }
    } finally {
      setIsExtractingWithAi(false);
    }
  };

  // Upload and parse document file (PDF, TXT, CSV, JSON)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        setRawInput(`[Uploaded PDF Document: ${file.name}]`);
        setIsExtractingWithAi(true);
        setAiExtractionError(null);
        setAiSuccessMsg(null);
        try {
          const res = await fetch('/api/bulk-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileBase64: base64, mimeType: 'application/pdf' }),
          });
          if (!res.ok) throw new Error(`Document extraction failed (${res.status})`);
          const data = await res.json();
          processAiExtractedData(data);
        } catch (err: any) {
          setAiExtractionError(err?.message || 'Failed to extract from PDF document.');
        } finally {
          setIsExtractingWithAi(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setRawInput(text);
          handleAiGeminiExtract(text);
        }
      };
      reader.readAsText(file);
    }
  };

  // Direct Ingest to Firestore pipeline as Pending candidates
  const handleDirectIngestToFirestore = async () => {
    if (parsedCandidates.length === 0) return;
    setIsExecuting(true);
    setExecutionPhase('Writing candidate profiles to Firestore live database...');
    setExecutionError(null);

    try {
      const candidatesToCreate = parsedCandidates.map((c) => ({
        name: c.name,
        email: c.email,
        phone: c.phone || '',
        location: c.location || '',
        country: c.country || '',
        city: c.city || '',
        timezone: c.timezone || 'Asia/Karachi',
        timezoneLabel: c.timezoneLabel || 'PKT (UTC+5)',
        position: c.position || 'Software Engineer',
        originalAvailability: c.originalAvailability || '',
        suggestedPktTime: '',
        durationMinutes: 45,
        status: 'Pending' as const,
        notes: c.notes || 'Ingested via AI Bulk Engine',
        resumeLink: c.resumeLink,
        linkedinUrl: c.linkedinUrl,
        githubUrl: c.githubUrl,
        portfolioUrl: c.portfolioUrl,
        assignedInterviewer: c.assignedInterviewer,
      }));

      const created = await batchAddCandidates(candidatesToCreate);
      broadcastLiveSync('BATCH_SCHEDULE_COMPLETED', {
        count: created.length,
        scheduled: 0,
      });

      if (onSuccess) {
        onSuccess(created.length, 0);
      }
      onClose();
    } catch (err: any) {
      console.error('Direct Firestore ingest error:', err);
      setExecutionError(err?.message || 'Failed to write candidates to database.');
    } finally {
      setIsExecuting(false);
      setExecutionPhase('');
    }
  };

  // Run parser on pasted text (Fast local regex fallback)
  const handleParseInput = () => {
    if (!rawInput.trim()) return;
    setIsParsing(true);
    const result = parseAnyRecruitmentInput(rawInput, existingCandidates);
    setParseResult(result);
    setParsedCandidates(result.candidates);
    setIsParsing(false);
  };

  // Remove a candidate row before scheduling
  const handleRemoveParsedCandidate = (id: string) => {
    setParsedCandidates((prev) => prev.filter((c) => c.id !== id));
  };

  // Handlers for Quota Manager
  const handleStrategyChange = (newStrategy: QuotaAllocationStrategy) => {
    setAllocationStrategy(newStrategy);
  };

  const handleQuotaChange = (email: string, newQuota: number) => {
    setAllocationStrategy('custom');
    setManualQuotas((prev) => ({
      ...prev,
      [email]: Math.max(0, newQuota),
    }));
  };

  const handleToggleInterviewer = (email: string, enabled: boolean) => {
    setInterviewerProfiles((prev) => {
      const updated = prev.map((p) => (p.email.toLowerCase() === email.toLowerCase() ? { ...p, enabled } : p));
      saveInterviewerProfiles(updated);
      return updated;
    });
  };

  const handleCandidateOverride = (candidateId: string, interviewerEmail: string) => {
    setCandidateOverrides((prev) => ({
      ...prev,
      [candidateId]: interviewerEmail,
    }));
  };

  const handleAddInterviewer = (newProf: {
    name: string;
    email: string;
    role: string;
    seniority: 'Lead' | 'Senior' | 'Mid' | 'HR';
    skills: string[];
    dailyMaxCapacity: number;
    batchTargetQuota: number;
  }) => {
    const fullProfile: InterviewerProfile = {
      ...newProf,
      id: newProf.email,
      avatarGradient: 'from-amber-500 to-orange-600 text-white',
      enabled: true,
      weight: newProf.seniority === 'Lead' ? 4 : newProf.seniority === 'Senior' ? 3 : 2,
      liveActiveInterviews: 0,
      liveCompletedInterviews: 0,
      liveTodayInterviews: 0,
      assignedCountForBatch: 0,
    };

    setInterviewerProfiles((prev) => {
      const updated = [...prev.filter((p) => p.email.toLowerCase() !== fullProfile.email.toLowerCase()), fullProfile];
      saveInterviewerProfiles(updated);
      return updated;
    });
  };

  // Bulk / Sector Interviewer Assignment Handlers
  const handleAssignSectorInterviewer = (sectorName: string, interviewerEmail: string) => {
    const candidatesInSector = sectorGroups[sectorName] || [];
    setCandidateOverrides((prev) => {
      const next = { ...prev };
      candidatesInSector.forEach((c) => {
        next[c.id] = interviewerEmail;
      });
      return next;
    });
  };

  const handleBulkAssignAllCandidates = (interviewerEmail: string) => {
    setCandidateOverrides((prev) => {
      const next = { ...prev };
      parsedCandidates.forEach((c) => {
        next[c.id] = interviewerEmail;
      });
      return next;
    });
  };

  // Quick Date Presets
  const applyDatePreset = (preset: 'tomorrow' | 'next3' | 'workweek' | 'next5' | 'next10') => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + 1);

    const end = new Date(start);

    if (preset === 'tomorrow') {
      // 1 day
    } else if (preset === 'next3') {
      end.setDate(start.getDate() + 2);
    } else if (preset === 'workweek') {
      // Find Monday or next 5 days
      end.setDate(start.getDate() + 4);
    } else if (preset === 'next5') {
      end.setDate(start.getDate() + 4);
    } else if (preset === 'next10') {
      end.setDate(start.getDate() + 9);
    }

    setStartDate(toYmd(start));
    setEndDate(toYmd(end));
  };

  // Quick Daily Hours Presets (PKT)
  const applyHoursPreset = (preset: 'standard' | 'fullday' | 'afternoon' | 'morning') => {
    if (preset === 'standard') {
      setDailyStartTimePkt('11:00');
      setDailyEndTimePkt('19:00');
    } else if (preset === 'fullday') {
      setDailyStartTimePkt('10:00');
      setDailyEndTimePkt('21:00');
    } else if (preset === 'afternoon') {
      setDailyStartTimePkt('14:00');
      setDailyEndTimePkt('21:00');
    } else if (preset === 'morning') {
      setDailyStartTimePkt('09:00');
      setDailyEndTimePkt('14:00');
    }
  };

  // STEP 4: GENERATE SCHEDULE PLAN & SHOW INTERACTIVE PREVIEW
  const handleGenerateSchedulePlan = () => {
    if (parsedCandidates.length === 0) return;

    // Build temporary Candidate instances with candidateOverrides & smart allocations
    const tempCandidates: Candidate[] = parsedCandidates.map((p) => {
      const assignedInterviewer =
        candidateOverrides[p.id] ||
        allocationResult.assignments[p.id]?.assignedInterviewerEmail ||
        interviewerProfiles.find((i) => i.enabled)?.email ||
        'm.mattiulhasnain@gmail.com';

      return {
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        location: p.location,
        country: p.country,
        city: p.city,
        timezone: p.timezone,
        timezoneLabel: p.timezoneLabel,
        position: p.position,
        originalAvailability: p.originalAvailability,
        suggestedPktTime: '',
        durationMinutes,
        status: 'Pending',
        notes: p.notes,
        resumeLink: p.resumeLink,
        linkedinUrl: p.linkedinUrl,
        githubUrl: p.githubUrl,
        portfolioUrl: p.portfolioUrl,
        assignedInterviewer,
        interviewerEmails: [assignedInterviewer],
        scheduledInterviewerId: assignedInterviewer,
      };
    });

    const activeInterviewerEmails = interviewerProfiles.filter((i) => i.enabled).map((i) => i.email);

    const candidateInterviewerOverridesMap: Record<string, string> = {};
    tempCandidates.forEach((c) => {
      if (c.id && c.assignedInterviewer) {
        candidateInterviewerOverridesMap[c.id] = c.assignedInterviewer;
      }
    });

    const interviewerQuotas: Record<string, number> = {};
    allocationResult.interviewers.forEach((i) => {
      interviewerQuotas[i.email.toLowerCase().trim()] = i.batchTargetQuota;
    });

    const schedulerConfig: AutoSchedulerConfig = {
      startDate,
      endDate,
      dailyStartTimePkt,
      dailyEndTimePkt,
      durationMinutes,
      bufferMinutes,
      allowedTrackIds: selectedTracks,
      maxConcurrentPerSlot: maxConcurrentTracks,
      interviewers: activeInterviewerEmails,
      maxInterviewsPerDayPerInterviewer: 4,
      respectCandidateWakingHours: respectWakingHours,
      excludeWeekends,
      autoStatus: 'Scheduled',
      candidateInterviewerOverrides: candidateInterviewerOverridesMap,
      interviewerQuotas,
    };

    const schedResult = runAutoScheduler(tempCandidates, existingCandidates, schedulerConfig);

    setPlanAllocations(schedResult.allocations);
    setUnallocatedList(schedResult.unallocated);
    setIsPlanGenerated(true);
    setActiveTab('preview');
  };

  // In-Preview Slot Modification Handlers
  const handleUpdatePlanInterviewer = (candidateId: string, newInterviewerEmail: string) => {
    setPlanAllocations((prev) =>
      prev.map((a) =>
        a.candidateId === candidateId
          ? {
              ...a,
              assignedInterviewer: newInterviewerEmail,
              interviewerEmails: [newInterviewerEmail],
            }
          : a
      )
    );
  };

  const handleNudgePlanSlotTime = (candidateId: string, minutesDelta: number) => {
    setPlanAllocations((prev) =>
      prev.map((a) => {
        if (a.candidateId !== candidateId) return a;
        const currentD = new Date(a.slotIso);
        const newD = new Date(currentD.getTime() + minutesDelta * 60 * 1000);
        const newIso = newD.toISOString();
        return {
          ...a,
          slotIso: newIso,
          slotPktFormatted: formatPktDateTime(newIso),
          candidateLocalTimeFormatted: a.candidateTimezone
            ? formatInTimezone(newIso, a.candidateTimezone, { includeAbbr: true })
            : formatLocalDateTime(newIso),
        };
      })
    );
  };

  // STEP 5: APPROVE PLAN & COMMIT LIVE TO DATABASE (1 ATOMIC BATCH)
  const handleApprovePlanAndCommit = async () => {
    if (planAllocations.length === 0) return;
    setIsExecuting(true);
    setExecutionPhase('Locking Google Meet links & writing batch to Firestore live DB...');

    try {
      // 1. Prepare candidate models with approved slots & Google Meet URLs
      const candidatesToCreate = planAllocations.map((alloc) => {
        const original = parsedCandidates.find((p) => p.id === alloc.candidateId);
        return {
          name: alloc.candidateName,
          email: alloc.candidateEmail,
          phone: original?.phone || '',
          location: original?.location || alloc.candidateCountry || '',
          country: alloc.candidateCountry,
          city: original?.city || '',
          timezone: alloc.candidateTimezone,
          timezoneLabel: alloc.candidateTimezoneLabel,
          position: alloc.candidatePosition,
          originalAvailability: original?.originalAvailability || '',
          suggestedPktTime: alloc.slotIso,
          durationMinutes: alloc.durationMinutes,
          status: 'Scheduled' as const,
          notes: original?.notes || `Auto-scheduled to ${alloc.slotPktFormatted} on ${alloc.trackName}.`,
          resumeLink: original?.resumeLink,
          linkedinUrl: original?.linkedinUrl,
          githubUrl: original?.githubUrl,
          portfolioUrl: original?.portfolioUrl,
          assignedInterviewer: alloc.assignedInterviewer,
          interviewerEmails: alloc.interviewerEmails,
          scheduledInterviewerId: alloc.assignedInterviewer,
          trackId: alloc.trackId,
          trackName: alloc.trackName,
          meetLink: alloc.meetLink,
        };
      });

      // 2. Commit batch add to Firestore in ONE atomic writeBatch operation
      const createdCandidates = await batchAddCandidates(candidatesToCreate);

      // 3. Background Heroku/Postgres live mirror sync
      try {
        const fullList = [...createdCandidates, ...existingCandidates];
        syncCandidatesToHeroku(fullList).catch((e) => console.warn('Heroku sync notice:', e));
      } catch {}

      // 4. Broadcast live sync event across all open browser tabs
      broadcastLiveSync('BATCH_SCHEDULE_COMPLETED', {
        count: createdCandidates.length,
        scheduled: createdCandidates.length,
        allocationsSummary: planAllocations.map((a) => ({
          candidate: a.candidateName,
          time: a.slotIso,
          meet: a.meetLink,
        })),
      });

      setCommittedCandidates(createdCandidates);
      setSelectedPreviewCandidateId(createdCandidates[0]?.id || '');
      setActiveTab('dispatch');

      if (onSuccess) {
        onSuccess(createdCandidates.length, createdCandidates.length);
      }
    } catch (err: any) {
      console.error('Batch commit error:', err);
      setExecutionError(err?.message || 'Failed to commit batch to live database.');
    } finally {
      setIsExecuting(false);
      setExecutionPhase('');
    }
  };

  // Dispatch Tab Helpers
  const activePreviewCandidate = useMemo(() => {
    return (
      committedCandidates.find((c) => c.id === selectedPreviewCandidateId) ||
      committedCandidates[0] ||
      null
    );
  }, [committedCandidates, selectedPreviewCandidateId]);

  const activeLuxuryHtml = useMemo(() => {
    if (!activePreviewCandidate) return '';
    return generateLuxuryInterviewEmailHtml({
      candidateName: activePreviewCandidate.name,
      candidateEmail: activePreviewCandidate.email,
      position: activePreviewCandidate.position || 'Software Engineer',
      scheduledIsoTime: activePreviewCandidate.suggestedPktTime || new Date().toISOString(),
      durationMinutes: activePreviewCandidate.durationMinutes || 45,
      meetLink: activePreviewCandidate.meetLink || 'https://meet.google.com/new',
      trackName: activePreviewCandidate.trackName || 'Engineering Track Alpha',
      assignedInterviewer: activePreviewCandidate.assignedInterviewer || 'm.mattiulhasnain@gmail.com',
      candidateTimezone: activePreviewCandidate.timezone || 'Asia/Karachi',
      theme: luxuryTheme,
    });
  }, [activePreviewCandidate, luxuryTheme]);

  const activePlainText = useMemo(() => {
    if (!activePreviewCandidate) return '';
    return generateLuxuryInterviewPlainText({
      candidateName: activePreviewCandidate.name,
      position: activePreviewCandidate.position || 'Software Engineer',
      scheduledIsoTime: activePreviewCandidate.suggestedPktTime || new Date().toISOString(),
      durationMinutes: activePreviewCandidate.durationMinutes || 45,
      meetLink: activePreviewCandidate.meetLink || 'https://meet.google.com/new',
      trackName: activePreviewCandidate.trackName || 'Track Alpha',
      assignedInterviewer: activePreviewCandidate.assignedInterviewer || 'm.mattiulhasnain@gmail.com',
      candidateTimezone: activePreviewCandidate.timezone || 'Asia/Karachi',
    });
  }, [activePreviewCandidate]);

  const handleCopyLuxuryHtml = async () => {
    if (!activeLuxuryHtml) return;
    try {
      await navigator.clipboard.writeText(activeLuxuryHtml);
      setIsCopiedHtml(true);
      setTimeout(() => setIsCopiedHtml(false), 2500);
    } catch {}
  };

  const handleCopyPlainText = async () => {
    if (!activePlainText) return;
    try {
      await navigator.clipboard.writeText(activePlainText);
      setIsCopiedText(true);
      setTimeout(() => setIsCopiedText(false), 2500);
    } catch {}
  };

  const handleDownloadAllIcs = () => {
    const list = (committedCandidates.length > 0 ? committedCandidates : planAllocations).map((c: any) => ({
      candidateName: c.name || c.candidateName,
      candidateEmail: c.email || c.candidateEmail,
      candidatePosition: c.position || c.candidatePosition || 'Software Engineer',
      slotIso: c.suggestedPktTime || c.slotIso,
      durationMinutes: c.durationMinutes || 45,
      meetLink: c.meetLink || 'https://meet.google.com/new',
      assignedInterviewer: c.assignedInterviewer || 'hr@mihora.tech',
      trackName: c.trackName || 'Engineering Track Alpha',
    }));
    downloadBatchIcsFile(list, 'Technical_Interview_Cohort');
  };

  const handleOpenGmailBcc = () => {
    const emails = committedCandidates.map((c) => c.email).filter(Boolean);
    const bccParam = encodeURIComponent(emails.join(','));
    const subject = encodeURIComponent('Technical Interview Invitation & Google Meet Details - Mihora Tech');
    const bodyText = encodeURIComponent(
      `Dear Candidates,\n\nWe are pleased to invite you to your upcoming technical interview sessions.\n\nYour individual video meeting links and confirmed timeslots have been generated. Please refer to your personalized confirmation email or reply directly to this thread for any queries.\n\nBest regards,\nThe Hiring Team`
    );
    const mailUrl = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${bccParam}&su=${subject}&body=${bodyText}`;
    const link = document.createElement('a');
    link.href = mailUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 dark:border-stone-800 bg-linear-to-r from-amber-500/10 via-purple-500/5 to-emerald-500/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/25 font-bold shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-display text-stone-900 dark:text-stone-100">
                  AI Master Prompt &amp; Bulk Intake Engine
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                  Interactive Scheduler &amp; Dispatcher
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                Ingest notes, customize hours &amp; dates, assign by sector, preview the plan, and commit atomically to live DB.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5 Step Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'prompt'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. Master Prompt</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ingest')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ingest'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>2. Ingest &amp; Time Window</span>
            {parsedCandidates.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-600 text-white font-mono">
                {parsedCandidates.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quotas')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'quotas'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Quotas &amp; Strategy</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
              {allocationResult.totalAssigned}/{allocationResult.totalCandidates}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (planAllocations.length === 0 && parsedCandidates.length > 0) {
                handleGenerateSchedulePlan();
              } else {
                setActiveTab('preview');
              }
            }}
            disabled={parsedCandidates.length === 0}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'preview'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>4. Plan Preview (Review Before DB)</span>
            {planAllocations.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600 text-white font-mono">
                {planAllocations.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dispatch')}
            disabled={committedCandidates.length === 0}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'dispatch'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>5. HR Email Dispatch</span>
            {committedCandidates.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-mono">
                {committedCandidates.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* TAB 1: MASTER AI PROMPT */}
          {activeTab === 'prompt' && (
            <div className="space-y-6">
              
              {/* 3-Step Flow Infographic */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">1</span>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Copy Master Prompt</h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">Click the copy button below to copy the system extraction prompt.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">2</span>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Send to Any AI Chatbot</h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">Paste into ChatGPT, Claude, Gemini, or DeepSeek with your messy notes.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">3</span>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Paste in Tab 2 &amp; Preview Plan</h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">Adjust dates, PKT hours, sector interviewers, review in Step 4, then commit!</p>
                  </div>
                </div>
              </div>

              {/* Format Switcher & Options */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Prompt Output Format:
                  </span>
                  <div className="flex gap-1.5 bg-stone-200 dark:bg-stone-700 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPromptFormat('markdown')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        promptFormat === 'markdown'
                          ? 'bg-white dark:bg-stone-800 text-amber-700 dark:text-amber-400 shadow-xs'
                          : 'text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>Markdown Table (Recommended)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPromptFormat('json')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        promptFormat === 'json'
                          ? 'bg-white dark:bg-stone-800 text-amber-700 dark:text-amber-400 shadow-xs'
                          : 'text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Clean JSON Array</span>
                    </button>
                  </div>
                </div>

                {/* Optional Customizers */}
                {promptFormat === 'markdown' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-stone-200 dark:border-stone-700">
                    <div>
                      <span className="text-[11px] text-stone-500 font-semibold">Target Position (Optional)</span>
                      <input
                        type="text"
                        placeholder="e.g. Senior Backend Engineer"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-500 font-semibold">Default Timezone</span>
                      <input
                        type="text"
                        placeholder="e.g. Asia/Karachi"
                        value={defaultTimezone}
                        onChange={(e) => setDefaultTimezone(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-500 font-semibold">Target Timeframe</span>
                      <input
                        type="text"
                        placeholder="e.g. Next 5 business days"
                        value={interviewWindow}
                        onChange={(e) => setInterviewWindow(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Master Prompt Code Viewer */}
              <div className="relative border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden bg-stone-950 text-stone-200 shadow-md">
                <div className="p-3 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-xs">
                  <span className="font-mono text-stone-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    recruit_sync_master_prompt_{promptFormat}.txt
                  </span>
                  
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Master AI Prompt</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-4 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[280px] text-amber-200/90 whitespace-pre-wrap select-all">
                  {activePromptText}
                </pre>
              </div>

              {/* Action Banner */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
                <div className="text-xs text-stone-600 dark:text-stone-400">
                  Ready with formatted candidate output from ChatGPT or Claude? Switch to Tab 2 to paste and configure!
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('ingest')}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Go to Step 2: Ingest &amp; Time Window</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: INGEST & TIME PERIOD + SECTOR ASSIGNMENT */}
          {activeTab === 'ingest' && (
            <div className="space-y-6">
              
              {/* Input Paste Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Table className="w-4 h-4 text-amber-600" />
                    Paste Output from AI (Markdown Table, JSON, or Text)
                  </label>
                  {parseResult && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      Detected Format: {parseResult.detectedFormat.toUpperCase()} ({parsedCandidates.length} parsed)
                    </span>
                  )}
                </div>

                <textarea
                  rows={5}
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder={`Paste the AI output here...\n\nExample Markdown Table:\n| Name | Email | Phone | City | Country | Timezone | Position |\n| Alice Khan | alice@example.com | +92 300 1234567 | Karachi | Pakistan | Asia/Karachi | Senior React Dev |\n| Bob Smith | bob@example.com | +1 555-0199 | New York | United States | America/New_York | Cloud Architect |`}
                  className="w-full p-3.5 text-xs font-mono rounded-2xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 leading-relaxed"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-stone-500">
                    Supports Markdown tables, JSON arrays, and key-value blocks.
                  </span>
                  <button
                    type="button"
                    onClick={handleParseInput}
                    disabled={isParsing || !rawInput.trim()}
                    className="px-4 py-1.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-bold text-xs hover:opacity-90 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Parsing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Auto-Detect &amp; Parse Candidates</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* TIME ASSIGNMENT & PERIOD SELECTOR PANEL */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/50 dark:border-amber-900/30 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <div>
                      <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        Time Assignment &amp; Scheduling Period Window
                      </h3>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        Configure date period and PKT working hours. Interviews are automatically fitted and clash-free.
                      </p>
                    </div>
                  </div>

                  {/* Quick Hour Presets */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-stone-500 font-bold uppercase mr-1">Hour Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyHoursPreset('standard')}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-500 cursor-pointer"
                    >
                      11am-7pm
                    </button>
                    <button
                      type="button"
                      onClick={() => applyHoursPreset('fullday')}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-500 cursor-pointer"
                    >
                      10am-9pm (Full)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyHoursPreset('afternoon')}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-500 cursor-pointer"
                    >
                      2pm-9pm
                    </button>
                  </div>
                </div>

                {/* Date Presets Row */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-stone-600 dark:text-stone-400 font-semibold">Date Range Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyDatePreset('tomorrow')}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-amber-500 text-stone-700 dark:text-stone-300 cursor-pointer"
                  >
                    Tomorrow Only
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDatePreset('next3')}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-amber-500 text-stone-700 dark:text-stone-300 cursor-pointer"
                  >
                    Next 3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDatePreset('next5')}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 cursor-pointer"
                  >
                    Next 5 Business Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDatePreset('next10')}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-amber-500 text-stone-700 dark:text-stone-300 cursor-pointer"
                  >
                    Next 10 Days
                  </button>
                </div>

                {/* Primary Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[11px] text-stone-600 dark:text-stone-400 font-semibold block">Start Date (PKT)</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-stone-600 dark:text-stone-400 font-semibold block">End Date (PKT)</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-stone-600 dark:text-stone-400 font-semibold block">Daily PKT Window</span>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="time"
                        value={dailyStartTimePkt}
                        onChange={(e) => setDailyStartTimePkt(e.target.value)}
                        className="w-1/2 px-1.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                      />
                      <span className="text-stone-400 text-xs">-</span>
                      <input
                        type="time"
                        value={dailyEndTimePkt}
                        onChange={(e) => setDailyEndTimePkt(e.target.value)}
                        className="w-1/2 px-1.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-stone-600 dark:text-stone-400 font-semibold block">Duration &amp; Buffer</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <select
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-bold"
                      >
                        <option value={15}>15m</option>
                        <option value={30}>30m</option>
                        <option value={45}>45m</option>
                        <option value={60}>60m</option>
                      </select>
                      <select
                        value={bufferMinutes}
                        onChange={(e) => setBufferMinutes(Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-bold"
                      >
                        <option value={0}>0m buf</option>
                        <option value={10}>10m buf</option>
                        <option value={15}>15m buf</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Additional Constraints & Concurrency */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-amber-200/40 dark:border-amber-900/30 text-xs">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={respectWakingHours}
                        onChange={(e) => setRespectWakingHours(e.target.checked)}
                        className="w-3.5 h-3.5 text-amber-600 rounded-sm border-stone-300 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        Respect Candidate Daylight Hours (08:30-20:30 local)
                      </span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={excludeWeekends}
                        onChange={(e) => setExcludeWeekends(e.target.checked)}
                        className="w-3.5 h-3.5 text-amber-600 rounded-sm border-stone-300 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="font-semibold text-stone-700 dark:text-stone-300">
                        Skip Weekends (Sat/Sun)
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-stone-500 font-semibold">Parallel Tracks:</span>
                    <select
                      value={maxConcurrentTracks}
                      onChange={(e) => setMaxConcurrentTracks(Number(e.target.value))}
                      className="px-2 py-1 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-bold"
                    >
                      <option value={1}>1 Track (Single Room)</option>
                      <option value={2}>2 Tracks (Alpha, Beta)</option>
                      <option value={3}>3 Tracks (Alpha, Beta, Gamma)</option>
                      <option value={4}>4 Tracks (All Concurrency)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTOR & BULK INTERVIEWER ASSIGNMENT PANEL */}
              {parsedCandidates.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-purple-600" />
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                          Sector &amp; Bulk Interviewer Assignment
                        </h4>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">
                          Assign interviewers by technical domain/sector, bulk assign all, or balance via Quotas tab.
                        </p>
                      </div>
                    </div>

                    {/* Bulk Assign All Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-stone-500 font-semibold">Bulk Assign All:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) handleBulkAssignAllCandidates(e.target.value);
                        }}
                        className="px-2.5 py-1 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-bold cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled>Select Interviewer...</option>
                        {interviewerProfiles
                          .filter((i) => i.enabled)
                          .map((prof) => (
                            <option key={prof.email} value={prof.email}>
                              {prof.name} ({prof.email})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Sector Groups Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                    {(Object.entries(sectorGroups) as [string, ParsedCandidateItem[]][]).map(([sectorName, items]) => (
                      <div
                        key={sectorName}
                        className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-800 dark:text-stone-200 truncate">
                            {sectorName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300">
                            {items.length} candidate{items.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-stone-500">Assign:</span>
                          <select
                            onChange={(e) => handleAssignSectorInterviewer(sectorName, e.target.value)}
                            className="flex-1 px-1.5 py-1 text-[11px] rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 cursor-pointer"
                            defaultValue=""
                          >
                            <option value="" disabled>Choose Interviewer...</option>
                            {interviewerProfiles
                              .filter((i) => i.enabled)
                              .map((prof) => (
                                <option key={prof.email} value={prof.email}>
                                  {prof.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedCandidates.length > 0 && (
                <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs space-y-0">
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                        Parsed Candidates Preview ({parsedCandidates.length})
                      </span>
                    </div>
                    {parseResult && parseResult.duplicateCount > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        {parseResult.duplicateCount} Duplicate Email(s)
                      </span>
                    )}
                  </div>

                  <div className="max-h-[190px] overflow-y-auto divide-y divide-stone-200 dark:divide-stone-800">
                    {parsedCandidates.map((cand, idx) => {
                      const assignment = allocationResult.assignments[cand.id];
                      const assignedEmail = candidateOverrides[cand.id] || assignment?.assignedInterviewerEmail;
                      const assignedProf = interviewerProfiles.find((p) => p.email.toLowerCase() === assignedEmail?.toLowerCase());

                      return (
                        <div
                          key={cand.id}
                          className="p-3 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <span className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                                {cand.name}
                                {cand.isDuplicate && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold">
                                    Already in DB
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-500">{cand.email} • {cand.phone}</div>
                            </div>
                          </div>

                          <div className="min-w-[140px]">
                            <div className="text-stone-900 dark:text-stone-100 font-medium truncate max-w-[160px]">
                              {cand.position}
                            </div>
                            <div className="text-[11px] text-stone-500 flex items-center gap-1">
                              <Globe className="w-3 h-3 text-stone-400" />
                              <span>{cand.location}</span>
                            </div>
                          </div>

                          {/* Quick Interviewer Selector */}
                          <div className="min-w-[170px]">
                            <select
                              value={assignedEmail || ''}
                              onChange={(e) => handleCandidateOverride(cand.id, e.target.value)}
                              className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 cursor-pointer"
                            >
                              {interviewerProfiles
                                .filter((i) => i.enabled)
                                .map((prof) => (
                                  <option key={prof.email} value={prof.email}>
                                    {prof.name}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveParsedCandidate(cand.id)}
                            className="p-1.5 text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Remove from batch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ready to Preview Banner */}
              {parsedCandidates.length > 0 && (
                <div className="p-4 rounded-2xl bg-linear-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-stone-700 dark:text-stone-300">
                    <strong className="text-stone-900 dark:text-stone-100 font-bold">
                      {parsedCandidates.length} candidate{parsedCandidates.length !== 1 ? 's' : ''} ready!
                    </strong>{' '}
                    Next, generate the schedule plan to preview clash-free time slots, daylight comfort, and Google Meet rooms before committing.
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateSchedulePlan}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
                  >
                    <span>Generate &amp; Preview Plan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: SMART USER INTERVIEW QUOTAS & DISTRIBUTION */}
          {activeTab === 'quotas' && (
            <InterviewerQuotaManager
              candidates={parsedCandidates}
              allocationResult={allocationResult}
              currentStrategy={allocationStrategy}
              onStrategyChange={handleStrategyChange}
              onQuotaChange={handleQuotaChange}
              onToggleInterviewer={handleToggleInterviewer}
              onCandidateOverride={handleCandidateOverride}
              onAddInterviewer={handleAddInterviewer}
            />
          )}

          {/* TAB 4: SCHEDULE PLAN REVIEW & INTERACTIVE MATRIX (PREVIEW BEFORE DB) */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              
              {/* Plan Statistics Overview Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-blue-500/10 via-amber-500/10 to-emerald-500/10 border border-blue-500/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          Schedule Plan Preview &amp; Interactive Adjustments
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          100% Clash-Free Verified
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                        Review exact allocated dates, candidate local times, rooms, and Google Meet links before saving live to database.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateSchedulePlan}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-500 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-Calculate Plan</span>
                  </button>
                </div>

                {/* Plan Stats Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-blue-500/20 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-500 block">Total Candidates</span>
                    <span className="text-base font-bold text-stone-900 dark:text-stone-100">
                      {planAllocations.length} Scheduled
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-500 block">Date Period Span</span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate block">
                      {startDate} &rarr; {endDate}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-500 block">Daily PKT Window</span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {dailyStartTimePkt} - {dailyEndTimePkt} ({durationMinutes}m)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-500 block">Rooms / Tracks Active</span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {maxConcurrentTracks} Tracks Concurrency
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive Schedule Allocation Matrix */}
              <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    Allocated Candidates Schedule ({planAllocations.length})
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Use quick buttons to adjust timeslots or switch interviewers in place.
                  </span>
                </div>

                <div className="divide-y divide-stone-200 dark:divide-stone-800 max-h-[380px] overflow-y-auto">
                  {planAllocations.map((alloc, idx) => {
                    return (
                      <div
                        key={alloc.candidateId}
                        className="p-3.5 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        {/* Candidate & Position */}
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <span className="w-7 h-7 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                              {alloc.candidateName}
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                                {detectCandidateSector(alloc.candidatePosition)}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-500">
                              {alloc.candidateEmail} • {alloc.candidatePosition}
                            </div>
                          </div>
                        </div>

                        {/* Scheduled Timeslot & Timezone Daylight Indicator */}
                        <div className="min-w-[240px] space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{alloc.slotPktFormatted}</span>
                            <span className="text-[10px] text-stone-400 font-normal">(PKT)</span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-stone-600 dark:text-stone-400">
                            <span>{alloc.daylightLabel}</span>
                            <span className="text-stone-400">•</span>
                            <span className="truncate max-w-[140px]">{alloc.candidateLocalTimeFormatted}</span>
                          </div>

                          {/* Slot adjustment buttons */}
                          <div className="flex items-center gap-1 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleNudgePlanSlotTime(alloc.candidateId, -30)}
                              className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 cursor-pointer"
                              title="Shift 30 minutes earlier"
                            >
                              -30m
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNudgePlanSlotTime(alloc.candidateId, -15)}
                              className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 cursor-pointer"
                              title="Shift 15 minutes earlier"
                            >
                              -15m
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNudgePlanSlotTime(alloc.candidateId, 15)}
                              className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 cursor-pointer"
                              title="Shift 15 minutes later"
                            >
                              +15m
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNudgePlanSlotTime(alloc.candidateId, 30)}
                              className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 cursor-pointer"
                              title="Shift 30 minutes later"
                            >
                              +30m
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNudgePlanSlotTime(alloc.candidateId, 24 * 60)}
                              className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 cursor-pointer"
                              title="Shift to Next Day"
                            >
                              +1 Day
                            </button>
                          </div>
                        </div>

                        {/* Assigned Interviewer Selector & Track */}
                        <div className="min-w-[190px] space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-stone-500">Interviewer:</span>
                            <select
                              value={alloc.assignedInterviewer}
                              onChange={(e) => handleUpdatePlanInterviewer(alloc.candidateId, e.target.value)}
                              className="px-2 py-1 text-[11px] font-bold rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 cursor-pointer"
                            >
                              {interviewerProfiles
                                .filter((i) => i.enabled)
                                .map((prof) => (
                                  <option key={prof.email} value={prof.email}>
                                    {prof.name}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: alloc.trackColor }}></span>
                            <span>{alloc.trackName}</span>
                          </div>
                        </div>

                        {/* Google Meet Link */}
                        <div className="min-w-[180px] flex items-center gap-1.5">
                          <a
                            href={alloc.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors flex items-center gap-1 truncate max-w-[150px]"
                            title={alloc.meetLink}
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{alloc.meetLink.replace('https://', '')}</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(alloc.meetLink)}
                            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                            title="Copy meet link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Unallocated Notice if any */}
              {unallocatedList.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Notice:</strong> {unallocatedList.length} candidate(s) could not be fitted into the current date range and daylight parameters. Expand the date period in Tab 2 or allow evening hours.
                  </span>
                </div>
              )}

              {/* Approve & Push to Live DB Action Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-emerald-500/10 via-amber-500/10 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Ready to Approve Plan &amp; Commit Live?
                  </h4>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                    Clicking approve will atomically save all candidates to Firestore live DB, lock Google Meet rooms, and advance to HR Email Dispatch.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ingest')}
                    className="px-4 py-2 text-xs font-semibold rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    Adjust Parameters
                  </button>

                  <button
                    type="button"
                    onClick={handleApprovePlanAndCommit}
                    disabled={isExecuting || planAllocations.length === 0}
                    className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold rounded-xl bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{executionPhase || 'Pushing to DB...'}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Approve Plan &amp; Push to Live DB ({planAllocations.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: HR EMAIL DISPATCH & LUXURY INVITATION PREVIEW */}
          {activeTab === 'dispatch' && (
            <div className="space-y-6">
              
              {/* Success Live DB Status Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/25 shrink-0">
                    <Check className="w-5 h-5 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      Plan Approved &amp; Committed Live to Database!
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                      <strong className="text-stone-900 dark:text-stone-100 font-bold">{committedCandidates.length} interviews</strong> are saved with real-time Firestore persistence and Google Meet rooms.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadAllIcs}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:border-amber-500 shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-600" />
                    <span>Download All .ICS Files</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenGmailBcc}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md shadow-red-600/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open in Gmail (BCC All)</span>
                  </button>
                </div>
              </div>

              {/* Luxury Email Preview & Customizer Controls */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Candidate Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300">Preview Candidate:</span>
                    <select
                      value={selectedPreviewCandidateId}
                      onChange={(e) => setSelectedPreviewCandidateId(e.target.value)}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 cursor-pointer"
                    >
                      {committedCandidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.position}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Luxury Theme Color Switcher */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-stone-500 mr-1">Theme:</span>
                    {(['amber', 'sapphire', 'emerald', 'amethyst', 'obsidian'] as LuxuryEmailTheme[]).map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => setLuxuryTheme(theme)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize transition-all cursor-pointer ${
                          luxuryTheme === theme
                            ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>

                  {/* Quick Copy Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLuxuryHtml}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {isCopiedHtml ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Copied HTML!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Luxury HTML</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyPlainText}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {isCopiedText ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Copied Text!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy WhatsApp Text</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Live Interactive Email Card Preview */}
                <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-950 p-4 sm:p-6 flex justify-center">
                  <div className="w-full max-w-[620px] bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200">
                    <iframe
                      title="Luxury Email Invitation"
                      srcDoc={activeLuxuryHtml}
                      className="w-full h-[540px] border-none"
                    />
                  </div>
                </div>
              </div>

              {/* Navigation Options */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                {onNavigateToCalendar && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToCalendar();
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>View in Calendar</span>
                  </button>
                )}
                {onNavigateToDirectory && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToDirectory();
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 transition-all cursor-pointer"
                  >
                    View in Directory
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl text-stone-500 hover:text-stone-700 cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        {activeTab !== 'dispatch' && (
          <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-stone-500">
              {activeTab === 'prompt' ? (
                <span>Step 1: Copy prompt and pass to ChatGPT/Claude with your messy recruitment notes.</span>
              ) : activeTab === 'ingest' ? (
                <span>
                  {parsedCandidates.length > 0 ? (
                    <strong className="text-stone-800 dark:text-stone-200">
                      Step 2: {parsedCandidates.length} candidate{parsedCandidates.length !== 1 ? 's' : ''} parsed. Configure dates &amp; PKT hours, then click &quot;Generate &amp; Preview Plan&quot;.
                    </strong>
                  ) : (
                    <span>Step 2: Paste AI table or JSON above and click parse candidates.</span>
                  )}
                </span>
              ) : activeTab === 'quotas' ? (
                <span>
                  Step 3: Configured <strong className="text-stone-800 dark:text-stone-200">{allocationResult.totalAssigned}</strong> of {parsedCandidates.length} candidate quotas.
                </span>
              ) : (
                <span>
                  Step 4: Review all allocated clash-free slots and interviewers before approving.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isExecuting}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {activeTab === 'prompt' && (
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Master AI Prompt</span>
                    </>
                  )}
                </button>
              )}

              {activeTab === 'ingest' && parsedCandidates.length > 0 && (
                <button
                  type="button"
                  onClick={handleGenerateSchedulePlan}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md shadow-amber-600/25 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Generate &amp; Preview Plan ({parsedCandidates.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {activeTab === 'quotas' && parsedCandidates.length > 0 && (
                <button
                  type="button"
                  onClick={handleGenerateSchedulePlan}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md shadow-amber-600/25 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Proceed to Plan Preview &rarr;</span>
                </button>
              )}

              {activeTab === 'preview' && planAllocations.length > 0 && (
                <button
                  type="button"
                  onClick={handleApprovePlanAndCommit}
                  disabled={isExecuting}
                  className="px-6 py-2.5 text-xs font-bold rounded-xl bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{executionPhase || 'Pushing to Live DB...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Approve Plan &amp; Push to Live DB ({planAllocations.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
