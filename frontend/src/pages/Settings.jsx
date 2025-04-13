import React from 'react';

function Settings() {
  return (
    <div className="settings">
      <h1>Settings</h1>
      <div className="settings-container">
        <div className="settings-section">
          <h2>Account Settings</h2>
          <div className="setting-item">
            <label>Display Name</label>
            <input type="text" placeholder="Your Name" />
          </div>
          <div className="setting-item">
            <label>Email</label>
            <input type="email" placeholder="your.email@example.com" disabled />
          </div>
        </div>
        
        <div className="settings-section">
          <h2>Platform Integrations</h2>
          <div className="setting-item">
            <span>Brightspace</span>
            <button className="connect-btn">Connect</button>
          </div>
          <div className="setting-item">
            <span>Gradescope</span>
            <button className="connect-btn">Connect</button>
          </div>
        </div>
        
        <div className="settings-section">
          <h2>Notification Preferences</h2>
          <div className="setting-item">
            <label>Email Notifications</label>
            <input type="checkbox" />
          </div>
          <div className="setting-item">
            <label>Assignment Reminders</label>
            <input type="checkbox" checked />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings; 