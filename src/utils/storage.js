import localforage from 'localforage';

// Configure localforage instance
localforage.config({
  name: 'time-tracker',
  storeName: 'tt_store',
});

/**
 * Save a value to localforage (async, fire-and-forget safe).
 */
export async function saveData(key, val) {
  try {
    await localforage.setItem(key, val);
  } catch (e) {
    console.error('[storage] saveData error', key, e);
  }
}

/**
 * Load multiple keys from localforage.
 * Returns an object { key: value } with null for missing keys.
 */
export async function loadAllData(keys) {
  const result = {};
  await Promise.all(keys.map(async (k) => {
    try {
      result[k] = await localforage.getItem(k);
    } catch {
      result[k] = null;
    }
  }));
  return result;
}

// ---- Legacy synchronous helpers (for AdminSettings which still uses them) ----

export const loadJSON = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

export const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));
