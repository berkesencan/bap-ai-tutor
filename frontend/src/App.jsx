import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { GradescopeProvider } from './contexts/GradescopeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotFound } from './components/NotFound';
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
import Connect from './pages/Connect';
import AssignmentPDFViewer from './pages/AssignmentPDFViewer';

function App() {
  return (
    <Router>
      <AuthProvider>
        <GradescopeProvider>
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
              <Route path="assignments/pdf/:courseId/:assignmentId" element={
                <ProtectedRoute>
                  <AssignmentPDFViewer />
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
              
              {/* Fallback route with authentication check */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </GradescopeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
