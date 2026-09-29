import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  Save,
  UploadCloud,
  FileSpreadsheet,
  FileCheck,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { Candidate } from '../types';
import { resolveCandidateTimezone } from '../lib/timezone-utils';
import { DEFAULT_INTERVIEW_TRACKS } from '../lib/track-constants';

interface BulkAddModalProps {
  onClose: () => void;
  onSaveBulk: (candidates: Omit<Candidate, 'id' | 'userId' | 'meetLink'>[]) => Promise<void>;
}

// Client-side CSV parser fallback for offline or raw CSV imports
function parseClientSideCsv(csvText: string): any[] | null {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const parseRow = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const rawHeaders = parseRow(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const nameIdx = headers.findIndex((h) => h.includes('name'));
  if (nameIdx === -1) return null; // Not structured CSV

  const emailIdx = headers.findIndex((h) => h.includes('email'));
  const posIdx = headers.findIndex((h) => h.includes('position') || h.includes('role') || h.includes('title'));
  const countryIdx = headers.findIndex((h) => h.includes('country') || h.includes('nation'));
  const cityIdx = headers.findIndex((h) => h.includes('city') || h.includes('location'));
  const tzIdx = headers.findIndex((h) => h.includes('timezone') || h.includes('tz'));
  const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('whatsapp'));
  const timeIdx = headers.findIndex((h) => h.includes('time') || h.includes('pkt') || h.includes('availability'));
  const notesIdx = headers.findIndex((h) => h.includes('notes') || h.includes('remarks') || h.includes('summary'));

  const parsedCandidates: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    if (row.length === 0 || row.every((c) => !c)) continue;

    const name = row[nameIdx];
    if (!name) continue;

    const email = emailIdx !== -1 ? row[emailIdx] : '';
    const position = posIdx !== -1 ? row[posIdx] : 'Software Engineer';
    const country = countryIdx !== -1 && row[countryIdx] ? row[countryIdx] : '';
    const city = cityIdx !== -1 ? row[cityIdx] : '';
    const rawTz = tzIdx !== -1 ? row[tzIdx] : '';
    const tzInfo = resolveCandidateTimezone({ timezone: rawTz, country, location: city });
    const phone = phoneIdx !== -1 ? row[phoneIdx] : '';
    const rawTime = timeIdx !== -1 ? row[timeIdx] : '';
    const notes = notesIdx !== -1 ? row[notesIdx] : '';

    let suggestedPktTime = '';
    if (rawTime && !isNaN(Date.parse(rawTime))) {
      suggestedPktTime = new Date(rawTime).toISOString();
    } else {
      suggestedPktTime = '';
    }

    parsedCandidates.push({
      name,
      email,
      position,
      country,
      city,
      timezone: tzInfo.tz,
      timezoneLabel: tzInfo.label,
      phone,
      originalAvailability: rawTime || '',
      suggestedPktTime,
      summary: notes || '',
      skills: 'Technical Skills',
      rating: '8/10',
    });
  }

  return parsedCandidates.length > 0 ? parsedCandidates : null;
}

