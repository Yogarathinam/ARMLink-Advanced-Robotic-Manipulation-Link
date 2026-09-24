import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { JointAngles, Vector3D } from '../robot/kinematics';
import { getArmStoreState } from '../state/armStore';
import { Cpu, Layers, MousePointerClick } from 'lucide-react';

interface ArmSceneProps {
  angles: JointAngles;
  targetPos?: Vector3D;
  showAxes?: boolean;
  showGrid?: boolean;
  isIKMode?: boolean;
  theme?: 'light' | 'dark';
  selectedJointKey?: keyof JointAngles | null;
}

export interface HoveredJointData {
  jointKey: keyof JointAngles;
  name: string;
  motor: string;
  pin: string;
  range: string;
  axis: string;
  angle: number;
  mouseX: number;
  mouseY: number;
}

export const ArmScene: React.FC<ArmSceneProps> = ({
  angles,
  targetPos,
  showAxes = true,
  showGrid = true,
  isIKMode = false,
  theme = 'light',
  selectedJointKey
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const intersectableMeshesRef = useRef<THREE.Mesh[]>([]);
  const highlightedMeshRef = useRef<{ mesh: THREE.Mesh; originalEmissive: THREE.Color } | null>(null);

  const [hoveredJoint, setHoveredJoint] = useState<HoveredJointData | null>(null);

  // Joint Mesh & Group References for dynamic rotation updates
  const jointsRef = useRef<{
    j1BaseGroup?: THREE.Group;
    j2ShoulderGroup?: THREE.Group;
    j3ElbowGroup?: THREE.Group;
    j4WristPitchGroup?: THREE.Group;
    j5WristRollGroup?: THREE.Group;
    j6GripperLeft?: THREE.Group;
    j6GripperRight?: THREE.Group;
    targetMarker?: THREE.Mesh;
  }>({});

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme === 'light' ? '#f1f5f9' : '#07090e');
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1200);
    camera.position.set(290, 230, 290);
    camera.lookAt(0, 95, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. High-Visibility Studio Lighting (Ambient + Hemisphere + Key + Fill + Rim)
    const ambientLight = new THREE.AmbientLight(0xffffff, theme === 'light' ? 1.0 : 0.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(
      theme === 'light' ? 0xffffff : 0x2563eb,
      theme === 'light' ? 0xe2e8f0 : 0x090d16,
      1.2
    );
    hemiLight.position.set(0, 300, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(180, 300, 180);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x2563eb, 0.9);
    fillLight.position.set(-180, 150, -180);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x00f0ff, 1.5, 500);
    rimLight.position.set(0, 300, -200);
    scene.add(rimLight);

    // 5. Studio Ground Floor & Marking Rings
    if (showGrid) {
      const gridColor = theme === 'light' ? 0x2563eb : 0x00f0ff;
      const gridLines = theme === 'light' ? 0xcbcbcb : 0x1e293b;
      const grid = new THREE.GridHelper(440, 44, gridColor, gridLines);
      grid.position.y = 0;
      scene.add(grid);

      // Work Zone Ring
      const ringGeo = new THREE.RingGeometry(180, 183, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: gridColor, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 0.5;
      scene.add(ringMesh);
    }

    if (showAxes) {
      const axesHelper = new THREE.AxesHelper(65);
      axesHelper.position.set(-200, 2, -200);
      scene.add(axesHelper);
    }

    // 6. High-Visibility Vibrant Industrial Materials
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: theme === 'light' ? 0x1e293b : 0x0f172a, // Deep Slate Black
      metalness: 0.8,
      roughness: 0.25
    });

    const bodyArmourMat = new THREE.MeshStandardMaterial({
      color: theme === 'light' ? 0x1565c0 : 0x2563eb, // High-contrast Vivid Cobalt/Sapphire Blue
      metalness: 0.6,
      roughness: 0.2,
      emissive: 0x0d47a1,
      emissiveIntensity: theme === 'light' ? 0.15 : 0.35
    });

    const brassBearingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Bright Vibrant Gold/Amber Brass
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0x78350f,
      emissiveIntensity: 0.2
    });

    const chromeBoltMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Platinum Chrome
      metalness: 0.95,
      roughness: 0.1
    });

    const gripperMat = new THREE.MeshStandardMaterial({
      color: 0xff3b30, // Bright Safety Red Jaw Pads
      metalness: 0.3,
      roughness: 0.3,
      emissive: 0x991b1b,
      emissiveIntensity: 0.25
    });

    const intersectables: THREE.Mesh[] = [];

    // Helper: Add decorative bolts
    const addBoltHeads = (parentGroup: THREE.Group, radius: number, yPos: number, count = 6) => {
      const boltGeo = new THREE.CylinderGeometry(2.5, 2.5, 3, 6);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const bolt = new THREE.Mesh(boltGeo, chromeBoltMat);
        bolt.position.set(Math.cos(angle) * radius, yPos, Math.sin(angle) * radius);
        parentGroup.add(bolt);
      }
    };

    // ------------------------------------------------------------------------
    // 7. HIGH-VISIBILITY INDUSTRIAL ROBOTIC ARM ASSEMBLY
    // ------------------------------------------------------------------------
    
    // BASE PEDESTAL
    const basePlateGeo = new THREE.CylinderGeometry(48, 52, 10, 8);
    const basePlate = new THREE.Mesh(basePlateGeo, darkMetalMat);
    basePlate.position.y = 5;
    basePlate.receiveShadow = true;
    scene.add(basePlate);

    addBoltHeads(scene as any, 44, 10.5, 8);

    // Glowing Base LED Ring
    const ledRingGeo = new THREE.TorusGeometry(32, 2, 16, 32);
    const ledRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const ledRing = new THREE.Mesh(ledRingGeo, ledRingMat);
    ledRing.rotation.x = Math.PI / 2;
    ledRing.position.y = 10.5;
    scene.add(ledRing);

    // JOINT 1: Base Swivel Group
    const j1Group = new THREE.Group();
    j1Group.position.y = 10;
    scene.add(j1Group);
    jointsRef.current.j1BaseGroup = j1Group;

    const j1HousingGeo = new THREE.CylinderGeometry(32, 34, 38, 32);
    const j1Housing = new THREE.Mesh(j1HousingGeo, bodyArmourMat.clone());
    j1Housing.position.y = 19;
    j1Housing.castShadow = true;
    j1Housing.userData = {
      jointKey: 'base',
      name: 'Joint 1: Waist / Base',
      motor: 'MG996R High Torque Metal Gear',
      pin: 'GPIO 13',
      range: '10° - 170°',
      axis: 'Yaw Azimuth Rotation'
    };
    j1Group.add(j1Housing);
    intersectables.push(j1Housing);

    addBoltHeads(j1Group, 26, 38.5, 6);

    // JOINT 2: Shoulder Group
    const j2Group = new THREE.Group();
    j2Group.position.y = 38;
    j1Group.add(j2Group);
    jointsRef.current.j2ShoulderGroup = j2Group;

    const shoulderBearingGeo = new THREE.CylinderGeometry(16, 16, 36, 24);
    const shoulderBearing = new THREE.Mesh(shoulderBearingGeo, brassBearingMat);
    shoulderBearing.rotation.z = Math.PI / 2;
    shoulderBearing.castShadow = true;
    j2Group.add(shoulderBearing);

    const upperArmGroup = new THREE.Group();
    j2Group.add(upperArmGroup);

    const beamLeftGeo = new THREE.BoxGeometry(8, 120, 20);
    const beamLeft = new THREE.Mesh(beamLeftGeo, darkMetalMat.clone());
    beamLeft.position.set(-10, 60, 0);
    beamLeft.castShadow = true;
    upperArmGroup.add(beamLeft);

    const beamRightGeo = new THREE.BoxGeometry(8, 120, 20);
    const beamRight = new THREE.Mesh(beamRightGeo, darkMetalMat.clone());
    beamRight.position.set(10, 60, 0);
    beamRight.castShadow = true;
    upperArmGroup.add(beamRight);

    const upperCoreGeo = new THREE.BoxGeometry(14, 100, 16);
    const upperCore = new THREE.Mesh(upperCoreGeo, bodyArmourMat.clone());
    upperCore.position.set(0, 60, 0);
    upperCore.castShadow = true;
    upperCore.userData = {
      jointKey: 'shoulder',
      name: 'Joint 2: Shoulder Link',
      motor: 'MG996R High Torque Metal Gear',
      pin: 'GPIO 12',
      range: '25° - 150°',
      axis: 'Pitch Elevation'
    };
    upperArmGroup.add(upperCore);
    intersectables.push(upperCore);

    // JOINT 3: Elbow Group
    const j3Group = new THREE.Group();
    j3Group.position.y = 120;
    j2Group.add(j3Group);
    jointsRef.current.j3ElbowGroup = j3Group;

    const elbowBearingGeo = new THREE.CylinderGeometry(14, 14, 30, 24);
    const elbowBearing = new THREE.Mesh(elbowBearingGeo, brassBearingMat);
    elbowBearing.rotation.z = Math.PI / 2;
    elbowBearing.castShadow = true;
    j3Group.add(elbowBearing);

    const forearmGeo = new THREE.CylinderGeometry(12, 16, 115, 24);
    const forearm = new THREE.Mesh(forearmGeo, bodyArmourMat.clone());
    forearm.position.y = 57.5;
    forearm.castShadow = true;
    forearm.userData = {
      jointKey: 'elbow',
      name: 'Joint 3: Elbow / Forearm',
      motor: 'MG996R High Torque Metal Gear',
      pin: 'GPIO 14',
      range: '15° - 165°',
      axis: 'Pitch Flexion'
    };
    j3Group.add(forearm);
    intersectables.push(forearm);

    // Heat Sink Fins
    for (let f = 0; f < 4; f++) {
      const finGeo = new THREE.BoxGeometry(22, 2.5, 22);
      const fin = new THREE.Mesh(finGeo, darkMetalMat);
      fin.position.y = 40 + f * 6;
      j3Group.add(fin);
    }

    // JOINT 4: Wrist Pitch Group
    const j4Group = new THREE.Group();
    j4Group.position.y = 115;
    j3Group.add(j4Group);
    jointsRef.current.j4WristPitchGroup = j4Group;

    const wristPitchPivotGeo = new THREE.CylinderGeometry(11, 11, 24, 20);
    const wristPitchPivot = new THREE.Mesh(wristPitchPivotGeo, brassBearingMat);
    wristPitchPivot.rotation.z = Math.PI / 2;
    wristPitchPivot.castShadow = true;
    wristPitchPivot.userData = {
      jointKey: 'wristPitch',
      name: 'Joint 4: Wrist Pitch',
      motor: 'SG90 Micro Servo',
      pin: 'GPIO 27',
      range: '0° - 180°',
      axis: 'Pitch Tilt'
    };
    j4Group.add(wristPitchPivot);
    intersectables.push(wristPitchPivot);

    // JOINT 5: Wrist Roll Collar Group
    const j5Group = new THREE.Group();
    j5Group.position.y = 20;
    j4Group.add(j5Group);
    jointsRef.current.j5WristRollGroup = j5Group;

    const wristRollCollarGeo = new THREE.CylinderGeometry(14, 14, 26, 24);
    const wristRollCollar = new THREE.Mesh(wristRollCollarGeo, darkMetalMat.clone());
    wristRollCollar.position.y = 13;
    wristRollCollar.castShadow = true;
    wristRollCollar.userData = {
      jointKey: 'wristRoll',
      name: 'Joint 5: Wrist Roll Collar',
      motor: 'SG90 Micro Servo',
      pin: 'GPIO 26',
      range: '0° - 180°',
      axis: 'Roll Twist'
    };
    j5Group.add(wristRollCollar);
    intersectables.push(wristRollCollar);

    // JOINT 6: Gripper Base & Jaws
    const gripperBaseGeo = new THREE.BoxGeometry(42, 12, 18);
    const gripperBase = new THREE.Mesh(gripperBaseGeo, brassBearingMat);
    gripperBase.position.y = 32;
    j5Group.add(gripperBase);

    // Left Finger
    const leftFingerGroup = new THREE.Group();
    leftFingerGroup.position.set(-11, 44, 0);
    j5Group.add(leftFingerGroup);
    jointsRef.current.j6GripperLeft = leftFingerGroup;

    const fingerMainLeftGeo = new THREE.BoxGeometry(7, 34, 10);
    const fingerMainLeft = new THREE.Mesh(fingerMainLeftGeo, darkMetalMat);
    leftFingerGroup.add(fingerMainLeft);

    const gripPadLeftGeo = new THREE.BoxGeometry(5, 24, 8);
    const gripPadLeft = new THREE.Mesh(gripPadLeftGeo, gripperMat.clone());
    gripPadLeft.position.set(4, 0, 0);
    gripPadLeft.userData = {
      jointKey: 'gripper',
      name: 'Joint 6: Gripper Jaw',
      motor: 'SG90 Micro Servo',
      pin: 'GPIO 25',
      range: '0° - 90°',
      axis: 'Claw Pinch / Release'
    };
    leftFingerGroup.add(gripPadLeft);
    intersectables.push(gripPadLeft);

    // Right Finger
    const rightFingerGroup = new THREE.Group();
    rightFingerGroup.position.set(11, 44, 0);
    j5Group.add(rightFingerGroup);
    jointsRef.current.j6GripperRight = rightFingerGroup;

    const fingerMainRightGeo = new THREE.BoxGeometry(7, 34, 10);
    const fingerMainRight = new THREE.Mesh(fingerMainRightGeo, darkMetalMat);
    rightFingerGroup.add(fingerMainRight);

    const gripPadRightGeo = new THREE.BoxGeometry(5, 24, 8);
    const gripPadRight = new THREE.Mesh(gripPadRightGeo, gripperMat.clone());
    gripPadRight.position.set(-4, 0, 0);
    gripPadRight.userData = gripPadLeft.userData;
    rightFingerGroup.add(gripPadRight);
    intersectables.push(gripPadRight);

    intersectableMeshesRef.current = intersectables;

    // Target Marker Sphere for IK Target Mode
    const targetGeo = new THREE.SphereGeometry(9, 20, 20);
    const targetMat = new THREE.MeshBasicMaterial({
      color: 0xff3b30,
      wireframe: true
    });
    const targetMarker = new THREE.Mesh(targetGeo, targetMat);
    targetMarker.visible = false;
    scene.add(targetMarker);
    jointsRef.current.targetMarker = targetMarker;

    // 8. Raycasting & Mouse Interaction (Orbit + Click Selection)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let mouseDownPos = { x: 0, y: 0 };
    let previousMousePosition = { x: 0, y: 0 };

    const domElem = renderer.domElement;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      mouseDownPos = { x: e.clientX, y: e.clientY };
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = domElem.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        const spherical = new THREE.Spherical().setFromVector3(camera.position);
        spherical.theta -= deltaX * 0.008;
        spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.phi - deltaY * 0.008));
        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, 95, 0);

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }

      // Raycasting Check
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(intersectableMeshesRef.current, false);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        if (hitMesh.userData && hitMesh.userData.jointKey) {
          if (highlightedMeshRef.current && highlightedMeshRef.current.mesh !== hitMesh) {
            (highlightedMeshRef.current.mesh.material as THREE.MeshStandardMaterial).emissive.copy(
              highlightedMeshRef.current.originalEmissive
            );
          }

          const mat = hitMesh.material as THREE.MeshStandardMaterial;
          if (!highlightedMeshRef.current || highlightedMeshRef.current.mesh !== hitMesh) {
            highlightedMeshRef.current = {
              mesh: hitMesh,
              originalEmissive: mat.emissive.clone()
            };
          }
          mat.emissive.setHex(0x2563eb);

          setHoveredJoint({
            jointKey: hitMesh.userData.jointKey,
            name: hitMesh.userData.name,
            motor: hitMesh.userData.motor,
            pin: hitMesh.userData.pin,
            range: hitMesh.userData.range,
            axis: hitMesh.userData.axis,
            angle: angles[hitMesh.userData.jointKey as keyof JointAngles],
            mouseX: e.clientX - rect.left + 15,
            mouseY: e.clientY - rect.top + 15
          });
          domElem.style.cursor = 'pointer';
          return;
        }
      }

      if (highlightedMeshRef.current) {
        (highlightedMeshRef.current.mesh.material as THREE.MeshStandardMaterial).emissive.copy(
          highlightedMeshRef.current.originalEmissive
        );
        highlightedMeshRef.current = null;
      }
      setHoveredJoint(null);
      domElem.style.cursor = 'default';
    };

    const onMouseUp = (e: MouseEvent) => {
      isDragging = false;
      const deltaX = Math.abs(e.clientX - mouseDownPos.x);
      const deltaY = Math.abs(e.clientY - mouseDownPos.y);

      // If mouse barely moved, treat as 3D Joint Selection Click
      if (deltaX < 5 && deltaY < 5) {
        const rect = domElem.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(intersectableMeshesRef.current, false);

        if (intersects.length > 0) {
          const hitMesh = intersects[0].object as THREE.Mesh;
          if (hitMesh.userData && hitMesh.userData.jointKey) {
            getArmStoreState().setSelectedJointKey(hitMesh.userData.jointKey as keyof JointAngles);
          }
        } else {
          getArmStoreState().setSelectedJointKey(null);
        }
      }
    };

    domElem.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      domElem.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
      }
    };
  }, [theme]);

  // Update Joint Rotations in Real Time
  useEffect(() => {
    const {
      j1BaseGroup,
      j2ShoulderGroup,
      j3ElbowGroup,
      j4WristPitchGroup,
      j5WristRollGroup,
      j6GripperLeft,
      j6GripperRight,
      targetMarker
    } = jointsRef.current;

    if (j1BaseGroup) j1BaseGroup.rotation.y = - (angles.base - 90) * (Math.PI / 180);
    if (j2ShoulderGroup) j2ShoulderGroup.rotation.z = (angles.shoulder - 90) * (Math.PI / 180);
    if (j3ElbowGroup) j3ElbowGroup.rotation.z = (angles.elbow - 90) * (Math.PI / 180);
    if (j4WristPitchGroup) j4WristPitchGroup.rotation.z = (angles.wristPitch - 90) * (Math.PI / 180);
    if (j5WristRollGroup) j5WristRollGroup.rotation.y = (angles.wristRoll - 90) * (Math.PI / 180);
    if (j6GripperLeft && j6GripperRight) {
      const sep = 6 + (angles.gripper / 90) * 14;
      j6GripperLeft.position.x = -sep;
      j6GripperRight.position.x = sep;
    }

    if (targetMarker && targetPos) {
      targetMarker.visible = isIKMode;
      targetMarker.position.set(targetPos.x, targetPos.z, targetPos.y);
    }

    if (hoveredJoint) {
      setHoveredJoint((prev) =>
        prev ? { ...prev, angle: angles[prev.jointKey] } : null
      );
    }
  }, [angles, targetPos, isIKMode]);

  // Highlight selected joint in 3D scene
  useEffect(() => {
    intersectableMeshesRef.current.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (selectedJointKey && mesh.userData && mesh.userData.jointKey === selectedJointKey) {
        mat.emissive.setHex(0x00f0ff); // Bright Cyan selection glow
      } else {
        if (mesh.userData && mesh.userData.jointKey === 'base' || mesh.userData.jointKey === 'shoulder' || mesh.userData.jointKey === 'elbow') {
          mat.emissive.setHex(0x0d47a1);
        } else if (mesh.userData && mesh.userData.jointKey === 'gripper') {
          mat.emissive.setHex(0x991b1b);
        } else {
          mat.emissive.setHex(0x000000);
        }
      }
    });
  }, [selectedJointKey]);

  // Camera Presets
  const setCameraPreset = (view: 'iso' | 'top' | 'side' | 'front') => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    switch (view) {
      case 'iso':
        cam.position.set(290, 230, 290);
        break;
      case 'top':
        cam.position.set(0, 380, 10);
        break;
      case 'side':
        cam.position.set(380, 100, 0);
        break;
      case 'front':
        cam.position.set(0, 100, 380);
        break;
    }
    cam.lookAt(0, 95, 0);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden'
      }}
    >
      {/* 3D Digital Twin Badge & Selection Indicator */}
      <div className="canvas-overlay-badge">
        <Layers size={14} /> 3D DIGITAL TWIN • 60 FPS
        {selectedJointKey && (
          <span style={{ marginLeft: '0.5rem', color: '#00f0ff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <MousePointerClick size={12} /> Selected: {selectedJointKey.toUpperCase()}
          </span>
        )}
      </div>

      {/* Floating Camera Controls */}
      <div className="camera-controls-overlay">
        <button className="btn-cam" onClick={() => setCameraPreset('iso')}>Isometric</button>
        <button className="btn-cam" onClick={() => setCameraPreset('top')}>Top</button>
        <button className="btn-cam" onClick={() => setCameraPreset('side')}>Side</button>
        <button className="btn-cam" onClick={() => setCameraPreset('front')}>Front</button>
      </div>

      {/* Hover Inspection Tooltip */}
      {hoveredJoint && (
        <div
          className="3d-hover-tooltip"
          style={{
            position: 'absolute',
            left: `${hoveredJoint.mouseX}px`,
            top: `${hoveredJoint.mouseY}px`,
            pointerEvents: 'none',
            zIndex: 50,
            background: 'var(--md-sys-color-surface)',
            border: '2px solid var(--md-sys-color-primary)',
            borderRadius: '14px',
            padding: '0.9rem 1.1rem',
            boxShadow: 'var(--md-elevation-3)',
            minWidth: '230px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
            <Cpu size={18} className="icon-primary" />
            <strong style={{ fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface)' }}>
              {hoveredJoint.name}
            </strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.76rem', fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Live Angle:</span>
              <strong style={{ color: 'var(--md-sys-color-primary)', fontSize: '1rem' }}>
                {hoveredJoint.angle}°
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--md-sys-color-on-surface-variant)' }}>
              <span>Motor:</span>
              <span>{hoveredJoint.motor}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--md-sys-color-on-surface-variant)' }}>
              <span>Pinout:</span>
              <span className="joint-badge">{hoveredJoint.pin}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--md-sys-color-on-surface-variant)' }}>
              <span>Axis:</span>
              <span>{hoveredJoint.axis}</span>
            </div>
            <div style={{ marginTop: '0.3rem', color: 'var(--md-sys-color-primary)', fontSize: '0.7rem', textAlign: 'center', fontStyle: 'italic' }}>
              Click joint to select & focus
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
