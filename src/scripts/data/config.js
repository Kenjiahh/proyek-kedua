const CONFIG = {
  BASE_URL: 'https://story-api.dicoding.dev/v1',
  DEFAULT_LANGUAGE: 'id',
  API_TIMEOUT: 30000,
  // VAPID Public Key for Web Push Notifications
  // Get from: https://story-api.dicoding.dev/v1/notifications/settings (if available)
  // Or provide your own from server configuration
  VAPID_PUBLIC_KEY: 'BKlJ5pYjHq4V0J9w0V8_a-I-LvzrVKLw7UHB7v6eiNiWNFfQKqtlCNScV4_lL-P6g8zSHBj-U3zAoL6-ELqzgXM',
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

export default CONFIG;