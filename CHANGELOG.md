# CHANGELOG - Submission Fixes v2

## Version 2.1.0 - Reviewer Feedback Implementation

### Date: 2024-11-11

---

## 🔧 Bug Fixes & Improvements

### 1. Network Timeout Enhancement (CRITICAL FIX)
**Issue:** API requests timeout after 8 seconds, causing upload story to fail
**Fix:** Increased timeout from 8000ms to 30000ms (30 seconds)
**Files:** 
- `src/scripts/data/api.js` - Updated `_fetchWithTimeout()` method
- `src/scripts/data/config.js` - Updated `API_TIMEOUT` constant
**Impact:** Users can now upload files without timeout errors

---

### 2. Push Notification System (NEW FEATURE)
**Issue:** Push notifications not implemented as per reviewer requirements
**Implementation:**
- Added `subscribeToNotifications()` method in `StoryAPI`
- Added `unsubscribeFromNotifications()` method in `StoryAPI`
- Added VAPID public key configuration
- Added notification UI button in home page
- Service worker already configured for push event handling

**Files:**
- `src/scripts/data/api.js` - Added subscribe/unsubscribe methods
- `src/scripts/data/config.js` - Added VAPID_PUBLIC_KEY
- `src/scripts/pages/home/home-page.js` - Added notification button UI

**Features:**
- One-click enable/disable notifications
- Persistent notification preference in localStorage
- Automatic notification when new stories are posted
- Permission handling and error recovery

---

### 3. IndexedDB User-Accessible Implementation (MAJOR REFACTOR)
**Issue:** IndexedDB existed but was not accessible to users, no UI for save/delete operations
**Solution:** Complete IndexedDB refactor with user-facing UI

#### Database Changes
- Added new object store: `saved_stories` (separate from cache `stories`)
- Implemented proper Promise-based transaction handling
- Added data persistence with timestamps

**New Methods in `src/scripts/data/idb.js`:**
- `saveStory(story)` - Save individual story with timestamp
- `deleteSavedStory(storyId)` - Remove saved story
- `getAllSavedStories()` - Retrieve all user-saved stories
- `isStorySaved(storyId)` - Check if story is saved
- `clearSavedStories()` - Clear all saved stories

#### UI Implementation
**Tab Navigation:**
- Tab 1: "All Stories" (shows all stories from API with map)
- Tab 2: "Saved Stories" (shows user-saved stories without map)

**User Interactions:**
- Click "✓ Save Story" button on any story to save it
- Click "🗑 Delete from Saved" to remove saved story
- Confirmation before deletion
- Visual feedback with button state changes

**Files Modified:**
- `src/scripts/data/idb.js` - Enhanced with new methods and stores
- `src/scripts/pages/home/home-page.js` - Added tab UI and save/delete functionality
- `src/scripts/pages/story/add-story-page.js` - Auto-cache new stories to IndexedDB

**Features:**
- Persistent local storage of user-saved stories
- Offline access to saved stories
- Timestamp tracking for saved stories
- Empty state handling with helpful messages
- Smooth tab switching with visual feedback

---

## 📊 Files Modified Summary

| File | Changes | Lines Changed |
|------|---------|---|
| `src/scripts/data/api.js` | Timeout + Push notification | ~150 |
| `src/scripts/data/config.js` | VAPID key + timeout config | ~3 |
| `src/scripts/data/idb.js` | New store + 6 methods | ~180 |
| `src/scripts/pages/home/home-page.js` | Tab UI + save/delete | ~200 |
| `src/scripts/pages/story/add-story-page.js` | Auto-caching | ~20 |

**Total Changes:** ~550 lines of code

---

## ✅ Requirements Checklist

### Kriteria 1: Mempertahankan Seluruh Kriteria Wajib Submission Sebelumnya
- [x] Timeout diperpanjang dari 8s menjadi 30s
- [x] Tested dengan upload file besar
- [x] No breaking changes to existing features

### Kriteria 2: Menerapkan Push Notification
- [x] Subscribe endpoint implemented
- [x] Unsubscribe endpoint implemented  
- [x] UI button for notification toggle
- [x] Permission handling implemented
- [x] VAPID key configured
- [x] Service worker ready for push events
- [x] Notification shows when story added

