import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../assets/Logo';
import { FaBars, FaTimes, FaUserCircle, FaSignOutAlt, FaHome, FaBookReader, FaCalendarAlt, FaRobot, FaCog } from 'react-icons/fa';

export const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Check if the current route is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Logo size="sm" className="h-8 w-auto" />
                <span className="ml-2 font-bold text-xl">BAP AI Tutor</span>
              </div>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center">
            {currentUser && (
              <div className="flex space-x-6 mr-8">
                <Link to="/dashboard" 
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 
                    ${isActive('/dashboard') ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-700'}`}>
                  <FaHome className="mr-1" /> Dashboard
                </Link>
                <Link to="/courses" 
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 
                    ${isActive('/courses') ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-700'}`}>
                  <FaBookReader className="mr-1" /> Courses
                </Link>
                <Link to="/assignments" 
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 
                    ${isActive('/assignments') ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-700'}`}>
                  <FaCalendarAlt className="mr-1" /> Assignments
                </Link>
                <Link to="/ai-tutor" 
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 
                    ${isActive('/ai-tutor') ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-700'}`}>
                  <FaRobot className="mr-1" /> AI Tutor
                </Link>
              </div>
            )}
            
            {currentUser ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center text-sm bg-blue-700 rounded-full p-1 pr-3">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="h-8 w-8 rounded-full mr-2" />
                  ) : (
                    <FaUserCircle className="h-8 w-8 rounded-full mr-2" />
                  )}
                  <span className="font-medium">{currentUser.displayName || currentUser.email}</span>
                </div>
                <button onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 flex items-center justify-center text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  <FaSignOutAlt className="mr-1" /> Logout
                </button>
              </div>
            ) : (
              <div className="space-x-2">
                <Link to="/login"
                  className="bg-white hover:bg-gray-100 text-blue-600 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Login
                </Link>
                <Link to="/signup"
                  className="border border-white text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none"
            >
              {isMenuOpen ? <FaTimes className="h-6 w-6" /> : <FaBars className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu, show/hide based on menu state. */}
      <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-blue-800">
          {currentUser && (
            <>
              <Link
                to="/dashboard"
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive('/dashboard') ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-700'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <FaHome className="mr-2" /> Dashboard
              </Link>
              <Link
                to="/courses"
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive('/courses') ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-700'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <FaBookReader className="mr-2" /> Courses
              </Link>
              <Link
                to="/assignments"
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive('/assignments') ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-700'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <FaCalendarAlt className="mr-2" /> Assignments
              </Link>
              <Link
                to="/ai-tutor"
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive('/ai-tutor') ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-700'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <FaRobot className="mr-2" /> AI Tutor
              </Link>
              <Link
                to="/settings"
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive('/settings') ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-700'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <FaCog className="mr-2" /> Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                <FaSignOutAlt className="mr-2" /> Logout
              </button>
            </>
          )}
          {!currentUser && (
            <>
              <Link
                to="/login"
                className="block px-3 py-2 rounded-md text-base font-medium text-white bg-blue-900 hover:bg-blue-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="block px-3 py-2 rounded-md text-base font-medium text-white bg-blue-700 hover:bg-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Register
              </Link>
            </>
          )}
        </div>
        {currentUser && (
          <div className="pt-4 pb-3 border-t border-blue-700 bg-blue-800">
            <div className="flex items-center px-5">
              <div className="flex-shrink-0">
                {currentUser.photoURL ? (
                  <img className="h-10 w-10 rounded-full" src={currentUser.photoURL} alt="User profile" />
                ) : (
                  <FaUserCircle className="h-10 w-10 text-white" />
                )}
              </div>
              <div className="ml-3">
                <div className="text-base font-medium leading-none text-white">{currentUser.displayName || 'User'}</div>
                <div className="text-sm font-medium leading-none text-blue-200 mt-1">{currentUser.email}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}; 