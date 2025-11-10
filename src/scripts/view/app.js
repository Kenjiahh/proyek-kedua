import routes from '../routes/routes.js';
import StoryAPI from '../data/api.js';
import { clearStories, putStories, getAllStories } from '../data/idb.js';

class App {
  constructor({ content }) {
    this._content = content;
    this._renderInitialStructure();
    this._initDrawerEvents(); // Tambahkan ini
    this._initialData = {};
  }

  _renderInitialStructure() {
    // Remove existing header if any
    const existingHeader = document.querySelector('header');
    if (existingHeader) {
      existingHeader.remove();
    }

    // Remove existing navigation drawer if any
    const existingDrawer = document.getElementById('navigation-drawer');
    if (existingDrawer) {
      existingDrawer.remove();
    }

    // Remove existing overlay if any
    const existingOverlay = document.querySelector('.drawer-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Add new structure
    document.body.insertAdjacentHTML('afterbegin', `
      <a href="#main-content" class="skip-link">Skip to content</a>
      <header>
        <div class="header-content">
          <button id="hamburger-menu" class="hamburger-menu" aria-label="Menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <h1>Story App</h1>
        </div>
        <nav id="navigation-drawer" class="navigation-drawer">
          ${this._renderNav()}
        </nav>
      </header>
      <div class="drawer-overlay"></div>
    `);
  }

  async renderPage() {
    try {
      const url = this._parseActiveUrl();
      console.log('Current URL:', url);

      // Check if route exists
      if (!routes[url]) {
        console.warn(`Route "${url}" not found, redirecting to home`);
        window.location.hash = '#/';
        return;
      }

      // Get the page class from routes
      const PageClass = routes[url];
      const page = new PageClass();

      // Alternative DOM update for browsers that do not support view transition
      if (!document.startViewTransition) {
        this._content.innerHTML = await page.render();
        
        // Call afterRender if it exists
        if (typeof page.afterRender === 'function') {
          await page.afterRender();
        }

        // Re-initialize drawer events
        this._initDrawerEvents();
        return;
      }

      // Update DOM with view transition
      document.startViewTransition(async () => {
        this._content.innerHTML = await page.render();

        // Call afterRender if it exists
        if (typeof page.afterRender === 'function') {
          await page.afterRender();
        }

        // Re-initialize drawer events
        this._initDrawerEvents();
      });
    } catch (error) {
      console.error('Error rendering page:', error);
      this._content.innerHTML = `
        <div class="error-container">
          <h2>Something went wrong</h2>
          <p>${error.message}</p>
          <button onclick="window.location.reload()">Try Again</button>
        </div>
      `;
    }
  }

  _parseActiveUrl() {
    const hash = window.location.hash.slice(1).toLowerCase();
    // Normalize hash - ensure it starts with /
    if (hash && !hash.startsWith('/')) {
      return '/' + hash;
    }
    return hash || '/';
  }

  _initDrawerEvents() {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const navigationDrawer = document.getElementById('navigation-drawer');
    const overlay = document.querySelector('.drawer-overlay');
    const menuItems = document.querySelectorAll('.drawer-item');
    const logoutButton = document.getElementById('logoutButton');

    // Remove existing event listeners by removing and re-adding
    if (hamburgerMenu) {
      // Remove old listeners by cloning
      const newHamburger = hamburgerMenu.cloneNode(true);
      if (hamburgerMenu.parentNode) {
        hamburgerMenu.parentNode.replaceChild(newHamburger, hamburgerMenu);
      }
      
      newHamburger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Hamburger clicked');
        const nav = document.getElementById('navigation-drawer');
        const ovl = document.querySelector('.drawer-overlay');
        if (nav && ovl) {
          nav.classList.toggle('open');
          ovl.classList.toggle('active');
          newHamburger.classList.toggle('active');
        }
      });
    } else {
      console.warn('Hamburger menu not found!');
    }

    // Handle logout button FIRST using event delegation on drawer menu
    // Remove old event listener if exists
    if (this._logoutHandler) {
      const drawerMenu = document.querySelector('.drawer-menu');
      if (drawerMenu) {
        drawerMenu.removeEventListener('click', this._logoutHandler);
      }
    }

