import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import StoryAPI from '../../data/api';

class HomePage {
  constructor() {
    this.stories = [];
    this.map = null;
  }

  async render() {
    const isLoggedIn = StoryAPI.isLoggedIn(); // This will check localStorage

    return `
      <div class="home-container">
        ${isLoggedIn ? `
          <div id="map" class="map-container"></div>
          <div class="stories-section">
            <h2>Latest Stories</h2>
            <div id="storiesContainer" class="stories-grid">
              <div class="loading-indicator">
                <span>Loading stories...</span>
              </div>
            </div>
          </div>
        ` : `
          <div class="welcome-section">
            <h2>Welcome to Story App</h2>
            <p>Please login to see stories from our community</p>
            <div class="auth-buttons">
              <a href="#/login" class="btn-primary">Login</a>
              <a href="#/register" class="btn-secondary">Register</a>
            </div>
          </div>
        `}
      </div>
    `;
  }

  async afterRender() {
    const isLoggedIn = StoryAPI.isLoggedIn();
    if (!isLoggedIn) return;

    try {
      await this._loadStories();
      
      // Wait a bit for DOM to be ready
      setTimeout(() => {
        const mapElement = document.getElementById('map');
        if (mapElement) {
      this._initMap();
        } else {
          console.error('Map element not found');
        }
      }, 100);
    } catch (error) {
      console.error('Failed to initialize homepage:', error);
      const mapElement = document.getElementById('map');
      if (mapElement) {
        mapElement.innerHTML = `
          <div class="error-message">Failed to load map: ${error.message}</div>
      `;
      }
    }
  }

  _initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Map element not found');
      return;
    }

    // Check if map already initialized
    if (this.map) {
      this.map.remove();
    }

    // Fix for Leaflet marker icon
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
      iconUrl: require('leaflet/dist/images/marker-icon.png'),
      shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
    });

    // Initialize map
    this.map = L.map('map', {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([-6.2088, 106.8456], 13);
    
    // Base layers (at least two)
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    });
    const cartoDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CartoDB',
      maxZoom: 20
    });
    // Add default
    osm.addTo(this.map);
    // Add layer control
    L.control.layers(
      { 'OpenStreetMap': osm, 'Carto Dark': cartoDark },
      {}
    ).addTo(this.map);

    // Invalidate size to ensure map renders correctly
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
    this._addStoryMarkers();
      }
    }, 200);
  }

  _addStoryMarkers() {
    this.stories.forEach(story => {
      if (story.lat && story.lon) {
        L.marker([story.lat, story.lon])
          .bindPopup(`
            <div class="map-popup">
              <img src="${story.photoUrl}" alt="${story.description}" class="popup-image">
              <h3>${story.name}</h3>
              <p>${story.description}</p>
            </div>
          `)
          .addTo(this.map);
      }
    });
  }

  async _loadStories() {
    try {
      const response = await StoryAPI.getAllStories();
      this.stories = response.listStory;
      this._displayStories(this.stories);
    } catch (error) {
      throw new Error(`Failed to load stories: ${error.message}`);
    }
  }

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
            `<p class="location"><i class="fas fa-map-marker-alt"></i> ${story.lat}, ${story.lon}</p>` 
            : ''}
          <p class="date">${new Date(story.createdAt).toLocaleDateString()}</p>
        </div>
      </article>
    `).join('');
  }
}

export default HomePage;