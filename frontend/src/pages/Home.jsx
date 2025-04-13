import React from 'react';
import { Link } from 'react-router-dom';
import { FaRobot, FaChalkboardTeacher, FaCalendarAlt, FaChartLine, FaRocket } from 'react-icons/fa';

function Home() {
  return (
    <div className="home">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-800 text-white py-20">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 md:pr-10">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                Your Personal AI Study Assistant
              </h1>
              <h2 className="text-xl md:text-2xl font-medium text-blue-100 mb-6">
                Boost your academic performance with personalized AI tutoring
              </h2>
              <p className="text-lg mb-8 text-blue-50">
                Track assignments, prepare for exams, and get personalized AI tutoring
                all in one platform. Never miss a deadline again!
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login" className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-lg shadow-lg transition-all transform hover:-translate-y-1 text-center">
                  Get Started
                </Link>
                <Link to="/signup" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-blue-600 font-bold py-3 px-8 rounded-lg transition-all transform hover:-translate-y-1 text-center">
                  Sign Up Free
                </Link>
              </div>
            </div>
            <div className="md:w-1/2 mt-10 md:mt-0">
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden transform rotate-2 hover:rotate-0 transition-all duration-300">
                <img 
                  src="https://images.unsplash.com/photo-1501504905252-473c47e087f8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80" 
                  alt="Student studying with AI assistant" 
                  className="w-full h-auto" 
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6 max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            Supercharge Your Learning Experience
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-8 transform transition-all hover:-translate-y-2 hover:shadow-xl">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <FaRobot className="text-blue-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">AI Tutoring</h3>
              <p className="text-gray-600">
                Get personalized help from our AI tutor that understands your course materials and learning style.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-8 transform transition-all hover:-translate-y-2 hover:shadow-xl">
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <FaCalendarAlt className="text-green-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">Smart Scheduling</h3>
              <p className="text-gray-600">
                Organize your study time effectively with AI-powered scheduling that adapts to your preferences.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-8 transform transition-all hover:-translate-y-2 hover:shadow-xl">
              <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <FaChalkboardTeacher className="text-purple-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">Course Management</h3>
              <p className="text-gray-600">
                Upload and organize course materials, track assignments, and prepare for exams all in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            How BAP AI Tutor Works
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">1</div>
              <h3 className="font-bold text-lg mb-2">Sign Up</h3>
              <p className="text-gray-600">Create your account in seconds with Google</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">2</div>
              <h3 className="font-bold text-lg mb-2">Add Courses</h3>
              <p className="text-gray-600">Upload your course materials and assignments</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">3</div>
              <h3 className="font-bold text-lg mb-2">Get Tutoring</h3>
              <p className="text-gray-600">Ask questions and get instant AI tutoring help</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">4</div>
              <h3 className="font-bold text-lg mb-2">Ace Your Classes</h3>
              <p className="text-gray-600">Improve grades with personalized learning</p>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <Link to="/signup" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow inline-flex items-center transition-all transform hover:-translate-y-1">
              <FaRocket className="mr-2" /> Get Started Now
            </Link>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            What Our Users Say
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-8 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="h-2 w-2 bg-blue-400 rounded-full mr-1"></div>
                <div className="h-2 w-2 bg-blue-500 rounded-full mr-1"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
              </div>
              <p className="text-gray-300 mb-6">
                "BAP AI Tutor has been a game-changer for my studies. The AI explains concepts in ways that make sense to me, and I've improved my grades significantly this semester."
              </p>
              <h4 className="font-bold">Sarah J.</h4>
              <p className="text-sm text-gray-400">Computer Science Student</p>
            </div>
            
            <div className="bg-gray-800 p-8 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="h-2 w-2 bg-blue-400 rounded-full mr-1"></div>
                <div className="h-2 w-2 bg-blue-500 rounded-full mr-1"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
              </div>
              <p className="text-gray-300 mb-6">
                "As a teaching assistant, I recommend BAP AI Tutor to all my students. It helps them get immediate answers while I focus on more complex problems during office hours."
              </p>
              <h4 className="font-bold">Prof. Michael T.</h4>
              <p className="text-sm text-gray-400">Mathematics Department</p>
            </div>
            
            <div className="bg-gray-800 p-8 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="h-2 w-2 bg-blue-400 rounded-full mr-1"></div>
                <div className="h-2 w-2 bg-blue-500 rounded-full mr-1"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
              </div>
              <p className="text-gray-300 mb-6">
                "I love how I can upload my course materials and get a personalized study plan. The practice questions generated by the AI have been super helpful for exam prep."
              </p>
              <h4 className="font-bold">Alex W.</h4>
              <p className="text-sm text-gray-400">Engineering Student</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Transform Your Learning?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of students who are already using BAP AI Tutor to improve their grades and make studying more efficient.
          </p>
          <Link to="/signup" className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-10 rounded-lg shadow-lg inline-block text-lg">
            Start Free Today
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home; 