    // Create new handler - must be added BEFORE menu items to catch clicks
    this._logoutHandler = (e) => {
      const target = e.target;
      // Check if clicked element is logout button or inside it
      const logoutBtn = target.closest('#logoutButton') || target.closest('button#logoutButton');
      if (logoutBtn) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Logout button clicked (delegation)');
        if (confirm('Are you sure you want to logout?')) {
          StoryAPI.clearAllData();
          this._closeDrawer();
          window.location.hash = '#/';
          window.location.reload();
        }
        return true;
      }
    };

    const drawerMenu = document.querySelector('.drawer-menu');
    if (drawerMenu) {
      drawerMenu.addEventListener('click', this._logoutHandler, true); // Use capture phase
    }

    // Handle menu item clicks using event delegation on navigation drawer
    if (navigationDrawer) {
      // Remove old handler if exists
      if (this._menuItemHandler) {
        navigationDrawer.removeEventListener('click', this._menuItemHandler, true);
      }
      
      // Create new handler for menu items - use capture phase to catch before overlay
      this._menuItemHandler = (e) => {
        console.log('Click detected in drawer', e.target, e.currentTarget);
        
        // Find the closest drawer-item
        const target = e.target.closest('.drawer-item');
        if (!target) {
          console.log('No drawer-item found, target:', e.target);
          return;
        }
        
        console.log('Found drawer-item:', target);
        
        // Skip logout button (handled separately)
        if (target.id === 'logoutButton') {
          console.log('Skipping logout button - handled separately');
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const href = target.getAttribute('href');
        console.log('Navigating to:', href);
        if (href) {
          window.location.hash = href;
          // Close drawer after a short delay
          setTimeout(() => {
            this._closeDrawer();
          }, 100);
        }
      };
      
      // Use capture phase and make sure it's attached
      navigationDrawer.addEventListener('click', this._menuItemHandler, true);
      console.log('Menu item handler attached to navigation drawer');
      
      // Also add direct listeners as backup
      setTimeout(() => {
        const menuLinks = navigationDrawer.querySelectorAll('.drawer-item[href]');
        console.log('Found menu links:', menuLinks.length);
        menuLinks.forEach((link, index) => {
          const newLink = link.cloneNode(true);
          link.parentNode.replaceChild(newLink, link);
          newLink.addEventListener('click', (e) => {
            console.log('Direct click on menu item:', newLink.getAttribute('href'));
            e.preventDefault();
            e.stopPropagation();
            const href = newLink.getAttribute('href');
            if (href) {
              window.location.hash = href;
              setTimeout(() => {
                this._closeDrawer();
              }, 100);
            }
          }, true); // Use capture phase
        });
      }, 100);
    } else {
      console.warn('Navigation drawer not found for menu item handler');
    }

    // Also add direct event listener as backup - use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const logoutBtn = document.getElementById('logoutButton');
      if (logoutBtn) {
        // Remove old listeners by cloning
        if (logoutBtn.parentNode) {
          const newLogoutBtn = logoutBtn.cloneNode(true);
          logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
          
          newLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Logout button clicked (direct)');
            if (confirm('Are you sure you want to logout?')) {
              StoryAPI.clearAllData();
              this._closeDrawer();
              window.location.hash = '#/';
              window.location.reload();
            }
          });
        } else {
          // If no parent, add listener directly
          logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Logout button clicked (direct)');
            if (confirm('Are you sure you want to logout?')) {
              StoryAPI.clearAllData();
              this._closeDrawer();
              window.location.hash = '#/';
              window.location.reload();
            }
          });
        }
        console.log('Logout button event listener attached');
      } else {
        console.warn('Logout button not found in DOM');
      }
    }, 50);

    // Close drawer when clicking overlay
    if (overlay && overlay.parentNode) {
      const newOverlay = overlay.cloneNode(true);
      overlay.parentNode.replaceChild(newOverlay, overlay);
      
      newOverlay.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeDrawer();
      });
    }

    // Close drawer when pressing Escape (only add once)
    if (!this._escapeHandlerAdded) {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this._closeDrawer();
      }
    });
      this._escapeHandlerAdded = true;
    }
  }

  _closeDrawer() {
    const navigationDrawer = document.getElementById('navigation-drawer');
    const overlay = document.querySelector('.drawer-overlay');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    
    if (navigationDrawer) {
      navigationDrawer.classList.remove('open');
    }
    if (overlay) {
      overlay.classList.remove('active');
    }
    if (hamburgerMenu) {
      hamburgerMenu.classList.remove('active');
    }
  }

  _renderHeader() {
    const userData = StoryAPI.getUserData();
    const isLoggedIn = StoryAPI.isLoggedIn();
    const userInitial = userData?.name?.charAt(0).toUpperCase() || 'U';

    return `
      <header>
        <button id="drawer-button" aria-label="navigation menu">☰</button>
        <h1>Story App</h1>
        ${isLoggedIn ? `
          <div class="user-indicator">
            <div class="user-avatar">${userInitial}</div>
            <div class="user-info">
              <span class="user-name">${userData.name}</span>
            </div>
            <div class="user-dropdown">
              <div class="user-dropdown-header">
                <div class="user-name">${userData.name}</div>
                <div class="user-email">${userData.email}</div>
              </div>
              <div class="user-dropdown-menu">
                <a href="#/profile" class="user-dropdown-item">
                  <i class="fas fa-user"></i>
                  My Profile
                </a>
                <a href="#/add-story" class="user-dropdown-item">
                  <i class="fas fa-plus"></i>
                  Add Story
                </a>
                <a href="#" class="user-dropdown-item" id="logoutButton">
                  <i class="fas fa-sign-out-alt"></i>
                  Logout
                </a>
              </div>
            </div>
          </div>
        ` : ''}
      </header>
    `;
  }

  _initDropdownMenu() {
    const userIndicator = document.querySelector('.user-indicator');
    const dropdown = document.querySelector('.user-dropdown');
    
    if (userIndicator && dropdown) {
      // Toggle dropdown on click
      userIndicator.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        dropdown.classList.remove('show');
      });

      // Handle dropdown menu items
      const logoutButton = dropdown.querySelector('#logoutButton');
      logoutButton?.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
          await StoryAPI.logout();
          window.location.hash = '#/login';
          window.location.reload();
        }
      });
    }
  }

  _initLoginForm() {
    if (!this._initialData.loginForm) return;

    this._initialData.loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      
      try {
        const loginData = {
          email: formData.get('email'),
          password: formData.get('password'),
        };

        const response = await StoryAPI.login(loginData);
        
        if (response.loginResult) {
          // Redirect to home page after successful login
          window.location.hash = '#home';
          // Refresh the page to update the UI based on login state
          window.location.reload();
        }
      } catch (error) {
        console.error('Login error:', error);
        alert(error.message || 'Login failed. Please try again.');
      }
    });
  }

  async _renderContent(content) {
    return content || `
      <section class="content">
        <h2>404 - Page Not Found</h2>
        <p>The page you're looking for doesn't exist.</p>
      </section>
    `;
  }

  async _initializePageContent(page) {
    // Update form references after DOM changes
    this._initialData = {
      loginForm: document.querySelector('#loginForm'),
      registerForm: document.querySelector('#registerForm'),
      addStoryForm: document.querySelector('#addStoryForm'),
      storiesContainer: document.querySelector('#storiesContainer'),
    };

    switch (page) {
      case 'home':
        await this._loadStories();
        break;
      case 'login':
        this._initLoginForm();
        break;
      case 'register':
        this._initRegisterForm();
        break;
      case 'add-story':
        this._initAddStoryForm();
        break;
    }
  }

  async _loadStories() {
    try {
      if (!StoryAPI.isLoggedIn()) {
        this._initialData.storiesContainer.innerHTML = `
          <div class="auth-message">
            <p>Please login to view stories</p>
          </div>
        `;
        return;
      }

      this._initialData.storiesContainer.innerHTML = '<p>Loading stories...</p>';
      
      const response = await StoryAPI.getAllStories();
      
      if (!response.listStory || response.listStory.length === 0) {
        this._initialData.storiesContainer.innerHTML = '<p>No stories found</p>';
        return;
      }

      // Cache into IndexedDB
      await clearStories();
      await putStories(response.listStory);

      this._renderStories(response.listStory);
    } catch (error) {
      console.error('Error loading stories:', error);
      try {
        const cached = await getAllStories();
        if (cached.length > 0) {
          this._renderStories(cached);
          return;
        }
        this._initialData.storiesContainer.innerHTML = `
          <div class="error-message">
            <p>Failed to load stories</p>
            <p>Error: ${error.message}</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        `;
      } catch (e) {
        this._initialData.storiesContainer.innerHTML = `
          <div class="error-message">
            <p>Failed to load stories</p>
            <p>Error: ${error.message}</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        `;
      }
    }
  }

  _renderStories(stories) {
    if (!this._initialData.storiesContainer) return;
    
    this._initialData.storiesContainer.innerHTML = '';
    stories.forEach((story) => {
      const storyElement = this._createStoryElement(story);
      this._initialData.storiesContainer.appendChild(storyElement);
    });
  }

  _createStoryElement(story) {
    const article = document.createElement('article');
    article.classList.add('story-item');
    
    article.innerHTML = `
      <img src="${story.photoUrl}" alt="${story.description}" class="story-image">
      <div class="story-info">
        <h3>${story.name}</h3>
        <p>${story.description}</p>
        ${story.lat && story.lon ? `<p class="story-location">📍 ${story.lat}, ${story.lon}</p>` : ''}
      </div>
    `;
    
    return article;
  }

  _initLoginForm() {
    if (!this._initialData.loginForm) return;

    this._initialData.loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      
      try {
        const response = await StoryAPI.login({
          email: formData.get('email'),
          password: formData.get('password'),
        });
        
        StoryAPI.setToken(response.loginResult.token);
        window.location.hash = '#home';
        window.location.reload();
      } catch (error) {
        console.error('Login error:', error);
        alert(error.message);
      }
    });
  }

  _initRegisterForm() {
    if (!this._initialData.registerForm) return;

    this._initialData.registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      
      try {
        const registerData = {
          name: formData.get('name'),
          email: formData.get('email'),
          password: formData.get('password'),
        };

        await StoryAPI.register(registerData);
        alert('Registration successful! Please login.');
        window.location.hash = '#login';
      } catch (error) {
        console.error('Registration error:', error);
        alert(error.message || 'Registration failed. Please try again.');
      }
    });
  }

  _initAddStoryForm() {
    if (!this._initialData.addStoryForm) return;

    this._initialData.addStoryForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      
      try {
        await StoryAPI.addStory({
          description: formData.get('description'),
          photo: formData.get('photo').files[0],
          lat: formData.get('lat') || null,
          lon: formData.get('lon') || null,
        });
        
        alert('Story added successfully!');
        window.location.hash = '#home';
        event.target.reset();
      } catch (error) {
        console.error('Add story error:', error);
        alert(error.message);
      }
    });
  }

  _renderNav() {
    const isLoggedIn = StoryAPI.isLoggedIn();
    const userData = StoryAPI.getUserData();

    return `
      <div class="drawer-content">
        <div class="drawer-header">
          ${isLoggedIn 
            ? `<div class="user-info">
                <p class="user-email">${userData.email}</p>
              </div>`
            : '<h2>Menu</h2>'
          }
        </div>
        
        <nav class="drawer-nav">
          <ul class="drawer-menu">
            <li>
              <a href="#/home" class="drawer-item">
                <i class="fas fa-home"></i>
                Home
              </a>
            </li>
            
            ${isLoggedIn 
              ? `<li>
                  <a href="#/add-story" class="drawer-item">
                    <i class="fas fa-plus"></i>
                    Add Story
                  </a>
                </li>
                <li>
                  <button id="logoutButton" class="drawer-item">
                    <i class="fas fa-sign-out-alt"></i>
                    Logout
                  </button>
                </li>`
              : `<li>
                  <a href="#/login" class="drawer-item">
                    <i class="fas fa-sign-in-alt"></i>
                    Login
                  </a>
                </li>
                <li>
                  <a href="#/register" class="drawer-item">
                    <i class="fas fa-user-plus"></i>
                    Register
                  </a>
                </li>`
            }
          </ul>
        </nav>
      </div>
    `;
  }
}

export default App;