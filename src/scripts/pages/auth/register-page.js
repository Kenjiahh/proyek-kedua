import StoryAPI from '../../data/api';

class RegisterPage {
  async render() {
    return `
      <div class="auth-container">
        <h2>Register</h2>
        <form id="registerForm" class="auth-form">
          <div class="form-group">
            <label for="name">Full Name</label>
            <input type="text" id="name" name="name" required>
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
          </div>
          <div id="registerError" class="error-message" style="display: none;"></div>
          <button type="submit">Register</button>
          <p class="auth-redirect">
            Already have an account? <a href="#/login">Login here</a>
          </p>
        </form>
      </div>
    `;
  }

  async afterRender() {
    const form = document.getElementById('registerForm');
    const errorDiv = document.getElementById('registerError');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorDiv.style.display = 'none';

      try {
        const formData = new FormData(form);
        const registerData = {
          name: formData.get('name'),
          email: formData.get('email'),
          password: formData.get('password'),
        };

        await StoryAPI.register(registerData);
        alert('Registration successful! Please login.');
        window.location.hash = '#/login';
      } catch (error) {
        console.error('Registration error:', error);
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
      }
    });
  }
}

export default RegisterPage;