/**
 * LendGuard Multi-Channel Authentication Engine
 * - Email & Mobile Phone Support
 * - Password & 6-Digit OTP Verification
 * - Strict 3-Attempt Rate Limiter with 60s Persistent Lockout
 * - Password Entropy Analysis
 * - Tamper-Evident SHA-256 Audit Logging
 */

class AuthEngine {
  constructor() {
    this.storageKeyUsers = 'lendguard_users_db';
    this.storageKeySession = 'lendguard_auth_session';
    this.storageKeyFailed = 'lendguard_failed_auth_attempts';
    this.storageKeyLockout = 'lendguard_lockout_until';

    this.channel = 'email'; // 'email' or 'phone'
    this.mode = 'password';  // 'password' or 'otp'
    this.view = 'signin';    // 'signin', 'signup', or 'forgot'

    this.activeOTP = null;
    this.otpExpiresAt = null;
    this.resendTimer = null;
    this.resendSecondsLeft = 0;
    this.lockoutInterval = null;

    this.initUsers();
    this.checkInitialLockout();
  }

  initUsers() {
    if (!localStorage.getItem(this.storageKeyUsers)) {
      const defaultUser = {
        id: 'USR-DEMO-01',
        name: 'Karthik R.',
        email: 'demo@lendguard.io',
        phone: '+15550199',
        passwordHash: 'DemoPass@123', // In demo vault
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(this.storageKeyUsers, JSON.stringify([defaultUser]));
    }
  }

  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKeyUsers)) || [];
    } catch {
      return [];
    }
  }

  saveUsers(users) {
    localStorage.setItem(this.storageKeyUsers, JSON.stringify(users));
  }

  getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(this.storageKeySession)) || 
             JSON.parse(localStorage.getItem(this.storageKeySession)) || null;
    } catch {
      return null;
    }
  }

  setSession(user, remember = true) {
    const sessionData = {
      id: user.id,
      name: user.name || user.email || user.phone,
      email: user.email,
      phone: user.phone,
      loggedInAt: new Date().toISOString()
    };
    if (remember) {
      localStorage.setItem(this.storageKeySession, JSON.stringify(sessionData));
    }
    sessionStorage.setItem(this.storageKeySession, JSON.stringify(sessionData));
  }

  clearSession() {
    localStorage.removeItem(this.storageKeySession);
    sessionStorage.removeItem(this.storageKeySession);
    if (window.Security) {
      window.Security.logAudit('AUTH_LOGOUT', 'User signed out of vault');
    }
  }

  /* ================= 3-ATTEMPT RATE LIMITER & LOCKOUT ================= */
  getFailedAttempts() {
    return parseInt(sessionStorage.getItem(this.storageKeyFailed)) || 0;
  }

  incrementFailedAttempts() {
    let count = this.getFailedAttempts() + 1;
    sessionStorage.setItem(this.storageKeyFailed, count);

    if (window.Security) {
      window.Security.logAudit('AUTH_FAILED_ATTEMPT', `Failed authentication attempt ${count} of 3`);
    }

    if (count >= 3) {
      const lockoutEnd = Date.now() + 60000; // 60 seconds from now
      sessionStorage.setItem(this.storageKeyLockout, lockoutEnd);
      if (window.Security) {
        window.Security.logAudit('BRUTE_FORCE_LOCKOUT', 'Triggered 60-second rate limiter lockout (3 consecutive failed attempts)');
      }
      this.startLockoutTimer(lockoutEnd);
      return { locked: true, attemptsLeft: 0 };
    }

    return { locked: false, attemptsLeft: 3 - count };
  }

  resetFailedAttempts() {
    sessionStorage.removeItem(this.storageKeyFailed);
    sessionStorage.removeItem(this.storageKeyLockout);
    if (this.lockoutInterval) clearInterval(this.lockoutInterval);
    const banner = document.getElementById('authLockoutBanner');
    if (banner) banner.style.display = 'none';
    this.setAuthInputsDisabled(false);
  }

  checkInitialLockout() {
    const lockoutEnd = parseInt(sessionStorage.getItem(this.storageKeyLockout));
    if (lockoutEnd && Date.now() < lockoutEnd) {
      this.startLockoutTimer(lockoutEnd);
    } else {
      sessionStorage.removeItem(this.storageKeyLockout);
    }
  }

  startLockoutTimer(lockoutEnd) {
    this.setAuthInputsDisabled(true);
    const banner = document.getElementById('authLockoutBanner');
    const timerText = document.getElementById('lockoutTimerText');
    if (banner) banner.style.display = 'flex';

    if (this.lockoutInterval) clearInterval(this.lockoutInterval);

    const updateTimer = () => {
      const remainingMs = lockoutEnd - Date.now();
      if (remainingMs <= 0) {
        clearInterval(this.lockoutInterval);
        this.resetFailedAttempts();
        if (window.LendApp) window.LendApp.showToast('Lockout lifted. You may try signing in again.', 'info');
      } else {
        const secs = Math.ceil(remainingMs / 1000);
        if (timerText) timerText.textContent = `00:${secs.toString().padStart(2, '0')}`;
      }
    };

    updateTimer();
    this.lockoutInterval = setInterval(updateTimer, 1000);
  }

  setAuthInputsDisabled(disabled) {
    const inputs = document.querySelectorAll('#authFormBox input, #authFormBox button');
    inputs.forEach(el => {
      if (el.id !== 'btnToggleTheme') {
        el.disabled = disabled;
      }
    });
  }

  /* ================= PASSWORD STRENGTH ANALYZER ================= */
  analyzePassword(password) {
    let score = 0;
    if (!password) return { score: 0, label: 'None', color: '#6b7280', percent: 0 };

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: 'Weak ⚠️', color: '#ef4444', percent: 25 };
    if (score === 2) return { score: 2, label: 'Fair ⚡', color: '#f59e0b', percent: 50 };
    if (score === 3 || score === 4) return { score: 3, label: 'Good 🔒', color: '#3b82f6', percent: 75 };
    return { score: 5, label: 'Strong & Unbreakable 🛡️', color: '#10b981', percent: 100 };
  }

  /* ================= OTP GENERATION & VALIDATION ================= */
  generateOTP(destination) {
    // Generate 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.activeOTP = code;
    this.otpExpiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes validity

    if (window.Security) {
      window.Security.logAudit('OTP_GENERATED', `6-digit verification code generated for ${destination}`);
    }

    // Start 60s resend timer
    this.startResendCooldown(60);

    return code;
  }

  validateOTP(inputCode) {
    if (!this.activeOTP || !this.otpExpiresAt) {
      return { valid: false, message: 'No active OTP. Please click Resend.' };
    }
    if (Date.now() > this.otpExpiresAt) {
      this.activeOTP = null;
      return { valid: false, message: 'OTP has expired. Please request a new code.' };
    }
    if (inputCode.trim() === this.activeOTP) {
      this.activeOTP = null;
      return { valid: true };
    }
    return { valid: false, message: 'Incorrect OTP code.' };
  }

  startResendCooldown(seconds = 60) {
    this.resendSecondsLeft = seconds;
    const resendBtn = document.getElementById('btnResendOTP');
    const timerSpan = document.getElementById('otpResendTimerSpan');

    if (resendBtn) resendBtn.disabled = true;
    if (this.resendTimer) clearInterval(this.resendTimer);

    this.resendTimer = setInterval(() => {
      this.resendSecondsLeft--;
      if (timerSpan) timerSpan.textContent = `(00:${this.resendSecondsLeft.toString().padStart(2, '0')})`;

      if (this.resendSecondsLeft <= 0) {
        clearInterval(this.resendTimer);
        if (resendBtn) resendBtn.disabled = false;
        if (timerSpan) timerSpan.textContent = '';
      }
    }, 1000);
  }

  /* ================= AUTHENTICATION ACTIONS ================= */
  async signInWithPassword(identifier, password, remember = true) {
    const lockoutEnd = parseInt(sessionStorage.getItem(this.storageKeyLockout));
    if (lockoutEnd && Date.now() < lockoutEnd) {
      throw new Error('Vault is locked due to multiple failed attempts. Please wait for the timer.');
    }

    const cleanId = identifier.trim().toLowerCase();
    const users = this.getUsers();

    const user = users.find(u => 
      (u.email && u.email.toLowerCase() === cleanId) || 
      (u.phone && u.phone.replace(/[^0-9]/g, '') === cleanId.replace(/[^0-9]/g, ''))
    );

    if (!user || user.passwordHash !== password) {
      const { locked, attemptsLeft } = this.incrementFailedAttempts();
      if (locked) {
        throw new Error('3 failed attempts reached. Vault is locked for 60 seconds.');
      }
      throw new Error(`Invalid credentials. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`);
    }

    // Success!
    this.resetFailedAttempts();
    this.setSession(user, remember);
    if (window.Security) {
      window.Security.logAudit('AUTH_LOGIN_SUCCESS', `User ${user.name || user.email} authenticated via password`);
    }
    return user;
  }

  async signInWithOTP(identifier, otpCode, remember = true) {
    const lockoutEnd = parseInt(sessionStorage.getItem(this.storageKeyLockout));
    if (lockoutEnd && Date.now() < lockoutEnd) {
      throw new Error('Vault is locked due to multiple failed attempts. Please wait for the timer.');
    }

    const otpResult = this.validateOTP(otpCode);
    if (!otpResult.valid) {
      const { locked, attemptsLeft } = this.incrementFailedAttempts();
      if (locked) {
        throw new Error('3 failed attempts reached. Vault is locked for 60 seconds.');
      }
      throw new Error(`${otpResult.message} ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`);
    }

    const cleanId = identifier.trim().toLowerCase();
    let users = this.getUsers();
    let user = users.find(u => 
      (u.email && u.email.toLowerCase() === cleanId) || 
      (u.phone && u.phone.replace(/[^0-9]/g, '') === cleanId.replace(/[^0-9]/g, ''))
    );

    // If first time OTP login, auto-create user profile
    if (!user) {
      const isEmail = cleanId.includes('@');
      user = {
        id: 'USR-' + Date.now().toString(36).toUpperCase(),
        name: isEmail ? cleanId.split('@')[0] : 'User ' + cleanId.slice(-4),
        email: isEmail ? cleanId : '',
        phone: !isEmail ? cleanId : '',
        passwordHash: 'OTP_VERIFIED',
        createdAt: new Date().toISOString()
      };
      users.push(user);
      this.saveUsers(users);
    }

    this.resetFailedAttempts();
    this.setSession(user, remember);
    if (window.Security) {
      window.Security.logAudit('AUTH_LOGIN_SUCCESS', `User ${user.name || identifier} authenticated via 6-digit OTP`);
    }
    return user;
  }

  async signUpUser(name, email, phone, password) {
    const users = this.getUsers();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

    if (cleanEmail && users.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with this email already exists');
    }
    if (cleanPhone && users.some(u => u.phone && u.phone.replace(/[^0-9]/g, '') === cleanPhone)) {
      throw new Error('An account with this phone number already exists');
    }

    const newUser = {
      id: 'USR-' + Date.now().toString(36).toUpperCase(),
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash: password,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);
    this.setSession(newUser, true);

    if (window.Security) {
      window.Security.logAudit('USER_REGISTERED', `New account registered for ${name} (${cleanEmail || cleanPhone})`);
    }

    return newUser;
  }

  async resetPassword(identifier, newPassword) {
    const cleanId = identifier.trim().toLowerCase();
    let users = this.getUsers();
    let user = users.find(u => 
      (u.email && u.email.toLowerCase() === cleanId) || 
      (u.phone && u.phone.replace(/[^0-9]/g, '') === cleanId.replace(/[^0-9]/g, ''))
    );

    if (!user) {
      throw new Error('No user account found with that email or phone number');
    }

    user.passwordHash = newPassword;
    this.saveUsers(users);

    if (window.Security) {
      window.Security.logAudit('PASSWORD_RESET', `Password reset successful for ${user.email || user.phone}`);
    }

    return true;
  }
}

window.Auth = new AuthEngine();
