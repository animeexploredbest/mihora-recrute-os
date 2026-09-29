import { Candidate } from '../types';
import { resolveCandidateTimezone, WorldTimezoneInfo } from './timezone-utils';

export interface ParsedCandidateItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  location: string;
  timezone: string;
  timezoneLabel: string;
  position: string;
  originalAvailability: string;
  notes: string;
  resumeLink: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  assignedInterviewer?: string;
  isDuplicate?: boolean;
  status: Candidate['status'];
  validationErrors?: string[];
}

export interface ParseResult {
  candidates: ParsedCandidateItem[];
  detectedFormat: 'markdown' | 'json' | 'key-value' | 'csv' | 'unknown';
  duplicateCount: number;
  totalParsed: number;
  warnings: string[];
}

/**
 * Normalizes email address
 */
function cleanEmail(email: string, _fallbackName?: string): string {
  const clean = email.trim().toLowerCase();
  if (clean && clean.includes('@') && clean.includes('.')) {
    return clean;
  }
  return '';
}

/**
 * Normalizes phone numbers
 */
function cleanPhone(phone: string): string {
  return phone.trim();
}

/**
 * Cleans markdown table cell values
 */
function cleanCell(cell: string): string {
  return cell.trim().replace(/^`+|`+$/g, '').replace(/\\\|/g, '|');
}

/**
 * Parses Markdown Tables
 * Example:
 * | Name | Email | Phone | City | Country | Timezone | Position | Original Availability | Key Skills / Summary | LinkedIn | GitHub |
 */
