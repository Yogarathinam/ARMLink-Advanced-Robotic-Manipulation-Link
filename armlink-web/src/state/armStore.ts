import { type JointAngles, type Vector3D, calculateFK } from '../robot/kinematics';

export type TransportType = 'none' | 'wifi' | 'ble' | 'serial' | 'mock';
export type ControlMode = 'manual' | 'gamepad' | 'ik' | 'sequence' | 'calibrate';
export type ThemeMode = 'light' | 'dark';

export interface JointLimits {
  min: number;
  max: number;
  center: number;
  offset: number;
  reverse: boolean;
}

export interface PosePreset {
  id: string;
  name: string;
  angles: JointAngles;
  duration: number;
}

export interface ArmStoreState {
  // Theme (Light Mode default)
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Joint Angles & Kinematics
  angles: JointAngles;
  targetAngles: JointAngles;
  endEffectorPos: Vector3D;
  jointLimits: Record<keyof JointAngles, JointLimits>;
  
  // Transport & Connection
  transportType: TransportType;
  isConnected: boolean;
  isConnecting: boolean;
  ipAddress: string;
  serialBaud: number;
  statusMessage: string;
  latencyMs: number;

  // Safety System
  estopActive: boolean;
  timeoutActive: boolean;
  motionEnabled: boolean;

  // Mode Selection
  controlMode: ControlMode;

  // Poses & Sequence Player
  savedPoses: PosePreset[];
  activeSequence: PosePreset[];
  isPlayingSequence: boolean;
  currentStepIndex: number;
  loopSequence: boolean;

  // Actions
  setJointAngle: (joint: keyof JointAngles, angle: number) => void;
  setAllAngles: (angles: JointAngles) => void;
  setTargetAngles: (angles: JointAngles) => void;
  setJointLimit: (joint: keyof JointAngles, limitKey: keyof JointLimits, value: number | boolean) => void;
  setTransport: (type: TransportType) => void;
  setConnected: (connected: boolean, message?: string) => void;
  setEstop: (active: boolean) => void;
  setControlMode: (mode: ControlMode) => void;
  saveCurrentPose: (name: string) => void;
  deletePose: (id: string) => void;
  setSequence: (sequence: PosePreset[]) => void;
  setIsPlayingSequence: (playing: boolean) => void;
  setCurrentStepIndex: (index: number) => void;
}

// Default Joint Limits (matching ArmLink hardware specification)
export const DEFAULT_JOINT_LIMITS: Record<keyof JointAngles, JointLimits> = {
  base:       { min: 10,  max: 170, center: 90, offset: 0, reverse: false },
  shoulder:   { min: 25,  max: 150, center: 90, offset: 0, reverse: false },
  elbow:      { min: 15,  max: 165, center: 90, offset: 0, reverse: false },
  wristPitch: { min: 0,   max: 180, center: 90, offset: 0, reverse: false },
  wristRoll:  { min: 0,   max: 180, center: 90, offset: 0, reverse: false },
  gripper:    { min: 0,   max: 90,  center: 45, offset: 0, reverse: false },
};

// Default Initial Pose (Dejan's Robot Arm Default Positions)
export const DEFAULT_ANGLES: JointAngles = {
  base: 90,
  shoulder: 150,
  elbow: 35,
  wristPitch: 140,
  wristRoll: 85,
  gripper: 80
};

// Preloaded Preset Poses
export const DEFAULT_POSES: PosePreset[] = [
  {
    id: 'home',
    name: 'Home Stance',
    angles: { base: 90, shoulder: 150, elbow: 35, wristPitch: 140, wristRoll: 85, gripper: 80 },
    duration: 1000
  },
  {
    id: 'rest',
    name: 'Rest Pose',
    angles: { base: 90, shoulder: 130, elbow: 20, wristPitch: 90, wristRoll: 90, gripper: 10 },
    duration: 1200
  },
  {
    id: 'reach_forward',
    name: 'Reach Forward',
    angles: { base: 90, shoulder: 70, elbow: 110, wristPitch: 90, wristRoll: 90, gripper: 35 },
    duration: 1500
  },
  {
    id: 'pick_left',
    name: 'Pick Object (Left)',
    angles: { base: 30, shoulder: 60, elbow: 120, wristPitch: 45, wristRoll: 90, gripper: 90 },
    duration: 1500
  },
  {
    id: 'place_right',
    name: 'Place Object (Right)',
    angles: { base: 150, shoulder: 60, elbow: 120, wristPitch: 45, wristRoll: 90, gripper: 0 },
    duration: 1500
  }
];

