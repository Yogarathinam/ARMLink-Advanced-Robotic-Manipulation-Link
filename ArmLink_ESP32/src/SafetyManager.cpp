#include "SafetyManager.h"

SafetyManager safetyManager;

SafetyManager::SafetyManager() : lastActivityMs(0) {}

void SafetyManager::begin() {
  lastActivityMs = millis();
}

float SafetyManager::clampAngle(uint8_t jointIdx, float targetAngle, const JointConfig& config) {
  if (jointIdx >= NUM_JOINTS) return 90.0f;
  return constrain(targetAngle, config.minAngle, config.maxAngle);
}

void SafetyManager::checkWatchdog(ArmStateStruct& state) {
  uint32_t now = millis();
  if (now - lastActivityMs > WATCHDOG_TIMEOUT_MS) {
    if (!state.timeoutActive) {
      state.timeoutActive = true;
      Serial.println("[SafetyManager] WARNING: Watchdog timeout reached! Motion held.");
    }
  } else {
    state.timeoutActive = false;
  }
}

void SafetyManager::feedWatchdog(ArmStateStruct& state) {
  lastActivityMs = millis();
  state.lastCommandTimestamp = lastActivityMs;
  state.timeoutActive = false;
}

void SafetyManager::triggerEStop(ArmStateStruct& state) {
  state.estopActive = true;
  state.motionEnabled = false;
  Serial.println("[SafetyManager] CRITICAL: Emergency Stop (E-Stop) triggered!");
}

void SafetyManager::clearEStop(ArmStateStruct& state) {
  state.estopActive = false;
  state.motionEnabled = true;
  lastActivityMs = millis();
  Serial.println("[SafetyManager] E-Stop cleared. Motion re-enabled.");
}

bool SafetyManager::isMotionAllowed(const ArmStateStruct& state) const {
  return (!state.estopActive && !state.timeoutActive && state.motionEnabled);
}
