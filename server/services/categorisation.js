'use strict';

const Anthropic = require('@anthropic-ai/sdk');

let client;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const SYSTEM_PROMPT = `You are a field reporting assistant for an Aboriginal community farm program in Australia.
Your job is to read a voice-to-text transcript from a field worker and extract structured information.

Rules:
- Always respond with ONLY a valid JSON object. No markdown fences, no commentary.
- If a piece of information is not mentioned in the transcript, use null for that field.
- For arrays (tasks, incidents), use an empty array [] if nothing was mentioned.
- Be respectful and culturally appropriate. Use the exact terms "Indigenous" and "non-Indigenous" where relevant.
- Date format: DD/MM/YYYY`;

const USER_PROMPT = (transcript, workerName, date) => `
Worker name (from app settings, may be overridden by transcript): ${workerName || 'Not provided'}
Report date: ${date}

Transcript:
"""
${transcript}
"""

Extract and return a JSON object with EXACTLY these fields:
{
  "workerName": "string | null",
  "date": "string (DD/MM/YYYY) | null",
  "hoursWorked": "string | null  (e.g. '8 hours', '7.5 hours')",
  "tasksCompleted": ["array of concise task descriptions"],
  "incidentsOrIssues": ["array of incident/issue descriptions, empty if none"],
  "staffSummary": {
    "totalHoursAllStaff": "string | null",
    "totalHoursIndigenousStaff": "string | null",
    "maleStaffCount": "number | null",
    "femaleStaffCount": "number | null",
    "otherNotes": "string | null"
  },
  "additionalNotes": "string | null"
}
`.trim();

/**
 * Use Claude to categorise a transcript into the structured report format.
 *
 * @param {string} transcript
 * @param {string} workerName
 * @param {string|number} timestamp  - Unix ms timestamp
 * @returns {Promise<Object>}        - Parsed report object
 */
async function categoriseTranscript(transcript, workerName, timestamp) {
  const date = timestamp
    ? new Date(Number(timestamp)).toLocaleDateString('en-AU')
    : new Date().toLocaleDateString('en-AU');

  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

  const message = await getClient().messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: USER_PROMPT(transcript, workerName, date),
      },
    ],
  });

  const raw = message.content[0]?.text?.trim() ?? '';

  // Extract the JSON object from the response (handles any stray whitespace)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Claude did not return valid JSON. Raw response: ${raw.slice(0, 200)}`);
  }

  return JSON.parse(jsonMatch[0]);
}

module.exports = { categoriseTranscript };
