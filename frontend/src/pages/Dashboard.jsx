import React from 'react';

function Dashboard() {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
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
}

export default Dashboard; 