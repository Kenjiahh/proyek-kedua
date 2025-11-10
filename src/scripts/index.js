import '../styles/styles.css';
import App from './view/app';
import CONFIG from './data/config';

const app = new App({
  drawerButton: document.getElementById('drawer-button'),
  navigationDrawer: document.getElementById('navigation-drawer'),
  content: document.getElementById('main-content'),
});

// Initial render
window.addEventListener('DOMContentLoaded', () => {
  app.renderPage();
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
  // Prepare PWA install
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.__showInstallPrompt = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
      }
    };
  });
});

// Handle hash change for SPA navigation
window.addEventListener('hashchange', () => {
  app.renderPage();
});

// Optional: simple push subscribe helper
export async function subscribePush(vapidKeyBase64 = CONFIG.VAPID_PUBLIC_KEY) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;
  const convertedKey = vapidKeyBase64 ? urlBase64ToUint8Array(vapidKeyBase64) : null;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey,
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}