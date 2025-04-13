import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  
  // Simulating authentication state - will replace with actual auth later
  const isAuthenticated = true;

  // Check if the current route is active
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  // Public navigation (not logged in)
  const publicNav = (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">StudyPlan</Link>
      </div>
      <div className="navbar-links">
        <Link to="/login" className="btn btn-primary">Log In</Link>
        <Link to="/signup" className="btn btn-secondary">Sign Up</Link>
      </div>
    </nav>
  );

  // Private navigation (logged in)
  const privateNav = (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard">StudyPlan</Link>
      </div>
      <div className="navbar-links">
        <Link to="/" className={`nav-link ${isActive('/')}`}>Home</Link>
        <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>Dashboard</Link>
        <Link to="/courses" className={`nav-link ${isActive('/courses')}`}>Courses</Link>
        <Link to="/assignments" className={`nav-link ${isActive('/assignments')}`}>Assignments</Link>
        <Link to="/ai-tutor" className={`nav-link ${isActive('/ai-tutor')}`}>AI Tutor</Link>
        <Link to="/settings" className={`nav-link ${isActive('/settings')}`}>Settings</Link>
        <button className="btn btn-secondary">Logout</button>
      </div>
    </nav>
  );

  return isAuthenticated ? privateNav : publicNav;
}

export default Navbar; 