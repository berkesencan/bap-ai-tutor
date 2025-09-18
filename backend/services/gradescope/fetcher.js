const { chromium } = require('playwright');
const { getServiceForUser } = require('../../controllers/gradescope.controller');
const { CookieJar } = require('tough-cookie');

/**
 * Convert cookie jar to Playwright format
 */
async function cookiesFromJarForGS(jar) {
  const url = "https://www.gradescope.com/";
  const plain = await new Promise((resolve, reject) => {
    jar.getCookies(url, (err, cookies) => err ? reject(err) : resolve(cookies));
  });
  return plain.map(c => ({
    name: c.key,
    value: c.value,
    domain: c.domain?.startsWith(".") ? c.domain : (c.domain || "www.gradescope.com"),
    path: c.path || "/",
    httpOnly: !!c.httpOnly,
    secure: true,
    sameSite: "Lax"
  }));
}

/**
 * Assert user is authenticated to Gradescope
 */
async function assertAuthenticated(userId) {
  const svc = await getServiceForUser(userId);
  if (!svc) {
    throw new Error("No authenticated Gradescope service available for user " + userId);
  }
  
  // Test authentication by trying to get courses
  try {
    const courses = await svc.getCourses();
    console.log(`[GS FETCH] user=${userId} authenticated, found ${courses.length} courses`);
    return { svc, courseCount: courses.length };
  } catch (error) {
    throw new Error(`Not authenticated to Gradescope for user ${userId}: ${error.message}`);
  }
}

/**
 * Check if page looks renderable (less strict detection)
 */
function pageLooksRenderable(html) {
  // stop being picky; capture if any meaningful content or embedded viewer exists
  const big = html.length > 20_000; // long page = likely content
  const hasViewer = /<iframe|<embed|<object/i.test(html);
  const hasAssignment = /(Assignment|Problem|Exam|Solutions)/i.test(html) && /class="(content|assignment|submission|course-)/i.test(html);
  return big || hasViewer || hasAssignment;
}

/**
 * Determine lock reason from page content (stricter detection)
 */
function lockReasonFrom(htmlOrStatus) {
  const { html, status } = htmlOrStatus;
  if (status === 403) return { locked: true, reason: 'permission_denied', evidence: 'HTTP 403' };
  if (status === 404) return { locked: true, reason: 'not_found', evidence: 'HTTP 404' };
  if (/Submit to view|available after due/i.test(html)) return { locked: true, reason: 'requires_submission', evidence: 'submit/available string' };
  if (/hidden until due/i.test(html)) return { locked: true, reason: 'hidden_until_due', evidence: 'hidden string' };
  if (/You do not have permission/i.test(html)) return { locked: true, reason: 'permission_denied', evidence: 'permission denied string' };
  // NO generic 'no_download_link' here — lack of <a Download PDF> is NOT a lock.
  return { locked: false };
}

/**
 * Fetches assignment artifacts from Gradescope using multiple strategies
 * @param {string} userId - User ID for authentication
 * @param {string} gsCourseId - Gradescope course ID
 * @param {string} gsAssignmentId - Gradescope assignment ID
 * @returns {Promise<Artifact>} - Discriminated union of artifact types
 */
async function fetchAssignmentArtifact(userId, gsCourseId, gsAssignmentId) {
  console.log(`[GS FETCH] course=${gsCourseId} asg=${gsAssignmentId} starting`);
  
  try {
    // Assert authentication
    const { svc } = await assertAuthenticated(userId);

    // Strategy 1: Try download link
    const downloadResult = await tryDownloadLink(svc, gsCourseId, gsAssignmentId);
    if (downloadResult.kind === 'pdf') {
      console.log(`[GS FETCH] course=${gsCourseId} asg=${gsAssignmentId} outcome=pdf source=download-link bytes=${downloadResult.bytes.length}`);
      return downloadResult;
    }

    // Strategy 2: Try submission file
    const submissionResult = await trySubmissionFile(svc, gsCourseId, gsAssignmentId);
    if (submissionResult.kind === 'pdf') {
      console.log(`[GS FETCH] course=${gsCourseId} asg=${gsAssignmentId} outcome=pdf source=submission-file bytes=${submissionResult.bytes.length}`);
      return submissionResult;
    }

    // Strategy 3: Try headless render (always try unless explicitly locked)
    const renderResult = await tryHeadlessRender(svc, gsCourseId, gsAssignmentId);
    if (renderResult.kind === 'rendered-pdf') {
      console.log(`[GS FETCH] course=${gsCourseId} asg=${gsAssignmentId} outcome=rendered-pdf source=headless-print bytes=${renderResult.bytes.length}`);
      return renderResult;
    }

    // All strategies failed, determine lock reason
    const lockReason = determineLockReason(downloadResult, submissionResult, renderResult);
    console.log(`[GS FETCH] course=${gsCourseId} asg=${gsAssignmentId} outcome=locked reason=${lockReason.reason}`);
    return lockReason;

  } catch (error) {
    console.error(`[GS FETCH] course=${gsCourseId} asg=${gsAssignmentId} error:`, error.message);
    return {
      kind: 'locked',
      reason: 'unknown',
      evidence: error.message
    };
  }
}

