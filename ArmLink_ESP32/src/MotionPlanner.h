#ifndef MOTION_PLANNER_H
#define MOTION_PLANNER_H

#include <Arduino.h>
#include "Config.h"
#include "ServoDriver.h"
#include "SafetyManager.h"

class MotionPlanner {
public:
  MotionPlanner();
  void begin(ArmStateStruct& state, const JointConfig configs[NUM_JOINTS]);
  
  void setTargetAngles(ArmStateStruct& state, const float newTargets[NUM_JOINTS], uint32_t durationMs, const JointConfig configs[NUM_JOINTS]);
  void moveHome(ArmStateStruct& state, const JointConfig configs[NUM_JOINTS]);
  void tick(ArmStateStruct& state, const JointConfig configs[NUM_JOINTS]);

private:
  float startAngles[NUM_JOINTS];
  float moveDurationMs;
  uint32_t moveStartMs;
  bool isMoving;
};

extern MotionPlanner motionPlanner;

#endif // MOTION_PLANNER_H
