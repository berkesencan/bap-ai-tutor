const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testFrontendProcessingPaths() {
  console.log('🔍 FRONTEND PROCESSING PATHS TEST');
  console.log('==================================');
  console.log('Testing which processing path the frontend uses\n');
  
  const pdfPath = './midterm-sp24.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ Test PDF not found:', pdfPath);
    return;
  }
  
  console.log('📄 Using test PDF:', pdfPath);
  
  const results = [];
  
  // Run 5 tests
  for (let i = 1; i <= 5; i++) {
    console.log(`\n🔄 RUN ${i}/5`);
    console.log('==========');
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('pdf', fs.createReadStream(pdfPath));
      formData.append('subject', 'Computer Science');
      formData.append('numQuestions', '10');
      formData.append('difficulty', 'medium');
      formData.append('includeMultipleChoice', 'true');
      
      console.log('🚀 Sending request to backend...');
      
      const response = await axios.post('http://localhost:8000/api/ai/practice-exam', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000
      });
      
      if (response.data.success) {
        const result = response.data.data;
        
        console.log(`✅ Backend response received`);
        
        // Analyze what the backend sent
        const hasInteractiveQuestions = result.interactiveQuestions && Array.isArray(result.interactiveQuestions);
        const hasParsedQuestions = result.parsedQuestions && Array.isArray(result.parsedQuestions);
        const hasRawQuestions = result.questions && typeof result.questions === 'string';
        
        console.log(`📊 Backend data analysis:`);
        console.log(`   interactiveQuestions: ${hasInteractiveQuestions ? `YES (${result.interactiveQuestions.length} questions)` : 'NO'}`);
        console.log(`   parsedQuestions: ${hasParsedQuestions ? `YES (${result.parsedQuestions.length} questions)` : 'NO'}`);
        console.log(`   raw questions: ${hasRawQuestions ? `YES (${result.questions.length} chars)` : 'NO'}`);
        
        // Determine which path the frontend would use
        let processingPath = '';
        let questionsArray = [];
        
        if (hasInteractiveQuestions) {
          processingPath = 'PATH 1: interactiveQuestions (NEW LOGIC)';
          questionsArray = result.interactiveQuestions.map(q => q.question);
          console.log(`🎯 Frontend would use: ${processingPath}`);
          console.log(`   Questions: ${questionsArray.length} total`);
        } else if (hasParsedQuestions) {
          processingPath = 'PATH 2: parsedQuestions (FALLBACK)';
          questionsArray = result.parsedQuestions.map(q => q.question);
          console.log(`🎯 Frontend would use: ${processingPath}`);
          console.log(`   Questions: ${questionsArray.length} total`);
        } else if (hasRawQuestions) {
          processingPath = 'PATH 3: parseNumberedQuestions (LAST RESORT)';
          // Simulate the frontend parsing
          const rawText = result.questions;
          const questionMatches = rawText.match(/Q\d+[a-z]?\)[^Q]*/g);
          questionsArray = questionMatches ? questionMatches.map(q => q.trim()) : [];
          console.log(`🎯 Frontend would use: ${processingPath}`);
          console.log(`   Questions: ${questionsArray.length} total`);
        } else {
          processingPath = 'PATH 4: NO DATA (ERROR)';
          console.log(`❌ Frontend would use: ${processingPath}`);
        }
        
        // Test table detection on the questions that would be used
        if (questionsArray.length > 0) {
          let tableDetectionCount = 0;
          let mcDetectionCount = 0;
          
          questionsArray.forEach((question, index) => {
            // Test table detection (EXACT frontend logic)
            const hasTableIndicators = question.includes('table') || 
                                     question.includes('Task') || 
                                     question.includes('Time') || 
                                     question.includes('core type') ||
                                     question.includes('|') ||
                                     question.includes('&') ||
                                     question.includes('-----') ||
                                     question.includes('---') ||
                                     (question.match(/\b[A-Z]\s+\d+\s+\d+\b/) !== null) ||
                                     (question.match(/\b\d+\s+\d+\s+\d+\b/) !== null) ||
                                     (question.match(/[A-Z]\s+\d+\.?\d*\s+[A-Z]/) !== null) ||
                                     (question.match(/\d+\s+\d+\.?\d*\s+[A-Z]/) !== null);
            
            // Test multiple choice detection (EXACT frontend logic)
            const hasMultipleChoice = question.match(/\b[a-d]\)\s+[A-Za-z]/) || 
                                     question.match(/\b[a-d]\.\s+[A-Za-z]/) ||
                                     question.match(/\b[a-d]\s+[A-Za-z]/);
            
            if (hasTableIndicators) tableDetectionCount++;
            if (hasMultipleChoice) mcDetectionCount++;
          });
          
          console.log(`📊 Frontend detection results:`);
          console.log(`   Table questions: ${tableDetectionCount}`);
          console.log(`   MC questions: ${mcDetectionCount}`);
          
          // Store results
          results.push({
            run: i,
            processingPath: processingPath,
            totalQuestions: questionsArray.length,
            tableQuestions: tableDetectionCount,
            mcQuestions: mcDetectionCount,
            hasInteractiveQuestions: hasInteractiveQuestions,
            hasParsedQuestions: hasParsedQuestions,
            hasRawQuestions: hasRawQuestions
          });
          
        } else {
          results.push({
            run: i,
            processingPath: processingPath,
            totalQuestions: 0,
            tableQuestions: 0,
            mcQuestions: 0,
            hasInteractiveQuestions: hasInteractiveQuestions,
            hasParsedQuestions: hasParsedQuestions,
            hasRawQuestions: hasRawQuestions
          });
        }
        
      } else {
        console.log(`❌ Run ${i}: API call failed`);
        results.push({
          run: i,
          processingPath: 'ERROR',
          totalQuestions: 0,
          tableQuestions: 0,
          mcQuestions: 0,
          hasInteractiveQuestions: false,
          hasParsedQuestions: false,
          hasRawQuestions: false
        });
      }
      
    } catch (error) {
      console.log(`❌ Run ${i} failed:`, error.message);
      results.push({
        run: i,
        processingPath: 'ERROR',
        totalQuestions: 0,
        tableQuestions: 0,
        mcQuestions: 0,
        hasInteractiveQuestions: false,
        hasParsedQuestions: false,
        hasRawQuestions: false
      });
    }
    
    // Wait between runs
    if (i < 5) {
      console.log('⏳ Waiting 3 seconds before next run...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\n📊 PROCESSING PATHS ANALYSIS');
  console.log('=============================');
  
  if (results.length > 0) {
    console.log('📋 All runs summary:');
    results.forEach(result => {
      console.log(`   Run ${result.run}: ${result.processingPath} | ${result.totalQuestions} questions (${result.tableQuestions} tables, ${result.mcQuestions} MC)`);
    });
    
    // Analyze consistency
    const paths = results.map(r => r.processingPath);
    const uniquePaths = [...new Set(paths)];
    
    console.log('\n📊 Processing Path Consistency:');
    console.log(`   Unique paths used: ${uniquePaths.length}`);
    uniquePaths.forEach(path => {
      const count = paths.filter(p => p === path).length;
      console.log(`   ${path}: ${count}/${results.length} runs (${(count/results.length*100).toFixed(0)}%)`);
    });
    
    console.log('\n🎯 PROCESSING PATHS CONCLUSION:');
    console.log('================================');
    
    if (uniquePaths.length === 1) {
      console.log('✅ CONSISTENT: Frontend always uses the same processing path');
      console.log(`   Path: ${uniquePaths[0]}`);
    } else {
      console.log('❌ INCONSISTENT: Frontend uses different processing paths');
      console.log('   This explains the intermittent table/MC display issues!');
      console.log('   Different paths have different processing logic.');
    }
  }
}

// Run the processing paths test
testFrontendProcessingPaths(); 