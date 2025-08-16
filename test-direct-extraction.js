const fs = require('fs');

// Copy the exact extraction logic from AI controller
class TestExtractionDirect {
  
  static extractQuestionsFromLatex(latexContent) {
    const questions = [];
    
    try {
      console.log('🔍 Starting universal question extraction...');
      
      // Helper function to clean LaTeX commands and math notation
      const cleanLatexText = (text) => {
        return text
          .replace(/\\item\s*/g, '')
          .replace(/\\item\s*\[[a-z]\]\s*/g, '')
          .replace(/\\item\s*\[.*?\]\s*/g, '')
          .replace(/\$([^$]+)\$/g, (match, mathContent) => {
            return mathContent
              .replace(/\\log_(\d+)/g, 'log₍$1₎')
              .replace(/\\log_\{(\d+)\}/g, 'log₍$1₎')
              .replace(/\^(\d+)/g, '⁽$1⁾')
              .replace(/\^{([^}]+)}/g, '⁽$1⁾')
              .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
              .replace(/\\sum_\{([^}]+)\}\^([^\s]+)/g, 'Σ($1 to $2)')
              .replace(/\\mathbb\{([^}]+)\}/g, '$1')
              .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
              .replace(/\\sqrt/g, '√')
              .replace(/\\infty/g, '∞')
              .replace(/\\Theta/g, 'Θ')
              .replace(/\\Omega/g, 'Ω')
              .replace(/\\omega/g, 'ω')
              .replace(/\\ge/g, '≥')
              .replace(/\\le/g, '≤')
              .replace(/\\neq/g, '≠')
              .replace(/\\to/g, '→')
              .replace(/\\lim/g, 'lim')
              .replace(/\\log/g, 'log');
          })
          .replace(/\\begin\{[^}]+\}/g, '')
          .replace(/\\end\{[^}]+\}/g, '')
          .replace(/\\textbf\{([^}]+)\}/g, '$1')
          .replace(/\\emph\{([^}]+)\}/g, '$1')
          .replace(/\\section\*?\{([^}]+)\}/g, '$1')
          .replace(/\\subsection\*?\{([^}]+)\}/g, '$1')
          .replace(/\\[a-zA-Z]+\*?\{[^}]*\}/g, '')
          .replace(/\\[a-zA-Z]+\*/g, '')
          .replace(/\\[a-zA-Z]+/g, '')
          .replace(/\{([^}]*)\}/g, '$1')
          .replace(/\\\\/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      // Universal extraction methods - try in order of sophistication
      
      // Method 1: Exam format with Problem sections and lettered sub-parts
      const examQuestions = this.extractExamFormat(latexContent, cleanLatexText);
      if (examQuestions.length > 0) {
        console.log(`✅ Extracted ${examQuestions.length} questions using exam format`);
        return examQuestions;
      }
      
      console.log('⚠️ No questions found with any extraction method');
      
    } catch (error) {
      console.error('❌ Error in universal extraction:', error);
    }
    
    return questions;
  }

  // Method 1: Exam format with \section*{Problem X} and lettered sub-parts
  static extractExamFormat(latexContent, cleanLatexText) {
    const questions = [];
    
    if (!latexContent.includes('\\section*{Problem') && !latexContent.includes('\\section{Problem')) {
      console.log('❌ Not exam format - no Problem sections found');
      return questions; // Not exam format
    }
    
    console.log('📚 Trying exam format extraction...');
    
    const problemSections = latexContent.split(/\\section\*?\{Problem \d+\}/);
    console.log(`📊 Found ${problemSections.length - 1} Problem sections`);
    
    for (let i = 1; i < problemSections.length; i++) {
      const problemContent = problemSections[i];
      const lines = problemContent.split('\n');
      let currentSubPart = '';
      let subPartLetter = '';
      let subPartPoints = null;
      let questionNumber = i;
      
      console.log(`\n=== PROCESSING PROBLEM ${questionNumber} ===`);
      console.log(`Problem content lines: ${lines.length}`);
      console.log(`First 3 lines:`, lines.slice(0, 3));
      
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex].trim();
        
        // Stop if we hit another section
        if (line.match(/^\\section/)) {
          console.log(`Stopping at section: ${line}`);
          break;
        }
        
        // Look for lettered sub-parts - support both formats:
        // Format 1: "a. [10]" (original midterm format)
        // Format 2: "(a)" (hw2 format)
        const subPartMatch1 = line.match(/^([a-z])\.\s*\[(\d+)\]\s*(.*)/); // a. [10] format
        const subPartMatch2 = line.match(/^\(([a-z])\)\s*(.*)/); // (a) format
        
        const subPartMatch = subPartMatch1 || subPartMatch2;
        
        if (subPartMatch) {
          // Save the previous sub-part if we have one
          if (currentSubPart.trim() && subPartLetter) {
            const cleanText = cleanLatexText(currentSubPart);
            if (cleanText.length > 10) {
              questions.push({
                text: `Q${questionNumber}${subPartLetter}) ${cleanText}`,
                points: subPartPoints
              });
              console.log(`    → Added Q${questionNumber}${subPartLetter}: ${cleanText.substring(0, 50)}...`);
            }
          }
          
          // Start new sub-part
          if (subPartMatch1) {
            // Format 1: a. [10]
            subPartLetter = subPartMatch1[1];
            subPartPoints = parseInt(subPartMatch1[2]);
            currentSubPart = subPartMatch1[3];
            console.log(`  Found sub-part format 1 (${subPartLetter}): ${currentSubPart.substring(0, 50)}...`);
          } else {
            // Format 2: (a)
            subPartLetter = subPartMatch2[1];
            subPartPoints = null; // No explicit points in this format
            currentSubPart = subPartMatch2[2];
            console.log(`  Found sub-part format 2 (${subPartLetter}): ${currentSubPart.substring(0, 50)}...`);
          }
        } else if (subPartLetter && line.length > 0 && !line.startsWith('\\')) {
          currentSubPart += ' ' + line;
          console.log(`    Continuing sub-part ${subPartLetter}: ${line.substring(0, 30)}...`);
        } else if (!subPartLetter && line.length > 0 && !line.startsWith('\\')) {
          if (lineIndex === 0 || currentSubPart.length === 0) {
            currentSubPart += line;
            console.log(`    Starting main content: ${line.substring(0, 30)}...`);
          }
        }
      }
      
      // Save the last sub-part
      if (currentSubPart.trim() && subPartLetter) {
        const cleanText = cleanLatexText(currentSubPart);
        if (cleanText.length > 10) {
          questions.push({
            text: `Q${questionNumber}${subPartLetter}) ${cleanText}`,
            points: subPartPoints
          });
          console.log(`    → Added Q${questionNumber}${subPartLetter}: ${cleanText.substring(0, 50)}...`);
        }
      } else if (currentSubPart.trim() && !subPartLetter) {
        // Single question without sub-parts
        const cleanText = cleanLatexText(currentSubPart);
        if (cleanText.length > 20) {
          questions.push({
            text: `Q${questionNumber}) ${cleanText}`,
            points: null
          });
          console.log(`    → Added Q${questionNumber}: ${cleanText.substring(0, 50)}...`);
        }
      }
    }
    
    return questions;
  }
}

