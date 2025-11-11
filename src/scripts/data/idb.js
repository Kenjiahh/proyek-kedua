// Minimal IndexedDB helpers (no external libs)
const DB_NAME = 'story-app';
const DB_VERSION = 2; // Bumped to 2 to trigger onupgradeneeded for existing databases
const STORE_STORIES = 'stories';
const STORE_SAVED_STORIES = 'saved_stories';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      // Create stories store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_STORIES)) {
        const store = db.createObjectStore(STORE_STORIES, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      // Create saved_stories store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_SAVED_STORIES)) {
        const savedStore = db.createObjectStore(STORE_SAVED_STORIES, { keyPath: 'id' });
        savedStore.createIndex('savedAt', 'savedAt', { unique: false });
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
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function clearStories() {
  const db = await openDb();
  const tx = db.transaction(STORE_STORIES, 'readwrite');
  tx.objectStore(STORE_STORIES).clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getAllStories() {
  const db = await openDb();
  const tx = db.transaction(STORE_STORIES, 'readonly');
  const store = tx.objectStore(STORE_STORIES);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// New functions for saved stories (user-initiated save)
export async function saveStory(story) {
  const db = await openDb();
  const tx = db.transaction(STORE_SAVED_STORIES, 'readwrite');
  const store = tx.objectStore(STORE_SAVED_STORIES);
  const savedStory = {
    ...story,
    savedAt: new Date().toISOString(),
  };
  store.put(savedStory);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve(savedStory);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function deleteSavedStory(storyId) {
  const db = await openDb();
  const tx = db.transaction(STORE_SAVED_STORIES, 'readwrite');
  const store = tx.objectStore(STORE_SAVED_STORIES);
  store.delete(storyId);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getAllSavedStories() {
  const db = await openDb();
  const tx = db.transaction(STORE_SAVED_STORIES, 'readonly');
  const store = tx.objectStore(STORE_SAVED_STORIES);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function isStorySaved(storyId) {
  const db = await openDb();
  const tx = db.transaction(STORE_SAVED_STORIES, 'readonly');
  const store = tx.objectStore(STORE_SAVED_STORIES);
  const request = store.get(storyId);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      db.close();
      resolve(!!request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function clearSavedStories() {
  const db = await openDb();
  const tx = db.transaction(STORE_SAVED_STORIES, 'readwrite');
  tx.objectStore(STORE_SAVED_STORIES).clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

// Helper function to clear the entire database (for fresh start)
export async function clearDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => {
      console.log('Database cleared successfully');
      resolve();
    };
    request.onerror = () => {
      console.error('Failed to clear database:', request.error);
      reject(request.error);
    };
  });
}


