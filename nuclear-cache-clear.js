// Nuclear cache clear - run this to completely wipe all cached document analyses
const fetch = require('node-fetch');

async function nuclearCacheClear() {
  try {
    console.log('🧨 NUCLEAR CACHE CLEAR: Wiping ALL document cache...');
    
    const response = await fetch('http://localhost:5000/api/cache/clear-all-cache', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This bypasses auth for testing - in production you'd need a valid token
      }
    });
    
    const result = await response.json();
    console.log('✅ Result:', result);
    
    if (result.success) {
      console.log('🎉 SUCCESS: All cache cleared! Next document analysis will be fresh.');
    } else {
      console.error('❌ FAILED:', result.error);
    }
    
  } catch (error) {
    console.error('💥 ERROR:', error.message);
  }
}

nuclearCacheClear();
