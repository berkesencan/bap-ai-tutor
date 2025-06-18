import React, { createContext, useContext, useEffect, useState } from 'react';
import { checkGradescopeAuthStatus, setGradescopeAuthErrorCallback } from '../services/api';
import { useAuth } from './AuthContext';

const GradescopeContext = createContext();

export const useGradescope = () => {
  return useContext(GradescopeContext);
};

export const GradescopeProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);
  const { currentUser } = useAuth();

  // Check authentication status
  const checkAuthStatus = async (force = false) => {
    if (!currentUser) {
      setIsAuthenticated(false);
      setNeedsReauth(true);
      setLoading(false);
      return;
    }

    // Don't check too frequently unless forced
    if (!force && lastCheck && (Date.now() - lastCheck < 30000)) { // 30 seconds
      return;
    }

    try {
      setLoading(true);
      const response = await checkGradescopeAuthStatus();
      
      if (response.success && response.data) {
        setIsAuthenticated(response.data.isAuthenticated);
        setNeedsReauth(response.data.needsReauth);
        setLastCheck(Date.now());
      } else {
        setIsAuthenticated(false);
        setNeedsReauth(true);
      }
    } catch (error) {
      console.error('Error checking Gradescope auth status:', error);
      setIsAuthenticated(false);
      setNeedsReauth(true);
    } finally {
      setLoading(false);
    }
  };

  // Mark as needing re-authentication
  const markNeedsReauth = () => {
    setIsAuthenticated(false);
    setNeedsReauth(true);
    setLastCheck(null);
  };

  // Mark as authenticated
  const markAuthenticated = () => {
    setIsAuthenticated(true);
    setNeedsReauth(false);
    setLastCheck(Date.now());
  };

  // Register callback for API auth errors
  useEffect(() => {
    setGradescopeAuthErrorCallback(markNeedsReauth);
    
    return () => {
      setGradescopeAuthErrorCallback(null);
    };
  }, []);

  // Check status when user changes
  useEffect(() => {
    checkAuthStatus(true);
  }, [currentUser]);

  // Set up periodic checks
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      checkAuthStatus();
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [currentUser]);

  const value = {
    isAuthenticated,
    needsReauth,
    loading,
    checkAuthStatus,
    markNeedsReauth,
    markAuthenticated
  };

  return (
    <GradescopeContext.Provider value={value}>
      {children}
    </GradescopeContext.Provider>
  );
}; 