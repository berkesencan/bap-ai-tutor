const fs = require('fs');
const path = require('path');

// Copy the backend extraction logic from AI controller
class TestExtraction {
  
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
      
      // Method 2: Homework format with nested enumerate
      const homeworkQuestions = this.extractHomeworkFormat(latexContent, cleanLatexText);
      if (homeworkQuestions.length > 0) {
        console.log(`✅ Extracted ${homeworkQuestions.length} questions using homework format`);
        return homeworkQuestions;
      }
      
      // Method 3: Generic numbered format
      const numberedQuestions = this.extractNumberedFormat(latexContent, cleanLatexText);
      if (numberedQuestions.length > 0) {
        console.log(`✅ Extracted ${numberedQuestions.length} questions using numbered format`);
        return numberedQuestions;
      }
      
      // Method 4: Any \item commands found
      const itemQuestions = this.extractItemFormat(latexContent, cleanLatexText);
      if (itemQuestions.length > 0) {
        console.log(`✅ Extracted ${itemQuestions.length} questions using item format`);
        return itemQuestions;
      }
      
      // Method 5: Line-by-line heuristic extraction
      const heuristicQuestions = this.extractHeuristicFormat(latexContent, cleanLatexText);
      if (heuristicQuestions.length > 0) {
        console.log(`✅ Extracted ${heuristicQuestions.length} questions using heuristic format`);
        return heuristicQuestions;
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
      return questions; // Not exam format
    }
    
    console.log('📚 Trying exam format extraction...');
    
    const problemSections = latexContent.split(/\\section\*?\{Problem \d+\}/);
    
    for (let i = 1; i < problemSections.length; i++) {
      const problemContent = problemSections[i];
      const lines = problemContent.split('\n');
      let currentSubPart = '';
      let subPartLetter = '';
      let subPartPoints = null;
      let questionNumber = i;
      
      console.log(`\n=== PROCESSING PROBLEM ${questionNumber} ===`);
      console.log(`Problem content lines: ${lines.length}`);
      
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex].trim();
        
        // Stop if we hit another section
        if (line.match(/^\\section/)) {
          console.log(`Stopping at section: ${line}`);
          break;
        }
        
        // Look for lettered sub-parts like "(a)", "(b)", etc.
        const subPartMatch = line.match(/^\(([a-z])\)\s*(.*)/);
        
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
          subPartLetter = subPartMatch[1];
          subPartPoints = null; // No explicit points in this format
          currentSubPart = subPartMatch[2];
          console.log(`  Found sub-part (${subPartLetter}): ${subPartMatch[2].substring(0, 50)}...`);
        } else if (subPartLetter && line.length > 0 && !line.startsWith('\\')) {
          currentSubPart += ' ' + line;
        } else if (!subPartLetter && line.length > 0 && !line.startsWith('\\')) {
          if (lineIndex === 0 || currentSubPart.length === 0) {
            currentSubPart += line;
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

  // Placeholder methods for other extraction formats
  static extractHomeworkFormat(latexContent, cleanLatexText) {
    console.log('📝 Homework format not applicable');
    return [];
  }

  static extractNumberedFormat(latexContent, cleanLatexText) {
    console.log('🔢 Numbered format not applicable');
    return [];
  }

  static extractItemFormat(latexContent, cleanLatexText) {
    console.log('📋 Item format not applicable');
    return [];
  }

  static extractHeuristicFormat(latexContent, cleanLatexText) {
    console.log('🔍 Heuristic format not applicable');
    return [];
  }
}

async function testBackendExtraction() {
  console.log('🧪 Testing Backend Question Extraction...');
  
  try {
    // Read the generated LaTeX file
    const latexPath = 'step2.5-output/simple-exam-1752011241352.tex';
    
    if (!fs.existsSync(latexPath)) {
      console.log('❌ LaTeX file not found. Please run step2.5 first.');
      return;
    }
    
    const latexContent = fs.readFileSync(latexPath, 'utf8');
    console.log(`✅ Loaded LaTeX content: ${latexContent.length} characters`);
    
    // Test the extraction
    console.log('\n=== TESTING BACKEND EXTRACTION ===');
    const extractedQuestions = TestExtraction.extractQuestionsFromLatex(latexContent);
    
    console.log('\n📊 EXTRACTION RESULTS:');
    console.log(`Total questions extracted: ${extractedQuestions.length}`);
    
    console.log('\n📝 EXTRACTED QUESTIONS:');
    extractedQuestions.forEach((q, index) => {
      console.log(`${index + 1}. ${q.text.substring(0, 80)}...`);
      console.log(`   Points: ${q.points || 'N/A'}`);
    });
    
    console.log('\n🎯 EXPECTED vs ACTUAL:');
    console.log('Expected questions from the LaTeX structure:');
    console.log('Q1a) - f = o(g) with f(n) = 2n² + 5n, g(n) = n²');
    console.log('Q1b) - f = o(g) with f(n) = n log n, g(n) = n²');
    console.log('Q1c) - f = o(g) with f(n) = 10ⁿ, g(n) = 2ⁿ');
    console.log('Q1d) - f = o(g) with f(n) = Σi², g(n) = n³');
    console.log('Q1e) - f = o(g) with f(n) = log₂ n, g(n) = log₁₀ n');
    console.log('Q2) - Formal proof about f(n) = O(g(n))');
    console.log('Q3a) - Master Theorem with T(n) = 2T(n/2) + n log n');
    console.log('Q3b) - Master Theorem with T(n) = 9T(n/3) + n²');
    console.log('Q3c) - Master Theorem with T(n) = T(n/2) + 1');
    console.log('Q3d) - Master Theorem with T(n) = 4T(n/2) + n³');
    console.log('Q4a) - T_new(n) = O(n²) if log_b a < 1');
    console.log('Q4b) - T_new(n) = Ω(n log n) if log_b a = 1');
    console.log('Q5a) - Compute T(4) using recurrence');
    console.log('Q5b) - Use recursion tree to solve recurrence');
    console.log('Q5c) - Suppose base case is T(2) = 5');
    console.log('Q6a) - Write recurrence for 4-way mergesort');
    console.log('Q6b) - Apply Master Theorem to the recurrence');
    console.log('Q7a) - Prove algorithm correctness');
    console.log('Q7b) - Write recurrence for running time');
    console.log('Q7c) - Apply Master Theorem');
    console.log('Q8) - Find kth smallest element algorithm');
    console.log('Q9) - Prove BST height bound');
    console.log('Q10) - Two-sum algorithm in O(n) time');
    console.log('\nExpected total: ~21 questions');
    console.log(`Actual extracted: ${extractedQuestions.length} questions`);
    
    if (extractedQuestions.length < 15) {
      console.log('\n❌ EXTRACTION FAILED - Too few questions extracted');
      console.log('This explains why the frontend shows incomplete questions');
    } else {
      console.log('\n✅ EXTRACTION LOOKS GOOD');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBackendExtraction(); 