export function parseMarkdownTable(rawText: string): ParsedCandidateItem[] {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const tableLines = lines.filter((l) => l.startsWith('|') && l.endsWith('|'));

  if (tableLines.length < 2) return [];

  // Parse header
  const headerCells = tableLines[0]
    .split('|')
    .slice(1, -1)
    .map((c) => cleanCell(c).toLowerCase());

  // Find column indexes
  const colIndex = {
    name: headerCells.findIndex((h) => h.includes('name')),
    email: headerCells.findIndex((h) => h.includes('email') || h.includes('mail')),
    phone: headerCells.findIndex((h) => h.includes('phone') || h.includes('contact') || h.includes('mobile')),
    city: headerCells.findIndex((h) => h.includes('city') || h.includes('state')),
    country: headerCells.findIndex((h) => h.includes('country')),
    location: headerCells.findIndex((h) => h.includes('location')),
    timezone: headerCells.findIndex((h) => h.includes('timezone') || h.includes('tz') || h.includes('time zone')),
    position: headerCells.findIndex((h) => h.includes('position') || h.includes('role') || h.includes('title')),
    availability: headerCells.findIndex((h) => h.includes('availab') || h.includes('timing') || h.includes('slot')),
    notes: headerCells.findIndex((h) => h.includes('skill') || h.includes('summary') || h.includes('note')),
    linkedin: headerCells.findIndex((h) => h.includes('linkedin') || h.includes('linked')),
    github: headerCells.findIndex((h) => h.includes('github') || h.includes('git')),
    interviewer: headerCells.findIndex((h) => h.includes('interviewer') || h.includes('assigned') || h.includes('evaluator') || h.includes('panel')),
  };

  // If no name column found, fallback to index 0
  if (colIndex.name === -1 && headerCells.length > 0) {
    colIndex.name = 0;
  }

  const results: ParsedCandidateItem[] = [];

  for (let i = 1; i < tableLines.length; i++) {
    const line = tableLines[i];
    // Skip separator lines e.g. |---|---|
    if (/^[|\s\-:]+$/.test(line)) continue;

    const cells = line.split('|').slice(1, -1).map(cleanCell);
    if (cells.length === 0) continue;

    const name = (colIndex.name !== -1 ? cells[colIndex.name] : cells[0]) || '';
    if (!name || name.toLowerCase().includes('name') || name.startsWith('---')) continue;

    const emailRaw = colIndex.email !== -1 ? cells[colIndex.email] : '';
    const phoneRaw = colIndex.phone !== -1 ? cells[colIndex.phone] : '';
    const city = colIndex.city !== -1 ? cells[colIndex.city] : '';
    const country = colIndex.country !== -1 ? cells[colIndex.country] : '';
    const locRaw = colIndex.location !== -1 ? cells[colIndex.location] : '';
    const tzRaw = colIndex.timezone !== -1 ? cells[colIndex.timezone] : '';
    const position = colIndex.position !== -1 ? cells[colIndex.position] : 'Software Engineer';
    const availability = colIndex.availability !== -1 ? cells[colIndex.availability] : 'Flexible weekdays';
    const notes = colIndex.notes !== -1 ? cells[colIndex.notes] : 'Screened via AI extraction prompt.';
    const linkedinUrl = colIndex.linkedin !== -1 ? cells[colIndex.linkedin] : undefined;
    const githubUrl = colIndex.github !== -1 ? cells[colIndex.github] : undefined;
    const assignedInterviewer = colIndex.interviewer !== -1 && cells[colIndex.interviewer] ? cells[colIndex.interviewer].trim() : undefined;

    const resolvedCity = city || (locRaw ? locRaw.split(',')[0].trim() : '');
    const resolvedCountry = country || (locRaw && locRaw.includes(',') ? locRaw.split(',').pop()?.trim() : '');
    const location = locRaw || (resolvedCity && resolvedCountry ? `${resolvedCity}, ${resolvedCountry}` : resolvedCity || resolvedCountry || '');

    const tempCandidate = {
      timezone: tzRaw,
      country: resolvedCountry,
      location,
    };
    const tzInfo = resolveCandidateTimezone(tempCandidate);

    results.push({
      id: `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      email: cleanEmail(emailRaw, name),
      phone: cleanPhone(phoneRaw),
      city: resolvedCity,
      country: resolvedCountry,
      location,
      timezone: tzInfo.tz,
      timezoneLabel: tzInfo.label,
      position: position || 'Software Engineer',
      originalAvailability: availability,
      notes,
      resumeLink: '',
      linkedinUrl: linkedinUrl?.startsWith('http') ? linkedinUrl : undefined,
      githubUrl: githubUrl?.startsWith('http') ? githubUrl : undefined,
      assignedInterviewer: assignedInterviewer && assignedInterviewer.includes('@') ? assignedInterviewer : undefined,
      status: 'Pending',
    });
  }

  return results;
}

/**
 * Parses JSON arrays from raw text
 */
export function parseJsonPayload(rawText: string): ParsedCandidateItem[] {
  let cleanText = rawText.trim();
  // Strip markdown code fences if present
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }

  // Find array brackets
  const startIdx = cleanText.indexOf('[');
  const endIdx = cleanText.lastIndexOf(']');
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return [];

  const jsonSnippet = cleanText.substring(startIdx, endIdx + 1);
  try {
    const parsed = JSON.parse(jsonSnippet);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: any, idx: number) => {
      const name = item.name || item.fullName || `Candidate ${idx + 1}`;
      const resolvedCity = item.city || (item.location ? item.location.split(',')[0]?.trim() : '');
      const resolvedCountry = item.country || (item.location && item.location.includes(',') ? item.location.split(',').pop()?.trim() : '');
      const location = item.location || (resolvedCity && resolvedCountry ? `${resolvedCity}, ${resolvedCountry}` : resolvedCity || resolvedCountry || '');

      const tempCand = {
        timezone: item.timezone || item.tz,
        country: resolvedCountry,
        location,
      };
      const tzInfo = resolveCandidateTimezone(tempCand);

      return {
        id: `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        email: cleanEmail(item.email || '', name),
        phone: cleanPhone(item.phone || item.mobile || ''),
        city: resolvedCity,
        country: resolvedCountry,
        location,
        timezone: tzInfo.tz,
        timezoneLabel: tzInfo.label,
        position: item.position || item.role || item.title || 'Software Engineer',
        originalAvailability: item.originalAvailability || item.availability || 'Weekdays standard',
        notes: item.notes || item.summary || item.skills || 'Imported via AI JSON payload.',
        resumeLink: item.resumeLink || '',
        linkedinUrl: item.linkedinUrl || item.linkedin,
        githubUrl: item.githubUrl || item.github,
        portfolioUrl: item.portfolioUrl || item.portfolio,
        assignedInterviewer: item.assignedInterviewer || item.interviewer || item.assignedTo,
        status: 'Pending',
      };
    });
  } catch {
    return [];
  }
}

