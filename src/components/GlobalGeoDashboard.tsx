import React, { useState, useMemo } from 'react';
import { Candidate } from '../types';
import {
  detectCandidateGeo,
  getCandidateCurrentLocalTime,
  getDiffFromPkt,
  getThreeWayCategory,
  ThreeWayCategory,
  GeoLocationInfo,
} from '../lib/geo-utils';
import { formatPktDateTime, formatLocalDateTime, formatRelativeTime } from '../lib/date-utils';
import { WorldMapVisual } from './WorldMapVisual';
import { useTheme } from '../lib/theme';
import {
  Globe,
  Clock,
  Video,
  Calendar,
  Sparkles,
  MapPin,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
  ChevronRight,
  Search,
  Filter,
  Users,
  Timer,
  Compass,
  MessageCircle,
} from 'lucide-react';

interface GlobalGeoDashboardProps {
  candidates: Candidate[];
  onScheduleCandidate: (candidate: Candidate) => void;
  onEditCandidate: (candidate: Candidate) => void;
  onDeleteCandidate: (candidate: Candidate) => void;
  onShareWhatsApp?: (candidate?: Candidate) => void;
}

export function GlobalGeoDashboard({
  candidates,
  onScheduleCandidate,
  onEditCandidate,
  onDeleteCandidate,
  onShareWhatsApp,
}: GlobalGeoDashboardProps) {
  const { theme, colors } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<'all' | ThreeWayCategory>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Enrich candidates with Geo Data
  const candidatesWithGeo = useMemo(() => {
    return candidates.map((c) => ({
      ...c,
      geo: detectCandidateGeo(c),
      category: getThreeWayCategory(c.status),
    }));
  }, [candidates]);

  // Identify "Next Person" scheduled in the world
  const nextCandidate = useMemo(() => {
    const now = Date.now();
    // Candidates who are appointed with a valid scheduled time
    const appointedList = candidatesWithGeo.filter(
      (c) => c.category === 'appointed' && c.suggestedPktTime && !isNaN(new Date(c.suggestedPktTime).getTime())
    );

    // Sort by upcoming date
    const futureOrNearest = appointedList.sort((a, b) => {
      const timeA = new Date(a.suggestedPktTime).getTime();
      const timeB = new Date(b.suggestedPktTime).getTime();
      return timeA - timeB;
    });

    // Prefer first future interview, or fallback to most recent
    const upcoming = futureOrNearest.find(
      (c) => new Date(c.suggestedPktTime).getTime() >= now - 1000 * 60 * 30
    );
    return upcoming || futureOrNearest[0] || null;
  }, [candidatesWithGeo]);

  // Country breakdown
  const countryStats = useMemo(() => {
    const map = new Map<
      string,
      {
        country: string;
        flag: string;
        region: string;
        total: number;
        appointed: number;
        pending: number;
        rejected: number;
        timezone: string;
      }
    >();

    candidatesWithGeo.forEach((c) => {
      const existing = map.get(c.geo.country) || {
        country: c.geo.country,
        flag: c.geo.flag,
        region: c.geo.region,
        total: 0,
        appointed: 0,
        pending: 0,
        rejected: 0,
        timezone: c.geo.timezone,
      };

      existing.total += 1;
      if (c.category === 'appointed') existing.appointed += 1;
      if (c.category === 'pending') existing.pending += 1;
      if (c.category === 'rejected') existing.rejected += 1;

      map.set(c.geo.country, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [candidatesWithGeo]);

  // Counts for 3-Way
  const counts = useMemo(() => {
    const appointed = candidatesWithGeo.filter((c) => c.category === 'appointed').length;
    const pending = candidatesWithGeo.filter((c) => c.category === 'pending').length;
    const rejected = candidatesWithGeo.filter((c) => c.category === 'rejected').length;
    return { appointed, pending, rejected, total: candidates.length };
  }, [candidatesWithGeo, candidates.length]);

  // Filtered candidate list
  const filteredCandidates = useMemo(() => {
    return candidatesWithGeo.filter((c) => {
      const matchesCategory =
        selectedCategory === 'all' || c.category === selectedCategory;
      const matchesCountry =
        selectedCountry === 'all' || c.geo.country === selectedCountry;
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.geo.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.position && c.position.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesCountry && matchesSearch;
    });
  }, [candidatesWithGeo, selectedCategory, selectedCountry, searchQuery]);

  // Group filtered by category for 3-way layout
  const appointedList = filteredCandidates.filter((c) => c.category === 'appointed');
  const pendingList = filteredCandidates.filter((c) => c.category === 'pending');
  const rejectedList = filteredCandidates.filter((c) => c.category === 'rejected');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Next Person In The World Spotlight */}
      {nextCandidate ? (
        <div className={`text-white rounded-3xl p-6 md:p-8 shadow-xl border relative overflow-hidden transition-colors ${
          theme === 'desert'
            ? 'bg-gradient-to-br from-[#2D1B11] via-[#1F130B] to-[#140C07] border-[#5A3821]'
            : theme === 'desertNight'
            ? 'bg-gradient-to-br from-[#1C130D] via-[#120B06] to-[#0A0604] border-[#402A1A]'
            : 'bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 border-indigo-800/40'
        }`}>
          {/* Subtle background glow */}
          <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
            theme === 'desert' || theme === 'desertNight' ? 'bg-amber-500/10' : 'bg-indigo-500/10'
          }`} />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                theme === 'desert' || theme === 'desertNight'
                  ? 'bg-amber-500/20 border-amber-400/30 text-amber-300'
                  : 'bg-indigo-500/20 border-indigo-400/30 text-indigo-200'
              }`}>
                <Compass className={`w-3.5 h-3.5 animate-pulse ${theme === 'desert' || theme === 'desertNight' ? 'text-amber-400' : 'text-indigo-300'}`} />
                <span>Next Person in the World (Upcoming Interview)</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-white/80 bg-white/10 px-3 py-1 rounded-lg border border-white/10">
                <Timer className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {formatRelativeTime(nextCandidate.suggestedPktTime).text}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Column: Candidate & Location Info */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="text-4xl select-none" title={nextCandidate.geo.country}>
                    {nextCandidate.geo.flag}
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                      {nextCandidate.name}
                    </h2>
                    <p className={`text-sm font-medium ${theme === 'desert' || theme === 'desertNight' ? 'text-amber-200/90' : 'text-indigo-200'}`}>
                      {nextCandidate.position || 'Technical Candidate'} &bull;{' '}
                      <span className="text-white/80">{nextCandidate.email}</span>
                    </p>
                  </div>
                </div>

                {/* Country and World Region breakdown */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="inline-flex items-center gap-1.5 bg-white/10 text-white px-3 py-1 rounded-full border border-white/15 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    {nextCandidate.geo.city ? `${nextCandidate.geo.city}, ` : ''}
                    {nextCandidate.geo.country}
                  </span>
                  <span className="bg-white/10 text-white/90 px-3 py-1 rounded-full border border-white/15">
                    Region: {nextCandidate.geo.region}
                  </span>
                  <span className={`px-3 py-1 rounded-full border ${
                    theme === 'desert' || theme === 'desertNight'
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                      : 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30'
                  }`}>
                    {getDiffFromPkt(nextCandidate.geo.timezone)}
                  </span>
                </div>

                {nextCandidate.aiSummary && (
                  <p className="text-xs text-white/80 line-clamp-2 italic pt-1">
                    &ldquo;{nextCandidate.aiSummary}&rdquo;
                  </p>
                )}
              </div>

              {/* Right Column: Timezone Clocks & Instant Action */}
              <div className="lg:col-span-5 bg-black/30 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-white/15 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-left">
                  {/* Candidate Local Clock */}
                  <div className="bg-black/30 rounded-xl p-3 border border-white/10">
                    <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-medium mb-1">
                      <Clock className={`w-3 h-3 ${theme === 'desert' || theme === 'desertNight' ? 'text-amber-400' : 'text-indigo-300'}`} />
                      <span>Their Local Clock</span>
                    </div>
                    <div className="text-lg font-bold text-white tracking-tight">
                      {getCandidateCurrentLocalTime(nextCandidate.geo.timezone)}
                    </div>
                    <div className="text-[10px] text-white/60 font-mono truncate">
                      {nextCandidate.geo.timezoneLabel}
                    </div>
                  </div>

                  {/* Pakistan PKT Clock */}
                  <div className="bg-black/30 rounded-xl p-3 border border-white/10">
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-medium mb-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>Interview Time (PKT)</span>
                    </div>
                    <div className="text-lg font-bold text-emerald-300 tracking-tight">
                      {formatPktDateTime(nextCandidate.suggestedPktTime).split('(')[0].trim()}
                    </div>
                    <div className="text-[10px] text-emerald-400/80 font-mono">
                      PKT (UTC+5)
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {nextCandidate.meetLink ? (
                    <a
                      href={nextCandidate.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-xs transition-colors shadow-sm cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                      <span>Join Google Meet</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>
                  ) : (
                    <button
                      onClick={() => onScheduleCandidate(nextCandidate)}
                      className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl font-semibold text-xs transition-colors shadow-sm cursor-pointer ${
                        theme === 'desert' || theme === 'desertNight' ? 'bg-[#C25E2E] hover:bg-[#A84F24]' : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Attach Google Meet Slot</span>
                    </button>
                  )}

                  <button
                    onClick={() => onEditCandidate(nextCandidate)}
                    className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium text-xs transition-colors border border-white/15 cursor-pointer"
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`text-white rounded-2xl p-6 shadow-sm border text-center space-y-2 ${
          theme === 'desert'
            ? 'bg-gradient-to-r from-[#291A11] to-[#1E120A] border-[#4A301C]'
            : theme === 'desertNight'
            ? 'bg-gradient-to-r from-[#1A120B] to-[#100B07] border-[#362315]'
            : 'bg-gradient-to-r from-slate-900 to-indigo-950 border-slate-800'
        }`}>
          <Globe className={`w-8 h-8 mx-auto ${theme === 'desert' || theme === 'desertNight' ? 'text-amber-400' : 'text-indigo-400'}`} />
          <h3 className="font-semibold text-base">No Appointed Interviews Scheduled Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Candidates currently in "Pending" status have not been appointed an interview slot yet. Select any pending candidate below to schedule an interview.
          </p>
        </div>
      )}

      {/* Visual Interactive World Map Radar */}
      <WorldMapVisual
        candidates={candidatesWithGeo}
        nextCandidate={nextCandidate}
        onScheduleCandidate={onScheduleCandidate}
        onEditCandidate={onEditCandidate}
      />

      {/* 2. Global Origin Country Cards & Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${colors.textPrimary}`}>
              <Globe className={`w-4 h-4 ${colors.accentText}`} />
              <span>World Candidate Origins ({countryStats.length} Countries)</span>
            </h3>
            <p className={`text-xs ${colors.textSecondary}`}>
              Distribution of applicants from across the globe
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className={`w-4 h-4 absolute left-3 top-2.5 pointer-events-none ${colors.textMuted}`} />
            <input
              type="text"
              placeholder="Search candidate or country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl focus:outline-none focus:ring-2 ${colors.inputBg}`}
            />
          </div>
        </div>

        {/* Country Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => setSelectedCountry('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedCountry === 'all'
                ? `${colors.accentBg} text-white shadow-xs`
                : `${colors.subtleBg} ${colors.textPrimary} border ${colors.border} hover:opacity-90`
            }`}
          >
            All World ({candidates.length})
          </button>
          {countryStats.map((stat) => (
            <button
              key={stat.country}
              onClick={() => setSelectedCountry(stat.country === selectedCountry ? 'all' : stat.country)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedCountry === stat.country
                  ? `${colors.accentBg} text-white shadow-xs`
                  : `${colors.cardBg} ${colors.textPrimary} border ${colors.border} hover:opacity-90`
              }`}
            >
              <span className="text-sm">{stat.flag}</span>
              <span>{stat.country}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  selectedCountry === stat.country
                    ? 'bg-white/20 text-white'
                    : `${colors.subtleBg} ${colors.textSecondary}`
                }`}
              >
                {stat.total}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Three-Way Category Selector Header (Appointed / Pending / Rejected) */}
      <div className={`${colors.cardBg} p-2 rounded-2xl border ${colors.border} shadow-xs flex flex-wrap gap-2`}>
        <button
          onClick={() => setSelectedCategory('all')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            selectedCategory === 'all'
              ? (theme === 'desert' || theme === 'desertNight' ? 'bg-[#3A281B] text-white shadow-xs' : 'bg-gray-900 text-white shadow-xs')
              : `${colors.textSecondary} hover:${colors.subtleBg}`
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>All Candidates ({counts.total})</span>
        </button>

        <button
          onClick={() => setSelectedCategory('appointed')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            selectedCategory === 'appointed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-600 hover:bg-emerald-50/20'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Appointed ({counts.appointed})</span>
        </button>

        <button
          onClick={() => setSelectedCategory('pending')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            selectedCategory === 'pending'
              ? (theme === 'desert' || theme === 'desertNight' ? 'bg-[#D97706] text-white shadow-xs' : 'bg-amber-500 text-white shadow-xs')
              : 'text-amber-600 hover:bg-amber-50/20'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Pending ({counts.pending})</span>
        </button>

        <button
          onClick={() => setSelectedCategory('rejected')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            selectedCategory === 'rejected'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-rose-600 hover:bg-rose-50/20'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Rejected ({counts.rejected})</span>
        </button>

        {onShareWhatsApp && (
          <button
            type="button"
            onClick={() => onShareWhatsApp()}
            className="py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-xs ml-auto"
            title="Export and share interview list as formatted WhatsApp text"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600 fill-current" />
            <span>WhatsApp Schedule</span>
          </button>
        )}
      </div>

      {/* 4. Three-Way Columns Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Column 1: Appointed */}
        {(selectedCategory === 'all' || selectedCategory === 'appointed') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h4 className={`font-bold text-sm ${colors.textPrimary}`}>Appointed</h4>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                {appointedList.length}
              </span>
            </div>

            <div className="space-y-3">
              {appointedList.length === 0 ? (
                <div className={`${colors.subtleBg} border border-dashed ${colors.border} rounded-2xl p-6 text-center text-xs ${colors.textMuted}`}>
                  No candidates appointed in this view
                </div>
              ) : (
                appointedList.map((c) => (
                  <GeoCandidateCard
                    key={c.id}
                    candidate={c}
                    category="appointed"
                    colors={colors}
                    onSchedule={() => onScheduleCandidate(c)}
                    onEdit={() => onEditCandidate(c)}
                    onDelete={() => onDeleteCandidate(c)}
                    onShareWhatsApp={() => onShareWhatsApp?.(c)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Column 2: Pending */}
        {(selectedCategory === 'all' || selectedCategory === 'pending') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h4 className={`font-bold text-sm ${colors.textPrimary}`}>Pending</h4>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                {pendingList.length}
              </span>
            </div>

            <div className="space-y-3">
              {pendingList.length === 0 ? (
                <div className={`${colors.subtleBg} border border-dashed ${colors.border} rounded-2xl p-6 text-center text-xs ${colors.textMuted}`}>
                  No pending candidates in this view
                </div>
              ) : (
                pendingList.map((c) => (
                  <GeoCandidateCard
                    key={c.id}
                    candidate={c}
                    category="pending"
                    colors={colors}
                    onSchedule={() => onScheduleCandidate(c)}
                    onEdit={() => onEditCandidate(c)}
                    onDelete={() => onDeleteCandidate(c)}
                    onShareWhatsApp={() => onShareWhatsApp?.(c)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Column 3: Rejected */}
        {(selectedCategory === 'all' || selectedCategory === 'rejected') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h4 className={`font-bold text-sm ${colors.textPrimary}`}>Rejected</h4>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">
                {rejectedList.length}
              </span>
            </div>

            <div className="space-y-3">
              {rejectedList.length === 0 ? (
                <div className={`${colors.subtleBg} border border-dashed ${colors.border} rounded-2xl p-6 text-center text-xs ${colors.textMuted}`}>
                  No rejected candidates
                </div>
              ) : (
                rejectedList.map((c) => (
                  <GeoCandidateCard
                    key={c.id}
                    candidate={c}
                    category="rejected"
                    colors={colors}
                    onSchedule={() => onScheduleCandidate(c)}
                    onEdit={() => onEditCandidate(c)}
                    onDelete={() => onDeleteCandidate(c)}
                    onShareWhatsApp={() => onShareWhatsApp?.(c)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Individual Geo-Enhanced Candidate Card
function GeoCandidateCard({
  candidate,
  category,
  colors,
  onSchedule,
  onEdit,
  onDelete,
  onShareWhatsApp,
}: {
  key?: React.Key;
  candidate: Candidate & { geo: GeoLocationInfo; category: ThreeWayCategory };
  category: ThreeWayCategory;
  colors: any;
  onSchedule: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShareWhatsApp?: () => void;
}) {
  const localClock = getCandidateCurrentLocalTime(candidate.geo.timezone);
  const diffPkt = getDiffFromPkt(candidate.geo.timezone);

  return (
    <div className={`${colors.cardBg} p-4 rounded-2xl border ${colors.border} shadow-xs hover:shadow-md transition-all space-y-3 group`}>
      {/* Top: Country Flag & Candidate Name */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="text-2xl select-none" title={candidate.geo.country}>
            {candidate.geo.flag}
          </div>
          <div>
            <h4 className={`font-bold text-sm ${colors.textPrimary} group-hover:${colors.accentText} transition-colors line-clamp-1`}>
              {candidate.name}
            </h4>
            <p className={`text-[11px] ${colors.textSecondary} font-medium`}>
              {candidate.position || 'Applicant'}
            </p>
          </div>
        </div>

        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
            category === 'appointed'
              ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
              : category === 'pending'
              ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
              : 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30'
          }`}
        >
          {candidate.status}
        </span>
      </div>

      {/* World Origin & Location Tag */}
      <div className={`${colors.subtleBg} rounded-xl p-2.5 border ${colors.border} space-y-1.5 text-xs`}>
        <div className="flex items-center justify-between text-[11px]">
          <span className={`font-semibold ${colors.textPrimary} flex items-center gap-1`}>
            <MapPin className="w-3 h-3 text-rose-500" />
            {candidate.geo.city ? `${candidate.geo.city}, ` : ''}
            {candidate.geo.country}
          </span>
          <span className={`${colors.textMuted} font-medium text-[10px]`}>
            {candidate.geo.region}
          </span>
        </div>

        {/* Live Clock comparison */}
        <div className={`flex items-center justify-between text-[10px] pt-0.5 border-t ${colors.borderLight} ${colors.textSecondary}`}>
          <span className="flex items-center gap-1 font-mono">
            <Clock className={`w-3 h-3 ${colors.accentText}`} />
            Local: <span className={`font-bold ${colors.textPrimary}`}>{localClock}</span>
          </span>
          <span className={`${colors.accentText} font-medium`}>
            {diffPkt}
          </span>
        </div>
      </div>

      {/* Interview Slot / Availability details */}
      {candidate.suggestedPktTime && (
        <div className={`flex items-center justify-between text-[11px] ${colors.accentSoft} border rounded-lg p-2 font-medium`}>
          <span className="flex items-center gap-1">
            <Calendar className={`w-3.5 h-3.5 ${colors.accentText}`} />
            PKT Slot:
          </span>
          <div className="flex items-center gap-1.5 font-bold">
            <span>{formatPktDateTime(candidate.suggestedPktTime).split('(')[0].trim()}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-900 dark:text-amber-200">
              {candidate.durationMinutes || 45}m
            </span>
          </div>
        </div>
      )}

      {candidate.originalAvailability && !candidate.suggestedPktTime && (
        <div className={`text-[11px] ${colors.textMuted} italic ${colors.subtleBg} rounded-lg p-2 border ${colors.border}`}>
          Avail: &ldquo;{candidate.originalAvailability}&rdquo;
        </div>
      )}

      {/* Meet link if appointed */}
      {candidate.meetLink && (
        <div className="flex items-center justify-between bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 text-xs text-emerald-800 dark:text-emerald-300">
          <span className="flex items-center gap-1 font-semibold text-[11px]">
            <Video className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Google Meet Attached
          </span>
          <a
            href={candidate.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold hover:underline flex items-center gap-0.5"
          >
            Join <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Card Actions */}
      <div className={`flex items-center justify-between pt-1 border-t ${colors.borderLight} text-xs`}>
        <div className="flex items-center gap-1">
          {category === 'pending' && (
            <button
              onClick={onSchedule}
              className={`px-2.5 py-1 ${colors.accentBg} text-white hover:opacity-90 rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer`}
            >
              <Calendar className="w-3 h-3" />
              <span>Appoint Slot</span>
            </button>
          )}

          {category === 'appointed' && (
            <button
              onClick={onSchedule}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <CalendarClock className="w-3 h-3" />
              <span>Reschedule</span>
            </button>
          )}

          {onShareWhatsApp && (
            <button
              type="button"
              onClick={onShareWhatsApp}
              className="p-1 px-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-300/60 dark:border-emerald-700/60 transition-colors cursor-pointer flex items-center gap-1"
              title="Share this interview via WhatsApp"
            >
              <MessageCircle className="w-3 h-3 fill-current" />
              <span className="text-[10px] font-semibold hidden sm:inline">WhatsApp</span>
            </button>
          )}

          <button
            onClick={onEdit}
            className={`px-2 py-1 ${colors.textSecondary} hover:${colors.textPrimary} hover:${colors.subtleBg} rounded-lg text-[11px] font-medium transition-colors cursor-pointer`}
          >
            Edit
          </button>
        </div>

        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-500 p-1 rounded-lg text-[11px] transition-colors cursor-pointer"
          title="Delete Candidate"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
