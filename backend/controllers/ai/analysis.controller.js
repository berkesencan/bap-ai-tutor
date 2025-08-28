const { handleError } = require('../../middleware/error.middleware');
const PDFService = require('../../services/pdf.service');
const admin = require('firebase-admin');
const db = admin.firestore();

class AnalysisController {
  
  /**
   * Test form parsing functionality
   * @route POST /api/ai/test-form-parsing
   */
  static async testFormParsing(req, res) {
    try {
      console.log('=== TEST FORM PARSING ===');
      console.log('Headers:', req.headers);
      console.log('Body:', req.body);
      console.log('Files:', req.files);
      console.log('File keys:', req.files ? Object.keys(req.files) : 'No files');
      
      if (req.files && req.files.file) {
        console.log('File details:', {
          name: req.files.file.name,
          size: req.files.file.size,
          mimetype: req.files.file.mimetype
        });
      }
      
      res.json({
        success: true,
        data: {
          body: req.body,
          files: req.files ? Object.keys(req.files) : [],
          fileDetails: req.files ? Object.fromEntries(
            Object.entries(req.files).map(([key, file]) => [
              key, 
              {
                name: file.name,
                size: file.size,
                mimetype: file.mimetype
              }
            ])
          ) : {}
        }
      });
    } catch (error) {
      console.error('Test form parsing error:', error);
      handleError(error, res);
    }
  }

  /**
   * Download PDF file
   * @route GET /api/ai/download-pdf/:filename
   */
  static async downloadPDF(req, res) {
    try {
      const { filename } = req.params;
      
      if (!filename) {
        return res.status(400).json({
          success: false,
          message: 'Filename is required'
        });
      }

      const filePath = `uploads/${filename}`;
      
      // Check if file exists
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(__dirname, '../../', filePath);
      
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Set appropriate headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(fullPath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      handleError(error, res);
    }
  }

  /**
   * Analyze document content
   * @route POST /api/ai/analyze-document
   */
  static async analyzeDocument(req, res) {
    try {
      const { documentId, analysisType = 'summary' } = req.body;
      const userId = req.user.uid;

      if (!documentId) {
        return res.status(400).json({
          success: false,
          message: 'Document ID is required'
        });
      }

      // Get document from database
      const docRef = db.collection('documents').doc(documentId);
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      const document = docSnapshot.data();

      // Check if user has access to this document
      if (document.uploadedBy !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      let analysis;
      
      switch (analysisType) {
        case 'summary':
          analysis = await this.generateDocumentSummary(document.content);
          break;
        case 'key-concepts':
          analysis = await this.extractKeyConcepts(document.content);
          break;
        case 'questions':
          analysis = await this.generateQuestionsFromDocument(document.content);
          break;
        case 'difficulty-assessment':
          analysis = await this.assessDocumentDifficulty(document.content);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid analysis type'
          });
      }

      // Save analysis to database
      const analysisRef = await db.collection('document_analyses').add({
        documentId,
        analysisType,
        analysis,
        createdBy: userId,
        createdAt: new Date()
      });

      res.json({
        success: true,
        data: {
          analysisId: analysisRef.id,
          analysis,
          analysisType,
          documentTitle: document.title
        }
      });

    } catch (error) {
      console.error('Error analyzing document:', error);
      handleError(error, res);
    }
  }

  /**
   * Batch analyze multiple documents
   * @route POST /api/ai/batch-analyze
   */
  static async batchAnalyzeDocuments(req, res) {
    try {
      const { documentIds, analysisType = 'summary' } = req.body;
      const userId = req.user.uid;

      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Document IDs array is required'
        });
      }

      const results = [];
      const errors = [];

      for (const documentId of documentIds) {
        try {
          const docRef = db.collection('documents').doc(documentId);
          const docSnapshot = await docRef.get();

          if (!docSnapshot.exists) {
            errors.push({ documentId, error: 'Document not found' });
            continue;
          }

          const document = docSnapshot.data();

          if (document.uploadedBy !== userId) {
            errors.push({ documentId, error: 'Access denied' });
            continue;
          }

          let analysis;
          
          switch (analysisType) {
            case 'summary':
              analysis = await this.generateDocumentSummary(document.content);
              break;
            case 'key-concepts':
              analysis = await this.extractKeyConcepts(document.content);
              break;
            default:
              analysis = await this.generateDocumentSummary(document.content);
          }

          results.push({
            documentId,
            documentTitle: document.title,
            analysis,
            analysisType
          });

        } catch (error) {
          errors.push({ documentId, error: error.message });
        }
      }

      res.json({
        success: true,
        data: {
          results,
          errors,
          totalProcessed: results.length,
          totalErrors: errors.length
        }
      });

    } catch (error) {
      console.error('Error in batch analysis:', error);
      handleError(error, res);
    }
  }

  // Helper methods for document analysis
  static async generateDocumentSummary(content) {
    const GeminiService = require('../../services/gemini.service');
    
    const prompt = `Please provide a comprehensive summary of the following document content:

${content}

Include:
1. Main topics covered
2. Key points and concepts
3. Important conclusions or findings
4. Overall structure and organization

Keep the summary concise but informative.`;

    return await GeminiService.generateAIContent(prompt);
  }

  static async extractKeyConcepts(content) {
    const GeminiService = require('../../services/gemini.service');
    
    const prompt = `Extract and list the key concepts, terms, and ideas from the following document:

${content}

Format the response as:
1. Primary Concepts: [list main concepts]
2. Key Terms: [important terminology]
3. Theories/Principles: [theoretical frameworks mentioned]
4. Practical Applications: [real-world applications discussed]

Focus on educational value and learning objectives.`;

    return await GeminiService.generateAIContent(prompt);
  }

  static async generateQuestionsFromDocument(content) {
    const GeminiService = require('../../services/gemini.service');
    
    const prompt = `Generate study questions based on the following document content:

${content}

Create:
1. 5 multiple choice questions (with answers)
2. 3 short answer questions
3. 2 essay questions
4. 5 true/false questions (with explanations)

Questions should test understanding at different cognitive levels (recall, comprehension, application, analysis).`;

    return await GeminiService.generateAIContent(prompt);
  }

  static async assessDocumentDifficulty(content) {
    const GeminiService = require('../../services/gemini.service');
    
    const prompt = `Assess the difficulty level and complexity of the following document:

${content}

Provide:
1. Overall difficulty level (Beginner/Intermediate/Advanced/Expert)
2. Reading level estimate
3. Key complexity factors
4. Prerequisites needed to understand the content
5. Suggestions for making it more accessible
6. Target audience assessment

Be specific and provide reasoning for your assessment.`;

    return await GeminiService.generateAIContent(prompt);
  }
}

module.exports = AnalysisController;
