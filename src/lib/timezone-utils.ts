// Universal Timezone Management Utility
// Provides complete worldwide timezone coverage (all IANA timezones & UTC offsets)

export interface WorldTimezoneInfo {
  tz: string; // IANA identifier, e.g. "America/New_York"
  label: string; // Friendly label, e.g. "New York, USA (EST/EDT)"
  city: string; // Primary city name
  country: string; // Country name
  region: 'Americas' | 'Europe' | 'Asia' | 'Middle East' | 'Africa' | 'Oceania' | 'Pacific' | 'UTC';
  flag: string; // Flag emoji
  abbr?: string; // Common abbreviation, e.g. "EST", "PST", "GMT", "PKT"
  utcOffsetStr: string; // e.g. "UTC-05:00", "UTC+05:00"
  utcOffsetMinutes: number; // e.g. -300, 300
}

// Complete curated worldwide timezone registry with all major cities, financial hubs & population centers
export const CURATED_TIMEZONES: WorldTimezoneInfo[] = [
  // UTC
  { tz: 'UTC', label: 'Coordinated Universal Time (UTC)', city: 'UTC', country: 'Global', region: 'UTC', flag: '🌐', abbr: 'UTC', utcOffsetStr: 'UTC+00:00', utcOffsetMinutes: 0 },

  // South Asia
  { tz: 'Asia/Karachi', label: 'Karachi / Islamabad / Lahore, Pakistan (PKT)', city: 'Karachi', country: 'Pakistan', region: 'Asia', flag: '🇵🇰', abbr: 'PKT', utcOffsetStr: 'UTC+05:00', utcOffsetMinutes: 300 },
  { tz: 'Asia/Kolkata', label: 'New Delhi / Mumbai / Bangalore, India (IST)', city: 'New Delhi', country: 'India', region: 'Asia', flag: '🇮🇳', abbr: 'IST', utcOffsetStr: 'UTC+05:30', utcOffsetMinutes: 330 },
  { tz: 'Asia/Dhaka', label: 'Dhaka, Bangladesh (BST)', city: 'Dhaka', country: 'Bangladesh', region: 'Asia', flag: '🇧🇩', abbr: 'BST', utcOffsetStr: 'UTC+06:00', utcOffsetMinutes: 360 },
  { tz: 'Asia/Colombo', label: 'Colombo, Sri Lanka (IST)', city: 'Colombo', country: 'Sri Lanka', region: 'Asia', flag: '🇱🇰', abbr: 'IST', utcOffsetStr: 'UTC+05:30', utcOffsetMinutes: 330 },
  { tz: 'Asia/Kathmandu', label: 'Kathmandu, Nepal (NPT)', city: 'Kathmandu', country: 'Nepal', region: 'Asia', flag: '🇳🇵', abbr: 'NPT', utcOffsetStr: 'UTC+05:45', utcOffsetMinutes: 345 },
  { tz: 'Asia/Kabul', label: 'Kabul, Afghanistan (AFT)', city: 'Kabul', country: 'Afghanistan', region: 'Asia', flag: '🇦🇫', abbr: 'AFT', utcOffsetStr: 'UTC+04:30', utcOffsetMinutes: 270 },

  // Middle East & Gulf
  { tz: 'Asia/Dubai', label: 'Dubai / Abu Dhabi, UAE (GST)', city: 'Dubai', country: 'United Arab Emirates', region: 'Middle East', flag: '🇦🇪', abbr: 'GST', utcOffsetStr: 'UTC+04:00', utcOffsetMinutes: 240 },
  { tz: 'Asia/Riyadh', label: 'Riyadh / Jeddah, Saudi Arabia (AST)', city: 'Riyadh', country: 'Saudi Arabia', region: 'Middle East', flag: '🇸🇦', abbr: 'AST', utcOffsetStr: 'UTC+03:00', utcOffsetMinutes: 180 },
  { tz: 'Asia/Qatar', label: 'Doha, Qatar (AST)', city: 'Doha', country: 'Qatar', region: 'Middle East', flag: '🇶🇦', abbr: 'AST', utcOffsetStr: 'UTC+03:00', utcOffsetMinutes: 180 },
  { tz: 'Asia/Bahrain', label: 'Manama, Bahrain (AST)', city: 'Manama', country: 'Bahrain', region: 'Middle East', flag: '🇧🇭', abbr: 'AST', utcOffsetStr: 'UTC+03:00', utcOffsetMinutes: 180 },
  { tz: 'Asia/Kuwait', label: 'Kuwait City, Kuwait (AST)', city: 'Kuwait City', country: 'Kuwait', region: 'Middle East', flag: '🇰🇼', abbr: 'AST', utcOffsetStr: 'UTC+03:00', utcOffsetMinutes: 180 },
  { tz: 'Asia/Muscat', label: 'Muscat, Oman (GST)', city: 'Muscat', country: 'Oman', region: 'Middle East', flag: '🇴🇲', abbr: 'GST', utcOffsetStr: 'UTC+04:00', utcOffsetMinutes: 240 },
  { tz: 'Europe/Istanbul', label: 'Istanbul / Ankara, Turkey (TRT)', city: 'Istanbul', country: 'Turkey', region: 'Middle East', flag: '🇹🇷', abbr: 'TRT', utcOffsetStr: 'UTC+03:00', utcOffsetMinutes: 180 },
  { tz: 'Asia/Jerusalem', label: 'Jerusalem / Tel Aviv, Israel (IST)', city: 'Jerusalem', country: 'Israel', region: 'Middle East', flag: '🇮🇱', abbr: 'IST', utcOffsetStr: 'UTC+02:00', utcOffsetMinutes: 120 },
  { tz: 'Asia/Amman', label: 'Amman, Jordan (EEST)', city: 'Amman', country: 'Jordan', region: 'Middle East', flag: '🇯🇴', abbr: 'EEST', utcOffsetStr: 'UTC+03:00', utcOffsetMinutes: 180 },
  { tz: 'Asia/Beirut', label: 'Beirut, Lebanon (EEST)', city: 'Beirut', country: 'Lebanon', region: 'Middle East', flag: '🇱🇧', abbr: 'EEST', utcOffsetStr: 'UTC+03:00', utcOffsetMinutes: 180 },
  { tz: 'Asia/Tehran', label: 'Tehran, Iran (IRST)', city: 'Tehran', country: 'Iran', region: 'Middle East', flag: '🇮🇷', abbr: 'IRST', utcOffsetStr: 'UTC+03:30', utcOffsetMinutes: 210 },

  // East & Southeast Asia
  { tz: 'Asia/Singapore', label: 'Singapore (SGT)', city: 'Singapore', country: 'Singapore', region: 'Asia', flag: '🇸🇬', abbr: 'SGT', utcOffsetStr: 'UTC+08:00', utcOffsetMinutes: 480 },
  { tz: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur, Malaysia (MYT)', city: 'Kuala Lumpur', country: 'Malaysia', region: 'Asia', flag: '🇲🇾', abbr: 'MYT', utcOffsetStr: 'UTC+08:00', utcOffsetMinutes: 480 },
  { tz: 'Asia/Jakarta', label: 'Jakarta, Indonesia (WIB)', city: 'Jakarta', country: 'Indonesia', region: 'Asia', flag: '🇮🇩', abbr: 'WIB', utcOffsetStr: 'UTC+07:00', utcOffsetMinutes: 420 },
  { tz: 'Asia/Manila', label: 'Manila, Philippines (PHT)', city: 'Manila', country: 'Philippines', region: 'Asia', flag: '🇵🇭', abbr: 'PHT', utcOffsetStr: 'UTC+08:00', utcOffsetMinutes: 480 },
  { tz: 'Asia/Bangkok', label: 'Bangkok, Thailand (ICT)', city: 'Bangkok', country: 'Thailand', region: 'Asia', flag: '🇹🇭', abbr: 'ICT', utcOffsetStr: 'UTC+07:00', utcOffsetMinutes: 420 },
  { tz: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh / Hanoi, Vietnam (ICT)', city: 'Ho Chi Minh', country: 'Vietnam', region: 'Asia', flag: '🇻🇳', abbr: 'ICT', utcOffsetStr: 'UTC+07:00', utcOffsetMinutes: 420 },
  { tz: 'Asia/Shanghai', label: 'Beijing / Shanghai, China (CST)', city: 'Shanghai', country: 'China', region: 'Asia', flag: '🇨🇳', abbr: 'CST', utcOffsetStr: 'UTC+08:00', utcOffsetMinutes: 480 },
  { tz: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', city: 'Hong Kong', country: 'Hong Kong', region: 'Asia', flag: '🇭🇰', abbr: 'HKT', utcOffsetStr: 'UTC+08:00', utcOffsetMinutes: 480 },
  { tz: 'Asia/Taipei', label: 'Taipei, Taiwan (CST)', city: 'Taipei', country: 'Taiwan', region: 'Asia', flag: '🇹🇼', abbr: 'CST', utcOffsetStr: 'UTC+08:00', utcOffsetMinutes: 480 },
  { tz: 'Asia/Tokyo', label: 'Tokyo, Japan (JST)', city: 'Tokyo', country: 'Japan', region: 'Asia', flag: '🇯🇵', abbr: 'JST', utcOffsetStr: 'UTC+09:00', utcOffsetMinutes: 540 },
  { tz: 'Asia/Seoul', label: 'Seoul, South Korea (KST)', city: 'Seoul', country: 'South Korea', region: 'Asia', flag: '🇰🇷', abbr: 'KST', utcOffsetStr: 'UTC+09:00', utcOffsetMinutes: 540 },
  { tz: 'Asia/Almaty', label: 'Almaty, Kazakhstan (ALMT)', city: 'Almaty', country: 'Kazakhstan', region: 'Asia', flag: '🇰🇿', abbr: 'ALMT', utcOffsetStr: 'UTC+05:00', utcOffsetMinutes: 300 },
  { tz: 'Asia/Tashkent', label: 'Tashkent, Uzbekistan (UZT)', city: 'Tashkent', country: 'Uzbekistan', region: 'Asia', flag: '🇺🇿', abbr: 'UZT', utcOffsetStr: 'UTC+05:00', utcOffsetMinutes: 300 },

  // Europe
  { tz: 'Europe/London', label: 'London / Edinburgh, UK (GMT/BST)', city: 'London', country: 'United Kingdom', region: 'Europe', flag: '🇬🇧', abbr: 'GMT', utcOffsetStr: 'UTC+00:00', utcOffsetMinutes: 0 },
  { tz: 'Europe/Dublin', label: 'Dublin, Ireland (IST/GMT)', city: 'Dublin', country: 'Ireland', region: 'Europe', flag: '🇮🇪', abbr: 'IST', utcOffsetStr: 'UTC+00:00', utcOffsetMinutes: 0 },
  { tz: 'Europe/Berlin', label: 'Berlin / Frankfurt / Munich, Germany (CET/CEST)', city: 'Berlin', country: 'Germany', region: 'Europe', flag: '🇩🇪', abbr: 'CET', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Europe/Paris', label: 'Paris, France (CET/CEST)', city: 'Paris', country: 'France', region: 'Europe', flag: '🇫🇷', abbr: 'CET', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Europe/Amsterdam', label: 'Amsterdam, Netherlands (CET/CEST)', city: 'Amsterdam', country: 'Netherlands', region: 'Europe', flag: '🇳🇱', abbr: 'CET', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Europe/Brussels', label: 'Brussels, Belgium (CET/CEST)', city: 'Brussels', country: 'Belgium', region: 'Europe', flag: '🇧🇪', abbr: 'CET', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Europe/Madrid', label: 'Madrid / Barcelona, Spain (CET/CEST)', city: 'Madrid', country: 'Spain', region: 'Europe', flag: '🇪🇸', abbr: 'CET', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Europe/Rome', label: 'Rome / Milan, Italy (CET/CEST)', city: 'Rome', country: 'Italy', region: 'Europe', flag: '🇮🇹', abbr: 'CET', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Europe/Lisbon', label: 'Lisbon, Portugal (WET/WEST)', city: 'Lisbon', country: 'Portugal', region: 'Europe', flag: '🇵🇹', abbr: 'WET', utcOffsetStr: 'UTC+00:00', utcOffsetMinutes: 0 },
  { tz: 'Europe/Zurich', label: 'Zurich / Geneva, Switzerland (CET/CEST)', city: 'Zurich', country: 'Switzerland', region: 'Europe', flag: '🇨🇭', abbr: 'CET', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Europe/Vienna', label: 'Vienna, Austria (CET/CEST)', city: 'Vienna', country: 'Austria', region: 'Europe', flag: '🇦🇹', abbr: 'CET', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Europe/Stockholm', label: 'Stockholm, Sweden (CET/CEST)', city: 'Stockholm', country: 'Sweden', region: 'Europe', flag: '🇸🇪', abbr: 'CET', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Europe/Oslo', label: 'Oslo, Norway (CET/CEST)', city: 'Oslo', country: 'Norway', region: 'Europe', flag: '🇳🇴', abbr: 'CET', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Europe/Copenhagen', label: 'Copenhagen, Denmark (CET/CEST)', city: 'Copenhagen', country: 'Denmark', region: 'Europe', flag: '🇩🇰', abbr: 'CET', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Europe/Helsinki', label: 'Helsinki, Finland (EET/EEST)', city: 'Helsinki', country: 'Finland', region: 'Europe', flag: '🇫🇮', abbr: 'EET', utcOffsetStr: 'UTC+02:00', utcOffsetMinutes: 120 },
  { tz: 'Europe/Warsaw', label: 'Warsaw / Krakow, Poland (CET/CEST)', city: 'Warsaw', country: 'Poland', region: 'Europe', flag: '🇵🇱', abbr: 'CET', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Europe/Prague', label: 'Prague, Czech Republic (CET/CEST)', city: 'Prague', country: 'Czech Republic', region: 'Europe', flag: '🇨🇿', abbr: 'CET', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Europe/Budapest', label: 'Budapest, Hungary (CET/CEST)', city: 'Budapest', country: 'Hungary', region: 'Europe', flag: '🇭🇺', abbr: 'CET', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Europe/Bucharest', label: 'Bucharest, Romania (EET/EEST)', city: 'Bucharest', country: 'Romania', region: 'Europe', flag: '🇷🇴', abbr: 'EET', utcOffsetStr: 'UTC+02:00', utcOffsetMinutes: 120 },
  { tz: 'Europe/Athens', label: 'Athens, Greece (EET/EEST)', city: 'Athens', country: 'Greece', region: 'Europe', flag: '🇬🇷', abbr: 'EET', utcOffsetStr: 'UTC+02:00', utcOffsetMinutes: 120 },
  { tz: 'Europe/Kyiv', label: 'Kyiv, Ukraine (EET/EEST)', city: 'Kyiv', country: 'Ukraine', region: 'Europe', flag: '🇺🇦', abbr: 'EET', utcOffsetStr: 'UTC+02:00', utcOffsetMinutes: 120 },

  // North America (US, Canada, Mexico)
  { tz: 'America/New_York', label: 'US Eastern: New York, Boston, Miami, Atlanta (EST/EDT)', city: 'New York', country: 'United States', region: 'Americas', flag: '🇺🇸', abbr: 'EST', utcOffsetStr: 'UTC-05:00', utcOffsetMinutes: -300 },
  { tz: 'America/Chicago', label: 'US Central: Chicago, Dallas, Houston, Austin (CST/CDT)', city: 'Chicago', country: 'United States', region: 'Americas', flag: '🇺🇸', abbr: 'CST', utcOffsetStr: 'UTC-06:00', utcOffsetMinutes: -360 },
  { tz: 'America/Denver', label: 'US Mountain: Denver, Salt Lake City, Phoenix (MST/MDT)', city: 'Denver', country: 'United States', region: 'Americas', flag: '🇺🇸', abbr: 'MST', utcOffsetStr: 'UTC-07:00', utcOffsetMinutes: -420 },
  { tz: 'America/Los_Angeles', label: 'US Pacific: San Francisco, Los Angeles, Seattle (PST/PDT)', city: 'Los Angeles', country: 'United States', region: 'Americas', flag: '🇺🇸', abbr: 'PST', utcOffsetStr: 'UTC-08:00', utcOffsetMinutes: -480 },
  { tz: 'America/Anchorage', label: 'US Alaska: Anchorage (AKST/AKDT)', city: 'Anchorage', country: 'United States', region: 'Americas', flag: '🇺🇸', abbr: 'AKST', utcOffsetStr: 'UTC-09:00', utcOffsetMinutes: -540 },
  { tz: 'Pacific/Honolulu', label: 'US Hawaii: Honolulu (HST)', city: 'Honolulu', country: 'United States', region: 'Pacific', flag: '🇺🇸', abbr: 'HST', utcOffsetStr: 'UTC-10:00', utcOffsetMinutes: -600 },
  { tz: 'America/Toronto', label: 'Canada Eastern: Toronto, Montreal, Ottawa (EST/EDT)', city: 'Toronto', country: 'Canada', region: 'Americas', flag: '🇨🇦', abbr: 'EST', utcOffsetStr: 'UTC-05:00', utcOffsetMinutes: -300 },
  { tz: 'America/Vancouver', label: 'Canada Pacific: Vancouver, Victoria (PST/PDT)', city: 'Vancouver', country: 'Canada', region: 'Americas', flag: '🇨🇦', abbr: 'PST', utcOffsetStr: 'UTC-08:00', utcOffsetMinutes: -480 },
  { tz: 'America/Edmonton', label: 'Canada Mountain: Calgary, Edmonton (MST/MDT)', city: 'Calgary', country: 'Canada', region: 'Americas', flag: '🇨🇦', abbr: 'MST', utcOffsetStr: 'UTC-07:00', utcOffsetMinutes: -420 },
  { tz: 'America/Winnipeg', label: 'Canada Central: Winnipeg (CST/CDT)', city: 'Winnipeg', country: 'Canada', region: 'Americas', flag: '🇨🇦', abbr: 'CST', utcOffsetStr: 'UTC-06:00', utcOffsetMinutes: -360 },
  { tz: 'America/Halifax', label: 'Canada Atlantic: Halifax (AST/ADT)', city: 'Halifax', country: 'Canada', region: 'Americas', flag: '🇨🇦', abbr: 'AST', utcOffsetStr: 'UTC-04:00', utcOffsetMinutes: -240 },
  { tz: 'America/Mexico_City', label: 'Mexico City / Guadalajara, Mexico (CST)', city: 'Mexico City', country: 'Mexico', region: 'Americas', flag: '🇲🇽', abbr: 'CST', utcOffsetStr: 'UTC-06:00', utcOffsetMinutes: -360 },

  // South America
  { tz: 'America/Sao_Paulo', label: 'Sao Paulo / Rio de Janeiro, Brazil (BRT)', city: 'Sao Paulo', country: 'Brazil', region: 'Americas', flag: '🇧🇷', abbr: 'BRT', utcOffsetStr: 'UTC-03:00', utcOffsetMinutes: -180 },
  { tz: 'America/Buenos_Aires', label: 'Buenos Aires, Argentina (ART)', city: 'Buenos Aires', country: 'Argentina', region: 'Americas', flag: '🇦🇷', abbr: 'ART', utcOffsetStr: 'UTC-03:00', utcOffsetMinutes: -180 },
  { tz: 'America/Bogota', label: 'Bogota, Colombia (COT)', city: 'Bogota', country: 'Colombia', region: 'Americas', flag: '🇨🇴', abbr: 'COT', utcOffsetStr: 'UTC-05:00', utcOffsetMinutes: -300 },
  { tz: 'America/Lima', label: 'Lima, Peru (PET)', city: 'Lima', country: 'Peru', region: 'Americas', flag: '🇵🇪', abbr: 'PET', utcOffsetStr: 'UTC-05:00', utcOffsetMinutes: -300 },
  { tz: 'America/Santiago', label: 'Santiago, Chile (CLT)', city: 'Santiago', country: 'Chile', region: 'Americas', flag: '🇨🇱', abbr: 'CLT', utcOffsetStr: 'UTC-04:00', utcOffsetMinutes: -240 },

  // Africa
  { tz: 'Africa/Johannesburg', label: 'Johannesburg / Cape Town, South Africa (SAST)', city: 'Johannesburg', country: 'South Africa', region: 'Africa', flag: '🇿🇦', abbr: 'SAST', utcOffsetStr: 'UTC+02:00', utcOffsetMinutes: 120 },
  { tz: 'Africa/Cairo', label: 'Cairo, Egypt (EET)', city: 'Cairo', country: 'Egypt', region: 'Africa', flag: '🇪🇬', abbr: 'EET', utcOffsetStr: 'UTC+02:00', utcOffsetMinutes: 120 },
  { tz: 'Africa/Lagos', label: 'Lagos / Abuja, Nigeria (WAT)', city: 'Lagos', country: 'Nigeria', region: 'Africa', flag: '🇳🇬', abbr: 'WAT', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Africa/Nairobi', label: 'Nairobi, Kenya (EAT)', city: 'Nairobi', country: 'Kenya', region: 'Africa', flag: '🇰🇪', abbr: 'EAT', utcOffsetStr: 'UTC+03:00', utcOffsetMinutes: 180 },
  { tz: 'Africa/Accra', label: 'Accra, Ghana (GMT)', city: 'Accra', country: 'Ghana', region: 'Africa', flag: '🇬🇭', abbr: 'GMT', utcOffsetStr: 'UTC+00:00', utcOffsetMinutes: 0 },
  { tz: 'Africa/Casablanca', label: 'Casablanca, Morocco (WET)', city: 'Casablanca', country: 'Morocco', region: 'Africa', flag: '🇲🇦', abbr: 'WET', utcOffsetStr: 'UTC+01:00', utcOffsetMinutes: 60 },
  { tz: 'Africa/Addis_Ababa', label: 'Addis Ababa, Ethiopia (EAT)', city: 'Addis Ababa', country: 'Ethiopia', region: 'Africa', flag: '🇪🇹', abbr: 'EAT', utcOffsetStr: 'UTC+03:00', utcOffsetMinutes: 180 },

  // Oceania & Pacific
  { tz: 'Australia/Sydney', label: 'Sydney / Melbourne, Australia (AEST/AEDT)', city: 'Sydney', country: 'Australia', region: 'Oceania', flag: '🇦🇺', abbr: 'AEST', utcOffsetStr: 'UTC+10:00', utcOffsetMinutes: 600 },
  { tz: 'Australia/Brisbane', label: 'Brisbane, Australia (AEST)', city: 'Brisbane', country: 'Australia', region: 'Oceania', flag: '🇦🇺', abbr: 'AEST', utcOffsetStr: 'UTC+10:00', utcOffsetMinutes: 600 },
  { tz: 'Australia/Adelaide', label: 'Adelaide, Australia (ACST/ACDT)', city: 'Adelaide', country: 'Australia', region: 'Oceania', flag: '🇦🇺', abbr: 'ACST', utcOffsetStr: 'UTC+09:30', utcOffsetMinutes: 570 },
  { tz: 'Australia/Perth', label: 'Perth, Australia (AWST)', city: 'Perth', country: 'Australia', region: 'Oceania', flag: '🇦🇺', abbr: 'AWST', utcOffsetStr: 'UTC+08:00', utcOffsetMinutes: 480 },
  { tz: 'Pacific/Auckland', label: 'Auckland / Wellington, New Zealand (NZST/NZDT)', city: 'Auckland', country: 'New Zealand', region: 'Oceania', flag: '🇳🇿', abbr: 'NZST', utcOffsetStr: 'UTC+12:00', utcOffsetMinutes: 720 },
  { tz: 'Pacific/Fiji', label: 'Suva, Fiji (FJT)', city: 'Suva', country: 'Fiji', region: 'Pacific', flag: '🇫🇯', abbr: 'FJT', utcOffsetStr: 'UTC+12:00', utcOffsetMinutes: 720 },
];

/**
 * Returns complete list of all supported IANA timezones merged with our curated metadata.
 */
export function getAllSupportedTimezones(): WorldTimezoneInfo[] {
  // Try to query Intl.supportedValuesOf if available
  let allIana: string[] = [];
  try {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      allIana = (Intl as any).supportedValuesOf('timeZone');
    }
  } catch {
    allIana = [];
  }

  const existingMap = new Map<string, WorldTimezoneInfo>();
  CURATED_TIMEZONES.forEach((tz) => existingMap.set(tz.tz, tz));

  // Add any extra browser IANA timezones not in curated list
  for (const tzName of allIana) {
    if (!existingMap.has(tzName)) {
      const parts = tzName.split('/');
      const city = parts[parts.length - 1].replace(/_/g, ' ');
      const regionPrefix = parts[0];
      let region: WorldTimezoneInfo['region'] = 'UTC';
      let flag = '🌐';

      if (regionPrefix === 'America') {
        region = 'Americas';
        flag = '🌎';
      } else if (regionPrefix === 'Europe') {
        region = 'Europe';
        flag = '🌍';
      } else if (regionPrefix === 'Asia') {
        region = 'Asia';
        flag = '🌏';
      } else if (regionPrefix === 'Africa') {
        region = 'Africa';
        flag = '🌍';
      } else if (regionPrefix === 'Australia' || regionPrefix === 'Pacific') {
        region = 'Oceania';
        flag = '🌏';
      }

      existingMap.set(tzName, {
        tz: tzName,
        label: `${city} (${tzName})`,
        city,
        country: regionPrefix,
        region,
        flag,
        utcOffsetStr: getLiveTzOffsetString(tzName),
        utcOffsetMinutes: getLiveTzOffsetMinutes(tzName),
      });
    }
  }

  return Array.from(existingMap.values());
}

/**
 * Calculates current UTC offset string for any IANA timezone (e.g. "UTC+05:00" or "UTC-04:00")
 */
export function getLiveTzOffsetString(timezone: string): string {
  try {
    const now = new Date();
    const tzString = now.toLocaleString('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' });
    const match = tzString.match(/GMT([+-]\d+(:?\d+)?)/);
    if (match) {
      return match[1].startsWith('+') || match[1].startsWith('-') ? `UTC${match[1]}` : `UTC+${match[1]}`;
    }
    // Calculate via diff
    const offsetMin = getLiveTzOffsetMinutes(timezone);
    const sign = offsetMin >= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMin);
    const h = String(Math.floor(absMin / 60)).padStart(2, '0');
    const m = String(absMin % 60).padStart(2, '0');
    return `UTC${sign}${h}:${m}`;
  } catch {
    return 'UTC+00:00';
  }
}

/**
 * Calculates current UTC offset in minutes for any IANA timezone
 */
export function getLiveTzOffsetMinutes(timezone: string): number {
  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
  } catch {
    return 0;
  }
}

/**
 * Gets abbreviation for timezone (e.g. "PKT", "EDT", "BST")
 */
export function getTzAbbreviation(timezone: string, date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart ? tzPart.value : getLiveTzOffsetString(timezone);
  } catch {
    return timezone;
  }
}

/**
 * Formats a given ISO date/time string in candidate's specified timezone
 */
export function formatInTimezone(
  isoString: string,
  timezone: string,
  options?: { includeDate?: boolean; includeAbbr?: boolean }
): string {
  if (!isoString) return 'Unscheduled';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Invalid date';

    const timeStr = d.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (options?.includeDate === false) {
      return options.includeAbbr ? `${timeStr} ${getTzAbbreviation(timezone, d)}` : timeStr;
    }

    const dateStr = d.toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const abbr = options?.includeAbbr !== false ? ` (${getTzAbbreviation(timezone, d)})` : '';
    return `${dateStr} at ${timeStr}${abbr}`;
  } catch {
    return isoString;
  }
}

