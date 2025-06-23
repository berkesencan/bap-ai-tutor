import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

function Signup() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // If user is authenticated, don't render anything (they'll be redirected)
  if (currentUser) {
    return null;
  }

  const handleGoogleSignUp = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      setError('Failed to create account with Google. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="auth-shapes">
          <div className="auth-shape auth-shape-1"></div>
          <div className="auth-shape auth-shape-2"></div>
        </div>
      </div>
      
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-badge">
            <span className="auth-badge-icon">✨</span>
            <span>Join BAP AI Tutor</span>
          </div>
          <h1 className="auth-title">Create Your Account</h1>
          <p className="auth-subtitle">
            Start your journey to smarter, easier learning today
          </p>
        </div>
        
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}
        
        <div className="auth-form">
        <button
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="google-signin-button"
        >
            <span className="google-icon">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </span>
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Creating your account...
              </>
            ) : (
              'Get Started with Google'
            )}
        </button>
          
          <div className="auth-divider">
            <span>Free • No Credit Card Required</span>
          </div>
        </div>
        
        <div className="auth-footer">
        <p className="auth-redirect">
            Already have an account? 
            <Link to="/login" className="auth-link">Sign in here</Link>
          </p>
          
          <div className="signup-features">
            <h3 className="features-title">What you'll get:</h3>
            <div className="feature-list">
              <div className="signup-feature">
                <span className="feature-icon">🤖</span>
                <span>AI-powered tutoring for all subjects</span>
              </div>
              <div className="signup-feature">
                <span className="feature-icon">📚</span>
                <span>Unified assignment management</span>
              </div>
              <div className="signup-feature">
                <span className="feature-icon">🔗</span>
                <span>Connect all your learning platforms</span>
              </div>
              <div className="signup-feature">
                <span className="feature-icon">📅</span>
                <span>Smart calendar and deadline tracking</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup; 