import { Candidate } from '../types';
import { formatPktDateTime } from './date-utils';

/**
 * Escapes a cell value for standard CSV formatting.
 */
function escapeCsv(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exports candidates to a cleanly formatted CSV file with UTF-8 BOM for Microsoft Excel compatibility.
 */
export function exportCandidatesToCsv(
  candidates: Candidate[],
  filename = `recruit_sync_interviews_${new Date().toISOString().split('T')[0]}.csv`
): void {
  const headers = [
    'Candidate Name',
    'Position',
    'Interview Track',
    'Status',
    'PKT Interview Time',
    'Duration (Minutes)',
    'Google Meet Link',
    'Email',
    'Phone',
    'Location / Country',
    'Overall Rating (1-5)',
    'Technical Rating',
    'Communication Rating',
    'Hiring Recommendation',
    'Interviewer Notes',
    'Resume Link',
    'LinkedIn',
    'GitHub',
    'Portfolio',
  ];

  const rows = candidates.map((c) => {
    const pktTime = c.suggestedPktTime ? formatPktDateTime(c.suggestedPktTime) : 'Not Scheduled';
    const sc = c.scorecard;
    return [
      escapeCsv(c.name),
      escapeCsv(c.position || 'Candidate'),
      escapeCsv(c.trackName || (c.trackId ? c.trackId.toUpperCase() : 'General Track')),
      escapeCsv(c.status),
      escapeCsv(pktTime),
      escapeCsv(c.durationMinutes || 45),
      escapeCsv(c.meetLink || ''),
      escapeCsv(c.email),
      escapeCsv(c.phone),
      escapeCsv(c.location || c.country || 'Remote'),
      escapeCsv(sc?.overallRating ? `${sc.overallRating} / 5` : ''),
      escapeCsv(sc?.technicalRating ? `${sc.technicalRating} / 5` : ''),
      escapeCsv(sc?.communicationRating ? `${sc.communicationRating} / 5` : ''),
      escapeCsv(sc?.recommendation || ''),
      escapeCsv(sc?.interviewerNotes || c.notes || ''),
      escapeCsv(c.resumeLink || ''),
      escapeCsv(c.linkedinUrl || ''),
      escapeCsv(c.githubUrl || ''),
      escapeCsv(c.portfolioUrl || ''),
    ].join(',');
  });

  // Prepend UTF-8 BOM so Excel displays special characters accurately
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and triggers a print-ready Executive Summary Report in a new window.
 */
export function printCandidateSummaryReport(
  candidates: Candidate[],
  reportTitle = 'RecruitSync — Executive Interview & Hiring Report'
): void {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const total = candidates.length;
  const scheduled = candidates.filter((c) => c.status === 'Scheduled' || c.status === 'Rescheduled').length;
  const interviewed = candidates.filter((c) => c.status === 'Interviewed').length;
  const selected = candidates.filter((c) => c.status === 'Selected').length;
  const rejected = candidates.filter((c) => c.status === 'Rejected').length;

  const tableRows = candidates
    .map((c, i) => {
      const pkt = c.suggestedPktTime ? formatPktDateTime(c.suggestedPktTime) : '—';
      const sc = c.scorecard;
      const rec = sc?.recommendation
        ? `<span class="badge ${
            sc.recommendation === 'Strong Hire' || sc.recommendation === 'Hire'
              ? 'badge-success'
              : sc.recommendation === 'On Hold'
              ? 'badge-warning'
              : 'badge-danger'
          }">${sc.recommendation}</span>`
        : '—';

      const trackLabel = c.trackName || (c.trackId ? c.trackId.toUpperCase() : 'General Track');
      return `
        <tr>
          <td>${i + 1}</td>
          <td>
            <strong>${c.name}</strong><br/>
            <small style="color:#666;">${c.email} | ${c.phone || 'N/A'}</small>
          </td>
          <td>${c.position || 'Software Engineer'}</td>
          <td><span style="font-size: 10px; background: #eef2ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #c7d2fe;">${trackLabel}</span></td>
          <td><span class="status-pill status-${c.status.toLowerCase()}">${c.status}</span></td>
          <td>${pkt} (${c.durationMinutes || 45}m)</td>
          <td>${sc?.overallRating ? `★ ${sc.overallRating} / 5` : '—'}</td>
          <td>${rec}</td>
          <td style="font-size: 11px; max-width: 200px;">${sc?.interviewerNotes || c.notes || '—'}</td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 30px; color: #1f2937; line-height: 1.4; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 22px; font-weight: bold; color: #111827; }
          .subtitle { font-size: 13px; color: #4b5563; margin-top: 4px; }
          .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
          .stat-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
          .stat-num { font-size: 20px; font-weight: bold; color: #111827; }
          .stat-lbl { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
          th { background: #f3f4f6; color: #374151; font-weight: 600; text-align: left; padding: 8px 10px; border: 1px solid #e5e7eb; }
          td { padding: 8px 10px; border: 1px solid #e5e7eb; vertical-align: middle; }
          tr:nth-child(even) { background-color: #fafafa; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
          .badge-success { background: #d1fae5; color: #065f46; }
          .badge-warning { background: #fef3c7; color: #92400e; }
          .badge-danger { background: #fee2e2; color: #991b1b; }
          .status-pill { display: inline-block; padding: 2px 6px; border-radius: 9999px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
          .status-pending { background: #f3f4f6; color: #4b5563; }
          .status-scheduled { background: #dbeafe; color: #1e40af; }
          .status-interviewed { background: #e0e7ff; color: #3730a3; }
          .status-selected { background: #dcfce7; color: #166534; }
          .status-rejected { background: #ffe4e6; color: #9f1239; }
          @media print {
            body { margin: 15px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; display: flex; gap: 10px;">
          <button onclick="window.print()" style="padding: 8px 16px; background: #059669; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
            🖨️ Print / Save as PDF
          </button>
          <button onclick="window.close()" style="padding: 8px 16px; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
            Close
          </button>
        </div>

        <div class="header">
          <div>
            <div class="title">RecruitSync Pro — Executive Interview Schedule Report</div>
            <div class="subtitle">Generated on ${today} • Official HR &amp; Hiring Pipeline Summary</div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #6b7280;">
            <strong>Confidential HR Record</strong><br/>
            Company: Mihora Tech / RecruitSync
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-num">${total}</div>
            <div class="stat-lbl">Total Candidates</div>
          </div>
          <div class="stat-card">
            <div class="stat-num" style="color: #2563eb;">${scheduled}</div>
            <div class="stat-lbl">Scheduled</div>
          </div>
          <div class="stat-card">
            <div class="stat-num" style="color: #4f46e5;">${interviewed}</div>
            <div class="stat-lbl">Interviewed</div>
          </div>
          <div class="stat-card">
            <div class="stat-num" style="color: #059669;">${selected}</div>
            <div class="stat-lbl">Selected</div>
          </div>
          <div class="stat-card">
            <div class="stat-num" style="color: #dc2626;">${rejected}</div>
            <div class="stat-lbl">Rejected</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Candidate &amp; Contacts</th>
              <th>Position</th>
              <th>Track / Room</th>
              <th>Status</th>
              <th>Time (PKT) &amp; Duration</th>
              <th>Score</th>
              <th>Recommendation</th>
              <th>Notes / Feedback</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #9ca3af; text-align: center;">
          RecruitSync Talent Acquisition System • Automated report generated with verified Google Meet &amp; Calendar records.
        </div>
      </body>
    </html>
  `;

  try {
    const existingFrame = document.getElementById('recruit-sync-print-frame');
    if (existingFrame && existingFrame.parentNode) {
      existingFrame.parentNode.removeChild(existingFrame);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'recruit-sync-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 5000);
      }, 500);
    }
  } catch (err) {
    console.warn('Silent iframe print fallback notice:', err);
  }
}