/**
 * Strategy 1: Try to download PDF from assignment page
 */
async function tryDownloadLink(gradescopeService, gsCourseId, gsAssignmentId) {
  try {
    const assignmentUrl = `https://www.gradescope.com/courses/${gsCourseId}/assignments/${gsAssignmentId}`;
    const response = await gradescopeService.makeAuthenticatedRequest(assignmentUrl);
    
    if (!response.ok) {
      if (response.status === 403) {
        return { kind: 'locked', reason: 'permission_denied', evidence: '403 Forbidden' };
      }
      if (response.status === 404) {
        return { kind: 'locked', reason: 'not_found', evidence: '404 Not Found' };
      }
      return { kind: 'locked', reason: 'unknown', evidence: `HTTP ${response.status}` };
    }

    const html = await response.text();
    
    // Check for lock indicators
    if (html.includes('Submit to view') || html.includes('Available after due')) {
      return { kind: 'locked', reason: 'requires_submission', evidence: 'Assignment requires submission to view' };
    }

    // Look for download link
    const downloadMatch = html.match(/<a[^>]*href="([^"]*)"[^>]*>.*?Download PDF.*?<\/a>/i);
    if (downloadMatch) {
      const downloadUrl = downloadMatch[1].startsWith('http') ? downloadMatch[1] : `https://www.gradescope.com${downloadMatch[1]}`;
      const pdfResponse = await gradescopeService.makeAuthenticatedRequest(downloadUrl);
      
      if (pdfResponse.ok) {
        const bytes = await pdfResponse.buffer();
        if (bytes.length >= 10000) { // Guard against tiny PDFs
          return {
            kind: 'pdf',
            bytes,
            filename: `Assignment-${gsAssignmentId}.pdf`,
            source: 'download-link'
          };
        }
      }
    }

    return { kind: 'locked', reason: 'no_download_link', evidence: 'No download link found' };
  } catch (error) {
    return { kind: 'locked', reason: 'unknown', evidence: error.message };
  }
}

/**
 * Strategy 2: Try to get PDF from submission files
 */
async function trySubmissionFile(gradescopeService, gsCourseId, gsAssignmentId) {
  try {
    const submissionsUrl = `https://www.gradescope.com/courses/${gsCourseId}/assignments/${gsAssignmentId}/submissions`;
    const response = await gradescopeService.makeAuthenticatedRequest(submissionsUrl);
    
    if (!response.ok) {
      return { kind: 'locked', reason: 'permission_denied', evidence: `Submissions page HTTP ${response.status}` };
    }

    const html = await response.text();
    
    // Look for instructor-provided PDF files
    const pdfMatch = html.match(/<a[^>]*href="([^"]*\.pdf)"[^>]*>.*?<\/a>/i);
    if (pdfMatch) {
      const pdfUrl = pdfMatch[1].startsWith('http') ? pdfMatch[1] : `https://www.gradescope.com${pdfMatch[1]}`;
      const pdfResponse = await gradescopeService.makeAuthenticatedRequest(pdfUrl);
      
      if (pdfResponse.ok) {
        const bytes = await pdfResponse.buffer();
        if (bytes.length >= 10000) {
          return {
            kind: 'pdf',
            bytes,
            filename: `Assignment-${gsAssignmentId}-submission.pdf`,
            source: 'submission-file'
          };
        }
      }
    }

    return { kind: 'locked', reason: 'no_download_link', evidence: 'No submission PDF found' };
  } catch (error) {
    return { kind: 'locked', reason: 'unknown', evidence: error.message };
  }
}

