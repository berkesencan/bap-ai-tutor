import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const NotFound = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is not authenticated, redirect to root page (/) instead of showing 404
    // This gives them the choice between login and signup
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // If user is not authenticated, don't render anything (they'll be redirected)
  if (!currentUser) {
    return null;
  }

  // Only authenticated users see the 404 page
  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">404 - Page Not Found</h1>
      <p>Sorry, the page you are looking for does not exist.</p>
    </div>
  );
}; 