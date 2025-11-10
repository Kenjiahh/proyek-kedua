import StoryAPI from '../../data/api';

class LoginPage {
  async render() {
    return `
      <div class="auth-container">
        <h2>Login</h2>
        <form id="loginForm" class="auth-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
          </div>
          <div id="loginError" class="error-message" style="display: none;"></div>
          <button type="submit" id="submitButton">
            <span class="button-text">Login</span>
            <span class="loading-spinner" style="display: none;"></span>
          </button>
          <p class="auth-redirect">
            Don't have an account? <a href="#/register">Register here</a>
          </p>
        </form>
      </div>
    `;
  }

  async afterRender() {
    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('loginError');
    const submitButton = document.getElementById('submitButton');
    const buttonText = submitButton.querySelector('.button-text');
    const loadingSpinner = submitButton.querySelector('.loading-spinner');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorDiv.style.display = 'none';
      submitButton.disabled = true;
      buttonText.style.display = 'none';
      loadingSpinner.style.display = 'inline-block';

      try {
        const formData = new FormData(form);
        const loginData = {
          email: formData.get('email'),
          password: formData.get('password'),
        };

        await StoryAPI.login(loginData);
        window.location.hash = '#/';
        window.location.reload();
      } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
      } finally {
        submitButton.disabled = false;
        buttonText.style.display = 'inline';
        loadingSpinner.style.display = 'none';
      }
    });
  }
}

export default LoginPage;