import { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get the ID token
          const token = await user.getIdToken();
          // Set the token in axios defaults
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Call backend to ensure user exists in Firestore
          try {
            await axios.post('/api/auth/login', { idToken: token });
          } catch (error) {
            console.error('Error creating/updating user in Firestore:', error);
          }
          
          setCurrentUser(user);
        } catch (error) {
          console.error('Error getting ID token:', error);
          setCurrentUser(user); // Still set the user even if backend call fails
        }
      } else {
        delete axios.defaults.headers.common['Authorization'];
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Call backend to create/update user in Firestore
      try {
        await axios.post('/api/auth/login', { idToken: token });
      } catch (error) {
        console.error('Error creating/updating user in Firestore:', error);
      }
      
      return result;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      delete axios.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    signInWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 