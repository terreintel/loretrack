'use strict';

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const multer   = require('multer');
const path     = require('path');
const { createClient } = require('@supabase/supabase-js');

const { transcribeAudio }      = require('./services/transcription');
const { categoriseTranscript } = require('./services/categorisation');
const { sendReport }           = require('./services/email');

// ── Validate required environment variables ──────────────────
const REQUIRED_VARS = [
  'GROQ_API_KEY',
  'ANTHROPIC_API_KEY',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
];
const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length) {
  console.error(`\n[LoreTrack] Missing required environment variables:\n  ${missing.join(', ')}\n`);
  process.exit(1);
}

// ── Supabase client ──────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
}));

app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^audio\//.test(file.mimetype)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

// ── Routes ───────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0-gbr' });
});

/**
 * POST /api/upload
 * Pipeline: Groq Whisper → Claude → Nodemailer → Supabase
 */
app.post('/api/upload', upload.single('audio'), async (req, res) => {
  try {
    const {
      workerName      = '',
      supervisorEmail = '',
      timestamp       = '',
    } = req.body;

    if (!supervisorEmail) {
      return res.status(400).json({ error: 'supervisorEmail is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file received' });
    }

    const { buffer, mimetype, originalname } = req.file;
    console.log(`[upload] Lead: "${workerName}" | File: ${originalname} (${buffer.length} bytes)`);

    // Step 1 — Transcribe with Groq Whisper
    console.log('[upload] Transcribing…');
    const transcript = await transcribeAudio(buffer, originalname, mimetype);
    console.log(`[upload] Transcript: "${transcript.slice(0, 80)}…"`);

    // Step 2 — Categorise with Claude (GBR schema)
    console.log('[upload] Categorising with Claude…');
    const report = await categoriseTranscript(transcript, workerName, timestamp);

    // Step 3 — Email report to supervisor
    console.log(`[upload] Emailing report to ${supervisorEmail}…`);
    await sendReport(report, supervisorEmail, transcript);

    // Step 4 — Persist to Supabase
    console.log('[upload] Saving to Supabase…');
    const { error: dbError } = await supabase.from('reports').insert({
      worker_name:             report.workerName            ?? workerName ?? null,
      region:                  report.region                ?? null,
      to_group:                report.toGroup               ?? null,
      engagement_type:         report.engagementType        ?? null,
      date:                    report.date                  ?? null,
      attendees:               report.attendees             ?? null,
      topics_discussed:        report.topicsDiscussed?.join(' | ')  ?? null,
      consent_status:          report.consentStatus         ?? null,
      consent_notes:           report.consentNotes          ?? null,
      cultural_protocol_notes: report.culturalProtocolNotes ?? null,
      follow_up_actions:       report.followUpActions?.join(' | ')  ?? null,
      next_contact:            report.nextContact           ?? null,
      incidents:               report.incidentsOrIssues?.join(' | ') ?? null,
      additional_notes:        report.additionalNotes       ?? null,
      raw_transcript:          transcript,
    });

    if (dbError) {
      // Log but don't fail — email already sent, data isn't lost
      console.error('[upload] Supabase insert error:', dbError.message);
    } else {
      console.log('[upload] Saved to Supabase.');
    }

    console.log('[upload] Done.');
    res.json({ transcript, report });

  } catch (err) {
    console.error('[upload] Error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * GET /api/reports
 * Returns all saved reports for supervisor dashboard.
 * Optional query params: ?region=Far+North+QLD&consent_status=Consented
 */
app.get('/api/reports', async (req, res) => {
  try {
    let query = supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (req.query.region)         query = query.eq('region', req.query.region);
    if (req.query.consent_status) query = query.eq('consent_status', req.query.consent_status);
    if (req.query.to_group)       query = query.ilike('to_group', `%${req.query.to_group}%`);
    if (req.query.worker_name)    query = query.eq('worker_name', req.query.worker_name);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[reports] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/reports/summary
 * Returns consent status counts by region — for DCCEEW reporting dashboard.
 */
app.get('/api/reports/summary', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('region, consent_status, to_group, worker_name, created_at');
    if (error) throw error;

    // Group by region and consent status
    const summary = data.reduce((acc, row) => {
      const region = row.region || 'Unknown';
      if (!acc[region]) acc[region] = { total: 0, byConsent: {}, groups: new Set() };
      acc[region].total++;
      acc[region].byConsent[row.consent_status || 'Not recorded'] =
        (acc[region].byConsent[row.consent_status || 'Not recorded'] || 0) + 1;
      if (row.to_group) acc[region].groups.add(row.to_group);
      return acc;
    }, {});

    // Convert Sets to counts for JSON serialisation
    Object.keys(summary).forEach(r => {
      summary[r].uniqueGroups = summary[r].groups.size;
      delete summary[r].groups;
    });

    res.json({ totalEngagements: data.length, byRegion: summary });
  } catch (err) {
    console.error('[summary] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Production static serving
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🌿 LoreTrack GBR server running on http://localhost:${PORT}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}\n`);
});