export function BulkAddModal({ onClose, onSaveBulk }: BulkAddModalProps) {
  const [bulkText, setBulkText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedCandidates, setExtractedCandidates] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const csvTemplateData =
    'Name,Email,Position,Country,City,Timezone,Phone,SuggestedPktTime,Notes\n';

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([csvTemplateData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'recruitsync_candidates_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAnalyzeText = async (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    setInfoMessage(null);

    // Check if client-side CSV parsing can parse structured CSV directly
    const directCsvParsed = parseClientSideCsv(textToAnalyze);

    try {
      const response = await fetch('/api/bulk-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToAnalyze }),
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data) && data.length > 0) {
        setExtractedCandidates(data);
      } else if (directCsvParsed && directCsvParsed.length > 0) {
        setExtractedCandidates(directCsvParsed);
        setInfoMessage('Parsed directly from CSV structure.');
      } else {
        setError('Failed to extract data: ' + (data.error || 'Unknown format'));
      }
    } catch (err: any) {
      console.warn('API extraction error, checking client-side CSV parsing...', err);
      if (directCsvParsed && directCsvParsed.length > 0) {
        setExtractedCandidates(directCsvParsed);
        setInfoMessage('Parsed successfully via client CSV reader.');
      } else {
        setError('Error analyzing bulk data. Please verify your format and try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    await handleAnalyzeText(bulkText);
  };

  const handleRemoveCandidate = (index: number) => {
    setExtractedCandidates((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleFile = (file: File) => {
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setBulkText(text);
      handleAnalyzeText(text);
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (extractedCandidates.length === 0) return;
    setIsSaving(true);

    const candidatesToSave = extractedCandidates.map((c, idx) => {
      const candidateCountry = c.country || 'Pakistan';
      const candidateCity = c.city || '';
      const tzInfo = resolveCandidateTimezone({
        timezone: c.timezone,
        country: candidateCountry,
        location: candidateCity,
      });
      const assignedTrack = DEFAULT_INTERVIEW_TRACKS[idx % DEFAULT_INTERVIEW_TRACKS.length];

      return {
        name: c.name || 'Unknown Name',
        email: c.email || '',
        phone: c.phone || 'N/A',
        country: candidateCountry,
        city: candidateCity,
        timezone: c.timezone || tzInfo.tz,
        timezoneLabel: c.timezoneLabel || tzInfo.label,
        location: candidateCity ? `${candidateCity}, ${candidateCountry}` : candidateCountry,
        originalAvailability: c.originalAvailability || 'Custom',
        suggestedPktTime: c.suggestedPktTime || '',
        position: c.position || '',
        status: 'Pending' as const,
        trackId: assignedTrack.id,
        trackName: assignedTrack.name,
        notes: c.summary ? `Summary: ${c.summary}` : '',
        resumeLink: '',
        aiSummary: c.summary || '',
        aiSkills: c.skills || '',
        aiRating: c.rating || '',
      };
    });

    await onSaveBulk(candidatesToSave);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold font-display text-gray-900 flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-indigo-600" />
            AI Bulk Import
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between shrink-0">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-800 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {extractedCandidates.length === 0 ? (
          <div className="flex-1 flex flex-col p-5 sm:p-6 space-y-4 overflow-y-auto">
            <p className="text-xs sm:text-sm text-gray-600">
              Upload a CSV / spreadsheet export, or paste raw text below containing multiple candidate profiles, emails, or resumes. Gemini AI will automatically parse all candidates in seconds.
            </p>

            {/* Drag & Drop File Zone */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.json,.tsv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
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
                if (file) handleFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer bg-stone-50/70 hover:bg-stone-50 ${
                isDragging
                  ? 'border-indigo-600 bg-indigo-50/40 scale-[1.01]'
                  : 'border-stone-300 hover:border-indigo-400'
              }`}
            >
              {uploadedFileName ? (
                <div className="flex items-center justify-center gap-2 text-emerald-700">
                  <FileCheck className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold">{uploadedFileName}</span>
                  <span className="text-[11px] text-gray-500">• Loaded for parsing</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-gray-800">
                      Drop CSV or candidate export file here, or <span className="text-indigo-600 underline">browse</span>
                    </p>
                    <p className="text-[10px] text-gray-500">Supports .csv, .txt, .json formats</p>
                  </div>
                </div>
              )}
            </div>

            {/* Download Sample CSV & Format Template Guidance */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-xl text-xs">
              <div>
                <p className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600 shrink-0" />
                  Standard Candidate CSV Format
                </p>
                <p className="text-[11px] text-indigo-800 mt-0.5">
                  Columns: <code className="font-mono font-semibold bg-white/80 px-1 py-0.2 rounded">Name</code>, <code className="font-mono font-semibold bg-white/80 px-1 py-0.2 rounded">Email</code>, <code className="font-mono font-semibold bg-white/80 px-1 py-0.2 rounded">Position</code>, <code className="font-mono font-semibold bg-white/80 px-1 py-0.2 rounded">Country</code>, <code className="font-mono font-semibold bg-white/80 px-1 py-0.2 rounded">City</code>, <code className="font-mono font-semibold bg-white/80 px-1 py-0.2 rounded">Phone</code>, <code className="font-mono font-semibold bg-white/80 px-1 py-0.2 rounded">SuggestedPktTime</code>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  id="btn-download-sample-csv"
                  onClick={handleDownloadSampleCsv}
                  className="px-3.5 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 rounded-lg font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer text-xs"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Download Template</span>
                </button>
              </div>
            </div>

            {infoMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{infoMessage}</span>
              </div>
            )}

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-3 text-gray-400 text-[11px] uppercase tracking-wider font-semibold">Or paste raw text</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <textarea 
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder="Paste raw candidate data, emails, or LinkedIn bio text here..."
              className="min-h-[140px] flex-1 w-full border-gray-300 rounded-xl shadow-xs focus:border-indigo-500 focus:ring-indigo-500 border p-3 text-xs sm:text-sm font-sans bg-white text-gray-900 placeholder:text-gray-500 font-medium"
            />

            <div className="flex justify-end pt-1 shrink-0">
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !bulkText.trim()}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center transition-colors shadow-xs cursor-pointer text-sm"
              >
                {isAnalyzing ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing Candidates...</> : 'Extract Candidates with AI'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-3 bg-gray-50 border-b border-gray-100 shrink-0">
              <h3 className="font-semibold text-gray-900 text-sm">Extracted {extractedCandidates.length} Candidate(s)</h3>
              <button 
                onClick={() => setExtractedCandidates([])}
                className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                Back to edit text
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
              {extractedCandidates.map((candidate, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4 relative group">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200/80">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Candidate #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCandidate(idx)}
                      className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove candidate from batch"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500 block text-xs">Name</span><span className="font-semibold">{candidate.name}</span></div>
                    <div><span className="text-gray-500 block text-xs">Email</span><span className="truncate">{candidate.email || 'N/A'}</span></div>
                    <div><span className="text-gray-500 block text-xs">Position</span><span>{candidate.position || 'N/A'}</span></div>
                    <div>
                      <span className="text-gray-500 block text-xs">Country &amp; Time Zone</span>
                      <span className="font-semibold text-amber-800">
                        🌍 {candidate.country || 'Pakistan'} {candidate.timezone ? `• ${candidate.timezone}` : ''}
                      </span>
                    </div>
                    <div className="col-span-2"><span className="text-gray-500 block text-xs">Skills</span><span className="line-clamp-1">{candidate.skills || 'N/A'}</span></div>
                    {candidate.originalAvailability && (
                      <div className="col-span-2">
                        <span className="text-gray-500 block text-xs">Availability Identified &amp; Converted (PKT)</span>
                        <span className="text-indigo-600 block text-xs font-medium">&quot;{candidate.originalAvailability}&quot; &rarr; {candidate.suggestedPktTime ? new Date(candidate.suggestedPktTime).toLocaleString('en-US') : 'N/A'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 shrink-0">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center shadow-xs transition-colors cursor-pointer text-sm"
              >
                {isSaving ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving All...</> : <><Save className="w-5 h-5 mr-2" /> Add {extractedCandidates.length} Candidates</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
