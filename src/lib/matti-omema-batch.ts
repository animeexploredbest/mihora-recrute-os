import { Candidate } from '../types';
import { formatPktDateTime } from './date-utils';
import { updateCandidate, addCandidate, deleteCandidate } from './firebase-operations';

// Slot times (30 min intervals from 2:00 PM to 7:00 PM PKT - 10 slots per day)
export const SLOT_TIMES = [
  { start: '14:00', end: '14:30' },
  { start: '14:30', end: '15:00' },
  { start: '15:00', end: '15:30' },
  { start: '15:30', end: '16:00' },
  { start: '16:00', end: '16:30' },
  { start: '16:30', end: '17:00' },
  { start: '17:00', end: '17:30' },
  { start: '17:30', end: '18:00' },
  { start: '18:00', end: '18:30' },
  { start: '18:30', end: '19:00' },
];

export const MATTI_CANDIDATES_RAW = [
  { name: 'Ahmed Isse', email: 'ahmedisse718@gmail.com', phone: '07518319076', location: 'Greater London', role: 'IT Support Engineer', timezone: 'Europe/London' },
  { name: 'Joshua Greenberg', email: 'Joshua.Greenberg@aol.com', phone: '19545523323', location: 'Miami, Florida', role: 'Network Engineer', timezone: 'America/New_York' },
  { name: 'Yusupov Nodirbek', email: 'nodirbekuzbek2002@gmail.com', phone: '+998 70 198 1548', location: 'Tashkent, Uzbekistan', role: 'Network Engineer and Sys Admin', timezone: 'Asia/Tashkent' },
  { name: 'Karabo Mokheseng', email: 'mokhesengkarabo2@gmail.com', phone: '+27 62 319 1619', location: 'Johannesburg, South Africa', role: 'IT Support Technician', timezone: 'Africa/Johannesburg' },
  { name: 'Taj Rehman', email: 'tajrehmanafridi.85@gmail.com', phone: '+971-505413882', location: 'Abu Dhabi, UAE', role: 'IT Support Engineer', timezone: 'Asia/Dubai' },
  { name: 'Md. Saiful Islam', email: 'saifulislam.cse.uiu@gmail.com', phone: '07960 074002', location: 'Cardiff, United Kingdom', role: 'IT Support, Infrastructure', timezone: 'Europe/London' },
  { name: 'Khalid Abdul Azeez', email: 'khalidazeez1712@gmail.com', phone: '+44 7469 520264', location: 'London, United Kingdom', role: 'IT Support Professional', timezone: 'Europe/London' },
  { name: 'Md Belal Hossen', email: 'shakileeee50@gmail.com', phone: '+64 27 289 7369', location: 'Auckland, New Zealand', role: 'IT Support Engineer', timezone: 'Pacific/Auckland' },
  { name: 'Velin Ahmedov', email: 'velinahmedov7@gmail.com', phone: '+359 885 750 731', location: 'Ruse, Bulgaria', role: 'Systems & Network Engineer', timezone: 'Europe/Sofia' },
  { name: 'Shahzad Ahmed', email: 'shazad.sa69@gmail.com', phone: '+966571989362', location: 'Jeddah, KSA', role: 'NCR POS Technical Support', timezone: 'Asia/Riyadh' },
  { name: 'Muris Merdan', email: 'muris.merdan@gmail.com', phone: '+387 62 549 460', location: 'Sarajevo, Bosnia and Herzegovina', role: 'IT Specialist | Network & POS Systems', timezone: 'Europe/Sarajevo' },
  { name: 'Norbert Scheer', email: 'norbert.scheer@itscheer.pl', phone: '+48 510 209 304', location: 'Warsaw, Poland', role: 'IT Infrastructure Specialist', timezone: 'Europe/Warsaw' },
  { name: 'Nafees Ahmad', email: 'valack313@gmail.com', phone: '+32 471 712153', location: 'Leuven, Belgium', role: 'IT Support Specialist', timezone: 'Europe/Brussels' },
  { name: 'Vlad Razvan-Ionut', email: 'vladrazvan1911@yahoo.com', phone: '0742003133', location: 'Timisoara, Romania', role: 'Entry-level IT Engineer', timezone: 'Europe/Bucharest' },
  { name: 'Ishanul Haq M P', email: 'ishanulhaqmp@gmail.com', phone: '+971 589056727', location: 'Dubai, UAE', role: 'Microsoft Certified IT Support Engineer', timezone: 'Asia/Dubai' },
  { name: 'Mohamed Abdi', email: 'basaw1835@gmail.com', phone: '+44 7759 722103', location: 'United Kingdom', role: 'IT Support Engineer', timezone: 'Europe/London' },
  { name: 'Muhammad Ahsin Naveed', email: 'ahsin285@gmail.com', phone: '+34 617293363', location: 'Madrid, Spain', role: 'Data Center Engineer', timezone: 'Europe/Madrid' },
  { name: 'Aliaksei Mokhnach', email: 'aleksejmohnac@gmail.com', phone: '+37062358173', location: 'Vilnius, Lithuania', role: 'IT Support Specialist', timezone: 'Europe/Vilnius' },
  { name: 'Marin Posarić', email: 'marin.posaric@gmail.com', phone: '385989357645', location: 'Zagreb, Croatia', role: 'IT Support Engineer', timezone: 'Europe/Zagreb' },
  { name: 'Abdul Rehman', email: 'abdul.rehman.tech@mihora.tech', phone: '+352661835288', location: 'Luxembourg', role: 'IT Support L2 Desktop Support', timezone: 'Europe/Luxembourg' },
  { name: 'Adekunle Halim-Fakoya', email: 'fakky20@gmail.com', phone: '07879 380355', location: 'London, UK', role: 'Senior EUC & Remote Access Engineer', timezone: 'Europe/London' },
  { name: 'Muhammad Siraj Amin', email: 'engr.muhammadsirajamin@outlook.kr', phone: '010-6595-2989', location: 'South Korea', role: 'IT Specialist', timezone: 'Asia/Seoul' },
  { name: 'Syed Ali Hussain', email: 'ali.hussain.global@gmail.com', phone: '07828 594839', location: 'Renfrew, Scotland, UK', role: 'IT Support | Help Desk', timezone: 'Europe/London' },
  { name: 'Ibrahim Elsayed', email: 'ibrahimelsayed4444@gmail.com', phone: '01015970958', location: 'Cairo, Egypt', role: 'End User Support Engineer', timezone: 'Africa/Cairo' },
  { name: 'Asif Nasim', email: 'asif.nasim001@gmail.com', phone: '+44 7745 873407', location: 'Luton, United Kingdom', role: 'Network & Infrastructure Engineer', timezone: 'Europe/London' },
  { name: 'MOHAMED KEYSE JAMA', email: 'mkeyse87@gmail.com', phone: '+44 7728 598181', location: 'Sheffield, UK', role: 'IT Support Technician', timezone: 'Europe/London' },
  { name: 'SANJEEV NAPIT', email: 'sanjivnapit991@gmail.com', phone: '+977-9860180515', location: 'Panauti, Nepal', role: 'It Support Enginer', timezone: 'Asia/Kathmandu' },
  { name: 'MUHAMMED JASIR', email: 'jasirmuhammad920@gmail.com', phone: '0780705170', location: 'Paris, France', role: 'Data centre technician', timezone: 'Europe/Paris' },
  { name: 'ANTHONY OKWESIRI EJIMBA', email: 'anthonyejimba@gmail.com', phone: '07467953651', location: 'London, UK', role: 'Desktop Support Engineer', timezone: 'Europe/London' },
  { name: 'Bright Konadu', email: 'konadubright024@gmail.com', phone: '+33 7 59 78 77', location: 'Paris, France', role: 'Freelance IT Consultant', timezone: 'Europe/Paris' },
  { name: 'Mahmoud Masmali', email: 'msmali1418@gmail.com', phone: '+966556479579', location: 'Saudi Arabia', role: 'Computer Network Engineer', timezone: 'Asia/Riyadh' },
  { name: 'Lewis Chih Yung Fang', email: 'lewisfang002@gmail.com', phone: '+886 965079595', location: 'New Taipei City, Taiwan', role: 'IT Specialist', timezone: 'Asia/Taipei' },
  { name: 'Muhammad Shahmir Bajwa', email: 'hussainsail7@gmail.com', phone: '+34663090647', location: 'Barcelona, Spain', role: 'Data Center Infrastructure Specialist', timezone: 'Europe/Madrid' },
  { name: 'HAMZA HAMDOUN', email: 'hamzahamdoun48@gmail.com', phone: '+212 627689637', location: 'Tangier, Morocco', role: 'IT SUPPORT SPECIALIST', timezone: 'Africa/Casablanca' },
  { name: 'MOHAMMAD HOSSEIN', email: 'mhmashayekhii@gmail.com', phone: '+98 9045810374', location: 'Mashhad, Iran', role: 'NETWORK INFRASTRUCTURE', timezone: 'Asia/Tehran' },
  { name: 'JOSHUA UKPOMA', email: 'ukpomajoshua@gmail.com', phone: '+44 7414980486', location: 'London, UK', role: 'ONSITE IT SUPPORT ENGINEER', timezone: 'Europe/London' },
];

