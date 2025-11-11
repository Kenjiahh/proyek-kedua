import CONFIG from './config';

const API_ENDPOINT = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  ADD_STORY: `${CONFIG.BASE_URL}/stories`,
  SUBSCRIBE: `${CONFIG.BASE_URL}/notifications/subscribe`,
  UNSUBSCRIBE: `${CONFIG.BASE_URL}/notifications/unsubscribe`,
};

class StoryAPI {
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

  static async register({ name, email, password }) {
    try {
      // Clear any existing tokens first
      this.removeToken();
      
      // Validate email format
      if (!this._isValidEmail(email)) {
        throw new Error('Format email tidak valid');
      }

      // Validate password
      if (!password || password.length < 6) {
        throw new Error('Password minimal 6 karakter');
      }

      const registerData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password
      };

      console.log('Sending register request with:', {
        ...registerData,
        password: '[HIDDEN]'
      });

      const response = await fetch(API_ENDPOINT.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      const responseJson = await response.json();
      console.log('Register response:', responseJson);

      if (!response.ok) {
        if (responseJson.message?.toLowerCase().includes('email is already taken')) {
          throw new Error('Email sudah terdaftar. Silakan gunakan email lain atau login.');
        }
        throw new Error(responseJson.message || 'Registrasi gagal');
      }

      return responseJson;
    } catch (error) {
      console.error('Registration error:', {
        name: error.name,
        message: error.message,
        cause: error.cause
      });
      throw error;
    }
  }

  static _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static clearAllData() {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    sessionStorage.clear();
  }

