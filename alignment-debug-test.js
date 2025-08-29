const PDFService = require('./backend/services/pdf.service');
const { exec } = require('child_process');

async function alignmentDebugTest() {
  console.log('=== ALIGNMENT DEBUG TEST ===');
  console.log('🔧 Specifically testing and fixing text alignment issues\n');
  
  // Create a minimal test case to isolate alignment issues
  const minimalContent = `CSCI-UA.0480-051: Parallel Computing

Midterm Exam (March 9th, 2023)

Total: 100 points

Problem 1 (25 points)

This line should be aligned to the left margin.

| Simple | Table |
|--------|-------|
| Row 1  | Data  |

This line after the table should also be aligned to the left margin.

a. [10 points] This sub-question should be aligned properly.

b. [15 points] This sub-question should also be aligned properly.`;

  try {
    console.log('📄 Generating MINIMAL ALIGNMENT TEST...');
    
    const pdf = await PDFService.generateExamPDF(
      minimalContent, 
      'Parallel Computing', 
      { 
        difficulty: 'medium',
        questionPoints: [25, 40, 35]
      }
    );
    
    const timestamp = Date.now();
    const filename = `ALIGNMENT-DEBUG-${timestamp}.pdf`;
    const filePath = await PDFService.savePDFToFile(pdf, filename);
    
    console.log(`✅ Generated: ${filename}`);
    console.log(`📊 Size: ${pdf.length} bytes`);
    console.log(`📁 Path: ${filePath}`);
    
    console.log('\n🚀 Opening for alignment comparison...');
    
    // Open original first
    setTimeout(() => {
      exec('open midterm-sp24.pdf', (error) => {
        if (error) {
          console.log('❌ Could not open original:', error.message);
        } else {
          console.log('✅ Opened ORIGINAL: midterm-sp24.pdf');
        }
      });
    }, 500);
    
    // Open debug test
    setTimeout(() => {
      exec(`open "${filePath}"`, (error) => {
        if (error) {
          console.log('❌ Could not open debug test:', error.message);
        } else {
          console.log('✅ Opened DEBUG TEST: ALIGNMENT-DEBUG');
        }
      });
    }, 2000);
    
    console.log('\n🔍 ALIGNMENT DEBUG CHECKLIST:');
    console.log('❗ Compare the left edge of text in both PDFs');
    console.log('❗ Check if the course header starts at the same position');
    console.log('❗ Verify "Problem 1" aligns with other text');
    console.log('❗ Ensure table is positioned correctly relative to text');
    console.log('❗ Check that sub-questions (a., b.) are properly aligned');
    console.log('❗ Look for any rightward shift in the generated PDF');
    
    console.log('\n💡 SPECIFIC THINGS TO LOOK FOR:');
    console.log('1. Does "CSCI-UA.0480-051: Parallel Computing" start at the same X position?');
    console.log('2. Does "Problem 1 (25 points)" align with regular text?');
    console.log('3. Does the table left edge align with text above and below it?');
    console.log('4. Do sub-questions "a." and "b." have proper indentation?');
    console.log('5. Is there any visible rightward shift compared to the original?');
    
  } catch (error) {
    console.error('❌ Alignment debug test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the alignment debug test
alignmentDebugTest(); 