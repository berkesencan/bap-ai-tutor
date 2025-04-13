import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // CSS classes for responsive design
    const styles = `
      .navbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
        position: relative;
        z-index: 1000;
      }
      .navbar-links {
        display: none;
        flex-direction: column;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background-color: #fff;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        width: 100%;
      }
      .navbar-links.open {
        display: flex !important;
      }
      .navbar-links a, .navbar-links button {
        padding: 0.5rem 1rem;
        text-decoration: none;
        color: #333;
        display: block;
      }
      .navbar-links a:hover, .navbar-links button:hover {
        color: #007bff;
        background-color: #f5f5f5;
      }
      .hamburger {
        display: none;
        cursor: pointer;
        z-index: 1001;
      }
      .hamburger div {
        width: 25px;
        height: 3px;
        background-color: #333;
        margin: 4px 0;
      }
      @media (min-width: 769px) {
        .navbar-links {
          display: flex;
          flex-direction: row;
          position: static;
          background-color: transparent;
          box-shadow: none;
        }
      }
      @media (max-width: 768px) {
        .navbar-links {
          display: none;
        }
        .navbar-links.open {
          display: flex !important;
        }
        .hamburger {
          display: block;
        }
      }
    `;

    // Add styles to the document
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Clean up function
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []); // Empty dependency array means this effect runs once on mount

  // Effect to close menu when location changes
  useEffect(() => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [location]);

  // Console log for debugging
  const toggleMenu = () => {
    console.log("Toggling menu, current state:", isMenuOpen);
    setIsMenuOpen(!isMenuOpen);
  };

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
      <div className="hamburger" onClick={toggleMenu}>
        <div></div>
        <div></div>
        <div></div>
      </div>
      <div className={`navbar-links ${isMenuOpen ? 'open' : ''}`}>
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
      <div className="hamburger" onClick={toggleMenu}>
        <div></div>
        <div></div>
        <div></div>
      </div>
      <div className={`navbar-links ${isMenuOpen ? 'open' : ''}`}>
        <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>Dashboard</Link>
        <Link to="/courses" className={`nav-link ${isActive('/courses')}`}>Courses</Link>
        <Link to="/assignments" className={`nav-link ${isActive('/assignments')}`}>Assignments</Link>
        <Link to="/ai-tutor" className={`nav-link ${isActive('/ai-tutor')}`}>AI Tutor</Link>
        <Link to="/connect" className={`nav-link ${isActive('/connect')}`}>Connect</Link>
        <Link to="/test-ai" className={`nav-link ${isActive('/test-ai')}`}>Test AI</Link>
        <Link to="/settings" className={`nav-link ${isActive('/settings')}`}>Settings</Link>
        <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
      </div>
    </nav>
  );

  return currentUser ? privateNav : publicNav;
};

export default Navbar; 