/**
 * Checks if a given time slot falls into candidate's business hours, daytime, or off-hours/sleep
 */
export function evaluateCandidateWorkingHours(
  isoString: string,
  timezone: string
): {
  status: 'business' | 'evening' | 'morning' | 'night';
  isWorkingHours: boolean;
  isSleepingHours: boolean;
  localHour: number;
  localTimeDisplay: string;
  badgeText: string;
  badgeColor: string;
  warning?: string;
} {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return {
        status: 'business',
        isWorkingHours: true,
        isSleepingHours: false,
        localHour: 12,
        localTimeDisplay: '--:--',
        badgeText: 'Time Unknown',
        badgeColor: 'bg-stone-100 text-stone-700',
      };
    }

    // Get 24-hour in candidate's timezone
    const hourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).format(d);
    const hour = parseInt(hourStr === '24' ? '0' : hourStr, 10);

    const localTimeDisplay = d.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // 09:00 - 18:00 : Core Business Hours
    if (hour >= 9 && hour < 18) {
      return {
        status: 'business',
        isWorkingHours: true,
        isSleepingHours: false,
        localHour: hour,
        localTimeDisplay,
        badgeText: `☀️ Business Hours (${localTimeDisplay})`,
        badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      };
    }

    // 07:00 - 09:00 : Early Morning
    if (hour >= 7 && hour < 9) {
      return {
        status: 'morning',
        isWorkingHours: false,
        isSleepingHours: false,
        localHour: hour,
        localTimeDisplay,
        badgeText: `🌅 Early Morning (${localTimeDisplay})`,
        badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
        warning: `Candidate local time is early morning (${localTimeDisplay}). Confirm if they are available.`,
      };
    }

    // 18:00 - 21:00 : Evening
    if (hour >= 18 && hour < 21) {
      return {
        status: 'evening',
        isWorkingHours: false,
        isSleepingHours: false,
        localHour: hour,
        localTimeDisplay,
        badgeText: `🌆 Evening (${localTimeDisplay})`,
        badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
        warning: `Candidate local time is evening (${localTimeDisplay}).`,
      };
    }

    // 21:00 - 07:00 : Late Night / Sleeping Hours
    return {
      status: 'night',
      isWorkingHours: false,
      isSleepingHours: true,
      localHour: hour,
      localTimeDisplay,
      badgeText: `🌙 Late Night / Sleeping (${localTimeDisplay})`,
      badgeColor: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-bold animate-pulse',
      warning: `⚠️ Attention: This interview slot is ${localTimeDisplay} in the candidate's timezone. They may be asleep!`,
    };
  } catch {
    return {
      status: 'business',
      isWorkingHours: true,
      isSleepingHours: false,
      localHour: 12,
      localTimeDisplay: '--:--',
      badgeText: 'Normal Hours',
      badgeColor: 'bg-stone-100 text-stone-700',
    };
  }
}

