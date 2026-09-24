import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { JointAngles, Vector3D } from '../robot/kinematics';
import { Cpu, Layers } from 'lucide-react';

interface ArmSceneProps {
  angles: JointAngles;
  targetPos?: Vector3D;
  showAxes?: boolean;
  showGrid?: boolean;
  isIKMode?: boolean;
  theme?: 'light' | 'dark';
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
  theme = 'light'
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
    scene.background = new THREE.Color(theme === 'light' ? '#f8f9fa' : '#090d16');
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1200);
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
    renderer.toneMappingExposure = 1.1;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Studio Lighting System (Key, Fill, Rim, Ambient)
    const ambientLight = new THREE.AmbientLight(0xffffff, theme === 'light' ? 0.9 : 0.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(160, 280, 160);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x0b57d0, 0.6);
    fillLight.position.set(-160, 120, -160);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x00f0ff, 1.2, 500);
    rimLight.position.set(0, 300, -200);
    scene.add(rimLight);

    // 5. Ground Floor & Concentric Marking Rings
    if (showGrid) {
      const gridColor = theme === 'light' ? 0x0b57d0 : 0x00f0ff;
      const gridLines = theme === 'light' ? 0xd0d7de : 0x1e293b;
      const grid = new THREE.GridHelper(440, 44, gridColor, gridLines);
      grid.position.y = 0;
      scene.add(grid);

      // Work Zone Ring
      const ringGeo = new THREE.RingGeometry(180, 182, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: gridColor, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
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

    // 6. Curated Metallic Materials
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: theme === 'light' ? 0x24292e : 0x161b22,
      metalness: 0.85,
      roughness: 0.25
    });

    const bodyArmourMat = new THREE.MeshStandardMaterial({
      color: theme === 'light' ? 0x0b57d0 : 0x1a73e8,
      metalness: 0.6,
      roughness: 0.3,
      emissive: 0x041e49,
      emissiveIntensity: 0.15
    });

    const brassBearingMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.15
    });

    const chromeBoltMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.1
    });

    const rubberGripMat = new THREE.MeshStandardMaterial({
      color: 0xd93025,
      metalness: 0.2,
      roughness: 0.6
    });

    const intersectables: THREE.Mesh[] = [];

    // Helper: Add decorative bolts to joint housings
    const addBoltHeads = (parentGroup: THREE.Group, radius: number, yPos: number, count = 6) => {
      const boltGeo = new THREE.CylinderGeometry(2, 2, 2.5, 6);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const bolt = new THREE.Mesh(boltGeo, chromeBoltMat);
        bolt.position.set(Math.cos(angle) * radius, yPos, Math.sin(angle) * radius);
        parentGroup.add(bolt);
      }
    };

    // ------------------------------------------------------------------------
    // 7. HIGH-DETAIL INDUSTRIAL 6-DOF ROBOTIC ARM ASSEMBLY
    // ------------------------------------------------------------------------
    
    // BASE PEDESTAL (Fixed Mounting Plate)
    const basePlateGeo = new THREE.CylinderGeometry(48, 52, 10, 8); // Octagonal flange
    const basePlate = new THREE.Mesh(basePlateGeo, darkMetalMat);
    basePlate.position.y = 5;
    basePlate.receiveShadow = true;
    scene.add(basePlate);

    // Mounting Bolts on Base Flange
    addBoltHeads(scene as any, 44, 10.5, 8);

    // Glowing Base LED Ring
    const ledRingGeo = new THREE.TorusGeometry(32, 1.5, 16, 32);
    const ledRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const ledRing = new THREE.Mesh(ledRingGeo, ledRingMat);
    ledRing.rotation.x = Math.PI / 2;
    ledRing.position.y = 10.5;
    scene.add(ledRing);

    // JOINT 1: Base Rotate Swivel Group
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

    // JOINT 2: Shoulder Fork & Pivot Group
    const j2Group = new THREE.Group();
    j2Group.position.y = 38;
    j1Group.add(j2Group);
    jointsRef.current.j2ShoulderGroup = j2Group;

    // Brass Bearings at Shoulder Pivot
    const shoulderBearingGeo = new THREE.CylinderGeometry(16, 16, 36, 24);
    const shoulderBearing = new THREE.Mesh(shoulderBearingGeo, brassBearingMat);
    shoulderBearing.rotation.z = Math.PI / 2;
    shoulderBearing.castShadow = true;
    j2Group.add(shoulderBearing);

    // Upper Arm Main Structural Link (Dual Carbon/Aluminium Beams)
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

    // Upper Arm Core Armour Casing
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

    // JOINT 3: Elbow Pivot Group
    const j3Group = new THREE.Group();
    j3Group.position.y = 120;
    j2Group.add(j3Group);
    jointsRef.current.j3ElbowGroup = j3Group;

    const elbowBearingGeo = new THREE.CylinderGeometry(14, 14, 30, 24);
    const elbowBearing = new THREE.Mesh(elbowBearingGeo, brassBearingMat);
    elbowBearing.rotation.z = Math.PI / 2;
    elbowBearing.castShadow = true;
    j3Group.add(elbowBearing);

    // Forearm Tapered Shell Link (115 mm)
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

    // Heat Sink Fins on Elbow Servo
    for (let f = 0; f < 4; f++) {
      const finGeo = new THREE.BoxGeometry(22, 2, 22);
      const fin = new THREE.Mesh(finGeo, darkMetalMat);
      fin.position.y = 40 + f * 6;
      j3Group.add(fin);
    }

    // JOINT 4: Wrist Pitch Yoke Group
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

    // JOINT 5: Wrist Roll Rotary Collar
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

    // JOINT 6: Gripper Base & Parallel Jaws
    const gripperBaseGeo = new THREE.BoxGeometry(42, 12, 18);
    const gripperBase = new THREE.Mesh(gripperBaseGeo, brassBearingMat);
    gripperBase.position.y = 32;
    j5Group.add(gripperBase);

    // Left Finger Assembly
    const leftFingerGroup = new THREE.Group();
    leftFingerGroup.position.set(-11, 44, 0);
    j5Group.add(leftFingerGroup);
    jointsRef.current.j6GripperLeft = leftFingerGroup;

    const fingerMainLeftGeo = new THREE.BoxGeometry(7, 34, 10);
    const fingerMainLeft = new THREE.Mesh(fingerMainLeftGeo, darkMetalMat);
    leftFingerGroup.add(fingerMainLeft);

    const gripPadLeftGeo = new THREE.BoxGeometry(4, 24, 8);
    const gripPadLeft = new THREE.Mesh(gripPadLeftGeo, rubberGripMat.clone());
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

    // Right Finger Assembly
    const rightFingerGroup = new THREE.Group();
    rightFingerGroup.position.set(11, 44, 0);
    j5Group.add(rightFingerGroup);
    jointsRef.current.j6GripperRight = rightFingerGroup;

    const fingerMainRightGeo = new THREE.BoxGeometry(7, 34, 10);
    const fingerMainRight = new THREE.Mesh(fingerMainRightGeo, darkMetalMat);
    rightFingerGroup.add(fingerMainRight);

    const gripPadRightGeo = new THREE.BoxGeometry(4, 24, 8);
    const gripPadRight = new THREE.Mesh(gripPadRightGeo, rubberGripMat.clone());
    gripPadRight.position.set(-4, 0, 0);
    gripPadRight.userData = gripPadLeft.userData;
    rightFingerGroup.add(gripPadRight);
    intersectables.push(gripPadRight);

    intersectableMeshesRef.current = intersectables;

    // Target Marker Sphere for IK Target Mode
    const targetGeo = new THREE.SphereGeometry(9, 20, 20);
    const targetMat = new THREE.MeshBasicMaterial({
      color: 0xd93025,
      wireframe: true
    });
    const targetMarker = new THREE.Mesh(targetGeo, targetMat);
    targetMarker.visible = false;
    scene.add(targetMarker);
    jointsRef.current.targetMarker = targetMarker;

    // ------------------------------------------------------------------------
    // 8. Raycasting Mouse Hover Inspection & Smooth Orbit Controls
    // ------------------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const domElem = renderer.domElement;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
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
          mat.emissive.setHex(0x0b57d0);

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

    const onMouseUp = () => {
      isDragging = false;
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

  // Camera Presets (Isometric, Top, Side, Front)
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
      {/* 3D Digital Twin Badge */}
      <div className="canvas-overlay-badge">
        <Layers size={14} /> 3D DIGITAL TWIN • 60 FPS
      </div>

      {/* Floating Camera View Angle Controls */}
      <div className="camera-controls-overlay">
        <button className="btn-cam" onClick={() => setCameraPreset('iso')}>Isometric</button>
        <button className="btn-cam" onClick={() => setCameraPreset('top')}>Top</button>
        <button className="btn-cam" onClick={() => setCameraPreset('side')}>Side</button>
        <button className="btn-cam" onClick={() => setCameraPreset('front')}>Front</button>
      </div>

      {/* Raycasting Hover Tooltip Card */}
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
          </div>
        </div>
      )}
    </div>
  );
};