async function testDirectExtraction() {
  console.log('🧪 Testing Direct Extraction on Generated LaTeX...');
  
  try {
    // Read the LaTeX file that was actually generated by the API
    const latexPath = 'step2.5-output/simple-exam-1752011701761.tex';
    
    if (!fs.existsSync(latexPath)) {
      console.log('❌ LaTeX file not found:', latexPath);
      return;
    }
    
    const latexContent = fs.readFileSync(latexPath, 'utf8');
    console.log(`✅ Loaded LaTeX content: ${latexContent.length} characters`);
    
    // Test the extraction directly
    console.log('\n=== TESTING DIRECT EXTRACTION ===');
    const extractedQuestions = TestExtractionDirect.extractQuestionsFromLatex(latexContent);
    
    console.log('\n📊 EXTRACTION RESULTS:');
    console.log(`Total questions extracted: ${extractedQuestions.length}`);
    
    console.log('\n📝 EXTRACTED QUESTIONS:');
    extractedQuestions.forEach((q, index) => {
      console.log(`${index + 1}. ${q.text.substring(0, 80)}...`);
      console.log(`   Points: ${q.points || 'N/A'}`);
    });
    
    console.log('\n🎯 EXPECTED vs ACTUAL:');
    const expectedQuestions = [
      'Q1a) f(n) = 2n² + 5n, g(n) = n²',
      'Q1b) f(n) = log₂ n, g(n) = n',
      'Q1c) f(n) = n³, g(n) = 2ⁿ',
      'Q1d) f(n) = Σ i², g(n) = n³',
      'Q1e) f(n) = log₂ n + log₃ n, g(n) = log₂ n',
      'Q2) Give a formal proof about f(n)² = O(g(n)²)',
      'Q3a) T(n) = 2T(n/2) + n log n',
      'Q3b) T(n) = 9T(n/3) + n²',
      'Q3c) T(n) = T(n/2) + 1',
      'Q4a) T_new(n) = O(n²) if log_b a = 2',
      'Q4b) T_new(n) = Ω(n log n)',
      'Q5a) Compute T(4) using recurrence',
      'Q5b) Use recursion tree',
      'Q5c) Suppose base case T(2) = 5',
      'Q6a) Write recurrence for 4-way mergesort',
      'Q6b) Apply Master Theorem',
      'Q7a) How many times will each element be processed',
      'Q7b) Write recurrence for running time',
      'Q7c) What is the running time in Θ notation',
      'Q8) Prove f(n) = o(g(n))',
      'Q9) Design algorithm for second largest element',
      'Q10) Write recurrence for divide and conquer'
    ];
    
    console.log(`Expected questions: ${expectedQuestions.length}`);
    console.log(`Actual extracted: ${extractedQuestions.length}`);
    
    if (extractedQuestions.length >= 15) {
      console.log('\n✅ EXTRACTION SUCCESS! Backend should work correctly now.');
    } else {
      console.log('\n❌ EXTRACTION FAILED! Need to debug the extraction logic further.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDirectExtraction(); 