/**
 * Calculates hours and minutes difference between candidate timezone and Pakistan Standard Time (PKT, UTC+5)
 */
export function getDiffFromPktDetailed(timezone: string): {
  diffHours: number;
  diffMinutes: number;
  diffText: string;
  isAhead: boolean;
  isBehind: boolean;
  isSame: boolean;
} {
  try {
    const pktOffset = 300; // Asia/Karachi is UTC+5 (300 minutes)
    const tzOffset = getLiveTzOffsetMinutes(timezone);
    const diffTotalMinutes = tzOffset - pktOffset;
    const diffHours = Math.floor(Math.abs(diffTotalMinutes) / 60);
    const diffMinutes = Math.abs(diffTotalMinutes) % 60;

    if (diffTotalMinutes === 0) {
      return {
        diffHours: 0,
        diffMinutes: 0,
        diffText: 'Same time as PKT',
        isAhead: false,
        isBehind: false,
        isSame: true,
      };
    }

    const minutePart = diffMinutes > 0 ? ` ${diffMinutes}m` : '';
    const hourPart = diffHours > 0 ? `${diffHours}h` : '';

    if (diffTotalMinutes > 0) {
      return {
        diffHours,
        diffMinutes,
        diffText: `+${hourPart}${minutePart} ahead of PKT`,
        isAhead: true,
        isBehind: false,
        isSame: false,
      };
    }

    return {
      diffHours,
      diffMinutes,
      diffText: `-${hourPart}${minutePart} behind PKT`,
      isAhead: false,
      isBehind: true,
      isSame: false,
    };
  } catch {
    return {
      diffHours: 0,
      diffMinutes: 0,
      diffText: 'PKT comparison unavailable',
      isAhead: false,
      isBehind: false,
      isSame: true,
    };
  }
}

