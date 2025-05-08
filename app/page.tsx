"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light' | 'blue' | 'red' | 'purple' | 'green'>('dark');
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [isMouseInteractionEnabled] = useState(true);
  const totalImages = 35;
  const [hoveredImage, setHoveredImage] = useState<THREE.Mesh | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [allImageUrls, setAllImageUrls] = useState<string[]>([]);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const themeSelectorRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseVelocityRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const lastMousePositionRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const gradientRef = useRef<HTMLDivElement>(null);
  
  const [startBurst, setStartBurst] = useState(false);
  // Refs for gallery image containers
  const previewImageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fullImageRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Add time and velocity refs for physics-based movement
  const lastFrameTimeRef = useRef<number>(performance.now());
  const cameraVelocityRef = useRef<THREE.Vector3>(new THREE.Vector3());

  // Helper to add refs to array
  const setPreviewImageRef = useCallback((el: HTMLDivElement | null, idx: number) => {
    previewImageRefs.current[idx] = el;
  }, []);
  const setFullImageRef = useCallback((el: HTMLDivElement | null, idx: number) => {
    fullImageRefs.current[idx] = el;
  }, []);

  // Intersection Observer for scroll-to-reveal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reveal = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('slidein');
          observer.unobserve(entry.target);
        }
      });
    };
    const observer = new window.IntersectionObserver(reveal, {
      threshold: 0.18
    });
    // Observe preview images
    previewImageRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });
    // Observe full gallery images
    fullImageRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, [imageUrls, allImageUrls, showAllPhotos]);

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
    camera.position.z = 7;
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
    const pointLight = new THREE.PointLight(0xf8e8ff, 1, 10);
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

    // Load images for 3D view (subset)
    const imageFiles = Array.from({ length: 35 }, (_, i) => 
      `/images/DSCF${3726 + i}.JPG`
    );
    
    setImageUrls(imageFiles.slice(0, 12)); // Show only first 12 images in preview
    
    // Load all images for the full gallery view
    const allFiles = Array.from({ length: 35 }, (_, i) => 
      `/images/DSCF${3726 + i}.JPG`
    );
    setAllImageUrls(allFiles);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "anonymous";
    
    const imagesArray: THREE.Mesh[] = [];

    // Remove the duplication of images by removing the spread
    imageFiles.forEach((src, index) => {
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
        
        // Store the original scale for hover effects
        mesh.userData.originalScale = { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z };
        
        // Store image index for modal opening
        mesh.userData.imageIndex = index;
        
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
          animationPhase: 'waiting', // Start as 'waiting' instead of 'burst'
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

    // Stable event handlers for listeners
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      rendererRef.current.setPixelRatio(window.devicePixelRatio);
    };
    const handleMouseMove = (event: MouseEvent) => {
      lastMousePositionRef.current.x = mouseRef.current.x;
      lastMousePositionRef.current.y = mouseRef.current.y;
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = - (event.clientY / window.innerHeight) * 2 + 1;
      mouseVelocityRef.current.x = mouseRef.current.x - lastMousePositionRef.current.x;
      mouseVelocityRef.current.y = mouseRef.current.y - lastMousePositionRef.current.y;
      
      // Update gradient position based on mouse with smoother movement
      if (gradientRef.current) {
        // Increase mouse effect for more dramatic movement (35% from center)
        const gradientX = 50 + (mouseRef.current.x * 35); 
        const gradientY = 50 + (mouseRef.current.y * 35);
        
        // Add velocity component for more fluid, dynamic feeling
        const velocityFactor = 20;
        const velocityX = mouseVelocityRef.current.x * velocityFactor;
        const velocityY = mouseVelocityRef.current.y * velocityFactor;
        
        gradientRef.current.style.backgroundPosition = `${gradientX + velocityX}% ${gradientY + velocityY}%`;
      }
    };
    const handleMouseClick = () => {
      if (!isMouseInteractionEnabled || !sceneRef.current || !cameraRef.current || !raycasterRef.current) return;
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(imagesRef.current);
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        const imageIndex = clickedMesh.userData.imageIndex;
        const originalScale = clickedMesh.userData.originalScale;
        const scaleUp = () => {
          if (originalScale) {
            clickedMesh.scale.set(
              originalScale.x * 1.2,
              originalScale.y * 1.2,
              originalScale.z * 1.2
            );
          }
          setTimeout(scaleDown, 100);
        };
        const scaleDown = () => {
          if (originalScale) {
            clickedMesh.scale.set(
              originalScale.x,
              originalScale.y,
              originalScale.z
            );
          }
          setTimeout(() => {
            if (imageIndex >= 0 && imageIndex < allImageUrls.length) {
              setShowAllPhotos(true);
              setModalOpen(true);
            }
          }, 100);
        };
        scaleUp();
      }
    };

    // Add event listeners ONCE
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleMouseClick);
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
        
        // Reset scale if we're no longer hovering
        if (intersects.length === 0 || intersects[0].object !== hoveredImage) {
          const originalScale = hoveredImage.userData.originalScale;
          if (originalScale) {
            hoveredImage.scale.set(
              originalScale.x,
              originalScale.y,
              originalScale.z
            );
          }
        }
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
        
        // Scale up the hovered image slightly
        const originalScale = newHoveredImage.userData.originalScale;
        if (originalScale) {
          newHoveredImage.scale.set(
            originalScale.x * 1.15,
            originalScale.y * 1.15,
            originalScale.z * 1.15
          );
        } else {
          // If originalScale is not defined, store current scale and scale up
          newHoveredImage.userData.originalScale = { 
            x: newHoveredImage.scale.x,
            y: newHoveredImage.scale.y,
            z: newHoveredImage.scale.z
          };
          newHoveredImage.scale.set(
            newHoveredImage.scale.x * 1.15,
            newHoveredImage.scale.y * 1.15,
            newHoveredImage.scale.z * 1.15
          );
        }
        
        // Rotate slightly toward camera for better visibility
        newHoveredImage.rotation.x += (0 - newHoveredImage.rotation.x) * 0.03;
        newHoveredImage.rotation.y += (0 - newHoveredImage.rotation.y) * 0.03;
        
        // Add outline effect or glow if desired
        // (This would require additional post-processing which could be added later)
      } else {
        setHoveredImage(null);
      }
    };

    // Animation function
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      
      // Compute frame time delta for physics
      const now = performance.now();
      const dt = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;

      // Spring-based physics for camera movement
      if (cameraRef.current) {
        // Compute desired target from mouse state
        const baseZ = 7;
        const zVar = Math.abs(mouseRef.current.x * mouseRef.current.y) * 1.5;
        const desired = new THREE.Vector3(mouseRef.current.x * 3, mouseRef.current.y * 2, baseZ - zVar);
        // Spring stiffness and damping
        const k = 30;
        const d = 2 * Math.sqrt(k);
        // Forces: F = -k*x - d*v
        const disp = new THREE.Vector3().subVectors(desired, cameraRef.current.position);
        const springF = disp.multiplyScalar(k);
        const dampF = cameraVelocityRef.current.clone().multiplyScalar(-d);
        const accel = springF.add(dampF);
        // Integrate velocity and position
        cameraVelocityRef.current.add(accel.multiplyScalar(dt));
        cameraRef.current.position.add(cameraVelocityRef.current.clone().multiplyScalar(dt));
        cameraRef.current.lookAt(0, 0, 0);
      }

      // Parallax hero text movement
      if (heroRef.current && cameraRef.current) {
        const factor = 50;
        const hx = cameraRef.current.position.x * factor;
        const hy = cameraRef.current.position.y * factor;
        heroRef.current.style.transform = `translate3d(${hx}px, ${-hy}px, 0)`;
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
          // Integrate burst velocity with delta time
          mesh.position.x += mesh.userData.currentVelocity.x * dt * 60;
          mesh.position.y += mesh.userData.currentVelocity.y * dt * 60;
          mesh.position.z += mesh.userData.currentVelocity.z * dt * 60;

          const elasticity = 0.65;

          if (Math.abs(mesh.position.x) > mesh.userData.bounds.x) {
            mesh.position.x = mesh.position.x > 0 ? mesh.userData.bounds.x : -mesh.userData.bounds.x;
            mesh.userData.currentVelocity.x *= -elasticity;
          }
          if (Math.abs(mesh.position.y) > mesh.userData.bounds.y) {
            mesh.position.y = mesh.position.y > 0 ? mesh.userData.bounds.y : -mesh.userData.bounds.y;
            mesh.userData.currentVelocity.y *= -elasticity;
          }

          if (mesh.position.z < mesh.userData.minZ) {
            mesh.position.z = mesh.userData.minZ;
            mesh.userData.currentVelocity.z *= -elasticity * 1.2;
          } else if (mesh.position.z > mesh.userData.bounds.z) {
            mesh.position.z = mesh.userData.bounds.z;
            mesh.userData.currentVelocity.z *= -elasticity;
          }

          // Apply damping with delta time
          const airRes = 0.97;
          mesh.userData.currentVelocity.x *= Math.pow(airRes, dt * 60);
          mesh.userData.currentVelocity.y *= Math.pow(airRes, dt * 60);
          mesh.userData.currentVelocity.z *= Math.pow(airRes, dt * 60);
          
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
      window.removeEventListener('click', handleMouseClick);
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
  // Only run once on mount/unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (imagesLoaded === totalImages) {
      setStartBurst(true);
    }
  }, [imagesLoaded, totalImages]);

  // Trigger burst animation once when startBurst becomes true
  useEffect(() => {
    if (!startBurst) return;
    imagesRef.current.forEach((mesh) => {
      if (mesh.userData.animationPhase === 'waiting') {
        mesh.userData.animationPhase = 'burst';
      }
    });
  }, [startBurst]);

  // Add click outside handler for theme selector
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeSelectorRef.current && !themeSelectorRef.current.contains(event.target as Node)) {
        setShowThemeSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [themeSelectorRef]);


  // Loading indicator calculation
  const loadingProgress = Math.round((imagesLoaded / totalImages) * 100);
  const isLoading = imagesLoaded < totalImages;

  const closeModal = () => setModalOpen(false);

  // Handle Esc key to close modal
  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen]);

  // Toggle full gallery view
  const toggleAllPhotos = () => {
    setShowAllPhotos(!showAllPhotos);
    // Scroll to gallery section when opening
    if (!showAllPhotos) {
      const gallerySection = document.getElementById('gallery-section');
      if (gallerySection) {
        gallerySection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const toggleThemeSelector = () => {
    setShowThemeSelector(!showThemeSelector);
  };

  const changeTheme = (theme: 'dark' | 'light' | 'blue' | 'red' | 'purple' | 'green') => {
    setCurrentTheme(theme);
    setShowThemeSelector(false);
  };

  // Theme-based color utility
  const getThemeColors = () => {
    switch (currentTheme) {
      case 'light':
        return {
          bg: 'bg-white',
          text: 'text-black',
          textMuted: 'text-black/70',
          border: 'border-black/20',
          button: 'bg-black text-white',
          buttonHover: 'hover:bg-black/90',
          buttonOutline: 'border-black/20 text-black',
          gradientFrom: 'from-white/90',
          gradientVia: 'via-white/70',
          overlay: 'bg-white/80',
          card: 'bg-black/5',
          modalBg: 'bg-white/95',
          iconColor: 'text-black',
          gradient: 'bg-gradient-light'
        };
      case 'blue':
        return {
          bg: 'bg-blue-900',
          text: 'text-white',
          textMuted: 'text-blue-100/70',
          border: 'border-blue-300/30',
          button: 'bg-blue-400 text-blue-900',
          buttonHover: 'hover:bg-blue-300',
          buttonOutline: 'border-blue-300/30 text-blue-100',
          gradientFrom: 'from-blue-900/90',
          gradientVia: 'via-blue-800/70',
          overlay: 'bg-blue-900/80',
          card: 'bg-blue-800/50',
          modalBg: 'bg-blue-900/95',
          iconColor: 'text-blue-200',
          gradient: 'bg-gradient-blue'
        };
      case 'red':
        return {
          bg: 'bg-red-900',
          text: 'text-white',
          textMuted: 'text-red-100/70',
          border: 'border-red-300/30',
          button: 'bg-red-400 text-red-900',
          buttonHover: 'hover:bg-red-300',
          buttonOutline: 'border-red-300/30 text-red-100',
          gradientFrom: 'from-red-900/90',
          gradientVia: 'via-red-800/70',
          overlay: 'bg-red-900/80',
          card: 'bg-red-800/50',
          modalBg: 'bg-red-900/95',
          iconColor: 'text-red-200',
          gradient: 'bg-gradient-red'
        };
      case 'purple':
        return {
          bg: 'bg-purple-900',
          text: 'text-white',
          textMuted: 'text-purple-100/70',
          border: 'border-purple-300/30',
          button: 'bg-purple-400 text-purple-900',
          buttonHover: 'hover:bg-purple-300',
          buttonOutline: 'border-purple-300/30 text-purple-100',
          gradientFrom: 'from-purple-900/90',
          gradientVia: 'via-purple-800/70',
          overlay: 'bg-purple-900/80',
          card: 'bg-purple-800/50',
          modalBg: 'bg-purple-900/95',
          iconColor: 'text-purple-200',
          gradient: 'bg-gradient-purple'
        };
      case 'green':
        return {
          bg: 'bg-emerald-900',
          text: 'text-white',
          textMuted: 'text-emerald-100/70',
          border: 'border-emerald-300/30',
          button: 'bg-emerald-400 text-emerald-900',
          buttonHover: 'hover:bg-emerald-300',
          buttonOutline: 'border-emerald-300/30 text-emerald-100',
          gradientFrom: 'from-emerald-900/90',
          gradientVia: 'via-emerald-800/70',
          overlay: 'bg-emerald-900/80',
          card: 'bg-emerald-800/50',
          modalBg: 'bg-emerald-900/95',
          iconColor: 'text-emerald-200',
          gradient: 'bg-gradient-green'
        };
      case 'dark':
      default:
        return {
          bg: 'bg-black',
          text: 'text-white',
          textMuted: 'text-white/70',
          border: 'border-white/20',
          button: 'bg-white text-black',
          buttonHover: 'hover:bg-white/90',
          buttonOutline: 'border-white/20 text-white',
          gradientFrom: 'from-black/90',
          gradientVia: 'via-black/70',
          overlay: 'bg-black/80',
          card: 'bg-white/10',
          modalBg: 'bg-black/95',
          iconColor: 'text-white',
          gradient: 'bg-gradient-dark'
        };
    }
  };

  const themeColors = getThemeColors();

  // Add new toggle for parallax effects

  return (
    <div className={themeColors.bg} data-theme={currentTheme}>
      {/* Animated gradient background */}
      <div className="animated-gradient-bg" aria-hidden="true"></div>
      {/* Soft vignette overlay */}
      <div className="vignette-bg" aria-hidden="true"></div>
      <main className="relative min-h-screen overflow-hidden fadein"
        style={{ perspective: '800px', perspectiveOrigin: '50% 50%' }}
      >
        {/* Background canvas for rotating images */}
        <div ref={containerRef} className="absolute inset-0 z-0"></div>
        
        {/* Animated gradient background that responds to mouse */}
        <div 
          ref={gradientRef}
          className={`absolute inset-0 z-[1] ${themeColors.gradient} transition-all duration-300 ease-out opacity-70`}
          style={{
            backgroundSize: '200% 200%',
            backgroundPosition: '50% 50%'
          }}
          aria-hidden="true"
        ></div>
        
        {/* Loading overlay */}
        {isLoading && (
          <div className={`absolute inset-0 z-20 flex items-center justify-center glass ${themeColors.overlay}`}>
            <div className="text-center">
              <div className={`${themeColors.text} text-2xl mb-4`}>Loading images: {loadingProgress}%</div>
              <div className={`w-64 h-2 ${themeColors.card} rounded-full overflow-hidden`}>
                <div 
                  className={`h-full ${themeColors.text} bg-current transition-all duration-300 ease-out`} 
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
              <div className={`w-8 h-8 rounded-full ${themeColors.card} flex items-center justify-center`}>
                <div className={`w-4 h-4 rounded-full ${themeColors.border}`}></div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              
              
              <nav className="flex space-x-6 items-center">
                <Link href="https://github.com/tanvishdesai" className={`text-sm ${themeColors.textMuted} hover:opacity-100`}>
                  GitHub
                </Link>
                <Link href="https://www.instagram.com/tanvish.desai/" className={`text-sm ${themeColors.textMuted} hover:opacity-100`}>
                  Instagram
                </Link>
                <Link href="https://zuckonit.vercel.app" className={`text-sm ${themeColors.textMuted} hover:opacity-100`}>
                  ZuckOnit
                </Link>
         
              </nav>
            </div>
          </header>
          
          {/* Main hero content */}
          <div ref={heroRef} className="flex-1 flex flex-col items-center justify-center px-4 text-center">
            <h1 className={`text-8xl font-bold mb-4 ${themeColors.text}`} style={{textShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1.5px 0 #fff'}}>
              BERNET<sup className="text-xl align-super">©</sup>
            </h1>
            <p className={`text-xl ${themeColors.textMuted}`}>
              Whatever you can imagine it to be 
            </p>
          </div>
          
          {/* Footer with controls */}
          <footer className="p-4 flex justify-between items-center">
            <div className="relative" ref={themeSelectorRef}>
              <button 
                onClick={toggleThemeSelector}
                className={`px-4 py-2 rounded-full border ${themeColors.buttonOutline} flex items-center gap-2 relative z-30`}
              >
                <span>{currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
              
              {showThemeSelector && (
                <div className="fixed inset-0 z-[100]" onClick={() => setShowThemeSelector(false)}>
                  <div 
                    className={`absolute top-12 left-0 p-3 rounded-xl glass shadow-2xl ${themeColors.bg} border-2 ${themeColors.border} z-[101] min-w-[200px] fadein theme-modal`} 
                    style={{boxShadow: '0 10px 32px 0 rgba(31,38,135,0.18), 0 2px 12px 0 rgba(0,0,0,0.10)'}}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-1 gap-2 w-full">
                      {['dark', 'light', 'blue', 'red', 'purple', 'green'].map((theme) => (
                        <button
                          key={theme}
                          onClick={() => changeTheme(theme as 'dark' | 'light' | 'blue' | 'red' | 'purple' | 'green')}
                          className={`px-4 py-3 text-sm rounded-lg flex items-center gap-3 transition-colors w-full ${
                            currentTheme === theme 
                              ? `bg-opacity-30 ${themeColors.card} font-medium` 
                              : 'hover:bg-opacity-10 hover:bg-gray-500'
                          } ${themeColors.text}`}
                        >
                          <span className={`w-5 h-5 rounded-full flex-shrink-0 shadow-sm ${
                            theme === 'dark' ? 'bg-gray-800 border border-gray-600' : 
                            theme === 'light' ? 'bg-gray-200 border border-gray-300' :
                            theme === 'blue' ? 'bg-blue-500 border border-blue-400' :
                            theme === 'red' ? 'bg-red-500 border border-red-400' :
                            theme === 'purple' ? 'bg-purple-500 border border-purple-400' :
                            'bg-emerald-500 border border-emerald-400'
                          }`}></span>
                          <span>{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className={`text-sm ${themeColors.textMuted}`}>
              Scroll to explore
            </div>
          </footer>
        </div>
      </main>

      {/* Interactive Image Gallery Section - Updated to support all themes */}
      <section id="gallery-section" className={`relative z-20 py-24 px-4 bg-gradient-to-b ${themeColors.gradientFrom} ${themeColors.gradientVia} to-transparent fadein`}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center">
            <h2 className={`text-5xl font-bold mb-4 ${themeColors.text}`}>
              <span className="relative inline-block">
                <span className="relative z-10">Gallery</span>
                <span className={`absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r ${
                  currentTheme === 'dark' ? 'from-gray-400 to-gray-600' :
                  currentTheme === 'light' ? 'from-gray-300 to-gray-500' :
                  currentTheme === 'blue' ? 'from-blue-400 to-blue-600' :
                  currentTheme === 'red' ? 'from-red-400 to-red-600' :
                  currentTheme === 'purple' ? 'from-purple-400 to-pink-500' :
                  'from-emerald-400 to-emerald-600'
                }`}></span>
              </span>
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${themeColors.textMuted}`}>
              People i saw without them seeing me
            </p>
          </div>
          
          {/* Masonry layout for gallery preview (when not showing all) */}
          {!showAllPhotos && (
            <>
              <div className="relative min-h-[600px] flex flex-wrap justify-center items-center" style={{ perspective: '1200px' }}>
                {imageUrls.filter(url => url && url.trim() !== '').map((url, idx) => {
                  // Generate random rotation and translation for each image
                  const rotate = (Math.random() - 0.5) * 18; // -9deg to +9deg
                  const translateX = (Math.random() - 0.5) * 40; // -20px to +20px
                  const translateY = (Math.random() - 0.5) * 40; // -20px to +20px
                  const zIndex = 10 + idx;
                  return (
                    <div
                      key={url + idx}
                      className="polaroid-photo group opacity-0 absolute"
                      ref={el => setPreviewImageRef(el, idx)}
                      style={{
                        transform: `rotate(${rotate}deg) translate(${translateX}px, ${translateY}px)`,
                        zIndex,
                        left: `calc(${(idx % 4) * 22 + 10}% - 80px)`, // spread horizontally
                        top: `calc(${Math.floor(idx / 4) * 32 + 5}% - 80px)`, // spread vertically
                        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s',
                        width: '180px',
                        maxWidth: '90vw',
                      }}
                    >
                      <button
                        className="relative block w-full overflow-visible focus:outline-none"
                        onClick={() => {
                          setModalOpen(true);
                        }}
                        aria-label={`Open image ${idx + 1}`}
                        style={{ background: 'none', border: 'none', padding: 0 }}
                      >
                        <div className="polaroid-frame">
                          <div className="relative aspect-[3/4] w-full h-[220px] bg-white rounded-lg shadow-xl border border-gray-200 flex items-center justify-center">
                            <Image
                              src={url}
                              alt={`Gallery image ${idx + 1}`}
                              fill
                              className="object-cover rounded-md polaroid-img"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                              priority={idx < 4}
                            />
                          </div>
                          <div className="text-center text-xs text-gray-700 font-semibold mt-2 polaroid-caption">
                            Photo {idx + 1}
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center mt-12">
                <button
                  onClick={toggleAllPhotos}
                  className="px-6 py-3 rounded-full beauty-btn bg-white/80 text-black font-semibold shadow-lg hover:bg-white/90 transition-colors duration-300 border border-gray-200"
                  style={{ fontSize: '1.1rem' }}
                >
                  View All Photos
                </button>
              </div>
            </>
          )}
          
          {/* Full gallery view (when showing all) */}
          {showAllPhotos && (
            <>
              <div className="mb-8 flex justify-between items-center">
                <h3 className={`text-2xl font-medium ${themeColors.text}`}>
                  All Photos ({allImageUrls.length})
                </h3>
                <button
                  onClick={toggleAllPhotos}
                  className={`px-4 py-2 rounded-full beauty-btn ${themeColors.card} ${themeColors.text} hover:bg-opacity-50 transition-colors duration-300`}
                >
                  <span className="flex items-center gap-2">
                    <span>Back to Preview</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6"/>
                    </svg>
                  </span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
                {allImageUrls.filter(url => url && url.trim() !== '').map((url, idx) => (
                  <div
                    key={url + idx}
                    className="polaroid-photo group opacity-0"
                    ref={el => setFullImageRef(el, idx)}
                    style={{ transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s' }}
                  >
                    <button
                      className="relative block w-full overflow-visible focus:outline-none"
                      onClick={() => {
                        setModalOpen(true);
                      }}
                      aria-label={`Open full image ${idx + 1}`}
                      style={{ background: 'none', border: 'none', padding: 0 }}
                    >
                      <div className="polaroid-frame">
                        <div className="relative aspect-[3/4] w-full h-[220px] bg-white rounded-lg shadow-xl border border-gray-200 flex items-center justify-center">
                          <Image
                            src={url}
                            alt={`Gallery image ${idx + 1}`}
                            fill
                            className="object-cover rounded-md polaroid-img"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            priority={idx < 4}
                          />
                        </div>
                        <div className="text-center text-xs text-gray-700 font-semibold mt-2 polaroid-caption">
                          Photo {idx + 1}
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}