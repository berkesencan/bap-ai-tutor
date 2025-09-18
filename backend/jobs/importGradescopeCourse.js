const { storageProvider } = require('../services/storage');
const { fetchAssignmentArtifact } = require('../services/gradescope/fetcher');
const { getServiceForUser } = require('../controllers/gradescope.controller');
const { getIngestionService } = require('../ingestion/ingestion.service');
const { gradescopeKey } = require('../services/storage/path');
const { Pool } = require('pg');
const crypto = require('crypto');
const flags = require('../config/flags');

// Simple in-memory job store (in production, use Redis or similar)
const jobs = new Map();

/**
 * Import Gradescope course with progress tracking
 */
async function importGradescopeCourse({ userId, courseId, jobId }) {
  const db = new Pool({
    connectionString: flags.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const notify = (event) => {
    if (jobs.has(jobId)) {
      jobs.get(jobId).events.push(event);
      jobs.get(jobId).lastEvent = event;
    }
  };

  try {
    notify({ type: "START", courseId, timestamp: new Date().toISOString() });
    
    // Get UI source of truth (same as left-rail)
    const { getMaterialsFromUI } = require('../controllers/rag/consistency.controller');
    const ui = await getMaterialsFromUI(courseId, userId);
    const assignments = ui.assignments || [];
    
    // Get course external ID from Firestore
    const { db: firestore } = require('../config/firebase');
    const courseDoc = await firestore.collection('courses').doc(courseId).get();
    
    if (!courseDoc.exists) {
      throw new Error('Course not found');
    }
    
    const courseData = courseDoc.data();
    const gsCourseId = courseData.externalId;
    
    if (!gsCourseId) {
      throw new Error('Course has no external ID');
    }

    let done = 0, total = assignments.length, indexed = 0, locked = 0, failed = 0;

    for (const asg of assignments) {
      notify({ 
        type: "ASSIGNMENT_FOUND", 
        title: asg.title, 
        gsAssignmentId: asg.raw.gsAssignmentId,
        timestamp: new Date().toISOString()
      });
      
      try {
        const art = await fetchAssignmentArtifact(userId, gsCourseId, asg.raw.gsAssignmentId);
        
        if (art.kind === "locked") {
          await upsertStatusFirestore(firestore, asg.id, { 
            status: "LOCKED", 
            reason: art.reason, 
            evidence: art.evidence,
            gsCourseId,
            gsAssignmentId: asg.raw.gsAssignmentId
          });
          locked++;
          notify({ 
            type: "LOCKED", 
            gsAssignmentId: asg.raw.gsAssignmentId, 
            reason: art.reason,
            timestamp: new Date().toISOString()
          });
        } else {
          const bytes = art.bytes;
          const docHash = crypto.createHash("sha256").update(bytes).digest("hex");
          const storageKey = gradescopeKey({
            uid: userId,
            courseId: gsCourseId,
            assignmentId: asg.raw.gsAssignmentId
          }) + `/${docHash}.pdf`;

          // Check if already exists in Firestore
          const assignmentFilesRef = firestore.collection('assignment_files');
          const existingQuery = await assignmentFilesRef
            .where('assignmentId', '==', asg.id)
            .where('docHash', '==', docHash)
            .get();
          
          if (existingQuery.empty) {
            // Upload to Firebase Storage
            await storageProvider.putObject(storageKey, bytes, { contentType: "application/pdf" });
            notify({ 
              type: "UPLOAD_SUCCESS", 
              gsAssignmentId: asg.raw.gsAssignmentId, 
              storageKey,
              timestamp: new Date().toISOString()
            });
            
            // Store file metadata in Firestore
            const version = await nextVersionFirestore(firestore, asg.id);
            await assignmentFilesRef.add({
              assignmentId: asg.id,
              version: version,
              kind: art.kind === "pdf" ? "gradescope-pdf" : "rendered-pdf",
              source: art.source,
              storageKey: storageKey,
              docHash: docHash,
              sizeBytes: bytes.length,
              createdAt: new Date()
            });
          } else {
            notify({ 
              type: "UPLOAD_SKIPPED", 
              gsAssignmentId: asg.raw.gsAssignmentId, 
              storageKey,
              timestamp: new Date().toISOString()
            });
          }

          // Extract text and index
          const gs = await getServiceForUser(userId);
          const extractedText = await gs.extractTextFromPDF(bytes);
          
          if (!extractedText || extractedText.trim().length < 200 || bytes.length < 10_000) {
            failed++;
            await upsertStatusFirestore(firestore, asg.id, { 
              status: "FAILED", 
              reason: "too_short", 
              evidence: `bytes=${bytes.length} chars=${extractedText?.length ?? 0}`,
              gsCourseId,
              gsAssignmentId: asg.raw.gsAssignmentId
            });
            notify({ 
              type: "FAILED", 
              gsAssignmentId: asg.raw.gsAssignmentId, 
              error: "too_short",
              timestamp: new Date().toISOString()
            });
          } else {
            // Ingest into RAG
            const ingestion = getIngestionService();
            const chunks = await ingestion.ingestDocument({
              courseId: courseId,
              title: asg.title,
              content: extractedText,
              kind: art.kind === "pdf" ? "gradescope-pdf" : "rendered-pdf",
              sourcePlatform: "gradescope",
              metadata: {
                assignmentId: asg.id,
                gsCourseId: gsCourseId,
                gsAssignmentId: asg.raw.gsAssignmentId,
                platform: 'gradescope',
                storageKey: storageKey,
                docHash: docHash
              }
            });
            
            const latestVersion = await latestVersionFirestore(firestore, asg.id);
            await upsertStatusFirestore(firestore, asg.id, {
              status: "INDEXED",
              latest_version: latestVersion,
              doc_hash: docHash,
              gsCourseId,
              gsAssignmentId: asg.raw.gsAssignmentId
            });
            
            indexed++;
            notify({ 
              type: "INDEX_SUCCESS", 
              gsAssignmentId: asg.raw.gsAssignmentId, 
              chunks: chunks?.length || 0,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        failed++;
        await upsertStatusFirestore(firestore, asg.id, { 
          status: "FAILED", 
          reason: "error", 
          evidence: String(error?.message || error),
          gsCourseId,
          gsAssignmentId: asg.raw.gsAssignmentId
        });
        notify({ 
          type: "FAILED", 
          gsAssignmentId: asg.raw.gsAssignmentId, 
          error: String(error?.message || error),
          timestamp: new Date().toISOString()
        });
      } finally {
        done++;
        notify({ 
          type: "PROGRESS", 
          done, 
          total,
          timestamp: new Date().toISOString()
        });
      }
    }

    notify({ 
      type: "DONE", 
      indexed, 
      locked, 
      failed,
      timestamp: new Date().toISOString()
    });
    
    // Mark job as completed
    if (jobs.has(jobId)) {
      jobs.get(jobId).status = 'completed';
    }

  } catch (error) {
    notify({ 
      type: "ERROR", 
      error: error.message,
      timestamp: new Date().toISOString()
    });
    if (jobs.has(jobId)) {
      jobs.get(jobId).status = 'failed';
    }
  } finally {
    await db.end();
  }
}

async function upsertStatusFirestore(firestore, assignmentId, statusData) {
  const statusRef = firestore.collection('assignment_index_status').doc(assignmentId);
  
  const statusDoc = {
    assignmentId: assignmentId,
    status: statusData.status,
    reason: statusData.reason,
    evidence: statusData.evidence,
    lastCheckedAt: statusData.lastCheckedAt || new Date(),
    gsCourseId: statusData.gsCourseId,
    gsAssignmentId: statusData.gsAssignmentId,
    latestVersion: statusData.latest_version,
    docHash: statusData.doc_hash,
    updatedAt: new Date()
  };

  await statusRef.set(statusDoc, { merge: true });
}

async function nextVersionFirestore(firestore, assignmentId) {
  const assignmentFilesRef = firestore.collection('assignment_files');
  const query = await assignmentFilesRef
    .where('assignmentId', '==', assignmentId)
    .orderBy('version', 'desc')
    .limit(1)
    .get();
  
  if (query.empty) {
    return 1;
  }
  
  const latestDoc = query.docs[0];
  return (latestDoc.data().version || 0) + 1;
}

async function latestVersionFirestore(firestore, assignmentId) {
  const assignmentFilesRef = firestore.collection('assignment_files');
  const query = await assignmentFilesRef
    .where('assignmentId', '==', assignmentId)
    .orderBy('version', 'desc')
    .limit(1)
    .get();
  
  if (query.empty) {
    return 0;
  }
  
  const latestDoc = query.docs[0];
  return latestDoc.data().version || 0;
}

// Job management functions
function createJob(userId, courseId) {
  const jobId = crypto.randomUUID();
  jobs.set(jobId, {
    id: jobId,
    userId,
    courseId,
    status: 'running',
    events: [],
    createdAt: new Date(),
    lastEvent: null
  });
  return jobId;
}

function getJob(jobId) {
  return jobs.get(jobId);
}

function getAllJobs() {
  return Array.from(jobs.values());
}

module.exports = {
  importGradescopeCourse,
  createJob,
  getJob,
  getAllJobs
};
