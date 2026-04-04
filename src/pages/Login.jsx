import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import '../styles/Login.css';
import { useLanguage } from '../context/LanguageContext';

export const Login = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [loginMode, setLoginMode] = useState('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const googleButtonRef = useRef(null);
  const googleInitializedForClientRef = useRef('');
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const text = language === 'ta'
    ? {
        enterId: 'மொபைல் எண் அல்லது மின்னஞ்சல் உள்ளிடவும்.',
        validId: 'செல்லுபடியாகும் 10 இலக்க மொபைல் எண் அல்லது மின்னஞ்சல் உள்ளிடவும்.',
        passwordMin: 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்.',
        loginFailed: 'இப்போது உள்நுழைய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
        googleLoginFailed: 'Google மூலம் உள்நுழைய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
        googleClientMissing: '.env கோப்பில் VITE_GOOGLE_CLIENT_ID அமைத்து server-ஐ மீண்டும் தொடங்கவும்.',
        title: 'TN Smart Bus-க்கு உள்நுழைக',
        tabLabel: 'உள்நுழைவு முறை தேர்வு',
        password: 'கடவுச்சொல்',
        otp: 'OTP (எதிர்கால வசதி)',
        idLabel: 'மொபைல் எண் / மின்னஞ்சல்',
        idPlaceholder: '9876543210 அல்லது email@example.com',
        passwordLabel: 'கடவுச்சொல்',
        passwordPlaceholder: 'கடவுச்சொல் உள்ளிடவும்',
        signingIn: 'உள்நுழைகிறது...',
        signIn: 'உள்நுழை',
        continueOtp: 'OTP மூலம் தொடரவும்',
        newUser: 'புதிய பயனரா?',
        createAccount: 'கணக்கு உருவாக்கவும்',
        continueWithGoogle: 'Google மூலம் தொடரவும்',
        or: 'அல்லது',
      }
    : {
        enterId: 'Enter mobile number or email.',
        validId: 'Enter valid 10-digit mobile number or valid email.',
        passwordMin: 'Password should be at least 6 characters.',
        loginFailed: 'Unable to login now. Please try again.',
        googleLoginFailed: 'Unable to sign in with Google. Please try again.',
        googleClientMissing: 'Set VITE_GOOGLE_CLIENT_ID in .env and restart the server.',
        title: 'Login to TN Smart Bus',
        tabLabel: 'Login method selector',
        password: 'Password',
        otp: 'OTP (Future-ready)',
        idLabel: 'Mobile number / Email',
        idPlaceholder: '9876543210 or email@example.com',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Enter password',
        signingIn: 'Signing In...',
        signIn: 'Sign In',
        continueOtp: 'Continue with OTP',
        newUser: 'New user?',
        createAccount: 'Create account',
        continueWithGoogle: 'Continue with Google',
        or: 'OR',
      };

  const handleGoogleCredential = useCallback(async (response) => {
    const idToken = response?.credential;
    if (!idToken) {
      setError(text.googleLoginFailed);
      return;
    }

    setGoogleLoading(true);
    setError('');
    try {
      await authService.googleLogin(idToken);
      navigate('/my-bookings');
    } catch (err) {
      console.error('Google login failed:', err);
      setError(text.googleLoginFailed);
    } finally {
      setGoogleLoading(false);
    }
  }, [navigate, text.googleLoginFailed]);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return;
    }

    let isDisposed = false;

    const initializeGoogle = () => {
      if (isDisposed || !window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      if (googleInitializedForClientRef.current !== googleClientId) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential,
        });
        googleInitializedForClientRef.current = googleClientId;
      }

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
        shape: 'rectangular',
      });
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    const scriptId = 'google-identity-services';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener('load', initializeGoogle);

    return () => {
      isDisposed = true;
      script?.removeEventListener('load', initializeGoogle);
    };
  }, [googleClientId, handleGoogleCredential]);

  const identifierType = useMemo(() => {
    const value = identifier.trim();
    if (!value) return 'unknown';
    if (/^[0-9]{10}$/.test(value)) return 'mobile';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
    return 'invalid';
  }, [identifier]);

  const validateCommon = () => {
    if (!identifier.trim()) return text.enterId;
    if (identifierType === 'invalid') return text.validId;
    return '';
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    const commonError = validateCommon();
    if (commonError) {
      setError(commonError);
      return;
    }

    if (password.trim().length < 6) {
      setError(text.passwordMin);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authService.login({
        identifier: identifier.trim(),
        password,
        loginType: identifierType,
      });
      navigate('/my-bookings');
    } catch (err) {
      console.error('Login failed:', err);
      setError(text.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpAction = (e) => {
    e.preventDefault();
    const commonError = validateCommon();
    if (commonError) {
      setError(commonError);
      return;
    }
    setError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">{text.title}</h2>

        <div className="login-mode-switch" role="tablist" aria-label={text.tabLabel}>
          <button
            type="button"
            className={`mode-btn ${loginMode === 'password' ? 'active' : ''}`}
            onClick={() => {
              setLoginMode('password');
              setError('');
            }}
          >
            {text.password}
          </button>
          <button
            type="button"
            className={`mode-btn ${loginMode === 'otp' ? 'active' : ''}`}
            onClick={() => {
              setLoginMode('otp');
              setError('');
            }}
          >
            {text.otp}
          </button>
        </div>

        <form className="auth-form" onSubmit={loginMode === 'password' ? handlePasswordLogin : handleOtpAction}>
          {error && <p className="auth-error">{error}</p>}

          <div className="form-group">
            <label className="form-label">{text.idLabel}</label>
            <input
              type="text"
              className="form-input"
              placeholder={text.idPlaceholder}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
            />
          </div>

          {loginMode === 'password' ? (
            <div className="form-group">
              <label className="form-label">{text.passwordLabel}</label>
              <input
                type="password"
                className="form-input"
                placeholder={text.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          ) : null}

          <button className="auth-submit-btn" disabled={loading}>
            {loginMode === 'password'
              ? loading ? text.signingIn : text.signIn
              : text.continueOtp}
          </button>
        </form>

        <div className="auth-divider" aria-hidden="true">
          <span>{text.or}</span>
        </div>

        {googleClientId ? (
          <div className="google-login-section">
            <p className="google-login-label">{googleLoading ? text.signingIn : text.continueWithGoogle}</p>
            <div ref={googleButtonRef} className="google-button-wrapper" />
          </div>
        ) : (
          <p className="auth-muted-note">{text.googleClientMissing}</p>
        )}

        <p className="auth-footer">
          {text.newUser} <Link to="/register" className="auth-link">{text.createAccount}</Link>
        </p>
      </div>
    </div>
  );
};
