#ifndef SAFETY_MANAGER_H
#define SAFETY_MANAGER_H

#include <Arduino.h>
#include "Config.h"

class SafetyManager {
public:
  SafetyManager();
  void begin();
  
  float clampAngle(uint8_t jointIdx, float targetAngle, const JointConfig& config);
  void checkWatchdog(ArmStateStruct& state);
  void feedWatchdog(ArmStateStruct& state);
  
  void triggerEStop(ArmStateStruct& state);
  void clearEStop(ArmStateStruct& state);
  
  bool isMotionAllowed(const ArmStateStruct& state) const;

private:
  uint32_t lastActivityMs;
};

extern SafetyManager safetyManager;

#endif // SAFETY_MANAGER_H
