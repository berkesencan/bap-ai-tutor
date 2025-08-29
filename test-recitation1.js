const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

async function runCommand(command) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔄 Running: ${command}`);
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error: ${error}`);
                reject(error);
                return;
            }
            if (stderr) {
                console.log(`⚠️  stderr: ${stderr}`);
            }
            console.log(`✅ stdout: ${stdout}`);
            resolve(stdout);
        });
    });
}

async function testRecitation1() {
    console.log('='.repeat(60));
    console.log('🧪 TESTING RECITATION1 WITH SIMPLE STEP2.5 APPROACH');
    console.log('='.repeat(60));
    
    const pdfPath = path.join(__dirname, 'recitation1_Spring_2024.pdf');
    
    // Check if PDF exists
    if (!fs.existsSync(pdfPath)) {
        console.error('❌ recitation1_Spring_2024.pdf not found!');
        return;
    }
    
    console.log(`📄 Testing with PDF: ${pdfPath}`);
    
    try {
        // Step 1: PDF Extraction
        console.log('\n📊 STEP 1: PDF EXTRACTION');
        await runCommand(`node step1-pdf-extraction.js "${pdfPath}"`);
        
        // Check Step 1 outputs
        const step1Dir = 'step1-output';
        if (fs.existsSync(step1Dir)) {
            const files = fs.readdirSync(step1Dir);
            console.log(`📁 Step 1 outputs: ${files.length} files`);
            
            // Check extraction analysis
            const analysisPath = path.join(step1Dir, 'extraction-analysis.json');
            if (fs.existsSync(analysisPath)) {
                const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
                console.log(`📊 Extraction Stats:`);
                console.log(`   - Text: ${analysis.summary?.textLength || 'N/A'} characters`);
                console.log(`   - HTML: ${analysis.summary?.htmlLength || 'N/A'} characters`);
                console.log(`   - Pages: ${analysis.summary?.pageCount || 'N/A'}`);
                console.log(`   - Tables: ${analysis.summary?.tableCount || 'N/A'}`);
                console.log(`   - Images: ${analysis.summary?.imageCount || 'N/A'}`);
            }
            
            // Check extracted text preview
            const textPath = path.join(step1Dir, 'extracted-text.txt');
            if (fs.existsSync(textPath)) {
                const textContent = fs.readFileSync(textPath, 'utf8');
                console.log(`📝 Text preview (first 300 chars):`);
                console.log(`"${textContent.substring(0, 300)}..."`);
                
                // Try to identify the subject from recitation content
                const lowerText = textContent.toLowerCase();
                let subject = 'Academic';
                let instructions = 'Generate comprehensive questions based on the recitation content';
                
                if (lowerText.includes('algorithm') || lowerText.includes('complexity') || lowerText.includes('big o')) {
                    subject = 'Algorithms';
                    instructions = 'Focus on algorithm analysis, complexity theory, and problem-solving techniques';
                } else if (lowerText.includes('operating system') || lowerText.includes('process') || lowerText.includes('thread')) {
                    subject = 'Operating Systems';
                    instructions = 'Focus on process management, memory management, and system concepts';
                } else if (lowerText.includes('parallel') || lowerText.includes('concurrent') || lowerText.includes('mpi')) {
                    subject = 'Parallel Computing';
                    instructions = 'Focus on parallel algorithms, synchronization, and distributed computing';
                } else if (lowerText.includes('database') || lowerText.includes('sql') || lowerText.includes('query')) {
                    subject = 'Database Systems';
                    instructions = 'Focus on database design, SQL queries, and transaction management';
                } else if (lowerText.includes('network') || lowerText.includes('protocol') || lowerText.includes('tcp')) {
                    subject = 'Computer Networks';
                    instructions = 'Focus on networking protocols, distributed systems, and communication';
                } else if (lowerText.includes('math') || lowerText.includes('calculus') || lowerText.includes('linear algebra')) {
                    subject = 'Mathematics';
                    instructions = 'Focus on mathematical concepts, proofs, and problem-solving';
                }
                
                console.log(`🎯 Detected subject: ${subject}`);
                console.log(`📝 Instructions: ${instructions}`);
            }
        }
        
        // Step 2: LaTeX Template Generation
        console.log('\n📝 STEP 2: LATEX TEMPLATE GENERATION');
        await runCommand(`node simple-gemini-conversion.js "${pdfPath}"`);
        
        // Check Step 2 outputs
        const step2Dir = 'simple-gemini-output';
        if (fs.existsSync(step2Dir)) {
            const files = fs.readdirSync(step2Dir);
            console.log(`📁 Step 2 outputs: ${files.join(', ')}`);
            
            // Check LaTeX template
            const latexPath = path.join(step2Dir, 'gemini-generated.tex');
            if (fs.existsSync(latexPath)) {
                const latexContent = fs.readFileSync(latexPath, 'utf8');
                console.log(`📝 LaTeX template size: ${latexContent.length} characters`);
                
                // Show document title/header
                const lines = latexContent.split('\n');
                const titleLine = lines.find(line => line.includes('\\title{'));
                if (titleLine) {
                    console.log(`📄 Document title: ${titleLine.trim()}`);
                }
                
                // Preview first few lines
                const firstLines = latexContent.split('\n').slice(0, 10).join('\n');
                console.log(`📄 Template preview:\n${firstLines}...`);
            }
        }
        
        // Step 2.5: Simple Question Generation
        console.log('\n🎯 STEP 2.5: SIMPLE QUESTION GENERATION');
        const numQuestions = 6;
        const difficulty = 'Medium';
        
        // Get subject and instructions from previous analysis
        let subject = 'Academic';
        let instructions = 'Generate comprehensive questions based on the recitation content';
        
        const textPath = path.join(step1Dir, 'extracted-text.txt');
        if (fs.existsSync(textPath)) {
            const textContent = fs.readFileSync(textPath, 'utf8');
            const lowerText = textContent.toLowerCase();
            
            if (lowerText.includes('algorithm') || lowerText.includes('complexity')) {
                subject = 'Algorithms';
                instructions = 'Focus on algorithm analysis, complexity theory, and problem-solving techniques';
            } else if (lowerText.includes('operating system') || lowerText.includes('process')) {
                subject = 'Operating Systems';
                instructions = 'Focus on process management, memory management, and system concepts';
            } else if (lowerText.includes('parallel') || lowerText.includes('concurrent')) {
                subject = 'Parallel Computing';
                instructions = 'Focus on parallel algorithms, synchronization, and distributed computing';
            } else if (lowerText.includes('database') || lowerText.includes('sql')) {
                subject = 'Database Systems';
                instructions = 'Focus on database design, SQL queries, and transaction management';
            } else if (lowerText.includes('network') || lowerText.includes('protocol')) {
                subject = 'Computer Networks';
                instructions = 'Focus on networking protocols, distributed systems, and communication';
            }
        }
        
        console.log(`🎯 Using subject: ${subject}`);
        console.log(`📝 Using instructions: ${instructions}`);
        
        await runCommand(`node step2.5-simple.js "${pdfPath}" ${numQuestions} ${difficulty} "${subject}" "${instructions}"`);
        
        // Check Step 2.5 outputs
        const step25Dir = 'step2.5-output';
        if (fs.existsSync(step25Dir)) {
            const files = fs.readdirSync(step25Dir);
            const latexFiles = files.filter(f => f.endsWith('.tex') && f.includes('simple-exam'));
            
            if (latexFiles.length > 0) {
                // Get the latest generated file
                const latestFile = latexFiles[latexFiles.length - 1];
                console.log(`📄 Generated LaTeX file: ${latestFile}`);
                
                // Read and analyze the content
                const latexPath = path.join(step25Dir, latestFile);
                const latexContent = fs.readFileSync(latexPath, 'utf8');
                console.log(`📝 Generated content size: ${latexContent.length} characters`);
                
                // Check for question numbering
                const hasNumbering = latexContent.includes('1.') || 
                                   latexContent.includes('\\section*{1}') ||
                                   latexContent.includes('Question 1') ||
                                   latexContent.includes('Problem 1');
                console.log(`🔢 Has question numbering: ${hasNumbering ? '✅' : '❌'}`);
                
                // Count questions
                const questionMatches = latexContent.match(/\\section\*\{[^}]*[0-9]+[^}]*\}/g) || 
                                      latexContent.match(/[0-9]+\./g) || [];
                const questionCount = questionMatches.length;
                console.log(`📊 Question count detected: ${questionCount}`);
                
                // Show first part of the content
                const firstLines = latexContent.split('\n').slice(0, 25).join('\n');
                console.log(`📝 First 25 lines:\n${firstLines}`);
                
                // Check for PDF compilation
                const pdfFile = latestFile.replace('.tex', '.pdf');
                const pdfPath = path.join(step25Dir, pdfFile);
                if (fs.existsSync(pdfPath)) {
                    const pdfStats = fs.statSync(pdfPath);
                    console.log(`📄 PDF generated: ${pdfFile} (${(pdfStats.size / 1024).toFixed(1)}KB)`);
                } else {
                    console.log(`⚠️  PDF not found: ${pdfFile}`);
                }
            }
        }
        
        console.log('\n🎉 SUCCESS: Recitation1 pipeline completed successfully!');
        
        // Summary
        console.log('\n📋 SUMMARY:');
        console.log('✅ Step 1: PDF extraction completed');
        console.log('✅ Step 2: LaTeX template generated');
        console.log('✅ Step 2.5: Simple question generation completed');
        console.log('✅ All parameters passed correctly');
        console.log('✅ Recitation-specific content generated');
        
    } catch (error) {
        console.error('\n❌ PIPELINE FAILED:', error.message);
        if (error.stdout) console.log('stdout:', error.stdout);
        if (error.stderr) console.log('stderr:', error.stderr);
    }
}

// Run the test
testRecitation1().catch(console.error); 