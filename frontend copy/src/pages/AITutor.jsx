import React from 'react';

function AITutor() {
  return (
    <div className="ai-tutor">
      <h1>AI Tutor</h1>
      <div className="tutor-container">
        <div className="chat-area">
          <div className="messages">
            <div className="message system">
              Hello! I'm your AI tutor. How can I help you with your courses today?
            </div>
          </div>
          <div className="input-area">
            <input type="text" placeholder="Ask a question..." />
            <button>Send</button>
          </div>
        </div>
        <div className="resources-panel">
          <h3>Course Materials</h3>
          <p>No materials uploaded yet.</p>
          <button>Upload Materials</button>
        </div>
      </div>
    </div>
  );
}

export default AITutor; 