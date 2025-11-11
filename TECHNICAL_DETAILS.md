# Technical Implementation Details

## 1. Timeout Request API Improvement

### Before
```javascript
static async _fetchWithTimeout(url, options = {}, timeout = 8000) {
  // 8 detik - sering timeout untuk upload file
}
```

### After
```javascript
static async _fetchWithTimeout(url, options = {}, timeout = 30000) {
  // 30 detik - cukup untuk upload file besar
}
```

### Implementation Detail
```javascript
static async _fetchWithTimeout(url, options = {}, timeout = 30000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    throw error;
  }
}
```

**Keuntungan:**
- Menggunakan AbortController untuk proper cleanup
- Tidak ada memory leak dari setTimeout
- Timeout yang lebih fleksibel

---

## 2. Push Notification System

### Architecture

```
┌─────────────────────────────────┐
│   Browser/Client                │
├─────────────────────────────────┤
│  1. User Click Enable Button    │
│  2. Request Permission          │
│  3. Subscribe to Push Service   │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   Service Worker                │
├─────────────────────────────────┤
│  - Store Subscription           │
│  - Handle Push Event            │
│  - Show Notification            │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   API Server                    │
├─────────────────────────────────┤
│  - POST /subscribe              │
│  - Store Subscription Data      │
│  - Send Push When Story Added   │
│  - POST /unsubscribe            │
└─────────────────────────────────┘
```

### Implementation Code

#### 1. Subscribe Method
```javascript
static async subscribeToNotifications() {
  try {
    // Check Service Worker support
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    const registration = await navigator.serviceWorker.ready;

    // Request permission
    if (Notification.permission === 'denied') {
      throw new Error('Notification permission denied');
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }
    }

    // Get or create subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      const vapidPublicKey = CONFIG.VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    // Send to API
    const token = this.getToken();
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await this._fetchWithTimeout(
      API_ENDPOINT.SUBSCRIBE,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(subscription),
      }
    );

    const responseJson = await response.json();

    if (!response.ok) {
      throw new Error(responseJson.message || 'Failed to subscribe');
    }

    // Persist subscription status
    localStorage.setItem('notificationSubscribed', 'true');
    
    return responseJson;
  } catch (error) {
    console.error('Subscription error:', error);
    throw error;
  }
}
```

#### 2. VAPID Key Conversion
```javascript
static _urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

**Penjelasan:**
- VAPID key dikirim dalam format base64url
- Harus dikonversi ke Uint8Array untuk subscribeToNotifications()
- Padding ditambah jika perlu

#### 3. Unsubscribe Method
```javascript
static async unsubscribeFromNotifications() {
  try {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('No subscription to unsubscribe from');
      return;
    }

    // Unsubscribe locally
    await subscription.unsubscribe();

    // Notify backend
    const token = this.getToken();
    if (token) {
      await this._fetchWithTimeout(
        API_ENDPOINT.UNSUBSCRIBE,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(subscription),
        }
      );
    }

    localStorage.removeItem('notificationSubscribed');
  } catch (error) {
    console.error('Unsubscription error:', error);
    throw error;
  }
}
```

---

## 3. IndexedDB Implementation

### Database Schema

```
Database: story-app (version 1)
├── Object Store: "stories"
│   ├── Key Path: id
│   └── Index: createdAt
│
└── Object Store: "saved_stories"
    ├── Key Path: id
    └── Index: savedAt