### Kriteria 4: Penerapan IndexedDB
- [x] Accessible UI for save/delete
- [x] "Saved Stories" feature like CityCareApp
- [x] Data persistent in IndexedDB
- [x] User can manually save stories
- [x] User can delete saved stories
- [x] Proper Promise handling
- [x] Transaction safety implemented
- [x] Offline access to saved data

---

## 🚀 New Features

### Feature: Saved Stories Collection
Users can now:
1. Browse all stories in "All Stories" tab
2. Click "✓ Save Story" to add stories to personal collection
3. Switch to "Saved Stories" tab to view saved stories
4. Click "🗑 Delete from Saved" to remove stories
5. Access saved stories even when offline
6. See saved timestamp for each story

### Feature: Push Notifications
Users can now:
1. Click "Enable Notifications" button
2. Grant browser notification permission
3. Receive notifications when new stories are posted
4. Click "Disable Notifications" to opt-out
5. Preference persists across sessions

---

## 🔍 Testing Recommendations

### Test 1: Timeout Handling
```
1. Upload a large image file (>5MB)
2. Wait for upload to complete
3. Verify no timeout error
4. Story should be posted successfully
```

### Test 2: Push Notifications
```
1. Login to app in Browser A
2. Click "Enable Notifications"
3. Grant permission when prompted
4. From another account, add new story
5. Verify notification appears in Browser A
```

### Test 3: Saved Stories (Offline Test)
```
1. Login and browse stories
2. Click "✓ Save Story" on several stories
3. Click "Saved Stories" tab
4. Verify saved stories display correctly
5. Disconnect internet (DevTools > Offline)
6. Verify saved stories still accessible
7. Reconnect internet
8. Test delete functionality
9. Verify deletion persists
```

### Test 4: Auto-Caching
```
1. Add new story from add-story-page
2. After success, open DevTools > Application > IndexedDB
3. Verify new story appears in "stories" object store
4. Verify it also appears in cached stories
```

---

## 📝 Known Limitations & Future Work

### Current Limitations
1. VAPID key is hardcoded (should be fetched from server for production)
2. No automatic cleanup of old cached stories
3. No sync strategy when returning online after offline edits
4. Saved stories stored locally only (not synced with backend)

### Future Improvements
1. Implement server-side subscription management
2. Add automatic IndexedDB cleanup based on storage quota
3. Implement background sync for offline operations
4. Add conflict resolution for offline edits
5. Add rich notifications with images
6. Implement request retry strategy for failed uploads
7. Add analytics for notification engagement

---

## 🔐 Security Notes

1. **Push Subscription:** Encrypted using HTTPS and VAPID key
2. **Authentication:** Bearer token included in all subscription requests
3. **IndexedDB:** Local to domain, same-origin policy applies
4. **No sensitive data stored:** Only story metadata, not user credentials

---

## 📦 Dependencies

No new dependencies added. Using:
- Native Web APIs:
  - Fetch API with AbortController
  - IndexedDB API
  - Service Worker API
  - Web Push API
  - Notification API
- Existing dependencies:
  - Leaflet.js for maps
  - Webpack for bundling
  - Babel for transpilation

---

## 🙏 Acknowledgments

Thanks to the reviewer for detailed feedback on:
1. Timeout issues with file uploads
2. Push notification requirements
3. IndexedDB accessibility and user interaction

These changes address all feedback points and should meet submission requirements.

---

## 📞 Support

For issues or questions about these changes:
1. Check TECHNICAL_DETAILS.md for implementation details
2. Review SUMMARY_PERBAIKAN.md for overview
3. Test with the provided test cases above
4. Check browser console for detailed error logs

---

## Version History

- **v2.1.0** - 2024-11-11: Major implementation of push notifications and IndexedDB UI
- **v2.0.0** - Previous: Initial submission with PWA and offline support
- **v1.0.0** - Initial project setup

---

**Last Updated:** 2024-11-11
**Status:** Ready for Review ✅
