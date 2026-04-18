class Validators {
  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  static validatePassword(password) {
    // Requires at least 8 chars
    return password && password.length >= 8;
  }

  static validateName(name) {
    return name && name.trim().length >= 2;
  }
}

window.Validators = Validators;
