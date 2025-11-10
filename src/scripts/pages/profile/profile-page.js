import StoryAPI from '../../data/api';

class ProfilePage {
  async render() {
    const userData = StoryAPI.getUserData();
    if (!userData) {
      window.location.hash = '#/login';
      return '';
    }

    return `
      <div class="profile-container">
        <div id="profileContent">
          <div class="loading-indicator">Loading profile...</div>
        </div>
      </div>
    `;
  }

  async afterRender() {
    try {
      const userData = StoryAPI.getUserData();
      const profileContent = document.getElementById('profileContent');
      
      // Get user stories
      const response = await StoryAPI.getAllStories();
      const userStories = response.listStory.filter(
        story => story.name === userData.name
      );

      profileContent.innerHTML = `
        <div class="profile-header">
          <div class="profile-avatar">
            ${userData.name.charAt(0).toUpperCase()}
          </div>
          <div class="profile-info">
            <h2>${userData.name}</h2>
            <p class="profile-email">${userData.email}</p>
            <p class="profile-stats">Stories posted: ${userStories.length}</p>
          </div>
        </div>

        <div class="profile-stories">
          <h3>My Stories</h3>
          ${userStories.length > 0 ? `
            <div class="stories-grid">
              ${userStories.map(story => this._createStoryCard(story)).join('')}
            </div>
          ` : `
            <div class="empty-state">
              <p>You haven't posted any stories yet</p>
              <a href="#/add-story" class="btn-primary">Create Your First Story</a>
            </div>
          `}
        </div>
      `;
    } catch (error) {
      console.error('Profile page error:', error);
      document.getElementById('profileContent').innerHTML = `
        <div class="error-state">
          <p>Failed to load profile data</p>
          <button onclick="window.location.reload()" class="btn-retry">
            Try Again
          </button>
        </div>
      `;
    }
  }

  _createStoryCard(story) {
    return `
      <article class="story-card">
        <img src="${story.photoUrl}" alt="${story.description}" class="story-image">
        <div class="story-info">
          <p class="story-date">${new Date(story.createdAt).toLocaleDateString()}</p>
          <p class="story-description">${story.description}</p>
          ${story.lat && story.lon ? `
            <p class="story-location">
              <i class="fas fa-map-marker-alt"></i> 
              ${story.lat}, ${story.lon}
            </p>
          ` : ''}
        </div>
      </article>
    `;
  }
}

export default ProfilePage;