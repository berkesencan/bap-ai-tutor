import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useLoader, extend, useThree } from '@react-three/fiber';
import { 
  FirstPersonControls,
  PointerLockControls,
  Text, 
  Html, 
  Stars,
  Environment,
  PerspectiveCamera,
  Loader,
  Sphere,
  Box,
  Octahedron,
  Tetrahedron,
  Icosahedron,
  Torus,
  Trail
} from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { 
  Brain, 
  Globe, 
  Zap, 
  Trophy, 
  Copy, 
  Play, 
  Users, 
  Clock, 
  Target,
  Settings,
  Shield,
  Crown,
  Navigation,
  Crosshair,
  Rocket
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { 
  startNeuralConquestGame, 
  joinNeuralConquestGame, 
  getNeuralConquestSession, 
  saveNeuralConquestGameState,
  getNeuralConquestContent,
  api,
  neuralConquestAPI
} from '../services/api';
import './NeuralConquest.css';
import TopicSelector from '../components/TopicSelector';

// Extend Three.js for custom materials
extend({
  sphereGeometry: THREE.SphereGeometry,
  meshStandardMaterial: THREE.MeshStandardMaterial,
});

// Neural Node Loader - Shap-E Generated 3D Models  
// 🧠 SCIENTIFIC NEURON COMPONENTS - Based on Real Neuroscience

// Knowledge Object with Neural Cloud - Shap-E Model + Surrounding Neurons
const KnowledgeObject = ({ 
  territory, 
  onClick, 
  isSelected, 
  playerPosition, 
  gamePhase,
  masteryLevel = 0, // 0-1 representing mastery of this topic
  isActivelyLearning = false 
}) => {
  const [shapEModel, setShapEModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const objectRef = useRef();
  const [hovered, setHovered] = useState(false);

  const isOwned = !!territory.owner;
  const isSelectable = gamePhase === 'PLAYER_TURN' && !isOwned;
  
  // Neural activity and colors based on ownership and mastery
  const neuronColor = isOwned === 'human' ? '#00ff88' : isOwned === 'ai' ? '#ff4444' : '#4A90E2';
  const activityLevel = masteryLevel + (isActivelyLearning ? 0.3 : 0);

    // Load the actual Shap-E 3D model
  useEffect(() => {
    const loadShapEModel = async () => {
      // Check if we have a modelUrl
      const modelUrl = territory.modelUrl || territory.model?.url;
      
      if (!modelUrl) {
        console.warn(`❌ No model URL for territory: ${territory.name}`, territory);
        setError('No model URL provided');
        setLoading(false);
        return;
      }

      try {
        console.log(`🧠 Loading Shap-E model for ${territory.name}:`, modelUrl);

        // Import PLY loader
        const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader');
        
        // Try OBJ first
        const objLoader = new OBJLoader();
        let model = null;
        let loadMethod = 'OBJ';
        
        try {
          model = await new Promise((resolve, reject) => {
            objLoader.load(
              modelUrl,
            resolve,
            (progress) => {
                const percent = progress.total ? ((progress.loaded / progress.total) * 100).toFixed(1) : '...';
                console.log(`📦 Loading ${territory.name} (OBJ): ${percent}%`);
            },
            reject
          );
        });

          console.log(`✅ OBJ loaded successfully for ${territory.name}`);
          
        } catch (objError) {
          console.warn(`🔄 OBJ failed for ${territory.name}, trying PLY fallback...`, objError.message);
          
          // Try PLY fallback
          const plyUrl = modelUrl.replace('.obj', '.ply');
          
          try {
            const plyLoader = new PLYLoader();
            
            // Load PLY geometry
            const geometry = await new Promise((resolve, reject) => {
              plyLoader.load(
                plyUrl,
                resolve,
                (progress) => {
                  const percent = progress.total ? ((progress.loaded / progress.total) * 100).toFixed(1) : '...';
                  console.log(`📦 Loading ${territory.name} (PLY): ${percent}%`);
                },
                reject
              );
            });
            
            // Create mesh from PLY geometry
            model = new THREE.Group();
            const mesh = new THREE.Mesh(geometry);
            model.add(mesh);
            loadMethod = 'PLY';
            
            console.log(`✅ PLY loaded successfully for ${territory.name}`);
            
          } catch (plyError) {
            console.warn(`🔶 Both OBJ and PLY failed for ${territory.name}, creating geometric fallback...`);
            
            // Create geometric fallback based on concept
            model = new THREE.Group();
            let geometry;
            
            const concept = (territory.concept || '').toLowerCase();
            if (concept.includes('biology') || concept.includes('life')) {
              geometry = new THREE.IcosahedronGeometry(0.8, 1); // Organic shape
            } else if (concept.includes('technology') || concept.includes('engineering')) {
              geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2); // Tech-like cube
            } else if (concept.includes('space') || concept.includes('astronomy')) {
              geometry = new THREE.OctahedronGeometry(0.9); // Crystal-like space object
            } else if (concept.includes('history') || concept.includes('culture')) {
              geometry = new THREE.ConeGeometry(0.8, 1.5, 8); // Pyramid-like historical
            } else {
              geometry = new THREE.SphereGeometry(0.8, 16, 16); // Default sphere
            }
            
            const mesh = new THREE.Mesh(geometry);
            model.add(mesh);
            loadMethod = 'Geometric';
            
            console.log(`✅ Created geometric fallback (${geometry.constructor.name}) for ${territory.name}`);
          }
        }

        // Apply enhanced materials to the loaded model for maximum visibility
        model.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: territory.color || '#4A90E2',
              emissive: territory.color || '#4A90E2',
              emissiveIntensity: 0.3, // Add glow to Shap-E models
              metalness: 0.4,
              roughness: 0.3,
              transparent: true,
              opacity: 0.95 // More opaque
            });
            
            // Enable shadows
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        console.log(`✅ Successfully loaded Shap-E model: ${territory.name} via ${loadMethod}!`);
        setShapEModel(model);
        setError(null);
        
      } catch (loadError) {
        console.error(`❌ Failed to load Shap-E model for ${territory.name}:`, loadError);
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadShapEModel();
  }, [territory.modelUrl, territory.model?.url, territory.name, territory.color]);

  // Create realistic dendrite branches
  const createDendrite = (index, total, color, activity) => {
    const dendriteGroup = new THREE.Group();
    
    // Main dendrite branch
    const angle = (index / total) * Math.PI * 2;
    const radius = 1.2 + Math.random() * 0.8;
    const height = 1.5 + Math.random() * 1.0;
    
    // Create main dendrite shaft
    const mainShaft = createNeuralProcess(
      { x: 0, y: 0, z: 0 },
      { 
        x: Math.cos(angle) * radius, 
        y: Math.sin(angle) * radius * 0.5, 
        z: Math.sin(angle) * height 
      },
      0.08, 0.04, color, activity * 0.6
    );
    dendriteGroup.add(mainShaft);
    
    // Create dendrite sub-branches (2-4 per main branch)
    const subBranches = 2 + Math.floor(Math.random() * 3);
    for (let j = 0; j < subBranches; j++) {
      const branchPoint = 0.3 + (j / subBranches) * 0.6;
      const subBranch = createNeuralProcess(
        {
          x: Math.cos(angle) * radius * branchPoint,
          y: Math.sin(angle) * radius * 0.5 * branchPoint,
          z: Math.sin(angle) * height * branchPoint
        },
        {
          x: Math.cos(angle + (Math.random() - 0.5)) * radius * (1 + Math.random() * 0.5),
          y: Math.sin(angle + (Math.random() - 0.5)) * radius * 0.5 * (1 + Math.random() * 0.3),
          z: Math.sin(angle) * height * (1 + Math.random() * 0.3)
        },
        0.05, 0.02, color, activity * 0.4
      );
      dendriteGroup.add(subBranch);
    }
    
    return dendriteGroup;
  };

  // Create realistic axon
  const createAxon = (color, activity) => {
    const axonGroup = new THREE.Group();
    
    // Main axon shaft - longer projection
    const axonLength = 3 + Math.random() * 2;
    const axonDirection = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      -0.8 - Math.random() * 0.4, // Generally projects downward
      (Math.random() - 0.5) * 0.5
    ).normalize().multiplyScalar(axonLength);
    
    const axonShaft = createNeuralProcess(
      { x: 0, y: -0.8, z: 0 }, // Start below soma
      axonDirection,
      0.12, 0.08, color, activity * 0.8
    );
    axonGroup.add(axonShaft);
    
    return axonGroup;
  };

  // Create axon terminals (synaptic endpoints)
  const createAxonTerminal = (index, total, color, activity) => {
    const terminalGroup = new THREE.Group();
    
    // Position terminals at the end of axon projections
    const angle = (index / total) * Math.PI * 2 + Math.PI; // Opposite side from dendrites
    const distance = 3.5 + Math.random() * 1.5;
    
    const terminalPos = {
      x: Math.cos(angle) * distance * 0.3,
      y: -2 - Math.random() * 1,
      z: Math.sin(angle) * distance * 0.3
    };
    
    // Synaptic bouton (terminal swelling)
    const boutonGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const boutonMaterial = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.4 + (activity * 0.3),
      transparent: true,
      opacity: 0.8
    });
    const bouton = new THREE.Mesh(boutonGeometry, boutonMaterial);
    bouton.position.set(terminalPos.x, terminalPos.y, terminalPos.z);
    terminalGroup.add(bouton);
    
    return terminalGroup;
  };

  // Create neural processes (dendrites/axons) as curved tubes
  const createNeuralProcess = (start, end, startRadius, endRadius, color, activity) => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(start.x, start.y, start.z),
      new THREE.Vector3(
        (start.x + end.x) / 2 + (Math.random() - 0.5) * 0.5,
        (start.y + end.y) / 2 + (Math.random() - 0.5) * 0.5,
        (start.z + end.z) / 2 + (Math.random() - 0.5) * 0.5
      ),
      new THREE.Vector3(end.x, end.y, end.z)
    );
    
    const geometry = new THREE.TubeGeometry(curve, 12, startRadius, 6, false);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.2 + (activity * 0.3),
      transparent: true,
      opacity: 0.7,
      roughness: 0.4
    });
    
    return new THREE.Mesh(geometry, material);
  };

  // Knowledge objects are now STABLE - no more floating!
  // Only gentle rotation and selection effects remain
  useFrame((state) => {
    if (objectRef.current && shapEModel) {
      const time = state.clock.elapsedTime;
      
      // Very gentle rotation only
      objectRef.current.rotation.y += 0.005;
      
      // Scale based on selection
      if (isSelected) {
        const pulse = 1 + Math.sin(time * 4) * 0.05; // Much subtler
        objectRef.current.scale.setScalar(pulse);
      }
    }
  });

  // Handle click interaction
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (isSelectable || !isOwned) {
      onClick(territory);
    }
  }, [isSelectable, isOwned, territory, onClick]);

  if (loading) {
    return (
      <group position={territory.position}>
        <Sphere args={[0.8, 16, 16]} onClick={handleClick}>
          <meshStandardMaterial 
            color="#FFD700" 
            emissive="#FF6B35" 
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </Sphere>
        {/* Loading neurons appear dim */}
        <NeuronCloud 
          position={[0, 0, 0]}
          masteryLevel={0.1}
          neuronColor="#FFD700"
          isActive={false}
          owner={null}
        />
        <Html center distanceFactor={10}>
          <div className="text-white text-xs bg-black/70 px-3 py-2 rounded-lg backdrop-blur-sm">
            🧠 Loading knowledge area...
          </div>
        </Html>
      </group>
    );
  }

  if (error || !shapEModel) {
  return (
      <group position={territory.position}>
        <Octahedron args={[1]} onClick={handleClick}>
        <meshStandardMaterial 
          color="#FF4444" 
          emissive="#FF0000" 
          emissiveIntensity={0.4}
          transparent
          opacity={0.8}
        />
      </Octahedron>
        {/* Error state shows minimal neurons */}
        <NeuronCloud 
          position={[0, 0, 0]}
          masteryLevel={0.05}
          neuronColor="#FF4444"
          isActive={false}
          owner={null}
        />
        <Html center distanceFactor={10}>
          <div className="text-red-400 text-xs bg-red-900/80 px-3 py-2 rounded-lg">
            ⚠️ {territory.name}<br/>
            <span className="text-xs opacity-75">Knowledge area failed to load</span>
        </div>
      </Html>
    </group>
  );
  }
  
  return (
    <group
      position={territory.position}
      onClick={handleClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Main Shap-E Knowledge Object */}
      {shapEModel && (
        <mesh ref={objectRef} castShadow receiveShadow>
          <primitive object={shapEModel} scale={[1, 1, 1]} />
      </mesh>
      )}
      
      {/* Neural Cloud surrounding the knowledge object */}
      <NeuronCloud 
        position={[0, 0, 0]}
        masteryLevel={masteryLevel}
        neuronColor={neuronColor}
        isActive={isActivelyLearning}
        owner={territory.owner}
        territory={territory}
      />
      
      {/* Selection glow effect */}
      {isSelected && (
        <Sphere args={[4, 16, 16]}>
          <meshStandardMaterial 
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.3}
            transparent
            opacity={0.1}
          />
        </Sphere>
      )}
      
      {/* Knowledge Object Information Label */}
      <Html
        position={[0, 3, 0]}
        center
        className="pointer-events-none"
      >
        <div 
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
            hovered || isSelected 
              ? 'bg-white/95 text-black scale-110 shadow-lg' 
              : 'bg-black/80 text-white'
          }`}
          style={{
            backdropFilter: 'blur(15px)',
            border: `2px solid ${neuronColor}60`,
            boxShadow: hovered ? `0 0 20px ${neuronColor}60` : 'none'
          }}
        >
          <div className="flex items-center gap-1">
            <Brain size={12} />
            <span>{territory.name}</span>
          </div>
          {territory.cost && (
            <div className="text-xs opacity-75 mt-1">
              ⚡ {territory.cost} Synapse
            </div>
          )}
          {isOwned && (
            <div className="text-xs opacity-75">
              🧠 {isOwned === 'human' ? 'Mastered' : 'AI Mastered'}
            </div>
          )}
          <div className="text-xs opacity-75">
            📊 Mastery: {Math.round(masteryLevel * 100)}%
          </div>
        </div>
      </Html>
    </group>
  );
};

// Neural Cloud - Realistic neurons surrounding knowledge objects
const NeuronCloud = ({ position, masteryLevel, neuronColor, isActive, owner, territory }) => {
  const cloudRef = useRef();
  const neuronsRef = useRef([]);
  
  // Number of neurons based on mastery (more neurons = more learning)
  const neuronCount = Math.floor(8 + (masteryLevel * 20)); // 8-28 neurons
  const activeNeurons = Math.floor(neuronCount * masteryLevel); // How many are "lit up"
  
  // Create neurons in a spherical cloud around the knowledge object
  const neurons = useMemo(() => {
    const neurons = [];
    
    for (let i = 0; i < neuronCount; i++) {
      // Spherical distribution around the object
      const radius = 3 + Math.random() * 2; // 3-5 units from center
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      
      // Determine if this neuron is "active" based on mastery
      const isNeuronActive = i < activeNeurons;
      const activity = isNeuronActive ? 0.7 + Math.random() * 0.3 : 0.1 + Math.random() * 0.2;
      
      neurons.push({
        id: i,
        position: [x, y, z],
        activity,
        isActive: isNeuronActive,
        randomSeed: Math.random(),
        size: 0.15 + Math.random() * 0.1
      });
    }
    
    return neurons;
  }, [neuronCount, activeNeurons]);

  // Neurons are now STATIC - no more bouncing! 
  // Connections form progressively as mastery increases

  return (
    <group ref={cloudRef} position={position}>
      {neurons.map((neuron, index) => (
        <ScientificNeuron
          key={neuron.id}
          position={neuron.position}
          activity={neuron.activity}
          isActive={neuron.isActive}
          color={neuronColor}
          size={neuron.size}
          randomSeed={neuron.randomSeed}
          ref={(ref) => { neuronsRef.current[index] = ref; }}
        />
      ))}
      
      {/* Progressive Neural Connections - Form gradually with learning! */}
      <ProgressiveNeuralConnections 
        neurons={neurons}
        masteryLevel={masteryLevel}
        color={neuronColor}
        owner={owner}
        territory={territory}
      />
    </group>
  );
};

// Individual Scientific Neuron Component
const ScientificNeuron = React.forwardRef(({ 
  position, 
  activity, 
  isActive, 
  color, 
  size, 
  randomSeed 
}, ref) => {
  const neuronRef = useRef();
  const [neuronModel, setNeuronModel] = useState(null);

  useEffect(() => {
    // Create realistic neuron with soma, dendrites, and axon
    const createNeuron = () => {
      const neuronGroup = new THREE.Group();
      
      // 1. SOMA (Cell Body) - Enhanced for Maximum Visibility
      const somaGeometry = new THREE.SphereGeometry(size, 12, 12);
      const somaMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: isActive ? 0.8 : 0.4, // Much brighter
        transparent: true,
        opacity: isActive ? 1.0 : 0.6, // Much more opaque
        roughness: 0.2,
        metalness: 0.3
      });
      const soma = new THREE.Mesh(somaGeometry, somaMaterial);
      neuronGroup.add(soma);
      
      // 2. DENDRITES (3-5 branches)
      const dendriteCount = 3 + Math.floor(randomSeed * 3);
      for (let i = 0; i < dendriteCount; i++) {
        const dendrite = createDendrite(i, dendriteCount, color, activity, size);
        neuronGroup.add(dendrite);
      }
      
      // 3. AXON (single projection)
      const axon = createAxon(color, activity, size, randomSeed);
      neuronGroup.add(axon);
      
      return neuronGroup;
    };

    setNeuronModel(createNeuron());
  }, [color, activity, isActive, size, randomSeed]);

  // Helper functions for creating neuron parts
  const createDendrite = (index, total, color, activity, size) => {
    const angle = (index / total) * Math.PI * 2;
    const length = size * 2 + randomSeed * size;
    
    const startPoint = new THREE.Vector3(0, 0, 0);
    const endPoint = new THREE.Vector3(
      Math.cos(angle) * length,
      Math.sin(angle) * length * 0.5,
      Math.sin(angle * 1.5) * length * 0.8
    );
    
    // Add some randomness to make it organic
    endPoint.x += (randomSeed - 0.5) * size;
    endPoint.y += (randomSeed - 0.5) * size * 0.5;
    endPoint.z += (randomSeed - 0.5) * size;
    
    const curve = new THREE.QuadraticBezierCurve3(
      startPoint,
      startPoint.clone().lerp(endPoint, 0.5).add(
        new THREE.Vector3(
          (randomSeed - 0.5) * size * 0.5,
          (randomSeed - 0.5) * size * 0.3,
          (randomSeed - 0.5) * size * 0.5
        )
      ),
      endPoint
    );
    
    const geometry = new THREE.TubeGeometry(curve, 12, size * 0.18, 6, false);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: activity * 0.6, // Brighter dendrites
      transparent: true,
      opacity: isActive ? 0.9 : 0.5, // More visible when inactive
      roughness: 0.3,
      metalness: 0.1
    });
    
    return new THREE.Mesh(geometry, material);
  };

  const createAxon = (color, activity, size, randomSeed) => {
    const direction = new THREE.Vector3(
      (randomSeed - 0.5) * 0.3,
      -1 - randomSeed * 0.5,
      (randomSeed - 0.5) * 0.3
    ).normalize().multiplyScalar(size * 3);
    
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, -size * 0.5, 0),
      new THREE.Vector3(direction.x * 0.5, direction.y * 0.5, direction.z * 0.5),
      direction
    );
    
    const geometry = new THREE.TubeGeometry(curve, 16, size * 0.12, 6, false);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: activity * 0.7, // Brighter axons
      transparent: true,
      opacity: isActive ? 0.9 : 0.5, // More visible when inactive
      roughness: 0.2,
      metalness: 0.2
    });
    
    return new THREE.Mesh(geometry, material);
  };

  // Forward ref to parent for animation
  useEffect(() => {
    if (ref && typeof ref === 'function') {
      ref(neuronRef.current);
    } else if (ref && ref.current !== undefined) {
      ref.current = neuronRef.current;
    }
  }, [ref]);
  
  return (
    <group ref={neuronRef} position={position}>
      {neuronModel && <primitive object={neuronModel} />}
    </group>
  );
});

// Neural Connections between active neurons in a cloud
const NeuralConnections = ({ neurons, color, strength }) => {
  const connections = useMemo(() => {
    const connections = [];
    
    // Create connections between nearby active neurons
    for (let i = 0; i < neurons.length; i++) {
      for (let j = i + 1; j < neurons.length; j++) {
        const neuron1 = neurons[i];
        const neuron2 = neurons[j];
        
        // Calculate distance
        const distance = Math.sqrt(
          Math.pow(neuron1.position[0] - neuron2.position[0], 2) +
          Math.pow(neuron1.position[1] - neuron2.position[1], 2) +
          Math.pow(neuron1.position[2] - neuron2.position[2], 2)
        );
        
        // Only connect nearby neurons (within 4 units)
        if (distance < 4) {
          connections.push({
            start: neuron1.position,
            end: neuron2.position,
            strength: strength * (4 - distance) / 4, // Closer = stronger
            distance
          });
        }
      }
    }
    
    return connections;
  }, [neurons, strength]);

  return (
    <group>
      {connections.map((connection, index) => (
        <SynapticConnection
          key={index}
          connection={{
            ...connection,
            color,
            isActive: true
          }}
        />
      ))}
    </group>
  );
};

// 🧠 PROGRESSIVE NEURAL CONNECTIONS - The Key to Victory!
// Connections form gradually as you get questions right!
const ProgressiveNeuralConnections = ({ neurons, masteryLevel, color, owner, territory }) => {
  const connectionsRef = useRef();
  
  // Use appropriate mastery level based on owner
  const effectiveMasteryLevel = useMemo(() => {
    if (owner === 'ai' && territory?.aiMasteryLevel) {
      return territory.aiMasteryLevel;
    } else if (owner === 'human' && territory?.masteryLevel) {
      return territory.masteryLevel;
    }
    return masteryLevel; // Fallback to passed mastery level
  }, [owner, territory, masteryLevel]);
  
  // Calculate ALL possible connections between neurons (the full neural network)
  const allPossibleConnections = useMemo(() => {
    const connections = [];
    
    for (let i = 0; i < neurons.length; i++) {
      for (let j = i + 1; j < neurons.length; j++) {
        const neuron1 = neurons[i];
        const neuron2 = neurons[j];
        
        // Calculate distance
        const distance = Math.sqrt(
          Math.pow(neuron1.position[0] - neuron2.position[0], 2) +
          Math.pow(neuron1.position[1] - neuron2.position[1], 2) +
          Math.pow(neuron1.position[2] - neuron2.position[2], 2)
        );
        
        // Connect neurons within reasonable distance (6 units for larger network)
        if (distance < 4) { // reduced threshold
          connections.push({
            id: `${i}-${j}`,
            start: neuron1.position,
            end: neuron2.position,
            distance,
            neuron1Index: i,
            neuron2Index: j,
            strength: (6 - distance) / 6, // Closer = naturally stronger
            priority: 1 / distance // Form closer connections first
          });
        }
      }
    }
    
    // Sort by priority - closer connections form first
    return connections.sort((a, b) => b.priority - a.priority);
  }, [neurons]);

  // Determine which connections are formed based on effective mastery level
  const formedConnections = useMemo(() => {
    const totalPossible = allPossibleConnections.length;
    const rawCount = Math.floor(totalPossible * effectiveMasteryLevel);
    const connectionsToShow = Math.min(rawCount, 250); // Hard cap at 250 for performance
    
    return allPossibleConnections.slice(0, connectionsToShow).map(conn => ({
      ...conn,
      // Connection brightness increases with overall mastery
      brightness: 0.3 + (effectiveMasteryLevel * 0.7),
      // Individual connection strength based on how "recent" it formed
      connectionStrength: conn.strength * (0.5 + effectiveMasteryLevel * 0.5),
      isFullyFormed: effectiveMasteryLevel > 0.8, // Connections become fully stable
      color: color
    }));
  }, [allPossibleConnections, effectiveMasteryLevel, color]);

  // Calculate connection completion percentage for victory tracking
  const connectionCompletion = useMemo(() => {
    const totalPossible = allPossibleConnections.length;
    const formed = formedConnections.length;
    return totalPossible > 0 ? formed / totalPossible : 0;
  }, [allPossibleConnections.length, formedConnections.length]);

  // Store completion percentage globally for victory condition
  useEffect(() => {
    if (window.neuralConquestConnections) {
      window.neuralConquestConnections[owner || 'neutral'] = {
        completion: connectionCompletion,
        totalConnections: allPossibleConnections.length,
        formedConnections: formedConnections.length,
        masteryLevel: effectiveMasteryLevel
      };
    } else {
      window.neuralConquestConnections = {
        [owner || 'neutral']: {
          completion: connectionCompletion,
          totalConnections: allPossibleConnections.length,
          formedConnections: formedConnections.length,
          masteryLevel: effectiveMasteryLevel
        }
      };
    }
  }, [connectionCompletion, owner, allPossibleConnections.length, formedConnections.length, effectiveMasteryLevel]);

  return (
    <group ref={connectionsRef}>
      {formedConnections.map((connection) => (
        <EnhancedSynapticConnection
          key={connection.id}
          connection={connection}
        />
      ))}
      
      {/* Connection progress indicator */}
      {connectionCompletion > 0.1 && (
        <Html position={[0, 8, 0]} center>
          <div className="text-white text-xs bg-black/80 px-2 py-1 rounded backdrop-blur-sm">
            🔗 {Math.round(connectionCompletion * 100)}% Connected
          </div>
        </Html>
      )}
    </group>
  );
};

// Enhanced Synaptic Connection with Progressive Brightness
const EnhancedSynapticConnection = ({ connection }) => {
  const { start, end, brightness, connectionStrength, isFullyFormed, color } = connection;
  
  // Create curved path
  const curve = useMemo(() => {
    const startVector = new THREE.Vector3(...start);
    const endVector = new THREE.Vector3(...end);
    
    // Subtle organic curvature
    const midPoint = startVector.clone().lerp(endVector, 0.5);
    midPoint.y += (Math.random() - 0.5) * 1.5;
    midPoint.x += (Math.random() - 0.5) * 1.0;
    midPoint.z += (Math.random() - 0.5) * 1.0;
    
    return new THREE.QuadraticBezierCurve3(startVector, midPoint, endVector);
  }, [start, end]);

  // Connection thickness increases with strength
  const tubeGeometry = useMemo(() => {
    const radius = 0.02 + (connectionStrength * 0.08);
    return new THREE.TubeGeometry(curve, 24, radius, 8, false);
  }, [curve, connectionStrength]);

  return (
    <group>
      {/* Main connection with progressive brightness */}
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={brightness} // Gets brighter with mastery!
          transparent
          opacity={0.4 + (connectionStrength * 0.6)} // More visible as it strengthens
          roughness={isFullyFormed ? 0.2 : 0.4}
          metalness={isFullyFormed ? 0.3 : 0.1}
        />
      </mesh>
      
      {/* Synaptic flow particles for fully formed connections */}
      {isFullyFormed && (
        <SynapticFlow curve={curve} color={color} strength={connectionStrength} />
      )}
    </group>
  );
};

// Synaptic Particles - Neurotransmitter Activity
const SynapticParticles = ({ position, intensity, color }) => {
  const particlesRef = useRef();
  const count = Math.floor(50 + (intensity * 100)); // 50-150 particles based on activity
  
  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Create particles around the neuron in a spherical distribution
      const radius = 1 + Math.random() * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return positions;
  }, [count]);

  const velocities = useMemo(() => {
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Random velocities for particle movement
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    return velocities;
  }, [count]);
  
  useFrame((state) => {
    if (particlesRef.current) {
      const time = state.clock.elapsedTime;
      
      // Animate particles around the neuron
      const pos = particlesRef.current.geometry.attributes.position.array;
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        
        // Add sinusoidal movement to simulate neurotransmitter flow
        pos[i3] += velocities[i3] + Math.sin(time * 5 + i) * 0.005 * intensity;
        pos[i3 + 1] += velocities[i3 + 1] + Math.cos(time * 4 + i) * 0.005 * intensity;
        pos[i3 + 2] += velocities[i3 + 2] + Math.sin(time * 6 + i) * 0.005 * intensity;
        
        // Reset particles that drift too far
        const distance = Math.sqrt(pos[i3] ** 2 + pos[i3 + 1] ** 2 + pos[i3 + 2] ** 2);
        if (distance > 5) {
          const radius = 1 + Math.random() * 2;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          
          pos[i3] = radius * Math.sin(phi) * Math.cos(theta);
          pos[i3 + 1] = radius * Math.cos(phi);
          pos[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        }
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points ref={particlesRef} position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={2 + (intensity * 3)}
        color={color}
        transparent
        opacity={0.6 + (intensity * 0.3)}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Synaptic Connections - Scientifically Accurate Neural Pathways
const SynapticConnections = ({ territories, gamePhase }) => {
  const connectionsRef = useRef();
  
  // Calculate connections between owned territories
  const connections = useMemo(() => {
    const connections = [];
    const ownedTerritories = territories.filter(t => t.owner);
    
    for (let i = 0; i < ownedTerritories.length; i++) {
      for (let j = i + 1; j < ownedTerritories.length; j++) {
        const territory1 = ownedTerritories[i];
        const territory2 = ownedTerritories[j];
        
        // Only create connections between territories of the same owner
        if (territory1.owner === territory2.owner) {
          const distance = Math.sqrt(
            Math.pow(territory1.position[0] - territory2.position[0], 2) +
            Math.pow(territory1.position[1] - territory2.position[1], 2) +
            Math.pow(territory1.position[2] - territory2.position[2], 2)
          );
          
          // Calculate connection strength based on ownership time, streaks, etc.
          const strength = 0.5 + (Math.random() * 0.5); // 0.5-1.0 strength
          const isActive = territory1.recentActivity || territory2.recentActivity;
          
          connections.push({
            id: `${territory1.id}-${territory2.id}`,
            start: territory1.position,
            end: territory2.position,
            distance,
            strength,
            owner: territory1.owner,
            isActive,
            color: territory1.owner === 'human' ? '#00ff88' : '#ff4444'
          });
        }
      }
    }
    
    return connections;
  }, [territories]);
  
  useFrame((state) => {
    if (connectionsRef.current) {
      const time = state.clock.elapsedTime;
      
      // Animate connection materials based on neural activity
      connectionsRef.current.children.forEach((connectionGroup, index) => {
        const connection = connections[index];
        if (connection) {
          connectionGroup.children.forEach((child) => {
            if (child.material) {
              // Pulsing based on neural activity
              const baseIntensity = 0.3 + (connection.strength * 0.3);
              const pulse = connection.isActive ? 
                Math.sin(time * 8) * 0.3 : 
                Math.sin(time * 2) * 0.1;
              
              child.material.emissiveIntensity = baseIntensity + pulse;
              child.material.opacity = 0.6 + (connection.strength * 0.3) + pulse * 0.2;
            }
          });
        }
      });
    }
  });
  
        return (
    <group ref={connectionsRef}>
      {connections.map((connection) => (
        <SynapticConnection
          key={connection.id}
          connection={connection}
        />
      ))}
    </group>
  );
};

// Individual Synaptic Connection Component
const SynapticConnection = ({ connection }) => {
  const { start, end, strength, color, isActive } = connection;
  
  // Create curved path for more realistic neural connection
  const curve = useMemo(() => {
    const startVector = new THREE.Vector3(...start);
    const endVector = new THREE.Vector3(...end);
    
    // Add some curvature to make it look more organic
    const midPoint = startVector.clone().lerp(endVector, 0.5);
    midPoint.y += (Math.random() - 0.5) * 3; // Add some vertical deviation
    midPoint.x += (Math.random() - 0.5) * 2;
    midPoint.z += (Math.random() - 0.5) * 2;
    
    return new THREE.QuadraticBezierCurve3(startVector, midPoint, endVector);
  }, [start, end]);

  // Create connection geometry
  const tubeGeometry = useMemo(() => {
    const radius = 0.03 + (strength * 0.07); // Thickness based on strength
    return new THREE.TubeGeometry(curve, 20, radius, 8, false);
  }, [curve, strength]);

  return (
    <group>
      {/* Main synaptic connection */}
      <mesh geometry={tubeGeometry}>
      <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.3 + (strength * 0.3)}
          transparent
          opacity={0.6 + (strength * 0.3)}
          roughness={0.3}
      />
          </mesh>
      
      {/* Synaptic activity particles flowing along connection */}
      {isActive && (
        <SynapticFlow curve={curve} color={color} strength={strength} />
      )}
      
      {/* Connection endpoints - synaptic terminals */}
      <Sphere position={start} args={[0.08, 8, 8]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </Sphere>
      <Sphere position={end} args={[0.08, 8, 8]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </Sphere>
    </group>
  );
};

// Synaptic Flow - Particles flowing along neural pathways
const SynapticFlow = ({ curve, color, strength }) => {
  const flowRef = useRef();
  const particleCount = Math.floor(5 + strength * 10);
  
  const particles = useMemo(() => {
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        progress: Math.random(),
        speed: 0.01 + Math.random() * 0.02,
        size: 0.05 + Math.random() * 0.1
      });
    }
    return particles;
  }, [particleCount]);

  useFrame(() => {
    if (flowRef.current) {
      particles.forEach((particle, index) => {
        particle.progress += particle.speed;
        if (particle.progress > 1) particle.progress = 0;
        
        const position = curve.getPoint(particle.progress);
        const sphere = flowRef.current.children[index];
        if (sphere) {
          sphere.position.copy(position);
        }
      });
    }
  });

  return (
    <group ref={flowRef}>
      {particles.map((particle, index) => (
        <Sphere key={index} args={[particle.size, 6, 6]}>
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.8}
            transparent
            opacity={0.9}
          />
        </Sphere>
      ))}
    </group>
  );
};

// Cosmic Particles Effect

// 🌟 Atmospheric Particles for Depth Perception (Not the annoying orbiting ones!)
const AtmosphericParticles = () => {
  const particlesRef = useRef();
  const count = 800; // Much fewer, subtle particles
  
  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Distribute in zones around brain regions for depth
      const zone = Math.floor(Math.random() * 3);
      let x, y, z;
      
      if (zone === 0) { // Human brain zone
        x = -60 + (Math.random() - 0.5) * 40;
        y = 10 + (Math.random() - 0.5) * 30;
        z = (Math.random() - 0.5) * 40;
      } else if (zone === 1) { // AI brain zone  
        x = 60 + (Math.random() - 0.5) * 40;
        y = 10 + (Math.random() - 0.5) * 30;
        z = (Math.random() - 0.5) * 40;
      } else { // Learning zone
        x = (Math.random() - 0.5) * 50;
        y = (Math.random() - 0.5) * 40;
        z = (Math.random() - 0.5) * 50;
      }
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    return positions;
  }, []);

  const colors = useMemo(() => {
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const zone = Math.floor(i / (count / 3));
      if (zone === 0) { // Human brain - green tint
        colors[i * 3] = 0.2 + Math.random() * 0.3; // R
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.4; // G
        colors[i * 3 + 2] = 0.3 + Math.random() * 0.3; // B
      } else if (zone === 1) { // AI brain - red tint
        colors[i * 3] = 0.6 + Math.random() * 0.4; // R
        colors[i * 3 + 1] = 0.2 + Math.random() * 0.3; // G
        colors[i * 3 + 2] = 0.2 + Math.random() * 0.3; // B
      } else { // Learning zone - blue tint
        colors[i * 3] = 0.3 + Math.random() * 0.3; // R
        colors[i * 3 + 1] = 0.4 + Math.random() * 0.3; // G
        colors[i * 3 + 2] = 0.7 + Math.random() * 0.3; // B
      }
    }
    return colors;
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      const time = state.clock.elapsedTime;
      // Very subtle floating motion - no crazy orbiting!
      particlesRef.current.rotation.y = Math.sin(time * 0.1) * 0.05;
      particlesRef.current.position.y = Math.sin(time * 0.2) * 2;
    }
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.2}
        vertexColors
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

  // First Person Camera Controller
const FirstPersonCamera = ({ onPositionChange, questionModalActive = false }) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const [isLocked, setIsLocked] = useState(false);
  const [moveState, setMoveState] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Disable movement only when question modal is active
      if (questionModalActive) return;
      
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          setMoveState(prev => ({ ...prev, forward: true }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setMoveState(prev => ({ ...prev, backward: true }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setMoveState(prev => ({ ...prev, left: true }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setMoveState(prev => ({ ...prev, right: true }));
          break;
        case 'Space':
          setMoveState(prev => ({ ...prev, up: true }));
          event.preventDefault();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setMoveState(prev => ({ ...prev, down: true }));
          break;
      }
    };

    const handleKeyUp = (event) => {
      // Disable movement only when question modal is active
      if (questionModalActive) return;
      
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          setMoveState(prev => ({ ...prev, forward: false }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setMoveState(prev => ({ ...prev, backward: false }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setMoveState(prev => ({ ...prev, left: false }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setMoveState(prev => ({ ...prev, right: false }));
          break;
        case 'Space':
          setMoveState(prev => ({ ...prev, up: false }));
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setMoveState(prev => ({ ...prev, down: false }));
          break;
      }
    };

    // Listen for pointer lock state changes
    const handleLockChange = () => {
      const locked = document.pointerLockElement === gl.domElement;
      setIsLocked(locked);
      
      // Clear all movement when unlocking or when question modal becomes active
      if (!locked || questionModalActive) {
        setMoveState({
          forward: false,
          backward: false,
          left: false,
          right: false,
          up: false,
          down: false
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('pointerlockchange', handleLockChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('pointerlockchange', handleLockChange);
    };
  }, [isLocked, gl.domElement, questionModalActive]);

  // Disable pointer lock when question modal is active
  useEffect(() => {
    if (questionModalActive && isLocked) {
      // Exit pointer lock when question modal opens
      document.exitPointerLock();
    }
  }, [questionModalActive, isLocked]);

  useFrame((state, delta) => {
    const speed = 12; // Movement speed
    const dampening = 0.95; // Smooth movement
    
    // Apply dampening to current velocity
    velocity.current.multiplyScalar(dampening);
    
    // Get current camera direction vectors
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    
    camera.getWorldDirection(forward);
    right.crossVectors(forward, up).normalize();
    
    // Calculate movement based on current input
    const acceleration = speed * delta;
    
    if (moveState.forward) {
      velocity.current.add(forward.clone().multiplyScalar(acceleration));
    }
    if (moveState.backward) {
      velocity.current.add(forward.clone().multiplyScalar(-acceleration));
    }
    if (moveState.left) {
      velocity.current.add(right.clone().multiplyScalar(-acceleration));
    }
    if (moveState.right) {
      velocity.current.add(right.clone().multiplyScalar(acceleration));
    }
    if (moveState.up) {
      velocity.current.add(up.clone().multiplyScalar(acceleration));
    }
    if (moveState.down) {
      velocity.current.add(up.clone().multiplyScalar(-acceleration));
    }
    
    // Stop immediately when no keys pressed (no inertia)
    if (!moveState.forward && !moveState.backward && !moveState.left && !moveState.right && !moveState.up && !moveState.down) {
      velocity.current.set(0, 0, 0);
    }
    
    // Apply velocity to camera position
    if (velocity.current.length() > 0.001) {
      camera.position.add(velocity.current);
      
      // Notify parent of position change
      if (onPositionChange) {
        onPositionChange([camera.position.x, camera.position.y, camera.position.z]);
      }
    }
  });
  
  return (
    <>
      {!questionModalActive && (
        <PointerLockControls 
          ref={controlsRef}
          args={[camera, gl.domElement]}
          enableDamping={true}
          dampingFactor={0.05}
          pointerSpeed={0.5}
        />
      )}
    </>
  );
};

// Galaxy Environment Component
const NeuralNetworkEnvironment = ({ territories, onTerritoryClick, selectedTerritory, gamePhase, players, questionModalActive = false }) => {
  const [playerPosition, setPlayerPosition] = useState([0, 0, 20]);

  return (
    <>
      {/* 🌟 REVOLUTIONARY NEURAL LIGHTING SYSTEM - Enhanced Visibility */}
      
      {/* Enhanced ambient with blue-tinted depth */}
      <ambientLight intensity={0.5} color="#1a1a3a" />
      
      {/* ZONE-BASED ACCENT LIGHTING for Maximum Distinction */}
      
      {/* Human Brain Zone - Bright Green Illumination */}
      <pointLight position={[-60, 25, 0]} intensity={2.5} color="#00ff88" distance={50} decay={1.2} />
      <pointLight position={[-60, 5, 25]} intensity={1.8} color="#44ffaa" distance={35} decay={1.5} />
      <pointLight position={[-60, 5, -25]} intensity={1.8} color="#44ffaa" distance={35} decay={1.5} />
      <spotLight 
        position={[-80, 40, 0]} 
        target-position={[-60, 10, 0]}
        intensity={2.0} 
        color="#00ff88" 
        angle={Math.PI / 6} 
        penumbra={0.5}
        distance={80}
        castShadow
      />
      
      {/* AI Brain Zone - Bright Red Illumination */}
      <pointLight position={[60, 25, 0]} intensity={2.5} color="#ff4444" distance={50} decay={1.2} />
      <pointLight position={[60, 5, 25]} intensity={1.8} color="#ff6666" distance={35} decay={1.5} />
      <pointLight position={[60, 5, -25]} intensity={1.8} color="#ff6666" distance={35} decay={1.5} />
      <spotLight 
        position={[80, 40, 0]} 
        target-position={[60, 10, 0]}
        intensity={2.0} 
        color="#ff4444" 
        angle={Math.PI / 6} 
        penumbra={0.5}
        distance={80}
        castShadow
      />
      
      {/* Learning Zone - Bright Blue Illumination */}
      <pointLight position={[0, 30, 0]} intensity={2.2} color="#4A90E2" distance={60} decay={1.0} />
      <pointLight position={[0, 10, 35]} intensity={1.5} color="#6AA6F8" distance={45} decay={1.3} />
      <pointLight position={[0, 10, -35]} intensity={1.5} color="#6AA6F8" distance={45} decay={1.3} />
      <spotLight 
        position={[0, 50, 0]} 
        target-position={[0, 0, 0]}
        intensity={1.8} 
        color="#4A90E2" 
        angle={Math.PI / 4} 
        penumbra={0.3}
        distance={100}
        castShadow
      />
      
      {/* Rim lighting for depth and atmosphere */}
      <pointLight position={[0, -25, 0]} intensity={1.0} color="#2a2a5a" distance={120} decay={0.8} />
      <pointLight position={[100, 15, 100]} intensity={0.8} color="#3a3a6a" distance={150} decay={0.6} />
      <pointLight position={[-100, 15, -100]} intensity={0.8} color="#3a3a6a" distance={150} decay={0.6} />
      
      {/* Enhanced directional key light with better shadows */}
      <directionalLight
        position={[30, 60, 30]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={300}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
        shadow-bias={-0.0001}
      />
      
      {/* 🌌 ENHANCED ATMOSPHERIC BACKGROUND SYSTEM */}
      
      {/* Distant starfield for depth perception */}
      <Stars 
        radius={1200} 
        depth={300} 
        count={2000} 
        factor={1.5} 
        saturation={0} 
        fade 
        speed={0.05}
      />
      
      {/* Additional very distant stars for space atmosphere */}
      <group>
        {Array.from({ length: 500 }, (_, i) => {
          // Create stars at very distant positions
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          const radius = 2000 + Math.random() * 1000;
          
          const x = radius * Math.sin(phi) * Math.cos(theta);
          const y = radius * Math.sin(phi) * Math.sin(theta);
          const z = radius * Math.cos(phi);
          
          return (
            <mesh key={i} position={[x, y, z]}>
              <sphereGeometry args={[0.5 + Math.random() * 1, 4, 4]} />
              <meshBasicMaterial 
                color="#ffffff" 
                transparent
                opacity={0.1 + Math.random() * 0.3}
              />
            </mesh>
          );
        })}
      </group>
      
      {/* Atmospheric depth gradient background */}
      <Sphere args={[200, 16, 16]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#0a0a1a"
          emissive="#1a1a3a"
          emissiveIntensity={0.1}
          transparent
          opacity={0.2}
          side={THREE.BackSide}
        />
      </Sphere>
      
      {/* Depth fog planes for atmospheric perspective */}
      <mesh position={[0, -40, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial
          color="#0a0a2a"
          emissive="#1a1a4a"
          emissiveIntensity={0.08}
          transparent
          opacity={0.12}
        />
      </mesh>
      
      <mesh position={[0, 60, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial
          color="#0a0a2a"
          emissive="#2a2a5a"
          emissiveIntensity={0.06}
          transparent
          opacity={0.08}
        />
      </mesh>
      
      {/* Enhanced Brain Zone Background Auras - Dynamic based on actual players */}
      {players && players.length > 0 && players.map((player, index) => {
        // Get player color with same fallback logic as BrainRegion
        let playerColor;
        if (player.color) {
          playerColor = player.color;
        } else if (player.isAI) {
          playerColor = '#ff4444'; // Consistent red for AI
        } else {
          playerColor = '#00ff88'; // Consistent green for human
        }
        
        console.log(`🌟 Background Aura ${index}:`, {
          playerName: player.name,
          playerId: player.id,
          isAI: player.isAI,
          playerColorFromObject: player.color,
          finalAuraColor: playerColor
        });
        
        // Calculate the same position logic used by <BrainRegion /> for consistency
        const angle = (index / Math.max(players.length, 1)) * Math.PI * 2;
        const distance = 60; // Must match distance used in MultipleBrains
        const position = [
          Math.cos(angle) * distance,
          8, // Align Y‐axis with BrainRegion (y = 8)
          Math.sin(angle) * distance
        ];
        
        // Create darker version of player color for base color
        const baseColor = playerColor.replace('#', '').match(/.{2}/g);
        const darkerColor = `#${baseColor.map(hex => {
          const val = Math.floor(parseInt(hex, 16) * 0.2);
          return val.toString(16).padStart(2, '0');
        }).join('')}`;
        
        return (
          <Sphere key={`brain-aura-${player.id || index}`} position={position} args={[22, 32, 32]}>
            <meshStandardMaterial
              color={darkerColor}
              emissive={playerColor}
              emissiveIntensity={0.15}
              transparent
              opacity={0.18}
              side={THREE.BackSide}
              roughness={0.8}
            />
          </Sphere>
        );
      })}
      
      {/* Central neutral zone - only show when no players or as background */}
      <Sphere position={[0, 0, 0]} args={[35, 32, 32]}>
        <meshStandardMaterial
          color="#1a1a4e"
          emissive="#4A90E2"
          emissiveIntensity={0.12}
          transparent
          opacity={0.2}
          roughness={0.8}
        />
      </Sphere>
      
      {/* Atmospheric particles - REMOVED for cleaner look */}
      
      {/* Atmospheric fog for depth and contrast */}
      <fog attach="fog" args={['#0a0a1a', 50, 200]} />

      {/* First Person Camera Controls */}
      <FirstPersonCamera onPositionChange={setPlayerPosition} questionModalActive={questionModalActive} />
      
      {/* Knowledge Objects with Progressive Neural Clouds */}
      {territories.filter(t => !t.owner).map((territory, index) => {
        // Use actual mastery level from territory data
        const masteryLevel = territory.masteryLevel || 0;
        const isActivelyLearning = territory.lastActivity && (Date.now() - territory.lastActivity < 10000); // Active if answered in last 10 seconds
        
        return (
          <KnowledgeObject
            key={territory.id || index}
            territory={territory}
            onClick={onTerritoryClick}
            isSelected={selectedTerritory?.id === territory.id}
            playerPosition={playerPosition}
            gamePhase={gamePhase}
            masteryLevel={masteryLevel}
            isActivelyLearning={isActivelyLearning}
          />
        );
      })}
      
      {/* Inter-Object Neural Pathways */}
      <InterObjectConnections territories={territories} gamePhase={gamePhase} />
      
      {/* Multiple Brain Regions - All Players */}
      <MultipleBrains territories={territories} gamePhase={gamePhase} players={players || []} />
    </>
  );
};

// Inter-Object Neural Pathways - Connections between mastered knowledge areas
const InterObjectConnections = ({ territories, gamePhase }) => {
  const connections = useMemo(() => {
    const connections = [];
    const masteredTerritories = territories.filter(t => t.owner);
    
    // Create connections between territories owned by the same player
    for (let i = 0; i < masteredTerritories.length; i++) {
      for (let j = i + 1; j < masteredTerritories.length; j++) {
        const territory1 = masteredTerritories[i];
        const territory2 = masteredTerritories[j];
        
        if (territory1.owner === territory2.owner) {
          const distance = Math.sqrt(
            Math.pow(territory1.position[0] - territory2.position[0], 2) +
            Math.pow(territory1.position[1] - territory2.position[1], 2) +
            Math.pow(territory1.position[2] - territory2.position[2], 2)
          );
          
          // Only connect if reasonably close (to avoid visual clutter)
          if (distance < 30) {
            connections.push({
              id: `${territory1.id}-${territory2.id}`,
              start: territory1.position,
              end: territory2.position,
              owner: territory1.owner,
              strength: 0.7 + Math.random() * 0.3, // Connection strength
              color: territory1.owner === 'human' ? '#00ff88' : '#ff4444'
            });
          }
        }
      }
    }
    
    return connections;
  }, [territories]);

  return (
    <group>
      {connections.map((connection) => (
        <InterObjectConnection
          key={connection.id}
          connection={connection}
        />
      ))}
    </group>
  );
};

// Individual connection between knowledge objects
const InterObjectConnection = ({ connection }) => {
  const { start, end, color, strength } = connection;
  
  // Create a subtle curved connection
  const curve = useMemo(() => {
    const startVector = new THREE.Vector3(...start);
    const endVector = new THREE.Vector3(...end);
    
    // Add slight curvature
    const midPoint = startVector.clone().lerp(endVector, 0.5);
    midPoint.y += 2; // Slight upward arc
    
    return new THREE.QuadraticBezierCurve3(startVector, midPoint, endVector);
  }, [start, end]);

  const tubeGeometry = useMemo(() => {
    const radius = 0.02 + (strength * 0.03); // Very thin connections
    return new THREE.TubeGeometry(curve, 16, radius, 6, false);
  }, [curve, strength]);

  return (
    <mesh geometry={tubeGeometry}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.2 + (strength * 0.2)}
        transparent
        opacity={0.4 + (strength * 0.3)}
        roughness={0.2}
      />
    </mesh>
  );
};

// Multiple Brain Regions - Show connection-based progress!
const MultipleBrains = ({ territories, gamePhase, players = [] }) => {
  const [connectionStats, setConnectionStats] = useState({});

  // Initialize connection stats for all players
  useEffect(() => {
    const initialStats = {};
    players.forEach(player => {
      initialStats[player.id] = { completion: 0, totalConnections: 0, formedConnections: 0 };
    });
    // Add neutral zone
    initialStats.neutral = { completion: 0, totalConnections: 0, formedConnections: 0 };
    setConnectionStats(initialStats);
  }, [players]);

  // Update connection stats from global tracker
  useFrame(() => {
    if (window.neuralConquestConnections) {
      setConnectionStats(prev => {
        const updated = { ...prev };
        Object.keys(window.neuralConquestConnections).forEach(playerId => {
          if (window.neuralConquestConnections[playerId]) {
            updated[playerId] = window.neuralConquestConnections[playerId];
          }
        });
        return updated;
      });
    }
  });

  // Check for victory condition - first player to 100% connections wins!
  useEffect(() => {
    players.forEach(player => {
      const playerCompletion = connectionStats[player.id]?.completion || 0;
      if (playerCompletion >= 1.0) {
        console.log(`🧠 ${player.name.toUpperCase()} VICTORY: 100% Neural Network Completion!`);
        // TODO: Trigger victory screen for this player
      }
    });
  }, [connectionStats, players]);
  
  return (
    <group>
      {/* Central Learning Zone */}
      <LearningZone 
        position={[0, 0, 0]} 
        territories={territories.filter(t => !t.owner)} 
        connectionStats={connectionStats.neutral}
      />
      
      {/* Player Brain Regions - Positioned Equidistantly Around Center */}
      {players.map((player, index) => {
        const playerTerritories = territories.filter(t => t.owner === player.id);
        const angle = (index / players.length) * Math.PI * 2;
        const distance = 60; // Increased distance from center for better separation
        const position = [
          Math.cos(angle) * distance,
          8, // Elevated above center
          Math.sin(angle) * distance
        ];
        
        // Debug player data
        console.log('🧠 Rendering brain for player:', {
          name: player.name,
          color: player.color,
          isAI: player.isAI,
          isHuman: player.isHuman,
          brainType: player.brainType,
          index
        });
        
        return (
          <group key={player.id}>
            {/* Main Brain Region */}
            <BrainRegion
              position={position}
              territories={playerTerritories}
              allTerritories={territories}
              masteryPercentage={connectionStats[player.id]?.completion || 0}
              connectionStats={connectionStats[player.id] || { completion: 0, totalConnections: 0, formedConnections: 0 }}
              brainType={player.isAI ? 'ai' : (player.brainType || 'human')}
              label={`${player.name}'s Neural Network`}
              playerColor={player.color}
              player={player}
            />
            
            {/* Player Territory Knowledge Objects - Positioned around their brain */}
            {playerTerritories.map((territory, territoryIndex) => {
              // Position territories: fully mastered ones embed inside brain; others orbit outside
              const territoryAngle = (territoryIndex / Math.max(playerTerritories.length, 1)) * Math.PI * 2;
              const isMastered = (territory.masteryLevel || 0) >= 1.0;
              const territoryRadius = isMastered ? 4 : 15; // Mastered nodes placed inside brain

              // Fixed Y offset – no random jitter
              const yOffset = isMastered ? 0 : 2; // Slight lift for orbiting nodes

              const territoryPosition = [
                position[0] + Math.cos(territoryAngle) * territoryRadius,
                position[1] + yOffset,
                position[2] + Math.sin(territoryAngle) * territoryRadius
              ];
              
              return (
                <group position={territoryPosition}>
                  <KnowledgeObject
                    key={territory.id}
                    territory={territory}
                    onClick={() => {}} // Disabled for owned territories
                    isSelected={false}
                    playerPosition={[0, 0, 0]} // Relative to group position
                    gamePhase={gamePhase}
                    masteryLevel={territory.masteryLevel || 0}
                    isActivelyLearning={false}
                  />
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
};

// Individual Brain Region Component - Now Shows Connection Progress!
const BrainRegion = ({ position, territories, allTerritories, masteryPercentage, connectionStats, brainType, label, playerColor, player }) => {
  const brainRef = useRef();
  
  // DEBUGGING: Enable to see sphere alignment clearly - set to true to debug
  const DEBUG_SPHERE_ALIGNMENT = false;
  
  // Enhanced color logic with player-specific fallbacks
  let color;
  if (playerColor) {
    color = playerColor;
  } else if (player?.color) {
    color = player.color;
  } else if (player?.isAI || brainType === 'ai') {
    color = '#ff4444'; // Consistent red for AI
  } else {
    color = '#00ff88'; // Consistent green for human
  }
  
  console.log('🎨 BrainRegion color assignment:', {
    playerName: player?.name,
    playerColor,
    playerColorFromObject: player?.color,
    brainType,
    isAI: player?.isAI,
    finalColor: color
  });
  
  useFrame((state) => {
    if (brainRef.current) {
      const time = state.clock.elapsedTime;
      
      // Pulsing based on connection completion
      const pulse = 1 + Math.sin(time * 2) * 0.08 * masteryPercentage;
      brainRef.current.scale.setScalar(pulse);
      
      // Rotation speed increases with connections
      brainRef.current.rotation.y = time * (0.05 + masteryPercentage * 0.1);
      
      // DEBUGGING: Log positioning every few seconds for verification
      if (Math.floor(time) % 5 === 0 && Math.floor(time * 10) % 10 === 0) {
        console.log('🔍 Brain positioning debug:', {
          playerName: player?.name,
          groupPosition: brainRef.current.position,
          groupScale: brainRef.current.scale,
          groupRotation: brainRef.current.rotation,
          childrenCount: brainRef.current.children.length,
          childPositions: brainRef.current.children.map(child => ({
            type: child.geometry?.type,
            position: child.position,
            scale: child.scale
          }))
        });
      }
    }
  });

  return (
    <group ref={brainRef} position={position}>
      {/* DEBUGGING: Center point marker - only shows in debug mode */}
      {DEBUG_SPHERE_ALIGNMENT && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
      
      {/* Brain Core - EXPLICITLY CENTERED - Brightness based on neural network completion */}
      <Sphere args={[3, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color={DEBUG_SPHERE_ALIGNMENT ? '#ff0000' : color} // RED in debug mode
          emissive={DEBUG_SPHERE_ALIGNMENT ? '#ff0000' : color}
          emissiveIntensity={0.4 + (masteryPercentage * 0.8)}
          transparent
          opacity={DEBUG_SPHERE_ALIGNMENT ? 0.7 : (0.8 + (masteryPercentage * 0.2))}
          roughness={0.2}
          metalness={0.1}
          wireframe={DEBUG_SPHERE_ALIGNMENT}
        />
      </Sphere>
      
      {/* Brain Activity Aura - EXPLICITLY CENTERED - Grows with connections */}
      <Sphere args={[5, 16, 16]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color={DEBUG_SPHERE_ALIGNMENT ? '#00ff00' : color} // GREEN in debug mode
          emissive={DEBUG_SPHERE_ALIGNMENT ? '#00ff00' : color}
          emissiveIntensity={0.2 + (masteryPercentage * 0.5)}
          transparent
          opacity={DEBUG_SPHERE_ALIGNMENT ? 0.5 : (0.5 + (masteryPercentage * 0.4))}
          roughness={0.6}
          wireframe={DEBUG_SPHERE_ALIGNMENT}
        />
      </Sphere>
      
      {/* Outer Glow Ring - EXPLICITLY CENTERED - Victory glow at 100% */}
      <Sphere args={[7, 12, 12]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color={DEBUG_SPHERE_ALIGNMENT ? '#0000ff' : (masteryPercentage >= 1.0 ? '#ffffff' : color)} // BLUE in debug mode
          emissive={DEBUG_SPHERE_ALIGNMENT ? '#0000ff' : (masteryPercentage >= 1.0 ? '#ffffff' : color)}
          emissiveIntensity={masteryPercentage >= 1.0 ? 0.8 : 0.1 + (masteryPercentage * 0.3)}
          transparent
          opacity={DEBUG_SPHERE_ALIGNMENT ? 0.3 : (0.2 + (masteryPercentage * 0.3))}
          roughness={0.9}
          side={DEBUG_SPHERE_ALIGNMENT ? THREE.FrontSide : THREE.BackSide} // Front side in debug mode
          wireframe={DEBUG_SPHERE_ALIGNMENT}
        />
      </Sphere>
      
      {/* Neural Activity Particles - REMOVED for cleaner look */}
      
      {/* Connection Progress Label */}
      <Html position={[0, 6, 0]} center>
        <div className={`text-white text-sm font-bold px-3 py-2 rounded-lg backdrop-blur-sm transition-all duration-300 ${
          masteryPercentage >= 1.0 ? 'bg-yellow-500/90 text-black border-2 border-yellow-300 shadow-lg shadow-yellow-500/50' : 'bg-black/80'
        }`}>
          <div className="flex items-center gap-2">
            <Brain size={16} />
            <span>{label}</span>
            {masteryPercentage >= 1.0 && <span>👑</span>}
          </div>
          <div className="text-xs opacity-75 mt-1">
            🔗 Neural Network: {Math.round(masteryPercentage * 100)}%
          </div>
          <div className="text-xs opacity-75">
            ⚡ {connectionStats?.formedConnections || 0}/{connectionStats?.totalConnections || 0} connections
          </div>
          {masteryPercentage >= 1.0 && (
            <div className="text-xs font-bold text-yellow-200 mt-1">
              🏆 NEURAL MASTERY ACHIEVED!
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

// Brain Activity Particles
const BrainActivityParticles = ({ count, color, intensity }) => {
  const particlesRef = useRef();
  
  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Spherical distribution around brain
      const radius = 4 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (particlesRef.current) {
      const time = state.clock.elapsedTime;
      
      // Rotate particle cloud
      particlesRef.current.rotation.y = time * 0.2 * intensity;
      particlesRef.current.rotation.x = Math.sin(time * 0.1) * 0.1;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={2 + intensity * 3} // Larger particles
        color={color}
        transparent
        opacity={0.8 + intensity * 0.2} // More opaque
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Learning Zone - Where new neural connections can form!
const LearningZone = ({ position, territories, connectionStats }) => {
  if (territories.length === 0) return null;
  
  const potentialConnections = connectionStats?.totalConnections || 0;
  const formingConnections = connectionStats?.formedConnections || 0;
  const progressIntensity = Math.min(formingConnections / Math.max(potentialConnections, 1), 1);
  
  return (
    <group position={position}>
      {/* Dynamic learning aura that grows with potential */}
      <Sphere args={[25 + progressIntensity * 5, 16, 16]}>
        <meshStandardMaterial
          color="#4A90E2"
          emissive="#4A90E2"
          emissiveIntensity={0.05 + progressIntensity * 0.15}
          transparent
          opacity={0.1 + progressIntensity * 0.1}
          roughness={0.9}
        />
      </Sphere>
      
      {/* Connection formation particles - REMOVED for cleaner look */}
      
      {/* Learning zone progress label */}
      <Html position={[0, 30, 0]} center>
        <div className="text-white text-sm font-bold bg-black/60 px-3 py-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Target size={16} />
            <span>Learning Zone</span>
          </div>
          <div className="text-xs opacity-75 mt-1">
            📚 {territories.length} knowledge areas
          </div>
          <div className="text-xs opacity-75">
            🔗 {formingConnections}/{potentialConnections} potential connections
          </div>
          {progressIntensity > 0.1 && (
            <div className="text-xs text-blue-300 mt-1">
              ⚡ Neural pathways forming...
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

// Game Constants - Neural Network Conquest
const GAME_PHASES = {
  SETUP: 'setup',
  PLAYER_TURN: 'player_turn',
  CONQUEST: 'conquest',
  AI_TURN: 'ai_turn',
  GAME_OVER: 'game_over'
};

// Game setup component with multiplayer support
const GameSetup = ({ onGameStart, currentUser }) => {
  const [gameMode, setGameMode] = useState('ai'); // 'ai' or 'multiplayer'
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [playerName, setPlayerName] = useState(currentUser?.displayName || 'Player');
  const [inviteEmails, setInviteEmails] = useState(['']);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [loading, setLoading] = useState(false);
  const [showTopicSelector, setShowTopicSelector] = useState(false);

  const addInviteField = () => {
    if (inviteEmails.length < maxPlayers - 1) {
      setInviteEmails([...inviteEmails, '']);
    }
  };

  const removeInviteField = (index) => {
    setInviteEmails(inviteEmails.filter((_, i) => i !== index));
  };

  const updateInviteEmail = (index, email) => {
    const newEmails = [...inviteEmails];
    newEmails[index] = email;
    setInviteEmails(newEmails);
  };

  const handleStartGame = async () => {
    if (!selectedTopic) {
      toast.error('Please select a topic first!');
      return;
    }

    setLoading(true);

    try {
      const gameConfig = {
        gameMode,
        topic: selectedTopic,
        playerName,
        maxPlayers: gameMode === 'ai' ? 2 : maxPlayers,
        invites: gameMode === 'multiplayer' ? inviteEmails.filter(email => email.trim()) : [],
        userId: currentUser.uid
      };

      console.log('🎮 Starting Neural Conquest with config:', gameConfig);
      await onGameStart(gameConfig);
    } catch (error) {
      console.error('❌ Error starting game:', error);
      toast.error('Failed to start game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="game-setup-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 50%, rgba(15, 52, 96, 0.95) 100%)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '2rem'
      }}
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '2px solid #4A90E2',
          borderRadius: '20px',
          padding: '2rem',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{
            color: '#4A90E2',
            margin: '0 0 0.5rem',
            fontSize: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <Brain size={32} />
            Neural Conquest Setup
          </h2>
          <p style={{ color: '#ccc', margin: 0, fontSize: '1.1rem' }}>
            Configure your brain training session
          </p>
        </div>

        {/* Game Mode Selection */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1rem', display: 'block' }}>
            🎮 Game Mode
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setGameMode('ai')}
              style={{
                background: gameMode === 'ai' ? '#4A90E2' : 'rgba(74, 144, 226, 0.1)',
                border: `2px solid ${gameMode === 'ai' ? '#4A90E2' : 'rgba(74, 144, 226, 0.3)'}`,
                color: 'white',
                padding: '1rem',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <Shield size={24} style={{ marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 'bold' }}>vs AI</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Train against intelligent AI</div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setGameMode('multiplayer')}
              style={{
                background: gameMode === 'multiplayer' ? '#4A90E2' : 'rgba(74, 144, 226, 0.1)',
                border: `2px solid ${gameMode === 'multiplayer' ? '#4A90E2' : 'rgba(74, 144, 226, 0.3)'}`,
                color: 'white',
                padding: '1rem',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <Users size={24} style={{ marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 'bold' }}>Multiplayer</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Compete with friends</div>
            </motion.button>
          </div>
        </div>

        {/* Player Name */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.5rem', display: 'block' }}>
            👤 Your Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(74, 144, 226, 0.1)',
              border: '2px solid rgba(74, 144, 226, 0.3)',
              borderRadius: '10px',
              color: 'white',
              fontSize: '1rem'
            }}
            placeholder="Enter your name"
          />
        </div>

        {/* Multiplayer Settings */}
        {gameMode === 'multiplayer' && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <label style={{ color: 'white', fontSize: '1.1rem' }}>
                👥 Max Players
              </label>
              <select
                value={maxPlayers}
                onChange={(e) => {
                  const newMax = parseInt(e.target.value);
                  setMaxPlayers(newMax);
                  // Adjust invite emails array
                  const currentInvites = inviteEmails.filter(email => email.trim());
                  const needed = newMax - 1; // -1 for current user
                  if (currentInvites.length > needed) {
                    setInviteEmails(currentInvites.slice(0, needed));
                  } else if (currentInvites.length < needed) {
                    setInviteEmails([...currentInvites, ...Array(needed - currentInvites.length).fill('')]);
                  }
                }}
                style={{
                  padding: '0.5rem',
                  background: 'rgba(74, 144, 226, 0.1)',
                  border: '2px solid rgba(74, 144, 226, 0.3)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '1rem'
                }}
              >
                <option value={2}>2 Players</option>
                <option value={3}>3 Players</option>
                <option value={4}>4 Players</option>
                <option value={6}>6 Players</option>
              </select>
            </div>

            {/* Invite Players */}
            <div>
              <label style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.5rem', display: 'block' }}>
                📧 Invite Players (Email)
              </label>
              {inviteEmails.map((email, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateInviteEmail(index, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'rgba(74, 144, 226, 0.1)',
                      border: '2px solid rgba(74, 144, 226, 0.3)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                    placeholder={`Player ${index + 2} email`}
                  />
                  {inviteEmails.length > 1 && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeInviteField(index)}
                      style={{
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.5rem',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </motion.button>
                  )}
                </div>
              ))}
              
              {inviteEmails.length < maxPlayers - 1 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addInviteField}
                  style={{
                    background: 'rgba(74, 144, 226, 0.2)',
                    border: '2px dashed rgba(74, 144, 226, 0.5)',
                    color: '#4A90E2',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    width: '100%',
                    fontSize: '0.9rem'
                  }}
                >
                  + Add Another Player
                </motion.button>
              )}
            </div>
          </div>
        )}

        {/* Topic Selection */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1rem', display: 'block' }}>
            🧠 Learning Topic
          </label>
          
          {selectedTopic ? (
            <div style={{
              background: 'rgba(74, 144, 226, 0.1)',
              border: '2px solid #4A90E2',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {selectedTopic}
                </div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                  Ready for neural conquest!
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setSelectedTopic(null);
                  setShowTopicSelector(true);
                }}
                style={{
                  background: 'rgba(74, 144, 226, 0.2)',
                  border: '1px solid #4A90E2',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  color: '#4A90E2',
                  cursor: 'pointer'
                }}
              >
                Change
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowTopicSelector(true)}
              style={{
                background: 'rgba(74, 144, 226, 0.1)',
                border: '2px dashed rgba(74, 144, 226, 0.5)',
                color: '#4A90E2',
                padding: '1.5rem',
                borderRadius: '12px',
                cursor: 'pointer',
                width: '100%',
                fontSize: '1rem',
                textAlign: 'center'
              }}
            >
              <Target size={24} style={{ marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
              Select Learning Topic
            </motion.button>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.history.back()}
            style={{
              background: 'transparent',
              border: '2px solid #666',
              color: '#ccc',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Cancel
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStartGame}
            disabled={loading || !selectedTopic}
            style={{
              background: (loading || !selectedTopic) ? '#666' : 'linear-gradient(135deg, #4A90E2 0%, #3b82f6 100%)',
              border: 'none',
              color: 'white',
              padding: '0.75rem 2rem',
              borderRadius: '10px',
              cursor: (loading || !selectedTopic) ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Starting...
              </>
            ) : (
              <>
                <Rocket size={16} />
                Start Neural Conquest
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Topic Selector Modal */}
      {showTopicSelector && (
        <TopicSelector
          onTopicSelect={(topic) => {
            setSelectedTopic(topic);
            setShowTopicSelector(false);
          }}
          onClose={() => setShowTopicSelector(false)}
        />
      )}
    </motion.div>
  );
};

// Neural Network Territories - positioned in 3D brain space
const generateNeuralTerritories = (customObjects = []) => {
  const territories = [];
  
  if (customObjects.length > 0) {
    // Use custom 3D objects from Shap-E
    customObjects.forEach((obj, index) => {
      const angle = (index / customObjects.length) * Math.PI * 2;
      const radius = 15 + (index % 3) * 8; // Varying orbital distances
      const height = (Math.sin(angle * 2) * 5); // Varying heights for 3D effect
      
      console.log(`🏗️ Creating territory for ${obj.name} with modelUrl: ${obj.modelUrl}`);
      
      territories.push({
        id: obj.id || `custom_${index}`,
        name: obj.name || `Neural Node ${index + 1}`,
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ],
        cost: obj.cost || (300 + (index * 50)),
        concept: obj.concept || 'Neural Processing',
        modelUrl: obj.modelUrl, // Preserve the modelUrl
        color: obj.color || `hsl(${(index * 137.5) % 360}, 70%, 60%)`,
        owner: obj.owner || null,
        difficulty: obj.difficulty || 2,
        description: obj.description || `A neural territory representing ${obj.name}`,
        // Preserve original data for debugging
        _debug: {
          originalObject: obj,
          hasModelUrl: !!obj.modelUrl,
          extractedFrom: 'customObjects'
        }
      });
    });
    
    console.log(`🗺️ Generated ${territories.length} territories from custom objects`);
    
  } else {
    // Default neural nodes if no custom objects
    const defaultNodes = [
      { name: 'Frontal Cortex', concept: 'Executive Functions', color: '#4A90E2' },
      { name: 'Hippocampus', concept: 'Memory Formation', color: '#E24A90' },
      { name: 'Cerebellum', concept: 'Motor Control', color: '#22c55e' },
      { name: 'Brain Stem', concept: 'Vital Functions', color: '#FFD700' },
      { name: 'Occipital Lobe', concept: 'Visual Processing', color: '#FF6B35' },
    ];
    
    defaultNodes.forEach((node, index) => {
      const angle = (index / defaultNodes.length) * Math.PI * 2;
      const radius = 12 + (index % 2) * 6;
      const height = (Math.sin(angle * 3) * 3);
      
      territories.push({
        id: `default_${index}`,
        name: node.name,
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ],
        cost: 250 + (index * 75),
        concept: node.concept,
        modelUrl: null, // Will use default geometric shapes
        color: node.color,
        owner: null,
        difficulty: 2,
        description: `A neural territory representing ${node.name}`,
        _debug: {
          extractedFrom: 'defaultNodes'
        }
      });
    });
    
    console.log(`🗺️ Generated ${territories.length} default territories`);
  }
  
  return territories;
};

const NeuralConquest = () => {
  const { currentUser } = useAuth();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  // Game State
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State - Only show setup if there's no sessionId
  const [showSetup, setShowSetup] = useState(!sessionId);
  const [showTopicSelector, setShowTopicSelector] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [joinGameId, setJoinGameId] = useState('');
  
  // Neural Network Conquest State
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [showControlsHelp, setShowControlsHelp] = useState(false); // Don't show by default
  
  // Knowledge Challenge State
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionStreak, setQuestionStreak] = useState(0);
  const [earnedSynapse, setEarnedSynapse] = useState(0);
  const [questionBank, setQuestionBank] = useState([]);
  
  // Game UI State
  const [aiThinking, setAiThinking] = useState(false);
  const [gameTheme, setGameTheme] = useState('neural');
  
  // Timer State
  const [gameTimer, setGameTimer] = useState(120); // 2 minutes = 120 seconds
  const [gameStartTime, setGameStartTime] = useState(null);
  const [gameEnded, setGameEnded] = useState(false);
  
  // Refs
  const autosaveInterval = useRef(null);
  const gameTimerInterval = useRef(null);

  // Always run to toggle body class when question modal is active – must be before early returns
  useEffect(() => {
    if (showQuestionModal) {
      document.body.classList.add('nc-question-active');
    } else {
      document.body.classList.remove('nc-question-active');
    }
  }, [showQuestionModal]);

  useEffect(() => {
    const initializeGame = async () => {
      console.log('🎮 Initializing Neural Conquest...', { sessionId, showSetup: !sessionId });
      
      // Test 3D model serving first
      await test3DModelServing();
      
      // Load question bank
      await loadQuestionBank();
      
    if (sessionId) {
        console.log('📦 Loading existing game session:', sessionId);
        // Hide setup screen immediately when sessionId is present
        setShowSetup(false);
        await loadExistingGame();
    } else {
        console.log('🆕 No session ID provided, showing setup');
      setLoading(false);
        setShowSetup(true);
      }
    };

    initializeGame();
  }, [sessionId]);

  // Test backend 3D model serving
  const test3DModelServing = async () => {
    try {
      console.log('🧪 Testing backend 3D model serving...');
      const response = await fetch('/api/test-3d-models');
      const data = await response.json();
      
      console.log('📊 3D Model serving test results:', data);
      
      if (data.success && data.testFiles) {
        // Test actual file access
        for (const testFile of data.testFiles) {
          const fileUrl = `http://localhost:8000${testFile.url}`;
          const accessible = await testModelAccess(fileUrl);
          console.log(`🔍 File access test for ${testFile.filename}: ${accessible ? '✅' : '❌'}`);
        }
      }
      
      return data;
    } catch (error) {
      console.error('❌ 3D model serving test failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Debug function to test model file accessibility
  const testModelAccess = async (modelUrl) => {
    try {
      console.log(`🔍 Testing model accessibility: ${modelUrl}`);
      const response = await fetch(modelUrl, { method: 'HEAD' });
      console.log(`📊 Model access test result:`, {
        url: modelUrl,
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      return response.ok;
    } catch (error) {
      console.error(`❌ Model access test failed for ${modelUrl}:`, error);
      return false;
    }
  };

  const loadQuestionBank = async () => {
    try {
      const data = await getNeuralConquestContent();
      if (data.success && data.questions) {
        setQuestionBank(data.questions);
      }
    } catch (error) {
      console.error('Error loading question bank:', error);
    }
  };

  const loadExistingGame = async () => {
    try {
      setLoading(true);
      const data = await getNeuralConquestSession(sessionId);
      
      if (data.success && data.sessionData) {
        console.log('📦 Loading game session:', data.sessionData);
        console.log('📦 Session territories:', data.sessionData.territories);
        
        // Extract territories from session data with proper modelUrl mapping
        const sessionTerritories = data.sessionData.territories ? 
          Object.values(data.sessionData.territories) : [];
        
        console.log('📦 Raw session territories:', sessionTerritories);
        
        // Process territories with proper modelUrl extraction
        const processedTerritories = sessionTerritories.map((territory, index) => {
          // Extract modelUrl from multiple possible locations
          const modelUrl = territory.modelUrl || territory.model?.url || territory.metadata?.modelUrl;
          
          console.log(`🔍 Processing territory ${territory.name}:`, {
            originalTerritory: territory,
            extractedModelUrl: modelUrl,
            hasModel: !!territory.model,
            modelStructure: territory.model
          });
          
          return {
            ...territory,
            id: territory.id || `territory_${index}`,
            name: territory.name || `Territory ${index + 1}`,
            concept: territory.concept || territory.metadata?.concept || 'Neural Processing',
            modelUrl: modelUrl,
            color: territory.color || `hsl(${(index * 137.5) % 360}, 70%, 60%)`,
            cost: territory.cost || 500,
            difficulty: territory.difficulty || 2,
            owner: territory.owner || null,
            description: territory.description || territory.educationalValue || `A neural territory representing ${territory.name}`,
            // Preserve all original data for debugging
            _original: territory
          };
        });
        
        console.log('🎯 Processed territories:', processedTerritories);
        
        // Test model file accessibility for debugging
        const modelAccessTests = processedTerritories
          .filter(t => t.modelUrl)
          .map(async (territory) => {
            const isAccessible = await testModelAccess(territory.modelUrl);
            console.log(`🔍 Model access test for ${territory.name}: ${isAccessible ? '✅ Accessible' : '❌ Not accessible'}`);
            return { territory: territory.name, modelUrl: territory.modelUrl, accessible: isAccessible };
          });
        
        if (modelAccessTests.length > 0) {
          console.log('🧪 Running model accessibility tests...');
          const testResults = await Promise.all(modelAccessTests);
          console.log('📊 Model accessibility results:', testResults);
        }
        
        // Generate game territories using processed data
        const territories = processedTerritories.length > 0 ? 
          generateNeuralTerritories(processedTerritories) :
          generateNeuralTerritories();
        
        console.log('🗺️ Generated territories for game:', territories);
        
        // Create proper game state structure
        const gameState = createGalaxyExplorationState(
          sessionId,
          data.sessionData.players?.[0]?.name || 'Neural Explorer',
          data.sessionData
        );
        
        // Override territories with our processed ones
        gameState.territories = territories;
        
        console.log('🎮 Final game state:', gameState);
        console.log('🎮 Game state summary:', {
          gameId: gameState.gameId,
          phase: gameState.phase,
          territories: gameState.territories.length,
          players: gameState.players.length,
          hasModelUrls: gameState.territories.filter(t => t.modelUrl).length
        });
        
        setGameState(gameState);
        setSelectedTerritory(null);
        
        // 🕐 Start the game timer when loading existing game
        startGameTimer();
        setShowSetup(false); // Ensure setup screen stays hidden
        toast.success(`Game loaded! ${territories.length} neural nodes ready.`);
      } else {
        console.error('Failed to load game session:', data);
        toast.error('Failed to load game session');
        navigate('/interactive-activities');
      }
    } catch (error) {
      console.error('Error loading game:', error);
      toast.error('Failed to load game');
      navigate('/interactive-activities');
    } finally {
      setLoading(false);
    }
  };

  const startNewGame = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    // Show topic selector for general knowledge
    if (!selectedTopic) {
      setShowTopicSelector(true);
      return;
    }

    try {
      setLoading(true);
      toast.loading('🚀 Creating galaxy with 3D objects...');
      
      const data = await startNeuralConquestGame({
        userId: currentUser.uid,
        topic: selectedTopic.topic || selectedTopic.name,
        difficulty: selectedTopic.difficulty <= 2 ? 'easy' : selectedTopic.difficulty <= 4 ? 'medium' : 'hard',
        gameMode: 'single',
        playerName: playerName.trim(),
        customTopicData: selectedTopic.isCustom ? selectedTopic : null
      });
      
      if (data.success && data.sessionData) {
        const galaxyState = createGalaxyExplorationState(data.sessionData.id, playerName.trim(), data.sessionData);
        setGameState(galaxyState);
        setShowSetup(false);
        setGamePhase(GAME_PHASES.EXPLORATION);
        setupAutosave();
        
        // Navigate to the game URL
        navigate(`/neural-conquest/${data.sessionData.id}`);
        toast.dismiss();
        toast.success(`🌌 Galaxy exploration started! Use WASD to move, mouse to look around.`);
        
        // Hide controls help after 8 seconds
        setTimeout(() => setShowControlsHelp(false), 8000);
      } else {
        toast.dismiss();
        toast.error(data.error || 'Failed to create galaxy exploration');
        setError(data.error || 'Failed to create galaxy exploration');
      }
    } catch (error) {
      console.error('Error starting new game:', error);
      toast.dismiss();
      toast.error('Failed to start galaxy exploration');
      setError('Failed to start galaxy exploration');
    } finally {
      setLoading(false);
    }
  };

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
    setShowTopicSelector(false);
    toast.success(`Selected ${topic.name}! Starting game...`);
    // Auto-start the game after topic selection
    setTimeout(() => startNewGame(), 500);
  };

  const joinGame = async () => {
    if (!playerName.trim() || !joinGameId.trim()) {
      toast.error('Please enter both your name and the game ID');
      return;
    }

    try {
      setLoading(true);
      toast.loading('Joining game...');
      
      const data = await joinNeuralConquestGame(joinGameId.trim(), playerName.trim());
      
      if (data.success && data.gameState) {
        setGameState(data.gameState);
        setShowSetup(false);
        setupAutosave();
        
        // Navigate to the game URL
        navigate(`/neural-conquest/${joinGameId}`);
        toast.dismiss();
        toast.success('🎯 Joined game successfully!');
      } else {
        toast.dismiss();
        toast.error(data.message || 'Failed to join game');
        setError(data.message || 'Failed to join game');
      }
    } catch (error) {
      console.error('Error joining game:', error);
      toast.dismiss();
      toast.error('Failed to join game');
      setError('Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  const createGalaxyExplorationState = (gameId, playerName, sessionData) => {
    // Process the 3D objects from the session data
    const territories = sessionData?.territories ? Object.values(sessionData.territories) : [];
    
    // Map backend territories to frontend objects with proper modelUrl
    const neuralNodes = territories.map((territory, index) => {
      const angle = (index / territories.length) * Math.PI * 2;
      const radius = 15 + (index % 3) * 5; // Varying distances from center
      const height = (Math.sin(angle * 3) * 3); // Varying heights
      
      return {
        ...territory,
        id: territory.id || `node_${index}`,
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ],
        // Map backend model.url to frontend modelUrl
        modelUrl: territory.model?.url || territory.modelUrl,
        color: territory.color || `hsl(${(index * 137.5) % 360}, 70%, 60%)`,
        owner: territory.owner || null,
        cost: territory.cost || 500,
        discovered: false,
        questionsAnswered: 0,
        maxQuestions: 3
      };
    });

    return {
      gameId,
      phase: GAME_PHASES.PLAYER_TURN, // Start with player turn, not exploration
      currentPlayerIndex: 0,
      players: [
        {
          id: currentUser.uid,
          name: playerName,
          synapse: 1000, // Restore synapse currency
          territories: [],
          isHuman: true,
          isAI: false,
          color: '#00ff88', // Consistent green for human
          brainType: 'human'
        },
        {
          id: 'neural_ai',
          name: 'Neural AI',
          synapse: 1000,
          territories: [],
          isHuman: false,
          isAI: true,
          color: '#ff4444', // Consistent red for AI
          brainType: 'ai'
        }
      ],
      territories: neuralNodes, // Use the processed neural nodes
      questionPool: sessionData?.questionPool || [],
      topicData: sessionData?.topicData || null,
      turn: 1,
      gameStartedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  };

  const setupAutosave = () => {
    if (autosaveInterval.current) {
      clearInterval(autosaveInterval.current);
    }
    
    autosaveInterval.current = setInterval(() => {
      if (gameState) {
        saveGameState(gameState);
      }
    }, 30000); // Save every 30 seconds
  };

  const saveGameState = async (state) => {
    try {
      await saveNeuralConquestGameState(state.gameId, state);
    } catch (error) {
      console.error('Error saving game state:', error);
    }
  };

  // 🕐 Timer Functions
  const startGameTimer = () => {
    if (gameTimerInterval.current) {
      clearInterval(gameTimerInterval.current);
    }
    
    setGameStartTime(Date.now());
    setGameTimer(120); // Reset to 2 minutes
    setGameEnded(false);
    
    gameTimerInterval.current = setInterval(() => {
      setGameTimer(prev => {
        if (prev <= 1) {
          // Game ends when timer reaches 0
          endGameByTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000); // Update every second
    
    console.log('⏰ Game timer started - 2 minutes countdown!');
  };

  const endGameByTimer = () => {
    if (gameEnded) return; // Prevent multiple calls
    
    setGameEnded(true);
    clearInterval(gameTimerInterval.current);
    
    if (!gameState || !gameState.players) return;
    
    // Find winner by highest synapse
    const sortedPlayers = [...gameState.players].sort((a, b) => b.synapse - a.synapse);
    const winner = sortedPlayers[0];
    const runnerUp = sortedPlayers[1];
    
    console.log('🏁 Game ended by timer! Final scores:', sortedPlayers.map(p => ({ name: p.name, synapse: p.synapse })));
    
    // Update game state to show game over
    setGameState(prev => ({
      ...prev,
      phase: GAME_PHASES.GAME_OVER,
      winner: winner.id,
      finalScores: sortedPlayers,
      endReason: 'timer'
    }));
    
    // Show victory message
    if (winner.isAI) {
      toast.error(`⏰ TIME'S UP! 🤖 AI WINS! 🏆\n${winner.name}: ${winner.synapse} synapse\n${runnerUp?.name || 'Player'}: ${runnerUp?.synapse || 0} synapse`, {
        duration: 8000,
        style: {
          background: '#ef4444',
          color: 'white',
          fontWeight: 'bold'
        }
      });
    } else {
      const isPlayerWinner = winner.id === gameState.players.find(p => !p.isAI)?.id;
      if (isPlayerWinner) {
        toast.success(`⏰ TIME'S UP! 🎉 YOU WIN! 🏆\nYour Synapse: ${winner.synapse}\nAI Synapse: ${runnerUp?.synapse || 0}`, {
          duration: 8000,
          style: {
            background: '#22c55e',
            color: 'white',
            fontWeight: 'bold'
          }
        });
      } else {
        toast.error(`⏰ TIME'S UP! You lost by ${winner.synapse - (gameState.players.find(p => !p.isAI)?.synapse || 0)} synapse!`, {
          duration: 8000,
          style: {
            background: '#ef4444',
            color: 'white',
            fontWeight: 'bold'
          }
        });
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (gameTimerInterval.current) {
        clearInterval(gameTimerInterval.current);
      }
    };
  }, []);

  const startKnowledgeChallenge = () => {
    if (gameState.phase !== GAME_PHASES.PLAYER_TURN) return;
    
    const question = generateQuestion();
    setCurrentQuestion(question);
    setQuestionStreak(0);
    setEarnedSynapse(0);
    setShowQuestionModal(true);
    
    setGameState(prev => ({ ...prev, phase: GAME_PHASES.KNOWLEDGE_CHALLENGE }));
    toast.success('🧠 Knowledge Challenge started!');
  };

  const generateQuestion = () => {
    // First try to use questions from the session (custom generated questions)
    const sessionQuestions = gameState?.questionPool || gameState?.topicData?.questions;
    
    if (sessionQuestions && sessionQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * sessionQuestions.length);
      return sessionQuestions[randomIndex];
    }
    
    // Fallback to general question bank
    if (questionBank.length > 0) {
      const randomIndex = Math.floor(Math.random() * questionBank.length);
      return questionBank[randomIndex];
    }
    
    // Final fallback question if no questions available
    return {
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correct: 2,
      concept: "Geography"
    };
  };



  const bankSynapse = () => {
    if (earnedSynapse > 0) {
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex].synapse += earnedSynapse;
      
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        phase: GAME_PHASES.CONQUEST
      }));
      
      toast.success(`💰 Banked ${earnedSynapse}Σ!`);
    }
    endKnowledgeChallenge();
  };

  const endObjectChallenge = () => {
    setShowQuestionModal(false);
    setCurrentQuestion(null);
    setQuestionStreak(0);
    setEarnedKnowledge(0);
    setSelectedObject(null);
    
    if (gamePhase === GAME_PHASES.KNOWLEDGE_CHALLENGE) {
      setGamePhase(GAME_PHASES.EXPLORATION);
    }
  };

  const endKnowledgeChallenge = () => {
    endObjectChallenge();
  };

  const handleObjectInteract = (object) => {
    if (!object || gamePhase !== GAME_PHASES.EXPLORATION) return;
    
    setSelectedObject(object);
    
    // Check if object is already fully explored
    if (object.questionsAnswered >= object.maxQuestions) {
      toast.info(`🌟 ${object.name} is fully explored! You've mastered this topic.`);
      return;
    }
    
    // Start knowledge challenge for this object
    startObjectChallenge(object);
  };



  const startObjectChallenge = (object) => {
    if (!object) return;
    
    const question = generateQuestionForObject(object);
    if (!question) {
      toast.error('No questions available for this object');
      return;
    }

    setCurrentQuestion(question);
    setQuestionStreak(0);
    setEarnedKnowledge(0);
    setShowQuestionModal(true);
    setGamePhase(GAME_PHASES.KNOWLEDGE_CHALLENGE);
    
    toast.success(`🧠 Exploring ${object.name}! Answer correctly to gain knowledge.`);
  };

  const generateQuestionForObject = (object) => {
    // First try to use questions from the session that match this object's concept
    const sessionQuestions = gameState?.questionPool || gameState?.topicData?.questions;
    
    if (sessionQuestions && sessionQuestions.length > 0) {
      // Filter questions by concept if available
      const relevantQuestions = sessionQuestions.filter(q => 
        !object.concept || q.concept === object.concept || q.topic === object.name
      );
      
      const questionsToUse = relevantQuestions.length > 0 ? relevantQuestions : sessionQuestions;
      const randomIndex = Math.floor(Math.random() * questionsToUse.length);
      return questionsToUse[randomIndex];
    }
    
    // Fallback to general question bank
    if (questionBank.length > 0) {
      const randomIndex = Math.floor(Math.random() * questionBank.length);
      return questionBank[randomIndex];
    }
    
    // Final fallback question
    return {
      question: `What can you learn from exploring ${object.name}?`,
      options: ["New discoveries", "Scientific knowledge", "Cultural insights", "All of the above"],
      correct: 3,
      concept: object.concept || "General Knowledge"
    };
  };

  const conquerTerritory = () => {
    if (!selectedTerritory || gameState.phase !== GAME_PHASES.PLAYER_TURN) return;
    
    const currentPlayer = gameState.players[0]; // Human player
    
    // Check if player has enough synapse
    if (currentPlayer.synapse < selectedTerritory.cost) {
      toast.error(`Not enough synapse! Need ${selectedTerritory.cost}, have ${currentPlayer.synapse}`);
      return;
    }

    // Check if territory is already owned
    if (selectedTerritory.owner) {
      toast.error('This neural node is already connected!');
      return;
    }
    
    // Start the conquest challenge
    setGameState(prev => ({ ...prev, phase: GAME_PHASES.CONQUEST }));
    
    // Generate question for this territory
    const question = generateQuestionForTerritory(selectedTerritory);
    if (question) {
      setCurrentQuestion(question);
      setShowQuestionModal(true);
    } else {
      toast.error('No questions available for this territory');
      setGameState(prev => ({ ...prev, phase: GAME_PHASES.PLAYER_TURN }));
    }
  };

  const generateQuestionForTerritory = (territory) => {
    if (!questionBank || questionBank.length === 0) {
      console.warn('No question bank available');
      return null;
    }
    
    // Track used questions to prevent repetition
    if (!gameState.usedQuestions) {
      gameState.usedQuestions = new Set();
    }
    
    // Get the current selected topic from gameState
    const currentTopic = gameState?.sessionInfo?.topic || selectedTopic || 'General Knowledge';
    console.log('🎯 Generating question for territory:', territory.name, 'Topic:', currentTopic);
    
    // Priority 1: Find questions that match the territory's specific concept/name
    let relevantQuestions = questionBank.filter(q => {
      if (gameState.usedQuestions.has(q.id)) return false; // Skip used questions
      
      const territoryNameMatch = territory.name && (
        q.question?.toLowerCase().includes(territory.name.toLowerCase()) ||
        q.concept?.toLowerCase().includes(territory.name.toLowerCase()) ||
        territory.name.toLowerCase().includes(q.concept?.toLowerCase() || '')
      );
      
      const territoryConceptMatch = territory.concept && (
        q.concept?.toLowerCase().includes(territory.concept.toLowerCase()) ||
        territory.concept.toLowerCase().includes(q.concept?.toLowerCase() || '') ||
        q.category?.toLowerCase().includes(territory.concept.toLowerCase()) ||
        q.topic?.toLowerCase().includes(territory.concept.toLowerCase())
      );
      
      return territoryNameMatch || territoryConceptMatch;
    });
    
    // Priority 2: If no territory-specific questions, find topic-related questions
    if (relevantQuestions.length === 0) {
      relevantQuestions = questionBank.filter(q => {
        if (gameState.usedQuestions.has(q.id)) return false;
        
        const topicMatch = q.topic?.toLowerCase().includes(currentTopic.toLowerCase()) ||
                          currentTopic.toLowerCase().includes(q.topic?.toLowerCase() || '');
        
        const categoryMatch = q.category?.toLowerCase().includes(currentTopic.toLowerCase()) ||
                             currentTopic.toLowerCase().includes(q.category?.toLowerCase() || '');
        
        const conceptMatch = q.concept?.toLowerCase().includes(currentTopic.toLowerCase()) ||
                            currentTopic.toLowerCase().includes(q.concept?.toLowerCase() || '');
        
        return topicMatch || categoryMatch || conceptMatch;
      });
    }
    
    // Priority 3: If still no questions, use any unused questions
    if (relevantQuestions.length === 0) {
      relevantQuestions = questionBank.filter(q => !gameState.usedQuestions.has(q.id));
    }
    
    // Enhanced fallback - generate territory-specific question if bank is exhausted
    if (relevantQuestions.length === 0) {
      console.log('🔄 Question bank exhausted, generating fresh question');
      // Reset used questions and try again
      gameState.usedQuestions.clear();
      return generateTopicSpecificQuestion(currentTopic, territory);
    }
    
    // Select a random question from relevant ones
    const question = relevantQuestions[Math.floor(Math.random() * relevantQuestions.length)];
    
    if (!question) {
      console.warn('No suitable question found');
      return generateTopicSpecificQuestion(currentTopic, territory);
    }
    
    // Mark question as used
    gameState.usedQuestions.add(question.id);
    
    // Enhance question with territory and topic context
    return {
      ...question,
      territoryContext: {
        territoryName: territory.name,
        concept: territory.concept,
        cost: territory.cost,
        selectedTopic: currentTopic,
        questionSource: 'bank'
      }
    };
  };

  // Generate topic-specific questions when none are found in the bank
  const generateTopicSpecificQuestion = (topic, territory) => {
    const territoryName = territory.name || 'Neural Node';
    const topicQuestions = {
      'Mathematics': [
        {
          question: `What is the derivative of x² in calculus?`,
          options: ['2x', 'x²', '2', 'x'],
          correct: 0,
          difficulty: 2,
          topic: 'Mathematics',
          explanation: 'The derivative of x² is 2x using the power rule'
        },
        {
          question: `What is the Pythagorean theorem?`,
          options: ['a² + b² = c²', 'a + b = c', 'a² = b² + c²', 'a = b + c'],
          correct: 0,
          difficulty: 1,
          topic: 'Mathematics',
          explanation: 'The Pythagorean theorem states that in a right triangle, a² + b² = c²'
        },
        {
          question: `What is the value of π (pi) to two decimal places?`,
          options: ['3.14', '3.41', '2.71', '1.41'],
          correct: 0,
          difficulty: 1,
          topic: 'Mathematics',
          explanation: 'π (pi) is approximately 3.14159, or 3.14 to two decimal places'
        }
      ],
      'Science': [
        {
          question: `What is the chemical symbol for gold?`,
          options: ['Go', 'Au', 'Ag', 'Gd'],
          correct: 1,
          difficulty: 1,
          topic: 'Science',
          explanation: 'Au is the chemical symbol for gold, from the Latin name "aurum"'
        },
        {
          question: `What is the speed of light in a vacuum?`,
          options: ['300,000 km/s', '3,000 km/s', '30,000 km/s', '3,000,000 km/s'],
          correct: 0,
          difficulty: 2,
          topic: 'Science',
          explanation: 'Light travels at approximately 300,000 kilometers per second in a vacuum'
        },
        {
          question: `What is the most abundant gas in Earth's atmosphere?`,
          options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Argon'],
          correct: 1,
          difficulty: 1,
          topic: 'Science',
          explanation: 'Nitrogen makes up about 78% of Earth\'s atmosphere'
        }
      ],
      'History': [
        {
          question: `When did World War II end?`,
          options: ['1944', '1945', '1946', '1943'],
          correct: 1,
          difficulty: 1,
          topic: 'History',
          explanation: 'World War II ended in 1945 with the surrender of Japan'
        },
        {
          question: `Who was the first person to walk on the moon?`,
          options: ['Buzz Aldrin', 'Neil Armstrong', 'John Glenn', 'Alan Shepard'],
          correct: 1,
          difficulty: 1,
          topic: 'History',
          explanation: 'Neil Armstrong was the first human to walk on the moon on July 20, 1969'
        },
        {
          question: `Which ancient wonder of the world was located in Alexandria?`,
          options: ['Hanging Gardens', 'Lighthouse of Alexandria', 'Colossus of Rhodes', 'Temple of Artemis'],
          correct: 1,
          difficulty: 2,
          topic: 'History',
          explanation: 'The Lighthouse of Alexandria was one of the Seven Wonders of the Ancient World'
        }
      ],
      'Geography': [
        {
          question: `What is the capital of Australia?`,
          options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
          correct: 2,
          difficulty: 1,
          topic: 'Geography',
          explanation: 'Canberra is the capital city of Australia'
        },
        {
          question: `Which is the largest continent by area?`,
          options: ['Asia', 'Africa', 'Antarctica', 'South America'],
          correct: 0,
          difficulty: 1,
          topic: 'Geography',
          explanation: 'Asia is the largest continent, covering about 30% of Earth\'s land area'
        },
        {
          question: `What is the longest river in the world?`,
          options: ['Amazon River', 'Nile River', 'Mississippi River', 'Yangtze River'],
          correct: 1,
          difficulty: 2,
          topic: 'Geography',
          explanation: 'The Nile River is generally considered the longest river in the world'
        }
      ],
      'Biology': [
        {
          question: `What is the powerhouse of the cell?`,
          options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Cytoplasm'],
          correct: 1,
          difficulty: 1,
          topic: 'Biology',
          explanation: 'Mitochondria are called the powerhouse of the cell because they produce ATP energy'
        },
        {
          question: `How many chambers does a human heart have?`,
          options: ['2', '3', '4', '5'],
          correct: 2,
          difficulty: 1,
          topic: 'Biology',
          explanation: 'The human heart has four chambers: two atria and two ventricles'
        }
      ]
    };

    // Find the closest topic match
    const topicKey = Object.keys(topicQuestions).find(key => 
      topic.toLowerCase().includes(key.toLowerCase()) || 
      key.toLowerCase().includes(topic.toLowerCase())
    );

    const selectedQuestions = topicQuestions[topicKey] || topicQuestions['Science'];
    const question = selectedQuestions[Math.floor(Math.random() * selectedQuestions.length)];

    return {
      ...question,
      id: `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID
      territoryContext: {
        territoryName: territory.name,
        concept: territory.concept,
        cost: territory.cost,
        selectedTopic: topic,
        questionSource: 'generated'
      }
    };
  };

  // This function has been replaced by the enhanced handleAnswerSelect above

  const executeAITurn = async () => {
    setAiThinking(true);
    
    try {
      // Simulate AI thinking time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const currentGameState = gameState;
      const aiPlayer = currentGameState.players.find(p => p.isAI || p.id === 'neural_ai' || p.id === 'ai');
      
      if (!aiPlayer) {
        console.log('❌ No AI player found');
        setGameState(prev => ({ ...prev, phase: GAME_PHASES.PLAYER_TURN }));
        setAiThinking(false);
        return;
      }
      
      // AI decision making using strategic logic
      const aiDecision = makeAIDecision(currentGameState, aiPlayer);
      
      if (aiDecision.action === 'pass') {
        console.log('🤖 AI has no viable moves, passing turn');
        toast('🤖 AI passes - no viable moves', {
          style: { background: '#6b7280', color: 'white' }
        });
        setGameState(prev => ({ ...prev, phase: GAME_PHASES.PLAYER_TURN }));
        setAiThinking(false);
        return;
      }
      
      // AI attempts conquest using strategic target selection
      const targetTerritory = aiDecision.territory;
      console.log(`🤖 AI strategically targeting: ${targetTerritory.name}`);
      
      // Use the strategic AI conquest processing
      const conquestResult = await processAIConquest(currentGameState, aiPlayer, targetTerritory);
      
      if (conquestResult.success && !conquestResult.failed) {
        // AI succeeded - progressive conquest (not instant 100%)
        const masteryIncrease = 0.2 + (Math.random() * 0.3); // AI gains 20-50% mastery per success
        const currentMastery = targetTerritory.masteryLevel || 0;
        const newMasteryLevel = Math.min(1.0, currentMastery + masteryIncrease);
        const isFullyMastered = newMasteryLevel >= 0.8; // Territory conquered at 80%+ mastery
        
        const updatedTerritories = currentGameState.territories.map(t => 
          t.id === targetTerritory.id ? { 
            ...t, 
            owner: isFullyMastered ? aiPlayer.id : null, // Only set owner when fully mastered
            masteryLevel: newMasteryLevel,
            aiMasteryLevel: newMasteryLevel, // Track AI's progress separately
            lastActivity: Date.now()
          } : t
        );
        
        const updatedPlayers = currentGameState.players.map(p => 
          p.id === aiPlayer.id
            ? { 
                ...p, 
                synapse: p.synapse - Math.floor(targetTerritory.cost * 0.1) + Math.floor(targetTerritory.cost * 0.2), // Smaller cost, smaller reward
                territories: isFullyMastered ? [...new Set([...p.territories, targetTerritory.id])] : p.territories,
                correctAnswers: (p.correctAnswers || 0) + 1
              }
            : p
        );
        
        setGameState(prev => ({
          ...prev,
          territories: updatedTerritories,
          players: updatedPlayers,
          phase: GAME_PHASES.PLAYER_TURN,
          turn: prev.turn + 1
        }));
        
        if (isFullyMastered) {
          toast.error(`🤖 AI CONQUERED ${targetTerritory.name}! AI neural network expanding!`, {
            duration: 4000,
            style: { background: '#ef4444', color: 'white', fontWeight: 'bold' }
          });
    } else {
          const progress = Math.round(newMasteryLevel * 100);
          toast.warn(`🤖 AI forming connections to ${targetTerritory.name}... ${progress}% neural mastery`, {
            duration: 3000,
            style: { background: '#f59e0b', color: 'white' }
          });
        }
        
        // Check for AI victory
        checkVictoryConditions();
        
    } else {
        // AI failed conquest
        const updatedPlayers = currentGameState.players.map(p => 
          p.id === aiPlayer.id
            ? { 
                ...p, 
                synapse: Math.max(0, p.synapse - Math.floor(targetTerritory.cost * 0.2)),
                incorrectAnswers: (p.incorrectAnswers || 0) + 1
              }
            : p
        );
        
        setGameState(prev => ({
          ...prev,
          players: updatedPlayers,
          phase: GAME_PHASES.PLAYER_TURN,
          turn: prev.turn + 1
        }));
        
        toast(`🤖 AI failed to connect to ${targetTerritory.name}. Neural pathways disrupted.`, {
          icon: '💥',
          style: { background: '#6b7280', color: 'white' },
          duration: 3000
        });
      }
      
    } catch (error) {
      console.error('AI turn error:', error);
      setGameState(prev => ({ ...prev, phase: GAME_PHASES.PLAYER_TURN }));
    } finally {
      setAiThinking(false);
    }
  };

  // 🤖 AI DECISION MAKING FUNCTIONS

  // AI decision making algorithm (matches backend logic)
  const makeAIDecision = (gameState, aiPlayer) => {
    // 🔒 AI can only target unowned territories (permanent control implemented)
    const availableTerritories = gameState.territories.filter(t => !t.owner);
    
    if (availableTerritories.length === 0) {
      console.log('🤖 No unowned territories available - all territories permanently controlled');
      return { action: 'pass' };
    }
    
    // AI strategy: prioritize territories by value/cost ratio and difficulty
    const territoryScores = availableTerritories.map(territory => {
      const valueScore = territory.cost || 500;
      const difficultyPenalty = (territory.difficulty || 1) * 100;
      const affordabilityBonus = aiPlayer.synapse >= territory.cost ? 200 : -500;
      
      return {
        territory,
        score: valueScore - difficultyPenalty + affordabilityBonus
      };
    });
    
    // Sort by score and pick the best option
    territoryScores.sort((a, b) => b.score - a.score);
    
    const bestTerritory = territoryScores[0];
    
    if (bestTerritory.score > 0 && aiPlayer.synapse >= bestTerritory.territory.cost) {
      return {
        action: 'conquest',
        territory: bestTerritory.territory
      };
    }
    
    return { action: 'pass' };
  };

  // Process AI conquest attempt (matches backend logic)
  const processAIConquest = async (gameState, aiPlayer, territory) => {
    if (aiPlayer.synapse < territory.cost) {
      return { success: false, message: 'AI insufficient synapse' };
    }
    
    // AI has strategic success rate based on difficulty
    const difficulty = territory.difficulty || 2;
    const baseSuccessRate = 0.6; // Base 60 %
    const difficultyPenalty = (difficulty - 1) * 0.1; // harder nodes tougher
    // Add slight randomness so AI performance varies per turn
    const variability = (Math.random() - 0.5) * 0.2; // ±10 %
    const finalSuccessRate = Math.max(0.25, Math.min(0.85, baseSuccessRate + variability - difficultyPenalty));
    
    const success = Math.random() < finalSuccessRate;
    
    if (success) {
      console.log(`🤖 AI ${aiPlayer.name} successfully conquered ${territory.name}`);
      return {
        success: true,
        message: `AI conquered ${territory.name}`,
        territory
      };
    } else {
      console.log(`🤖 AI ${aiPlayer.name} failed to conquer ${territory.name}`);
      return {
        success: true,
        message: `AI failed to conquer ${territory.name}`,
        failed: true
      };
    }
  };

  const endGame = (winnerId) => {
    const winner = gameState.players.find(p => p.id === winnerId);
    setGameState(prev => ({
      ...prev,
      phase: GAME_PHASES.GAME_OVER,
      winner: winnerId
    }));
    
    if (winnerId === 'human') {
      toast.success(`🧠 NEURAL MASTERY ACHIEVED! 🏆\nYou've formed 100% of your neural connections!\nVictory through synaptic supremacy!`, {
        duration: 6000,
        style: {
          background: '#00ff88',
          color: 'black',
          fontWeight: 'bold'
        }
      });
    } else {
      toast.error(`🤖 AI NEURAL DOMINANCE! 💀\nThe AI has achieved 100% neural connectivity!\nYour synapses have been overwhelmed!`, {
        duration: 6000,
        style: {
          background: '#ff4444',
          color: 'white',
          fontWeight: 'bold'
        }
      });
    }
  };

  const endTurn = () => {
    if (gameState.phase !== GAME_PHASES.CONQUEST) return;
    
    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    const nextPlayer = gameState.players[nextPlayerIndex];
    
    const newGameState = {
      ...gameState,
      currentPlayerIndex: nextPlayerIndex,
      phase: nextPlayer.isHuman ? GAME_PHASES.PLAYER_TURN : GAME_PHASES.AI_TURN,
      turn: nextPlayerIndex === 0 ? gameState.turn + 1 : gameState.turn,
      lastUpdated: new Date().toISOString()
    };
    
    setGameState(newGameState);
    setSelectedTerritory(null);
    
    if (!nextPlayer.isHuman) {
      executeAITurn(newGameState);
    }
    
    toast.info('Turn ended');
    saveGameState(newGameState);
  };

  const copyGameId = () => {
    if (gameState?.gameId) {
      navigator.clipboard.writeText(gameState.gameId);
      toast.success('📋 Game ID copied!');
    }
  };

  // Handle game setup from the new setup component
  const handleGameSetup = async (gameConfig) => {
    try {
      setLoading(true);
      
      console.log('🎮 Starting Neural Conquest with config:', gameConfig);
      
      if (gameConfig.gameMode === 'ai') {
        // AI vs Human game
        const data = await startNeuralConquestGame({
          userId: gameConfig.userId,
          topic: gameConfig.topic.topic || gameConfig.topic.name || gameConfig.topic,
          difficulty: getDifficultyFromTopic(gameConfig.topic),
          gameMode: 'single',
          playerName: gameConfig.playerName,
          customTopicData: gameConfig.topic.isCustom ? gameConfig.topic : null
        });
        
        if (data.success && data.sessionData) {
          const aiGameState = createMultiplayerGameState(
            data.sessionData.id, 
            gameConfig.playerName, 
            data.sessionData,
            ['human', 'ai']
          );
          setGameState(aiGameState);
          setShowSetup(false);
          setupAutosave();
          
          // 🕐 Start the 2-minute countdown timer
          startGameTimer();
          
          navigate(`/neural-conquest/${data.sessionData.id}`);
          toast.success('🧠 Neural Conquest vs AI started!');
        } else {
          throw new Error(data.error || 'Failed to create AI game');
        }
        
      } else {
        // Multiplayer game
        const data = await startNeuralConquestMultiplayer({
          userId: gameConfig.userId,
          topic: gameConfig.topic.topic || gameConfig.topic.name || gameConfig.topic,
          difficulty: getDifficultyFromTopic(gameConfig.topic),
          gameMode: 'multiplayer',
          playerName: gameConfig.playerName,
          maxPlayers: gameConfig.maxPlayers,
          invites: gameConfig.invites,
          customTopicData: gameConfig.topic.isCustom ? gameConfig.topic : null
        });
        
        if (data.success && data.sessionData) {
          const multiplayerGameState = createMultiplayerGameState(
            data.sessionData.id, 
            gameConfig.playerName, 
            data.sessionData,
            data.sessionData.players || [gameConfig.userId]
          );
          setGameState(multiplayerGameState);
          setShowSetup(false);
          setupAutosave();
          
          // 🕐 Start the 2-minute countdown timer
          startGameTimer();
          
          navigate(`/neural-conquest/${data.sessionData.id}`);
          toast.success(`🎮 Multiplayer Neural Conquest created! Share game ID: ${data.sessionData.id}`);
          
          // Setup real-time multiplayer connection
          setupMultiplayerConnection(data.sessionData.id);
      } else {
          throw new Error(data.error || 'Failed to create multiplayer game');
        }
      }
      
    } catch (error) {
      console.error('❌ Error starting game:', error);
      toast.error(error.message || 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine difficulty from topic
  const getDifficultyFromTopic = (topic) => {
    if (typeof topic === 'object' && topic.difficulty) {
      return topic.difficulty <= 2 ? 'easy' : topic.difficulty <= 4 ? 'medium' : 'hard';
    }
    return 'medium'; // Default difficulty
  };

  // Create multiplayer game state with proper player positioning
  const createMultiplayerGameState = (gameId, playerName, sessionData, playerTypes) => {
    // Process the 3D objects from the session data
    const territories = sessionData?.territories ? Object.values(sessionData.territories) : [];
    
    // Map backend territories to frontend objects with proper modelUrl
    const neuralNodes = territories.map((territory, index) => {
      const angle = (index / territories.length) * Math.PI * 2;
      const radius = 15 + (index % 3) * 5;
      const height = (Math.sin(angle * 3) * 3);
      
      return {
        ...territory,
        id: territory.id || `node_${index}`,
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ],
        modelUrl: territory.model?.url || territory.modelUrl,
        color: territory.color || `hsl(${(index * 137.5) % 360}, 70%, 60%)`,
        owner: territory.owner || null,
        cost: territory.cost || 500,
        discovered: false,
        questionsAnswered: 0,
        maxQuestions: 3
      };
    });

    // Create players with proper positioning around center sphere
    const players = createMultiplayerPlayers(playerTypes, playerName, currentUser.uid);

    return {
      gameId,
        phase: GAME_PHASES.PLAYER_TURN,
      currentPlayerIndex: 0,
      players,
      territories: neuralNodes,
      questionPool: sessionData?.questionPool || [],
      topicData: sessionData?.topicData || null,
      turn: 1,
      isMultiplayer: playerTypes.length > 2 || playerTypes.includes('multiplayer'),
      gameStartedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };
  };

  // Create players positioned equidistantly around center sphere
  const createMultiplayerPlayers = (playerTypes, hostName, hostUserId) => {
    const players = [];
    // Updated color scheme - consistent with brain region colors
    const playerColors = ['#00ff88', '#ff4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];
    
    playerTypes.forEach((playerType, index) => {
      // Calculate position equidistantly around center sphere
      const angle = (index / playerTypes.length) * Math.PI * 2;
      const distance = 30; // Distance from center
      const position = [
        Math.cos(angle) * distance,
        0, // Keep at same height as center
        Math.sin(angle) * distance
      ];

      if (playerType === 'human' || index === 0) {
        // Human player (host)
        players.push({
          id: hostUserId,
          name: hostName,
          synapse: 1000,
          territories: [],
          isHuman: true,
          isAI: false,
          isHost: index === 0,
          color: playerColors[index % playerColors.length],
          brainType: 'human',
          position,
          brainRegion: `brain_${index}`,
          connectionStats: { completion: 0, totalConnections: 0, formedConnections: 0 }
        });
      } else if (playerType === 'ai') {
        // AI player - always use red color
        players.push({
          id: `ai_${index}`,
          name: `Neural AI ${index}`,
          synapse: 1000,
          territories: [],
          isHuman: false,
          isAI: true,
          color: '#ff4444', // Always red for AI
          brainType: 'ai',
          position,
          brainRegion: `brain_${index}`,
          connectionStats: { completion: 0, totalConnections: 0, formedConnections: 0 }
        });
      } else {
        // Invited multiplayer player (placeholder until they join)
        players.push({
          id: `player_${index}`,
          name: `Player ${index + 1}`,
          synapse: 1000,
          territories: [],
          isHuman: true,
          isAI: false,
          isInvited: true,
          hasJoined: false,
          color: playerColors[index % playerColors.length],
          brainType: 'human',
          position,
          brainRegion: `brain_${index}`,
          connectionStats: { completion: 0, totalConnections: 0, formedConnections: 0 }
        });
      }
    });

    return players;
  };

  // Setup WebSocket connection for multiplayer
  const setupMultiplayerConnection = (gameId) => {
    // TODO: Implement WebSocket connection for real-time multiplayer
    console.log('🔌 Setting up multiplayer connection for game:', gameId);
    
    // This will be implemented with Socket.io or WebSocket
    // For now, we'll use polling to check for updates
    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get(`/neural-conquest/${gameId}/state`);
        if (response.data.success && response.data.gameState) {
          const updatedState = response.data.gameState;
          setGameState(prev => ({
            ...prev,
            ...updatedState,
            lastUpdated: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('Error polling game state:', error);
      }
    }, 5000); // Poll every 5 seconds

    // Store interval for cleanup
    if (autosaveInterval.current) {
      clearInterval(autosaveInterval.current);
    }
    autosaveInterval.current = pollInterval;
  };

  // Loading state
  if (loading) {
    return (
      <div className="neural-conquest-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="loading-spinner-large"
        >
          <Brain />
        </motion.div>
        <h2>Loading Neural Conquest...</h2>
        <p>Initializing the knowledge battleground</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="neural-conquest-error">
        <h2>🚨 Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/activities')}>Back to Activities</button>
      </div>
    );
  }

  // Setup screen - Enhanced for visibility
  if (showSetup || !sessionId) {
    console.log('🎮 Rendering setup screen - showSetup:', showSetup, 'sessionId:', sessionId);
    return (
      <div className="neural-conquest-setup" style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.98) 0%, rgba(22, 33, 62, 0.98) 50%, rgba(15, 52, 96, 0.98) 100%)'
      }}>
        <Toaster position="top-center" />
        <GameSetup 
          onGameStart={handleGameSetup}
          currentUser={currentUser}
        />
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="neural-conquest-error">
        <h2>🚨 Game Data Error</h2>
        <p>Game state is missing or invalid.</p>
        <button onClick={() => navigate('/activities')}>Back to Activities</button>
      </div>
    );
  }

  // Handle territory click with automatic question flow
  const handleTerritoryClick = (territory) => {
    console.log('🎯 Territory clicked:', territory.name, 'Phase:', gameState.phase);
    
    // Always show territory info
    setSelectedTerritory(territory);
    
    // If it's not the player's turn or game is over, just show info
    if (gameState.phase !== GAME_PHASES.PLAYER_TURN) {
      if (gameState.phase === GAME_PHASES.AI_TURN) {
        toast.info('🤖 Wait for AI to complete their turn');
      } else if (gameState.phase === GAME_PHASES.GAME_OVER) {
        toast.info('🏁 Game Over! Check the final scores.');
      } else {
        toast.info('⏸️ Wait for your turn');
      }
      return;
    }
    
    // Get current player
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // 🔒 PERMANENT CONTROL: If territory is already owned, it cannot be conquered
    if (territory.owner) {
      const owner = gameState.players.find(p => p.id === territory.owner);
      const isOwnTerritory = territory.owner === currentPlayer.id;
      
      if (isOwnTerritory) {
        toast.info(`✅ ${territory.name} is under your neural control!`, {
          icon: '🧠',
          style: { background: '#22c55e', color: 'white' }
        });
      } else {
        toast.error(`🔒 ${territory.name} is permanently controlled by ${owner?.name || 'Unknown Player'}! Find another territory to conquer.`, {
          duration: 3000,
          style: { background: '#ef4444', color: 'white' }
        });
      }
      return;
    }
    
    // Check if player has enough synapse
    if (currentPlayer.synapse < territory.cost) {
      toast.error(`💰 Not enough synapse! Need ${territory.cost}, have ${currentPlayer.synapse}`);
      return;
    }
    
    // Automatically start question challenge for unowned territory
    startTerritoryConquest(territory, currentPlayer);
  };

  // Streamlined territory conquest with automatic question flow
  const startTerritoryConquest = async (territory, player) => {
    console.log('🚀 Starting conquest for:', territory.name, 'by:', player.name);
    setGameState(prev => ({ ...prev, phase: GAME_PHASES.CONQUEST }));

    try {
      const res = await neuralConquestAPI.startTerritoryQuestion(params.sessionId || sessionId, territory.id);
      if (!res || res.success === false) {
        toast.error('❌ No questions available for this territory');
        setGameState(prev => ({ ...prev, phase: GAME_PHASES.PLAYER_TURN }));
        return;
      }
      const question = res.question || res.data?.question;
      if (!question) {
        toast.error('❌ No questions available for this territory');
        setGameState(prev => ({ ...prev, phase: GAME_PHASES.PLAYER_TURN }));
        return;
      }
      const conquestQuestion = {
        ...question,
        conquestContext: {
          territory,
          player,
          cost: territory.cost,
          reward: calculateConquestReward(territory, player)
        }
      };
      setCurrentQuestion(conquestQuestion);
      setShowQuestionModal(true);
      toast.success(`🧠 Neural Challenge: ${territory.name}!`, { duration: 2000 });
    } catch (e) {
      console.error(e);
      toast.error('❌ Failed to load question for this territory');
      setGameState(prev => ({ ...prev, phase: GAME_PHASES.PLAYER_TURN }));
    }
  };

  // Calculate conquest rewards based on territory and player stats
  const calculateConquestReward = (territory, player) => {
    const baseReward = 100;
    const territoryBonus = Math.floor(territory.cost * 0.2);
    const streakBonus = questionStreak * 25;
    const difficultyMultiplier = territory.difficulty || 1;
    
    return Math.floor((baseReward + territoryBonus + streakBonus) * difficultyMultiplier);
  };

  // Enhanced answer handling with smoother flow
  const handleAnswerSelect = async (selectedAnswer) => {
    if (!currentQuestion) return;
    
    // Robust answer validation - handle different answer formats
    let correctAnswer = currentQuestion.correct;
    if (correctAnswer === undefined || correctAnswer === null) {
      correctAnswer = currentQuestion.correctAnswer;
    }
    
    // Ensure we're comparing numbers to numbers
    const selectedIndex = parseInt(selectedAnswer);
    const correctIndex = parseInt(correctAnswer);
    
    console.log('🎯 Answer validation:', {
      selectedAnswer,
      selectedIndex,
      correctAnswer,
      correctIndex,
      question: currentQuestion.question,
      options: currentQuestion.options
    });
    
    const isCorrect = selectedIndex === correctIndex;
    const conquestContext = currentQuestion.conquestContext;
    
    if (!conquestContext) {
      console.error('No conquest context found in question');
      return;
    }
    
    const { territory, player } = conquestContext;
    
    // Show immediate feedback
    setShowQuestionModal(false);
    
    if (isCorrect) {
      // 🎉 CORRECT ANSWER - Conquest successful!
      await handleCorrectAnswer(territory, player);
    } else {
      // ❌ WRONG ANSWER - Conquest failed
      await handleIncorrectAnswer(territory, player);
    }
    
    // Clear current question and territory selection
    setCurrentQuestion(null);
    setSelectedTerritory(null);
    
    // Check for victory conditions
    checkVictoryConditions();
    
    // Advance to next turn
    advanceToNextTurn();
  };

  // Handle correct answer with enhanced rewards and feedback
  const handleCorrectAnswer = async (territory, player) => {
    const masteryIncrease = 0.15 + (questionStreak * 0.05);
    const reward = calculateConquestReward(territory, player);
    
    // Update territory with mastery and ownership
    const updatedTerritories = gameState.territories.map(t => {
      if (t.id === territory.id) {
        const newMasteryLevel = Math.min(1.0, (t.masteryLevel || 0) + masteryIncrease);
        const isFullyMastered = newMasteryLevel >= 0.8;
        
        return { 
          ...t, 
          masteryLevel: newMasteryLevel,
          owner: isFullyMastered ? player.id : null,
          correctAnswers: (t.correctAnswers || 0) + 1,
          lastActivity: Date.now(),
          conqueredBy: isFullyMastered ? player.id : t.conqueredBy
        };
      }
      return t;
    });
    
    // Update player stats
    const updatedPlayers = gameState.players.map(p => 
      p.id === player.id
        ? { 
            ...p, 
            synapse: p.synapse - territory.cost + reward,
            territories: updatedTerritories.find(t => t.id === territory.id)?.owner === player.id
              ? [...new Set([...p.territories, territory.id])]
              : p.territories,
            correctAnswers: (p.correctAnswers || 0) + 1
          }
        : p
    );
    
    // Update game state
    setGameState(prev => ({
      ...prev,
      territories: updatedTerritories,
      players: updatedPlayers,
      phase: GAME_PHASES.PLAYER_TURN
    }));
    
    // Update streak
    setQuestionStreak(prev => prev + 1);
    
    // Show success feedback
    const masteredTerritory = updatedTerritories.find(t => t.id === territory.id);
    const connectionProgress = Math.round(masteredTerritory.masteryLevel * 100);
    
    if (masteredTerritory.owner === player.id) {
      toast.success(`🏆 ${territory.name} CONQUERED! +${reward} synapse`, {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          color: 'white',
          fontWeight: 'bold'
        }
      });
    } else {
      toast.success(`🔗 Neural connections forming in ${territory.name}... ${connectionProgress}% complete! +${reward} synapse`, {
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, #4A90E2 0%, #3b82f6 100%)',
          color: 'white'
        }
      });
    }
  };

  // Handle incorrect answer with penalties
  const handleIncorrectAnswer = async (territory, player) => {
    const masteryDecrease = 0.05;
    const penalty = Math.floor(territory.cost * 0.3);
    
    // Update territory (weaken connections)
    const updatedTerritories = gameState.territories.map(t => 
      t.id === territory.id 
        ? { 
            ...t, 
            masteryLevel: Math.max(0, (t.masteryLevel || 0) - masteryDecrease),
            incorrectAnswers: (t.incorrectAnswers || 0) + 1,
            lastActivity: Date.now()
          }
        : t
    );
    
    // Update player stats
    const updatedPlayers = gameState.players.map(p => 
      p.id === player.id
        ? { 
            ...p, 
            synapse: Math.max(0, p.synapse - penalty),
            incorrectAnswers: (p.incorrectAnswers || 0) + 1
          }
        : p
    );
    
    // Update game state
    setGameState(prev => ({
      ...prev,
      territories: updatedTerritories,
      players: updatedPlayers,
      phase: GAME_PHASES.PLAYER_TURN
    }));
    
    // Reset streak
    setQuestionStreak(0);
    
    // Show failure feedback
    toast.error(`💥 Neural connection to ${territory.name} failed! Lost ${penalty} synapse`, {
      duration: 3000,
      style: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white'
      }
    });
  };

  // Check for victory conditions
  const checkVictoryConditions = () => {
    if (window.neuralConquestConnections) {
      gameState.players.forEach(player => {
        const playerConnections = window.neuralConquestConnections[player.id];
        if (playerConnections && playerConnections.completion >= 1.0) {
          endGame(player.id);
        }
      });
    }
  };

  // Enhanced turn management
  const advanceToNextTurn = () => {
    if (gameState.isMultiplayer) {
      // Multiplayer turn advancement
      const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
      const nextPlayer = gameState.players[nextPlayerIndex];
      
      setGameState(prev => ({
        ...prev,
        currentPlayerIndex: nextPlayerIndex,
        phase: nextPlayer.isAI ? GAME_PHASES.AI_TURN : GAME_PHASES.PLAYER_TURN,
        turn: nextPlayerIndex === 0 ? prev.turn + 1 : prev.turn,
        lastUpdated: new Date().toISOString()
      }));
      
      // Show turn notification
      if (nextPlayer.isAI) {
        toast(`🤖 ${nextPlayer.name}'s turn`, {
          icon: '🎯',
          style: { background: '#6b7280', color: 'white' }
        });
        // Start AI turn
        setTimeout(() => executeAITurn(), 1000);
      } else {
        toast.success(`🧠 ${nextPlayer.name}'s turn!`, {
          duration: 2000
        });
      }
    } else {
      // Single player vs AI
      setGameState(prev => ({ ...prev, phase: GAME_PHASES.AI_TURN }));
      toast(`🤖 AI's turn`, {
        icon: '🎯',
        style: { background: '#6b7280', color: 'white' }
      });
      setTimeout(() => executeAITurn(), 1500);
    }
  };

  // Moved earlier to maintain stable hook order

  return (
    <div className="neural-conquest" style={{ height: '100vh', overflow: 'hidden' }}>
      <Toaster position="top-center" />
      
      {/* Neural Conquest Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="game-header"
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          zIndex: 10,
          height: '80px',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          borderBottom: '2px solid #4A90E2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem'
        }}
      >
        <div className="player-info">
          <h2 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Brain className="game-icon" size={24} style={{ color: '#4A90E2' }} />
            Neural Conquest
          </h2>
          <div className="current-player" style={{ fontSize: '0.9rem', color: '#aaa' }}>
            {gameState.phase === GAME_PHASES.PLAYER_TURN ? '🧠 Your Turn' : 
             gameState.phase === GAME_PHASES.AI_TURN ? '🤖 AI Turn' : 
             'Thinking...'}
          </div>
        </div>
        
        <div className="synapse-display" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* ⏰ Game Timer Display */}
          <div style={{ 
            background: gameTimer <= 30 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)', 
            padding: '0.5rem 1rem', 
            borderRadius: '10px',
            border: `1px solid ${gameTimer <= 30 ? '#ef4444' : '#22c55e'}`,
            color: 'white',
            animation: gameTimer <= 10 ? 'pulse 0.5s infinite' : 'none'
          }}>
            <Clock style={{ color: gameTimer <= 30 ? '#ef4444' : '#22c55e', marginRight: '0.5rem' }} size={16} />
            {formatTime(gameTimer)}
          </div>
          
          <div style={{ 
            background: 'rgba(74, 144, 226, 0.2)', 
            padding: '0.5rem 1rem', 
            borderRadius: '10px',
            border: '1px solid #4A90E2',
            color: 'white'
          }}>
            <Zap style={{ color: '#FFD700', marginRight: '0.5rem' }} size={16} />
            {gameState.players?.[0]?.synapse || 0} Synapse
          </div>
          <div className="game-id-section" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="text"
              value={gameState.gameId}
              readOnly
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid #555',
                color: 'white',
                padding: '0.3rem 0.5rem',
                borderRadius: '5px',
                fontSize: '0.8rem',
                width: '120px'
              }}
            />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={copyGameId}
              style={{
                background: '#4A90E2',
                border: 'none',
                color: 'white',
                padding: '0.3rem',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              <Copy size={14} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Neural Network 3D Battlefield */}
      <div style={{ 
        position: 'absolute',
        top: '80px', 
        left: 0, 
        right: '350px', 
        bottom: 0,
        background: 'linear-gradient(135deg, #000428 0%, #004e92 100%)',
        overflow: 'hidden'
      }}>
        <Canvas 
          camera={{ position: [0, 5, 25], fov: 75 }}
          style={{ width: '100%', height: '100%' }}
          shadows
          gl={{ antialias: true, alpha: false }}
        >
            <Suspense fallback={null}>
            <NeuralNetworkEnvironment
              territories={gameState.territories || []}
                onTerritoryClick={handleTerritoryClick}
              selectedTerritory={selectedTerritory}
              gamePhase={gameState.phase}
              players={gameState.players || []}
              questionModalActive={showQuestionModal}
              />
            </Suspense>
          <Loader />
          </Canvas>
        
        {/* Movement Instructions Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '1rem',
          borderRadius: '10px',
          fontSize: '0.9rem',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(74, 144, 226, 0.3)'
        }}>
          <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#4A90E2' }}>
            🧠 Neural Navigation
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
            <span>W,A,S,D:</span><span>Move around</span>
            <span>Mouse:</span><span>Look around</span>
            <span>Space:</span><span>Fly up</span>
            <span>Shift:</span><span>Fly down</span>
            <span>Click:</span><span>Lock mouse (ESC to unlock)</span>
          </div>
        </div>

        {/* Position Indicator */}
        {selectedTerritory && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(74, 144, 226, 0.9)',
            color: 'white',
            padding: '0.8rem 1.2rem',
            borderRadius: '10px',
            fontSize: '0.9rem',
            backdropFilter: 'blur(10px)',
            fontWeight: 'bold'
          }}>
            🎯 Target: {selectedTerritory.name}
          </div>
        )}
      </div>

      {/* Neural Conquest Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        style={{
          position: 'absolute',
          top: '80px',
          right: 0,
          width: '350px',
          height: 'calc(100vh - 80px)',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderLeft: '2px solid #4A90E2',
          overflowY: 'auto',
          padding: '1rem'
        }}
        >
          {/* Current Player Info */}
        <div style={{
          background: 'rgba(74, 144, 226, 0.1)',
          border: '1px solid #4A90E2',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h3 style={{ margin: '0 0 0.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Brain size={20} style={{ color: '#4A90E2' }} />
            {gameState.players?.[0]?.name || 'Neural Commander'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>
            <div>⚡ Synapse: {gameState.players?.[0]?.synapse || 0}</div>
            <div>🧠 Nodes: {gameState.territories?.filter(t => t.owner === gameState.players?.[0]?.id).length || 0}</div>
            <div>🎯 Turn: {gameState.turn || 1}</div>
            <div>🏆 Phase: {gameState.phase?.replace('_', ' ') || 'Setup'}</div>
            </div>
              </div>

        {/* Selected Territory Info */}
        {selectedTerritory && (
          <div style={{
            background: 'rgba(228, 74, 144, 0.1)',
            border: '1px solid #E24A90',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <h4 style={{ margin: '0 0 0.5rem', color: 'white' }}>{selectedTerritory.name}</h4>
            <p style={{ margin: '0 0 1rem', color: '#ccc', fontSize: '0.8rem' }}>
              {selectedTerritory.description || 'A neural node to conquer'}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ 
                background: 'rgba(255,215,0,0.2)', 
                color: '#FFD700', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '5px', 
                fontSize: '0.8rem' 
              }}>
                ⚡ {selectedTerritory.cost} Synapse
              </span>
              {selectedTerritory.owner && (
                <span style={{ 
                  background: selectedTerritory.owner === gameState.players?.[0]?.id ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', 
                  color: selectedTerritory.owner === gameState.players?.[0]?.id ? '#22c55e' : '#ef4444', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '5px', 
                  fontSize: '0.8rem' 
                }}>
                  {selectedTerritory.owner === gameState.players?.[0]?.id ? '🧠 Your Node' : '🤖 AI Node'}
                </span>
              )}
              </div>

                         {gameState.phase === GAME_PHASES.PLAYER_TURN && !selectedTerritory.owner && (
              <div style={{
                padding: '0.5rem 1rem',
                marginTop: '0.5rem',
                background: 'rgba(74, 144, 226, 0.2)',
                border: '1px solid #4A90E2',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '0.9rem',
                color: '#4A90E2'
              }}>
                <Zap size={16} style={{ marginRight: '0.5rem' }} />
                Click neural node to attempt connection
            </div>
            )}
          </div>
        )}

        {/* Territory Selection & Conquest */}
              {selectedTerritory && (
          <div style={{
            background: 'rgba(74, 144, 226, 0.1)',
            border: '1px solid #4A90E2',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <h4 style={{ margin: '0 0 0.5rem', color: '#4A90E2', fontSize: '1.1rem' }}>
              🎯 Selected Neural Node
            </h4>
            <div style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {selectedTerritory.name}
                  </div>
            <div style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {selectedTerritory.concept}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <div style={{ color: '#FFD700' }}>⚡ Cost: {selectedTerritory.cost}</div>
              <div style={{ color: selectedTerritory.owner ? '#22c55e' : '#ccc' }}>
                {selectedTerritory.owner ? '🧠 Connected' : '❓ Available'}
              </div>
            </div>
            
            {gameState.phase === 'PLAYER_TURN' && !selectedTerritory.owner && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={conquerTerritory}
                disabled={gameState.players[0].synapse < selectedTerritory.cost}
                style={{
                  background: gameState.players[0].synapse >= selectedTerritory.cost ? 
                    'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 
                    'rgba(107, 114, 128, 0.5)',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem 1.5rem',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  cursor: gameState.players[0].synapse >= selectedTerritory.cost ? 'pointer' : 'not-allowed',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Zap size={16} />
                {gameState.players[0].synapse >= selectedTerritory.cost ? 
                  'Connect Neural Node' : 
                  'Insufficient Synapse'
                }
                  </motion.button>
            )}
            
            {selectedTerritory.owner && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.2)',
                color: '#22c55e',
                padding: '0.8rem',
                borderRadius: '10px',
                textAlign: 'center',
                fontSize: '0.9rem'
              }}>
                ✅ Neural connection established
              </div>
            )}
                </div>
              )}
              
        {/* Game End Screen */}
        {gameState.phase === GAME_PHASES.GAME_OVER && (
          <div style={{
            background: 'rgba(74, 144, 226, 0.15)',
            border: '2px solid #4A90E2',
            borderRadius: '15px',
            padding: '1.5rem',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 1rem', color: 'white', fontSize: '1.5rem' }}>
              🏁 GAME OVER
            </h3>
            
            {gameState.finalScores && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem', color: '#4A90E2' }}>Final Rankings:</h4>
                {gameState.finalScores.map((player, index) => (
                  <div key={player.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem',
                    background: index === 0 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    marginBottom: '0.3rem',
                    border: index === 0 ? '1px solid #ffd700' : '1px solid transparent'
                  }}>
                    <span style={{ 
                      color: 'white', 
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {index === 0 ? '🏆' : `${index + 1}.`}
                      {player.isAI ? '🤖' : '👤'} {player.name}
                    </span>
                    <div style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      fontSize: '0.8rem', 
                      color: index === 0 ? '#ffd700' : '#ccc' 
                    }}>
                      <span>⚡ {player.synapse}</span>
                      <span>🧠 {gameState.territories?.filter(t => t.owner === player.id).length || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#ccc',
              fontStyle: 'italic',
              marginTop: '1rem'
            }}>
              {gameState.endReason === 'timer' ? '⏰ Time limit reached' : '🎯 Victory condition met'}
                  </div>
                    </div>
        )}

        {/* Neural Network Map */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(74, 144, 226, 0.3)',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h4 style={{ margin: '0 0 1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Brain size={18} />
            Neural Network Status
          </h4>
          
          <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
            {gameState.territories?.map((territory, index) => {
              const isCurrentTurn = gameState.phase === GAME_PHASES.PLAYER_TURN && gameState.players[gameState.currentPlayerIndex]?.isHuman;
              const isSelectable = !territory.owner && isCurrentTurn;

              return (
                <motion.div
                  key={territory.id || index}
                  whileHover={isSelectable ? { scale: 1.03 } : {}}
                  animate={isSelectable ? { opacity: [0.6, 1, 0.6] } : { opacity: 1 }}
                  transition={isSelectable ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    background: territory.id === selectedTerritory?.id ?
                      'rgba(74, 144, 226, 0.25)' :
                      'rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    border: territory.id === selectedTerritory?.id ?
                      '1px solid #4A90E2' :
                      '1px solid transparent',
                    boxShadow: isSelectable ? '0 0 6px rgba(255,255,255,0.2)' : 'none'
                  }}
                  onClick={() => setSelectedTerritory(territory)}
                >
                  <span style={{
                    color: territory.owner === 'human' ? '#22c55e' :
                          territory.owner === 'ai' ? '#ef4444' : '#ccc',
                    fontWeight: 600
                  }}>
                    {territory.owner === 'human' ? '🧠' :
                     territory.owner === 'ai' ? '🤖' : '⚪'} {territory.name}
                  </span>
                  <span style={{ color: '#FFD700', fontSize: '0.8rem' }}>
                    ⚡{territory.cost}
                  </span>
                </motion.div>
              );
            })}
                    </div>
                  </div>
        
        {/* Game Controls */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(74, 144, 226, 0.3)',
          borderRadius: '10px',
          padding: '1rem'
        }}>
          <h4 style={{ margin: '0 0 1rem', color: 'white' }}>🎮 Game Controls</h4>
          
          <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.8rem', color: '#ccc' }}>
            <div><strong style={{ color: '#4A90E2' }}>Movement:</strong> WASD + Mouse</div>
            <div><strong style={{ color: '#4A90E2' }}>Fly:</strong> Space (up) / Shift (down)</div>
            <div><strong style={{ color: '#4A90E2' }}>Select:</strong> Click neural nodes</div>
            <div><strong style={{ color: '#4A90E2' }}>Conquer:</strong> Answer questions correctly</div>
            <div><strong style={{ color: '#4A90E2' }}>Goal:</strong> Connect 50%+ neural nodes</div>
                </div>
          
          {gameState.phase === 'GAME_OVER' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/activities')}
              style={{
                background: 'linear-gradient(135deg, #4A90E2 0%, #3b82f6 100%)',
                color: 'white',
                border: 'none',
                padding: '0.8rem 1.5rem',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%',
                marginTop: '1rem'
              }}
            >
              Return to Activities
              </motion.button>
          )}
          </div>
        </motion.div>

      {/* Question Modal for Territory Conquest */}
      <AnimatePresence>
        {showQuestionModal && currentQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)'
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                borderRadius: '20px',
                padding: '2rem',
                maxWidth: '600px',
                width: '90%',
                border: '2px solid #4A90E2',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
              }}
            >
              {/* Question Header */}
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '2rem',
                borderBottom: '1px solid rgba(74, 144, 226, 0.3)',
                paddingBottom: '1rem'
              }}>
                <h3 style={{ 
                  color: '#4A90E2', 
                  margin: '0 0 0.5rem', 
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}>
                  <Brain size={24} />
                  Neural Connection Challenge
                </h3>
                {selectedTerritory && (
                  <div style={{ color: '#ccc', fontSize: '1rem' }}>
                    🎯 Connecting to: <strong style={{ color: 'white' }}>{selectedTerritory.name}</strong>
                </div>
                )}
                {currentQuestion.territoryContext && (
                  <div style={{ 
                    color: '#aaa', 
                    fontSize: '0.9rem', 
                    marginTop: '0.5rem',
                    background: 'rgba(74, 144, 226, 0.1)',
                    padding: '0.5rem 1rem',
                    borderRadius: '10px',
                    display: 'inline-block'
                  }}>
                    ⚡ Cost: {currentQuestion.territoryContext.cost} Synapse
                  </div>
                )}
              </div>
              
              {/* Question Content */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ 
                  color: 'white', 
                  fontSize: '1.2rem', 
                  marginBottom: '1.5rem',
                  lineHeight: '1.4'
                }}>
                  {currentQuestion.question}
                </h4>

                {/* Answer Options */}
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {currentQuestion.options?.map((option, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ 
                        scale: 1.03, 
                        x: 8,
                        boxShadow: '0 8px 25px rgba(74, 144, 226, 0.3)'
                      }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAnswerSelect(index)}
                      style={{
                        background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.15) 0%, rgba(74, 144, 226, 0.08) 100%)',
                        border: '2px solid rgba(74, 144, 226, 0.4)',
                        color: 'white',
                        padding: '1.2rem 1.8rem',
                        borderRadius: '20px',
                        fontSize: '1.1rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.2rem',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                        backdropFilter: 'blur(5px)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, rgba(74, 144, 226, 0.25) 0%, rgba(74, 144, 226, 0.15) 100%)';
                        e.target.style.borderColor = '#4A90E2';
                        e.target.style.transform = 'translateX(5px)';
                        e.target.style.boxShadow = '0 8px 25px rgba(74, 144, 226, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, rgba(74, 144, 226, 0.15) 0%, rgba(74, 144, 226, 0.08) 100%)';
                        e.target.style.borderColor = 'rgba(74, 144, 226, 0.4)';
                        e.target.style.transform = 'translateX(0px)';
                        e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                      }}
                    >
                      {/* Subtle animated background */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(74, 144, 226, 0.1) 50%, transparent 100%)',
                        transform: 'translateX(-100%)',
                        transition: 'transform 0.6s ease'
                      }} />
                      
                      <div style={{
                        background: 'linear-gradient(135deg, #4A90E2 0%, #3B7DD8 100%)',
                        color: 'white',
                        width: '35px',
                        height: '35px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        boxShadow: '0 2px 8px rgba(74, 144, 226, 0.3)',
                        zIndex: 1
                      }}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span style={{ zIndex: 1, flex: 1 }}>{option}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
              
              {/* Enhanced Question Stats with Streak Effects */}
              {questionStreak > 0 && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{
                    textAlign: 'center',
                    padding: '1.2rem',
                    background: questionStreak >= 3 
                      ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(34, 197, 94, 0.15) 100%)'
                      : 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(74, 144, 226, 0.1) 100%)',
                    borderRadius: '15px',
                    border: `2px solid ${questionStreak >= 3 ? 'rgba(251, 191, 36, 0.4)' : 'rgba(34, 197, 94, 0.4)'}`,
                    color: questionStreak >= 3 ? '#fbbf24' : '#22c55e',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: `0 8px 25px ${questionStreak >= 3 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
                  }}
                >
                  {/* Streak fire animation */}
                                         {questionStreak >= 3 && (
                     <div style={{
                       position: 'absolute',
                       top: 0,
                       left: 0,
                       right: 0,
                       bottom: 0,
                       background: 'linear-gradient(45deg, transparent 30%, rgba(251, 191, 36, 0.1) 50%, transparent 70%)',
                       transform: 'translateX(-100%)',
                       animation: 'streak-pulse 2s ease-in-out infinite'
                     }} />
                   )}
                  
                  <motion.div
                    animate={{ 
                      scale: questionStreak >= 3 ? [1, 1.1, 1] : [1, 1.05, 1]
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={{ 
                      fontSize: questionStreak >= 3 ? '1.3rem' : '1.1rem',
                      fontWeight: 'bold',
                      zIndex: 1,
                      position: 'relative'
                    }}
                  >
                    {questionStreak >= 3 ? '🔥🚀' : '🔥'} Question Streak: {questionStreak} {questionStreak >= 5 ? '⚡' : ''}
                  </motion.div>
                  
                  <div style={{ 
                    fontSize: '0.9rem', 
                    opacity: 0.9, 
                    marginTop: '0.5rem',
                    zIndex: 1,
                    position: 'relative'
                  }}>
                    {questionStreak >= 5 ? '🏆 LEGENDARY STREAK! 5x Synapse Bonus!' :
                     questionStreak >= 3 ? '⭐ ON FIRE! 3x Synapse Bonus!' :
                     'Bonus synapse earned on correct answers!'}
              </div>
                  
                  {/* Streak milestone celebrations */}
                  {questionStreak === 3 && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        background: '#fbbf24',
                        color: '#1a1a1a',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '15px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        zIndex: 2
                      }}
                    >
                      ON FIRE! 🔥
                    </motion.div>
                  )}
                  
                  {questionStreak === 5 && (
                    <motion.div
                      initial={{ scale: 0, y: -20 }}
                      animate={{ scale: 1, y: 0 }}
                      style={{
                        position: 'absolute',
                        top: '-15px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                        color: '#1a1a1a',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        zIndex: 2,
                        boxShadow: '0 4px 15px rgba(251, 191, 36, 0.5)'
                      }}
                    >
                      🏆 LEGENDARY! 🏆
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Thinking Overlay */}
      <AnimatePresence>
        {aiThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0,0,0,0.9)',
              color: 'white',
              padding: '2rem 3rem',
              borderRadius: '20px',
              zIndex: 999,
              textAlign: 'center',
              border: '2px solid #ef4444',
              backdropFilter: 'blur(10px)'
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ fontSize: '3rem', marginBottom: '1rem' }}
            >
              🤖
            </motion.div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#ef4444' }}>AI Processing</h3>
            <p style={{ margin: 0, color: '#ccc' }}>Neural AI is analyzing neural connections...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Freeze underlying UI when question modal is active */}
      {showQuestionModal && (
        <style>{`
          /* Hide all 3D canvas interactions and HTML overlays */
          body.nc-question-active .r3f-html { visibility: hidden !important; pointer-events: none !important; }
          body.nc-question-active canvas { pointer-events: none !important; }
          
          /* Hide game header and sidebar during question */
          body.nc-question-active .game-header { visibility: hidden !important; }
          body.nc-question-active .neural-conquest > div:not([style*="position: fixed"]) { visibility: hidden !important; }
          
          /* Hide movement instructions overlay */
          body.nc-question-active div[style*="position: absolute"][style*="bottom: 20px"] { visibility: hidden !important; }
          
          /* Hide position indicator */
          body.nc-question-active div[style*="position: absolute"][style*="top: 20px"] { visibility: hidden !important; }
          
          /* Hide Neural Conquest Sidebar */
          body.nc-question-active div[style*="position: absolute"][style*="right: 0"][style*="width: 350px"] { visibility: hidden !important; }
          
          /* Ensure question modal stays visible */
          body.nc-question-active div[style*="position: fixed"][style*="z-index: 1000"] { visibility: visible !important; }
          body.nc-question-active div[style*="position: fixed"][style*="z-index: 1000"] * { visibility: visible !important; }
          
          /* Disable keyboard controls during question */
          body.nc-question-active { 
            overflow: hidden;
          }
        `}</style>
      )}

    </div>
  );
};

// Add custom CSS for streak animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerHTML = `
    @keyframes streak-pulse {
      0%, 100% { 
        opacity: 0.3; 
        transform: translateX(-100%); 
      }
      50% { 
        opacity: 0.6; 
        transform: translateX(100%); 
      }
    }
    
    @keyframes legendary-glow {
      0%, 100% { 
        box-shadow: 0 0 20px rgba(251, 191, 36, 0.3); 
      }
      50% { 
        box-shadow: 0 0 30px rgba(251, 191, 36, 0.6); 
      }
    }
    
    .streak-legendary {
      animation: legendary-glow 2s ease-in-out infinite;
    }
    
    .neural-conquest-setup {
      animation: fadeIn 0.5s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  
  if (!document.head.querySelector('style[data-neural-conquest]')) {
    styleSheet.setAttribute('data-neural-conquest', 'true');
    document.head.appendChild(styleSheet);
  }
}

export default NeuralConquest; 





