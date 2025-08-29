const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function testBackendAPI() {
    console.log('🔍 TESTING ACTUAL BACKEND API WITH FONT SIZE EXTRACTION\n');
    
    const backendUrl = 'http://localhost:8000'; // Fixed to correct port
    const pdfPath = 'midterm-fall21.pdf';
    
    try {
        // Test 1: Check if backend is running
        console.log('📡 STEP 1: Testing backend connection...');
        try {
            await axios.get(`${backendUrl}/`);
            console.log('✅ Backend is running');
        } catch (error) {
            console.log('❌ Backend is not running. Please start with: npm start');
            console.log('   Error:', error.message);
            return;
        }
        
        // Test 2: Upload PDF and generate practice exam
        console.log('\n📄 STEP 2: Testing practice exam generation with PDF upload...');
        
        const form = new FormData();
        form.append('subject', 'Mathematics');
        form.append('questionCount', '5');
        form.append('difficulty', 'medium');
        form.append('generatePDF', 'true');
        form.append('questionPoints', JSON.stringify([20, 20, 20, 20, 20]));
        form.append('pdf', fs.createReadStream(pdfPath));
        
        const response = await axios.post(`${backendUrl}/api/ai/practice-exam`, form, {
            headers: {
                ...form.getHeaders(),
            },
            timeout: 60000, // 60 second timeout
        });
        
        console.log('✅ API call successful');
        console.log('📊 Response status:', response.status);
        console.log('📋 Response keys:', Object.keys(response.data));
        
        if (response.data.success && response.data.data.pdfPath) {
            console.log('✅ PDF was generated successfully');
            console.log('📄 PDF path:', response.data.data.pdfPath);
            
            // Test 3: Analyze the generated PDF
            console.log('\n🔍 STEP 3: Analyzing generated PDF font sizes...');
            await analyzePdfFontSizes(response.data.data.pdfPath);
            
        } else {
            console.log('❌ PDF generation failed');
            console.log('📋 Response data:', JSON.stringify(response.data, null, 2));
        }
        
    } catch (error) {
        console.error('❌ API test failed:', error.message);
        if (error.response) {
            console.error('📋 Response status:', error.response.status);
            console.error('📋 Response data:', error.response.data);
        }
    }
}

async function analyzePdfFontSizes(pdfPath) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
        // Convert generated PDF to HTML to analyze font sizes
        const tempHtml = `backend-test-${Date.now()}`;
        await execAsync(`pdftohtml -c -hidden -noframes "${pdfPath}" "${tempHtml}"`);
        
        const htmlFile = tempHtml + '.html';
        if (fs.existsSync(htmlFile)) {
            const htmlContent = fs.readFileSync(htmlFile, 'utf8');
            
            // Extract font sizes from generated PDF
            const fontMatches = htmlContent.match(/font-size:(\d+)px/g) || [];
            const uniqueFonts = [...new Set(fontMatches)].sort();
            console.log(`🔤 Generated PDF font sizes: ${uniqueFonts.join(', ')}`);
            
            // Extract red text count
            const redTextCount = (htmlContent.match(/color:#ff0000/g) || []).length;
            console.log(`🎨 Red text elements: ${redTextCount}`);
            
            // Compare with original
            if (fs.existsSync('extracted-layout.html')) {
                const originalHtml = fs.readFileSync('extracted-layout.html', 'utf8');
                const originalFonts = [...new Set(originalHtml.match(/font-size:(\d+)px/g) || [])].sort();
                const originalRed = (originalHtml.match(/color:#ff0000/g) || []).length;
                
                console.log(`\n📊 FONT SIZE COMPARISON:`);
                console.log(`Original: ${originalFonts.join(', ')}`);
                console.log(`Generated: ${uniqueFonts.join(', ')}`);
                
                const fontsMatch = JSON.stringify(originalFonts) === JSON.stringify(uniqueFonts);
                console.log(`Font sizes match: ${fontsMatch ? '✅' : '❌'}`);
                
                if (!fontsMatch) {
                    console.log('\n🔍 DETAILED ANALYSIS:');
                    console.log('Expected fonts:', originalFonts);
                    console.log('Actual fonts:', uniqueFonts);
                    
                    // Check if we're using extracted fonts
                    const expectedFonts = ['font-size:21px', 'font-size:18px', 'font-size:17px'];
                    const hasExpectedFonts = expectedFonts.every(font => uniqueFonts.includes(font));
                    
                    if (hasExpectedFonts) {
                        console.log('✅ Generated PDF uses the expected font sizes from our template');
                    } else {
                        console.log('❌ Generated PDF does not use expected font sizes');
                        console.log('   This means the backend is not using our layout-aware template');
                    }
                }
            }
            
            // Cleanup
            fs.unlinkSync(htmlFile);
            const pngFiles = fs.readdirSync('.').filter(f => f.startsWith(tempHtml) && f.endsWith('.png'));
            pngFiles.forEach(f => fs.unlinkSync(f));
            
        } else {
            console.log('❌ Could not convert generated PDF to HTML for analysis');
        }
        
    } catch (error) {
        console.error('❌ PDF analysis failed:', error.message);
    }
}

// Run the test
console.log('🚀 Starting backend API test...');
console.log('Make sure your backend is running on http://localhost:8000\n');

testBackendAPI().catch(console.error); 