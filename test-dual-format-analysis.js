const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testDualFormatAnalysis() {
  console.log('=== COMPREHENSIVE DUAL FORMAT ANALYSIS ===');
  
  const pdfFile = 'midterm-sp24.pdf';
  
  if (!fs.existsSync(pdfFile)) {
    console.log('❌ PDF file not found:', pdfFile);
    return;
  }
  
  console.log('📄 Analyzing uploaded PDF:', pdfFile);
  
  // Step 1: Extract text content using pdftotext
  console.log('\n🔍 STEP 1: EXTRACTING TEXT CONTENT');
  console.log('='.repeat(50));
  
  try {
    const textOutput = await execAsync(`pdftotext "${pdfFile}" -`);
    const pdfTextContent = textOutput.stdout;
    console.log('✅ PDF text extracted');
    console.log('📊 Text length:', pdfTextContent.length);
    console.log('📝 First 500 chars:');
    console.log(pdfTextContent.substring(0, 500));
    console.log('\n📝 Last 300 chars:');
    console.log(pdfTextContent.substring(pdfTextContent.length - 300));
    
    // Save to file for inspection
    fs.writeFileSync('extracted-text.txt', pdfTextContent);
    console.log('💾 Text content saved to: extracted-text.txt');
    
  } catch (error) {
    console.error('❌ Text extraction failed:', error.message);
    return;
  }
  
  // Step 2: Extract HTML layout using pdftohtml
  console.log('\n🎨 STEP 2: EXTRACTING HTML LAYOUT');
  console.log('='.repeat(50));
  
  try {
    const timestamp = Date.now();
    const htmlOutputPath = `temp-analysis-${timestamp}.html`;
    
    await execAsync(`pdftohtml -c -hidden -noframes "${pdfFile}" "${htmlOutputPath.replace('.html', '')}"`);
    
    const pdfHtmlContent = fs.readFileSync(htmlOutputPath, 'utf8');
    console.log('✅ PDF HTML layout extracted');
    console.log('📊 HTML length:', pdfHtmlContent.length);
    
    // Analyze font sizes and formatting
    const fontSizes = [...pdfHtmlContent.matchAll(/font-size:(\d+)px/g)].map(m => m[1]);
    const uniqueFontSizes = [...new Set(fontSizes)].sort((a, b) => b - a);
    console.log('🔤 Font sizes found:', uniqueFontSizes);
    
    // Look for key formatting elements
    const boldElements = pdfHtmlContent.match(/<b[^>]*>.*?<\/b>/g) || [];
    console.log('🔥 Bold elements found:', boldElements.length);
    
    const colorElements = pdfHtmlContent.match(/color:[^;]+/g) || [];
    const uniqueColors = [...new Set(colorElements)];
    console.log('🎨 Colors found:', uniqueColors);
    
    // Save HTML for inspection
    fs.writeFileSync('extracted-layout.html', pdfHtmlContent);
    console.log('💾 HTML layout saved to: extracted-layout.html');
    
    // Clean up temp files
    try {
      fs.unlinkSync(htmlOutputPath);
      const pngFiles = fs.readdirSync('.').filter(f => f.startsWith(`temp-analysis-${timestamp}`) && f.endsWith('.png'));
      pngFiles.forEach(f => fs.unlinkSync(f));
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup warning:', cleanupError.message);
    }
    
  } catch (error) {
    console.error('❌ HTML extraction failed:', error.message);
    return;
  }
  
  // Step 3: Generate practice exam using the API
  console.log('\n🤖 STEP 3: GENERATING PRACTICE EXAM');
  console.log('='.repeat(50));
  
  try {
    const form = new FormData();
    form.append('subject', 'Parallel Computing Analysis Test');
    form.append('questionCount', '3');
    form.append('difficulty', 'medium');
    form.append('generatePDF', 'true');
    form.append('questionPoints', '[30,35,35]');
    form.append('pdf', fs.createReadStream(pdfFile));
    
    console.log('📡 Sending request to generate practice exam...');
    
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
    
    if (response.data.data.pdfPath) {
      const generatedPdfPath = response.data.data.pdfPath;
      console.log('📄 Generated PDF path:', generatedPdfPath);
      
      if (fs.existsSync(generatedPdfPath)) {
        const stats = fs.statSync(generatedPdfPath);
        console.log('✅ Generated PDF verified - Size:', stats.size, 'bytes');
        
        // Open the generated PDF for comparison
        console.log('📖 Opening generated PDF for comparison...');
        exec(`open "${generatedPdfPath}"`, (error) => {
          if (error) {
            console.log('⚠️ Could not auto-open generated PDF');
          } else {
            console.log('📄 Generated PDF opened successfully!');
          }
        });
        
        // Also open the original PDF for comparison
        console.log('📖 Opening original PDF for comparison...');
        exec(`open "${pdfFile}"`, (error) => {
          if (error) {
            console.log('⚠️ Could not auto-open original PDF');
          } else {
            console.log('📄 Original PDF opened successfully!');
          }
        });
        
        // Extract text from generated PDF for comparison
        console.log('\n🔍 STEP 4: ANALYZING GENERATED PDF');
        console.log('='.repeat(50));
        
        try {
          const generatedTextOutput = await execAsync(`pdftotext "${generatedPdfPath}" -`);
          const generatedTextContent = generatedTextOutput.stdout;
          console.log('✅ Generated PDF text extracted');
          console.log('📊 Generated text length:', generatedTextContent.length);
          console.log('📝 Generated PDF content preview:');
          console.log(generatedTextContent.substring(0, 800));
          
          // Save generated text for comparison
          fs.writeFileSync('generated-text.txt', generatedTextContent);
          console.log('💾 Generated text saved to: generated-text.txt');
          
          // Compare structures
          console.log('\n📊 COMPARISON ANALYSIS:');
          console.log('='.repeat(50));
          
          const originalText = fs.readFileSync('extracted-text.txt', 'utf8');
          
          // Check for key elements
          const originalHasImportantNotes = originalText.includes('Important Notes');
          const generatedHasImportantNotes = generatedTextContent.includes('Important Notes');
          console.log(`📋 Important Notes section: Original=${originalHasImportantNotes}, Generated=${generatedHasImportantNotes}`);
          
          const originalProblems = (originalText.match(/Problem \d+/g) || []).length;
          const generatedProblems = (generatedTextContent.match(/Problem \d+/g) || []).length;
          console.log(`🔢 Problem count: Original=${originalProblems}, Generated=${generatedProblems}`);
          
          const originalPoints = originalText.match(/\d+ points/g) || [];
          const generatedPoints = generatedTextContent.match(/\d+ points/g) || [];
          console.log(`🎯 Point references: Original=${originalPoints.length}, Generated=${generatedPoints.length}`);
          
          console.log('\n📋 Original point references:', originalPoints);
          console.log('📋 Generated point references:', generatedPoints);
          
        } catch (textError) {
          console.error('❌ Generated PDF text extraction failed:', textError.message);
        }
        
      } else {
        console.log('❌ Generated PDF file not found at specified path');
      }
    } else {
      console.log('❌ No pdfPath in response');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Practice exam generation failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
  
  console.log('\n🎉 DUAL FORMAT ANALYSIS COMPLETED');
  console.log('📁 Files created for inspection:');
  console.log('  - extracted-text.txt (original PDF text)');
  console.log('  - extracted-layout.html (original PDF layout)');
  console.log('  - generated-text.txt (generated PDF text)');
  console.log('\n💡 Compare the PDFs side by side to analyze formatting differences!');
}

// Run the analysis
testDualFormatAnalysis()
  .then(() => {
    console.log('\n✅ Analysis completed successfully');
  })
  .catch(error => {
    console.error('\n💥 Analysis failed:', error.message);
  }); 