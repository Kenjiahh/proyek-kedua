import CONFIG from './config';

const API_ENDPOINT = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  ADD_STORY: `${CONFIG.BASE_URL}/stories`,
};

class StoryAPI {
  static async _fetchWithTimeout(url, options = {}, timeout = 8000) {
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
}

export default StoryAPI;