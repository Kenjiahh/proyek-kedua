# Quick Reference Guide - Perbaikan Submission

## TL;DR (Too Long; Didn't Read)

Tiga perbaikan utama telah dilakukan untuk memenuhi feedback reviewer:

### 1. ⏱️ Timeout Request (8s → 30s)
- **File:** `src/scripts/data/api.js`
- **Method:** `_fetchWithTimeout()`
- **Masalah:** Upload file timeout
- **Solusi:** Tingkatkan timeout dari 8000ms menjadi 30000ms

### 2. 🔔 Push Notification
- **Files:** `src/scripts/data/api.js`, `src/scripts/data/config.js`, `src/scripts/pages/home/home-page.js`
- **Fitur:** Subscribe/unsubscribe dengan UI button
- **Cara Kerja:** User klik "Enable Notifications" → Permission → Terima notifikasi

### 3. 💾 IndexedDB dengan UI
- **Files:** `src/scripts/data/idb.js`, `src/scripts/pages/home/home-page.js`, `src/scripts/pages/story/add-story-page.js`
- **Fitur:** Tab "All Stories" dan "Saved Stories"
- **Cara Kerja:** Klik "Save Story" → Story tersimpan → Lihat di tab "Saved Stories"

---

## 🚀 Quick Start Testing

### Test 1: Timeout (Upload File Besar)
```
1. Go to Add Story page
2. Upload file > 5MB
3. Should not timeout ✅
```

### Test 2: Push Notification
```
1. Click "Enable Notifications" di home
2. Grant permission
3. From other account, add story
4. Should see notification ✅
```

### Test 3: Saved Stories
```
1. Click "Save Story" di home
2. Click "Saved Stories" tab
3. Should see saved story ✅
4. Disconnect internet
5. Saved story still visible ✅
```

---

## 📁 File Changes Quick Reference

```
src/scripts/data/
├── api.js              ← Timeout + Push notification methods
├── config.js           ← VAPID key
└── idb.js              ← New save/delete methods

src/scripts/pages/
├── home/home-page.js   ← Tab navigation + Save/delete UI
└── story/add-story-page.js ← Auto-caching

Documentation/
├── SUMMARY_PERBAIKAN.md    ← User-friendly summary
├── TECHNICAL_DETAILS.md    ← Deep dive implementation
├── CHANGELOG.md            ← Version history
└── PERBAIKAN_SUBMISSION.md ← Detailed documentation
```

---

## 🎯 Key Methods Added

### API (api.js)
- `subscribeToNotifications()` - Subscribe ke push
- `unsubscribeFromNotifications()` - Unsubscribe
- `_urlBase64ToUint8Array()` - VAPID converter

### IDB (idb.js)
- `saveStory(story)` - Save story
- `deleteSavedStory(id)` - Delete story
- `getAllSavedStories()` - Get all saved
- `isStorySaved(id)` - Check if saved
- `clearSavedStories()` - Clear all

### Home Page (home-page.js)
- `_switchView()` - Tab switching
- `_loadSavedStories()` - Load from IDB
- `_displaySavedStories()` - Show saved
- `_updateNotificationButton()` - Update button text

---

## 🔍 Where to Look for What

| Apa yang ingin ditest? | File | Method |
|------|------|--------|
| Timeout error | `api.js` | `_fetchWithTimeout()` |
| Push notification | `home-page.js` | Button listener |
| Save story | `home-page.js` | `_displayStories()` |
| Saved stories | `home-page.js` | `_displaySavedStories()` |
| IndexedDB data | `idb.js` | `saveStory()`, `getAllSavedStories()` |

---

## 📊 API Endpoints Used

```
POST /register              ← Register
POST /login                 ← Login
GET  /stories               ← Get all stories
POST /stories               ← Add story
POST /notifications/subscribe    ← Subscribe to push
POST /notifications/unsubscribe  ← Unsubscribe from push
```

---

## 🎨 UI Components Added

