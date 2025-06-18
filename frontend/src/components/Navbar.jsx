import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGradescope } from '../contexts/GradescopeContext';
import { FaRobot } from 'react-icons/fa';
import './Navbar.css';

export const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const { isAuthenticated, needsReauth, loading: gradescopeLoading } = useGradescope();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Sound effect states
  const [soundPlayed, setSoundPlayed] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const audioRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    // Create audio element
    const audio = new Audio();
    
    // Try to load the r2d2 sound
    const soundPath = '/sounds/r2d2.wav';
    audio.src = soundPath;
    
    // Handle successful load
    const handleCanPlayThrough = () => {
      console.log(`Navbar audio loaded successfully from ${soundPath}`);
      setAudioLoaded(true);
      audio.removeEventListener('error', handleError);
    };
    
    // Handle load error
    const handleError = (e) => {
      console.warn(`Failed to load navbar audio from ${soundPath}`, e);
      setAudioLoaded(false);
    };
    
    // Set up event listeners
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('error', handleError);
    
    // Start loading
    audio.load();
    
    // Set the ref
    audioRef.current = audio;
    
    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Function to play robot sound
  const playRobotSound = () => {
    console.log("Navbar robot clicked! Attempting to play sound...");
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play()
        .then(() => {
          console.log("Navbar sound played successfully!");
          setSoundPlayed(true);
          setTimeout(() => setSoundPlayed(false), 500);
        })
        .catch(error => {
          console.error("Error playing navbar sound:", error);
          // Visual feedback if sound fails
          setSoundPlayed(true);
          setTimeout(() => setSoundPlayed(false), 500);
        });
    }
  };

  useEffect(() => {
    // CSS is now in Navbar.css
  }, []);

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

  // Determine what to show for Gradescope connection
  const shouldShowConnect = currentUser && (needsReauth || !isAuthenticated);
  const shouldShowManage = currentUser && isAuthenticated && !needsReauth;

  // Public navigation (not logged in) - minimal version without login/signup buttons
  const publicNav = (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className={`navbar-robot ${soundPlayed ? 'robot-active' : ''} ${audioLoaded ? 'loaded' : 'not-loaded'}`} onClick={playRobotSound}>
          <FaRobot className="navbar-robot-icon" />
          {soundPlayed && <span className="navbar-sound-wave"></span>}
        </div>
        <Link to="/">BAP AI Tutor</Link>
      </div>
      {/* Removed login/signup buttons since users are automatically redirected */}
    </nav>
  );

  // Private navigation (logged in)
  const privateNav = (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className={`navbar-robot ${soundPlayed ? 'robot-active' : ''} ${audioLoaded ? 'loaded' : 'not-loaded'}`} onClick={playRobotSound}>
          <FaRobot className="navbar-robot-icon" />
          {soundPlayed && <span className="navbar-sound-wave"></span>}
        </div>
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
        {shouldShowConnect && (
          <Link to="/connect" className={`nav-link ${isActive('/connect')} ${needsReauth ? 'connect-urgent' : ''}`}>
            {needsReauth ? 'Reconnect' : 'Connect'}
          </Link>
        )}
        {shouldShowManage && (
          <Link to="/connect" className={`nav-link ${isActive('/connect')}`}>
            Manage
          </Link>
        )}
        <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
      </div>
    </nav>
  );

  return currentUser ? privateNav : publicNav;
}; 

export default Navbar; 