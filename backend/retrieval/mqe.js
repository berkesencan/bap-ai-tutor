/**
 * Multi-Query Expansion (MQE) Module
 * 
 * Generates query variants to capture wording drift and improve retrieval coverage
 */

const flags = require('../config/flags');
const GeminiService = require('../services/gemini.service');

/**
 * Generate rule-based query variants for academic assignment phrasing
 * @param {string} query - Original query
 * @returns {Array<string>} - Array of query variants
 */
function ruleBasedVariants(query) {
  const variants = new Set([query]);
  
  // Pattern matching for homework/assignment queries
  const patterns = [
    // Homework #X QY patterns
    /(hw|homework)\s*#?\s*(\d+).*?(q|question|problem)\s*#?\s*(\d+)/i,
    // Problem X patterns
    /problem\s*#?\s*(\d+)/i,
    // Question X patterns
    /question\s*#?\s*(\d+)/i,
    // Exercise X patterns
    /exercise\s*#?\s*(\d+)/i
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      if (match[1] && match[2] && match[3] && match[4]) {
        // Homework #X QY pattern
        const hwNum = match[2];
        const qNum = match[4];
        const variants_to_add = [
          `Homework ${hwNum} Problem ${qNum}`,
          `Homework #${hwNum} Problem ${qNum}`,
          `Homework ${hwNum} Question ${qNum}`,
          `HW${hwNum} Q${qNum}`,
          `HW ${hwNum} Q ${qNum}`,
          `Assignment ${hwNum} Problem ${qNum}`,
          `Problem Set ${hwNum} Question ${qNum}`
        ];
        variants_to_add.forEach(v => variants.add(v));
      } else if (match[1]) {
        // Single number pattern (Problem X, Question X, etc.)
        const num = match[1];
        const base = query.replace(pattern, '').trim();
        const variants_to_add = [
          `Problem ${num}`,
          `Problem #${num}`,
          `Question ${num}`,
          `Question #${num}`,
          `Q${num}`,
          `Q ${num}`,
          `Exercise ${num}`,
          `Exercise #${num}`
        ];
        variants_to_add.forEach(v => variants.add(v));
      }
    }
  }
  
  // Add common academic synonyms
  const synonyms = [
    ['derivative', 'differentiation', 'dy/dx', 'f\'(x)'],
    ['integral', 'integration', 'antiderivative'],
    ['matrix', 'matrices'],
    ['vector', 'vectors'],
    ['function', 'functions'],
    ['equation', 'equations'],
    ['solve', 'solution', 'find', 'calculate'],
    ['constraint', 'constraints', 'condition', 'conditions'],
    ['optimize', 'optimization', 'minimize', 'maximize']
  ];
  
  for (const [original, ...syns] of synonyms) {
    if (query.toLowerCase().includes(original)) {
      syns.forEach(syn => {
        variants.add(query.toLowerCase().replace(original, syn));
      });
    }
  }
  
  return Array.from(variants);
}

/**
 * Generate query variants using Gemini
 * @param {string} query - Original query
 * @param {number} n - Number of variants to generate (excluding original)
 * @param {number} temperature - Generation temperature
 * @returns {Promise<Array<string>>} - Array of query variants
 */
async function geminiVariants(query, n = 3, temperature = 0.1) {
  try {
    const prompt = `Generate ${n} short alternative queries (max 12 words each) that mean the same as: "${query}". 

Focus on academic assignment phrasing variants like "Q2" vs "Problem 2", "Homework #7" vs "HW7", or "derivative" vs "differentiation". 

Return one query per line, no numbering or bullet points.`;

    const response = await GeminiService.testGeminiFlash(prompt);
    const text = response.text || '';
    
    // Parse lines and clean up
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.match(/^\d+[\.\)]/)) // Remove numbered items
      .slice(0, n); // Limit to requested number
    
    return lines;
    
  } catch (error) {
    console.warn('[MQE] Gemini variant generation failed:', error.message);
    return [];
  }
}

/**
 * Expand a query into multiple variants for better retrieval coverage
 * @param {string} query - Original query
 * @returns {Promise<Array<string>>} - Array of query variants (including original)
 */
async function expandQueries(query) {
  if (!query || typeof query !== 'string') {
    return [query];
  }
  
  try {
    console.log(`[MQE] Expanding query: "${query}"`);
    
    // Start with rule-based variants
    let variants = ruleBasedVariants(query);
    console.log(`[MQE] Rule-based variants: ${variants.length}`);
    
    // Add Gemini variants if enabled
    if (flags.ENABLE_MQE && flags.MQE_PROVIDER === 'gemini') {
      try {
        const geminiVariants_result = await geminiVariants(
          query, 
          flags.MQE_NUM - 1, // -1 because we include original
          flags.MQE_TEMPERATURE
        );
        
        variants = [...variants, ...geminiVariants_result];
        console.log(`[MQE] Added ${geminiVariants_result.length} Gemini variants`);
        
      } catch (error) {
        console.warn('[MQE] Gemini expansion failed, using rule-based only:', error.message);
      }
    }
    
    // Remove duplicates and cap total
    const uniqueVariants = Array.from(new Set(variants));
    const cappedVariants = uniqueVariants.slice(0, flags.MQE_NUM);
    
    console.log(`[MQE] Final variants (${cappedVariants.length}):`, cappedVariants);
    
    return cappedVariants;
    
  } catch (error) {
    console.error('[MQE] Query expansion failed:', error.message);
    return [query]; // Fallback to original query
  }
}

module.exports = { expandQueries, ruleBasedVariants, geminiVariants };
