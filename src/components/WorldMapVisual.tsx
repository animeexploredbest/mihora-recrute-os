import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Candidate } from '../types';
import { GeoLocationInfo, ThreeWayCategory, getCandidateCurrentLocalTime, getDiffFromPkt } from '../lib/geo-utils';
import { formatPktDateTime, formatRelativeTime } from '../lib/date-utils';
import {
  Globe,
  MapPin,
  Clock,
  Video,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Compass,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Crosshair,
  Users,
  Maximize2,
  RotateCw,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Layers,
  Activity,
  Plane,
  Radio,
  Navigation,
} from 'lucide-react';
import {
  geoOrthographic,
  geoNaturalEarth1,
  geoPath,
  geoGraticule,
  geoDistance,
  geoInterpolate,
} from 'd3-geo';
import { feature } from 'topojson-client';
import countriesData from 'world-atlas/countries-110m.json';
import { useTheme } from '../lib/theme';

interface WorldMapVisualProps {
  candidates: (Candidate & { geo: GeoLocationInfo; category: ThreeWayCategory })[];
  nextCandidate: (Candidate & { geo: GeoInfo; category: ThreeWayCategory }) | null;
  onScheduleCandidate: (candidate: Candidate) => void;
  onEditCandidate: (candidate: Candidate) => void;
}

type GeoInfo = GeoLocationInfo;

// Interviewer Hub coordinates: Pakistan (Lahore/Islamabad/Karachi average: [longitude, latitude])
const HUB_COORDINATES: [number, number] = [69.3451, 30.3753];

