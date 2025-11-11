# Dokumentasi Perbaikan Submission

## Catatan Reviewer yang Diperbaiki

### 1. ✅ Kriteria 1: Mempertahankan Seluruh Kriteria Wajib Submission Sebelumnya

**Masalah:** Timeout pada request hanya 8 detik, sehingga API story tidak dapat menghandle request dalam waktu tersebut, terutama untuk upload story.

**Solusi:**
- Mengubah timeout dari `8000ms` menjadi `30000ms` (30 detik)
- File: `src/scripts/data/api.js` - Method `_fetchWithTimeout()`
- Perubahan ini memastikan request yang lebih lama seperti upload file dapat diselesaikan dengan sukses

**Perubahan Kode:**
```javascript
// Sebelum:
static async _fetchWithTimeout(url, options = {}, timeout = 8000) { ... }

// Sesudah:
static async _fetchWithTimeout(url, options = {}, timeout = 30000) { ... }
```

---

### 2. ✅ Kriteria 2: Menerapkan Push Notification

**Masalah:** Push notification belum diimplementasikan sesuai dengan API yang tersedia.

**Solusi:**
Menerapkan push notification dengan langkah-langkah sebagai berikut:

#### a. Penambahan Endpoint di API
File: `src/scripts/data/api.js`
```javascript
const API_ENDPOINT = {
  // ... existing endpoints ...
  SUBSCRIBE: `${CONFIG.BASE_URL}/notifications/subscribe`,
  UNSUBSCRIBE: `${CONFIG.BASE_URL}/notifications/unsubscribe`,
};
```

#### b. Implementasi Method Subscribe/Unsubscribe
Menambahkan 3 method utama di class `StoryAPI`:

1. **`subscribeToNotifications()`** - Subscribe user ke push notification
   - Memeriksa support Service Worker
   - Request permission dari user
   - Membuat subscription ke push service
   - Mengirim subscription ke backend API
   - Menyimpan status ke localStorage

2. **`unsubscribeFromNotifications()`** - Unsubscribe user dari push notification
   - Unsubscribe dari push manager
   - Memberitahu backend
   - Menghapus status dari localStorage

3. **`_urlBase64ToUint8Array()`** - Helper function untuk convert VAPID key

#### c. Penambahan VAPID Public Key
File: `src/scripts/data/config.js`
```javascript
VAPID_PUBLIC_KEY: 'BKlJ5pYjHq4V0J9w0V8_a-I-LvzrVKLw7UHB7v6eiNiWNFfQKqtlCNScV4_lL-P6g8zSHBj-U3zAoL6-ELqzgXM',
```

#### d. UI Untuk Subscribe/Unsubscribe
File: `src/scripts/pages/home/home-page.js`
- Menambahkan tombol "Enable Notifications" / "Disable Notifications" di home page
- Button akan menampilkan status subscription dengan styling yang berbeda
- Notification akan muncul ketika user menambahkan cerita baru

---

### 3. ✅ Kriteria 4: Penerapan IndexedDB

**Masalah:** 
- IndexedDB sudah ada tetapi tidak dapat diakses oleh user
- Tidak ada interaksi user untuk save/delete
- IndexedDB tidak benar-benar menyimpan data karena tidak digunakan dengan tepat

**Solusi:**
Implementasi lengkap IndexedDB dengan UI yang accessible:

#### a. Perbaikan Database Structure
File: `src/scripts/data/idb.js`
- Menambahkan object store baru: `saved_stories` untuk user-initiated saves
- Memisahkan antara cache otomatis (`stories`) dan saves manual (`saved_stories`)
- Memperbaiki promise handling dengan oncomplete/onerror yang proper

#### b. Penambahan Method Baru di IDB
- **`saveStory(story)`** - Simpan story individual
- **`deleteSavedStory(storyId)`** - Hapus story dari saved
- **`getAllSavedStories()`** - Dapatkan semua saved stories
- **`isStorySaved(storyId)`** - Cek apakah story sudah tersimpan
- **`clearSavedStories()`** - Hapus semua saved stories

#### c. UI Tab View untuk Saved Stories
File: `src/scripts/pages/home/home-page.js`

**Fitur-fitur:**
1. **Tab Navigation:**
   - "All Stories" tab - menampilkan semua stories dari API
   - "Saved Stories" tab - menampilkan stories yang user simpan

2. **Save Story Button:**
   - Setiap story card memiliki tombol "✓ Save Story"
   - Button akan disabled dan berubah warna setelah diklik
   - Data tersimpan ke IndexedDB dengan timestamp `savedAt`

