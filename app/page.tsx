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
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [isMouseInteractionEnabled, setIsMouseInteractionEnabled] = useState(true);
  const totalImages = 70;
  const [hoveredImage, setHoveredImage] = useState<THREE.Mesh | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

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
    
    // Add distant fill light for better visibility in backgrounds
    const fillLight = new THREE.HemisphereLight(0xe8f1ff, 0x303030, 0.5);
    scene.add(fillLight);
    
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
    
    setImageUrls(imageFiles); // Store image URLs for the grid display

    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "anonymous";
    
    const imagesArray: THREE.Mesh[] = [];

    // Create more images by using each source twice
    [...imageFiles, ...imageFiles].forEach((src, index) => {
      textureLoader.load(src, (texture) => {
        // Improved texture quality
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        
        // Color correction for the texture - modern Three.js approach
        texture.colorSpace = THREE.SRGBColorSpace;
        
        const aspectRatio = texture.image.width / texture.image.height;
        const width = 1.5;
        const height = width / aspectRatio;

        const geometry = new THREE.PlaneGeometry(width, height);
        
        // Add some variation in materials
        const materialType = Math.random() > 0.7 ? 'glossy' : 'standard';
        let material;
        
        if (materialType === 'glossy') {
          material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95,
            alphaTest: 0.1,
            roughness: 0.05, // More glossy
            metalness: 0.3,  // More reflective
            emissive: new THREE.Color(0x111111),
            emissiveIntensity: 0.3,
          });
        } else {
          material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95,
            alphaTest: 0.1,
            roughness: 0.15,
            metalness: 0.12,
            emissive: new THREE.Color(0x080808),
            emissiveIntensity: 0.2,
          });
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Initial position - all images start at the center
        mesh.position.set(0, 0, 0);
        
        // Random rotation
        mesh.rotation.x = Math.random() * Math.PI;
        mesh.rotation.y = Math.random() * Math.PI;
        
        // Increased scale for more presence
        const scale = 0.4 + Math.random() * 0.4;
        mesh.scale.set(scale, scale, scale);
        
        // ---- IMPROVED PHYSICS - TARGET POSITIONING ----
        // Define boundaries with improved Z constraints
        const boundX = 8; // Reduced boundary to keep images more centered
        const boundY = 3;
        const boundZ = 4; // Increased depth for a more layered effect
        const minZ = -2; // Allow some images to go slightly further back
        
        // Define clustering factor - some images will cluster together
        const useCluster = Math.random() > 0.6;
        const clusterCenterX = (Math.random() - 0.5) * boundX;
        const clusterCenterY = (Math.random() - 0.5) * boundY;
        const clusterCenterZ = (Math.random() * boundZ * 0.7) + (minZ * 0.3);
        
        // Generate random positions with optional clustering
        let targetX, targetY, targetZ;
        
        if (useCluster) {
          // Cluster around a center point with small offsets
          targetX = clusterCenterX + (Math.random() - 0.5) * 2;
          targetY = clusterCenterY + (Math.random() - 0.5) * 2;
          targetZ = clusterCenterZ + (Math.random() - 0.5) * 1.5;
        } else {
          // Normal distribution across space
          targetX = (Math.random() - 0.5) * boundX * 2;
          targetY = (Math.random() - 0.5) * boundY * 2;
          targetZ = (Math.random() * boundZ * 1.5) - minZ;
        }
        
        // Apply constraints
        const constrainedTargetX = Math.max(-boundX, Math.min(boundX, targetX));
        const constrainedTargetY = Math.max(-boundY, Math.min(boundY, targetY));
        const constrainedTargetZ = Math.max(minZ, Math.min(boundZ, targetZ));
        
        // Initial velocity with improved physics parameters
        const velocityFactor = 0.08; // Increased for more dynamic movement
        const initialVelocity = {
          x: constrainedTargetX * velocityFactor,
          y: constrainedTargetY * velocityFactor,
          z: constrainedTargetZ * velocityFactor,
        };
        
        // Create custom properties for animation with improved physics
        mesh.userData = {
          targetPosition: { x: constrainedTargetX, y: constrainedTargetY, z: constrainedTargetZ },
          initialVelocity: initialVelocity,
          currentVelocity: { ...initialVelocity },
          rotationSpeed: {
            x: (Math.random() - 0.5) * 0.008, // Increased rotation speeds
            y: (Math.random() - 0.5) * 0.008,
            z: (Math.random() - 0.5) * 0.005,
          },
          movementSpeed: {
            x: (Math.random() - 0.5) * 0.002, // Slightly increased drift
            y: (Math.random() - 0.5) * 0.002,
            z: (Math.random() - 0.5) * 0.001,
          },
          animationPhase: 'burst', // 'burst' or 'drift'
          bounds: { x: boundX, y: boundY, z: boundZ },
          minZ: minZ, // Store minimum Z value
          floatingEffect: {
            enabled: Math.random() > 0.3, // Most images have floating effect
            amplitude: 0.05 + Math.random() * 0.1,
            frequency: 0.2 + Math.random() * 0.3,
            phase: Math.random() * Math.PI * 2, // Random starting phase
          },
        };
        
        scene.add(mesh);
        imagesArray.push(mesh);
        
        setImagesLoaded(prev => prev + 1);
      });
    });
    
    imagesRef.current = imagesArray;

    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      rendererRef.current.setPixelRatio(window.devicePixelRatio);
    };
    
    // Handle mouse movement
    const handleMouseMove = (event: MouseEvent) => {
      // Update mouse position in normalized device coordinates (-1 to +1)
      mouseRef.current.x = -(event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    
    // Handle mouse interaction
    const updateMouseInteraction = () => {
      if (!sceneRef.current || !cameraRef.current || !raycasterRef.current) return;

      // Update raycaster
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // Check for intersections
      const intersects = raycasterRef.current.intersectObjects(imagesRef.current);
      
      // Reset all previously hovered images
      if (hoveredImage) {
        const material = hoveredImage.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = material.userData?.originalEmissive || 0.2;
        material.roughness = material.userData?.originalRoughness || 0.15;
      }

      // Handle new hover state
      if (intersects.length > 0) {
        const newHoveredImage = intersects[0].object as THREE.Mesh;
        setHoveredImage(newHoveredImage);
        
        // Enhance the hovered image
        const material = newHoveredImage.material as THREE.MeshStandardMaterial;
        if (!material.userData) {
          material.userData = {
            originalEmissive: material.emissiveIntensity,
            originalRoughness: material.roughness
          };
        }
        material.emissiveIntensity = 0.5;
        material.roughness = 0.05;
      } else {
        setHoveredImage(null);
      }
    };

    // Animation function
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      
      // Update camera position based on mouse only if interaction is enabled
      if (cameraRef.current && isMouseInteractionEnabled) {
        const targetX = mouseRef.current.x * 2;
        const targetY = mouseRef.current.y * 2;
        cameraRef.current.position.x += (targetX - cameraRef.current.position.x) * 0.05;
        cameraRef.current.position.y += (targetY - cameraRef.current.position.y) * 0.05;
        cameraRef.current.lookAt(0, 0, 0);
      } else if (cameraRef.current) {
        // Smoothly return to center when disabled
        cameraRef.current.position.x *= 0.95;
        cameraRef.current.position.y *= 0.95;
        cameraRef.current.lookAt(0, 0, 0);
      }

      // Update mouse interaction only if enabled
      if (isMouseInteractionEnabled) {
        updateMouseInteraction();
      } else if (hoveredImage) {
        // Reset any hovered state when disabled
        const material = hoveredImage.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = material.userData?.originalEmissive || 0.2;
        material.roughness = material.userData?.originalRoughness || 0.15;
        setHoveredImage(null);
      }

      let allImagesPositioned = true;
      
      imagesRef.current.forEach((mesh) => {
        // Rotate each image
        mesh.rotation.x += mesh.userData.rotationSpeed.x;
        mesh.rotation.y += mesh.userData.rotationSpeed.y;
        mesh.rotation.z += mesh.userData.rotationSpeed.z;
        
        if (mesh.userData.animationPhase === 'burst') {
          // ---- IMPROVED PHYSICS - BURST ANIMATION ----
          // Apply velocity-based movement with improved physics
          mesh.position.x += mesh.userData.currentVelocity.x;
          mesh.position.y += mesh.userData.currentVelocity.y;
          mesh.position.z += mesh.userData.currentVelocity.z;
          
          // Enhanced bounce physics with variable elasticity
          const elasticity = 0.65; // More controlled bounce
          
          // Check if image is going outside bounds with improved bouncing
          if (Math.abs(mesh.position.x) > mesh.userData.bounds.x) {
            mesh.position.x = mesh.position.x > 0 ? 
              mesh.userData.bounds.x : -mesh.userData.bounds.x;
            mesh.userData.currentVelocity.x *= -elasticity;
          }
          if (Math.abs(mesh.position.y) > mesh.userData.bounds.y) {
            mesh.position.y = mesh.position.y > 0 ? 
              mesh.userData.bounds.y : -mesh.userData.bounds.y;
            mesh.userData.currentVelocity.y *= -elasticity;
          }
          
          // Special handling for Z-axis to keep images more visible
          if (mesh.position.z < mesh.userData.minZ) {
            mesh.position.z = mesh.userData.minZ;
            mesh.userData.currentVelocity.z *= -elasticity * 1.2; // Stronger bounce from back wall
          } else if (mesh.position.z > mesh.userData.bounds.z) {
            mesh.position.z = mesh.userData.bounds.z;
            mesh.userData.currentVelocity.z *= -elasticity;
          }
          
          // Improved deceleration with more realistic damping
          const airResistance = 0.97; // Slightly higher to maintain momentum longer
          mesh.userData.currentVelocity.x *= airResistance;
          mesh.userData.currentVelocity.y *= airResistance;
          mesh.userData.currentVelocity.z *= airResistance;
          
          // More accurate distance calculation for phase transition
          const distanceToTarget = new THREE.Vector3(
            mesh.userData.targetPosition.x - mesh.position.x,
            mesh.userData.targetPosition.y - mesh.position.y,
            mesh.userData.targetPosition.z - mesh.position.z
          ).length();
          
          // Smoother transition to drift phase
          const velocityMagnitude = new THREE.Vector3(
            mesh.userData.currentVelocity.x,
            mesh.userData.currentVelocity.y,
            mesh.userData.currentVelocity.z
          ).length();
          
          // If velocity is low enough and close to target, switch to drift phase
          if (distanceToTarget < 1.0 && velocityMagnitude < 0.02) {
            mesh.userData.animationPhase = 'drift';
            
            // Set to exact target position for stability
            mesh.position.set(
              mesh.userData.targetPosition.x,
              mesh.userData.targetPosition.y,
              mesh.userData.targetPosition.z
            );
            
            // Initialize drift movement with gentler values
            mesh.userData.movementSpeed = {
              x: (Math.random() - 0.5) * 0.002,
              y: (Math.random() - 0.5) * 0.002,
              z: (Math.random() - 0.5) * 0.001,
            };
          } else {
            allImagesPositioned = false;
          }
        } else {
          // ---- IMPROVED PHYSICS - DRIFT PHASE ----
          // Drift phase - more gentle and natural movement
          mesh.position.x += mesh.userData.movementSpeed.x;
          mesh.position.y += mesh.userData.movementSpeed.y;
          mesh.position.z += mesh.userData.movementSpeed.z;
          
          // Add floating effect if enabled
          if (mesh.userData.floatingEffect && mesh.userData.floatingEffect.enabled) {
            const floatEffect = mesh.userData.floatingEffect;
            // Sine wave motion for y-axis
            mesh.position.y += Math.sin(Date.now() * 0.001 * floatEffect.frequency + floatEffect.phase) * 0.005 * floatEffect.amplitude;
            // Subtle z-axis movement
            mesh.position.z += Math.cos(Date.now() * 0.0008 * floatEffect.frequency + floatEffect.phase) * 0.003 * floatEffect.amplitude;
          }
          
          // Improved boundary check for drift phase
          // For X and Y, standard reflection
          if (Math.abs(mesh.position.x) > mesh.userData.bounds.x) {
            mesh.position.x = mesh.position.x > 0 ? 
              mesh.userData.bounds.x : -mesh.userData.bounds.x;
            mesh.userData.movementSpeed.x *= -1;
            
            // Add more randomization for varied movement
            mesh.userData.movementSpeed.x += (Math.random() - 0.5) * 0.001;
            mesh.userData.rotationSpeed.y += (Math.random() - 0.5) * 0.001; // Add rotation variation on bounce
          }
          if (Math.abs(mesh.position.y) > mesh.userData.bounds.y) {
            mesh.position.y = mesh.position.y > 0 ? 
              mesh.userData.bounds.y : -mesh.userData.bounds.y;
            mesh.userData.movementSpeed.y *= -1;
            
            // Add slight randomization for more natural movement
            mesh.userData.movementSpeed.y += (Math.random() - 0.5) * 0.0005;
          }
          
          // Special Z handling - keep images from drifting too far back
          if (mesh.position.z < mesh.userData.minZ) {
            mesh.position.z = mesh.userData.minZ;
            mesh.userData.movementSpeed.z = Math.abs(mesh.userData.movementSpeed.z);
            
            // Prefer moving slightly forward
            mesh.userData.movementSpeed.z += Math.random() * 0.0005;
          } else if (mesh.position.z > mesh.userData.bounds.z) {
            mesh.position.z = mesh.userData.bounds.z;
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
    
    // Start animation
    animate();
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      
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
  }, [isMouseInteractionEnabled]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleMouseInteraction = () => {
    setIsMouseInteractionEnabled(!isMouseInteractionEnabled);
  };

  // Loading indicator calculation
  const loadingProgress = Math.round((imagesLoaded / totalImages) * 100);
  const isLoading = imagesLoaded < totalImages;

  return (
    <div className={`${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      <main className="relative min-h-screen overflow-hidden">
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
          
          {/* Main hero content */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
            <h1 className={`text-8xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>
              COSMOS<sup className="text-xl align-super">©</sup>
            </h1>
            <p className={`text-xl ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>
              A discovery engine for <span className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}>photographers</span>
            </p>
          </div>
          
          {/* Footer with controls */}
          <footer className="p-4 flex justify-between items-center">
            <div className="flex space-x-4">
              <button 
                onClick={toggleTheme}
                className={`px-4 py-2 rounded-full border ${isDarkMode ? 'border-white/20 text-white' : 'border-black/20 text-black'}`}
              >
                {isDarkMode ? 'Dark' : 'Light'}
              </button>

            </div>
            
            <div className={`text-sm ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>
              Scroll to explore
            </div>
          </footer>
        </div>
      </main>

      {/* Image Grid Section */}
      <section className={`py-20 px-4 ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <h2 className={`text-4xl font-bold mb-12 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            Explore the Collection
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {imageUrls.map((url, index) => (
              <div 
                key={url}
                className={`group relative aspect-[3/4] overflow-hidden rounded-lg 
                  transform transition-all duration-500 ease-out hover:scale-[1.02]
                  ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}
                style={{
                  perspective: '1000px',
                  transformStyle: 'preserve-3d',
                }}
              >
                <div
                  className="absolute inset-0 transition-transform duration-500 ease-out group-hover:rotate-y-6"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <Image
                    src={url}
                    alt={`Gallery image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                <div 
                  className={`absolute inset-0 opacity-0 group-hover:opacity-100 
                    transition-opacity duration-300 flex items-end p-6
                    bg-gradient-to-t ${isDarkMode ? 'from-black/70' : 'from-white/70'} to-transparent`}
                >
                  <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    <p className="font-semibold">Photo {index + 1}</p>
                    <p className="opacity-70">Click to view details</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}