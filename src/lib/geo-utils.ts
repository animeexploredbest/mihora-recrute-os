// Geographical analysis and country detection utilities for candidates

export interface GeoLocationInfo {
  country: string;
  countryCode: string;
  flag: string;
  city?: string;
  region: string; // e.g. "South Asia", "North America", "Europe", "Middle East"
  timezone: string; // IANA timezone e.g. "Asia/Karachi"
  timezoneLabel: string; // e.g. "PKT (UTC+5)"
  mapCoords: { x: number; y: number }; // Percentage 0-100 on standard world map
  coordinates: [number, number]; // [longitude, latitude] for geo projections
}

const COUNTRY_DATABASE: {
  keywords: string[];
  info: GeoLocationInfo;
}[] = [
  {
    keywords: ['pakistan', 'lahore', 'karachi', 'islamabad', 'rawalpindi', 'faisalabad', 'peshawar', 'multan', 'pkt', '+92'],
    info: {
      country: 'Pakistan',
      countryCode: 'PK',
      flag: '🇵🇰',
      region: 'South Asia',
      timezone: 'Asia/Karachi',
      timezoneLabel: 'PKT (UTC+5)',
      mapCoords: { x: 67, y: 44 },
      coordinates: [69.3451, 30.3753],
    },
  },
  {
    keywords: ['usa', 'united states', 'u.s.', 'california', 'new york', 'texas', 'san francisco', 'seattle', 'chicago', 'austin', 'boston', 'los angeles', 'miami', 'est', 'pst', 'cst', 'mst', 'america', '+1'],
    info: {
      country: 'United States',
      countryCode: 'US',
      flag: '🇺🇸',
      region: 'North America',
      timezone: 'America/New_York',
      timezoneLabel: 'EST/PST (UTC-5/-8)',
      mapCoords: { x: 23, y: 38 },
      coordinates: [-95.7129, 37.0902],
    },
  },
  {
    keywords: ['uk', 'united kingdom', 'britain', 'england', 'london', 'manchester', 'birmingham', 'edinburgh', 'glasgow', 'gmt', 'bst', '+44'],
    info: {
      country: 'United Kingdom',
      countryCode: 'GB',
      flag: '🇬🇧',
      region: 'Western Europe',
      timezone: 'Europe/London',
      timezoneLabel: 'GMT/BST (UTC+0/+1)',
      mapCoords: { x: 48, y: 28 },
      coordinates: [-3.4359, 55.3781],
    },
  },
  {
    keywords: ['canada', 'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary', 'alberta', 'ontario'],
    info: {
      country: 'Canada',
      countryCode: 'CA',
      flag: '🇨🇦',
      region: 'North America',
      timezone: 'America/Toronto',
      timezoneLabel: 'EST (UTC-5)',
      mapCoords: { x: 24, y: 27 },
      coordinates: [-106.3468, 56.1304],
    },
  },
  {
    keywords: ['uae', 'united arab emirates', 'dubai', 'abu dhabi', 'sharjah', 'gst', '+971'],
    info: {
      country: 'United Arab Emirates',
      countryCode: 'AE',
      flag: '🇦🇪',
      region: 'Middle East',
      timezone: 'Asia/Dubai',
      timezoneLabel: 'GST (UTC+4)',
      mapCoords: { x: 62, y: 45 },
      coordinates: [53.8478, 23.4241],
    },
  },
  {
    keywords: ['germany', 'deutschland', 'berlin', 'munich', 'frankfurt', 'hamburg', 'cologne', 'cet', '+49'],
    info: {
      country: 'Germany',
      countryCode: 'DE',
      flag: '🇩🇪',
      region: 'Central Europe',
      timezone: 'Europe/Berlin',
      timezoneLabel: 'CET (UTC+1)',
      mapCoords: { x: 52, y: 30 },
      coordinates: [10.4515, 51.1657],
    },
  },
  {
    keywords: ['india', 'bangalore', 'bengaluru', 'delhi', 'mumbai', 'hyderabad', 'pune', 'chennai', 'noida', 'gurgaon', 'ist', '+91'],
    info: {
      country: 'India',
      countryCode: 'IN',
      flag: '🇮🇳',
      region: 'South Asia',
      timezone: 'Asia/Kolkata',
      timezoneLabel: 'IST (UTC+5:30)',
      mapCoords: { x: 71, y: 48 },
      coordinates: [78.9629, 20.5937],
    },
  },
  {
    keywords: ['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'aest', '+61'],
    info: {
      country: 'Australia',
      countryCode: 'AU',
      flag: '🇦🇺',
      region: 'Oceania',
      timezone: 'Australia/Sydney',
      timezoneLabel: 'AEST (UTC+10)',
      mapCoords: { x: 86, y: 77 },
      coordinates: [133.7751, -25.2744],
    },
  },
  {
    keywords: ['saudi arabia', 'saudi', 'ksa', 'riyadh', 'jeddah', 'dammam', '+966'],
    info: {
      country: 'Saudi Arabia',
      countryCode: 'SA',
      flag: '🇸🇦',
      region: 'Middle East',
      timezone: 'Asia/Riyadh',
      timezoneLabel: 'AST (UTC+3)',
      mapCoords: { x: 58, y: 46 },
      coordinates: [45.0792, 23.8859],
    },
  },
  {
    keywords: ['turkey', 'türkiye', 'istanbul', 'ankara', 'izmir', '+90'],
    info: {
      country: 'Turkey',
      countryCode: 'TR',
      flag: '🇹🇷',
      region: 'Eurasia',
      timezone: 'Europe/Istanbul',
      timezoneLabel: 'TRT (UTC+3)',
      mapCoords: { x: 57, y: 36 },
      coordinates: [35.2433, 38.9637],
    },
  },
  {
    keywords: ['singapore', 'sg', '+65'],
    info: {
      country: 'Singapore',
      countryCode: 'SG',
      flag: '🇸🇬',
      region: 'Southeast Asia',
      timezone: 'Asia/Singapore',
      timezoneLabel: 'SGT (UTC+8)',
      mapCoords: { x: 76, y: 56 },
      coordinates: [103.8198, 1.3521],
    },
  },
  {
    keywords: ['netherlands', 'holland', 'amsterdam', 'rotterdam', '+31'],
    info: {
      country: 'Netherlands',
      countryCode: 'NL',
      flag: '🇳🇱',
      region: 'Western Europe',
      timezone: 'Europe/Amsterdam',
      timezoneLabel: 'CET (UTC+1)',
      mapCoords: { x: 50, y: 29 },
      coordinates: [5.2913, 52.1326],
    },
  },
  {
    keywords: ['france', 'paris', 'lyon', 'marseille', '+33'],
    info: {
      country: 'France',
      countryCode: 'FR',
      flag: '🇫🇷',
      region: 'Western Europe',
      timezone: 'Europe/Paris',
      timezoneLabel: 'CET (UTC+1)',
      mapCoords: { x: 49, y: 32 },
      coordinates: [2.2137, 46.2276],
    },
  },
  {
    keywords: ['philippines', 'manila', 'cebu', '+63'],
    info: {
      country: 'Philippines',
      countryCode: 'PH',
      flag: '🇵🇭',
      region: 'Southeast Asia',
      timezone: 'Asia/Manila',
      timezoneLabel: 'PHT (UTC+8)',
      mapCoords: { x: 81, y: 51 },
      coordinates: [121.7740, 12.8797],
    },
  },
  {
    keywords: ['japan', 'tokyo', 'osaka', 'kyoto', 'jst', '+81'],
    info: {
      country: 'Japan',
      countryCode: 'JP',
      flag: '🇯🇵',
      region: 'East Asia',
      timezone: 'Asia/Tokyo',
      timezoneLabel: 'JST (UTC+9)',
      mapCoords: { x: 85, y: 39 },
      coordinates: [138.2529, 36.2048],
    },
  },
  {
    keywords: ['china', 'beijing', 'shanghai', 'shenzhen', 'guangzhou', 'cst', '+86'],
    info: {
      country: 'China',
      countryCode: 'CN',
      flag: '🇨🇳',
      region: 'East Asia',
      timezone: 'Asia/Shanghai',
      timezoneLabel: 'CST (UTC+8)',
      mapCoords: { x: 77, y: 40 },
      coordinates: [104.1954, 35.8617],
    },
  },
  {
    keywords: ['brazil', 'brasil', 'sao paulo', 'rio de janeiro', 'brasilia', '+55'],
    info: {
      country: 'Brazil',
      countryCode: 'BR',
      flag: '🇧🇷',
      region: 'South America',
      timezone: 'America/Sao_Paulo',
      timezoneLabel: 'BRT (UTC-3)',
      mapCoords: { x: 33, y: 68 },
      coordinates: [-51.9253, -14.2350],
    },
  },
  {
    keywords: ['mexico', 'mexico city', 'guadalajara', 'monterrey', '+52'],
    info: {
      country: 'Mexico',
      countryCode: 'MX',
      flag: '🇲🇽',
      region: 'North America',
      timezone: 'America/Mexico_City',
      timezoneLabel: 'CST (UTC-6)',
      mapCoords: { x: 19, y: 47 },
      coordinates: [-102.5528, 23.6345],
    },
  },
  {
    keywords: ['ireland', 'dublin', 'cork', 'galway', '+353'],
    info: {
      country: 'Ireland',
      countryCode: 'IE',
      flag: '🇮🇪',
      region: 'Western Europe',
      timezone: 'Europe/Dublin',
      timezoneLabel: 'IST (UTC+1)',
      mapCoords: { x: 46, y: 28 },
      coordinates: [-8.2439, 53.4129],
    },
  },
  {
    keywords: ['spain', 'españa', 'madrid', 'barcelona', 'valencia', '+34'],
    info: {
      country: 'Spain',
      countryCode: 'ES',
      flag: '🇪🇸',
      region: 'Southern Europe',
      timezone: 'Europe/Madrid',
      timezoneLabel: 'CET (UTC+1)',
      mapCoords: { x: 47, y: 36 },
      coordinates: [-3.7492, 40.4637],
    },
  },
  {
    keywords: ['italy', 'italia', 'rome', 'milan', 'naples', 'turin', '+39'],
    info: {
      country: 'Italy',
      countryCode: 'IT',
      flag: '🇮🇹',
      region: 'Southern Europe',
      timezone: 'Europe/Rome',
      timezoneLabel: 'CET (UTC+1)',
      mapCoords: { x: 52, y: 35 },
      coordinates: [12.5674, 41.8719],
    },
  },
  {
    keywords: ['south africa', 'johannesburg', 'cape town', 'durban', '+27'],
    info: {
      country: 'South Africa',
      countryCode: 'ZA',
      flag: '🇿🇦',
      region: 'Southern Africa',
      timezone: 'Africa/Johannesburg',
      timezoneLabel: 'SAST (UTC+2)',
      mapCoords: { x: 54, y: 76 },
      coordinates: [22.9375, -30.5595],
    },
  },
  {
    keywords: ['egypt', 'cairo', 'alexandria', '+20'],
    info: {
      country: 'Egypt',
      countryCode: 'EG',
      flag: '🇪🇬',
      region: 'North Africa',
      timezone: 'Africa/Cairo',
      timezoneLabel: 'EET (UTC+2)',
      mapCoords: { x: 56, y: 42 },
      coordinates: [30.8025, 26.8206],
    },
  },
  {
    keywords: ['nigeria', 'lagos', 'abuja', '+234'],
    info: {
      country: 'Nigeria',
      countryCode: 'NG',
      flag: '🇳🇬',
      region: 'West Africa',
      timezone: 'Africa/Lagos',
      timezoneLabel: 'WAT (UTC+1)',
      mapCoords: { x: 49, y: 53 },
      coordinates: [8.6753, 9.0820],
    },
  },
  {
    keywords: ['malaysia', 'kuala lumpur', 'penang', '+60'],
    info: {
      country: 'Malaysia',
      countryCode: 'MY',
      flag: '🇲🇾',
      region: 'Southeast Asia',
      timezone: 'Asia/Kuala_Lumpur',
      timezoneLabel: 'MYT (UTC+8)',
      mapCoords: { x: 75, y: 54 },
      coordinates: [101.9758, 4.2105],
    },
  },
  {
    keywords: ['indonesia', 'jakarta', 'bali', 'surabaya', '+62'],
    info: {
      country: 'Indonesia',
      countryCode: 'ID',
      flag: '🇮🇩',
      region: 'Southeast Asia',
      timezone: 'Asia/Jakarta',
      timezoneLabel: 'WIB (UTC+7)',
      mapCoords: { x: 78, y: 60 },
      coordinates: [113.9213, -0.7893],
    },
  },
  {
    keywords: ['bangladesh', 'dhaka', 'chittagong', '+880'],
    info: {
      country: 'Bangladesh',
      countryCode: 'BD',
      flag: '🇧🇩',
      region: 'South Asia',
      timezone: 'Asia/Dhaka',
      timezoneLabel: 'BST (UTC+6)',
      mapCoords: { x: 73, y: 46 },
      coordinates: [90.3563, 23.6850],
    },
  },
  {
    keywords: ['poland', 'warsaw', 'krakow', '+48'],
    info: {
      country: 'Poland',
      countryCode: 'PL',
      flag: '🇵🇱',
      region: 'Central Europe',
      timezone: 'Europe/Warsaw',
      timezoneLabel: 'CET (UTC+1)',
      mapCoords: { x: 54, y: 28 },
      coordinates: [19.1451, 51.9194],
    },
  },
  {
    keywords: ['sweden', 'stockholm', 'gothenburg', '+46'],
    info: {
      country: 'Sweden',
      countryCode: 'SE',
      flag: '🇸🇪',
      region: 'Northern Europe',
      timezone: 'Europe/Stockholm',
      timezoneLabel: 'CET (UTC+1)',
      mapCoords: { x: 53, y: 21 },
      coordinates: [18.6435, 60.1282],
    },
  },
  {
    keywords: ['switzerland', 'zurich', 'geneva', 'basel', '+41'],
    info: {
      country: 'Switzerland',
      countryCode: 'CH',
      flag: '🇨🇭',
      region: 'Central Europe',
      timezone: 'Europe/Zurich',
      timezoneLabel: 'CET (UTC+1)',
      mapCoords: { x: 50, y: 31 },
      coordinates: [8.2275, 46.8182],
    },
  },
  {
    keywords: ['qatar', 'doha', '+974'],
    info: {
      country: 'Qatar',
      countryCode: 'QA',
      flag: '🇶🇦',
      region: 'Middle East',
      timezone: 'Asia/Qatar',
      timezoneLabel: 'AST (UTC+3)',
      mapCoords: { x: 61, y: 45 },
      coordinates: [51.1839, 25.3548],
    },
  },
  {
    keywords: ['bahrain', 'manama', '+973'],
    info: {
      country: 'Bahrain',
      countryCode: 'BH',
      flag: '🇧🇭',
      region: 'Middle East',
      timezone: 'Asia/Bahrain',
      timezoneLabel: 'AST (UTC+3)',
      mapCoords: { x: 61, y: 44 },
      coordinates: [50.5577, 26.0667],
    },
  },
  {
    keywords: ['new zealand', 'auckland', 'wellington', 'christchurch', '+64'],
    info: {
      country: 'New Zealand',
      countryCode: 'NZ',
      flag: '🇳🇿',
      region: 'Oceania',
      timezone: 'Pacific/Auckland',
      timezoneLabel: 'NZST (UTC+12)',
      mapCoords: { x: 92, y: 83 },
      coordinates: [174.8860, -40.9006],
    },
  },
  {
    keywords: ['kuwait', 'kuwait city', '+965'],
    info: {
      country: 'Kuwait',
      countryCode: 'KW',
      flag: '🇰🇼',
      region: 'Middle East',
      timezone: 'Asia/Kuwait',
      timezoneLabel: 'AST (UTC+3)',
      mapCoords: { x: 60, y: 43 },
      coordinates: [47.4818, 29.3117],
    },
  },
  {
    keywords: ['oman', 'muscat', '+968'],
    info: {
      country: 'Oman',
      countryCode: 'OM',
      flag: '🇴🇲',
      region: 'Middle East',
      timezone: 'Asia/Muscat',
      timezoneLabel: 'GST (UTC+4)',
      mapCoords: { x: 63, y: 47 },
      coordinates: [57.5589, 21.4735],
    },
  },
  {
    keywords: ['south korea', 'korea', 'seoul', 'busan', 'kst', '+82'],
    info: {
      country: 'South Korea',
      countryCode: 'KR',
      flag: '🇰🇷',
      region: 'East Asia',
      timezone: 'Asia/Seoul',
      timezoneLabel: 'KST (UTC+9)',
      mapCoords: { x: 82, y: 39 },
      coordinates: [127.7669, 35.9078],
    },
  },
  {
    keywords: ['norway', 'oslo', 'bergen', '+47'],
    info: {
      country: 'Norway',
      countryCode: 'NO',
      flag: '🇳🇴',
      region: 'Northern Europe',
      timezone: 'Europe/Oslo',
      timezoneLabel: 'CET (UTC+1)',
      mapCoords: { x: 50, y: 20 },
      coordinates: [8.4689, 60.4720],
    },
  },
  {
    keywords: ['denmark', 'copenhagen', '+45'],
    info: {
      country: 'Denmark',
      countryCode: 'DK',
      flag: '🇩🇰',
      region: 'Northern Europe',
      timezone: 'Europe/Copenhagen',
      timezoneLabel: 'CET (UTC+1)',
      mapCoords: { x: 51, y: 26 },
      coordinates: [9.5018, 56.2639],
    },
  },
  {
    keywords: ['sri lanka', 'colombo', '+94'],
    info: {
      country: 'Sri Lanka',
      countryCode: 'LK',
      flag: '🇱🇰',
      region: 'South Asia',
      timezone: 'Asia/Colombo',
      timezoneLabel: 'IST (UTC+5:30)',
      mapCoords: { x: 71, y: 55 },
      coordinates: [80.7718, 7.8731],
    },
  },
];

export const AVAILABLE_COUNTRIES = COUNTRY_DATABASE.map(c => ({
  name: c.info.country,
  code: c.info.countryCode,
  flag: c.info.flag,
  region: c.info.region,
  timezone: c.info.timezone,
  timezoneLabel: c.info.timezoneLabel,
})).sort((a, b) => a.name.localeCompare(b.name));

const DEFAULT_LOCATION: GeoLocationInfo = {
  country: 'Global / Remote',
  countryCode: 'GL',
  flag: '🌐',
  region: 'Global',
  timezone: 'UTC',
  timezoneLabel: 'UTC (UTC+0)',
  mapCoords: { x: 50, y: 40 },
  coordinates: [0, 20],
};

/**
 * Detect candidate country and location metadata from candidate data
 */
export function detectCandidateGeo(candidate: {
  country?: string;
  location?: string;
  phone?: string;
  originalAvailability?: string;
  notes?: string;
  timezone?: string;
  timezoneLabel?: string;
  localTimezone?: string;
}): GeoLocationInfo {
  const explicitTz = candidate.timezone || candidate.localTimezone;

  // 1. First priority: candidate.country explicitly selected or set
  if (candidate.country && candidate.country.trim()) {
    const target = candidate.country.trim().toLowerCase();
    const matched = COUNTRY_DATABASE.find(
      (entry) =>
        entry.info.country.toLowerCase() === target ||
        entry.info.countryCode.toLowerCase() === target ||
        entry.keywords.some((k) => k.toLowerCase() === target)
    );
    if (matched) {
      const extractedCity =
        candidate.location && candidate.location !== 'Remote' && candidate.location.toLowerCase() !== target
          ? candidate.location
          : undefined;
      return {
        ...matched.info,
        city: extractedCity,
        ...(explicitTz
          ? {
              timezone: explicitTz,
              timezoneLabel: candidate.timezoneLabel || `${explicitTz.split('/').pop()?.replace(/_/g, ' ')}`,
            }
          : {}),
      };
    }
  }

  const combinedText = `
    ${candidate.location || ''} 
    ${candidate.phone || ''} 
    ${candidate.originalAvailability || ''} 
    ${candidate.notes || ''}
  `.toLowerCase();

  for (const entry of COUNTRY_DATABASE) {
    for (const keyword of entry.keywords) {
      if (combinedText.includes(keyword)) {
        // Check if city can be extracted
        const extractedCity = candidate.location && candidate.location !== 'Remote' ? candidate.location : undefined;
        return {
          ...entry.info,
          city: extractedCity,
          ...(explicitTz
            ? {
                timezone: explicitTz,
                timezoneLabel: candidate.timezoneLabel || `${explicitTz.split('/').pop()?.replace(/_/g, ' ')}`,
              }
            : {}),
        };
      }
    }
  }

  // Fallback to Pakistan if common Pakistani phone or name hints match
  if (candidate.phone?.startsWith('+92') || candidate.phone?.startsWith('03')) {
    return {
      ...COUNTRY_DATABASE[0].info,
      ...(explicitTz
        ? {
            timezone: explicitTz,
            timezoneLabel: candidate.timezoneLabel || `${explicitTz.split('/').pop()?.replace(/_/g, ' ')}`,
          }
        : {}),
    };
  }

  return {
    ...DEFAULT_LOCATION,
    city: candidate.location || 'Remote',
    ...(explicitTz
      ? {
          timezone: explicitTz,
          timezoneLabel: candidate.timezoneLabel || `${explicitTz.split('/').pop()?.replace(/_/g, ' ')}`,
        }
      : {}),
  };
}

/**
 * Formats current local time in candidate's timezone
 */
export function getCandidateCurrentLocalTime(timezone: string): string {
  try {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Calculates hours difference with Pakistan Standard Time (UTC+5)
 */
export function getDiffFromPkt(timezone: string): string {
  try {
    const now = new Date();
    const pktString = now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
    const localString = now.toLocaleString('en-US', { timeZone: timezone });
    const pktDate = new Date(pktString);
    const localDate = new Date(localString);
    const diffHours = Math.round((localDate.getTime() - pktDate.getTime()) / (1000 * 60 * 60));

    if (diffHours === 0) return 'Same as PKT';
    if (diffHours > 0) return `+${diffHours}h ahead of PKT`;
    return `${diffHours}h behind PKT`;
  } catch {
    return 'PKT difference N/A';
  }
}

/**
 * Maps a candidate status to the 3-Way categorization requested:
 * "appointed", "pending", "rejected"
 */
export type ThreeWayCategory = 'appointed' | 'pending' | 'rejected';

export function getThreeWayCategory(status: string): ThreeWayCategory {
  switch (status) {
    case 'Scheduled':
    case 'Rescheduled':
    case 'Interviewed':
    case 'Selected':
      return 'appointed';
    case 'Rejected':
      return 'rejected';
    case 'Pending':
    default:
      return 'pending';
  }
}

export function getAvatarGradient(name: string): string {
  const gradients = [
    'from-amber-600 to-orange-600 text-white',
    'from-rose-600 to-pink-600 text-white',
    'from-blue-600 to-indigo-600 text-white',
    'from-emerald-600 to-teal-600 text-white',
    'from-violet-600 to-purple-600 text-white',
    'from-stone-700 to-amber-800 text-amber-100',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash += name.charCodeAt(i);
  return gradients[Math.abs(hash) % gradients.length];
}

export function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

