import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Globe,
  Search,
  Check,
  Clock,
  Sun,
  Moon,
  ChevronDown,
  X,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  CURATED_TIMEZONES,
  getAllSupportedTimezones,
  WorldTimezoneInfo,
  getLiveTzOffsetString,
  getTzAbbreviation,
  evaluateCandidateWorkingHours,
} from '../lib/timezone-utils';

interface TimezoneSelectorProps {
  value?: string; // IANA timezone, e.g. "America/New_York"
  onChange: (tz: string, tzInfo: WorldTimezoneInfo) => void;
  label?: string;
  helperText?: string;
  suggestedCountry?: string;
  className?: string;
}

export const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
  value = 'Asia/Karachi',
  onChange,
  label = 'Candidate Time Zone',
  helperText,
  suggestedCountry,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Retrieve full timezone list
  const allTimezones = useMemo(() => getAllSupportedTimezones(), []);

  // Currently selected timezone item
  const currentTzInfo = useMemo(() => {
    const found = allTimezones.find((t) => t.tz.toLowerCase() === (value || '').toLowerCase());
    if (found) return found;

    // Fallback if not directly found
    return {
      tz: value || 'Asia/Karachi',
      label: value || 'Asia/Karachi',
      city: (value || 'Karachi').split('/').pop()?.replace(/_/g, ' ') || 'Karachi',
      country: suggestedCountry || 'Global',
      region: 'Asia' as const,
      flag: '🌐',
      utcOffsetStr: getLiveTzOffsetString(value || 'Asia/Karachi'),
      utcOffsetMinutes: 300,
    };
  }, [allTimezones, value, suggestedCountry]);

  // Working hours info for selected timezone
  const hoursInfo = useMemo(() => {
    return evaluateCandidateWorkingHours(new Date().toISOString(), currentTzInfo.tz);
  }, [currentTzInfo.tz]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filtered timezones based on search query and region filter
  const filteredTimezones = useMemo(() => {
    const query = search.toLowerCase().trim();
    return allTimezones.filter((item) => {
      if (selectedRegion !== 'all' && item.region !== selectedRegion) {
        return false;
      }
      if (!query) return true;

      return (
        item.tz.toLowerCase().includes(query) ||
        item.label.toLowerCase().includes(query) ||
        item.city.toLowerCase().includes(query) ||
        item.country.toLowerCase().includes(query) ||
        (item.abbr && item.abbr.toLowerCase().includes(query)) ||
        item.utcOffsetStr.toLowerCase().includes(query)
      );
    });
  }, [allTimezones, search, selectedRegion]);

  const regions = ['all', 'Americas', 'Europe', 'Asia', 'Middle East', 'Africa', 'Oceania'];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{label}</span>
          </label>
          {hoursInfo && (
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${hoursInfo.badgeColor}`}
            >
              {hoursInfo.localHour >= 7 && hoursInfo.localHour < 20 ? (
                <Sun className="w-3 h-3 text-amber-500" />
              ) : (
                <Moon className="w-3 h-3 text-indigo-400" />
              )}
              <span>Now: {hoursInfo.localTimeDisplay}</span>
            </span>
          )}
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 dark:border-stone-700 rounded-xl px-3 py-2.5 bg-white dark:bg-stone-900 text-left flex items-center justify-between gap-2 shadow-xs hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="text-base shrink-0">{currentTzInfo.flag}</span>
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-stone-100 truncate">
              {currentTzInfo.city}, {currentTzInfo.country}{' '}
              {currentTzInfo.abbr ? `(${currentTzInfo.abbr})` : ''}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-stone-400 font-mono flex items-center gap-2">
              <span>{currentTzInfo.tz}</span>
              <span>•</span>
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">{currentTzInfo.utcOffsetStr}</span>
            </div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {helperText && (
        <p className="text-[11px] text-gray-500 dark:text-stone-400 mt-1">{helperText}</p>
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full sm:w-[420px] left-0 sm:left-auto right-0 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-gray-200 dark:border-stone-700 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-gray-100 dark:border-stone-800 bg-gray-50/70 dark:bg-stone-800/40 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search city, country, code (EST, PST, IST, London, Dubai...)"
                autoFocus
                className="w-full pl-8 pr-7 py-2 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-medium focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-stone-100 placeholder:text-gray-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Region Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {regions.map((reg) => (
                <button
                  key={reg}
                  type="button"
                  onClick={() => setSelectedRegion(reg)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                    selectedRegion === reg
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 text-gray-600 dark:text-stone-300 hover:bg-gray-100'
                  }`}
                >
                  {reg === 'all' ? 'All Regions' : reg}
                </button>
              ))}
            </div>
          </div>

          {/* Quick suggestions if suggestedCountry provided */}
          {suggestedCountry && !search && selectedRegion === 'all' && (
            <div className="px-3 py-1.5 bg-indigo-50/60 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-[11px] text-indigo-900 dark:text-indigo-200">
              <span className="flex items-center gap-1 font-semibold">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Matched for {suggestedCountry}:
              </span>
              <span className="text-[10px] text-indigo-600 font-mono">Suggested Zones</span>
            </div>
          )}

          {/* Timezone List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-stone-800">
            {filteredTimezones.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <Globe className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                <p className="font-medium text-xs">No matching time zones found</p>
                <p className="text-[11px] mt-0.5">Try searching by country or city name</p>
              </div>
            ) : (
              filteredTimezones.map((tzItem) => {
                const isSelected = tzItem.tz.toLowerCase() === value.toLowerCase();
                // Compute current time in this timezone
                let timeInThisTz = '';
                try {
                  timeInThisTz = new Date().toLocaleTimeString('en-US', {
                    timeZone: tzItem.tz,
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });
                } catch {
                  timeInThisTz = '';
                }

                return (
                  <button
                    key={tzItem.tz}
                    type="button"
                    onClick={() => {
                      onChange(tzItem.tz, tzItem);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full p-2.5 text-left flex items-center justify-between gap-3 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                        : 'text-gray-800 dark:text-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-base shrink-0">{tzItem.flag}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate text-xs flex items-center gap-1.5">
                          <span>{tzItem.city}</span>
                          <span className="text-gray-400 font-normal">•</span>
                          <span className="text-gray-600 dark:text-stone-400 font-medium truncate">{tzItem.country}</span>
                          {tzItem.abbr && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300">
                              {tzItem.abbr}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono truncate">{tzItem.tz}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-xs text-gray-900 dark:text-stone-100 flex items-center gap-1 justify-end">
                        <Clock className="w-2.5 h-2.5 text-gray-400" />
                        <span>{timeInThisTz}</span>
                      </div>
                      <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                        {tzItem.utcOffsetStr}
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-1" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with total count */}
          <div className="p-2 border-t border-gray-100 dark:border-stone-800 bg-gray-50/50 dark:bg-stone-800/30 text-[10px] text-gray-400 flex items-center justify-between">
            <span>Showing {filteredTimezones.length} time zones</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">All Global UTC Offsets Supported</span>
          </div>
        </div>
      )}
    </div>
  );
};