export function WorldMapVisual({
  candidates,
  nextCandidate,
  onScheduleCandidate,
  onEditCandidate,
}: WorldMapVisualProps) {
  const { theme, colors } = useTheme();

  // Mode: 3D Holographic Globe vs 2D Tactical Radar
  const [viewType, setViewType] = useState<'globe' | 'radar'>('globe');
  const [isExpandedMap, setIsExpandedMap] = useState<boolean>(false);
  
  // Interactive 3D Globe Rotation State: [longitude, latitude]
  const [rotation, setRotation] = useState<[number, number]>([-69, -25]); // Center initially around Pakistan / Middle East / South Asia
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [scaleFactor, setScaleFactor] = useState<number>(1); // Zoom level
  
  // Dragging state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; r0: [number, number] }>({
    x: 0,
    y: 0,
    r0: [-69, -25],
  });

  // Candidate Selection
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(
    nextCandidate ? nextCandidate.id : candidates.length > 0 ? candidates[0].id : null
  );
  const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<'all' | ThreeWayCategory>('all');
  const [showFlightCorridors, setShowFlightCorridors] = useState<boolean>(true);

  // GeoJSON TopoJSON Features memoized
  const { countriesFeatures, graticulesData } = useMemo(() => {
    try {
      const geojson = feature(
        countriesData as any,
        (countriesData as any).objects.countries
      ) as any;
      const graticuleGenerator = geoGraticule().step([20, 20]);
      return {
        countriesFeatures: geojson.features || [],
        graticulesData: graticuleGenerator(),
      };
    } catch (err) {
      console.error('Failed to load world atlas topojson:', err);
      return { countriesFeatures: [], graticulesData: null };
    }
  }, []);

  // Filter candidates
  const displayedCandidates = useMemo(() => {
    if (filterCategory === 'all') return candidates;
    return candidates.filter((c) => c.category === filterCategory);
  }, [candidates, filterCategory]);

  // Selected candidate object
  const activeCandidate = useMemo(() => {
    if (!activeCandidateId) return null;
    return candidates.find((c) => c.id === activeCandidateId) || null;
  }, [candidates, activeCandidateId]);

  // Active or hovered candidate
  const currentHighlighted = useMemo(() => {
    if (hoveredCandidateId) {
      return candidates.find((c) => c.id === hoveredCandidateId) || null;
    }
    return activeCandidate;
  }, [hoveredCandidateId, activeCandidate, candidates]);

  // Auto rotation animation loop for 3D Globe
  useEffect(() => {
    if (viewType !== 'globe' || !autoRotate) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      if (!isDraggingRef.current) {
        setRotation(([lambda, phi]) => [lambda - delta * 0.012, phi]);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [viewType, autoRotate]);

  // Target a candidate: Smoothly rotate globe to face the candidate
  const focusOnCandidate = useCallback((candidate: Candidate & { geo: GeoInfo }) => {
    setActiveCandidateId(candidate.id);
    if (viewType === 'globe') {
      setAutoRotate(false);
      const [lng, lat] = candidate.geo.coordinates || HUB_COORDINATES;
      setRotation([-lng, -Math.max(-45, Math.min(45, lat))]);
    }
  }, [viewType]);

  // Mouse & Touch Drag Event Handlers for 3D Globe
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (viewType !== 'globe') return;
    (e.target as Element).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      r0: [...rotation],
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current || viewType !== 'globe') return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const sensitivity = 0.35 / scaleFactor;

    setRotation([
      dragStartRef.current.r0[0] + dx * sensitivity,
      Math.max(-75, Math.min(75, dragStartRef.current.r0[1] - dy * sensitivity)),
    ]);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (viewType !== 'globe') return;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {}
    isDraggingRef.current = false;
  };

  // Dimensions
  const svgWidth = 960;
  const svgHeight = 480;

  // Setup D3 Projection based on mode
  const { projection, pathGenerator } = useMemo(() => {
    if (viewType === 'globe') {
      const radius = 190 * scaleFactor;
      const proj = geoOrthographic()
        .scale(radius)
        .translate([svgWidth / 2, svgHeight / 2])
        .rotate(rotation)
        .clipAngle(90);
      return {
        projection: proj,
        pathGenerator: geoPath(proj),
      };
    } else {
      // 2D Tactical Natural Earth projection
      const proj = geoNaturalEarth1()
        .scale(165 * scaleFactor)
        .translate([svgWidth / 2, svgHeight / 2]);
      return {
        projection: proj,
        pathGenerator: geoPath(proj),
      };
    }
  }, [viewType, rotation, scaleFactor]);

  // Helper to project point and check if visible on front hemisphere
  const getProjectedPoint = (coords: [number, number]) => {
    if (viewType === 'globe') {
      // Calculate angular distance to current view center to check if on front
      const centerLng = -rotation[0];
      const centerLat = -rotation[1];
      const dist = geoDistance(coords, [centerLng, centerLat]);
      const isVisible = dist < Math.PI / 2; // Front hemisphere only
      const pt = projection(coords);
      return { pt, isVisible };
    } else {
      const pt = projection(coords);
      return { pt, isVisible: !!pt };
    }
  };

  // Projected Hub coordinates (Pakistan)
  const hubPoint = getProjectedPoint(HUB_COORDINATES);

  // Pre-calculate flight corridors from Hub to each candidate
  const flightCorridors = useMemo(() => {
    return displayedCandidates.map((c) => {
      const candCoords = c.geo.coordinates || HUB_COORDINATES;
      const candPt = getProjectedPoint(candCoords);
      const distKm = Math.round(geoDistance(HUB_COORDINATES, candCoords) * 6371);

      // Generate intermediate points along great circle arc
      let pathString = '';
      if (viewType === 'globe') {
        // Use geoInterpolate to generate 30 points along the sphere
        const interpolator = geoInterpolate(HUB_COORDINATES, candCoords);
        const points: [number, number][] = [];
        let allVisible = false;

        for (let i = 0; i <= 30; i++) {
          const interpCoords = interpolator(i / 30);
          const p = getProjectedPoint(interpCoords);
          if (p.isVisible && p.pt) {
            allVisible = true;
            points.push(p.pt);
          }
        }

        if (points.length > 1) {
          pathString = points.reduce((acc, curr, idx) => {
            return idx === 0 ? `M ${curr[0]} ${curr[1]}` : `${acc} L ${curr[0]} ${curr[1]}`;
          }, '');
        }
      } else {
        // 2D Tactical curved bezier arc
        if (hubPoint.pt && candPt.pt) {
          const [hx, hy] = hubPoint.pt;
          const [cx, cy] = candPt.pt;
          const dx = cx - hx;
          const dy = cy - hy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const curveHeight = Math.min(80, Math.max(25, dist * 0.25));
          const midX = (hx + cx) / 2;
          const midY = (hy + cy) / 2 - curveHeight;
          pathString = `M ${hx} ${hy} Q ${midX} ${midY} ${cx} ${cy}`;
        }
      }

      return {
        candidate: c,
        candPt,
        distKm,
        pathString,
        isNext: nextCandidate && nextCandidate.id === c.id,
        isActive: activeCandidateId === c.id,
        isHovered: hoveredCandidateId === c.id,
      };
    });
  }, [
    displayedCandidates,
    HUB_COORDINATES,
    viewType,
    rotation,
    scaleFactor,
    nextCandidate,
    activeCandidateId,
    hoveredCandidateId,
    hubPoint,
  ]);

  return (
    <div className={`rounded-3xl border shadow-2xl overflow-hidden relative font-sans select-none transition-colors ${
      theme === 'desert'
        ? 'bg-[#18110B] text-[#F3E8DC] border-[#4A3525]'
        : theme === 'desertNight'
        ? 'bg-[#120D08] text-[#F5EFE9] border-[#362619]'
        : 'bg-[#050814] text-slate-100 border-indigo-900/40'
    }`}>
      {/* Dynamic Starfield & Ambient Glow Background */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity ${
        theme === 'desert' || theme === 'desertNight'
          ? 'bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(217,119,6,0.2),transparent)]'
          : 'bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(99,102,241,0.18),transparent)]'
      }`} />
      <div className={`absolute inset-0 pointer-events-none ${
        theme === 'desert' || theme === 'desertNight'
          ? 'bg-[radial-gradient(circle_at_bottom_left,rgba(194,94,46,0.1),transparent_50%)]'
          : 'bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_50%)]'
      }`} />

      {/* TOP COMMAND BAR */}
      <div className={`p-4 sm:p-5 border-b relative z-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
        theme === 'desert'
          ? 'border-[#3D2B1E] bg-[#22180F]/90'
          : theme === 'desertNight'
          ? 'border-[#2D1F15] bg-[#17100B]/90'
          : 'border-slate-800/80 bg-[#050814]/80'
      }`}>
        {/* Left Title & Status */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg transition-colors ${
              theme === 'desert'
                ? 'bg-gradient-to-br from-[#C25E2E] to-[#D97706] shadow-amber-900/40'
                : theme === 'desertNight'
                ? 'bg-gradient-to-br from-[#D97706] to-[#B45309] shadow-amber-950/50'
                : 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-500/30'
            }`}>
              <Globe className="w-5 h-5 animate-spin-slow" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#050814] animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white tracking-tight">
                Worldwide Candidate Flight Radar
              </h3>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border ${
                theme === 'desert' || theme === 'desertNight'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              }`}>
                {viewType === 'globe' ? '3D Spherical Earth' : '2D Tactical Radar'}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Origin telemetry & real-time timezones</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                <Radio className="w-3 h-3 animate-pulse" />
                HQ: Pakistan PKT (UTC+5)
              </span>
            </p>
          </div>
        </div>

        {/* Right Controls: Mode Toggle, Next Focus, 3-Way Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Target Next Candidate */}
          {nextCandidate && (
            <button
              onClick={() => focusOnCandidate(nextCandidate)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 border border-emerald-400/40 cursor-pointer transition-all active:scale-95"
              title="Rotate map & lock on the upcoming scheduled candidate"
            >
              <Crosshair className="w-3.5 h-3.5 animate-spin" />
              <span>Lock Next: {nextCandidate.name.split(' ')[0]} ({nextCandidate.geo.flag})</span>
            </button>
          )}

          {/* View Mode Switcher: 3D Globe vs 2D Radar */}
          <div className={`flex p-1 rounded-xl border text-xs ${
            theme === 'desert'
              ? 'bg-[#150E09] border-[#382619]'
              : theme === 'desertNight'
              ? 'bg-[#0E0906] border-[#2A1B11]'
              : 'bg-slate-900/90 border-slate-800'
          }`}>
            <button
              onClick={() => setViewType('globe')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewType === 'globe'
                  ? (theme === 'desert' || theme === 'desertNight' ? 'bg-[#C25E2E] text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm')
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>3D Globe</span>
            </button>
            <button
              onClick={() => setViewType('radar')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewType === 'radar'
                  ? (theme === 'desert' || theme === 'desertNight' ? 'bg-[#C25E2E] text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm')
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>2D Radar</span>
            </button>
          </div>

          {/* 3-Way Category Pill Filter */}
          <div className={`flex p-1 rounded-xl border text-xs ${
            theme === 'desert'
              ? 'bg-[#150E09] border-[#382619]'
              : theme === 'desertNight'
              ? 'bg-[#0E0906] border-[#2A1B11]'
              : 'bg-slate-900/90 border-slate-800'
          }`}>
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                filterCategory === 'all'
                  ? (theme === 'desert' || theme === 'desertNight' ? 'bg-[#3A281B] text-white' : 'bg-slate-800 text-white')
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({candidates.length})
            </button>
            <button
              onClick={() => setFilterCategory('appointed')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                filterCategory === 'appointed'
                  ? 'bg-emerald-500/25 text-emerald-300 font-bold'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Appointed
            </button>
            <button
              onClick={() => setFilterCategory('pending')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                filterCategory === 'pending'
                  ? 'bg-amber-500/25 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Pending
            </button>
            <button
              onClick={() => setFilterCategory('rejected')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                filterCategory === 'rejected'
                  ? 'bg-rose-500/25 text-rose-300 font-bold'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Rejected
            </button>
          </div>
        </div>
      </div>

      {/* INTERACTIVE MAP STAGE */}
      <div
        className={`relative w-full transition-all duration-300 ${
          isExpandedMap
            ? 'h-[75vh] min-h-[560px] max-h-[850px]'
            : 'aspect-[2/1] min-h-[360px] max-h-[580px]'
        } bg-gradient-to-b ${colors.globeTheme.bgGradient} overflow-hidden`}
      >
        {/* Floating HUD Controls: Zoom, Spin, Reset, Height */}
        <div className="absolute top-3 left-3 z-30 flex flex-col gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
          <button
            onClick={() => setIsExpandedMap(!isExpandedMap)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isExpandedMap
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
            title={isExpandedMap ? 'Standard Map Height' : 'Expand Full Height Radar'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setScaleFactor((prev) => Math.min(2.0, prev + 0.2))}
            className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setScaleFactor((prev) => Math.max(0.7, prev - 0.2))}
            className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {viewType === 'globe' && (
            <>
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  autoRotate
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                }`}
                title={autoRotate ? 'Pause Earth Rotation' : 'Auto Rotate Earth'}
              >
                {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  setRotation([-69, -25]);
                  setScaleFactor(1);
                }}
                className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                title="Reset View to Pakistan Hub"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => setShowFlightCorridors(!showFlightCorridors)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              showFlightCorridors
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-800/80 text-slate-400'
            }`}
            title="Toggle Flight Lines"
          >
            <Plane className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating Telemetry Coordinates Bar */}
        <div className="absolute top-3 right-3 z-30 hidden sm:flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <Navigation className="w-3 h-3 text-indigo-400" />
            <span>HQ: 30.38°N, 69.35°E</span>
          </div>
          <span className="text-slate-700">|</span>
          <div>INTERVIEWS: <span className="text-emerald-400 font-bold">{candidates.length} Global</span></div>
        </div>

        {/* 2D Radar Rotating Beam Scanner Effect */}
        {viewType === 'radar' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-10 opacity-30">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-indigo-500/20">
              <div className="absolute inset-0 rounded-full border border-dashed border-indigo-500/15" />
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, rgba(99, 102, 241, 0.4) 0deg, rgba(99, 102, 241, 0) 60deg, transparent 60deg)',
                  animation: 'radarSpin 6s linear infinite',
                }}
              />
            </div>
          </div>
        )}

        {/* SVG RENDERER */}
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className={`w-full h-full ${viewType === 'globe' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <defs>
            {/* Atmospheric Glow Gradient for 3D Globe */}
            <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor={colors.globeTheme.waterFill} stopOpacity="0.95" />
              <stop offset="96%" stopColor={colors.globeTheme.glowInner} stopOpacity="0.95" />
              <stop offset="100%" stopColor={colors.globeTheme.glowOuter} stopOpacity="0.85" />
            </radialGradient>

            {/* Atmosphere Halo */}
            <radialGradient id="atmosphereHalo" cx="50%" cy="50%" r="50%">
              <stop offset="85%" stopColor="transparent" />
              <stop offset="98%" stopColor={colors.globeTheme.glowOuter} stopOpacity="0.25" />
              <stop offset="100%" stopColor={colors.globeTheme.flightLineColor} stopOpacity="0.4" />
            </radialGradient>

            {/* Neon Flight Corridor Gradient */}
            <linearGradient id="flightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.globeTheme.glowOuter} stopOpacity="0.9" />
              <stop offset="50%" stopColor={colors.globeTheme.flightLineColor} stopOpacity="0.7" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
            </linearGradient>

            {/* Target Next Gradient */}
            <linearGradient id="nextFlightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.globeTheme.glowOuter} stopOpacity="1" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="1" />
            </linearGradient>

            {/* Radar Grid Pattern */}
            <pattern id="radarGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colors.globeTheme.graticuleColor} strokeWidth="0.8" />
            </pattern>
          </defs>

          {/* Tactical Background Grid */}
          <rect width={svgWidth} height={svgHeight} fill="url(#radarGrid)" />

          {/* 3D GLOBE SPHERE BACKGROUND & ATMOSPHERE */}
          {viewType === 'globe' && (
            <g>
              {/* Outer Atmosphere Glow Halo */}
              <circle
                cx={svgWidth / 2}
                cy={svgHeight / 2}
                r={190 * scaleFactor + 14}
                fill="url(#atmosphereHalo)"
                pointerEvents="none"
              />

              {/* Globe Ocean Body */}
              <circle
                cx={svgWidth / 2}
                cy={svgHeight / 2}
                r={190 * scaleFactor}
                fill="url(#globeGlow)"
                stroke={colors.globeTheme.glowOuter}
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* GRATICULES (Latitude / Longitude Grid Lines) */}
          {graticulesData && (
            <path
              d={pathGenerator(graticulesData) || ''}
              fill="none"
              stroke={colors.globeTheme.graticuleColor}
              strokeWidth="0.7"
              strokeDasharray={viewType === 'globe' ? 'none' : '2 2'}
              pointerEvents="none"
            />
          )}

          {/* REAL WORLD COUNTRIES GEOGRAPHIC VECTOR POLYGONS */}
          <g className="countries-layer">
            {countriesFeatures.map((featureItem: any, index: number) => {
              const pathD = pathGenerator(featureItem);
              if (!pathD) return null;

              return (
                <path
                  key={`country-${index}`}
                  d={pathD}
                  fill={colors.globeTheme.landFill}
                  stroke={colors.globeTheme.landStroke}
                  strokeWidth="0.6"
                  className="transition-colors hover:fill-amber-600/40 hover:stroke-amber-400/60 cursor-pointer"
                />
              );
            })}
          </g>

          {/* FLIGHT CORRIDORS / ARCS CONNECTING HUB TO CANDIDATES */}
          {showFlightCorridors && (
            <g className="corridors-layer" pointerEvents="none">
              {flightCorridors.map((item) => {
                if (!item.pathString) return null;

                const isNext = item.isNext;
                const isActive = item.isActive;
                const isHovered = item.isHovered;

                const strokeColor = isNext
                  ? 'url(#nextFlightGradient)'
                  : isActive
                  ? '#818cf8'
                  : isHovered
                  ? '#34d399'
                  : item.candidate.category === 'appointed'
                  ? 'rgba(16, 185, 129, 0.45)'
                  : item.candidate.category === 'pending'
                  ? 'rgba(245, 158, 11, 0.35)'
                  : 'rgba(244, 63, 94, 0.25)';

                const strokeW = isNext ? 2.8 : isActive || isHovered ? 2.2 : 1.2;

                return (
                  <g key={`corridor-${item.candidate.id}`}>
                    <path
                      d={item.pathString}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeW}
                      strokeDasharray={isNext ? 'none' : '4 3'}
                      strokeLinecap="round"
                    />

                    {/* Animated Flight Pulse Particle moving along the path */}
                    {(isNext || isActive) && (
                      <circle r={isNext ? 4 : 3} fill="#a7f3d0">
                        <animateMotion
                          path={item.pathString}
                          dur={isNext ? '3s' : '4.5s'}
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* INTERVIEWER HQ BEACON (Pakistan PKT) */}
          {hubPoint.isVisible && hubPoint.pt && (
            <g transform={`translate(${hubPoint.pt[0]}, ${hubPoint.pt[1]})`}>
              {/* Radar pulse ripples */}
              <circle r="18" fill="rgba(99, 102, 241, 0.25)" className="animate-ping" />
              <circle r="10" fill="rgba(99, 102, 241, 0.4)" />
              <circle r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />

              {/* HQ Flag & Callout */}
              <g transform="translate(0, -14)" pointerEvents="none">
                <rect
                  x="-35"
                  y="-14"
                  width="70"
                  height="14"
                  rx="4"
                  fill="#030712"
                  stroke="#4f46e5"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="-4"
                  textAnchor="middle"
                  fill="#c7d2fe"
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  🇵🇰 HQ (PKT)
                </text>
              </g>
            </g>
          )}

          {/* CANDIDATE GEOGRAPHICAL BEACONS & PINS */}
          <g className="candidates-layer">
            {flightCorridors.map((item) => {
              const { candidate, candPt, isNext, isActive, isHovered } = item;
              if (!candPt.isVisible || !candPt.pt) return null;

              const [cx, cy] = candPt.pt;
              const isAppointed = candidate.category === 'appointed';
              const isPending = candidate.category === 'pending';

              const mainColor = isNext
                ? '#10b981'
                : isAppointed
                ? '#10b981'
                : isPending
                ? '#f59e0b'
                : '#f43f5e';

              return (
                <g
                  key={`pin-${candidate.id}`}
                  transform={`translate(${cx}, ${cy})`}
                  className="cursor-pointer group"
                  onClick={() => focusOnCandidate(candidate)}
                  onMouseEnter={() => setHoveredCandidateId(candidate.id)}
                  onMouseLeave={() => setHoveredCandidateId(null)}
                >
                  {/* Next person pulsing target aura */}
                  {isNext && (
                    <g>
                      <circle r="22" fill="rgba(16, 185, 129, 0.2)" className="animate-ping" />
                      <circle r="14" fill="rgba(16, 185, 129, 0.3)" />
                    </g>
                  )}

                  {/* Active candidate ring */}
                  {(isActive || isHovered) && (
                    <circle
                      r="16"
                      fill="none"
                      stroke="#a5b4fc"
                      strokeWidth="2"
                      strokeDasharray="3 2"
                      className="animate-spin-slow"
                    />
                  )}

                  {/* Main Pin Circle */}
                  <circle
                    r={isNext ? 8 : isActive ? 7 : 5.5}
                    fill={mainColor}
                    stroke="#ffffff"
                    strokeWidth={isNext || isActive ? 2 : 1.2}
                    className="transition-transform duration-200 group-hover:scale-125"
                  />

                  {/* Flag Icon Tag */}
                  <g transform="translate(0, -12)" pointerEvents="none">
                    <rect
                      x="-14"
                      y="-11"
                      width="28"
                      height="12"
                      rx="3"
                      fill="#030712"
                      stroke={mainColor}
                      strokeWidth="0.8"
                    />
                    <text
                      x="0"
                      y="-2"
                      textAnchor="middle"
                      fontSize="8"
                      fill="#ffffff"
                      fontWeight="bold"
                    >
                      {candidate.geo.flag}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* ACTIVE / HOVERED CANDIDATE HUD CARD OVERLAY */}
        {currentHighlighted && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md z-40 bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 p-4 rounded-2xl shadow-2xl text-xs space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {/* Header with Flag, Name & Next badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl select-none" title={currentHighlighted.geo.country}>
                  {currentHighlighted.geo.flag}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-white tracking-tight">
                      {currentHighlighted.name}
                    </h4>
                    {nextCandidate?.id === currentHighlighted.id && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full animate-pulse">
                        ★ NEXT UP
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-indigo-300 font-medium truncate max-w-[200px]">
                    {currentHighlighted.position || 'Applicant'} &bull;{' '}
                    <span className="text-slate-400">{currentHighlighted.geo.country}</span>
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setActiveCandidateId(null);
                  setHoveredCandidateId(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Telemetry Metrics: Local Clock, PKT Time, Distance */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 font-mono">
              <div>
                <div className="text-[9px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-indigo-400" />
                  <span>THEIR TIME</span>
                </div>
                <div className="font-bold text-white text-xs mt-0.5">
                  {getCandidateCurrentLocalTime(currentHighlighted.geo.timezone)}
                </div>
                <div className="text-[9px] text-slate-500 truncate">
                  {currentHighlighted.geo.timezoneLabel}
                </div>
              </div>

              <div>
                <div className="text-[9px] text-emerald-400 flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  <span>PKT INTERVIEW</span>
                </div>
                <div className="font-bold text-emerald-300 text-xs mt-0.5 truncate">
                  {currentHighlighted.suggestedPktTime
                    ? formatPktDateTime(currentHighlighted.suggestedPktTime).split('(')[0].trim()
                    : 'Unscheduled'}
                </div>
                <div className="text-[9px] text-slate-500">UTC+5</div>
              </div>

              <div>
                <div className="text-[9px] text-indigo-400 flex items-center gap-1">
                  <Navigation className="w-2.5 h-2.5" />
                  <span>DISTANCE</span>
                </div>
                <div className="font-bold text-indigo-200 text-xs mt-0.5">
                  {Math.round(
                    geoDistance(HUB_COORDINATES, currentHighlighted.geo.coordinates || HUB_COORDINATES) * 6371
                  ).toLocaleString()} km
                </div>
                <div className="text-[9px] text-slate-500">From PK Hub</div>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                  currentHighlighted.category === 'appointed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : currentHighlighted.category === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {currentHighlighted.status}
              </span>

              <div className="flex items-center gap-1.5">
                {currentHighlighted.meetLink ? (
                  <a
                    href={currentHighlighted.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <Video className="w-3 h-3" />
                    <span>Join Meet</span>
                  </a>
                ) : (
                  <button
                    onClick={() => onScheduleCandidate(currentHighlighted)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Schedule</span>
                  </button>
                )}

                <button
                  onClick={() => onEditCandidate(currentHighlighted)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-700 cursor-pointer"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM RADAR LEGEND BAR */}
      <div className="p-3 sm:px-5 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/50" />
            <span className="text-slate-300 font-semibold">
              Appointed ({candidates.filter((c) => c.category === 'appointed').length})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-xs shadow-amber-400/50" />
            <span className="text-slate-300 font-semibold">
              Pending ({candidates.filter((c) => c.category === 'pending').length})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-xs shadow-rose-400/50" />
            <span className="text-slate-300 font-semibold">
              Rejected ({candidates.filter((c) => c.category === 'rejected').length})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white shadow-xs shadow-indigo-500/50" />
            <span className="text-slate-300 font-semibold">Interviewer HQ (Pakistan PKT)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span>Click and drag globe to rotate &bull; Click any pin for telemetry</span>
        </div>
      </div>
    </div>
  );
}
