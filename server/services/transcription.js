'use strict';

const Groq = require('groq-sdk');

let groq;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

/**
 * Transcribe an audio buffer using Groq's Whisper API.
 *
 * @param {Buffer} buffer      - Raw audio bytes
 * @param {string} filename    - Original filename (e.g. "recording.webm")
 * @param {string} mimeType    - MIME type (e.g. "audio/webm")
 * @returns {Promise<string>}  - Transcript text
 */
async function transcribeAudio(buffer, filename, mimeType) {
  // Node.js 20+ provides a global File constructor.
  // We wrap the Buffer in a File so the Groq SDK can read it.
  const safeFilename = filename || 'recording.webm';
  const safeMime = mimeType || 'audio/webm';

  const file = new File([buffer], safeFilename, { type: safeMime });

  const result = await getGroq().audio.transcriptions.create({
    file,
    model: 'whisper-large-v3',
    response_format: 'text',
    language: 'en',
  });

  // The SDK returns a plain string when response_format is 'text'
  return typeof result === 'string' ? result : result.text ?? '';
}

module.exports = { transcribeAudio };
