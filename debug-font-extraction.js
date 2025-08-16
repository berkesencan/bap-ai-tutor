const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Import the controller functions
const path = require('path');
const AIController = require('./backend/controllers/ai.controller');

async function debugFontExtraction() {
    console.log('🔍 DEBUGGING FONT EXTRACTION LOCALLY\n');
    
    const pdfPath = 'midterm-fall21.pdf';
    
    try {
        // Step 1: Extract HTML layout like the backend does
        console.log('📄 STEP 1: Extracting HTML layout...');
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const uniqueBaseName = `debug-${timestamp}-${randomId}`;
        const htmlOutputPath = `${uniqueBaseName}.html`;
        
        await execAsync(`pdftohtml -c -hidden -noframes "${pdfPath}" "${uniqueBaseName}"`);
        
        if (fs.existsSync(htmlOutputPath)) {
            const pdfHtmlLayout = fs.readFileSync(htmlOutputPath, 'utf8');
            console.log(`✅ HTML layout extracted: ${pdfHtmlLayout.length} characters`);
            
            // Step 2: Test font size extraction
            console.log('\n🔤 STEP 2: Testing font size extraction...');
            const extractedFontSizes = AIController.extractFontSizesFromHtml(pdfHtmlLayout);
            console.log('Extracted font sizes object:', extractedFontSizes);
            
            // Step 3: Test layout-aware template creation
            console.log('\n📝 STEP 3: Testing layout-aware template creation...');
            const subject = 'Mathematics';
            const questionsText = 'Sample question 1\nSample question 2\nSample question 3';
            const questionPoints = [20, 30, 50];
            
            const latexContent = AIController.createLayoutAwareLatexTemplate(subject, questionsText, questionPoints, extractedFontSizes);
            console.log(`✅ LaTeX template created: ${latexContent.length} characters`);
            
            // Step 4: Check what font sizes are in the template
            console.log('\n📏 STEP 4: Analyzing template font sizes...');
            const fontSizeMatches = latexContent.match(/\\fontsize\{(\d+)\}/g) || [];
            console.log('Font sizes in template:', fontSizeMatches);
            
            // Step 5: Save template for inspection
            fs.writeFileSync('debug-template.tex', latexContent);
            console.log('✅ Template saved to debug-template.tex');
            
            // Cleanup
            fs.unlinkSync(htmlOutputPath);
            const pngFiles = fs.readdirSync('.').filter(f => f.startsWith(uniqueBaseName) && f.endsWith('.png'));
            pngFiles.forEach(f => fs.unlinkSync(f));
            
        } else {
            console.log('❌ HTML file not created');
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugFontExtraction().catch(console.error); 
 
 
 
 
 
 
 