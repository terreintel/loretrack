'use strict';
const Anthropic = require('@anthropic-ai/sdk');
let client;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const SYSTEM_PROMPT = `You are a field engagement reporting assistant for the Great Barrier Reef Traditional Owner-Led Water Quality Improvement Program (ATM_2025_5550), delivered by Nirrwara Global.

Your job is to read a voice-to-text transcript from a Regional Engagement Lead and extract structured information about their engagement with Traditional Owner groups across the Great Barrier Reef corridor.

Rules:
- Always respond with ONLY a valid JSON object. No markdown fences, no commentary.
- If a piece of information is not mentioned in the transcript, use null for that field.
- For arrays, use an empty array [] if nothing was mentioned.
- Be respectful and culturally appropriate. Never record sensitive cultural knowledge shared in confidence.
- Consent status must be one of: "Not yet approached", "Initial contact made", "In deliberation", "Consented", "Declined", "Withdrawn", or null if not mentioned.
- Engagement type must be one of: "On-Country visit", "Phone/video call", "Community forum", "Regional forum", "Advisory Group meeting", "Working Group meeting", "Other", or null.
- Capability pathway must be one of: "Crawl", "Walk", "Run", or null if not assessed.
- Date format: DD/MM/YYYY`;

const USER_PROMPT = (transcript, workerName, date) => `
Regional Engagement Lead (from app settings): ${workerName || 'Not provided'}
Report date: ${date}

Transcript:
"""
${transcript}
"""

Extract and return a JSON object with EXACTLY these fields:

{
  "workerName": "string | null",
  "date": "string (DD/MM/YYYY) | null",
  "region": "one of: Far North QLD and Torres Strait | North Queensland | Central Queensland | Southern Queensland | null",
  "toGroup": "string | null — name of the Traditional Owner group engaged",
  "engagementType": "string | null — see rules above",
  "attendees": "string | null — who was present (roles/titles only, not full names unless offered by speaker)",
  "topicsDiscussed": ["array of topics covered in the engagement"],
  "consentStatus": "string | null — see rules above",
  "consentNotes": "string | null — any conditions, questions raised, or timeline for decision",
  "culturalProtocolNotes": "string | null — sorry business, seasonal access, preferred contact method, cultural obligations noted",
  "followUpActions": ["array of follow-up actions with owner if mentioned"],
  "nextContact": "string | null — when and how next contact is planned",
  "incidentsOrIssues": ["array of any issues, conflicts or concerns raised"],
  "additionalNotes": "string | null"
}
`.trim();

async function categoriseTranscript(transcript, workerName, timestamp) {
  const date = timestamp
    ? new Date(Number(timestamp)).toLocaleDateString('en-AU')
    : new Date().toLocaleDateString('en-AU');

  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
  const message = await getClient().messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: USER_PROMPT(transcript, workerName, date) }],
  });

  const raw = message.content[0]?.text?.trim() ?? '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Claude did not return valid JSON. Raw response: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(jsonMatch[0]);
}

module.exports = { categoriseTranscript };