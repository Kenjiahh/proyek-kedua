import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import StoryAPI from '../../data/api';
import { clearStories, getAllStories as getCachedStories, getAllSavedStories, saveStory, deleteSavedStory, isStorySaved } from '../../data/idb';

class HomePage {
  constructor() {
    this.stories = [];
    this.savedStories = [];
    this.map = null;
    this.currentView = 'stories'; // 'stories' or 'saved'
    this.lastStoryIds = new Set(); // Track last story IDs to detect new ones
    this.pollingInterval = null;
  }

  async render() {
    const isLoggedIn = StoryAPI.isLoggedIn(); // This will check localStorage

    return `
      <div class="home-container">
        ${isLoggedIn ? `
          <div class="stories-actions" style="display:flex;gap:10px;margin:10px 0;flex-wrap:wrap;">
            <button id="btnRefreshStories" class="btn-primary" type="button">Refresh Stories</button>
            <button id="btnClearCache" class="btn-secondary" type="button">Clear Cached Stories</button>
            <button id="btnToggleNotification" class="btn-secondary" type="button">Enable Notifications</button>
            <button id="btnTestNotification" class="btn-secondary" type="button" title="Send test notification">📢 Test Notification</button>
          </div>

          <div class="view-tabs" style="display:flex;gap:10px;margin:15px 0;border-bottom:2px solid #ddd;">
            <button id="btnStoriesView" class="tab-button tab-active" type="button" style="padding:10px 20px;background:none;border:none;font-size:16px;cursor:pointer;border-bottom:3px solid #007bff;">All Stories</button>
            <button id="btnSavedView" class="tab-button" type="button" style="padding:10px 20px;background:none;border:none;font-size:16px;cursor:pointer;border-bottom:3px solid transparent;">Saved Stories</button>
          </div>

          <div id="map" class="map-container"></div>
          <div class="stories-section">
            <h2 id="sectionTitle">Latest Stories</h2>
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
      await this._loadSavedStories();

      // Wire action buttons
      const refreshBtn = document.getElementById('btnRefreshStories');
      const clearBtn = document.getElementById('btnClearCache');
      const notificationBtn = document.getElementById('btnToggleNotification');
      const storiesViewBtn = document.getElementById('btnStoriesView');
      const savedViewBtn = document.getElementById('btnSavedView');
      
      refreshBtn?.addEventListener('click', async () => {
        const container = document.getElementById('storiesContainer');
        container.innerHTML = '<div class="loading-indicator"><span>Refreshing...</span></div>';
        await this._loadStories(true);
      });
      
      clearBtn?.addEventListener('click', async () => {
        await clearStories();
        const container = document.getElementById('storiesContainer');
        container.innerHTML = `
          <div class="empty-state">
            <p>Local cache cleared.</p>
          </div>
        `;
      });

      // Tab switching
      storiesViewBtn?.addEventListener('click', () => {
        this.currentView = 'stories';
        this._switchView();
      });

      savedViewBtn?.addEventListener('click', () => {
        this.currentView = 'saved';
        this._switchView();
      });

      // Notification button setup
      if (notificationBtn) {
        const isSubscribed = localStorage.getItem('notificationSubscribed') === 'true';
        this._updateNotificationButton(notificationBtn, isSubscribed);

        notificationBtn.addEventListener('click', async () => {
          try {
            const subscribed = localStorage.getItem('notificationSubscribed') === 'true';
            if (subscribed) {
              await StoryAPI.unsubscribeFromNotifications();
              this._updateNotificationButton(notificationBtn, false);
              alert('Notifications disabled successfully');
            } else {
              await StoryAPI.subscribeToNotifications();
              this._updateNotificationButton(notificationBtn, true);
              alert('Notifications enabled! You will receive notifications when new stories are posted.');
            }
          } catch (error) {
            console.error('Notification toggle error:', error);
            // If it's a subscribe error, show it. If it's unsubscribe CORS error, it's OK
            if (error.message && error.message.includes('CORS')) {
              alert('Notification settings changed locally (backend sync has CORS issue but notifications are disabled)');
              this._updateNotificationButton(notificationBtn, false);
            } else {
              alert(`Error: ${error.message}`);
            }
          }
        });
      }

      // Test notification button setup
      const testNotifBtn = document.getElementById('btnTestNotification');
      if (testNotifBtn) {
        testNotifBtn.addEventListener('click', async () => {
          try {
            await StoryAPI.sendTestNotification();
          } catch (error) {
            console.error('Test notification error:', error);
            alert(`Error: ${error.message}`);
          }
        });
      }

      // Initialize lastStoryIds for polling
      this.lastStoryIds = new Set(this.stories.map(s => s.id));

      // Start polling for new stories
      this._startPollingNewStories();
      
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

  _switchView() {
    const storiesViewBtn = document.getElementById('btnStoriesView');
    const savedViewBtn = document.getElementById('btnSavedView');
    const mapElement = document.getElementById('map');
    const sectionTitle = document.getElementById('sectionTitle');

    if (this.currentView === 'stories') {
      if (storiesViewBtn) {
        storiesViewBtn.classList.add('tab-active');
        storiesViewBtn.style.borderBottom = '3px solid #007bff';
      }
      if (savedViewBtn) {
        savedViewBtn.classList.remove('tab-active');
        savedViewBtn.style.borderBottom = '3px solid transparent';
      }
      if (mapElement) mapElement.style.display = 'block';
      if (sectionTitle) sectionTitle.textContent = 'Latest Stories';
      this._displayStories(this.stories);
    } else {
      if (storiesViewBtn) {
        storiesViewBtn.classList.remove('tab-active');
        storiesViewBtn.style.borderBottom = '3px solid transparent';
      }
      if (savedViewBtn) {
        savedViewBtn.classList.add('tab-active');
        savedViewBtn.style.borderBottom = '3px solid #007bff';
      }
      if (mapElement) mapElement.style.display = 'none';
      if (sectionTitle) sectionTitle.textContent = 'Saved Stories';
      this._displaySavedStories(this.savedStories);
    }
  }

  _updateNotificationButton(button, isSubscribed) {
    if (isSubscribed) {
      button.textContent = 'Disable Notifications';
      button.classList.add('btn-active');
    } else {
      button.textContent = 'Enable Notifications';
      button.classList.remove('btn-active');
    }
  }

  async _loadSavedStories() {
    try {
      this.savedStories = await getAllSavedStories();
      console.log('Loaded saved stories:', this.savedStories);
    } catch (error) {
      console.error('Failed to load saved stories:', error);
      this.savedStories = [];
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

  async _loadStories(forceServer = false) {
    try {
      let list = null;
      if (forceServer) {
        const response = await StoryAPI.getAllStories();
        list = response.listStory;
      } else {
        // try server first; if fails, throw to catch and load cache
        const response = await StoryAPI.getAllStories();
        list = response.listStory;
      }
      this.stories = list;
      this._displayStories(this.stories);
    } catch (error) {
      // on failure, use cache
      const cached = await getCachedStories();
      if (cached && cached.length > 0) {
        this.stories = cached;
        this._displayStories(this.stories);
        return;
      }
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
          <div style="margin-top:10px;">
            <button class="btn-save-story" data-story-id="${story.id}" style="padding:8px 16px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;">
              ✓ Save Story
            </button>
          </div>
        </div>
      </article>
    `).join('');

    // Add event listeners for save buttons
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
          // Refresh saved stories list
          await this._loadSavedStories();
        } catch (error) {
          console.error('Failed to save story:', error);
          alert(`Error saving story: ${error.message}`);
        }
      });
    });
  }

  _displaySavedStories(stories) {
    const container = document.getElementById('storiesContainer');
    
    if (!stories || stories.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>You haven't saved any stories yet</p>
          <button id="btnGoToStories" type="button" class="btn-primary" style="padding:10px 20px;margin-top:10px;">
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
            `<p class="location"><i class="fas fa-map-marker-alt"></i> ${story.lat}, ${story.lon}</p>` 
            : ''}
          <p class="date">Saved on: ${new Date(story.savedAt).toLocaleDateString()}</p>
          <div style="margin-top:10px;">
            <button class="btn-delete-story" data-story-id="${story.id}" style="padding:8px 16px;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;">
              🗑 Delete from Saved
            </button>
          </div>
        </div>
      </article>
    `).join('');

    // Add event listeners for delete buttons
    container.querySelectorAll('.btn-delete-story').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const storyId = e.target.getAttribute('data-story-id');
        if (confirm('Are you sure you want to delete this saved story?')) {
          try {
            await deleteSavedStory(storyId);
            alert('Story removed from your saved collection!');
            await this._loadSavedStories();
            this._displaySavedStories(this.savedStories);
          } catch (error) {
            console.error('Failed to delete story:', error);
            alert(`Error deleting story: ${error.message}`);
          }
        }
      });
    });
  }

  // Poll for new stories every 10 seconds to detect new posts
  _startPollingNewStories() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        const response = await StoryAPI.getAllStories();
        const newStories = response.listStory || [];

        // Get current story IDs
        const currentIds = new Set(newStories.map(s => s.id));

        // Find new stories (stories that weren't in lastStoryIds)
        const newStoryIds = [...currentIds].filter(id => !this.lastStoryIds.has(id));

        if (newStoryIds.length > 0) {
          // Found new stories!
          const newCount = newStoryIds.length;
          console.log(`Found ${newCount} new story(ies)!`);

          // Send notification for each new story
          for (let i = 0; i < newStoryIds.length; i++) {
            const newStory = newStories.find(s => s.id === newStoryIds[i]);
            if (newStory) {
              await StoryAPI.sendNotificationForNewStory(newStory);
            }
          }

          // Update last story IDs
          this.lastStoryIds = currentIds;

          // Refresh stories display if we're on stories view
          if (this.currentView === 'stories') {
            this.stories = newStories;
            this._displayStories(this.stories);
            this._addStoryMarkers();
          }
        }

        // Keep track of current story IDs for next poll
        this.lastStoryIds = currentIds;
      } catch (error) {
        console.error('Error polling for new stories:', error);
      }
    }, 10000); // Poll every 10 seconds
  }

  _stopPollingNewStories() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

export default HomePage;