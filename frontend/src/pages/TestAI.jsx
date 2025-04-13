import React, { useState } from 'react';
import { testGemini } from '../services/api';
import { Navbar } from '../components/Navbar';

const TestAI = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResponse('');
    
    try {
      const result = await testGemini(prompt);
      
      if (result.success) {
        setResponse(result.data.response);
      } else {
        setError(result.message || 'An error occurred while processing your request');
      }
    } catch (error) {
      console.error('Error testing Gemini:', error);
      setError('Failed to get a response from the AI service');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8 text-blue-600">Test Gemini 1.5 Flash API</h1>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your prompt:
                </label>
                <textarea
                  id="prompt"
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a prompt for Gemini 1.5 Flash..."
                ></textarea>
              </div>
              
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-6 py-2 rounded-md text-white font-medium ${
                    isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isLoading ? 'Getting response...' : 'Send to Gemini'}
                </button>
              </div>
            </form>
          </div>
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8 rounded">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}
          
          {response && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-700">Gemini Response:</h2>
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <pre className="whitespace-pre-wrap">{response}</pre>
              </div>
            </div>
          )}
          
          <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-medium text-blue-800 mb-2">About this page</h3>
            <p className="text-blue-700">
              This is a test page for the Gemini 1.5 Flash API integration. It allows you to send prompts directly to the API without needing authentication.
              Use this to test different prompts and see how Gemini responds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestAI; 