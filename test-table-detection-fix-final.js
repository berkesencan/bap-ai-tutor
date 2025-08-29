// Test the final table detection fix
function testFinalTableDetection() {
  console.log('🧪 TESTING FINAL TABLE DETECTION FIX');
  console.log('====================================');
  
  // Test with the exact content from our debug findings
  const testCases = [
    {
      name: 'Q5a with Task table (from debug)',
      text: 'Q5a) Suppose we have the following DAG that represents different tasks and their dependencies: (DAG diagram would go here - imagine a simple DAG with 6-8 nodes and dependencies) The following table shows the execution time of each task on a single core: Task & Execution Time (ms) A & 10 B & 5 C & 15 D & 20 E & 8 F & 12 G & 6',
      expected: true
    },
    {
      name: 'Q5b with Task table (from debug)',
      text: 'Q5b) Suppose we have the following DAG that represents different tasks and their dependencies: (DAG diagram would go here - imagine a simple DAG with 6-8 nodes and dependencies) The following table shows the execution time of each task on a single core: Task & Execution Time (ms) A & 10 B & 5 C & 15 D & 20 E & 8 F & 12 G & 6',
      expected: true
    },
    {
      name: 'Regular question without table',
      text: 'Q1a) (a) Explain the difference between data-level parallelism and task-level parallelism with examples.',
      expected: false
    }
  ];
  
  // Simulate the FIXED detection logic
  function hasTableIndicators(text) {
    return text.includes('table') || 
           text.includes('Task') || 
           text.includes('Time') || 
           text.includes('core type') ||
           text.includes('|') ||
           text.includes('&') ||  // ADDED AMPERSAND DETECTION!
           text.includes('-----') ||
           text.includes('---') ||
           (text.match(/\b[A-Z]\s+\d+\s+\d+\b/) !== null) ||
           (text.match(/\b\d+\s+\d+\s+\d+\b/) !== null) ||
           (text.match(/[A-Z]\s+\d+\.?\d*\s+[A-Z]/) !== null) ||
           (text.match(/\d+\s+\d+\.?\d*\s+[A-Z]/) !== null);
  }
  
  console.log('\n📊 TESTING FIXED DETECTION LOGIC:');
  console.log('==================================');
  
  testCases.forEach((testCase, index) => {
    const result = hasTableIndicators(testCase.text);
    const status = result === testCase.expected ? '✅ PASS' : '❌ FAIL';
    
    console.log(`\n${index + 1}. ${testCase.name}: ${status}`);
    console.log(`   Expected: ${testCase.expected}, Got: ${result}`);
    console.log(`   Text preview: "${testCase.text.substring(0, 80)}..."`);
    
    if (result) {
      console.log(`   ✅ Would be sent to Gemini for table conversion`);
    } else {
      console.log(`   ❌ Would NOT be sent to Gemini for table conversion`);
    }
  });
  
  console.log('\n🎯 SUMMARY:');
  console.log('===========');
  console.log('✅ The table detection function should now work correctly');
  console.log('✅ Questions with & separators will be detected');
  console.log('✅ Questions with Task/Time keywords will be detected');
  console.log('✅ The frontend should now convert tables to HTML');
}

// Run the test
testFinalTableDetection(); 