import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="home">
      <div className="hero-section">
        <h1>Welcome to StudyPlan</h1>
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