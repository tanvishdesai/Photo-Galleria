"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const imagesRef = useRef<THREE.Mesh[]>([]);
  const animationRef = useRef<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const totalImages = 35;

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Initialize camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Initialize renderer with higher quality settings
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Add ambient light with slight blue tint
    const ambientLight = new THREE.AmbientLight(0xe8f1ff, 0.3);
    scene.add(ambientLight);
    
    // Add directional light with slight warm tint
    const directionalLight = new THREE.DirectionalLight(0xfff0e8, 0.7);
    directionalLight.position.set(5, 5, 7);
    scene.add(directionalLight);
    
    // Add point light with slight purple tint
    const pointLight = new THREE.PointLight(0xf8e8ff, 0.6, 10);
    pointLight.position.set(-5, 3, 2);
    scene.add(pointLight);
    
    // Add secondary point light
    const pointLight2 = new THREE.PointLight(0xffffff, 0.4, 8);
    pointLight2.position.set(3, -2, 4);
    scene.add(pointLight2);
    
    // Add spotlight for dramatic effect
    const spotlight = new THREE.SpotLight(0xffffff, 0.8);
    spotlight.position.set(0, 5, 5);
    spotlight.angle = Math.PI / 4;
    spotlight.penumbra = 0.1;
    spotlight.decay = 2;
    spotlight.distance = 200;
    scene.add(spotlight);

    // Load images
    const imageFiles = Array.from({ length: 35 }, (_, i) => 
      `/images/DSCF${3726 + i}.JPG`
    );
    
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "anonymous";
    
    const imagesArray: THREE.Mesh[] = [];

    imageFiles.forEach((src, index) => {
      textureLoader.load(src, (texture) => {
        // Improve texture quality
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        
        // Color correction for the texture - modern Three.js approach
        texture.colorSpace = THREE.SRGBColorSpace;
        
        const aspectRatio = texture.image.width / texture.image.height;
        const width = Math.min(1.5, aspectRatio);
        const height = width / aspectRatio;

        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95, // Slightly reduced opacity for better blending
          alphaTest: 0.1,
          roughness: 0.15,
          metalness: 0.12,
          emissive: new THREE.Color(0x080808), // Subtle emissive effect
          emissiveIntensity: 0.2,
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Initial position - all images start at the center
        mesh.position.set(0, 0, 0);
        
        // Random rotation
        mesh.rotation.x = Math.random() * Math.PI;
        mesh.rotation.y = Math.random() * Math.PI;
        
        // Smaller scale for more subtle effect
        const scale = 0.2 + Math.random() * 0.3;
        mesh.scale.set(scale, scale, scale);
        
        // Target positions - where images will move to
        const targetX = (Math.random() - 0.5) * 8;
        const targetY = (Math.random() - 0.5) * 8;
        const targetZ = (Math.random() - 0.5) * 5;
        
        // Make sure target positions stay within bounds
        const boundX = 4; // Boundary limits
        const boundY = 4;
        const boundZ = 4;
        
        const constrainedTargetX = Math.max(-boundX, Math.min(boundX, targetX));
        const constrainedTargetY = Math.max(-boundY, Math.min(boundY, targetY));
        const constrainedTargetZ = Math.max(-boundZ, Math.min(boundZ, targetZ));
        
        // Initial velocity for the burst animation - higher values for more dramatic effect
        const initialVelocity = {
          x: constrainedTargetX * 0.07,
          y: constrainedTargetY * 0.07,
          z: constrainedTargetZ * 0.07,
        };
        
        // Create custom properties for animation
        mesh.userData = {
          targetPosition: { x: constrainedTargetX, y: constrainedTargetY, z: constrainedTargetZ },
          initialVelocity: initialVelocity,
          currentVelocity: { ...initialVelocity },
          rotationSpeed: {
            x: (Math.random() - 0.5) * 0.005,
            y: (Math.random() - 0.5) * 0.005,
            z: (Math.random() - 0.5) * 0.003,
          },
          movementSpeed: {
            x: (Math.random() - 0.5) * 0.002,
            y: (Math.random() - 0.5) * 0.002,
            z: (Math.random() - 0.5) * 0.001,
          },
          animationPhase: 'burst', // 'burst' or 'drift'
          bounds: { x: boundX, y: boundY, z: boundZ }
        };
        
        scene.add(mesh);
        imagesArray.push(mesh);
        
        setImagesLoaded(prev => prev + 1);
      });
    });
    
    imagesRef.current = imagesArray;

    // Animation function
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      
      let allImagesPositioned = true;
      
      imagesRef.current.forEach((mesh) => {
        // Rotate each image
        mesh.rotation.x += mesh.userData.rotationSpeed.x;
        mesh.rotation.y += mesh.userData.rotationSpeed.y;
        mesh.rotation.z += mesh.userData.rotationSpeed.z;
        
        if (mesh.userData.animationPhase === 'burst') {
          // Apply velocity-based movement for burst effect
          mesh.position.x += mesh.userData.currentVelocity.x;
          mesh.position.y += mesh.userData.currentVelocity.y;
          mesh.position.z += mesh.userData.currentVelocity.z;
          
          // Check if image is going outside bounds and bounce back
          if (Math.abs(mesh.position.x) > mesh.userData.bounds.x) {
            mesh.position.x = mesh.position.x > 0 ? mesh.userData.bounds.x : -mesh.userData.bounds.x;
            mesh.userData.currentVelocity.x *= -0.8; // Bounce with reduced velocity
          }
          if (Math.abs(mesh.position.y) > mesh.userData.bounds.y) {
            mesh.position.y = mesh.position.y > 0 ? mesh.userData.bounds.y : -mesh.userData.bounds.y;
            mesh.userData.currentVelocity.y *= -0.8; // Bounce with reduced velocity
          }
          if (Math.abs(mesh.position.z) > mesh.userData.bounds.z) {
            mesh.position.z = mesh.position.z > 0 ? mesh.userData.bounds.z : -mesh.userData.bounds.z;
            mesh.userData.currentVelocity.z *= -0.8; // Bounce with reduced velocity
          }
          
          // Decelerate the burst motion (damping)
          mesh.userData.currentVelocity.x *= 0.95;
          mesh.userData.currentVelocity.y *= 0.95;
          mesh.userData.currentVelocity.z *= 0.95;
          
          // Check if close to target position
          const distanceToTarget = new THREE.Vector3(
            mesh.userData.targetPosition.x - mesh.position.x,
            mesh.userData.targetPosition.y - mesh.position.y,
            mesh.userData.targetPosition.z - mesh.position.z
          ).length();
          
          // If velocity is low enough and close to target, switch to drift phase
          if (distanceToTarget < 0.5 && 
              Math.abs(mesh.userData.currentVelocity.x) < 0.01 && 
              Math.abs(mesh.userData.currentVelocity.y) < 0.01 && 
              Math.abs(mesh.userData.currentVelocity.z) < 0.01) {
            mesh.userData.animationPhase = 'drift';
            mesh.position.set(
              mesh.userData.targetPosition.x,
              mesh.userData.targetPosition.y,
              mesh.userData.targetPosition.z
            );
          } else {
            allImagesPositioned = false;
          }
        } else {
          // Drift phase - subtle movement as in original code
          mesh.position.x += mesh.userData.movementSpeed.x;
          mesh.position.y += mesh.userData.movementSpeed.y;
          mesh.position.z += mesh.userData.movementSpeed.z;
          
          // Boundary check with bounce effect
          if (Math.abs(mesh.position.x) > mesh.userData.bounds.x) {
            mesh.position.x = mesh.position.x > 0 ? mesh.userData.bounds.x : -mesh.userData.bounds.x;
            mesh.userData.movementSpeed.x *= -1;
          }
          if (Math.abs(mesh.position.y) > mesh.userData.bounds.y) {
            mesh.position.y = mesh.position.y > 0 ? mesh.userData.bounds.y : -mesh.userData.bounds.y;
            mesh.userData.movementSpeed.y *= -1;
          }
          if (Math.abs(mesh.position.z) > mesh.userData.bounds.z) {
            mesh.position.z = mesh.position.z > 0 ? mesh.userData.bounds.z : -mesh.userData.bounds.z;
            mesh.userData.movementSpeed.z *= -1;
          }
        }
      });
      
      // Update animation completion state
      if (allImagesPositioned && imagesRef.current.length > 0 && !isAnimationComplete) {
        setIsAnimationComplete(true);
      }
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      rendererRef.current.setPixelRatio(window.devicePixelRatio);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Start animation
    animate();
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      window.removeEventListener('resize', handleResize);
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      imagesRef.current.forEach((mesh) => {
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        } else if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose());
        }
      });
    };
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Loading indicator calculation
  const loadingProgress = Math.round((imagesLoaded / totalImages) * 100);
  const isLoading = imagesLoaded < totalImages;

  return (
    <main className={`relative min-h-screen ${isDarkMode ? 'bg-black' : 'bg-white'} overflow-hidden`}>
      {/* Background canvas for rotating images */}
      <div ref={containerRef} className="absolute inset-0 z-0"></div>
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-80">
          <div className="text-center">
            <div className="text-white text-2xl mb-4">Loading images: {loadingProgress}%</div>
            <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-300 ease-out" 
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-white/30"></div>
            </div>
          </div>
          
          <nav className="flex space-x-6 items-center">
            <Link href="#" className={`text-sm ${isDarkMode ? 'text-white/70' : 'text-black/70'} hover:opacity-100`}>
              Manifesto
            </Link>
            <Link href="#" className={`text-sm ${isDarkMode ? 'text-white/70' : 'text-black/70'} hover:opacity-100`}>
              Careers
            </Link>
            <Link href="#" className={`text-sm ${isDarkMode ? 'text-white/70' : 'text-black/70'} hover:opacity-100`}>
              Discover
            </Link>
            <Link href="#" className={`text-sm px-4 py-2 rounded-full border ${isDarkMode ? 'border-white/20 text-white' : 'border-black/20 text-black'}`}>
              Log In
            </Link>
            <Link href="#" className={`text-sm px-4 py-2 rounded-full ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
              Sign up
            </Link>
          </nav>
        </header>
        
        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <h1 className={`text-8xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            COSMOS<sup className="text-xl align-super">©</sup>
          </h1>
          <p className={`text-xl ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>
            A discovery engine for <span className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}>photographers</span>
          </p>
        </div>
        
        {/* Footer */}
        <footer className="p-4 flex justify-between items-center">
          <button 
            onClick={toggleTheme}
            className={`px-4 py-2 rounded-full border ${isDarkMode ? 'border-white/20 text-white' : 'border-black/20 text-black'}`}
          >
            {isDarkMode ? 'Dark' : 'Light'}
          </button>
          
          <div className={`text-sm ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>
            Scroll to explore
          </div>
        </footer>
      </div>
    </main>
  );
}
