#include "MotionPlanner.h"

MotionPlanner motionPlanner;

MotionPlanner::MotionPlanner() : moveDurationMs(300.0f), moveStartMs(0), isMoving(false) {
  for (int i = 0; i < NUM_JOINTS; ++i) {
    startAngles[i] = 90.0f;
  }
}

void MotionPlanner::begin(ArmStateStruct& state, const JointConfig configs[NUM_JOINTS]) {
  for (int i = 0; i < NUM_JOINTS; ++i) {
    state.angles[i] = configs[i].centerAngle;
    state.targetAngles[i] = configs[i].centerAngle;
    startAngles[i] = configs[i].centerAngle;
    servoDriver.setJointAngle(i, state.angles[i], configs[i]);
  }
  state.estopActive = false;
  state.timeoutActive = false;
  state.motionEnabled = true;
  state.lastCommandTimestamp = millis();
}

void MotionPlanner::setTargetAngles(ArmStateStruct& state, const float newTargets[NUM_JOINTS], uint32_t durationMs, const JointConfig configs[NUM_JOINTS]) {
  if (!safetyManager.isMotionAllowed(state)) return;

  moveStartMs = millis();
  moveDurationMs = (durationMs > 20) ? (float)durationMs : 20.0f;
  isMoving = true;

  for (int i = 0; i < NUM_JOINTS; ++i) {
    startAngles[i] = state.angles[i];
    state.targetAngles[i] = safetyManager.clampAngle(i, newTargets[i], configs[i]);
  }
}

void MotionPlanner::moveHome(ArmStateStruct& state, const JointConfig configs[NUM_JOINTS]) {
  float homePose[NUM_JOINTS];
  for (int i = 0; i < NUM_JOINTS; ++i) {
    homePose[i] = configs[i].centerAngle;
  }
  setTargetAngles(state, homePose, 1000, configs); // Move home smoothly over 1s
}

void MotionPlanner::tick(ArmStateStruct& state, const JointConfig configs[NUM_JOINTS]) {
  safetyManager.checkWatchdog(state);

  if (!safetyManager.isMotionAllowed(state)) {
    // If motion not allowed, stay at current position
    return;
  }

  if (!isMoving) return;

  uint32_t elapsedMs = millis() - moveStartMs;
  float progress = (float)elapsedMs / moveDurationMs;

  if (progress >= 1.0f) {
    progress = 1.0f;
    isMoving = false;
  }

  // Smooth ease-in-out cosine interpolation curve
  float smoothProgress = 0.5f * (1.0f - cosf(progress * M_PI));

  for (int i = 0; i < NUM_JOINTS; ++i) {
    float interpolated = startAngles[i] + smoothProgress * (state.targetAngles[i] - startAngles[i]);
    state.angles[i] = safetyManager.clampAngle(i, interpolated, configs[i]);
    servoDriver.setJointAngle(i, state.angles[i], configs[i]);
  }
}
