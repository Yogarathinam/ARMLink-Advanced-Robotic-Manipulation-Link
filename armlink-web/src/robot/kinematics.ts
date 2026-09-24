// ============================================================================
// ArmLink - 6-DOF Robotic Arm Kinematics Engine (FK & IK)
// ============================================================================

export interface JointAngles {
  base: number;       // J1: 0..180 deg
  shoulder: number;   // J2: 0..180 deg
  elbow: number;      // J3: 0..180 deg
  wristPitch: number; // J4: 0..180 deg
  wristRoll: number;  // J5: 0..180 deg
  gripper: number;    // J6: 0..90 deg
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

// Arm Segment Physical Dimensions (in millimeters)
export const ARM_DIMENSIONS = {
  baseHeight: 85,       // Height of base swivel joint center
  upperArmLength: 120,   // Distance from shoulder joint to elbow joint
  forearmLength: 115,    // Distance from elbow joint to wrist pitch joint
  wristToTipLength: 75   // Distance from wrist pitch joint to gripper tip
};

/**
 * Forward Kinematics (FK): Calculates end-effector 3D position (x, y, z) in mm
 * based on joint angles in degrees.
 */
export function calculateFK(angles: JointAngles): Vector3D {
  // Convert angles to radians
  const baseRad = (angles.base - 90) * (Math.PI / 180);           // -90 to +90 deg azimuth
  const shoulderRad = (angles.shoulder - 90) * (Math.PI / 180);     // Elevation from horizontal
  const elbowRad = (angles.elbow - 90) * (Math.PI / 180);           // Relative elbow angle
  const wristRad = (angles.wristPitch - 90) * (Math.PI / 180);       // Wrist pitch angle

  const L1 = ARM_DIMENSIONS.baseHeight;
  const L2 = ARM_DIMENSIONS.upperArmLength;
  const L3 = ARM_DIMENSIONS.forearmLength;
  const L4 = ARM_DIMENSIONS.wristToTipLength;

  // Cumulative angles in elevation plane
  const theta2 = shoulderRad;
  const theta3 = theta2 + elbowRad;
  const theta4 = theta3 + wristRad;

  // Planar reach r and height z
  const r = L2 * Math.cos(theta2) + L3 * Math.cos(theta3) + L4 * Math.cos(theta4);
  const z = L1 + L2 * Math.sin(theta2) + L3 * Math.sin(theta3) + L4 * Math.sin(theta4);

  // 3D Cartesian coordinates
  const x = r * Math.cos(baseRad);
  const y = r * Math.sin(baseRad);

  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    z: Math.round(z * 10) / 10
  };
}

/**
 * Geometric Analytical Inverse Kinematics (IK):
 * Given target (x, y, z) end-effector position and desired wrist angle (pitch),
 * calculates required joint angles in degrees.
 * Returns null if the target point is outside the reachable workspace.
 */
export function calculateIK(target: Vector3D, desiredWristPitchDeg = 90): JointAngles | null {
  const L1 = ARM_DIMENSIONS.baseHeight;
  const L2 = ARM_DIMENSIONS.upperArmLength;
  const L3 = ARM_DIMENSIONS.forearmLength;
  const L4 = ARM_DIMENSIONS.wristToTipLength;

  // 1. Base Azimuth Angle J1
  let baseRad = Math.atan2(target.y, target.x);
  let baseDeg = (baseRad * (180 / Math.PI)) + 90;
  baseDeg = Math.min(Math.max(baseDeg, 0), 180);

  // Planar radial distance r
  const rTarget = Math.sqrt(target.x * target.x + target.y * target.y);

  // Wrist pitch orientation angle in radians
  const wristPitchRad = (desiredWristPitchDeg - 90) * (Math.PI / 180);

  // Wrist center position (Rw, Zw)
  const Rw = rTarget - L4 * Math.cos(wristPitchRad);
  const Zw = target.z - L1 - L4 * Math.sin(wristPitchRad);

  // Distance from shoulder joint to wrist center
  const D2 = Rw * Rw + Zw * Zw;
  const D = Math.sqrt(D2);

  // Reachability check (Triangle inequality)
  if (D > (L2 + L3) || D < Math.abs(L2 - L3) || D === 0) {
    return null; // Target unreachable
  }

  // 2. Elbow Angle J3 (using law of cosines)
  const cosElbow = (D2 - L2 * L2 - L3 * L3) / (2 * L2 * L3);
  const clampedCosElbow = Math.min(Math.max(cosElbow, -1.0), 1.0);
  const elbowRelativeRad = Math.acos(clampedCosElbow); // Elbow-up configuration

  // 3. Shoulder Angle J2
  const alpha = Math.atan2(Zw, Rw);
  const beta = Math.acos((L2 * L2 + D2 - L3 * L3) / (2 * L2 * D));
  const shoulderRad = alpha + beta;

  // Convert to Servo Angles (0 - 180 deg)
  const shoulderDeg = (shoulderRad * (180 / Math.PI)) + 90;
  const elbowDeg = 90 - (elbowRelativeRad * (180 / Math.PI));
  
  // 4. Wrist Pitch Angle J4
  const wristDeg = desiredWristPitchDeg;

  return {
    base: Math.min(Math.max(Math.round(baseDeg), 0), 180),
    shoulder: Math.min(Math.max(Math.round(shoulderDeg), 0), 180),
    elbow: Math.min(Math.max(Math.round(elbowDeg), 0), 180),
    wristPitch: Math.min(Math.max(Math.round(wristDeg), 0), 180),
    wristRoll: 90, // Keep roll neutral in standard IK solve
    gripper: 35   // Default gripper position
  };
}