```

### Detailed Implementation

#### 1. Database Initialization
```javascript
const DB_NAME = 'story-app';
const DB_VERSION = 1;
const STORE_STORIES = 'stories';
const STORE_SAVED_STORIES = 'saved_stories';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      
      // Cache store
      if (!db.objectStoreNames.contains(STORE_STORIES)) {
        const store = db.createObjectStore(STORE_STORIES, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      
      // Saved stories store
      if (!db.objectStoreNames.contains(STORE_SAVED_STORIES)) {
        const savedStore = db.createObjectStore(STORE_SAVED_STORIES, { 
          keyPath: 'id' 
        });
        savedStore.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

#### 2. Save Story Method
```javascript
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
```

**Penjelasan:**
- `saveStory()` menyimpan story dengan timestamp
- Menggunakan transaction untuk data consistency
- Promise-based API untuk async handling

#### 3. Delete Saved Story Method
```javascript
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
```

#### 4. Get All Saved Stories Method
```javascript
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
```

### UI Implementation

#### 1. Tab Navigation
```javascript
_switchView() {
  const storiesViewBtn = document.getElementById('btnStoriesView');
  const savedViewBtn = document.getElementById('btnSavedView');
  const mapElement = document.getElementById('map');
  const sectionTitle = document.getElementById('sectionTitle');

  if (this.currentView === 'stories') {
    // Show all stories with map
    storiesViewBtn?.classList.add('tab-active');
    savedViewBtn?.classList.remove('tab-active');
    storiesViewBtn?.style.borderBottom = '3px solid #007bff';
    savedViewBtn?.style.borderBottom = '3px solid transparent';
    if (mapElement) mapElement.style.display = 'block';
    if (sectionTitle) sectionTitle.textContent = 'Latest Stories';
    this._displayStories(this.stories);
  } else {
    // Show saved stories without map
    storiesViewBtn?.classList.remove('tab-active');
    savedViewBtn?.classList.add('tab-active');
    storiesViewBtn?.style.borderBottom = '3px solid transparent';
    savedViewBtn?.style.borderBottom = '3px solid #007bff';
    if (mapElement) mapElement.style.display = 'none';
    if (sectionTitle) sectionTitle.textContent = 'Saved Stories';
    this._displaySavedStories(this.savedStories);
  }
}
```

#### 2. Display Stories with Save Button
```javascript
_displayStories(stories) {
  const container = document.getElementById('storiesContainer');
  
  if (!stories || stories.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No stories available</p>
        <a href="#/add-story" class="btn-primary">Create First Story</a>
      </div>
    `;
    return;
  }

  container.innerHTML = stories.map(story => `
    <article class="story-card">
      <img src="${story.photoUrl}" alt="${story.description}" loading="lazy">
      <div class="story-content">
        <h3>${story.name}</h3>
        <p>${story.description}</p>
        ${story.lat && story.lon ? 
          `<p class="location">📍 ${story.lat}, ${story.lon}</p>` 
          : ''}
        <p class="date">${new Date(story.createdAt).toLocaleDateString()}</p>
        <div style="margin-top:10px;">
          <button class="btn-save-story" data-story-id="${story.id}" 
            style="padding:8px 16px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;">
            ✓ Save Story
          </button>
        </div>
      </div>
    </article>
  `).join('');

  // Attach event listeners
  container.querySelectorAll('.btn-save-story').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const storyId = e.target.getAttribute('data-story-id');
      const story = stories.find(s => s.id === storyId);
      try {
        await saveStory(story);
        e.target.textContent = '✓ Saved!';
        e.target.style.background = '#6c757d';
        e.target.disabled = true;
        alert('Story saved to your collection!');
        await this._loadSavedStories();
      } catch (error) {
        console.error('Failed to save story:', error);
        alert(`Error: ${error.message}`);
      }
    });
  });
}
```

#### 3. Display Saved Stories with Delete Button
```javascript
_displaySavedStories(stories) {
  const container = document.getElementById('storiesContainer');
  
  if (!stories || stories.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>You haven't saved any stories yet</p>
        <button id="btnGoToStories" type="button" class="btn-primary">
          Browse Stories
        </button>
      </div>
    `;
    const goBtn = document.getElementById('btnGoToStories');
    if (goBtn) {
      goBtn.addEventListener('click', () => {
        this.currentView = 'stories';
        this._switchView();
      });
    }
    return;
  }

  container.innerHTML = stories.map(story => `
    <article class="story-card">
      <img src="${story.photoUrl}" alt="${story.description}" loading="lazy">
      <div class="story-content">
        <h3>${story.name}</h3>
        <p>${story.description}</p>
        ${story.lat && story.lon ? 
          `<p class="location">📍 ${story.lat}, ${story.lon}</p>` 
          : ''}
        <p class="date">Saved on: ${new Date(story.savedAt).toLocaleDateString()}</p>
        <div style="margin-top:10px;">
          <button class="btn-delete-story" data-story-id="${story.id}" 
            style="padding:8px 16px;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;">
            🗑 Delete from Saved
          </button>
        </div>
      </div>
    </article>
  `).join('');

  // Attach event listeners
  container.querySelectorAll('.btn-delete-story').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const storyId = e.target.getAttribute('data-story-id');
      if (confirm('Delete this story from saved?')) {
        try {
          await deleteSavedStory(storyId);
          alert('Story removed!');
          await this._loadSavedStories();
          this._displaySavedStories(this.savedStories);
        } catch (error) {
          console.error('Failed to delete:', error);
          alert(`Error: ${error.message}`);
        }
      }
    });
  });
}
```

---

## Performance Considerations

### 1. Timeout
- **Before:** 8s dapat menyebabkan request timeout
- **After:** 30s memberikan cukup waktu untuk upload file besar
- **Trade-off:** User harus menunggu lebih lama jika server tidak merespons

### 2. Push Notification
- **Overhead:** Minimal - hanya subscribe/unsubscribe saat user interact
- **Storage:** Push subscription disimpan di IndexedDB browser
- **Network:** Hanya POST request saat subscribe/unsubscribe

### 3. IndexedDB
- **Storage Limit:** Biasanya 50MB per domain
- **Performance:** Synchronous operations di worker thread
- **Persistence:** Data tetap setelah browser close
- **Cleanup:** Belum ada automatic cleanup strategy (dapat ditambah di masa depan)

---

## Error Handling

### 1. Timeout Error
```javascript
try {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(url, { ...options, signal: controller.signal });
  clearTimeout(timeoutId);
  return response;
} catch (error) {
  if (error.name === 'AbortError') {
    throw new Error('Request timeout - please try again');
  }
  throw error;
}
```

### 2. Push Notification Error
```javascript
try {
  // Subscribe logic
} catch (error) {
  console.error('Subscription error:', error);
  // User-friendly message
  alert(`Error: ${error.message}`);
  throw error;
}
```

### 3. IndexedDB Error
```javascript
return new Promise((resolve, reject) => {
  tx.onsuccess = () => {
    db.close();
    resolve();
  };
  tx.onerror = () => {
    db.close();
    reject(tx.error); // Proper error propagation
  };
});
```

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Fetch with AbortController | ✅ 66+ | ✅ 55+ | ✅ 11.1+ | ✅ 16+ |
| Service Worker | ✅ 40+ | ✅ 44+ | ✅ 11.1+ | ✅ 17+ |
| Web Push | ✅ 50+ | ✅ 48+ | ❌ | ✅ 17+ |
| IndexedDB | ✅ 24+ | ✅ 16+ | ✅ 10+ | ✅ 12+ |

---

## Future Improvements

1. **Push Notification:**
   - Add backend-side subscription management
   - Implement notification analytics
   - Add rich notification with images

2. **IndexedDB:**
   - Add automatic cleanup for old stories
   - Implement offline-first sync strategy
   - Add data versioning/migration

3. **Performance:**
   - Implement request retry logic
   - Add progressive upload for large files
   - Add background sync for failed operations
