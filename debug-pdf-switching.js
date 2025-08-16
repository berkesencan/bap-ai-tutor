const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function testPDFSwitching() {
  console.log('=== DEBUGGING PDF SWITCHING ISSUE ===');
  
  const testCases = [
    {
      name: 'Test 1: midterm-sp24.pdf',
      file: 'midterm-sp24.pdf',
      subject: 'Parallel Computing SP24',
      questionCount: '3'
    },
    {
      name: 'Test 2: midterm-fall21.pdf', 
      file: 'midterm-fall21.pdf',
      subject: 'Parallel Computing Fall21',
      questionCount: '3'
    },
    {
      name: 'Test 3: Back to midterm-sp24.pdf',
      file: 'midterm-sp24.pdf', 
      subject: 'Parallel Computing SP24 Again',
      questionCount: '3'
    },
    {
      name: 'Test 4: Back to midterm-fall21.pdf',
      file: 'midterm-fall21.pdf',
      subject: 'Parallel Computing Fall21 Again', 
      questionCount: '3'
    }
  ];

  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n${testCase.name}`);
    console.log('='.repeat(50));
    
    try {
      // Check if file exists first
      if (!fs.existsSync(testCase.file)) {
        console.log(`❌ File ${testCase.file} not found, skipping...`);
        continue;
      }

      const form = new FormData();
      form.append('subject', testCase.subject);
      form.append('questionCount', testCase.questionCount);
      form.append('difficulty', 'medium');
      form.append('generatePDF', 'true');
      form.append('questionPoints', '[30,35,35]');
      form.append('pdf', fs.createReadStream(testCase.file));
      
      console.log(`📡 Testing with ${testCase.file}...`);
      
      const startTime = Date.now();
      const response = await axios.post('http://localhost:8000/api/ai/practice-exam', form, {
        headers: {
          ...form.getHeaders()
        },
        timeout: 60000
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Response received in ${duration}ms`);
      console.log('📊 Status:', response.status);
      console.log('🔍 Has pdfPath:', !!response.data.data.pdfPath);
      
      const result = {
        testName: testCase.name,
        file: testCase.file,
        success: false,
        pdfPath: null,
        pdfSize: 0,
        duration: duration,
        error: null
      };
      
      if (response.data.data.pdfPath) {
        result.pdfPath = response.data.data.pdfPath;
        console.log('📄 PDF Path:', result.pdfPath);
        
        // Check if file exists and get detailed info
        if (fs.existsSync(result.pdfPath)) {
          const stats = fs.statSync(result.pdfPath);
          result.pdfSize = stats.size;
          console.log('✅ PDF file verified - Size:', stats.size, 'bytes');
          
          // Test if PDF is openable by checking file header
          const buffer = fs.readFileSync(result.pdfPath, { start: 0, end: 100 });
          const header = buffer.toString('utf8', 0, 10);
          
          if (header.startsWith('%PDF-')) {
            console.log('✅ PDF header valid:', header.trim());
            result.success = true;
            
            // Try to open the PDF for verification
            console.log('🔍 Attempting to open PDF...');
            const { exec } = require('child_process');
            exec(`open "${result.pdfPath}"`, (error) => {
              if (error) {
                console.log('⚠️  Could not auto-open PDF');
              } else {
                console.log('📄 PDF opened successfully!');
              }
            });
            
          } else {
            console.log('❌ Invalid PDF header:', header);
            result.error = 'Invalid PDF header: ' + header;
          }
          
          // Check if it's a mock/fallback PDF
          if (stats.size < 1000) {
            console.log('⚠️  Very small PDF - likely a mock/fallback');
            result.error = 'Mock PDF detected (size < 1000 bytes)';
            result.success = false;
          }
          
        } else {
          console.log('❌ PDF file not found at specified path');
          result.error = 'PDF file not found';
        }
      } else {
        console.log('❌ No pdfPath in response');
        result.error = 'No pdfPath in response';
      }
      
      results.push(result);
      
      // Wait a bit between tests to avoid race conditions
      console.log('⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Test failed:`, error.message);
      results.push({
        testName: testCase.name,
        file: testCase.file,
        success: false,
        pdfPath: null,
        pdfSize: 0,
        duration: 0,
        error: error.message
      });
    }
  }
  
  // Summary report
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY REPORT');
  console.log('='.repeat(60));
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.testName}`);
    console.log(`   File: ${result.file}`);
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   PDF Size: ${result.pdfSize} bytes`);
    console.log(`   Duration: ${result.duration}ms`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.pdfPath) {
      console.log(`   Path: ${result.pdfPath}`);
    }
  });
  
  // Analyze patterns
  console.log('\n🔍 PATTERN ANALYSIS:');
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;
  
  console.log(`✅ Successful: ${successCount}/${results.length}`);
  console.log(`❌ Failed: ${failureCount}/${results.length}`);
  
  if (failureCount > 0) {
    console.log('\n🚨 POTENTIAL ISSUES DETECTED:');
    
    // Check for pattern in failures
    const failedTests = results.filter(r => !r.success);
    const failureReasons = {};
    
    failedTests.forEach(test => {
      const reason = test.error || 'Unknown error';
      failureReasons[reason] = (failureReasons[reason] || 0) + 1;
    });
    
    Object.entries(failureReasons).forEach(([reason, count]) => {
      console.log(`  - ${reason}: ${count} occurrence(s)`);
    });
  }
  
  return results;
}

// Run the test
testPDFSwitching()
  .then(results => {
    console.log('\n🎉 PDF SWITCHING TEST COMPLETED');
  })
  .catch(error => {
    console.error('\n💥 PDF SWITCHING TEST FAILED');
    console.error('Error:', error.message);
  }); 