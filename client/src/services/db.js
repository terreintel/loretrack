import { openDB } from 'idb';

const DB_NAME = 'loretrack';
const DB_VERSION = 1;
const STORE = 'recordings';

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE, {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.createIndex('status', 'status');
    },
  });
}

/**
 * Save a new recording to IndexedDB.
 * @param {Object} data - { blob, mimeType, workerName, supervisorEmail }
 * @returns {Promise<number>} The new record's id
 */
export async function saveRecording(data) {
  const db = await getDB();
  return db.add(STORE, {
    ...data,
    status: 'pending',
    timestamp: Date.now(),
  });
}

/**
 * Get all recordings, newest first.
 */
export async function getAllRecordings() {
  const db = await getDB();
  const all = await db.getAll(STORE);
  return all.reverse();
}

/**
 * Get all recordings with status 'pending'.
 */
export async function getPendingRecordings() {
  const db = await getDB();
  return db.getAllFromIndex(STORE, 'status', 'pending');
}

/**
 * Update a recording's status and optionally merge extra fields.
 * @param {number} id
 * @param {'pending'|'uploading'|'done'|'error'} status
 * @param {Object} extra - e.g. { report, error }
 */
export async function updateRecordingStatus(id, status, extra = {}) {
  const db = await getDB();
  const record = await db.get(STORE, id);
  if (!record) return;
  await db.put(STORE, { ...record, status, ...extra });
}

/**
 * Delete a recording by id.
 */
export async function deleteRecording(id) {
  const db = await getDB();
  return db.delete(STORE, id);
}
