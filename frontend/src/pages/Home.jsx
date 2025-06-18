import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
      <div className="hero-section">
        <h1>Welcome to BAP AI Tutor</h1>
        <h2>Your All-in-One Academic Planner</h2>
        <p>
                Track assignments, prepare for exams, and get personalized AI tutoring
                all in one platform. Never miss a deadline again!
              </p>
        <div className="cta-buttons">
          <Link to="/login" className="btn btn-primary">Log In</Link>
          <Link to="/signup" className="btn btn-secondary">Sign Up</Link>
        </div>
            </div>
            
      <div className="features-section">
        <div className="feature">
          <h3>Assignment Tracking</h3>
          <p>Keep track of all your assignments from different platforms in one place.</p>
        </div>
        <div className="feature">
          <h3>AI Tutoring</h3>
          <p>Get help from an AI tutor that knows your course materials.</p>
        </div>
        <div className="feature">
          <h3>Platform Integration</h3>
          <p>Seamlessly connect with Brightspace, Gradescope, and more.</p>
        </div>
        </div>
    </div>
  );
}

export default Home; 