const CONFIG = {
  BASE_URL: 'https://story-api.dicoding.dev/v1',
  DEFAULT_LANGUAGE: 'id',
  API_TIMEOUT: 8000,
  // Optional: set from API if available
  VAPID_PUBLIC_KEY: '',
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

export default CONFIG;