// Simple React state store subscriber pattern
type Listener = () => void;
let state: ArmStoreState;
const listeners = new Set<Listener>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

const initialEndEffector = calculateFK(DEFAULT_ANGLES);

state = {
  theme: 'light',
  setTheme: (newTheme) => {
    state.theme = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
    emitChange();
  },

  angles: { ...DEFAULT_ANGLES },
  targetAngles: { ...DEFAULT_ANGLES },
  endEffectorPos: initialEndEffector,
  jointLimits: JSON.parse(JSON.stringify(DEFAULT_JOINT_LIMITS)),
  
  transportType: 'mock',
  isConnected: true, // Starts in offline simulation / mock transport mode
  isConnecting: false,
  ipAddress: '192.168.4.1',
  serialBaud: 115200,
  statusMessage: 'Offline Simulation Mode Active',
  latencyMs: 8,

  estopActive: false,
  timeoutActive: false,
  motionEnabled: true,

  controlMode: 'manual',

  savedPoses: [...DEFAULT_POSES],
  activeSequence: [],
  isPlayingSequence: false,
  currentStepIndex: 0,
  loopSequence: false,

  setJointAngle: (joint, rawAngle) => {
    const limit = state.jointLimits[joint];
    const clampedAngle = Math.min(Math.max(rawAngle, limit.min), limit.max);
    
    state.angles = { ...state.angles, [joint]: clampedAngle };
    state.targetAngles = { ...state.targetAngles, [joint]: clampedAngle };
    state.endEffectorPos = calculateFK(state.angles);
    emitChange();
  },

  setAllAngles: (newAngles) => {
    const clamped: JointAngles = { ...newAngles };
    (Object.keys(newAngles) as Array<keyof JointAngles>).forEach((j) => {
      const limit = state.jointLimits[j];
      clamped[j] = Math.min(Math.max(newAngles[j], limit.min), limit.max);
    });
    
    state.angles = clamped;
    state.targetAngles = clamped;
    state.endEffectorPos = calculateFK(clamped);
    emitChange();
  },

  setTargetAngles: (newAngles) => {
    state.targetAngles = { ...newAngles };
    emitChange();
  },

  setJointLimit: (joint, limitKey, value) => {
    state.jointLimits[joint] = {
      ...state.jointLimits[joint],
      [limitKey]: value
    };
    emitChange();
  },

  setTransport: (type) => {
    state.transportType = type;
    if (type === 'mock') {
      state.isConnected = true;
      state.statusMessage = 'Simulation Mode Active';
    } else {
      state.isConnected = false;
      state.statusMessage = `Selected transport: ${type.toUpperCase()}`;
    }
    emitChange();
  },

  setConnected: (connected, message) => {
    state.isConnected = connected;
    if (message) state.statusMessage = message;
    emitChange();
  },

  setEstop: (active) => {
    state.estopActive = active;
    state.statusMessage = active ? 'EMERGENCY STOP ACTIVATED!' : 'System Resumed';
    emitChange();
  },

  setControlMode: (mode) => {
    state.controlMode = mode;
    emitChange();
  },

  saveCurrentPose: (name) => {
    const newPose: PosePreset = {
      id: `pose_${Date.now()}`,
      name: name || `Pose ${state.savedPoses.length + 1}`,
      angles: { ...state.angles },
      duration: 1200
    };
    state.savedPoses = [...state.savedPoses, newPose];
    emitChange();
  },

  deletePose: (id) => {
    state.savedPoses = state.savedPoses.filter((p) => p.id !== id);
    emitChange();
  },

  setSequence: (sequence) => {
    state.activeSequence = sequence;
    state.currentStepIndex = 0;
    emitChange();
  },

  setIsPlayingSequence: (playing) => {
    state.isPlayingSequence = playing;
    emitChange();
  },

  setCurrentStepIndex: (index) => {
    state.currentStepIndex = index;
    emitChange();
  }
};

export function getArmStoreState(): ArmStoreState {
  return state;
}

export function subscribeArmStore(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