/**
 * Accurately converts a local input string (YYYY-MM-DDTHH:mm) entered in a specific timezone into UTC ISO 8601 string.
 */
export function convertLocalInputInTzToIso(localInputVal: string, timezone: string): string | null {
  if (!localInputVal || localInputVal.length < 16) return null;
  try {
    const [datePart, timePart] = localInputVal.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);

    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) return null;

    // Initial UTC guess
    let utcGuess = Date.UTC(year, month - 1, day, hour, minute);

    // Iteratively adjust for timezone offset and daylight saving time (DST)
    for (let iter = 0; iter < 4; iter++) {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      });

      const parts = formatter.formatToParts(new Date(utcGuess));
      const p: Record<string, string> = {};
      parts.forEach((item) => {
        p[item.type] = item.value;
      });

      const tzHour = parseInt(p.hour === '24' ? '0' : p.hour, 10);
      const tzMin = parseInt(p.minute, 10);
      const tzDay = parseInt(p.day, 10);
      const tzMonth = parseInt(p.month, 10);
      const tzYear = parseInt(p.year, 10);

      const currentInTz = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin);
      const desired = Date.UTC(year, month - 1, day, hour, minute);
      const diff = desired - currentInTz;

      if (diff === 0) break;
      utcGuess += diff;
    }

    return new Date(utcGuess).toISOString();
  } catch {
    return null;
  }
}

