/**
 * Master Universal AI Extraction Prompts for RecruitSync
 * Formatted for use with ChatGPT, Claude, Gemini, DeepSeek, or any LLM
 */

export interface PromptCustomizationOptions {
  targetRole?: string;
  defaultTimezone?: string;
  interviewWindow?: string;
  specialInstructions?: string;
}

export const DEFAULT_MASTER_AI_PROMPT = `You are an expert Recruitment Operations Data Engineer. Your task is to extract candidate profiles from messy, unstructured text and convert them into the standardized RecruitSync format.

### RULES & CONSTRAINTS:
1. Extract ALL real candidates found in the input. Do not invent, hallucinate, or fabricate dummy records.
2. For each candidate, determine:
   - Full Name
   - Email (must be valid format; if missing, leave empty "")
   - Phone Number (include country code e.g. +92, +1, +44, +971 if identifiable)
   - Location (City, Country)
   - Standard IANA Timezone (e.g. America/New_York, Europe/London, Asia/Dubai, Asia/Karachi, Asia/Kolkata)
   - Job Position / Role
   - Experience / Seniority (e.g., Junior, Mid, Senior, Lead)
   - Original Availability Notes (e.g., "Available weekdays after 2 PM local")
   - Key Skills / AI Summary (1-2 crisp sentences)
   - LinkedIn / GitHub / Portfolio URLs (if present in the text)

3. OUTPUT FORMAT:
Output ONLY a single Markdown Table formatted exactly as follows, with no extra conversational preamble or closing banter:

| Name | Email | Phone | City | Country | Timezone | Position | Original Availability | Key Skills / Summary | LinkedIn | GitHub |
|---|---|---|---|---|---|---|---|---|---|---|
| John Doe | john.doe@example.com | +1 555-0199 | New York | United States | America/New_York | Senior Fullstack Engineer | Weekday afternoons | React, Node.js, Cloud architecture | https://linkedin.com/in/johndoe | https://github.com/johndoe |

### RAW CANDIDATE DATA TO PARSE:
{{PASTE_YOUR_ROUGH_DATA_HERE}}`;

export const JSON_MASTER_AI_PROMPT = `You are an expert Recruitment Operations Data Engineer. Your task is to extract candidate profiles from messy, unstructured text and convert them into a clean JSON array formatted for RecruitSync.

### RULES & CONSTRAINTS:
1. Extract ALL real candidates found in the input. Do not fabricate dummy records.
2. Return ONLY a valid JSON Array with NO markdown formatting, no explanations, no wrapping code fences, just the pure array:
[
  {
    "name": "Full Name",
    "email": "candidate@example.com",
    "phone": "+1 555-0199",
    "city": "London",
    "country": "United Kingdom",
    "timezone": "Europe/London",
    "position": "Senior Software Engineer",
    "originalAvailability": "Weekdays 2-6 PM local",
    "notes": "Strong background in distributed backend systems.",
    "linkedinUrl": "https://linkedin.com/in/username",
    "githubUrl": "https://github.com/username"
  }
]

### RAW CANDIDATE DATA TO PARSE:
{{PASTE_YOUR_ROUGH_DATA_HERE}}`;

/**
 * Builds a customized Master Prompt based on recruiter preferences
 */
export function generateMasterPrompt(options: PromptCustomizationOptions = {}): string {
  const { targetRole, defaultTimezone, interviewWindow, specialInstructions } = options;

  let extraRules = '';
  if (targetRole) {
    extraRules += `\n- Default Target Position if unspecified: "${targetRole}"`;
  }
  if (defaultTimezone) {
    extraRules += `\n- Default Timezone if location is ambiguous: "${defaultTimezone}"`;
  }
  if (interviewWindow) {
    extraRules += `\n- Note target interview timeframe: "${interviewWindow}"`;
  }
  if (specialInstructions) {
    extraRules += `\n- Special recruiter requirement: "${specialInstructions}"`;
  }

  if (!extraRules) {
    return DEFAULT_MASTER_AI_PROMPT;
  }

  return DEFAULT_MASTER_AI_PROMPT.replace(
    '### RULES & CONSTRAINTS:',
    `### RULES & CONSTRAINTS:${extraRules}`
  );
}