  static isLoggedIn() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    return !!(token && userData);
  }

  static getToken() {
    return localStorage.getItem('token');
  }

  static getUserData() {
    const userDataStr = localStorage.getItem('userData');
    try {
      return JSON.parse(userDataStr);
    } catch {
      return null;
    }
  }

  static async login({ email, password }) {
    try {
      const response = await this._fetchWithTimeout(
        API_ENDPOINT.LOGIN,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const responseJson = await response.json();

      if (responseJson.error) {
        throw new Error(responseJson.message);
      }

      // Store in localStorage
      localStorage.setItem('token', responseJson.loginResult.token);
      localStorage.setItem('userData', JSON.stringify({
        name: responseJson.loginResult.name,
        email: email,
      }));

      return responseJson;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  static async getAllStories() {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('Unauthorized: Please login first');
      }

      const response = await this._fetchWithTimeout(
        API_ENDPOINT.STORIES,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const responseJson = await response.json();

      if (responseJson.error) {
        throw new Error(responseJson.message);
      }

      return responseJson;
    } catch (error) {
      console.error('Get stories error:', error);
      throw error;
    }
  }

  static async addStory({ description, photo, lat, lon }) {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('Unauthorized: Please login first');
      }

      // Validate required fields
      if (!description || !description.trim()) {
        throw new Error('Deskripsi harus diisi');
      }

      if (!photo) {
        throw new Error('Foto harus diisi');
      }

      // Create FormData
      const formData = new FormData();
      formData.append('description', description.trim());
      
      // Handle photo - can be File object or file input element
      if (photo instanceof File) {
        formData.append('photo', photo);
      } else if (photo instanceof FileList && photo.length > 0) {
        formData.append('photo', photo[0]);
      } else if (photo && photo.files && photo.files.length > 0) {
        formData.append('photo', photo.files[0]);
      } else {
        throw new Error('Foto tidak valid');
      }

      // Add location if provided
      if (lat) {
        formData.append('lat', lat);
      }
      if (lon) {
        formData.append('lon', lon);
      }

      const response = await this._fetchWithTimeout(
        API_ENDPOINT.ADD_STORY,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type for FormData, browser will set it with boundary
          },
          body: formData,
        }
      );

      const responseJson = await response.json();

      if (!response.ok) {
        throw new Error(responseJson.message || 'Gagal menambahkan story');
      }

      if (responseJson.error) {
        throw new Error(responseJson.message || 'Gagal menambahkan story');
      }

      return responseJson;
    } catch (error) {
      console.error('Add story error:', error);
      throw error;
    }
  }

  static setToken(token) {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  static removeToken() {
    localStorage.removeItem('token');
  }

  static async subscribeToNotifications() {
    try {
      // Check if service worker is registered
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

      // Get push subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Get public VAPID key from config
        const vapidPublicKey = CONFIG.VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error('VAPID public key not configured');
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this._urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      // Send subscription to backend
      const token = this.getToken();
      if (!token) {
        throw new Error('User not authenticated');
      }

      // Convert subscription to plain object and remove expirationTime
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.getKey ? subscription.getKey('p256dh') : null,
          auth: subscription.getKey ? subscription.getKey('auth') : null,
        },
      };

      // Convert keys to base64 strings
      if (subscriptionData.keys.p256dh) {
        if (subscriptionData.keys.p256dh instanceof ArrayBuffer) {
          subscriptionData.keys.p256dh = this._arrayBufferToBase64(subscriptionData.keys.p256dh);
        } else if (subscriptionData.keys.p256dh instanceof Uint8Array) {
          subscriptionData.keys.p256dh = this._arrayBufferToBase64(subscriptionData.keys.p256dh);
        } else if (typeof subscriptionData.keys.p256dh !== 'string') {
          subscriptionData.keys.p256dh = this._arrayBufferToBase64(new Uint8Array(subscriptionData.keys.p256dh));
        }
      }

      if (subscriptionData.keys.auth) {
        if (subscriptionData.keys.auth instanceof ArrayBuffer) {
          subscriptionData.keys.auth = this._arrayBufferToBase64(subscriptionData.keys.auth);
        } else if (subscriptionData.keys.auth instanceof Uint8Array) {
          subscriptionData.keys.auth = this._arrayBufferToBase64(subscriptionData.keys.auth);
        } else if (typeof subscriptionData.keys.auth !== 'string') {
          subscriptionData.keys.auth = this._arrayBufferToBase64(new Uint8Array(subscriptionData.keys.auth));
        }
      }

      const response = await this._fetchWithTimeout(
        API_ENDPOINT.SUBSCRIBE,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(subscriptionData),
        }
      );

      const responseJson = await response.json();

      if (!response.ok) {
        throw new Error(responseJson.message || 'Failed to subscribe to notifications');
      }

      console.log('Successfully subscribed to notifications');
      localStorage.setItem('notificationSubscribed', 'true');
      return responseJson;
    } catch (error) {
      console.error('Subscription error:', error);
      throw error;
    }
  }

  static async unsubscribeFromNotifications() {
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        console.log('No subscription to unsubscribe from');
        localStorage.removeItem('notificationSubscribed');
        return;
      }

      // Unsubscribe from push manager (this always works locally)
      await subscription.unsubscribe();
      console.log('Unsubscribed from push manager');

      // Try to notify backend, but don't fail if it does (CORS might block it)
      const token = this.getToken();
      if (token) {
        try {
          await this._fetchWithTimeout(
            API_ENDPOINT.UNSUBSCRIBE,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.getKey ? subscription.getKey('p256dh') : null,
                  auth: subscription.getKey ? subscription.getKey('auth') : null,
                },
              }),
            },
            5000 // Shorter timeout for unsubscribe
          );
          console.log('Backend notified of unsubscription');
        } catch (backendError) {
          // Log but don't fail - user is unsubscribed locally even if backend fails
          console.warn('Could not notify backend of unsubscription (this is OK):', backendError.message);
        }
      }

      localStorage.removeItem('notificationSubscribed');
      console.log('Successfully unsubscribed from notifications');
    } catch (error) {
      console.error('Unsubscription error:', error);
      throw error;
    }
  }

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

  static _arrayBufferToBase64(buffer) {
    if (!buffer) return null;
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Test helper - Send test notification via service worker
  static async sendTestNotification() {
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }

      const registration = await navigator.serviceWorker.ready;

      // Simulate push notification
      const testData = {
        title: 'New Story Posted! 📖',
        body: 'Check out the latest story from our community',
        icon: '/favicon.png',
        badge: '/favicon.png',
        data: {
          url: '/#/home',
        },
      };

      registration.showNotification(testData.title, {
        body: testData.body,
        icon: testData.icon,
        badge: testData.badge,
        data: testData.data,
      });

      console.log('Test notification sent');
    } catch (error) {
      console.error('Test notification error:', error);
      throw error;
    }
  }

  // Send notification for a new story
  static async sendNotificationForNewStory(story) {
    try {
      if (!('serviceWorker' in navigator)) {
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      const notificationData = {
        title: `📖 New Story by ${story.name}!`,
        body: story.description.substring(0, 100) + (story.description.length > 100 ? '...' : ''),
        icon: '/favicon.png',
        badge: '/favicon.png',
        data: {
          url: '/#/home',
          storyId: story.id,
        },
      };

      registration.showNotification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        data: notificationData.data,
      });

      console.log('New story notification sent for:', story.name);
    } catch (error) {
      console.error('Error sending new story notification:', error);
    }
  }
}

export default StoryAPI;