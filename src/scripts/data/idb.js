// Minimal IndexedDB helpers (no external libs)
const DB_NAME = 'story-app';
const DB_VERSION = 1;
const STORE_STORIES = 'stories';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_STORIES)) {
        const store = db.createObjectStore(STORE_STORIES, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putStories(stories = []) {
  const db = await openDb();
  const tx = db.transaction(STORE_STORIES, 'readwrite');
  const store = tx.objectStore(STORE_STORIES);
  for (const story of stories) {
    store.put(story);
  }
  await tx.complete;
  db.close();
}

export async function clearStories() {
  const db = await openDb();
  const tx = db.transaction(STORE_STORIES, 'readwrite');
  tx.objectStore(STORE_STORIES).clear();
  await tx.complete;
  db.close();
}

export async function getAllStories() {
  const db = await openDb();
  const tx = db.transaction(STORE_STORIES, 'readonly');
  const store = tx.objectStore(STORE_STORIES);
  const request = store.getAll();
  const result = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}


