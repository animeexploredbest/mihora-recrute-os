import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import {
  initPostgresDatabase,
  getDbStatus,
  getDbCandidates,
  getDbCandidateById,
  createDbCandidate,
  updateDbCandidate,
  deleteDbCandidate,
  bulkInsertDbCandidates,
  getDbUserSettings,
  saveDbUserSettings,
  addDbCandidateActivity,
  registerDbUser,
  loginDbUser,
  getDbUserById,
  getDbUsers,
  syncSessionUser,
  verifyJwtToken,
} from './src/server/db';

async function startServer() {
  const app = express();
  // On Heroku, $PORT is dynamically provided; in local/AI Studio containers, defaults to 3000
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Initialize Heroku Postgres database if configured
  initPostgresDatabase().catch((err) => {
    console.error('[Heroku Postgres Init Error]:', err.message);
  });

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // JWT Authentication Enforcement Middleware for Protected Endpoints
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Valid Recruiter JWT Token required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyJwtToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired recruiter session' });
    }
    (req as any).user = decoded;
    next();
  };

  // Heroku / Postgres Database Health & Diagnostic Route
  app.get('/api/db/status', async (req, res) => {
    try {
      const status = await getDbStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Heroku Candidate CRUD API (Protected)
  app.get('/api/candidates', requireAuth, async (req, res) => {
    try {
      const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
      const candidates = await getDbCandidates(userId);
      res.json(candidates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/candidates/:id', requireAuth, async (req, res) => {
    try {
      const candidate = await getDbCandidateById(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      res.json(candidate);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/candidates', requireAuth, async (req, res) => {
    try {
      const candidate = await createDbCandidate(req.body);
      res.status(201).json(candidate);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/candidates/:id', requireAuth, async (req, res) => {
    try {
      const updated = await updateDbCandidate(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/candidates/:id', requireAuth, async (req, res) => {
    try {
      const success = await deleteDbCandidate(req.params.id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/candidates/bulk', requireAuth, async (req, res) => {
    try {
      const list = Array.isArray(req.body.candidates) ? req.body.candidates : [];
      const count = await bulkInsertDbCandidates(list);
      res.json({ count, success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/candidates/:id/activity', requireAuth, async (req, res) => {
    try {
      await addDbCandidateActivity(req.params.id, req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Heroku User Settings API (Protected)
  app.get('/api/settings/:userId', requireAuth, async (req, res) => {
    try {
      const settings = await getDbUserSettings(req.params.userId);
      res.json(settings || null);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/settings', requireAuth, async (req, res) => {
    try {
      const saved = await saveDbUserSettings(req.body);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk sync from Client (e.g. migrate Firestore data directly into Heroku Postgres)
  app.post('/api/db/sync-from-client', requireAuth, async (req, res) => {
    try {
      const { candidates = [] } = req.body;
      let count = 0;
      for (const cand of candidates) {
        await createDbCandidate(cand);
        count++;
      }
      const dbStatus = await getDbStatus();
      res.json({ success: true, count, dbStatus });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // POSTGRES RECRUITER AUTHENTICATION (JWT + BCRYPT)
  // ==========================================
  app.post('/api/auth/register', async (req, res) => {
    return res.status(403).json({
      error: 'Public registration is disabled. Only logged-in administrators can register new staff accounts by username and password from inside the portal.',
    });
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, username, identifier, password } = req.body;
      const targetIdentifier = identifier || username || email;
      if (!targetIdentifier || !password) {
        return res.status(400).json({ error: 'Username or email, and password are required.' });
      }
      const result = await loginDbUser({ identifier: targetIdentifier, email: targetIdentifier, password });
      res.json(result);
    } catch (err: any) {
      console.error('[Postgres Auth Login Error]:', err.message);
      res.status(401).json({ error: err.message || 'Authentication failed' });
    }
  });

  // Register staff (invoked exclusively by current logged-in authorized team members inside the app)
  app.post('/api/auth/register-staff', requireAuth, async (req, res) => {
    try {
      const { email, password, username, name, role } = req.body;
      const cleanName = (username || name || '').trim();
      if (!email || !password || !cleanName) {
        return res.status(400).json({ error: 'Username, email, and password are required.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }
      const result = await registerDbUser({ email, password, name: cleanName, role });
      res.status(201).json(result);
    } catch (err: any) {
      console.error('[Staff Register Error]:', err.message);
      res.status(400).json({ error: err.message || 'Registration failed' });
    }
  });

  // List all registered staff users (Protected)
  app.get('/api/auth/staff-users', requireAuth, async (req, res) => {
    try {
      const users = await getDbUsers();
      res.json({ users });
    } catch (err: any) {
      console.error('[Get Staff Users Error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authorization token provided' });
      }
      const token = authHeader.split(' ')[1];
      const decoded = verifyJwtToken(token);
      if (!decoded || !decoded.id) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const user = await getDbUserById(decoded.id);
      if (!user) {
        return res.status(404).json({ error: 'Recruiter account not found' });
      }
      res.json({ user });
    } catch (err: any) {
      console.error('[Postgres Auth Me Error]:', err.message);
      res.status(401).json({ error: 'Token verification failed' });
    }
  });

  app.post('/api/auth/session-token', async (req, res) => {
    try {
      const { email, name, id, avatar_url } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      const cleanEmail = email.trim().toLowerCase();
      const HARD_BLOCKED_EMAILS = ['zainabfatima25.g@gmail.com'];
      if (HARD_BLOCKED_EMAILS.includes(cleanEmail)) {
        return res.status(403).json({
          error: 'Access Denied: This account is permanently restricted.',
        });
      }
      const AUTHORIZED_ADMINS = [
        'spideraneesf@gmail.com',
        'omema19022026@gmail.com',
        'm.mattiulhasnain@gmail.com',
        'mihora.tech@gmail.com',
        'animeexploredbest@gmail.com',
      ];
      const isAdmin = AUTHORIZED_ADMINS.includes(cleanEmail);
      const userRole = isAdmin ? 'admin' : (req.body.role || 'lead_recruiter');
      const defaultName =
        cleanEmail === 'spideraneesf@gmail.com'
          ? 'Anees (Admin)'
          : cleanEmail === 'omema19022026@gmail.com'
          ? 'Omema (Lead Recruiter)'
          : cleanEmail === 'm.mattiulhasnain@gmail.com'
          ? 'M. Matti-ul-Hasnain (Admin)'
          : cleanEmail === 'mihora.tech@gmail.com'
          ? 'Mihora Tech (Admin)'
          : name || (cleanEmail ? cleanEmail.split('@')[0] : 'Recruiter');

      const result = await syncSessionUser({
        email: cleanEmail,
        name: defaultName,
        id,
        avatar_url,
        role: userRole as any,
      });
      res.json(result);
    } catch (err: any) {
      console.error('[Session Token Error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/email-config', (req, res) => {
    const user = (process.env.TITAN_EMAIL || '').trim();
    const hasPassword = Boolean(process.env.TITAN_PASSWORD);
    res.json({
      configured: Boolean(user && hasPassword),
      email: user || 'hr@mihora.tech',
      provider: 'Titan Mail (smtp.titan.email)',
    });
  });

  app.post('/api/send-email', async (req, res) => {
    const { to, cc, subject, text, html } = req.body;
    
    // Attempt to extract env vars properly whether running locally or deployed
    const user = (process.env.TITAN_EMAIL || '').trim();
    const pass = (process.env.TITAN_PASSWORD || '').trim();

    if (!user || !pass) {
      return res.status(200).json({
        success: false,
        error: 'Titan email credentials not configured in environment variables (TITAN_EMAIL, TITAN_PASSWORD).',
        fallbackRequired: true,
      });
    }

    const normalizedUser = user.toLowerCase();

    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.titan.email',
        port: 465,
        secure: true,
        auth: { user: normalizedUser, pass },
        tls: { rejectUnauthorized: false },
      });

      const mailOptions: any = {
        from: `"Mihora Tech HR" <${normalizedUser}>`,
        to,
        subject,
        text,
        replyTo: normalizedUser,
      };

      if (html) {
        mailOptions.html = html;
      }

      if (cc) {
        mailOptions.cc = cc;
      }

      const info = await transporter.sendMail(mailOptions);

      console.log(`[SMTP] Successfully dispatched email from ${normalizedUser} to ${to} (Message ID: ${info.messageId})`);
      res.json({ success: true, messageId: info.messageId, sender: normalizedUser });
    } catch (error: any) {
      const isAuthError =
        error?.code === 'EAUTH' ||
        error?.responseCode === 535 ||
        String(error?.message).includes('535') ||
        String(error?.message).toLowerCase().includes('authentication failed');

      if (isAuthError) {
        console.warn(`[SMTP Dispatch Notice] Titan Mail SMTP authentication failed (535): ${error.message}. Routing fallback to connected Gmail API / Webmail.`);
        return res.status(200).json({
          success: false,
          error: 'Titan Mail SMTP authentication failed (Invalid login 535). Falling back to connected Google Account / Webmail.',
          code: 'SMTP_AUTH_FAILED',
          fallbackRequired: true,
        });
      }

      console.warn('[SMTP Dispatch Warning]:', error.message || error);
      res.status(200).json({
        success: false,
        error: error.message || 'SMTP dispatch error',
        fallbackRequired: true,
      });
    }
  });

  app.post('/api/analyze-resume', async (req, res) => {
    const { text, fileBase64, mimeType } = req.body;
    
    if (!text && !fileBase64) {
      return res.status(400).json({ error: 'Resume text or document file is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured.' });
    }

    const callGeminiWithFallback = async (contents: any, config?: any): Promise<string> => {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const modelsToTry = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
      let lastErr: any = null;

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config,
          });
          if (response && response.text) {
            return response.text;
          }
        } catch (err: any) {
          lastErr = err;
          console.warn(`[Gemini Model ${model}]:`, err?.message || err);
          // Seamlessly proceed to next fallback model on any error (quota, 429, 503, etc.)
          continue;
        }
      }
      throw lastErr || new Error('Gemini API call failed across available models.');
    };

    try {
      const prompt = `
Analyze the provided candidate resume and extract all key candidate information.
Return ONLY a valid JSON object matching the following schema, and nothing else (no markdown wrapping, no extra keys outside schema).

{
  "name": "Full Name",
  "email": "Email Address",
  "phone": "Phone Number",
  "country": "Country of candidate residence or origin (e.g. Pakistan, United States, United Kingdom, United Arab Emirates, Saudi Arabia, Germany, Canada, India, Australia, etc.)",
  "city": "City or State if mentioned",
  "timezone": "Standard IANA timezone string for their location or residence (e.g. America/New_York, Europe/London, Asia/Karachi, Asia/Dubai, Asia/Kolkata, Australia/Sydney, etc.)",
  "position": "Job Title / Role they are applying for or best fit for",
  "summary": "A brief 2-sentence summary of the candidate's profile.",
  "skills": "Comma-separated list of top 5-7 technical skills",
  "rating": "A number from 1 to 10 rating their overall technical strength based on the resume"
}
`;

      const contents: any[] = [];
      if (fileBase64 && mimeType) {
        contents.push({
          inlineData: {
            mimeType: mimeType || 'application/pdf',
            data: fileBase64,
          },
        });
        contents.push({ text: prompt });
      } else {
        contents.push({ text: `${prompt}\n\nResume Text:\n${text}` });
      }

      const rawText = await callGeminiWithFallback(contents, {
        responseMimeType: 'application/json',
      });

      const cleaned = (rawText || '{}').replace(/```json/gi, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleaned);
      res.json(data);
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/bulk-analyze', async (req, res) => {
    const { text, fileBase64, mimeType } = req.body;
    if (!text && !fileBase64) {
      return res.status(400).json({ error: 'Bulk text or document file is required.' });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured.' });

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptText = `
Extract a list of candidates from the provided content (which might be resumes, a spreadsheet export, WhatsApp messages, email threads, or raw notes).
For each candidate:
1. Extract their name, email, phone, city, country, and detect standard IANA timezone (e.g. Asia/Karachi, America/New_York, Europe/London, Asia/Dubai, etc.).
2. Extract job title / role, 1-2 sentence profile summary, technical skills list, and technical rating (1-10).
3. If the content contains any mentions of availability or dates/time (e.g. "Available on Tuesday at 3 PM EST"), extract that into 'originalAvailability'.
4. Then, convert that mentioned time into Pakistan Standard Time (PKT / UTC+5) in ISO 8601 format and put it in 'suggestedPktTime'. If no time is mentioned, leave suggestedPktTime empty.

Return ONLY a valid JSON Array of objects matching this schema exactly, with no markdown formatting or extra text:

[
  {
    "name": "Full Name (fallback to 'Unknown Name')",
    "email": "Email Address (fallback to '')",
    "phone": "Phone Number (fallback to '')",
    "country": "Country name (e.g. Pakistan, United States, United Kingdom, etc.)",
    "city": "City name if mentioned (fallback to '')",
    "timezone": "Standard IANA timezone (e.g. Asia/Karachi, America/New_York, Europe/London, etc.)",
    "position": "Job Title / Role (fallback to 'Software Engineer')",
    "summary": "1-2 sentence summary of their profile",
    "skills": "Comma-separated list of top technical skills",
    "rating": 8,
    "originalAvailability": "Raw text of their availability/time mentioned (fallback to 'Flexible')",
    "suggestedPktTime": "ISO 8601 Date string converted to PKT timezone. Leave empty if no time mentioned."
  }
]
${text ? `\nContent:\n${text}` : ''}
`;

      const contents: any = fileBase64
        ? [
            {
              inlineData: {
                data: fileBase64,
                mimeType: mimeType || 'application/pdf',
              },
            },
            promptText,
          ]
        : promptText;

      const modelsToTry = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
      let rawText = '';
      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config: { responseMimeType: 'application/json' },
          });
          if (response && response.text) {
            rawText = response.text;
            break;
          }
        } catch (mErr: any) {
          console.warn(`[Bulk Gemini ${model} error]:`, mErr?.message);
        }
      }

      if (!rawText) {
        return res.status(500).json({ error: 'AI bulk extraction service unavailable.' });
      }

      const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleanedText);
      res.json(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Bulk Gemini API Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/generate-questions', async (req, res) => {
    const { position, skills, summary } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // Smart fallback question set based on role and skills
    const role = position || 'Software Engineer';
    const techSkills = skills || 'Core Software Engineering';
    const fallbackQuestions = [
      `Can you give an overview of your hands-on background and key projects as a ${role}?`,
      `How do you approach system architecture, clean coding practices, and testing with ${techSkills}?`,
      `Describe a challenging technical bug or system bottleneck you encountered and how you solved it.`,
      `How do you manage communication, hand-offs, and timezone coordination in distributed engineering teams?`,
      `What criteria do you use to evaluate trade-offs between delivery speed and long-term architectural maintainability?`,
    ];

    if (!apiKey) {
      return res.json(fallbackQuestions);
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      
      const prompt = `
You are an expert technical interviewer. Generate 5 highly targeted, practical interview questions for a candidate based on their profile.
Role/Position: ${role}
Candidate Skills: ${techSkills}
Candidate Summary: ${summary || 'Experienced professional'}

Return ONLY a valid JSON Array of Strings, where each string is a single question. No markdown formatting.
["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]
`;

      const modelsToTry = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
      let questions: string[] = [];

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: 'application/json' },
          });
          const rawText = response.text || '[]';
          const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            questions = parsed;
            break;
          }
        } catch (mErr: any) {
          console.warn(`[Gemini Questions ${model} error]:`, mErr?.message);
        }
      }

      if (questions.length === 0) {
        questions = fallbackQuestions;
      }
      res.json(questions);
    } catch (error: any) {
      console.error('Gemini Generate Questions Error:', error);
      res.json(fallbackQuestions);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: !isHmrDisabled },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For Express 4
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