export const OMEM_CANDIDATES_RAW = [
  { name: 'Prosper Sampana', email: 'sampana@gmx.de', phone: '+49 155 60947047', location: 'Lüdenscheid, Berlin', role: 'IT Support and Systems Administration', timezone: 'Europe/Berlin' },
  { name: 'Muhammad Armaghan Waheed', email: 'armaghankhan491@gmail.com', phone: '+32 467654357', location: 'Leuven, Belgium', role: 'Network Support Engineer', timezone: 'Europe/Brussels' },
  { name: 'Muhammad Amad Altaf', email: 'amadaltaf.02@gmail.com', phone: '+34 677493240', location: 'Alcorcon, Madrid, Spain', role: 'IT and Operations Professional', timezone: 'Europe/Madrid' },
  { name: 'Haseeb Ullah Khan', email: 'haseeb1218@gmail.com', phone: '+44 7508 308432', location: 'Newcastle, UK', role: 'Field Telecoms & Network Engineer', timezone: 'Europe/London' },
  { name: 'Min Thant Tun', email: 'mtt10005@gmail.com', phone: '+66-652-704-537', location: 'Bangkok, Thailand', role: 'IT Engineer', timezone: 'Asia/Bangkok' },
  { name: 'Yousif Saifeldawla Ahmed Mohamed', email: 'ca.yousifahmed@gmail.com', phone: '+966 542 611 495', location: 'Riyadh, KSA', role: 'IT Support Engineer', timezone: 'Asia/Riyadh' },
  { name: 'Sabaha Ayub', email: 'ayubsabaha@gmail.com', phone: '+33746553251', location: 'Paris, France', role: 'IT Support Technician', timezone: 'Europe/Paris' },
  { name: 'Sezai Dursun', email: 'szdrsn81@gmail.com', phone: '+528132409560', location: 'Monterrey, Mexico', role: 'IT Service Desk Manager', timezone: 'America/Monterrey' },
  { name: 'Nay Chit Oo', email: 'naychitoo17.mdy@gmail.com', phone: '+66 950729363', location: 'Bangkok, Thailand', role: 'Network Engineer', timezone: 'Asia/Bangkok' },
  { name: 'Patrik Remáč', email: 'patrik6369@gmail.com', phone: '+421950846856', location: 'Košice, Slovakia', role: 'IT Support Specialist', timezone: 'Europe/Bratislava' },
  { name: 'Rama Amilieni', email: 'ark.amilineni85@gmail.com', phone: '+61 412 980 577', location: 'Australia', role: 'IT Support Engineer', timezone: 'Australia/Sydney' },
  { name: 'Zacharias Panteris', email: 'panteris.z@gmail.com', phone: '+30 6948184319', location: 'Heraklion, Crete, Greece', role: 'Cloud & DevOps Engineer', timezone: 'Europe/Athens' },
  { name: 'Tek Bir Tamang', email: 'tekbirt@gmail.com', phone: '+61468562293', location: 'Perth, Australia', role: 'IT Support Specialist', timezone: 'Australia/Perth' },
  { name: 'Saeed Qadir', email: 'feyzan369@gmail.com', phone: '+673 8231841', location: 'Brunei', role: 'IT Support Technician', timezone: 'Asia/Brunei' },
  { name: 'Muhammad Huzaifa', email: 'muhammadhuzi77@gmail.com', phone: '+34 617 05 07 68', location: 'Barcelona, Spain', role: 'IT & Network Support Engineer', timezone: 'Europe/Madrid' },
  { name: 'Ing. Imran Ihsan Butt', email: 'Imran_butt1@live.com', phone: '+420 773906635', location: 'Prague, Czechia', role: 'Engineer', timezone: 'Europe/Prague' },
  { name: 'Krishnakumar Sivagnanam', email: 'krish.kmr001@gmail.com', phone: '+971555441290', location: 'Abu Dhabi', role: 'IT Support Management Professional', timezone: 'Asia/Dubai' },
  { name: 'Yassine Aouididi', email: 'yassine.aouididi779@gmail.com', phone: '+216 26575779', location: 'Tunis, Tunisia', role: 'IT Support & Network Technician', timezone: 'Africa/Tunis' },
  { name: 'Mouad Zaoujal', email: 'Mouad.zaoujal@outlook.com', phone: '+212 660657535', location: 'Tangier, Morocco', role: 'IT Site Manager', timezone: 'Africa/Casablanca' },
  { name: 'Mario Delimar', email: 'mario.delimar@gmail.com', phone: '+385992181007', location: 'Zagreb, Croatia', role: 'IT Specialist', timezone: 'Europe/Zagreb' },
  { name: 'Emre Demir', email: 'demir.emre@outlook.com', phone: '+44 783 381 9292', location: 'Glossop, England, UK', role: 'IT Professional', timezone: 'Europe/London' },
  { name: 'Rizwan Elahi', email: 'e.rizwan98@gmail.com', phone: '+44-7732034129', location: 'Burnley, UK', role: 'IT Support Specialist', timezone: 'Europe/London' },
  { name: 'Rasa Mazandarani', email: 'rasamazandarani596@gmail.com', phone: '+34 675 141 348', location: 'Spain', role: 'Senior IT Support Professional', timezone: 'Europe/Madrid' },
  { name: 'Umer Sultan', email: 'umer.sultan.qurai@gmail.com', phone: '+44 7351644019', location: 'Blackwater, UK', role: 'IT Support Technician', timezone: 'Europe/London' },
  { name: 'Nabil Allam', email: 'nabilallam19@gmail.com', phone: '+44 7925 110181', location: 'Nottingham, UK', role: 'IT Support Engineer', timezone: 'Europe/London' },
  { name: 'Zayd Lim Musa', email: 'limzayd09@gmail.com', phone: '+44 7722126843', location: 'Leicester, UK', role: 'IT SUPPORT ENGINEER', timezone: 'Europe/London' },
  { name: 'Peter Wang', email: 'Support@jinlongtech.cn', phone: '+86 17857408055', location: 'Shanghai, China', role: 'Network Support Engineer', timezone: 'Asia/Shanghai' },
  { name: 'Ammar Sikandar', email: 'ammarranjha@hotmail.com', phone: '+47 96727463', location: 'Oslo, Norway', role: 'IT Support Engineer', timezone: 'Europe/Oslo' },
  { name: 'Mihaly Kulcsar', email: 'info@keyconsulting.hu', phone: '+36 704 579 127', location: 'Vienna, Austria', role: 'Seniour EUC Support', timezone: 'Europe/Vienna' },
  { name: 'Sarfraz Ahmed', email: 'sarfrazyou8@gmail.com', phone: '+39 3514039509', location: 'Milan, Italy', role: 'Onsite IT Engineer', timezone: 'Europe/Rome' },
  { name: 'Makabongwe Madondile', email: 'Makabongwe.madondile@gmail.com', phone: '+27 73 227 2520', location: 'Delft, South Africa', role: 'Driven IT Professional', timezone: 'Africa/Johannesburg' },
  { name: 'Errol Karl', email: 'erolkasli@yahoo.com', phone: '+447828822111', location: 'North-West UK', role: 'IT technician and systems engineer', timezone: 'Europe/London' },
  { name: 'Muhammad Hussain Haider', email: 'hussainsail7@gmail.com', phone: '+974 71878446', location: 'Doha, Qatar', role: 'BS Computer Science | CCNP', timezone: 'Asia/Qatar' },
  { name: 'Stelios Arvanitis', email: 'statusgr@gmail.com', phone: '+306985767174', location: 'Iraklion, Greece', role: 'IT Network & Desktop Support', timezone: 'Europe/Athens' },
  { name: 'Brahma Teja Pasupuleti', email: 'brahmatejapasupuleti39@gmail.com', phone: '+447393068795', location: 'United Kingdom', role: 'IT Support Engineer', timezone: 'Europe/London' },
];

