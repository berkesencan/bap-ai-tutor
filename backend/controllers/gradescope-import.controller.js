const { importGradescopeCourse, createJob, getJob } = require('../jobs/importGradescopeCourse');

/**
 * Start a Gradescope import job
 */
async function startImport(req, res) {
  try {
    const { courseId } = req.params;
    const userId = req.user?.uid || req.headers['x-dev-user-id'] || process.env.DEV_USER_ID || 'dev-cli';

    console.log(`[IMPORT] Starting import for course ${courseId}, user ${userId}`);

    // Create job
    const jobId = createJob(userId, courseId);
    
    // Start import in background
    importGradescopeCourse({ userId, courseId, jobId }).catch(error => {
      console.error(`[IMPORT] Job ${jobId} failed:`, error);
    });

    res.json({
      success: true,
      data: {
        jobId,
        courseId,
        userId,
        status: 'running'
      }
    });

  } catch (error) {
    console.error('[IMPORT] Error starting import:', error);
    res.status(500).json({
      success: false,
      error: 'IMPORT_START_FAILED',
      message: error.message
    });
  }
}

/**
 * Get import job status and events via SSE
 */
async function streamImportProgress(req, res) {
  const { jobId } = req.params;

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const job = getJob(jobId);
  if (!job) {
    res.write(`data: ${JSON.stringify({ type: 'ERROR', error: 'Job not found' })}\n\n`);
    res.end();
    return;
  }

  // Send initial job info
  res.write(`data: ${JSON.stringify({ 
    type: 'JOB_INFO', 
    jobId: job.id, 
    status: job.status,
    courseId: job.courseId,
    createdAt: job.createdAt
  })}\n\n`);

  // Send all existing events
  job.events.forEach(event => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  // If job is completed, send final event and close
  if (job.status === 'completed' || job.status === 'failed') {
    res.write(`data: ${JSON.stringify({ type: 'STREAM_END', status: job.status })}\n\n`);
    res.end();
    return;
  }

  // Keep connection alive and send new events
  const interval = setInterval(() => {
    const currentJob = getJob(jobId);
    if (!currentJob) {
      clearInterval(interval);
      res.end();
      return;
    }

    // Send any new events
    if (currentJob.lastEvent && currentJob.lastEvent.timestamp > (job.lastEvent?.timestamp || 0)) {
      res.write(`data: ${JSON.stringify(currentJob.lastEvent)}\n\n`);
    }

    // Close if completed
    if (currentJob.status === 'completed' || currentJob.status === 'failed') {
      clearInterval(interval);
      res.write(`data: ${JSON.stringify({ type: 'STREAM_END', status: currentJob.status })}\n\n`);
      res.end();
    }
  }, 1000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
}

/**
 * Get import job status (non-SSE)
 */
async function getImportStatus(req, res) {
  try {
    const { jobId } = req.params;
    const job = getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'JOB_NOT_FOUND',
        message: 'Import job not found'
      });
    }

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        courseId: job.courseId,
        userId: job.userId,
        createdAt: job.createdAt,
        events: job.events,
        lastEvent: job.lastEvent
      }
    });

  } catch (error) {
    console.error('[IMPORT] Error getting job status:', error);
    res.status(500).json({
      success: false,
      error: 'JOB_STATUS_FAILED',
      message: error.message
    });
  }
}

module.exports = {
  startImport,
  streamImportProgress,
  getImportStatus
};
