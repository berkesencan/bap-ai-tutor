import React, { useState } from 'react';
import { FaCloudUploadAlt, FaSpinner, FaCheckCircle, FaExclamationCircle, FaFile, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint } from 'react-icons/fa';
import apiClient from '../services/api';

const CourseFileUploader = ({ courseId, onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState(null);

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FaFilePdf className="text-red-500" />;
      case 'doc':
      case 'docx':
        return <FaFileWord className="text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FaFileExcel className="text-green-500" />;
      case 'ppt':
      case 'pptx':
        return <FaFilePowerpoint className="text-orange-500" />;
      default:
        return <FaFile className="text-gray-500" />;
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    // Reset states
    setError(null);
    setUploadProgress({});
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('courseId', courseId);
    
    try {
      const response = await apiClient.post('/courses/materials/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress({
            percent: percentCompleted,
            loaded: progressEvent.loaded,
            total: progressEvent.total
          });
        }
      });
      
      if (response.data.success) {
        // Clear files after successful upload
        setFiles([]);
        // Notify parent component
        if (onUploadSuccess) {
          onUploadSuccess(response.data.data.materials);
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center">
        <FaCloudUploadAlt className="mr-2 text-blue-600" /> Upload Course Materials
      </h3>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <label 
          htmlFor="file-upload" 
          className="cursor-pointer flex flex-col items-center justify-center"
        >
          <FaCloudUploadAlt className="text-4xl text-blue-500 mb-2" />
          <p className="text-sm text-gray-600 mb-1">
            Drag and drop files here, or click to select
          </p>
          <p className="text-xs text-gray-500">
            Supports PDF, Word, Excel, PowerPoint, and text files
          </p>
        </label>
      </div>
      
      {files.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Selected Files ({files.length})</p>
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file, index) => (
              <li key={index} className="text-sm flex items-center bg-gray-50 p-2 rounded">
                {getFileIcon(file.name)}
                <span className="ml-2 truncate">{file.name}</span>
                <span className="ml-auto text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </li>
            ))}
          </ul>
          
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="mt-4 bg-blue-600 text-white rounded-md px-4 py-2 font-medium hover:bg-blue-700 transition-colors w-full flex items-center justify-center disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Uploading...
                {uploadProgress.percent && `(${uploadProgress.percent}%)`}
              </>
            ) : (
              <>
                <FaCloudUploadAlt className="mr-2" />
                Upload Files
              </>
            )}
          </button>
        </div>
      )}
      
      {error && (
        <div className="mt-4 bg-red-100 text-red-700 p-3 rounded-lg text-sm flex items-start">
          <FaExclamationCircle className="mt-1 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {uploadProgress.percent === 100 && !isUploading && !error && (
        <div className="mt-4 bg-green-100 text-green-700 p-3 rounded-lg text-sm flex items-center">
          <FaCheckCircle className="mr-2" />
          <span>Files uploaded successfully!</span>
        </div>
      )}
    </div>
  );
};

export default CourseFileUploader; 