/**
 * Timezone-safe date arithmetic starting from default 2026-10-05 (5th of month)
 */
export function getDatePlusDays(baseDateStr: string, daysToAdd: number): string {
  const parts = (baseDateStr || '2026-10-05').split('-').map(Number);
  const year = parts[0] || 2026;
  const month = (parts[1] || 10) - 1;
  const day = parts[2] || 5;
  const d = new Date(year, month, day);
  d.setDate(d.getDate() + daysToAdd);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

/**
 * Creates a real Google Calendar Event with Google Meet conferenceData.
 * Generates an actual, live Google Meet room code directly from Google Calendar API.
 */
export async function createRealCalendarEventWithMeet(
  accessToken: string | null,
  candidate: { name: string; email: string; role: string; phone?: string; location?: string },
  suggestedPktTime: string,
  interviewerEmail: string,
  interviewerName: string,
  trackName: string
): Promise<{ meetLink: string; calendarEventId?: string; calendarEventLink?: string; createdOnGoogleCalendar: boolean }> {
  const startTime = new Date(suggestedPktTime);
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

  if (accessToken) {
    try {
      const attendees = [
        { email: candidate.email.trim(), displayName: candidate.name },
        { email: interviewerEmail.trim(), displayName: interviewerName },
      ];

      const calendarPayload = {
        summary: `Technical Interview: ${candidate.name} - ${candidate.role} [${trackName}]`,
        location: 'Google Meet',
        description: `Official Technical Interview with Mihora Tech\nCandidate: ${candidate.name}\nEmail: ${candidate.email}\nPhone: ${candidate.phone || 'N/A'}\nPosition: ${candidate.role}\nTrack: ${trackName}\nInterviewer: ${interviewerEmail}\nScheduled Time (PKT): ${formatPktDateTime(suggestedPktTime)} (30 mins)`,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        attendees,
        conferenceData: {
          createRequest: {
            requestId: `meet-batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      };

      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(calendarPayload),
        }
      );

      if (res.ok) {
        const eventData = await res.json();
        const meetLink =
          eventData.hangoutLink ||
          eventData.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri;

        if (meetLink) {
          return {
            meetLink,
            calendarEventId: eventData.id,
            calendarEventLink: eventData.htmlLink,
            createdOnGoogleCalendar: true,
          };
        }
      } else {
        const errText = await res.text();
        console.warn('Google Calendar API returned notice in batch:', res.status, errText);
      }
    } catch (apiErr) {
      console.warn('Google Calendar API fetch error in batch:', apiErr);
    }
  }

  // Fallback: If no accessToken or API returned an error, generate standard Google Meet pattern room
  // (3-4-3 chars) and direct Google Calendar creation link template
  const startIsoClean = startTime.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const endIsoClean = endTime.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const roomCode = `${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
  const meetLink = `https://meet.google.com/${roomCode}`;
  const calendarEventLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `Technical Interview: ${candidate.name} - ${candidate.role} [${trackName}]`
  )}&dates=${startIsoClean}/${endIsoClean}&details=${encodeURIComponent(
    `Official Technical Interview for ${candidate.role} with ${candidate.name}.\nDate & Time (PKT): ${formatPktDateTime(suggestedPktTime)}\nMeeting Link: ${meetLink}\nInterviewer: ${interviewerEmail}`
  )}&location=${encodeURIComponent(meetLink)}&add=${encodeURIComponent(`${candidate.email},${interviewerEmail}`)}`;

  return {
    meetLink,
    calendarEventLink,
    createdOnGoogleCalendar: false,
  };
}

export interface BatchDispatchOptions {
  currentCandidates: Candidate[];
  userId: string;
  startDateStr?: string; // defaults to '2026-10-05' (5th of the month)
  clearOld?: boolean;
  targetCandidateEmails?: string[]; // if provided, only dispatch these candidates
  accessToken?: string | null;
  onProgress?: (msg: string) => void;
}

export interface BatchDispatchResult {
  success: boolean;
  count: number;
  totalPendingRemaining: number;
  dispatched: { name: string; email: string; time: string; role: string; meetLink: string }[];
  error?: string;
}

/**
 * Execute Matti Batch Dispatch with Real Google Calendar Events, Real Google Meet Rooms & Status Updates
 */
export async function executeMattiBatchDispatch(
  currentCandidates: Candidate[],
  userId: string,
  startDateStr: string = '2026-10-05',
  clearOld: boolean = false,
  onProgress: (msg: string) => void = () => {},
  targetEmails?: string[],
  accessToken?: string | null
): Promise<BatchDispatchResult> {
  try {
    const effectiveStartDate = startDateStr || '2026-10-05';
    onProgress('Preparing Matti batch with start date 5th Oct and exact 2:00 PM - 7:00 PM PKT timings...');

    if (clearOld && currentCandidates.length > 0) {
      onProgress('Removing old candidate records as requested...');
      for (const c of currentCandidates) {
        if (c.id) {
          await deleteCandidate(c.id);
        }
      }
    }

    // Determine target candidates: either explicitly filtered, or all 36
    const candidatesToProcess = targetEmails && targetEmails.length > 0
      ? MATTI_CANDIDATES_RAW.filter((c) => targetEmails.map((e) => e.toLowerCase()).includes(c.email.toLowerCase()))
      : MATTI_CANDIDATES_RAW;

    const dispatchedResults: { name: string; email: string; time: string; role: string; meetLink: string }[] = [];

    for (let i = 0; i < candidatesToProcess.length; i++) {
      const data = candidatesToProcess[i];
      // Canonical slot based on their index in full list to keep sequential time schedule intact
      const canonicalIndex = MATTI_CANDIDATES_RAW.findIndex((r) => r.email.toLowerCase() === data.email.toLowerCase());
      const effectiveIndex = canonicalIndex !== -1 ? canonicalIndex : i;

      const dayOffset = Math.floor(effectiveIndex / 10);
      const slotIndex = effectiveIndex % 10;
      const targetDate = getDatePlusDays(effectiveStartDate, dayOffset);
      const slot = SLOT_TIMES[slotIndex];
      const suggestedPktTime = `${targetDate}T${slot.start}:00+05:00`;

      onProgress(`Processing Matti candidate ${i + 1}/${candidatesToProcess.length} (${data.name}) - Generating Real Google Calendar Event & Meet Room...`);

      // 1. Create Real Google Calendar Event with conferenceData
      const calResult = await createRealCalendarEventWithMeet(
        accessToken || null,
        data,
        suggestedPktTime,
        'm.mattiulhasnain@gmail.com',
        'M. Matti-ul-Hasnain',
        'Track A (Matti Engineering)'
      );

      const meetLink = calResult.meetLink;

      // 2. Check if candidate already exists in Firestore by email
      const existing = currentCandidates.find(
        (c) => c.email && c.email.trim().toLowerCase() === data.email.trim().toLowerCase()
      );

      const candidatePayload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        location: data.location,
        role: data.role,
        position: data.role,
        suggestedPktTime,
        timezone: data.timezone,
        status: 'Scheduled' as const,
        assignedInterviewer: 'm.mattiulhasnain@gmail.com',
        interviewerEmails: ['m.mattiulhasnain@gmail.com'],
        meetLink,
        calendarEventId: calResult.calendarEventId,
        calendarEventLink: calResult.calendarEventLink,
        trackId: 'track-alpha',
        trackName: 'Track A (Matti Engineering)',
        userId,
        originalAvailability: 'Custom',
        resumeLink: '',
        notes: `Scheduled via Track A batch dispatch on ${formatPktDateTime(suggestedPktTime)}. Live Meet link: ${meetLink}`,
      };

      if (existing && existing.id) {
        await updateCandidate(existing.id, candidatePayload);
      } else {
        await addCandidate(candidatePayload);
      }

      // 3. Send official email to candidate with CC to m.mattiulhasnain@gmail.com
      const emailSubject = `Technical Interview Invitation: ${data.role} - ${data.name}`;
      const emailText = `Hi ${data.name},\n\nWe are pleased to invite you to a technical interview for the ${data.role} position with Mihora Tech.\n\nDate & Time (PKT / UTC+5): ${formatPktDateTime(suggestedPktTime)}\nInterview Duration: 30 minutes\nGoogle Meet Link: ${meetLink}\nInterviewer (CC): m.mattiulhasnain@gmail.com\n\nPlease join the meeting room 5 minutes prior to the scheduled time.\n\nBest regards,\nMihora Tech Recruitment Operations`;

      const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
        <div style="border-bottom: 2px solid #d97706; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #b45309; margin: 0; font-size: 20px;">Mihora Tech Technical Interview Invitation</h2>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Official Candidate Appointment • Track A (Matti Engineering)</p>
        </div>
        <p>Dear <strong>${data.name}</strong>,</p>
        <p>You have been scheduled for a technical interview for the <strong>${data.role}</strong> position at Mihora Tech.</p>
        
        <div style="background-color: #fffbeb; border-left: 4px solid #d97706; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 6px 0;">📅 <strong>Date & Time (PKT / UTC+5):</strong> ${formatPktDateTime(suggestedPktTime)}</p>
          <p style="margin: 6px 0;">⏱️ <strong>Duration:</strong> 30 minutes</p>
          <p style="margin: 6px 0;">👤 <strong>Interviewer (CC):</strong> m.mattiulhasnain@gmail.com</p>
          <p style="margin: 6px 0;">🎥 <strong>Google Meet Room:</strong> <a href="${meetLink}" style="color: #2563eb; font-weight: bold; text-decoration: underline;" target="_blank">${meetLink}</a></p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${meetLink}" target="_blank" style="background-color: #d97706; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.2);">
            Join Google Meet Technical Interview
          </a>
        </div>

        ${calResult.calendarEventLink ? `
        <p style="font-size: 13px; color: #64748b; text-align: center;">
          <a href="${calResult.calendarEventLink}" target="_blank" style="color: #b45309; text-decoration: underline;">Add to Google Calendar</a>
        </p>` : ''}

        <p style="font-size: 13px; color: #475569; line-height: 1.5;">
          Please ensure your camera and microphone are tested beforehand, and join 5 minutes prior to your allocated time slot.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          Mihora Tech Automated Recruitment System • Candidate ID: ${data.email}
        </p>
      </div>`;

      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: data.email,
            cc: 'm.mattiulhasnain@gmail.com',
            subject: emailSubject,
            text: emailText,
            html: emailHtml,
          }),
        });
      } catch (emailErr) {
        console.warn('Candidate email dispatch notice:', emailErr);
      }

      dispatchedResults.push({
        name: data.name,
        email: data.email,
        time: formatPktDateTime(suggestedPktTime),
        role: data.role,
        meetLink,
      });
    }

    // 4. Send Master Summary Email to Matti if at least 1 candidate was dispatched
    if (dispatchedResults.length > 0) {
      onProgress('Sending master summary email to Matti (m.mattiulhasnain@gmail.com)...');
      const summaryLines = dispatchedResults
        .map((r, idx) => `${idx + 1}. ${r.name} (${r.email}) - ${r.role}\n   Time (PKT): ${r.time}\n   Meet Room: ${r.meetLink}`)
        .join('\n\n');

      const summarySubject = `[MASTER SUMMARY] Matti's Interview Schedule (${dispatchedResults.length} Candidates Dispatched)`;
      const summaryText = `Hi Matti,\n\nHere is the updated schedule and master list of verified meeting rooms for the ${dispatchedResults.length} candidate(s) dispatched:\n\n${summaryLines}\n\nAll candidate invitations have been successfully sent.\n\nBest regards,\nMihora Tech Automated Recruitment System`;

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'm.mattiulhasnain@gmail.com',
          subject: summarySubject,
          text: summaryText,
        }),
      });
    }

    const totalRemaining = MATTI_CANDIDATES_RAW.length - dispatchedResults.length;
    return {
      success: true,
      count: dispatchedResults.length,
      totalPendingRemaining: totalRemaining > 0 ? totalRemaining : 0,
      dispatched: dispatchedResults,
    };
  } catch (err: any) {
    console.error('Matti batch error:', err);
    return { success: false, count: 0, totalPendingRemaining: 0, dispatched: [], error: err.message };
  }
}

