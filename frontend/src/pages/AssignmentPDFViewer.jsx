import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getGradescopeAssignmentPDF } from '../services/api';

function AssignmentPDFViewer() {
  const { courseId, assignmentId } = useParams();
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPDF = async () => {
      setLoading(true);
      setError(null);
      try {
        const blob = await getGradescopeAssignmentPDF(courseId, assignmentId);
        if (blob instanceof Blob) {
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        } else {
          setError(blob.message || 'Failed to load PDF.');
        }
      } catch (err) {
        setError('Failed to load PDF.');
      } finally {
        setLoading(false);
      }
    };
    fetchPDF();
    // Cleanup URL object on unmount
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
    // eslint-disable-next-line
  }, [courseId, assignmentId]);

  return (
    <div className="pdf-viewer-page" style={{ padding: '2rem' }}>
      <h1 className="text-2xl font-bold mb-4">Assignment PDF</h1>
      {loading && <div>Loading PDF...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {pdfUrl && !loading && !error && (
        <iframe
          src={pdfUrl}
          title="Assignment PDF"
          width="100%"
          height="800px"
          style={{ border: '1px solid #ccc', borderRadius: '8px' }}
        />
      )}
    </div>
  );
}

export default AssignmentPDFViewer; 