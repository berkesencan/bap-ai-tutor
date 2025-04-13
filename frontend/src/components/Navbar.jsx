import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if the current route is active
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  // Public navigation (not logged in)
  const publicNav = (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">BAP AI Tutor</Link>
      </div>
      <div className="navbar-links">
        <Link to="/test-ai" className={`nav-link ${isActive('/test-ai')}`}>Test AI</Link>
        <Link to="/login" className="btn btn-primary">Log In</Link>
        <Link to="/signup" className="btn btn-secondary">Sign Up</Link>
      </div>
    </nav>
  );

  // Private navigation (logged in)
  const privateNav = (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard">BAP AI Tutor</Link>
      </div>
      <div className="navbar-links">
        <Link to="/" className={`nav-link ${isActive('/')}`}>Home</Link>
        <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>Dashboard</Link>
        <Link to="/courses" className={`nav-link ${isActive('/courses')}`}>Courses</Link>
        <Link to="/assignments" className={`nav-link ${isActive('/assignments')}`}>Assignments</Link>
        <Link to="/ai-tutor" className={`nav-link ${isActive('/ai-tutor')}`}>AI Tutor</Link>
        <Link to="/test-ai" className={`nav-link ${isActive('/test-ai')}`}>Test AI</Link>
        <Link to="/settings" className={`nav-link ${isActive('/settings')}`}>Settings</Link>
        <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
      </div>
    </nav>
  );

  return currentUser ? privateNav : publicNav;
};

export default Navbar; 