/**
 * Parses Key-Value text blocks
 * Example:
 * Name: Jane Doe
 * Email: jane@example.com
 * ...
 */
export function parseKeyValueBlocks(rawText: string): ParsedCandidateItem[] {
  const blocks = rawText.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const results: ParsedCandidateItem[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const data: Record<string, string> = {};

    lines.forEach((line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim().toLowerCase();
        const val = line.slice(colonIdx + 1).trim();
        data[key] = val;
      }
    });

    const name = data.name || data['full name'] || data['candidate name'];
    if (!name) continue;

    const email = data.email || data['e-mail'] || '';
    const phone = data.phone || data['mobile'] || data['contact'] || '';
    const city = data.city || '';
    const country = data.country || '';
    const location = data.location || (city && country ? `${city}, ${country}` : city || country || '');
    const tz = data.timezone || data.tz;
    const position = data.position || data.role || data.title || 'Software Engineer';
    const availability = data.availability || data['original availability'] || 'Flexible';
    const notes = data.notes || data.summary || data.skills || 'Parsed from structured text.';
    const assignedInterviewer = data.interviewer || data['assigned to'] || data['assigned interviewer'];

    const tzInfo = resolveCandidateTimezone({ timezone: tz, country, location });

    results.push({
      id: `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      email: cleanEmail(email, name),
      phone: cleanPhone(phone),
      city,
      country,
      location,
      timezone: tzInfo.tz,
      timezoneLabel: tzInfo.label,
      position,
      originalAvailability: availability,
      notes,
      resumeLink: '',
      linkedinUrl: data.linkedin,
      githubUrl: data.github,
      assignedInterviewer: assignedInterviewer && assignedInterviewer.includes('@') ? assignedInterviewer.trim() : undefined,
      status: 'Pending',
    });
  }

  return results;
}

/**
 * Universal auto-detection parser
 */
export function parseAnyRecruitmentInput(
  rawInput: string,
  existingCandidates: Candidate[] = []
): ParseResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      candidates: [],
      detectedFormat: 'unknown',
      duplicateCount: 0,
      totalParsed: 0,
      warnings: ['No input provided.'],
    };
  }

  let candidates: ParsedCandidateItem[] = [];
  let detectedFormat: ParseResult['detectedFormat'] = 'unknown';

  // 1. Check if Markdown Table
  if (trimmed.includes('|') && trimmed.split('\n').filter((l) => l.trim().startsWith('|')).length >= 2) {
    detectedFormat = 'markdown';
    candidates = parseMarkdownTable(trimmed);
  }

  // 2. If not markdown, check if JSON
  if (candidates.length === 0 && (trimmed.startsWith('[') || trimmed.includes('[{') || trimmed.includes('```json'))) {
    const jsonParsed = parseJsonPayload(trimmed);
    if (jsonParsed.length > 0) {
      detectedFormat = 'json';
      candidates = jsonParsed;
    }
  }

  // 3. If still empty, check Key-Value
  if (candidates.length === 0 && /name\s*:/i.test(trimmed)) {
    const kvParsed = parseKeyValueBlocks(trimmed);
    if (kvParsed.length > 0) {
      detectedFormat = 'key-value';
      candidates = kvParsed;
    }
  }

  // Check for duplicates against existing candidates in Firestore
  const existingEmailSet = new Set(
    existingCandidates.map((c) => c.email.trim().toLowerCase()).filter(Boolean)
  );

  let duplicateCount = 0;
  const enrichedCandidates = candidates.map((cand) => {
    const isDup = existingEmailSet.has(cand.email.toLowerCase());
    if (isDup) {
      duplicateCount++;
    }
    return {
      ...cand,
      isDuplicate: isDup,
    };
  });

  const warnings: string[] = [];
  if (duplicateCount > 0) {
    warnings.push(`${duplicateCount} candidate(s) have matching emails already registered in your pipeline.`);
  }

  return {
    candidates: enrichedCandidates,
    detectedFormat,
    duplicateCount,
    totalParsed: enrichedCandidates.length,
    warnings,
  };
}
