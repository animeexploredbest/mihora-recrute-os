import React, { useState, useEffect } from 'react';
import { Clock, Calendar, AlertTriangle, Check, Globe, Sun, Moon } from 'lucide-react';
import { isoToLocalInput, localInputToIso, formatPktDateTime, formatLocalDateTime, findScheduleConflict } from '../lib/date-utils';
import { Candidate } from '../types';
import { formatInTimezone, evaluateCandidateWorkingHours } from '../lib/timezone-utils';

interface DateTimePickerProps {
  value: string; // ISO string
  onChange: (isoString: string) => void;
  candidates?: Candidate[];
  currentCandidateId?: string;
  label?: string;
  required?: boolean;
  candidateTimezone?: string;
  candidateTimezoneLabel?: string;
  candidateName?: string;
}

export function DateTimePicker({
  value,
  onChange,
  candidates = [],
  currentCandidateId,
  label = 'Interview Date & Time',
  required = true,
  candidateTimezone,
  candidateTimezoneLabel,
  candidateName,
}: DateTimePickerProps) {
  // Local input string representation (YYYY-MM-DDTHH:mm)
  const [localInputVal, setLocalInputVal] = useState(() => isoToLocalInput(value));
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    const formatted = isoToLocalInput(value);
    if (formatted && formatted !== localInputVal) {
      setLocalInputVal(formatted);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalInputVal(newVal);
    setActivePreset(null);

    // Only emit ISO when complete and valid
    if (newVal) {
      const iso = localInputToIso(newVal);
      if (iso) {
        onChange(iso);
      }
    }
  };

  // Preset calculations
  const applyPreset = (presetName: string, getTargetDate: () => Date) => {
    const target = getTargetDate();
    const iso = target.toISOString();
    setLocalInputVal(isoToLocalInput(iso));
    setActivePreset(presetName);
    onChange(iso);
  };

  // Check for conflict
  const conflict = value ? findScheduleConflict(value, candidates, currentCandidateId) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {value && (
          <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-green-600" />
            Time Synced
          </span>
        )}
      </div>

      {/* Main interactive input */}
      <div className="relative rounded-xl border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Calendar className="w-4 h-4" />
        </div>
        <input
          type="datetime-local"
          required={required}
          value={localInputVal}
          onChange={handleInputChange}
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-transparent border-none rounded-xl focus:outline-none text-gray-900 font-medium"
        />
      </div>

      {/* Quick Select Presets */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <span className="text-xs text-gray-400 self-center mr-1">Presets:</span>
        <button
          type="button"
          onClick={() => {
            applyPreset('tmrw-morning', () => {
              const d = new Date();
              d.setDate(d.getDate() + 1);
              d.setHours(11, 0, 0, 0);
              return d;
            });
          }}
          className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${
            activePreset === 'tmrw-morning'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
          }`}
        >
          Tomorrow 11:00 AM
        </button>

        <button
          type="button"
          onClick={() => {
            applyPreset('tmrw-afternoon', () => {
              const d = new Date();
              d.setDate(d.getDate() + 1);
              d.setHours(15, 0, 0, 0);
              return d;
            });
          }}
          className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${
            activePreset === 'tmrw-afternoon'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
          }`}
        >
          Tomorrow 3:00 PM
        </button>

        <button
          type="button"
          onClick={() => {
            applyPreset('plus-2h', () => {
              const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
              d.setMinutes(0, 0, 0);
              return d;
            });
          }}
          className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${
            activePreset === 'plus-2h'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
          }`}
        >
          +2 Hours
        </button>

        <button
          type="button"
          onClick={() => {
            applyPreset('in-2days', () => {
              const d = new Date();
              d.setDate(d.getDate() + 2);
              d.setHours(14, 0, 0, 0);
              return d;
            });
          }}
          className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${
            activePreset === 'in-2days'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
          }`}
        >
          In 2 Days (2 PM)
        </button>
      </div>

      {/* Multi-Timezone Confirmation Display */}
      {value && (
        <div className="bg-gray-50/80 dark:bg-stone-800/60 border border-gray-200 dark:border-stone-700 rounded-xl p-3 text-xs space-y-2 mt-2">
          {/* Candidate Local Time (if candidateTimezone provided) */}
          {candidateTimezone && (
            (() => {
              const workingInfo = evaluateCandidateWorkingHours(value, candidateTimezone);
              return (
                <div className="space-y-1 pb-1.5 border-b border-gray-200 dark:border-stone-700">
                  <div className="flex items-center justify-between text-gray-800 dark:text-stone-200 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{candidateName ? `${candidateName}'s Local Time:` : 'Candidate Local Time:'}</span>
                    </span>
                    <span className="font-bold text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      {formatInTimezone(value, candidateTimezone, { includeAbbr: true })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 dark:text-stone-400">
                      Zone: {candidateTimezoneLabel || candidateTimezone}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold border ${workingInfo.badgeColor}`}>
                      {workingInfo.badgeText}
                    </span>
                  </div>

                  {/* Sleep Warning */}
                  {workingInfo.isSleepingHours && (
                    <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-[11px] flex items-center gap-1.5 font-medium mt-1">
                      <Moon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{workingInfo.warning}</span>
                    </div>
                  )}
                </div>
              );
            })()
          )}

          <div className="flex items-center justify-between text-gray-700 dark:text-stone-300 font-medium">
            <span className="flex items-center gap-1.5">
              <span>🇵🇰</span>
              <span>Pakistan Time (PKT):</span>
            </span>
            <span className="font-semibold text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
              {formatPktDateTime(value)}
            </span>
          </div>

          <div className="flex items-center justify-between text-gray-600 dark:text-stone-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>Your Device Local:</span>
            </span>
            <span>{formatLocalDateTime(value)}</span>
          </div>
        </div>
      )}

      {/* Schedule Conflict Warning */}
      {conflict && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Schedule Conflict: </span>
            Another interview with <span className="font-medium underline">{conflict.candidateName}</span> is scheduled within {conflict.diffMinutes} minutes of this slot ({formatPktDateTime(conflict.candidateTime)}).
          </div>
        </div>
      )}
    </div>
  );
}
