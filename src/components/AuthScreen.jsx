import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ExternalLink
} from 'lucide-react';

export default function AuthScreen({ onLoginSuccess, initialError = null }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(initialError);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

  // Real Google OAuth Redirect Flow
  const handleGoogleAuth = async () => {
    setIsLoadingGoogle(true);
    setErrorMsg(null);
    try {
      const redirectOrigin = window.location.origin;
      const redirectUri = `${redirectOrigin}/auth/callback`;
      
      const res = await fetch(
        `/api/auth-url?intent=master_login&origin=${encodeURIComponent(redirectOrigin)}&redirect_uri=${encodeURIComponent(redirectUri)}`
      );
      const data = await res.json();

      if (data.url) {
        // Redirect to Google OAuth Consent Screen
        window.location.href = data.url;
      } else {
        setErrorMsg({
          title: 'Google OAuth Initialization Failed',
          code: 'AUTH_URL_GEN_FAILED',
          message: data.error || 'Failed to construct Google OAuth authorization URL.',
          diagnosis: 'The server could not produce a valid authorization URL for Google Identity.',
        });
        setIsLoadingGoogle(false);
      }
    } catch (err) {
      setErrorMsg({
        title: 'Network Communication Error',
        code: 'NETWORK_ERROR',
        message: err.message,
        diagnosis: 'Could not reach the authentication endpoint. Please verify connection or server status.',
      });
      setIsLoadingGoogle(false);
    }
  };

  // Email / Password Handler
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg({
        title: 'Validation Error',
        code: 'MISSING_FIELDS',
        message: 'Please provide both an email address and a password.',
        diagnosis: 'Authentication requires valid credentials.',
      });
      return;
    }

    if (isSignUp) {
      if (password.length < 6) {
        setErrorMsg({
          title: 'Weak Password',
          code: 'PASSWORD_TOO_SHORT',
          message: 'Password must be at least 6 characters in length.',
          diagnosis: 'Security policy requires a minimum of 6 characters.',
        });
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg({
          title: 'Password Mismatch',
          code: 'PASSWORDS_DO_NOT_MATCH',
          message: 'The confirmed password does not match.',
          diagnosis: 'Ensure both password fields match exactly.',
        });
        return;
      }

      // Check if user already exists
      const existingUsers = JSON.parse(localStorage.getItem('antigravity_registered_users') || '[]');
      if (existingUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        setErrorMsg({
          title: 'Account Already Exists',
          code: 'USER_ALREADY_REGISTERED',
          message: `An account with email "${email}" already exists.`,
          diagnosis: 'Please switch to the Sign In tab to access your account.',
        });
        return;
      }

      const newUser = {
        id: `user_${Date.now()}`,
        name: name.trim() || email.split('@')[0],
        email: email.trim().toLowerCase(),
        password: password, // In client demo context
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email)}`,
        created_at: new Date().toISOString(),
        auth_provider: 'email',
      };

      existingUsers.push(newUser);
      localStorage.setItem('antigravity_registered_users', JSON.stringify(existingUsers));
      onLoginSuccess(newUser);
    } else {
      // Sign In Flow
      const existingUsers = JSON.parse(localStorage.getItem('antigravity_registered_users') || '[]');
      const user = existingUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        setErrorMsg({
          title: 'Account Not Found',
          code: 'USER_NOT_FOUND',
          message: `No account found for "${email}".`,
          diagnosis: 'Check your email spelling or create a new account using the Sign Up tab.',
        });
        return;
      }

      if (user.password !== password) {
        setErrorMsg({
          title: 'Invalid Credentials',
          code: 'INVALID_PASSWORD',
          message: 'The password entered is incorrect.',
          diagnosis: 'Please verify your password and try again.',
        });
        return;
      }

      onLoginSuccess(user);
    }
  };

  // Quick Demo Guest Access
  const handleGuestAccess = () => {
    const guestUser = {
      id: 'guest_daksh_dev',
      name: 'Daksh',
      email: 'daksh.developer@gmail.com',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Daksh',
      created_at: new Date().toISOString(),
      auth_provider: 'guest',
    };
    onLoginSuccess(guestUser);
  };

  return (
    <div className="auth-screen-backdrop">
      <div className="auth-screen-card glass-panel">
        {/* Brand Banner */}
        <div className="auth-brand-header">
          <div className="auth-logo-badge">
            <Sparkles className="auth-sparkle-icon" size={26} />
          </div>
          <h1 className="auth-brand-title">Antigravity Token Matrix</h1>
          <p className="auth-brand-tagline">
            Multi-Account Urban AI Telemetry & Token Intelligence
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="auth-tab-switch">
          <button
            type="button"
            className={`auth-tab-btn ${!isSignUp ? 'active' : ''}`}
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${isSignUp ? 'active' : ''}`}
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg(null);
            }}
          >
            Create Account
          </button>
        </div>

        {/* Specific Diagnostic Error Alert if Failed */}
        {errorMsg && (
          <div className="auth-error-card">
            <div className="auth-error-title-row">
              <ShieldAlert size={16} className="text-danger" />
              <strong>{errorMsg.title || 'Authentication Failed'}</strong>
              {errorMsg.code && <span className="auth-error-code">[{errorMsg.code}]</span>}
            </div>
            <p className="auth-error-desc">{errorMsg.message}</p>
            {errorMsg.diagnosis && (
              <p className="auth-error-diag">
                <strong>Specific Reason: </strong>{errorMsg.diagnosis}
              </p>
            )}
          </div>
        )}

        {/* Primary Action: Official Google OAuth Button */}
        <div className="auth-google-wrapper">
          <button
            type="button"
            className="auth-google-btn"
            onClick={handleGoogleAuth}
            disabled={isLoadingGoogle}
          >
            <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>
              {isLoadingGoogle
                ? 'Contacting Google Accounts...'
                : isSignUp
                ? 'Sign Up with Google OAuth'
                : 'Sign In with Google OAuth'}
            </span>
          </button>
          <span className="auth-oauth-caption">
            Authenticates directly via Google Identity Services (OAuth 2.0)
          </span>
        </div>

        {/* Divider */}
        <div className="auth-divider">
          <span>OR CONTINUE WITH CREDENTIALS</span>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleEmailSubmit} className="auth-form">
          {isSignUp && (
            <div className="auth-field">
              <label>Full Name</label>
              <div className="auth-input-container">
                <User size={16} className="auth-input-icon" />
                <input
                  type="text"
                  placeholder="Daksh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="auth-text-input"
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label>Email Address</label>
            <div className="auth-input-container">
              <Mail size={16} className="auth-input-icon" />
              <input
                type="email"
                placeholder="developer@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-text-input"
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-container">
              <Lock size={16} className="auth-input-icon" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-text-input"
              />
            </div>
          </div>

          {isSignUp && (
            <div className="auth-field">
              <label>Confirm Password</label>
              <div className="auth-input-container">
                <KeyRound size={16} className="auth-input-icon" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="auth-text-input"
                />
              </div>
            </div>
          )}

          <button type="submit" className="auth-submit-btn btn-primary">
            <span>{isSignUp ? 'Create Workspace Account' : 'Sign In to Workspace'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Footer: Quick Guest Preview */}
        <div className="auth-footer-actions">
          <button
            type="button"
            className="auth-guest-btn"
            onClick={handleGuestAccess}
          >
            ⚡ Enter as Guest Developer (Instant Sandbox)
          </button>
        </div>
      </div>
    </div>
  );
}
