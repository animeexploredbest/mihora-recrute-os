import React, { useState, useRef } from 'react';
import { Candidate } from '../types';
import {
  X,
  Save,
  Sparkles,
  Loader2,
  Trash2,
  Globe,
  MapPin,
  Clock,
  Linkedin,
  Github,
  ExternalLink,
  UploadCloud,
  FileText,
  FileCheck,
  CheckCircle2,
  Video,
  AlertCircle,
  Calendar,
  CalendarPlus,
  CalendarCheck,
  AlertTriangle,
} from 'lucide-react';
import { DateTimePicker } from './DateTimePicker';
import { AVAILABLE_COUNTRIES } from '../lib/geo-utils';
import { formatLocalDateTime, formatPktDateTime } from '../lib/date-utils';
import { TimezoneSelector } from './TimezoneSelector';
import { getDiffFromPktDetailed, evaluateCandidateWorkingHours } from '../lib/timezone-utils';
import { DEFAULT_INTERVIEW_TRACKS, getTrackById } from '../lib/track-constants';
import { findSlotConflicts } from '../lib/conflict-detector';
import { Layers } from 'lucide-react';

interface CandidateModalProps {
  initialData?: Candidate;
  allCandidates?: Candidate[];
  onClose: () => void;
  onSave: (data: Omit<Candidate, 'id'>, shouldViewInCalendar?: boolean) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function CandidateModal({ initialData, allCandidates = [], onClose, onSave, onDelete }: CandidateModalProps) {
  const [formData, setFormData] = useState<Omit<Candidate, 'id' | 'userId'>>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    country: initialData?.country || 'Pakistan',
    city: initialData?.city || '',
    timezone: initialData?.timezone || 'Asia/Karachi',
    timezoneLabel: initialData?.timezoneLabel || 'PKT (UTC+5)',
    location: initialData?.location || (initialData?.country ? initialData.country : 'Pakistan'),
    originalAvailability: initialData?.originalAvailability || '',
    suggestedPktTime: initialData?.suggestedPktTime || new Date(Date.now() + 86400000).toISOString(),
    durationMinutes: initialData?.durationMinutes || 45,
    position: initialData?.position || '',
    status: initialData?.status || 'Pending',
    trackId: initialData?.trackId || 'track-alpha',
    trackName: initialData?.trackName || getTrackById(initialData?.trackId).name,
    meetLink: initialData?.meetLink || '',
    notes: initialData?.notes || '',
    resumeLink: initialData?.resumeLink || '',
    linkedinUrl: initialData?.linkedinUrl || '',
    githubUrl: initialData?.githubUrl || '',
    portfolioUrl: initialData?.portfolioUrl || '',
    aiSummary: initialData?.aiSummary || '',
    aiSkills: initialData?.aiSkills || '',
    aiRating: initialData?.aiRating || '',
    scorecard: initialData?.scorecard,
  });
  
  const isFromSlotPicker = Boolean(initialData?.suggestedPktTime && !initialData?.id);
  const [scheduleToCalendar, setScheduleToCalendar] = useState<boolean>(() => {
    if (initialData?.status === 'Scheduled' || initialData?.status === 'Rescheduled') return true;
    if (initialData?.status === 'Interviewed' || initialData?.status === 'Selected') return true;
    if (isFromSlotPicker) return true;
    return true; // Default to booking into calendar immediately so any added candidate appears on calendar
  });

  const [saving, setSaving] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [aiInputMode, setAiInputMode] = useState<'upload' | 'text'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiInput, setShowAiInput] = useState(!initialData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<string[]>(initialData?.aiQuestions || []);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent, viewInCalendar: boolean = false) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError('Candidate name is required.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setModalError('A valid candidate email address is required.');
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      // If user enabled scheduleToCalendar and status is 'Pending', promote to 'Scheduled'
      const finalStatus =
        scheduleToCalendar && (formData.status === 'Pending' || !formData.status)
          ? 'Scheduled'
          : !scheduleToCalendar && formData.status === 'Scheduled'
          ? 'Pending'
          : formData.status;

      const effectiveTrack = getTrackById(formData.trackId || 'track-alpha');
      await onSave({
        ...formData,
        suggestedPktTime: scheduleToCalendar ? formData.suggestedPktTime : '',
        status: finalStatus,
        trackId: effectiveTrack.id,
        trackName: effectiveTrack.name,
        aiQuestions,
      }, viewInCalendar);
    } catch (err: any) {
      let msg = err.message || 'Failed to save candidate';
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch {}
      setModalError(msg);
    } finally {
      setSaving(false);
    }
  };

  const processAnalysisPayload = async (payload: { text?: string; fileBase64?: string; mimeType?: string }, fileName?: string) => {
    setIsAnalyzing(true);
    setModalError(null);
    try {
      const response = await fetch('/api/analyze-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      
      if (response.ok && data) {
        setFormData(prev => {
          const detectedCountry = data.country || prev.country || 'Pakistan';
          const detectedCity = data.city || prev.city || '';
          const matchedCountry = AVAILABLE_COUNTRIES.find(
            (c) => c.name.toLowerCase() === detectedCountry.toLowerCase()
          );
          const newTz = matchedCountry ? matchedCountry.timezone : (prev.timezone || 'Asia/Karachi');
          const newTzLabel = matchedCountry ? matchedCountry.timezoneLabel : (prev.timezoneLabel || 'PKT (UTC+5)');

          return {
            ...prev,
            name: data.name || prev.name,
            email: data.email || prev.email,
            phone: data.phone || prev.phone,
            country: detectedCountry,
            city: detectedCity,
            timezone: newTz,
            timezoneLabel: newTzLabel,
            location: detectedCity ? `${detectedCity}, ${detectedCountry}` : detectedCountry,
            position: data.position || prev.position,
            aiSummary: data.summary || prev.aiSummary,
            aiSkills: data.skills || prev.aiSkills,
            aiRating: data.rating || prev.aiRating,
            notes: fileName ? (prev.notes ? `${prev.notes}\n[Parsed from file: ${fileName}]` : `[Parsed from file: ${fileName}]`) : prev.notes,
          };
        });
        setShowAiInput(false);
      } else {
        setModalError('Failed to analyze resume: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error(err);
      setModalError('Error connecting to resume analyzer service');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAiAnalyzeText = async () => {
    if (!resumeText.trim()) return;
    await processAnalysisPayload({ text: resumeText });
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;
    setUploadedFile(file);

    const isTextLike = file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.type === 'text/plain';
    if (isTextLike) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setResumeText(text);
        processAnalysisPayload({ text }, file.name);
      };
      reader.readAsText(file);
    } else {
      // PDF, DOC, DOCX, or images
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64 = result.split(',')[1];
        const mimeType = file.type || 'application/pdf';
        processAnalysisPayload({ fileBase64: base64, mimeType }, file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateQuestions = async () => {
    setIsGeneratingQuestions(true);
    setModalError(null);
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          position: formData.position,
          skills: formData.aiSkills,
          summary: formData.aiSummary
        })
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setAiQuestions(data);
      } else {
        setModalError('Failed to generate questions: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error(err);
      setModalError('Error connecting to question generator service');
    }
    setIsGeneratingQuestions(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Pinned Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold font-display text-gray-900">{initialData ? 'Edit Candidate' : 'Add Candidate'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form with Scrollable Content & Pinned Action Bar */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
                <span>{modalError}</span>
                <button
                  type="button"
                  onClick={() => setModalError(null)}
                  className="text-red-500 hover:text-red-800 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {showAiInput && (
              <div className="p-4 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-indigo-950 font-bold text-sm">
                    <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
                    AI Resume Auto-Parser &amp; Profile Extraction
                  </div>
                  {/* Mode switcher */}
                  <div className="flex items-center bg-indigo-100/70 p-0.5 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setAiInputMode('upload')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        aiInputMode === 'upload'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-indigo-800 hover:text-indigo-950'
                      }`}
                    >
                      Upload File (PDF/DOCX)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiInputMode('text')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        aiInputMode === 'text'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-indigo-800 hover:text-indigo-950'
                      }`}
                    >
                      Paste Text
                    </button>
                  </div>
                </div>

                {aiInputMode === 'upload' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.rtf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer bg-white ${
                        isDragging
                          ? 'border-indigo-600 bg-indigo-50/50 scale-[1.01]'
                          : 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30'
                      }`}
                    >
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center py-2 text-indigo-600">
                          <Loader2 className="w-8 h-8 animate-spin mb-2" />
                          <p className="text-sm font-bold">Gemini AI is reading &amp; analyzing resume...</p>
                          <p className="text-xs text-indigo-500 mt-0.5">Extracting candidate name, contact, skills, and ranking...</p>
                        </div>
                      ) : uploadedFile ? (
                        <div className="flex items-center justify-center gap-3 py-1">
                          <FileCheck className="w-7 h-7 text-emerald-600" />
                          <div className="text-left">
                            <p className="text-xs font-bold text-gray-800">{uploadedFile.name}</p>
                            <p className="text-[11px] text-gray-500">{(uploadedFile.size / 1024).toFixed(1)} KB • Click or drop to replace</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-1">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-gray-800">
                            Drag &amp; drop candidate resume (PDF, Word, TXT)
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            or <span className="text-indigo-600 font-semibold underline">browse files from your computer</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <textarea 
                      value={resumeText}
                      onChange={e => setResumeText(e.target.value)}
                      placeholder="Paste candidate's resume or bio text here to automatically extract Name, Email, Role, Skills, and Summary..."
                      className="w-full border-indigo-200 rounded-xl shadow-xs focus:border-indigo-500 focus:ring-indigo-500 p-3 text-xs sm:text-sm h-28 bg-white font-sans"
                    />
                    <div className="flex justify-end">
                      <button 
                        type="button"
                        onClick={handleAiAnalyzeText}
                        disabled={isAnalyzing || !resumeText.trim()}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center transition-colors shadow-xs cursor-pointer"
                      >
                        {isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : 'Extract Details with AI'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!showAiInput && !initialData && (
              <button
                type="button"
                onClick={() => setShowAiInput(true)}
                className="text-xs sm:text-sm text-indigo-600 font-semibold hover:underline flex items-center cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mr-1.5" /> Upload another resume or paste text with AI
              </button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Full Name</label>
                <input 
                  required 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full border-gray-300 rounded-xl shadow-xs focus:border-indigo-500 focus:ring-indigo-500 border p-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-500 font-medium"
                  placeholder="Candidate Full Name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Email Address</label>
                <input 
                  required 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="w-full border-gray-300 rounded-xl shadow-xs focus:border-indigo-500 focus:ring-indigo-500 border p-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-500 font-medium"
                  placeholder="candidate@example.com"
                />
              </div>
            </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Position / Role</label>
              <input 
                required 
                type="text" 
                value={formData.position || ''} 
                onChange={e => setFormData({...formData, position: e.target.value})} 
                className="w-full border-gray-300 rounded-xl shadow-xs focus:border-indigo-500 focus:ring-indigo-500 border p-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-500 font-medium" 
                placeholder="e.g., Senior Full Stack Engineer" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Phone Number</label>
              <input 
                type="text" 
                value={formData.phone || ''} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                className="w-full border-gray-300 rounded-xl shadow-xs focus:border-indigo-500 focus:ring-indigo-500 border p-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-500 font-medium" 
                placeholder="+92 300 1234567" 
              />
            </div>
          </div>

          {/* Country & Location & Worldwide Timezone - Linked directly to 3D World Map & Globe */}
          <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-amber-600" />
                Global Location &amp; Time Zone
              </span>
              <span className="text-[11px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                All World Timezones Supported
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Candidate Country <span className="text-amber-600">*</span>
                </label>
                <select 
                  required
                  value={formData.country || 'Pakistan'} 
                  onChange={e => {
                    const selCountry = e.target.value;
                    const matched = AVAILABLE_COUNTRIES.find(c => c.name.toLowerCase() === selCountry.toLowerCase());
                    setFormData(prev => ({
                      ...prev, 
                      country: selCountry,
                      location: prev.city ? `${prev.city}, ${selCountry}` : selCountry,
                      ...(matched ? { timezone: matched.timezone, timezoneLabel: matched.timezoneLabel } : {})
                    }));
                  }} 
                  className="w-full border-gray-300 rounded-xl shadow-xs focus:border-amber-500 focus:ring-amber-500 border p-2.5 text-sm bg-white font-semibold text-gray-900 cursor-pointer"
                >
                  <option value="" className="text-gray-900 bg-white font-normal">-- Select Country --</option>
                  {AVAILABLE_COUNTRIES.map(c => (
                    <option key={c.code} value={c.name} className="text-gray-900 bg-white font-semibold py-1">
                      {c.flag} {c.name} • {c.timezoneLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-gray-500" />
                  City / State (Optional)
                </label>
                <input 
                  type="text" 
                  value={formData.city || ''} 
                  onChange={e => {
                    const newCity = e.target.value;
                    setFormData(prev => ({
                      ...prev, 
                      city: newCity,
                      location: newCity ? `${newCity}, ${prev.country || 'Pakistan'}` : (prev.country || 'Pakistan')
                    }));
                  }} 
                  className="w-full border-gray-300 rounded-xl shadow-xs focus:border-amber-500 focus:ring-amber-500 border p-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-500 font-medium" 
                  placeholder="e.g. Lahore, Karachi, London, New York, Tokyo" 
                />
              </div>
            </div>

            {/* Worldwide Timezone Selector */}
            <div className="pt-1">
              <TimezoneSelector
                value={formData.timezone || 'Asia/Karachi'}
                suggestedCountry={formData.country}
                onChange={(tz, tzInfo) => {
                  setFormData(prev => ({
                    ...prev,
                    timezone: tz,
                    timezoneLabel: `${tzInfo.abbr || tzInfo.utcOffsetStr} (${tzInfo.city})`,
                  }));
                }}
                helperText="Select the candidate's exact time zone for accurate interview conversions and calendar alerts."
              />
            </div>

            {/* Live Geo & Timezone Preview Card */}
            {formData.timezone && (
              <div className="bg-white/80 dark:bg-stone-900/80 rounded-xl p-2.5 border border-amber-200/60 text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700 dark:text-stone-300">
                    📍 {formData.city ? `${formData.city}, ` : ''}{formData.country || 'Global'}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                    {getDiffFromPktDetailed(formData.timezone).diffText}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  {evaluateCandidateWorkingHours(new Date().toISOString(), formData.timezone).badgeText}
                </div>
              </div>
            )}
          </div>

          {/* Calendar Slot & Multi-Track Scheduling Section */}
          <div className="border border-indigo-200 dark:border-indigo-800/80 rounded-2xl p-4 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/40 dark:from-indigo-950/20 dark:via-stone-900 dark:to-blue-950/20 space-y-4">
            {/* Header with Slot Reservation Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-100 dark:border-indigo-800/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-stone-100 flex items-center gap-1.5">
                    <span>Calendar Slot &amp; Scheduling</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                      Live Calendar Sync
                    </span>
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-stone-400">
                    Directly linked to CalendarScheduleView, Heatmap slots, and Pipeline
                  </p>
                </div>
              </div>

              {/* Segmented Switcher: Book immediately vs Unscheduled lead */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                <button
                  type="button"
                  onClick={() => {
                    setScheduleToCalendar(true);
                    if (formData.status === 'Pending' || !formData.status) {
                      setFormData((prev) => ({ ...prev, status: 'Scheduled' }));
                    }
                  }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    scheduleToCalendar
                      ? 'bg-white dark:bg-stone-900 text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-200 dark:border-indigo-800'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book Calendar Slot</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScheduleToCalendar(false);
                    if (formData.status === 'Scheduled') {
                      setFormData((prev) => ({ ...prev, status: 'Pending' }));
                    }
                  }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    !scheduleToCalendar
                      ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-300 shadow-xs border border-amber-200 dark:border-amber-800'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Unscheduled Lead</span>
                </button>
              </div>
            </div>

            {/* Banner when opened from an empty slot in Calendar */}
            {isFromSlotPicker && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Selected from Calendar: <strong className="font-mono">{formatPktDateTime(formData.suggestedPktTime)}</strong>
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  Pre-Assigned Slot
                </span>
              </div>
            )}

            {scheduleToCalendar ? (
              <div className="space-y-4">
                {/* Date & Time Selection Component */}
                <div>
                  <DateTimePicker
                    label="Interview Date & Time (PKT / UTC+5)"
                    value={formData.suggestedPktTime}
                    onChange={(iso) => setFormData(prev => ({ ...prev, suggestedPktTime: iso }))}
                    candidates={allCandidates}
                    currentCandidateId={initialData?.id}
                    candidateTimezone={formData.timezone || 'Asia/Karachi'}
                    candidateTimezoneLabel={formData.timezoneLabel}
                    candidateName={formData.name}
                  />

                  {/* Candidate Local Time Dual Sync Card */}
                  {formData.suggestedPktTime && (
                    <div className="mt-2.5 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-amber-950 font-semibold">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Candidate Local Time:</span>
                        <span className="font-mono font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                          {formatLocalDateTime(
                            formData.suggestedPktTime,
                            formData.timezone || 'Asia/Karachi'
                          )}
                        </span>
                      </div>
                      <span className="text-[11px] text-amber-800 font-medium hidden sm:inline">
                        {formData.timezoneLabel || formData.timezone || 'PKT (UTC+5)'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Meeting Duration Selection */}
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      Target Meeting Duration
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-md">
                      {formData.durationMinutes || 45} mins
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[15, 30, 45, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, durationMinutes: mins }))}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          (formData.durationMinutes || 45) === mins
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400/40'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-amber-50 hover:border-amber-300'
                        }`}
                      >
                        {mins < 60 ? `${mins}m` : mins === 60 ? '1 hr' : `${mins / 60} hrs`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Multi-Track / Virtual Room Allocation */}
                <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/50 border border-indigo-200/90 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      Allocated Interview Track / Virtual Room
                    </label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTrackById(formData.trackId).badgeBg} ${getTrackById(formData.trackId).badgeBorder}`}>
                      {getTrackById(formData.trackId).shortCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-900/80">
                    Multiple candidates can interview in parallel during the same slot if assigned to distinct tracks.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DEFAULT_INTERVIEW_TRACKS.map((t) => {
                      const isSelected = (formData.trackId || 'track-alpha') === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              trackId: t.id,
                              trackName: t.name,
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-white border-indigo-500 shadow-xs ring-2 ring-indigo-400/40'
                              : 'bg-white/80 border-indigo-100 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.badgeBg} ${t.badgeBorder}`}>
                              {t.shortCode}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                                Selected
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-gray-900 text-xs">{t.panelName}</div>
                          <div className="text-[10px] text-gray-500 line-clamp-1">{t.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Real-time Track Conflict Check */}
                {formData.suggestedPktTime && (() => {
                  const conflicts = findSlotConflicts(
                    formData.suggestedPktTime,
                    formData.durationMinutes || 45,
                    allCandidates,
                    initialData?.id,
                    formData.trackId
                  );
                  if (conflicts.length > 0) {
                    return (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                        <div>
                          <strong className="block">Track Conflict Warning:</strong>
                          <span>
                            {conflicts[0]?.details || 'Another candidate is scheduled on this track during this timeframe.'}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Track <strong>{getTrackById(formData.trackId).shortCode}</strong> is completely free at this time. Ready for scheduling!
                      </span>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Unscheduled Pipeline Candidate</span>
                </div>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  Candidate will be saved as <strong>Pending</strong> in the pipeline. They will appear in the <strong>Pipeline Candidates Awaiting Calendar Slots</strong> drawer on the Calendar and in the Kanban board. Any recruiter can 1-click book or drag-and-drop them into an open slot!
                </p>
              </div>
            )}
          </div>
          
          {formData.originalAvailability && formData.originalAvailability !== 'Custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Original Availability Mentioned</label>
              <input type="text" disabled value={formData.originalAvailability} className="w-full border-gray-200 bg-gray-50 text-gray-600 rounded-xl shadow-sm border p-2.5 text-sm font-mono" />
            </div>
          )}

          {(formData.aiSummary || formData.aiSkills) && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">AI Profile Summary</span>
                {formData.aiRating && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold text-xs">
                    Rating: {formData.aiRating}/10
                  </span>
                )}
              </div>
              {formData.aiSummary && <p className="text-gray-600 text-xs leading-relaxed">{formData.aiSummary}</p>}
              {formData.aiSkills && (
                <div>
                  <span className="font-medium text-gray-700 block mb-1 text-xs">Key Skills:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.aiSkills.split(',').map((skill, i) => (
                      <span key={i} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full text-xs font-medium">
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Status</label>
              <select 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value as Candidate['status']})} 
                className="w-full border-gray-300 rounded-xl shadow-xs focus:border-indigo-500 focus:ring-indigo-500 border p-2.5 text-sm bg-white text-gray-900 font-semibold cursor-pointer"
              >
                <option value="Pending" className="text-gray-950 bg-white font-medium">Pending</option>
                <option value="Scheduled" className="text-gray-950 bg-white font-medium">Scheduled</option>
                <option value="Rescheduled" className="text-gray-950 bg-white font-medium">Rescheduled</option>
                <option value="Interviewed" className="text-gray-950 bg-white font-medium">Interviewed</option>
                <option value="Selected" className="text-gray-950 bg-white font-medium">Selected</option>
                <option value="Rejected" className="text-gray-950 bg-white font-medium">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Resume / CV Link (Optional)</label>
              <input 
                type="url" 
                placeholder="https://drive.google.com/... or Dropbox" 
                value={formData.resumeLink || ''} 
                onChange={e => setFormData({...formData, resumeLink: e.target.value})} 
                className="w-full border-gray-300 rounded-xl shadow-xs focus:border-indigo-500 focus:ring-indigo-500 border p-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-500 font-medium" 
              />
            </div>

            {/* Google Meet / Video Interview Link Section */}
            {(formData.status === 'Scheduled' || formData.status === 'Rescheduled' || formData.meetLink) && (
              <div className="sm:col-span-2 p-3.5 bg-blue-50/70 border border-blue-200/90 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-blue-600" />
                    Google Meet / Video Interview Link
                  </label>
                  {formData.meetLink ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Meeting Link Attached
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      Missing Meeting Link
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={formData.meetLink || ''}
                    onChange={(e) => setFormData({ ...formData, meetLink: e.target.value })}
                    className="flex-1 border-blue-300 rounded-lg shadow-2xs focus:border-blue-500 focus:ring-blue-500 border p-2 text-xs bg-white text-gray-900 placeholder:text-gray-400 font-medium font-mono"
                  />
                  {formData.meetLink && (
                    <a
                      href={formData.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open</span>
                    </a>
                  )}
                </div>

                {!formData.meetLink && (
                  <p className="text-[11px] text-blue-900 leading-tight">
                    💡 <em>Interview status is marked as {formData.status}. You can paste a meeting link here, or use the candidate card&apos;s <strong>&quot;Schedule Dispatcher&quot;</strong> to auto-generate a Google Meet video conference.</em>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Social Profiles & Portfolio URLs */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
              Professional Profiles &amp; Portfolio (Optional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                  <span>LinkedIn Profile</span>
                </label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={formData.linkedinUrl || ''}
                  onChange={e => setFormData({...formData, linkedinUrl: e.target.value})}
                  className="w-full border-gray-300 rounded-lg shadow-2xs focus:border-blue-500 focus:ring-blue-500 border p-2 text-xs bg-white text-gray-900 placeholder:text-gray-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Github className="w-3.5 h-3.5 text-stone-900" />
                  <span>GitHub Profile</span>
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={formData.githubUrl || ''}
                  onChange={e => setFormData({...formData, githubUrl: e.target.value})}
                  className="w-full border-gray-300 rounded-lg shadow-2xs focus:border-stone-800 focus:ring-stone-800 border p-2 text-xs bg-white text-gray-900 placeholder:text-gray-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Portfolio / Website</span>
                </label>
                <input
                  type="url"
                  placeholder="https://myportfolio.com"
                  value={formData.portfolioUrl || ''}
                  onChange={e => setFormData({...formData, portfolioUrl: e.target.value})}
                  className="w-full border-gray-300 rounded-lg shadow-2xs focus:border-emerald-500 focus:ring-emerald-500 border p-2 text-xs bg-white text-gray-900 placeholder:text-gray-500 font-medium"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-semibold text-gray-800">Interview Notes & Questions</label>
              <button 
                type="button"
                onClick={handleGenerateQuestions}
                disabled={isGeneratingQuestions || !formData.position}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingQuestions ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                Generate AI Questions
              </button>
            </div>
            
            {aiQuestions.length > 0 && (
              <div className="mb-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs space-y-2">
                <p className="font-bold text-indigo-950">Suggested Questions for {formData.position}:</p>
                <ul className="list-disc pl-5 space-y-1 text-indigo-900 font-medium">
                  {aiQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, notes: formData.notes + (formData.notes ? '\n\n' : '') + '--- AI Questions ---\n' + aiQuestions.map(q => '- ' + q).join('\n') })}
                  className="text-xs bg-white text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-100 font-semibold cursor-pointer"
                >
                  Insert into Notes
                </button>
              </div>
            )}
            
            <textarea 
              value={formData.notes || ''} 
              onChange={e => setFormData({...formData, notes: e.target.value})} 
              rows={3} 
              className="w-full border-gray-300 rounded-xl shadow-xs focus:border-indigo-500 focus:ring-indigo-500 border p-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-500 font-medium" 
              placeholder="Candidate feedback, interview remarks, ratings..." 
            />
          </div>
        </div>
          
        {/* Pinned Action Footer */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 shrink-0">
            <div>
              {initialData?.id && onDelete && (
                !confirmDelete ? (
                  <button 
                    type="button" 
                    id="btn-delete-candidate-trigger"
                    onClick={() => setConfirmDelete(true)}
                    className="px-3.5 py-2 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 font-medium text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
                    <span className="text-xs text-red-700 font-semibold">Delete candidate?</span>
                    <button
                      type="button"
                      id="btn-delete-candidate-confirm"
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        try {
                          await onDelete(initialData.id!);
                        } finally {
                          setDeleting(false);
                        }
                      }}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Yes, Delete'
                      )}
                    </button>
                    <button
                      type="button"
                      id="btn-delete-candidate-cancel"
                      disabled={deleting}
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 text-gray-600 hover:bg-red-100 text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )
              )}
            </div>
            <div className="flex items-center space-x-2.5">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {scheduleToCalendar && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={(e) => handleSubmit(e, true)}
                  className="px-4 py-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-bold text-sm rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                  title="Save and jump straight to this slot on the calendar"
                >
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Save &amp; View on Calendar</span>
                </button>
              )}
              <button 
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                disabled={saving} 
                className="px-5 py-2 text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 font-bold text-sm flex items-center shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Candidate</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
