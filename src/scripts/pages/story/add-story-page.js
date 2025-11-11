import StoryAPI from '../../data/api';
import { putStories } from '../../data/idb';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

class AddStoryPage {
  constructor() {
    this.map = null;
    this.marker = null;
    this.selectedLocation = null;
  }

  async render() {
    console.log('Rendering AddStoryPage');
    
    if (!StoryAPI.isLoggedIn()) {
      window.location.hash = '#/login';
      return '<div>Redirecting to login...</div>';
    }

    return `
      <div class="add-story-container">
        <h2>Create New Story</h2>
        <form id="addStoryForm" class="story-form">
          <div class="form-group">
            <label for="photo">Photo</label>
            <input 
              type="file" 
              id="photo" 
              name="photo" 
              accept="image/*" 
              required
              aria-required="true"
              aria-describedby="photo-error"
            >
            <div id="imagePreview" class="image-preview"></div>
            <span id="photo-error" class="error-message" role="alert"></span>
          </div>
          
          <div class="form-group">
            <label for="description">Description</label>
            <textarea 
              id="description" 
              name="description" 
              rows="4" 
              required
              placeholder="Tell your story..."
              aria-required="true"
              aria-describedby="description-error"
            ></textarea>
            <span id="description-error" class="error-message" role="alert"></span>
          </div>
          
          <div class="form-group location-group">
            <label for="addStoryMap">Location (optional)</label>
            <p class="form-hint">Click on the map to select location</p>
            <div id="addStoryMap" class="story-map" style="width: 100%; height: 300px; margin: 10px 0;" role="application" aria-label="Map to select story location" tabindex="0"></div>
            <div class="location-info" id="locationInfo">
              <p class="info-text">No location selected</p>
            </div>
            <label for="lat" class="sr-only">Latitude</label>
            <input type="hidden" name="lat" id="lat">
            <label for="lon" class="sr-only">Longitude</label>
            <input type="hidden" name="lon" id="lon">
          </div>

          <div id="formError" class="error-message" style="display: none;" role="alert"></div>
          
          <button type="submit" class="btn-submit">
            <span class="btn-text">Post Story</span>
            <span class="btn-loading" style="display: none;">Posting...</span>
          </button>
        </form>
      </div>
    `;
  }

  async afterRender() {
    console.log('AddStoryPage afterRender');
    try {
      // Initialize map
      setTimeout(() => {
        this._initMap();
      }, 100);

      const form = document.getElementById('addStoryForm');
      const imagePreview = document.getElementById('imagePreview');
      const formError = document.getElementById('formError');
      const submitButton = form.querySelector('button[type="submit"]');
      const btnText = submitButton.querySelector('.btn-text');
      const btnLoading = submitButton.querySelector('.btn-loading');

      // Handle image preview
      form.querySelector('#photo').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            imagePreview.innerHTML = `
              <img src="${e.target.result}" alt="Preview">
            `;
          };
          reader.readAsDataURL(file);
        }
      });

      // Handle form submission
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        formError.style.display = 'none';
        submitButton.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';

        try {
          const formData = new FormData(form);
          const photoInput = form.querySelector('input[type="file"][name="photo"]');
          const photoFile = photoInput && photoInput.files && photoInput.files.length > 0 
            ? photoInput.files[0] 
            : null;
          
          const result = await StoryAPI.addStory({
            description: formData.get('description'),
            photo: photoFile,
            lat: this.selectedLocation ? this.selectedLocation.lat : null,
            lon: this.selectedLocation ? this.selectedLocation.lon : null,
          });

          // Cache the new story to IndexedDB
          try {
            // Fetch updated stories and cache them
            const updatedStories = await StoryAPI.getAllStories();
            if (updatedStories && updatedStories.listStory) {
              await putStories(updatedStories.listStory);
              console.log('New story cached to IndexedDB');
            }
          } catch (cacheError) {
            console.warn('Failed to cache story:', cacheError);
            // Don't fail the operation if caching fails
          }

          window.location.hash = '#/';
        } catch (error) {
          console.error('Add story error:', error);
          formError.textContent = error.message;
          formError.style.display = 'block';
        } finally {
          submitButton.disabled = false;
          btnText.style.display = 'inline';
          btnLoading.style.display = 'none';
        }
      });
    } catch (error) {
      console.error('AddStoryPage error:', error);
      document.querySelector('.add-story-container').innerHTML = `
        <div class="error-state">
          <p>Failed to load form</p>
          <button onclick="window.location.reload()">Try Again</button>
        </div>
      `;
    }
  }

  _initMap() {
    const mapElement = document.getElementById('addStoryMap');
    if (!mapElement) {
      console.error('Map element not found');
      return;
    }

    // Fix for Leaflet marker icon
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
      iconUrl: require('leaflet/dist/images/marker-icon.png'),
      shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
    });

    // Initialize map
    this.map = L.map('addStoryMap', {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([-6.2088, 106.8456], 13);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Add click listener to map
    this.map.on('click', (e) => {
      this._handleMapClick(e);
    });

    // Invalidate size to ensure map renders correctly
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 200);
  }

  _handleMapClick(e) {
    const { lat, lng } = e.latlng;

    // Remove existing marker
    if (this.marker) {
      this.map.removeLayer(this.marker);
    }

    // Add new marker
    this.marker = L.marker([lat, lng]).addTo(this.map);
    this.selectedLocation = { lat, lon: lng };

    // Update location info
    const locationInfo = document.getElementById('locationInfo');
    const latInput = document.getElementById('lat');
    const lonInput = document.getElementById('lon');
    
    if (locationInfo) {
      locationInfo.innerHTML = `
        <p class="info-text success">✓ Location selected</p>
        <p class="coordinates">Lat: ${lat.toFixed(6)}, Lon: ${lng.toFixed(6)}</p>
      `;
    }
    
    if (latInput) latInput.value = lat;
    if (lonInput) lonInput.value = lng;
  }
}

export default AddStoryPage;