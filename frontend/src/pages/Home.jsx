import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

function Home() {
  const { currentUser } = useAuth();
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

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
        </div>
        
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-icon">🎓</span>
            <span>Revolutionizing Education</span>
          </div>
          
          <h1 className="hero-title">
            Your All-in-One
            <span className="title-highlight"> Academic Platform</span>
          </h1>
          
          <p className="hero-description">
            Seamlessly connect teachers and students with AI-powered tools, 
            unified platform integration, and intelligent assignment management. 
            <strong>Making education effortless.</strong>
          </p>
          
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">10+</span>
              <span className="stat-label">Platforms Integrated</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">AI</span>
              <span className="stat-label">Powered Tutoring</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">∞</span>
              <span className="stat-label">Possibilities</span>
            </div>
          </div>
            
          <div className="hero-actions">
            <Link to="/signup" className="cta-button primary">
              <span className="button-icon">✨</span>
              Get Started Free
              <span className="button-arrow">→</span>
            </Link>
            <Link to="/login" className="cta-button secondary">
              <span className="button-icon">🔑</span>
              Sign In
            </Link>
          </div>
          
          <p className="hero-note">
            <span className="note-icon">🚀</span>
            Join thousands of educators and students already using BAP AI Tutor
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2 className="section-title">Why Choose BAP AI Tutor?</h2>
          <p className="section-subtitle">
            Everything you need to streamline education, all in one beautiful platform
          </p>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <span className="feature-icon">📚</span>
            </div>
            <h3 className="feature-title">Unified Assignment Hub</h3>
            <p className="feature-description">
              Automatically sync assignments from Gradescope, Brightspace, Canvas, and more. 
              Never miss a deadline with intelligent notifications and calendar integration.
            </p>
            <div className="feature-tags">
              <span className="tag">Auto-Sync</span>
              <span className="tag">Smart Alerts</span>
              <span className="tag">Calendar</span>
            </div>
          </div>
          
          <div className="feature-card featured">
            <div className="featured-badge">Most Popular</div>
            <div className="feature-icon-wrapper">
              <span className="feature-icon">🤖</span>
            </div>
            <h3 className="feature-title">AI-Powered Tutoring</h3>
            <p className="feature-description">
              Get instant help with course materials, practice problems, and concept explanations. 
              Our AI understands your specific curriculum and learning style.
            </p>
            <div className="feature-tags">
              <span className="tag">24/7 Available</span>
              <span className="tag">Personalized</span>
              <span className="tag">Course-Aware</span>
            </div>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <span className="feature-icon">🔗</span>
            </div>
            <h3 className="feature-title">Seamless Integration</h3>
            <p className="feature-description">
              Connect with all your favorite educational platforms in seconds. 
              One dashboard to rule them all, with zero learning curve.
            </p>
            <div className="feature-tags">
              <span className="tag">One-Click Setup</span>
              <span className="tag">Multi-Platform</span>
              <span className="tag">Secure</span>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="benefits-content">
          <div className="benefits-text">
            <h2 className="benefits-title">
              Simplicity Meets
              <span className="title-accent"> Powerful Features</span>
            </h2>
            <p className="benefits-description">
              We believe education technology should enhance learning, not complicate it. 
              That's why we've designed every feature with simplicity and effectiveness in mind.
            </p>
            
            <div className="benefits-list">
              <div className="benefit-item">
                <span className="benefit-icon">⚡</span>
                <div className="benefit-content">
                  <h4>Lightning Fast Setup</h4>
                  <p>Get started in under 2 minutes with our guided onboarding</p>
                </div>
              </div>
              
              <div className="benefit-item">
                <span className="benefit-icon">🎯</span>
                <div className="benefit-content">
                  <h4>Intelligent Organization</h4>
                  <p>AI automatically categorizes and prioritizes your academic workload</p>
                </div>
              </div>
              
              <div className="benefit-item">
                <span className="benefit-icon">🌟</span>
                <div className="benefit-content">
                  <h4>Beautiful Experience</h4>
                  <p>Clean, intuitive interface that makes complex tasks feel simple</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="benefits-visual">
            <div className="visual-card">
              <div className="card-header">
                <div className="card-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="card-title">Your Dashboard</span>
              </div>
              <div className="card-content">
                <div className="mock-item">
                  <span className="mock-icon green">📊</span>
                  <span className="mock-text">5 assignments due this week</span>
                </div>
                <div className="mock-item">
                  <span className="mock-icon blue">🤖</span>
                  <span className="mock-text">AI tutor ready to help</span>
                </div>
                <div className="mock-item">
                  <span className="mock-icon purple">🔗</span>
                  <span className="mock-text">3 platforms connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Transform Your Academic Experience?</h2>
          <p className="cta-description">
            Join the future of education today. Simple, powerful, and designed for success.
          </p>
          
          <div className="cta-actions">
            <Link to="/signup" className="cta-button primary large">
              <span className="button-icon">🚀</span>
              Start Your Journey
              <span className="button-arrow">→</span>
            </Link>
          </div>
          
          <div className="cta-features">
            <div className="cta-feature">
              <span className="cta-feature-icon">✅</span>
              <span>Free to start</span>
            </div>
            <div className="cta-feature">
              <span className="cta-feature-icon">✅</span>
              <span>No credit card required</span>
            </div>
            <div className="cta-feature">
              <span className="cta-feature-icon">✅</span>
              <span>Setup in minutes</span>
            </div>
        </div>
        </div>
      </section>
    </div>
  );
}

export default Home; 