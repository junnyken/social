class AuthService {
  constructor() {
    this.baseUrl = '/api/auth';
  }

  /**
   * Logs in a user with email and password
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<Object>} The authenticated user data and token
   */
  async login(email, password) {
    // Temporary mock implementation mimicking an API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!window.Validators.validateEmail(email)) {
          return reject(new Error('Invalid email format.'));
        }
        
        // Mock successful login
        console.log(`Mock attempting login for ${email}`);
        localStorage.setItem('auth_token', 'mock_token_123');
        resolve({
          success: true,
          token: 'mock_token_123',
          user: { id: 1, email, name: 'Demo User' }
        });
      }, 1000);
    });

    /* Real implementation template:
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');
      localStorage.setItem('auth_token', data.token);
      return data;
    } catch (err) {
      throw err;
    }
    */
  }

  /**
   * Registers a new user
   * @param {string} email 
   * @param {string} password 
   * @param {string} name 
   */
  async register(email, password, name) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!window.Validators.validateEmail(email)) {
          return reject(new Error('Invalid email address.'));
        }
        if (!window.Validators.validatePassword(password)) {
          return reject(new Error('Password must be at least 8 characters.'));
        }
        if (!window.Validators.validateName(name)) {
          return reject(new Error('Name must be at least 2 characters.'));
        }

        console.log(`Mock registration for ${email}`);
        resolve({ success: true, message: 'Registration successful' });
      }, 1000);
    });

    /* Real implementation template:
    try {
      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed');
      return data;
    } catch (err) {
      throw err;
    }
    */
  }

  logout() {
    localStorage.removeItem('auth_token');
    window.location.href = '/login.html';
  }

  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
  }
}

window.AuthService = AuthService;
