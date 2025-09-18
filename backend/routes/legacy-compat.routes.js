/**
 * Legacy Route Compatibility Router
 * 
 * Provides backward compatibility for old frontend API paths in development mode only.
 * Logs all legacy route hits for migration tracking.
 * 
 * Only active when DEV_NO_AUTH=true to avoid masking production issues.
 */

const express = require('express');
const flags = require('../config/flags');
const legacy = require('../config/legacy-routes');
const upload = require('../middleware/upload.singlePdf');

// Only active in dev
module.exports = () => {
  const router = express.Router();
  
  // Return no-op router in production
  if (!flags.DEV_NO_AUTH) {
    console.log('[LEGACY-COMPAT] Disabled in production mode');
    return router;
  }

  console.log('[LEGACY-COMPAT] Enabled in development mode');
  console.log(`[LEGACY-COMPAT] Mapping ${legacy.length} legacy routes`);

  legacy.forEach(def => {
    const wrap = (req, res, next) => {
      // Set deprecation headers
      res.set('Deprecation', 'true');
      res.set('X-Legacy-Route', def.legacyPath);
      res.set('Sunset', 'true'); // signals we'll remove later
      
      // Log legacy usage (only if LOG_LEGACY_ROUTES is enabled)
      if (process.env.LOG_LEGACY_ROUTES === 'true') {
        console.warn(`[LEGACY][DEV] ${req.method.toUpperCase()} ${def.legacyPath} - ${def.description || 'No description'}`);
        console.warn(`[LEGACY][DEV] User-Agent: ${req.get('User-Agent') || 'Unknown'}`);
        console.warn(`[LEGACY][DEV] Referer: ${req.get('Referer') || 'Direct'}`);
      }
      
      next();
    };

    // Choose middleware based on route requirements
    const middlewares = [wrap];
    
    // Add upload middleware for endpoints that accept PDF files
    if (/practice-exam|process-pdf/i.test(def.legacyPath)) {
      middlewares.push(upload);
    }

    // Add authentication middleware (using our new maybeAuth system)
    middlewares.push((req, res, next) => {
      // Use our existing maybeAuth logic
      if (flags.DEV_NO_AUTH) {
        console.log('[LEGACY-COMPAT] Skipping auth (DEV_NO_AUTH=true)');
        return next();
      }
      // In production, this router won't be mounted anyway
      return next();
    });

    // Handle proxy routes vs handler routes
    if (def.proxyTo) {
      // Proxy route - rewrite URL and pass to downstream
      middlewares.push((req, res, next) => {
        const newUrl = def.proxyTo.replace(':courseId', req.params.courseId || '');
        req.url = newUrl;
        console.log(`[LEGACY-COMPAT] Proxying ${def.legacyPath} -> ${newUrl}`);
        next();
      });
      
      // Pass through to downstream router
      router[def.method](def.legacyPath, ...middlewares, (req, res, next) => next());
    } else {
      // Handler route - use the specified handler
      router[def.method](def.legacyPath, ...middlewares, def.handler);
    }
    
    console.log(`[LEGACY-COMPAT] Mapped ${def.method.toUpperCase()} ${def.legacyPath} -> ${def.proxyTo || def.handler?.name || 'handler'}`);
  });

  return router;
};