3. **Delete Saved Story:**
   - Tab "Saved Stories" menampilkan tombol "🗑 Delete from Saved"
   - Konfirmasi sebelum delete
   - Data akan dihapus dari IndexedDB

4. **Map Visibility:**
   - Map hanya ditampilkan di tab "All Stories"
   - Map tidak ditampilkan di tab "Saved Stories"

5. **Empty States:**
   - Tab "Saved Stories" menampilkan pesan jika belum ada saved stories
   - Tombol untuk kembali ke "All Stories" dari empty state

#### d. Caching Automatic untuk New Stories
File: `src/scripts/pages/story/add-story-page.js`
- Ketika user berhasil menambahkan story baru, story tersebut akan di-cache otomatis
- Data di-fetch dari API dan disimpan ke IndexedDB untuk offline access

#### e. User Flow Untuk IndexedDB:
```
1. User login ke aplikasi
2. User browse "All Stories" di home page
3. User klik tombol "✓ Save Story" pada story yang disukai
4. Story tersimpan ke IndexedDB dengan timestamp
5. User bisa klik tab "Saved Stories" untuk melihat saved stories
6. User bisa menghapus saved story dengan tombol "🗑 Delete from Saved"
7. Semua data persistent bahkan ketika offline
```

---

## File-File Yang Dimodifikasi

1. **src/scripts/data/api.js**
   - Ubah timeout dari 8000ms menjadi 30000ms
   - Tambah endpoint SUBSCRIBE dan UNSUBSCRIBE
   - Tambah method: `subscribeToNotifications()`, `unsubscribeFromNotifications()`, `_urlBase64ToUint8Array()`

2. **src/scripts/data/config.js**
   - Update API_TIMEOUT dari 8000 menjadi 30000
   - Tambah VAPID_PUBLIC_KEY

3. **src/scripts/data/idb.js**
   - Tambah STORE_SAVED_STORIES untuk user-initiated saves
   - Perbaiki promise handling
   - Tambah method: `saveStory()`, `deleteSavedStory()`, `getAllSavedStories()`, `isStorySaved()`, `clearSavedStories()`

4. **src/scripts/pages/home/home-page.js**
   - Tambah import untuk fungsi IDB baru
   - Update constructor dengan `currentView` dan `savedStories`
   - Update render() dengan tab navigation UI
   - Tambah afterRender logic untuk tab switching
   - Tambah method: `_switchView()`, `_loadSavedStories()`, `_displaySavedStories()`, `_updateNotificationButton()`
   - Update `_displayStories()` dengan save button functionality

5. **src/scripts/pages/story/add-story-page.js**
   - Import `putStories` dari idb.js
   - Update form submission untuk cache story baru ke IndexedDB setelah berhasil ditambahkan

---

## Testing Checklist

- [ ] Timeout tidak lagi membuat request upload story gagal (test dengan file besar)
- [ ] Push notification subscribe berhasil dipicu dari home page
- [ ] Notification muncul ketika ada story baru yang ditambahkan
- [ ] User bisa melihat tab "Saved Stories" di home page
- [ ] User bisa save story dengan tombol "✓ Save Story"
- [ ] Saved stories muncul di tab "Saved Stories"
- [ ] User bisa delete saved story
- [ ] Data persistent di IndexedDB bahkan setelah close browser
- [ ] Offline mode: user bisa melihat cached stories dan saved stories

---

## Catatan Tambahan

### VAPID Public Key
Key yang digunakan saat ini adalah default key untuk development. Untuk production, pastikan menggunakan key yang sesuai dari server atau generate sendiri dengan `web-push` npm package.

### Push Notification Handling
Service worker sudah dikonfigurasi untuk handle push event di `src/public/sw.js`. Ketika notification diklik, user akan diarahkan ke halaman home atau URL yang ditentukan dalam push data.

### IndexedDB Persistence
Data di IndexedDB tidak akan langsung sinkronisasi dengan API. Untuk real-world app, pertimbangkan:
1. Sync strategy ketika user online kembali
2. Conflict resolution jika data berubah di backend
3. Cleanup strategy untuk stored data yang tidak relevan

---

## Dependencies
Tidak ada dependencies baru yang perlu diinstall. Semua menggunakan:
- Native Web APIs: IndexedDB, Service Worker, Web Push
- Fetch API dengan AbortController untuk timeout
- Leaflet.js untuk map (sudah ada)
