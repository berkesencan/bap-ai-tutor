import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Globe, Microscope, Cpu, Palette, Calculator, Dna, Zap, Clock, Star, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const TopicSelector = ({ isOpen, onClose, onTopicSelect, gameMode = 'neural_conquest' }) => {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoveredTopic, setHoveredTopic] = useState(null);

  // Topic icons mapping
  const topicIcons = {
    'Geography': Globe,
    'History': Clock,
    'Science': Microscope,
    'Technology': Cpu,
    'Arts': Palette,
    'Mathematics': Calculator,
    'Biology': Dna,
    'Physics': Zap
  };

  // Load available topics
  useEffect(() => {
    if (isOpen) {
      loadTopics();
    }
  }, [isOpen]);

  const loadTopics = async () => {
    try {
      setLoading(true);
      const response = await api.getNeuralConquestTopics();
      
      if (response.data.success) {
        setTopics(response.data.topics || []);
      } else {
        throw new Error(response.data.error || 'Failed to load topics');
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      toast.error('Failed to load topics. Using default topics.');
      
      // Fallback topics
      setTopics([
        {
          name: 'Geography',
          difficulty: 2,
          color: '#4ade80',
          concepts: ['mountains', 'rivers', 'countries', 'capitals'],
          synapseMultiplier: 1.2,
          estimatedObjects: 6,
          estimatedPlayTime: '15-25 minutes'
        },
        {
          name: 'Science',
          difficulty: 4,
          color: '#06b6d4',
          concepts: ['atoms', 'molecules', 'experiments', 'theories'],
          synapseMultiplier: 1.8,
          estimatedObjects: 8,
          estimatedPlayTime: '20-30 minutes'
        },
        {
          name: 'Mathematics',
          difficulty: 5,
          color: '#ef4444',
          concepts: ['geometry', 'algebra', 'calculus', 'statistics'],
          synapseMultiplier: 2.0,
          estimatedObjects: 7,
          estimatedPlayTime: '25-35 minutes'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
  };

  const handleConfirm = () => {
    if (selectedTopic) {
      onTopicSelect(selectedTopic);
      onClose();
    } else {
      toast.error('Please select a topic first');
    }
  };

  const getDifficultyColor = (difficulty) => {
    if (difficulty <= 2) return '#22c55e'; // Green
    if (difficulty <= 3) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  const getDifficultyText = (difficulty) => {
    if (difficulty <= 2) return 'Beginner';
    if (difficulty <= 3) return 'Intermediate';
    return 'Advanced';
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-emerald-500/20 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(16, 185, 129, 0.1)'
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <Brain className="w-8 h-8 text-emerald-400" />
            <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Choose Your Learning Domain
            </h2>
          </motion.div>
          <p className="text-slate-300 text-lg">
            Select a topic to generate a custom 3D world with context-specific territories and challenges
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            <p className="text-slate-300 mt-4">Loading available topics...</p>
          </div>
        )}

        {/* Topics Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <AnimatePresence>
              {topics.map((topic, index) => {
                const IconComponent = topicIcons[topic.name] || Brain;
                const isSelected = selectedTopic?.name === topic.name;
                const isHovered = hoveredTopic === topic.name;

                return (
                  <motion.div
                    key={topic.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative p-6 rounded-xl cursor-pointer transition-all duration-300 ${
                      isSelected 
                        ? 'ring-2 ring-emerald-400 bg-gradient-to-br from-emerald-900/30 to-emerald-800/20' 
                        : 'bg-gradient-to-br from-slate-800/50 to-slate-700/30 hover:bg-gradient-to-br hover:from-slate-700/60 hover:to-slate-600/40'
                    }`}
                    style={{
                      borderColor: isSelected ? topic.color : 'transparent',
                      boxShadow: isSelected 
                        ? `0 0 30px ${topic.color}20, 0 0 0 1px ${topic.color}40`
                        : isHovered 
                        ? `0 0 20px ${topic.color}15, 0 0 0 1px ${topic.color}30`
                        : 'none'
                    }}
                    onClick={() => handleTopicSelect(topic)}
                    onMouseEnter={() => setHoveredTopic(topic.name)}
                    onMouseLeave={() => setHoveredTopic(null)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Topic Icon & Name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `${topic.color}20` }}
                      >
                        <IconComponent 
                          className="w-6 h-6" 
                          style={{ color: topic.color }}
                        />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{topic.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span 
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: `${getDifficultyColor(topic.difficulty)}20`,
                              color: getDifficultyColor(topic.difficulty)
                            }}
                          >
                            {getDifficultyText(topic.difficulty)}
                          </span>
                          <span className="text-slate-400 text-sm">
                            {topic.difficulty}/5
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Topic Stats */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">3D Objects:</span>
                        <span className="text-white font-medium">{topic.estimatedObjects || topic.concepts?.length || 6}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">Play Time:</span>
                        <span className="text-white font-medium">{topic.estimatedPlayTime}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">Synapse Bonus:</span>
                        <span 
                          className="font-medium"
                          style={{ color: topic.color }}
                        >
                          {Math.round((topic.synapseMultiplier - 1) * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Concepts Preview */}
                    <div className="mt-4 pt-4 border-t border-slate-600/30">
                      <p className="text-slate-400 text-xs mb-2">Key Concepts:</p>
                      <div className="flex flex-wrap gap-1">
                        {(topic.concepts || []).slice(0, 3).map((concept, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded"
                          >
                            {concept}
                          </span>
                        ))}
                        {topic.concepts && topic.concepts.length > 3 && (
                          <span className="px-2 py-1 text-slate-400 text-xs">
                            +{topic.concepts.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: topic.color }}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          ✓
                        </motion.div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Selected Topic Preview */}
        {selectedTopic && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-6 rounded-xl bg-gradient-to-r from-emerald-900/20 to-cyan-900/20 border border-emerald-500/20"
          >
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Selected Topic</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-300">Topic:</span>
                <p className="text-white font-medium">{selectedTopic.name}</p>
              </div>
              <div>
                <span className="text-slate-300">Difficulty:</span>
                <p className="text-white font-medium">{getDifficultyText(selectedTopic.difficulty)}</p>
              </div>
              <div>
                <span className="text-slate-300">Expected Duration:</span>
                <p className="text-white font-medium">{selectedTopic.estimatedPlayTime}</p>
              </div>
            </div>
            
            <p className="text-slate-300 mt-3 text-sm">
              This will generate a custom 3D world with {selectedTopic.estimatedObjects || selectedTopic.concepts?.length || 6} unique territories, 
              each representing key concepts in {selectedTopic.name}. Answer questions correctly to unlock movement and earn enhanced Synapse rewards!
            </p>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <motion.button
            onClick={onClose}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
          
          <motion.button
            onClick={handleConfirm}
            disabled={!selectedTopic}
            className={`px-8 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              selectedTopic
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }`}
            whileHover={selectedTopic ? { scale: 1.02 } : {}}
            whileTap={selectedTopic ? { scale: 0.98 } : {}}
          >
            Start Neural Conquest
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TopicSelector; 