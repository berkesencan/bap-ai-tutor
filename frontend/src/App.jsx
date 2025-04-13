import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

// Layouts
import MainLayout from './layouts/MainLayout';

// Pages
import Home from './pages/Home';
import { Login } from './pages/Login';
import Signup from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import Courses from './pages/Courses';
import Assignments from './pages/Assignments';
import AiTutorPage from './pages/AiTutorPage';
import Settings from './pages/Settings';
import Connect from './pages/Connect';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            {/* Public routes */}
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            
            {/* Protected routes */}
            <Route path="dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="courses" element={
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            } />
            <Route path="assignments" element={
              <ProtectedRoute>
                <Assignments />
              </ProtectedRoute>
            } />
            <Route path="ai-tutor" element={
              <ProtectedRoute>
                <AiTutorPage />
              </ProtectedRoute>
            } />
            <Route path="connect" element={
              <ProtectedRoute>
                <Connect />
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            
            {/* Fallback route */}
            <Route path="*" element={
              <div className="container mx-auto p-8 text-center">
                <h1 className="text-3xl font-bold mb-4">404 - Page Not Found</h1>
                <p>Sorry, the page you are looking for does not exist.</p>
              </div>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