/**
 * Converts a UTC ISO string into the local input format (YYYY-MM-DDTHH:mm) for a specific timezone
 */
export function convertIsoToLocalInputInTz(isoString: string, timezone: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const p: Record<string, string> = {};
    parts.forEach((item) => {
      p[item.type] = item.value;
    });

    const year = p.year;
    const month = p.month.padStart(2, '0');
    const day = p.day.padStart(2, '0');
    let hour = p.hour;
    if (hour === '24') hour = '00';
    hour = hour.padStart(2, '0');
    const minute = p.minute.padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch {
    return '';
  }
}

/**
 * Finds candidate's timezone metadata or returns fallback
 */
export function resolveCandidateTimezone(candidate: {
  timezone?: string;
  country?: string;
  location?: string;
}): WorldTimezoneInfo {
  const all = getAllSupportedTimezones();

  // 1. If explicit timezone given
  if (candidate.timezone) {
    const found = all.find(
      (t) => t.tz.toLowerCase() === candidate.timezone!.toLowerCase() || t.city.toLowerCase() === candidate.timezone!.toLowerCase()
    );
    if (found) return found;

    // Check if it's a valid IANA string
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: candidate.timezone });
      return {
        tz: candidate.timezone,
        label: `${candidate.timezone} (${getLiveTzOffsetString(candidate.timezone)})`,
        city: candidate.timezone.split('/').pop()?.replace(/_/g, ' ') || candidate.timezone,
        country: candidate.country || 'Global',
        region: 'UTC',
        flag: '🌐',
        utcOffsetStr: getLiveTzOffsetString(candidate.timezone),
        utcOffsetMinutes: getLiveTzOffsetMinutes(candidate.timezone),
      };
    } catch {
      // Fall through
    }
  }

  // 2. Match by country
  if (candidate.country) {
    const countryNorm = candidate.country.trim().toLowerCase();
    const match = all.find((t) => t.country.toLowerCase() === countryNorm || t.city.toLowerCase() === countryNorm);
    if (match) return match;
  }

  // 3. Default to Pakistan (Karachi)
  return CURATED_TIMEZONES[1]; // Asia/Karachi
}