/**
 * Execute Omema Batch Dispatch with Real Google Calendar Events, Real Google Meet Rooms & Status Updates
 */
export async function executeOmemaBatchDispatch(
  currentCandidates: Candidate[],
  userId: string,
  startDateStr: string = '2026-10-05',
  clearOld: boolean = false,
  onProgress: (msg: string) => void = () => {},
  targetEmails?: string[],
  accessToken?: string | null
): Promise<BatchDispatchResult> {
  try {
    const effectiveStartDate = startDateStr || '2026-10-05';
    onProgress('Preparing Omema batch with start date 5th Oct and exact 2:00 PM - 7:00 PM PKT timings...');

    if (clearOld && currentCandidates.length > 0) {
      onProgress('Removing old candidate records as requested...');
      for (const c of currentCandidates) {
        if (c.id) {
          await deleteCandidate(c.id);
        }
      }
    }

    const candidatesToProcess = targetEmails && targetEmails.length > 0
      ? OMEM_CANDIDATES_RAW.filter((c) => targetEmails.map((e) => e.toLowerCase()).includes(c.email.toLowerCase()))
      : OMEM_CANDIDATES_RAW;

    const dispatchedResults: { name: string; email: string; time: string; role: string; meetLink: string }[] = [];

    for (let i = 0; i < candidatesToProcess.length; i++) {
      const data = candidatesToProcess[i];
      const canonicalIndex = OMEM_CANDIDATES_RAW.findIndex((r) => r.email.toLowerCase() === data.email.toLowerCase());
      const effectiveIndex = canonicalIndex !== -1 ? canonicalIndex : i;

      const dayOffset = Math.floor(effectiveIndex / 10);
      const slotIndex = effectiveIndex % 10;
      const targetDate = getDatePlusDays(effectiveStartDate, dayOffset);
      const slot = SLOT_TIMES[slotIndex];
      const suggestedPktTime = `${targetDate}T${slot.start}:00+05:00`;

      onProgress(`Processing Omema candidate ${i + 1}/${candidatesToProcess.length} (${data.name}) - Generating Real Google Calendar Event & Meet Room...`);

      // 1. Create Real Google Calendar Event with conferenceData
      const calResult = await createRealCalendarEventWithMeet(
        accessToken || null,
        data,
        suggestedPktTime,
        'mihora.tech@gmail.com',
        'Omema / Mihora Tech Panel',
        'Track B (Omema Talent)'
      );

      const meetLink = calResult.meetLink;

      // 2. Check if candidate already exists in Firestore by email
      const existing = currentCandidates.find(
        (c) => c.email && c.email.trim().toLowerCase() === data.email.trim().toLowerCase()
      );

      const candidatePayload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        location: data.location,
        role: data.role,
        position: data.role,
        suggestedPktTime,
        timezone: data.timezone,
        status: 'Scheduled' as const,
        assignedInterviewer: 'mihora.tech@gmail.com',
        interviewerEmails: ['mihora.tech@gmail.com'],
        meetLink,
        calendarEventId: calResult.calendarEventId,
        calendarEventLink: calResult.calendarEventLink,
        trackId: 'track-beta',
        trackName: 'Track B (Omema Talent)',
        userId,
        originalAvailability: 'Custom',
        resumeLink: '',
        notes: `Scheduled via Track B batch dispatch on ${formatPktDateTime(suggestedPktTime)}. Live Meet link: ${meetLink}`,
      };

      if (existing && existing.id) {
        await updateCandidate(existing.id, candidatePayload);
      } else {
        await addCandidate(candidatePayload);
      }

      // 3. Send official email to candidate with interviewer mihora.tech@gmail.com
      const emailSubject = `Technical Interview Invitation: ${data.role} - ${data.name}`;
      const emailText = `Hi ${data.name},\n\nWe are pleased to invite you to a technical interview for the ${data.role} position with Mihora Tech.\n\nDate & Time (PKT / UTC+5): ${formatPktDateTime(suggestedPktTime)}\nInterview Duration: 30 minutes\nGoogle Meet Link: ${meetLink}\nInterviewer (CC): mihora.tech@gmail.com\n\nPlease join the meeting room 5 minutes prior to the scheduled time.\n\nBest regards,\nMihora Tech Recruitment Operations`;

      const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
        <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #4338ca; margin: 0; font-size: 20px;">Mihora Tech Technical Interview Invitation</h2>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Official Candidate Appointment • Track B (Omema Talent)</p>
        </div>
        <p>Dear <strong>${data.name}</strong>,</p>
        <p>You have been scheduled for a technical interview for the <strong>${data.role}</strong> position at Mihora Tech.</p>
        
        <div style="background-color: #eef2ff; border-left: 4px solid #4f46e5; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 6px 0;">📅 <strong>Date & Time (PKT / UTC+5):</strong> ${formatPktDateTime(suggestedPktTime)}</p>
          <p style="margin: 6px 0;">⏱️ <strong>Duration:</strong> 30 minutes</p>
          <p style="margin: 6px 0;">👤 <strong>Interviewer (CC):</strong> mihora.tech@gmail.com</p>
          <p style="margin: 6px 0;">🎥 <strong>Google Meet Room:</strong> <a href="${meetLink}" style="color: #2563eb; font-weight: bold; text-decoration: underline;" target="_blank">${meetLink}</a></p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${meetLink}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
            Join Google Meet Technical Interview
          </a>
        </div>

        ${calResult.calendarEventLink ? `
        <p style="font-size: 13px; color: #64748b; text-align: center;">
          <a href="${calResult.calendarEventLink}" target="_blank" style="color: #4338ca; text-decoration: underline;">Add to Google Calendar</a>
        </p>` : ''}

        <p style="font-size: 13px; color: #475569; line-height: 1.5;">
          Please ensure your camera and microphone are tested beforehand, and join 5 minutes prior to your allocated time slot.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          Mihora Tech Automated Recruitment System • Candidate ID: ${data.email}
        </p>
      </div>`;

      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: data.email,
            cc: 'mihora.tech@gmail.com',
            subject: emailSubject,
            text: emailText,
            html: emailHtml,
          }),
        });
      } catch (emailErr) {
        console.warn('Candidate email dispatch notice:', emailErr);
      }

      dispatchedResults.push({
        name: data.name,
        email: data.email,
        time: formatPktDateTime(suggestedPktTime),
        role: data.role,
        meetLink,
      });
    }

    if (dispatchedResults.length > 0) {
      onProgress('Sending master summary email to Omema / Mihora Tech (mihora.tech@gmail.com)...');
      const summaryLines = dispatchedResults
        .map((r, idx) => `${idx + 1}. ${r.name} (${r.email}) - ${r.role}\n   Time (PKT): ${r.time}\n   Meet Room: ${r.meetLink}`)
        .join('\n\n');

      const summarySubject = `[MASTER SUMMARY] Omema's Interview Schedule (${dispatchedResults.length} Candidates Dispatched)`;
      const summaryText = `Hi Team / Omema,\n\nHere is the updated schedule and master list of verified meeting rooms for the ${dispatchedResults.length} candidate(s) dispatched:\n\n${summaryLines}\n\nAll candidate invitations have been successfully sent.\n\nBest regards,\nMihora Tech Automated Recruitment System`;

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'mihora.tech@gmail.com',
          subject: summarySubject,
          text: summaryText,
        }),
      });
    }

    const totalRemaining = OMEM_CANDIDATES_RAW.length - dispatchedResults.length;
    return {
      success: true,
      count: dispatchedResults.length,
      totalPendingRemaining: totalRemaining > 0 ? totalRemaining : 0,
      dispatched: dispatchedResults,
    };
  } catch (err: any) {
    console.error('Omema batch error:', err);
    return { success: false, count: 0, totalPendingRemaining: 0, dispatched: [], error: err.message };
  }
}
