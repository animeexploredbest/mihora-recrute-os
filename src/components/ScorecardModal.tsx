import React, { useState } from 'react';
import { Candidate, InterviewScorecard, HiringRound } from '../types';
import {
  X,
  Award,
  Star,
  Video,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Sparkles,
  Save,
  MessageSquare,
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Github,
  Linkedin,
  Briefcase,
  Printer,
  FastForward,
  Loader2,
} from 'lucide-react';
import { formatPktDateTime } from '../lib/date-utils';
import { updateCandidate } from '../lib/firebase-operations';

interface ScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  currentInterviewer?: string;
  onSaveScorecard?: (
    candidateId: string,
    scorecard: InterviewScorecard,
    autoStatus?: Candidate['status'],
    hiringRound?: HiringRound
  ) => Promise<void>;
  onSave?: (
    candidateId: string,
    scorecard: InterviewScorecard,
    autoStatus?: Candidate['status'],
    hiringRound?: HiringRound
  ) => Promise<void>;
}

export const ScorecardModal: React.FC<ScorecardModalProps> = ({
  isOpen,
  onClose,
  candidate,
  currentInterviewer = 'Interviewer',
  onSaveScorecard,
  onSave,
}) => {
  const existing = candidate.scorecard;

  const [techRating, setTechRating] = useState<number>(existing?.technicalRating || 4);
  const [commRating, setCommRating] = useState<number>(existing?.communicationRating || 4);
  const [problemRating, setProblemRating] = useState<number>(existing?.problemSolvingRating || 4);
  const [overallRating, setOverallRating] = useState<number>(
    existing?.overallRating || Math.round((4 + 4 + 4) / 3)
  );
  const [selectedRound, setSelectedRound] = useState<HiringRound>(
    candidate.hiringRound || 'Screening'
  );
  const [recommendation, setRecommendation] = useState<
    'Strong Hire' | 'Hire' | 'On Hold' | 'Reject'
  >(existing?.recommendation || 'Hire');
  const [notes, setNotes] = useState<string>(
    existing?.interviewerNotes || ''
  );
  const [syncStatus, setSyncStatus] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState<boolean>(true);
  const [copiedQuestionIdx, setCopiedQuestionIdx] = useState<number | null>(null);
  const [askedQuestions, setAskedQuestions] = useState<Record<number, boolean>>({});

  const [questionsList, setQuestionsList] = useState<string[]>(candidate.aiQuestions || []);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionGenError, setQuestionGenError] = useState<string | null>(null);

  const handleGenerateQuestions = async () => {
    setIsGeneratingQuestions(true);
    setQuestionGenError(null);
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText:
            candidate.aiSummary ||
            candidate.notes ||
            `${candidate.position || 'Software Engineer'} with focus on ${candidate.aiSkills || 'core technical competencies'}`,
          candidateName: candidate.name,
          position: candidate.position || 'Software Engineer',
          skills: candidate.aiSkills || '',
          summary: candidate.aiSummary || candidate.notes || '',
        }),
      });
      const data = await res.json();
      const questions: string[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.questions)
        ? data.questions
        : [];
      if (questions.length > 0) {
        setQuestionsList(questions);
        if (candidate.id) {
          updateCandidate(candidate.id, { aiQuestions: questions }).catch((e) =>
            console.error('Failed to auto-persist generated questions:', e)
          );
        }
      } else {
        setQuestionGenError(data.error || 'Could not generate questions. Ensure Gemini API is available.');
      }
    } catch (err: any) {
      setQuestionGenError(err?.message || 'Network error generating questions.');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleRatingChange = (type: 'tech' | 'comm' | 'problem', val: number) => {
    let t = techRating;
    let c = commRating;
    let p = problemRating;

    if (type === 'tech') {
      setTechRating(val);
      t = val;
    } else if (type === 'comm') {
      setCommRating(val);
      c = val;
    } else if (type === 'problem') {
      setProblemRating(val);
      p = val;
    }

    const calculatedAvg = Math.round((t + c + p) / 3);
    setOverallRating(calculatedAvg);
  };

  const handleSave = async () => {
    if (!candidate.id) return;
    setIsSaving(true);
    try {
      const scorecard: InterviewScorecard = {
        technicalRating: techRating,
        communicationRating: commRating,
        problemSolvingRating: problemRating,
        overallRating,
        recommendation,
        interviewerNotes: notes,
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: currentInterviewer,
      };

      let nextStatus: Candidate['status'] | undefined = undefined;
      if (syncStatus) {
        if (recommendation === 'Strong Hire' || recommendation === 'Hire') {
          nextStatus = 'Selected';
        } else if (recommendation === 'Reject') {
          nextStatus = 'Rejected';
        } else {
          nextStatus = 'Interviewed';
        }
      }

      const saveHandler = onSaveScorecard || onSave;
      if (saveHandler) {
        await saveHandler(candidate.id, scorecard, nextStatus, selectedRound);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save scorecard:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 bg-indigo-50/60 dark:bg-indigo-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Interview Scorecard &amp; Evaluation
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Candidate: <strong className="text-stone-800 dark:text-stone-200">{candidate.name}</strong> • {candidate.position || 'Software Engineer'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors cursor-pointer border border-stone-200 dark:border-stone-700"
              title="Print Scorecard Evaluation Report"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Meet launcher banner if interview is scheduled */}
        {candidate.meetLink && (
          <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200/60 dark:border-emerald-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-medium">
              <Video className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Interview Session Active / Scheduled</span>
            </div>
            <a
              href={candidate.meetLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all shadow-xs"
            >
              <span>Join Google Meet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Candidate Profile, Links & AI Interview Questions Collapsible */}
          <div className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 rounded-2xl overflow-hidden transition-all shadow-xs">
            <button
              type="button"
              onClick={() => setShowProfileCard((prev) => !prev)}
              className="w-full px-4 py-3 bg-stone-100/70 dark:bg-stone-800 flex items-center justify-between text-left cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-700/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Candidate Dossier &amp; AI Interview Questions
                </span>
                {candidate.aiQuestions && candidate.aiQuestions.length > 0 && (
                  <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    {candidate.aiQuestions.length} Questions
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-stone-400">
                <span className="text-[11px] font-medium hidden sm:inline">
                  {showProfileCard ? 'Collapse' : 'Expand Details'}
                </span>
                {showProfileCard ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {showProfileCard && (
              <div className="p-4 space-y-3.5 text-xs">
                {/* Candidate Links and Meta Row */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {candidate.resumeLink && (
                    <a
                      href={candidate.resumeLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold shadow-2xs transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Resume / CV</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  )}

                  {candidate.linkedinUrl && (
                    <a
                      href={candidate.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:text-blue-600 dark:hover:text-blue-400 font-semibold shadow-2xs transition-colors"
                    >
                      <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                      <span>LinkedIn</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  )}

                  {candidate.githubUrl && (
                    <a
                      href={candidate.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white font-semibold shadow-2xs transition-colors"
                    >
                      <Github className="w-3.5 h-3.5 text-stone-800 dark:text-stone-200" />
                      <span>GitHub</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  )}

                  {candidate.portfolioUrl && (
                    <a
                      href={candidate.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:text-emerald-600 font-semibold shadow-2xs transition-colors"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Portfolio</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  )}

                  {candidate.email && (
                    <span className="text-stone-500 dark:text-stone-400 font-mono text-[11px] px-2 py-1">
                      {candidate.email}
                    </span>
                  )}
                </div>

                {/* AI Summary / Skills */}
                {(candidate.aiSkills || candidate.aiSummary) && (
                  <div className="bg-white dark:bg-stone-900/80 p-3 rounded-xl border border-stone-200/80 dark:border-stone-700/60 space-y-1.5">
                    {candidate.aiSkills && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                          Identified Skills &amp; Tech Stack
                        </span>
                        <p className="text-xs font-medium text-stone-800 dark:text-stone-200">
                          {candidate.aiSkills}
                        </p>
                      </div>
                    )}
                    {candidate.aiSummary && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                          AI Resume Summary
                        </span>
                        <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                          {candidate.aiSummary}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Interview Questions with 1-Click Copy and Check-off */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      Suggested Interview Questions {questionsList.length > 0 && `(${questionsList.length})`}
                    </span>
                    <button
                      type="button"
                      onClick={handleGenerateQuestions}
                      disabled={isGeneratingQuestions}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      {isGeneratingQuestions ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>{questionsList.length > 0 ? 'Regenerate' : 'Generate with AI'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {questionGenError && (
                    <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-[11px] text-rose-700 dark:text-rose-300">
                      {questionGenError}
                    </div>
                  )}

                  {questionsList.length === 0 && !isGeneratingQuestions && (
                    <div className="p-3 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 text-center space-y-1.5">
                      <p className="text-xs text-stone-600 dark:text-stone-400">
                        No interview questions tailored for {candidate.name} yet.
                      </p>
                      <button
                        type="button"
                        onClick={handleGenerateQuestions}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate 5 Role-Specific Questions</span>
                      </button>
                    </div>
                  )}

                  {questionsList.length > 0 && (
                    <div className="space-y-1.5">
                      {questionsList.map((q, qIdx) => {
                        const isAsked = askedQuestions[qIdx];
                        return (
                          <div
                            key={qIdx}
                            className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                              isAsked
                                ? 'bg-stone-100/50 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800 opacity-60'
                                : 'bg-white dark:bg-stone-900 border-indigo-100 dark:border-indigo-950/80 shadow-2xs'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(isAsked)}
                              onChange={(e) =>
                                setAskedQuestions((prev) => ({
                                  ...prev,
                                  [qIdx]: e.target.checked,
                                }))
                              }
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              title="Mark question as asked"
                            />
                            <p
                              className={`text-xs flex-1 leading-relaxed ${
                                isAsked
                                  ? 'line-through text-stone-500'
                                  : 'text-stone-800 dark:text-stone-200 font-medium'
                              }`}
                            >
                              {q}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(q);
                                setCopiedQuestionIdx(qIdx);
                                setTimeout(() => setCopiedQuestionIdx(null), 2000);
                              }}
                              className="p-1 text-stone-400 hover:text-indigo-600 rounded transition-colors cursor-pointer shrink-0"
                              title="Copy question text"
                            >
                              {copiedQuestionIdx === qIdx ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Hiring Round Selector */}
          <div className="bg-stone-50 dark:bg-stone-800/50 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <FastForward className="w-4 h-4 text-indigo-600" />
                Pipeline Hiring Round
              </label>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                Current: {selectedRound}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {(['Screening', 'Technical Round 1', 'Technical Round 2', 'Management / HR', 'Final Offer'] as HiringRound[]).map((round) => (
                <button
                  key={round}
                  type="button"
                  onClick={() => setSelectedRound(round)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                    selectedRound === round
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-indigo-400'
                  }`}
                >
                  {round}
                </button>
              ))}
            </div>
          </div>

          {/* Rating Criteria Grid */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              Core Competencies (1 to 5 Stars)
            </h3>

            {/* 1. Technical Skills */}
            <div className="bg-stone-50 dark:bg-stone-800/50 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                  Technical Depth &amp; Coding
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  Domain proficiency, problem solving speed, code quality
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange('tech', star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= techRating
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-stone-300 dark:text-stone-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-mono font-bold ml-1.5 text-stone-700 dark:text-stone-300 w-6">
                  {techRating}/5
                </span>
              </div>
            </div>

            {/* 2. Communication Skills */}
            <div className="bg-stone-50 dark:bg-stone-800/50 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                  Communication &amp; Articulation
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  Clarity of thought, english fluency, listening &amp; collaboration
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange('comm', star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= commRating
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-stone-300 dark:text-stone-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-mono font-bold ml-1.5 text-stone-700 dark:text-stone-300 w-6">
                  {commRating}/5
                </span>
              </div>
            </div>

            {/* 3. Problem Solving & Architecture */}
            <div className="bg-stone-50 dark:bg-stone-800/50 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                  Architecture &amp; Problem Solving
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  System design thinking, debugging attitude, edge case handling
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange('problem', star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= problemRating
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-stone-300 dark:text-stone-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-mono font-bold ml-1.5 text-stone-700 dark:text-stone-300 w-6">
                  {problemRating}/5
                </span>
              </div>
            </div>
          </div>

          {/* Hiring Recommendation Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Final Hiring Recommendation
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setRecommendation('Strong Hire')}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  recommendation === 'Strong Hire'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/30'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-emerald-50'
                }`}
              >
                <div className="text-xs font-bold">🌟 Strong Hire</div>
                <div className="text-[10px] opacity-80 mt-0.5">Exceptional</div>
              </button>
              <button
                type="button"
                onClick={() => setRecommendation('Hire')}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  recommendation === 'Hire'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400/30'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-blue-50'
                }`}
              >
                <div className="text-xs font-bold">👍 Hire</div>
                <div className="text-[10px] opacity-80 mt-0.5">Meets Bar</div>
              </button>
              <button
                type="button"
                onClick={() => setRecommendation('On Hold')}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  recommendation === 'On Hold'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400/30'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-amber-50'
                }`}
              >
                <div className="text-xs font-bold">⏳ On Hold</div>
                <div className="text-[10px] opacity-80 mt-0.5">Review Later</div>
              </button>
              <button
                type="button"
                onClick={() => setRecommendation('Reject')}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  recommendation === 'Reject'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400/30'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-rose-50'
                }`}
              >
                <div className="text-xs font-bold">❌ Reject</div>
                <div className="text-[10px] opacity-80 mt-0.5">Does Not Meet</div>
              </button>
            </div>
          </div>

          {/* Interviewer Notes & Observations */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              Detailed Interview Notes &amp; Observations
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Candidate demonstrated strong knowledge in React concurrency, solved the algorithm problem in 15 mins. Strong communicator..."
              className="w-full text-xs p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Auto Status Sync Checkbox */}
          <div className="flex items-center gap-2 p-3 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 rounded-xl text-xs">
            <input
              type="checkbox"
              id="syncStatusCheckbox"
              checked={syncStatus}
              onChange={(e) => setSyncStatus(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="syncStatusCheckbox" className="text-stone-700 dark:text-stone-300 cursor-pointer select-none">
              Automatically advance candidate status to{' '}
              <strong className="text-indigo-600 dark:text-indigo-400">
                {recommendation === 'Strong Hire' || recommendation === 'Hire'
                  ? 'Selected'
                  : recommendation === 'Reject'
                  ? 'Rejected'
                  : 'Interviewed'}
              </strong>{' '}
              upon saving.
            </label>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 flex items-center justify-between">
          <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-stone-400" />
            <span>Evaluator: {currentInterviewer}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Evaluation'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
