// ============================================================================
// ArmLink - ESP32 Robotic Arm Control System Firmware
// Arduino IDE Main Sketch
// Target Board: ESP32 Dev Module / ESP32-WROOM-32
// Hardware: PCA9685 I2C Servo Driver + 6 Servos (3x MG996, 3x MG90S)
// ============================================================================

#include "src/Config.h"
#include "src/ServoDriver.h"
#include "src/ConfigStore.h"
#include "src/SafetyManager.h"
#include "src/MotionPlanner.h"
#include "src/CommandParser.h"
#include "src/SerialManager.h"
#include "src/WifiManager.h"
#include "src/BleManager.h"

// Note: Function definitions setup() and loop() are compiled from src/main.cpp
