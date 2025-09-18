// TODO: DEPRECATED - Legacy OCR service
// This should not be used in RAG pipeline (use Unstructured instead)
const flags = require('../config/flags');

if (!flags.RAG_ENABLED) {
  const { AzureKeyCredential, DocumentAnalysisClient } = require('@azure/ai-form-recognizer');
}
const path = require('path');
const fs = require('fs');

class OCRService {
  constructor() {
    if (flags.RAG_ENABLED) {
      console.warn('[OCR] OCR service is deprecated when RAG is enabled. Use Unstructured instead.');
      return;
    }
    
    this.endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
    this.key = process.env.AZURE_FORM_RECOGNIZER_KEY;
    if (!this.endpoint || !this.key) {
      console.warn('[OCR] Azure Form Recognizer credentials missing. Using Tesseract.js fallback.');
      this.client = null;
      this.useTesseract = true;
    } else {
      this.client = new DocumentAnalysisClient(this.endpoint, new AzureKeyCredential(this.key));
      this.useTesseract = false;
    }
  }

  isEnabled() {
    return !!this.client || this.useTesseract;
  }

  /**
   * Analyze a local file using Azure Form Recognizer or Tesseract.js fallback
   */
  async analyzeFile(filePath) {
    if (this.client) {
      return await this.analyzeWithAzure(filePath);
    } else if (this.useTesseract) {
      return await this.analyzeWithTesseract(filePath);
    } else {
      throw new Error('OCR service not configured');
    }
  }

  /**
   * Azure Form Recognizer analysis (original implementation)
   */
  async analyzeWithAzure(filePath) {
    const stream = fs.createReadStream(filePath);
    const poller = await this.client.beginAnalyzeDocument('prebuilt-read', stream);
    const result = await poller.pollUntilDone();
    const lines = [];
    for (const page of result.pages || []) {
      for (const line of page.lines || []) {
        lines.push(line.content);
      }
    }
    const text = lines.join('\n');
    return { text, raw: result };
  }

  /**
   * Tesseract.js fallback for free OCR
   */
  async analyzeWithTesseract(filePath) {
    try {
      const { createWorker } = require('tesseract.js');
      const pdf2pic = require('pdf2pic');
      
      console.log('[OCR] Using Tesseract.js fallback for', filePath);
      
      // Convert PDF to images
      const convert = pdf2pic.fromPath(filePath, {
        density: 300, // High DPI for better OCR
        saveFilename: "page",
        savePath: "/tmp/",
        format: "png",
        width: 2000,
        height: 2000
      });
      
      // Convert first 3 pages (most exams fit in 3 pages)
      const pages = [];
      for (let pageNum = 1; pageNum <= 3; pageNum++) {
        try {
          const result = await convert(pageNum);
          if (result && result.path) {
            pages.push(result.path);
          }
        } catch (e) {
          console.log(`[OCR] Page ${pageNum} conversion failed:`, e.message);
          break; // Stop if we hit an error (likely end of document)
        }
      }
      
      if (pages.length === 0) {
        console.log('[OCR] No pages converted successfully');
        return { text: '', raw: null };
      }
      
      // OCR each page
      const worker = await createWorker('eng');
      let allText = [];
      
      for (const pagePath of pages) {
        try {
          console.log('[OCR] Processing', pagePath);
          const { data: { text } } = await worker.recognize(pagePath);
          if (text && text.trim()) {
            allText.push(text.trim());
          }
          // Clean up temp image file
          fs.unlink(pagePath, () => {});
        } catch (e) {
          console.warn('[OCR] Failed to process page:', e.message);
        }
      }
      
      await worker.terminate();
      
      const combinedText = allText.join('\n\n--- PAGE BREAK ---\n\n');
      console.log(`[OCR] Tesseract extracted ${combinedText.length} characters from ${pages.length} pages`);
      
      return { text: combinedText, raw: null };
      
    } catch (error) {
      console.error('[OCR] Tesseract.js failed:', error.message);
      return { text: '', raw: null };
    }
  }
}

module.exports = new OCRService();