### Home Page UI
```
┌─────────────────────────────────────────┐
│ [Refresh] [Clear Cache] [Notifications] │
│                                         │
│ [All Stories] | [Saved Stories]         │ ← Tab Navigation
│                                         │
│ 🗺️ Map (visible only in "All Stories")   │
│                                         │
│ Story Card:                             │
│ ├─ Image                               │
│ ├─ Title, Description, Location        │
│ ├─ [✓ Save Story] btn                  │ ← Save button
│ └─ Date                                │
│                                         │
│ In Saved Stories:                      │
│ ├─ Same but [🗑 Delete] btn instead     │ ← Delete button
│ └─ "Saved on: DATE"                    │
└─────────────────────────────────────────┘
```

---

## 🔑 Configuration

### VAPID Public Key (config.js)
```javascript
VAPID_PUBLIC_KEY: 'BKlJ5pYjHq4V0J9w0V8_a-I-LvzrVKLw7UHB7v6eiNiWNFfQKqtlCNScV4_lL-P6g8zSHBj-U3zAoL6-ELqzgXM'
```

### Timeout (config.js)
```javascript
API_TIMEOUT: 30000  // 30 detik
```

### Database (idb.js)
```javascript
DB_NAME: 'story-app'
DB_VERSION: 1
Stores: 'stories', 'saved_stories'
```

---

## ⚠️ Important Notes

1. **VAPID Key:** Hardcoded untuk development. Untuk production, fetch dari server.
2. **Push Permission:** Browser akan ask user untuk permission. Ini normal.
3. **Offline:** Saved stories accessible offline via IndexedDB.
4. **Storage:** Default limit 50MB per domain (browser-dependent).
5. **No Sync:** Saved stories hanya local. Tidak sync ke server.

---

## 🐛 Troubleshooting

### Push Notification tidak muncul
- Check: Browser sudah grant permission?
- Check: Notification subscription berhasil?
- Check: Service Worker registered?
- Check: Console untuk error messages

### Saved stories tidak muncul
- Check: IndexedDB database terbuka di DevTools?
- Check: Data ada di "saved_stories" object store?
- Check: Tab switched ke "Saved Stories"?
- Check: No localStorage errors?

### Timeout masih terjadi
- Check: Timeout benar-benar 30000ms?
- Check: Network connection stabil?
- Check: API server merespons?
- Check: File tidak terlalu besar (>100MB)?

---

## 📝 Developer Notes

### For Frontend Developers
- Main UI logic di `home-page.js`
- IDB operations di `idb.js`
- API calls di `api.js`
- Tab switching menggunakan `_switchView()` method

### For Backend/DevOps
- API endpoints sudah siap di backend
- Push subscription JSON format sesuai Web Push spec
- Token-based auth dengan Bearer token
- Ensure CORS headers untuk Push endpoints

### For QA/Testing
- Test file di kriteria test checklist
- Offline testing: DevTools > Network > Offline
- IndexedDB inspection: DevTools > Application > IndexedDB
- Push testing: Buka multiple browsers/tabs

---

## 🎓 Learning Resources

Untuk memahami lebih dalam tentang teknologi yang digunakan:

1. **Web Push Notifications**
   - MDN: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
   - Tutorial di course: "Lebih Dekat dengan Web Push"

2. **IndexedDB**
   - MDN: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
   - Tutorial di course: "Local Database untuk CityCareApp"

3. **Fetch API & Timeouts**
   - MDN: https://developer.mozilla.org/en-US/docs/Web/API/AbortController

4. **Service Workers**
   - MDN: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

---

## ✅ Verification Checklist

Sebelum submit ulang, pastikan:

- [ ] Timeout sudah 30s (check di api.js line 7)
- [ ] Push notification button ada di home page
- [ ] Saved Stories tab ada di home page
- [ ] Save/Delete buttons berfungsi
- [ ] Data persist di IndexedDB
- [ ] Offline access bekerja
- [ ] No console errors
- [ ] All files saved
- [ ] Git status clean

---

## 📞 Quick Links

| Dokumen | Tujuan |
|---------|--------|
| SUMMARY_PERBAIKAN.md | Ringkasan untuk reviewer |
| TECHNICAL_DETAILS.md | Penjelasan teknis mendalam |
| CHANGELOG.md | Versi history dan features |
| PERBAIKAN_SUBMISSION.md | Dokumentasi lengkap per kriteria |

---

**Ready for Review! 🎉**

Semua perbaikan sudah implemented dan tested. Silakan upload ulang ke platform submission.
