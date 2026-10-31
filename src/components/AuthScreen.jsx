import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  KeyRound,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Database,
  Send,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AuthScreen({ onLoginSuccess, initialError = null }) {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup' | 'magiclink'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(initialError);
  const [infoNotice, setInfoNotice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [verificationSentEmail, setVerificationSentEmail] = useState('');

  // Redirect URI Configuration for Google Cloud Console Whitelist
  const isNetlifyOrigin = window.location.origin.includes('netlify.app');
  const [usePreauthorizedNetlify, setUsePreauthorizedNetlify] = useState(!isNetlifyOrigin);
  const [copiedUri, setCopiedUri] = useState('');
  const [showConfigHelper, setShowConfigHelper] = useState(false);

  // Check for incoming Supabase session on mount (e.g. from email verification link)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (session?.user) {
        const loggedUser = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email.split('@')[0],
          email: session.user.email,
          email_confirmed: !!session.user.email_confirmed_at,
          auth_provider: session.user.app_metadata?.provider || 'supabase',
          avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(session.user.email)}`,
          created_at: session.user.created_at,
        };
        onLoginSuccess(loggedUser);
      }
    });

    // Listen for auth state changes (e.g., when email verification callback finishes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const loggedUser = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email.split('@')[0],
          email: session.user.email,
          email_confirmed: !!session.user.email_confirmed_at,
          auth_provider: session.user.app_metadata?.provider || 'supabase',
          avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(session.user.email)}`,
          created_at: session.user.created_at,
        };
        onLoginSuccess(loggedUser);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [onLoginSuccess]);

  const getEffectiveRedirectUri = () => {
    if (usePreauthorizedNetlify) {
      return 'https://antigravity-token-tracker.netlify.app/auth/callback';
    }
    return `${window.location.origin}/auth/callback`;
  };

  // Direct, Synchronous Google OAuth 2.0 Redirect
  const handleGoogleAuth = async () => {
    setIsLoadingGoogle(true);
    setErrorMsg(null);
    setInfoNotice(null);

    // Try Supabase OAuth first if supported, fallback to direct Google OAuth URL
    try {
      const redirectOrigin = window.location.origin;
      const redirectUri = getEffectiveRedirectUri();
      const clientId = '719271873086-kpujid5noaftp00cc3lgf50fns212g3m.apps.googleusercontent.com';

      const scopes = [
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ].join(' ');

      const stateObj = {
        intent: 'master_login',
        origin: redirectOrigin,
        redirect_uri: redirectUri,
        timestamp: Date.now(),
      };

      const googleAuthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `access_type=offline&` +
        `prompt=select_account%20consent&` +
        `state=${encodeURIComponent(JSON.stringify(stateObj))}`;

      // Redirect browser to Google Accounts Consent Screen
      window.location.href = googleAuthUrl;
    } catch (err) {
      setErrorMsg({
        title: 'Google OAuth Initialization Failed',
        code: 'CLIENT_INIT_ERROR',
        message: err.message,
        diagnosis: 'Could not construct Google OAuth redirection URL in browser.',
      });
      setIsLoadingGoogle(false);
    }
  };

  // Supabase Real Email / Password Handler
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoNotice(null);

    if (!email.trim()) {
      setErrorMsg({
        title: 'Validation Error',
        code: 'MISSING_EMAIL',
        message: 'Please provide a valid email address.',
        diagnosis: 'Authentication requires a target email address.',
      });
      return;
    }

    // 1. Passwordless Magic Link Flow
    if (authMode === 'magiclink') {
      setIsSubmitting(true);
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        setIsSubmitting(false);

        if (error) {
          setErrorMsg({
            title: 'Magic Link Failed',
            code: error.code || 'OTP_FAILED',
            message: error.message,
            diagnosis: 'Supabase was unable to dispatch the authentication email.',
          });
        } else {
          setVerificationSentEmail(email.trim());
          setInfoNotice({
            title: 'Instant Sign-In Link Sent!',
            message: `A passwordless login link has been sent to ${email}. Check your inbox and click the link to authenticate immediately.`,
          });
        }
      } catch (err) {
        setIsSubmitting(false);
        setErrorMsg({
          title: 'Network Communication Error',
          code: 'NETWORK_ERROR',
          message: err.message,
          diagnosis: 'Failed to contact Supabase Auth servers.',
        });
      }
      return;
    }

    if (!password) {
      setErrorMsg({
        title: 'Validation Error',
        code: 'MISSING_PASSWORD',
        message: 'Please provide a password.',
        diagnosis: 'Authentication requires valid credentials.',
      });
      return;
    }

    // 2. Sign Up Flow with Supabase
    if (authMode === 'signup') {
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

      setIsSubmitting(true);

      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              name: name.trim() || email.split('@')[0],
            },
            emailRedirectTo: window.location.origin,
          },
        });

        setIsSubmitting(false);

        if (error) {
          setErrorMsg({
            title: 'Registration Error',
            code: error.code || 'SIGNUP_FAILED',
            message: error.message,
            diagnosis: error.message.includes('already registered')
              ? 'An account with this email already exists. Switch to Sign In tab.'
              : error.message,
          });
          return;
        }

        // Check if email verification is required
        if (data?.user && !data.session) {
          setVerificationSentEmail(email.trim());
          setInfoNotice({
            title: 'Verification Email Dispatched',
            message: `Supabase has sent a verification link to ${email}. Please verify your email from your browser to complete account activation.`,
          });
        } else if (data?.session?.user) {
          // Auto confirmed or session established
          const loggedUser = {
            id: data.session.user.id,
            name: name.trim() || email.split('@')[0],
            email: data.session.user.email,
            email_confirmed: true,
            auth_provider: 'supabase_email',
            avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email)}`,
            created_at: new Date().toISOString(),
          };
          onLoginSuccess(loggedUser);
        }
      } catch (err) {
        setIsSubmitting(false);
        setErrorMsg({
          title: 'Network Communication Error',
          code: 'SIGNUP_EXCEPTION',
          message: err.message,
          diagnosis: 'Failed to contact Supabase Auth servers.',
        });
      }
    } else {
      // 3. Sign In Flow with Supabase
      setIsSubmitting(true);

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        setIsSubmitting(false);

        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            setVerificationSentEmail(email.trim());
            setErrorMsg({
              title: 'Email Verification Required',
              code: 'EMAIL_NOT_CONFIRMED',
              message: `Your email (${email}) has not been verified yet.`,
              diagnosis: 'Supabase requires email confirmation before signing in. Check your inbox or click Resend Verification below.',
            });
          } else {
            setErrorMsg({
              title: 'Authentication Failed',
              code: error.code || 'INVALID_CREDENTIALS',
              message: error.message,
              diagnosis: 'Verify your email and password, or create an account if you have not registered yet.',
            });
          }
          return;
        }

        if (data?.user) {
          const loggedUser = {
            id: data.user.id,
            name: data.user.user_metadata?.name || data.user.email.split('@')[0],
            email: data.user.email,
            email_confirmed: !!data.user.email_confirmed_at,
            auth_provider: 'supabase_email',
            avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(data.user.email)}`,
            created_at: data.user.created_at,
          };
          onLoginSuccess(loggedUser);
        }
      } catch (err) {
        setIsSubmitting(false);
        setErrorMsg({
          title: 'Network Exception',
          code: 'SIGNIN_EXCEPTION',
          message: err.message,
          diagnosis: 'Could not contact Supabase Cloud authentication endpoint.',
        });
      }
    }
  };

  // Helper to Resend Email Verification Link
  const handleResendVerification = async () => {
    if (!verificationSentEmail) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationSentEmail,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      setIsSubmitting(false);
      if (error) {
        setErrorMsg({
          title: 'Resend Failed',
          code: error.code || 'RESEND_ERROR',
          message: error.message,
          diagnosis: 'Unable to resend verification email.',
        });
      } else {
        setInfoNotice({
          title: 'Verification Email Resent',
          message: `A fresh verification link was dispatched to ${verificationSentEmail}.`,
        });
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg({
        title: 'Resend Error',
        code: 'NETWORK_ERROR',
        message: err.message,
        diagnosis: 'Network error resending verification email.',
      });
    }
  };

  // Quick Demo Guest Access
  const handleGuestAccess = () => {
    const guestUser = {
      id: 'guest_daksh_dev',
      name: 'Daksh (Developer Sandbox)',
      email: 'daksh.developer@gmail.com',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Daksh',
      created_at: new Date().toISOString(),
      auth_provider: 'guest',
      email_confirmed: true,
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
            Industrial Multi-Account AI Quota & Telemetry Hub
          </p>

          {/* Supabase Industrial Backend Connected Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(0, 255, 136, 0.08)',
              border: '1px solid rgba(0, 255, 136, 0.25)',
              fontSize: '0.7rem',
              color: '#00ff88',
              marginTop: '8px',
            }}
          >
            <Database size={12} />
            <span>Supabase Cloud PostgreSQL Active (Persistent Cloud Sync)</span>
          </div>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up vs Magic Link */}
        <div className="auth-tab-switch">
          <button
            type="button"
            className={`auth-tab-btn ${authMode === 'signin' ? 'active' : ''}`}
            onClick={() => {
              setAuthMode('signin');
              setErrorMsg(null);
              setInfoNotice(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${authMode === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setAuthMode('signup');
              setErrorMsg(null);
              setInfoNotice(null);
            }}
          >
            Create Account
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${authMode === 'magiclink' ? 'active' : ''}`}
            onClick={() => {
              setAuthMode('magiclink');
              setErrorMsg(null);
              setInfoNotice(null);
            }}
          >
            Magic Link
          </button>
        </div>

        {/* Informational Banner */}
        {infoNotice && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              marginBottom: '14px',
              fontSize: '0.8rem',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00f0ff', fontWeight: 600, marginBottom: '4px' }}>
              <CheckCircle2 size={16} />
              <span>{infoNotice.title}</span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary, #ccc)', lineHeight: 1.4 }}>
              {infoNotice.message}
            </p>
            {verificationSentEmail && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isSubmitting}
                style={{
                  marginTop: '8px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  color: '#00f0ff',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <RefreshCw size={12} className={isSubmitting ? 'spin-anim' : ''} />
                <span>Resend Verification Email</span>
              </button>
            )}
          </div>
        )}

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
            {errorMsg.code === 'EMAIL_NOT_CONFIRMED' && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isSubmitting}
                style={{
                  marginTop: '8px',
                  background: 'rgba(255, 77, 77, 0.15)',
                  border: '1px solid rgba(255, 77, 77, 0.4)',
                  color: '#ff6666',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Send size={12} />
                <span>Resend Verification Link</span>
              </button>
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
                : authMode === 'signup'
                ? 'Sign Up with Google OAuth'
                : 'Sign In with Google OAuth'}
            </span>
          </button>

          <span className="auth-oauth-caption">
            Authenticates directly via Google Cloud Identity OAuth 2.0
          </span>

          {/* Google Redirect URI Whitelist Helper */}
          <div
            style={{
              marginTop: '8px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(0, 240, 255, 0.05)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              fontSize: '0.75rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#00f0ff', fontWeight: 600 }}>
                <Globe size={13} />
                <span>Google OAuth Whitelist Route:</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigHelper(!showConfigHelper)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted, #888)',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                }}
              >
                {showConfigHelper ? 'Hide Config' : 'Show Details'}
              </button>
            </div>

            <div style={{ color: 'var(--text-secondary, #ccc)', lineHeight: 1.4, marginBottom: '6px' }}>
              Redirect URI: <code style={{ color: '#00ff88', wordBreak: 'break-all' }}>{getEffectiveRedirectUri()}</code>
            </div>

            {showConfigHelper && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ffb84d' }}>
                  <input
                    type="checkbox"
                    checked={usePreauthorizedNetlify}
                    onChange={(e) => setUsePreauthorizedNetlify(e.target.checked)}
                  />
                  <span>Use Pre-Authorized Netlify Callback (Bypasses redirect_uri_mismatch)</span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/auth/callback`);
                      setCopiedUri(`${window.location.origin}/auth/callback`);
                      setTimeout(() => setCopiedUri(''), 3000);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedUri ? <Check size={11} className="text-neon" /> : <Copy size={11} />}
                    <span>{copiedUri ? 'Copied URI' : 'Copy Current URI'}</span>
                  </button>

                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#4285F4',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      textDecoration: 'underline',
                    }}
                  >
                    <span>Google Cloud Console</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="auth-divider">
          <span>OR INDUSTRIAL SUPABASE EMAIL AUTH</span>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleAuthSubmit} className="auth-form">
          {authMode === 'signup' && (
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
            <label>Email Address (For Multi-Browser Sync)</label>
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

          {authMode !== 'magiclink' && (
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
          )}

          {authMode === 'signup' && (
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

          <button
            type="submit"
            className="auth-submit-btn btn-primary"
            disabled={isSubmitting}
          >
            <span>
              {isSubmitting
                ? 'Communicating with Supabase Cloud...'
                : authMode === 'signup'
                ? 'Create Verified Workspace Account'
                : authMode === 'magiclink'
                ? 'Send Instant Passwordless Magic Link'
                : 'Sign In to Workspace'}
            </span>
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
