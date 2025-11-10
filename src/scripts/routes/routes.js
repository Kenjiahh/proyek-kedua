import HomePage from '../pages/home/home-page';
import LoginPage from '../pages/auth/login-page';
import RegisterPage from '../pages/auth/register-page';
import AddStoryPage from '../pages/story/add-story-page';

const routes = {
  '/': HomePage,
  '/home': HomePage,
  '/login': LoginPage,
  '/register': RegisterPage,
  '/add-story': AddStoryPage,
  // Handle routes without leading slash (for backward compatibility)
  'login': LoginPage,
  'register': RegisterPage,
  'home': HomePage,
  'add-story': AddStoryPage,
};

export default routes;