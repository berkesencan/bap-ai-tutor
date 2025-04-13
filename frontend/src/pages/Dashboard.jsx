import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import './Dashboard.css';

export const Dashboard = () => {
  const { currentUser } = useAuth();

  // Extract first name for a more personal greeting
  const firstName = currentUser?.displayName?.split(' ')[0] || 'there';

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        
        {currentUser && (
          <div className="welcome-card">
            <h2>Welcome, {firstName}!</h2>
            <p>Ready to enhance your learning experience today?</p>
            <div className="quick-actions">
              <Link to="/ai-tutor" className="btn btn-primary">Go to AI Tutor</Link>
            </div>
          </div>
        )}
      </div>
      
      <div className="dashboard-content">
        <div className="dashboard-section">
          <h2>Upcoming Assignments</h2>
          <p>No assignments due soon.</p>
        </div>
        
        <div className="dashboard-section">
          <h2>Your Courses</h2>
          <p>No courses added yet.</p>
        </div>
        
        <div className="dashboard-section">
          <h2>Recent Activity</h2>
          <p>No recent activity.</p>
        </div>
      </div>
    </div>
  );
}; 