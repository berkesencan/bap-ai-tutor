import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Navbar } from './components/Navbar';
import './App.css';

// Pages
import Home from './pages/Home';
import Signup from './pages/Signup';
import Courses from './pages/Courses';
import Assignments from './pages/Assignments';
import AiTutorPage from './pages/AiTutorPage';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-100">
          <Navbar />
          <main className="pt-4 pb-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/courses" element={
                <ProtectedRoute>
                  <Courses />
                </ProtectedRoute>
              } />
              <Route path="/assignments" element={
                <ProtectedRoute>
                  <Assignments />
                </ProtectedRoute>
              } />
              <Route path="/ai-tutor" element={
                <ProtectedRoute>
                  <AiTutorPage />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="*" element={<div className="container mx-auto p-8 text-center">
                <h1 className="text-3xl font-bold mb-4">404 - Page Not Found</h1>
                <p>Sorry, the page you are looking for does not exist.</p>
              </div>} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
