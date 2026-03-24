'use strict';

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const multer   = require('multer');
const path     = require('path');

const { transcribeAudio }    = require('./services/transcription');
const { categoriseTranscript } = require('./services/categorisation');
const { sendReport }           = require('./services/email');

// ── Validate required environment variables ──────────────────
const REQUIRED_VARS = ['GROQ_API_KEY', 'ANTHROPIC_API_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length) {
  console.error(`\n[LoreTrack] Missing required environment variables:\n  ${missing.join(', ')}\n`);
  console.error('Copy .env.example to server/.env and fill in your values.\n');
  process.exit(1);
}

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// Multer: store uploaded audio in memory (no temp files needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /^audio\//;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// ── Routes ───────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

/**
 * POST /api/upload
 * Accepts: multipart/form-data
 *   audio          - audio file (webm, mp4, ogg, etc.)
 *   workerName     - string
 *   supervisorEmail - string (required)
 *   timestamp      - Unix ms string
 *
 * Pipeline: Groq Whisper → Claude → Nodemailer
 * Returns:  { transcript, report }
 */
app.post('/api/upload', upload.single('audio'), async (req, res) => {
  try {
    const { workerName = '', supervisorEmail = '', timestamp = '' } = req.body;

    if (!supervisorEmail) {
      return res.status(400).json({ error: 'supervisorEmail is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file received' });
    }

    const { buffer, mimetype, originalname } = req.file;

    console.log(`[upload] Worker: "${workerName}" | File: ${originalname} (${buffer.length} bytes)`);

    // Step 1 – Transcribe with Groq Whisper
    console.log('[upload] Transcribing…');
    const transcript = await transcribeAudio(buffer, originalname, mimetype);
    console.log(`[upload] Transcript: "${transcript.slice(0, 80)}…"`);

    // Step 2 – Categorise with Claude
    console.log('[upload] Categorising with Claude…');
    const report = await categoriseTranscript(transcript, workerName, timestamp);

    // Step 3 – Email report to supervisor
    console.log(`[upload] Emailing report to ${supervisorEmail}…`);
    await sendReport(report, supervisorEmail, transcript);

    console.log('[upload] Done.');
    res.json({ transcript, report });

  } catch (err) {
    console.error('[upload] Error:', err.message);
    // Send a clean error message to the client
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// In production, serve the built React client
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ── Error handler ────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌿 LoreTrack server running on http://localhost:${PORT}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}\n`);
});