/**
 * Strategy 3: Use headless browser to render assignment page to PDF
 */
async function tryHeadlessRender(gradescopeService, gsCourseId, gsAssignmentId) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ 
      deviceScaleFactor: 2, 
      viewport: { width: 1280, height: 1800 } 
    });
    
    // Set up authentication cookies properly
    if (gradescopeService.cookieJar) {
      const cookies = await cookiesFromJarForGS(gradescopeService.cookieJar);
      await context.addCookies(cookies);
      console.log(`[GS FETCH] Added ${cookies.length} cookies to browser context`);
    }

    const page = await context.newPage();
    const assignmentUrl = `https://www.gradescope.com/courses/${gsCourseId}/assignments/${gsAssignmentId}`;
    
    console.log(`[GS FETCH] Navigating to: ${assignmentUrl}`);
    await page.goto(assignmentUrl, { waitUntil: 'networkidle' });
    
    // Take debug screenshot
    await page.screenshot({ path: `/tmp/GS-${gsCourseId}-${gsAssignmentId}.png`, fullPage: true });
    console.log(`[GS FETCH] Debug screenshot saved to /tmp/GS-${gsCourseId}-${gsAssignmentId}.png`);
    
    // Get page content and check for explicit locks
    const html = await page.content();
    const lockCheck = lockReasonFrom({ html, status: 200 });
    
    if (lockCheck.locked) {
      console.log(`[GS FETCH] Page explicitly locked: ${lockCheck.reason}`);
      return { kind: 'locked', reason: lockCheck.reason, evidence: lockCheck.evidence };
    }

    // Check if page looks renderable (less strict)
    if (!pageLooksRenderable(html)) {
      console.log(`[GS FETCH] Page does not look renderable (length: ${html.length})`);
      return { kind: 'locked', reason: 'no_download_link', evidence: 'Page does not contain substantial content for rendering' };
    }

    // Force print attempt
    console.log(`[GS FETCH] Attempting headless PDF capture...`);
    await page.emulateMedia({ media: 'print' });
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
    });

    if (pdfBuffer && pdfBuffer.length >= 10000) {
      console.log(`[GS FETCH] Successfully captured PDF: ${pdfBuffer.length} bytes`);
      return {
        kind: 'rendered-pdf',
        bytes: pdfBuffer,
        filename: `Assignment-${gsAssignmentId}-capture.pdf`,
        source: 'headless-print'
      };
    }

    return { kind: 'locked', reason: 'no_download_link', evidence: 'Rendered PDF too small' };
  } catch (error) {
    console.error(`[GS FETCH] Headless render error:`, error.message);
    return { kind: 'locked', reason: 'unknown', evidence: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Determine lock reason from failed strategies
 */
function determineLockReason(downloadResult, submissionResult, renderResult) {
  // Check for specific lock reasons in order of priority
  if (downloadResult.reason === 'requires_submission' || submissionResult.reason === 'requires_submission' || renderResult.reason === 'requires_submission') {
    return { kind: 'locked', reason: 'requires_submission', evidence: 'Assignment requires submission to view' };
  }
  
  if (downloadResult.reason === 'permission_denied' || submissionResult.reason === 'permission_denied' || renderResult.reason === 'permission_denied') {
    return { kind: 'locked', reason: 'permission_denied', evidence: 'Insufficient permissions' };
  }
  
  if (downloadResult.reason === 'not_found' || renderResult.reason === 'not_found') {
    return { kind: 'locked', reason: 'not_found', evidence: 'Assignment not found' };
  }
  
  if (downloadResult.reason === 'hidden_until_due' || renderResult.reason === 'hidden_until_due') {
    return { kind: 'locked', reason: 'hidden_until_due', evidence: 'Assignment hidden until due date' };
  }
  
  // Only use no_download_link if we have explicit evidence
  if (renderResult.reason === 'no_download_link' && renderResult.evidence && renderResult.evidence.includes('substantial content')) {
    return { kind: 'locked', reason: 'no_download_link', evidence: renderResult.evidence };
  }
  
  // Default to unknown if we can't determine a specific reason
  return { kind: 'locked', reason: 'unknown', evidence: 'All strategies failed without specific lock reason' };
}

module.exports = {
  fetchAssignmentArtifact
};
