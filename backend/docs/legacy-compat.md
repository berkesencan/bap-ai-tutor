# Legacy Route Compatibility Layer

## Overview

The legacy compatibility layer provides backward compatibility for old frontend API paths during the migration to new endpoints. This system is **development-only** and helps maintain functionality while frontend code is updated.

## Key Features

- **Dev-only activation**: Only works when `DEV_NO_AUTH=true`
- **Production safety**: Disabled in production to avoid masking real issues
- **Comprehensive logging**: Tracks all legacy route usage for migration planning
- **Deprecation headers**: Sends standard deprecation signals to clients

## Architecture

### Components

1. **`backend/config/legacy-routes.js`** - Route mapping configuration
2. **`backend/routes/legacy-compat.routes.js`** - Compatibility router
3. **`backend/scripts/find-frontend-api-calls.js`** - API detection script
4. **`backend/middleware/upload.singlePdf.js`** - PDF upload middleware

### Flow

```
Frontend Request → Legacy Route → Compatibility Router → Original Handler
                     ↓
              [LEGACY][DEV] Log + Deprecation Headers
```

## Configuration

### Environment Variables

```bash
# Enable legacy route logging
LOG_LEGACY_ROUTES=true

# Development mode (required for legacy routes)
DEV_NO_AUTH=true
```

### Adding Legacy Routes

Edit `backend/config/legacy-routes.js`:

```javascript
module.exports = [
  {
    method: 'post',
    legacyPath: '/api/ai/old-endpoint',
    handler: require('../controllers/current.controller').currentMethod,
    description: 'Description of what this endpoint does'
  }
  // Add more routes as needed
];
```

### Removing Legacy Routes

1. Update frontend to use new endpoints
2. Remove entry from `legacy-routes.js`
3. Verify no frontend code references the old path

## Usage

### Running API Detection

```bash
# Scan frontend for API calls
npm run find:api

# Alternative command
npm run legacy:scan
```

### Testing Legacy Routes

```bash
# Test practice exam endpoint
curl -i -X POST http://localhost:8000/api/ai/practice-exam \
  -H 'X-Dev-User-Id: dev-cli' \
  -F 'subject=CS' \
  -F 'numQuestions=3' \
  -F 'difficulty=medium' \
  -F 'generatePDF=true'

# Expected response headers:
# Deprecation: true
# X-Legacy-Route: /api/ai/practice-exam
# Sunset: true
```

### Monitoring Legacy Usage

Enable logging in your environment:

```bash
export LOG_LEGACY_ROUTES=true
npm run dev
```

Watch for logs like:
```
[LEGACY][DEV] POST /api/ai/practice-exam - Legacy practice exam generation endpoint
[LEGACY][DEV] User-Agent: Mozilla/5.0...
[LEGACY][DEV] Referer: http://localhost:3000/ai-tutor
```

## Current Legacy Routes

| Legacy Path | Handler | Description |
|-------------|---------|-------------|
| `POST /api/ai/practice-exam` | `PracticeExamController.generatePracticeExam` | Legacy practice exam generation |
| `POST /api/ai/process-pdf-with-message` | `AIController.processPDFWithMessage` | Legacy PDF processing with message |
| `POST /api/ai/process-pdf` | `AIController.processPDF` | Legacy PDF processing |
| `POST /api/ai/generate-questions` | `AIController.generatePracticeQuestions` | Legacy practice questions |
| `POST /api/ai/study-plan` | `AIController.generateStudyPlan` | Legacy study plan generation |
| `POST /api/ai/explain` | `AIController.explainConcept` | Legacy concept explanation |

## Migration Strategy

### Phase 1: Identify Legacy Usage
1. Run `npm run find:api` to scan frontend
2. Compare with current backend routes
3. Add missing routes to `legacy-routes.js`

### Phase 2: Update Frontend
1. Update frontend code to use new endpoints
2. Test functionality with new endpoints
3. Verify legacy routes still work as fallback

### Phase 3: Remove Legacy Routes
1. Confirm no frontend usage of legacy paths
2. Remove entries from `legacy-routes.js`
3. Deploy and monitor for 404s

## Troubleshooting

### Legacy Route Not Working

1. **Check environment**: Ensure `DEV_NO_AUTH=true`
2. **Verify mapping**: Check `legacy-routes.js` has correct path
3. **Check handler**: Ensure handler function exists and is exported
4. **Review logs**: Look for `[LEGACY-COMPAT]` messages

### Production Issues

- Legacy routes are **disabled in production** by design
- If you see legacy route calls in production, update frontend code
- Legacy routes returning 404 in production is expected behavior

### Missing Dependencies

```bash
# Install required dependencies
npm install glob
```

## Security Considerations

- Legacy routes use the same authentication as current routes
- No additional security vulnerabilities introduced
- Deprecation headers help clients identify legacy usage
- Production mode ensures legacy routes don't mask real issues

## Future Plans

1. **Gradual removal**: Remove legacy routes as frontend migrates
2. **Monitoring**: Track usage patterns to prioritize migration
3. **Documentation**: Keep this guide updated as routes change
4. **Automation**: Consider automated detection of unused legacy routes

## Related Files

- `backend/config/legacy-routes.js` - Route configuration
- `backend/routes/legacy-compat.routes.js` - Compatibility router
- `backend/scripts/find-frontend-api-calls.js` - API detection
- `backend/middleware/upload.singlePdf.js` - Upload middleware
- `backend/index.js` - Router mounting
