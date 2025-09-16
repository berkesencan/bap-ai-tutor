import React from 'react';

/**
 * AnswerKeyViewer Component
 * Handles the display of answer keys in a beautiful, professional format
 */
const AnswerKeyViewer = {
  /**
   * Opens the answer key in a new window with professional styling
   * @param {Object} answerKeyData - The answer key data object
   * @param {string} answerKeyData.answerKey - The answer key content
   * @param {string} answerKeyData.subject - The subject of the exam
   * @param {string} answerKeyData.difficulty - The difficulty level
   * @param {string} answerKeyData.generatedAt - The generation timestamp
   */
  open: (answerKeyData) => {
    try {
      console.log('📖 Opening answer key:', answerKeyData);
      
      if (!answerKeyData || !answerKeyData.answerKey) {
        alert('Answer key not available. Please try generating a new exam.');
        return;
      }
      
      // Create a new window/tab to display the answer key
      const answerWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      
      if (!answerWindow) {
        alert('Please allow pop-ups to view the answer key.');
        return;
      }
      
      // Extract data with fallbacks
      const subject = answerKeyData.subject || 'Unknown';
      const difficulty = answerKeyData.difficulty || 'Unknown';
      const generatedAt = new Date(answerKeyData.generatedAt).toLocaleString();
      const content = answerKeyData.answerKey || 'No content available';
      
      // Generate the beautiful HTML content
      const htmlContent = AnswerKeyViewer.generateHTML(subject, difficulty, generatedAt, content);
      
      answerWindow.document.write(htmlContent);
      answerWindow.document.close();
      answerWindow.focus();
      
      console.log('✅ Answer key opened successfully');
    } catch (error) {
      console.error('❌ Error opening answer key:', error);
      alert('Failed to open answer key. Please try again.');
    }
  },

  /**
   * Generates the beautiful HTML content for the answer key
   * @param {string} subject - The subject
   * @param {string} difficulty - The difficulty level
   * @param {string} generatedAt - The generation timestamp
   * @param {string} content - The answer key content
   * @returns {string} - The complete HTML string
   */
  generateHTML: (subject, difficulty, generatedAt, content) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Answer Key - ${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.5;
            background: white;
            min-height: 100vh;
            padding: 20px;
            color: #333;
            font-size: 14px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            display: flex;
            flex-direction: column;
            font-size: 14px;
        }
        
        .main-content {
            display: flex;
            flex: 1;
        }
        
        .navigation-sidebar {
            width: 200px;
            background: #f5f5f5;
            padding: 20px;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .navigation-title {
            font-size: 14px;
            font-weight: 600;
            color: #495057;
            margin-bottom: 15px;
            border-bottom: 2px solid #007bff;
            padding-bottom: 8px;
        }
        
        .nav-item {
            display: block;
            padding: 8px 12px;
            margin-bottom: 4px;
            color: #495057;
            text-decoration: none;
            font-size: 13px;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s ease;
        }
        
        .nav-item:hover {
            background: #e9ecef;
            color: #007bff;
        }
        
        .nav-item.active {
            background: #007bff;
            color: white;
            font-weight: 500;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .header {
            background: #007bff;
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .header-content {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 15px;
            color: white;
        }
        
        .header-info {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px;
        }
        
        .header-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        
        .info-item {
            text-align: center;
            padding: 10px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
        }
        
        .info-label {
            font-size: 12px;
            margin-bottom: 5px;
            color: rgba(255,255,255,0.8);
            text-transform: uppercase;
        }
        
        .info-value {
            font-size: 14px;
            font-weight: 600;
            color: white;
        }
        
        .content {
            flex: 1;
            padding: 30px;
            background: white;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .answer-key-text {
            font-family: 'Arial', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            white-space: pre-wrap;
            font-weight: normal;
            max-width: 100%;
            word-wrap: break-word;
        }
        
        .answer-key-text strong,
        .answer-key-text b {
            color: #212529;
            font-weight: 600;
            font-size: 14px;
        }
        
        .answer-key-text h1,
        .answer-key-text h2,
        .answer-key-text h3 {
            font-family: 'Arial', sans-serif;
            color: #212529;
            margin-top: 20px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .answer-key-text h1 {
            font-size: 20px;
            border-bottom: 2px solid #007bff;
            padding-bottom: 8px;
        }
        
        .answer-key-text h2 {
            font-size: 16px;
            margin: 15px 0 8px 0;
        }
        
        .answer-key-text h3 {
            font-size: 14px;
            margin: 12px 0 6px 0;
        }
        
        .answer-key-text p {
            margin-bottom: 10px;
            font-size: 14px;
            color: #333;
        }
        
        /* Enhanced formatting for answer key sections */
        .answer-key-text {
            /* Auto-format common patterns */
        }
        
        .answer-key-text hr {
            border: none;
            height: 1px;
            background: black;
            margin: 6px 0;
        }
        
        .answer-key-text ul,
        .answer-key-text ol {
            margin: 4px 0;
            padding-left: 15px;
        }
        
        .answer-key-text li {
            margin-bottom: 2px;
            line-height: 1.3;
            font-size: 11px;
        }
        
        /* Improve spacing between sections */
        .answer-key-text br + br {
            display: block;
            content: "";
            margin-top: 20px;
        }
        
        /* Special styling for formatted sections */
        .key-highlight {
            font-weight: 700;
            color: #667eea !important;
            font-size: 1.1em;
            letter-spacing: 0.5px;
            /* Removed gradient that was causing white text */
        }
        
        .question-header {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin: 20px 0 10px 0;
        }
        
        .sub-question {
            font-size: 14px;
            color: #555;
            margin: 10px 0 5px 0;
        }
        
        .answer-section,
        .solution-section,
        .explanation-section,
        .credit-section {
            margin: 10px 0;
            font-size: 14px;
        }
        
        .section-divider {
            border: none;
            height: 1px;
            background: #ddd;
            margin: 15px 0;
        }
        
        .answer-key-text code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
        }
        
        .answer-key-text pre {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            overflow-x: auto;
            font-family: 'Monaco', 'Menlo', monospace;
        }
        
        .controls {
            position: fixed;
            top: 30px;
            right: 30px;
            display: flex;
            gap: 15px;
            z-index: 1000;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
        }
        
        .btn:active {
            transform: translateY(0);
        }
        
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .container {
                box-shadow: none;
                border-radius: 0;
            }
            
            .controls {
                display: none;
            }
            
            .header {
                background: #667eea !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            
            .footer {
                background: white;
                border-top: 2px solid #e5e7eb;
            }
        }
        
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .container {
                max-width: 100%;
            }
            
            .main-content {
                flex-direction: column;
            }
            
            .navigation-sidebar {
                width: 100%;
                max-height: 200px;
                border-right: none;
                border-bottom: 2px solid #e5e7eb;
                padding: 20px;
            }
            
            .navigation-title {
                font-size: 14px;
                margin-bottom: 15px;
            }
            
            .nav-item {
                display: inline-block;
                margin-right: 10px;
                margin-bottom: 10px;
                padding: 8px 12px;
                font-size: 12px;
            }
            
            .content {
                padding: 30px 20px;
                max-height: 60vh;
            }
            
            .header {
                padding: 30px 20px;
            }
            
            .header h1 {
                font-size: 2em;
            }
            
            .controls {
                top: 15px;
                right: 15px;
            }
            
            .btn {
                padding: 10px 16px;
                font-size: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="controls">
        <button class="btn" onclick="window.print()">
            🖨️ Print
        </button>
        <button class="btn" onclick="window.close()">
            ✕ Close
        </button>
    </div>
    
    <div class="container">
        <div class="header">
            <div class="header-content">
                <h1>🗝️ Answer Key</h1>
                <div class="header-info">
                    <div class="header-info-grid">
                        <div class="info-item">
                            <div class="info-label">Subject</div>
                            <div class="info-value">${subject}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Difficulty</div>
                            <div class="info-value">${difficulty}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Generated</div>
                            <div class="info-value">${generatedAt}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="main-content">
            <div class="navigation-sidebar">
                <div class="navigation-title">Contents</div>
                <div id="navigationItems">
                    <!-- Navigation items will be generated by JavaScript -->
                </div>
            </div>
            <div class="content">
                <div class="answer-key-text" id="answerKeyContent">${content}</div>
            </div>
        </div>
        
        <script>
            // Auto-format the answer key content for better readability and navigation
            document.addEventListener('DOMContentLoaded', function() {
                const content = document.getElementById('answerKeyContent');
                const navigationItems = document.getElementById('navigationItems');
                
                if (content) {
                    let html = content.innerHTML;
                    const questions = [];
                    
                    // Format bold patterns with better styling
                    html = html.replace(/\\*\\*(.*?)\\*\\*/g, '<span class="key-highlight">$1</span>');
                    
                    // SUPER SIMPLE QUESTION DETECTION - No complex formatting
                    const rawText = content.innerHTML;
                    console.log('🔍 Raw content sample:', rawText.substring(0, 1000));
                    
                    // Find all question patterns including ones in parentheses
                    const questionPatterns = [
                        /(?:Question|QUESTION)\\s*(\\d+)/gi,           // Question 1, QUESTION 1
                        /\\(Questions?\\s*(\\d+)/gi,                   // (Question 2, (Questions 2a
                        /\\(Question\\s*(\\d+)/gi                      // (Question 2
                    ];
                    
                    let allQuestionMatches = [];
                    questionPatterns.forEach(pattern => {
                        const matches = rawText.match(pattern);
                        if (matches) {
                            allQuestionMatches = allQuestionMatches.concat(matches);
                        }
                    });
                    
                    console.log('🔍 All question matches:', allQuestionMatches);
                    
                    if (allQuestionMatches && allQuestionMatches.length > 0) {
                        const uniqueQuestions = new Set();
                        allQuestionMatches.forEach(match => {
                            const num = match.match(/\\d+/)[0];
                            if (num && parseInt(num) <= 20) {
                                uniqueQuestions.add(parseInt(num));
                                console.log('🔍 Added question:', num, 'from match:', match);
                            }
                        });
                        
                        // Sort and add to questions array
                        Array.from(uniqueQuestions).sort((a, b) => a - b).forEach(num => {
                            questions.push({
                                num: num.toString(),
                                text: 'Question ' + num,
                                id: 'question-' + num
                            });
                        });
                        
                        console.log('🔍 Final questions for nav:', questions);
                    }
                    
                    // MINIMAL formatting - add IDs BEFORE questions for proper scroll positioning (much higher up)
                    html = html.replace(/(Question\\s*)(\\d+)/gi, function(match, prefix, num) {
                        return '<span id="question-' + num + '" style="display: block; margin-top: -120px; padding-top: 120px;"></span>' + prefix + num;
                    });
                    
                    // Also handle parentheses questions - place anchor before the opening parenthesis (much higher up)
                    html = html.replace(/(\\(Questions?\\s*)(\\d+)/gi, function(match, prefix, num) {
                        return '<span id="question-' + num + '" style="display: block; margin-top: -120px; padding-top: 120px;"></span>' + prefix + num;
                    });
                    
                    // Keep the content simple and clean
                    content.innerHTML = html;
                    
                    // Generate navigation items - improved
                    if (navigationItems) {
                        let navHtml = '';
                        
                        // If we found questions through regex, use those
                        if (questions.length > 0) {
                            questions.forEach(function(q) {
                                navHtml += '<div class="nav-item" onclick="scrollToQuestion(\\'#' + q.id + '\\')">';
                                navHtml += 'Question ' + q.num;
                                navHtml += '</div>';
                            });
                        } else {
                            // Fallback: look for any text that might be questions
                            const contentText = content.innerHTML;
                            const questionMatches = contentText.match(/(?:QUESTION|Q)\\s*\\d+/gi);
                            if (questionMatches) {
                                questionMatches.forEach(function(match, index) {
                                    const num = match.match(/\\d+/)[0];
                                    navHtml += '<div class="nav-item" onclick="scrollToSection(' + index + ')">';
                                    navHtml += 'Question ' + num;
                                    navHtml += '</div>';
                                });
                            }
                        }
                        
                        if (navHtml === '') {
                            navHtml = '<div class="nav-item">No questions detected</div>';
                        }
                        
                        navigationItems.innerHTML = navHtml;
                    }
                }
            });
            
            // Smooth scroll to question
            function scrollToQuestion(selector) {
                const element = document.querySelector(selector);
                const contentArea = document.querySelector('.content');
                
                if (element && contentArea) {
                    // Remove active class from all nav items
                    document.querySelectorAll('.nav-item').forEach(function(item) {
                        item.classList.remove('active');
                    });
                    
                    // Add active class to clicked item
                    event.target.classList.add('active');
                    
                    // Calculate position relative to content area
                    const elementTop = element.offsetTop;
                    contentArea.scrollTo({
                        top: elementTop - 20,
                        behavior: 'smooth'
                    });
                }
            }
        </script>
        
        <div class="footer">
            <p>Generated by AI Tutor • Professional Answer Key System</p>
            <p style="margin-top: 10px; font-size: 12px; opacity: 0.7;">
                This answer key was automatically generated using advanced AI technology
            </p>
        </div>
    </div>
</body>
</html>`;
  }
};

export default AnswerKeyViewer;
