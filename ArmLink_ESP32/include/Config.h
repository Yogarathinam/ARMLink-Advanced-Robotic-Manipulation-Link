#ifndef ARMLINK_CONFIG_H
#define ARMLINK_CONFIG_H

#include <Arduino.h>

// Firmware Version
#define ARMLINK_FIRMWARE_VERSION "0.1.0"

// Hardware I2C & PCA9685 Config
#define PIN_I2C_SDA 21
#define PIN_I2C_SCL 22
#define PCA9685_I2C_ADDR 0x40
#define SERVO_FREQ_HZ 50

// Default Pulse Limits for standard 50Hz PWM (MG996 / MG90S)
// ~500us (0 deg) to ~2500us (180 deg) on 12-bit PCA9685 (4096 steps per 20ms period)
#define DEFAULT_MIN_PULSE_US 500
#define DEFAULT_MAX_PULSE_US 2500

// Number of Joint Servos
#define NUM_JOINTS 6

// Joint Index Enums
enum JointIndex {
  JOINT_BASE = 0,
  JOINT_SHOULDER = 1,
  JOINT_ELBOW = 2,
  JOINT_WRIST_PITCH = 3,
  JOINT_WRIST_ROLL = 4,
  JOINT_GRIPPER = 5
};

// Joint Names
static const char* JOINT_NAMES[NUM_JOINTS] = {
  "base", "shoulder", "elbow", "wristPitch", "wristRoll", "gripper"
};

// Joint Configuration Structure stored per joint in NVS
struct JointConfig {
  uint8_t pcaChannel;
  float minAngle;      // degrees
  float maxAngle;      // degrees
  float centerAngle;   // degrees
  bool reverse;        // invert direction flag
  float offset;        // offset adjustment in degrees
  float maxSpeed;      // deg/s rate limit
  float maxAccel;      // deg/s^2 rate limit
  uint16_t minPulseUs; // pulse width for 0 deg
  uint16_t maxPulseUs; // pulse width for 180 deg
};

// Complete Arm Angles State Structure
struct ArmStateStruct {
  float angles[NUM_JOINTS];
  float targetAngles[NUM_JOINTS];
  uint32_t lastCommandTimestamp;
  bool estopActive;
  bool timeoutActive;
  bool motionEnabled;
};

// Default Configuration Preset
static const JointConfig DEFAULT_JOINT_CONFIGS[NUM_JOINTS] = {
  // Ch, min, max, center, rev, offset, speed, accel, minPulse, maxPulse
  { 0,  10.0f, 170.0f, 90.0f, false, 0.0f, 90.0f, 180.0f, 500, 2500 }, // Base
  { 1,  25.0f, 150.0f, 90.0f, false, 0.0f, 90.0f, 180.0f, 500, 2500 }, // Shoulder
  { 2,  15.0f, 165.0f, 90.0f, false, 0.0f, 90.0f, 180.0f, 500, 2500 }, // Elbow
  { 3,   0.0f, 180.0f, 90.0f, false, 0.0f, 120.0f, 240.0f, 500, 2500 }, // Wrist Pitch
  { 4,   0.0f, 180.0f, 90.0f, false, 0.0f, 120.0f, 240.0f, 500, 2500 }, // Wrist Roll
  { 5,   0.0f,  90.0f, 45.0f, false, 0.0f, 180.0f, 360.0f, 500, 2500 }  // Gripper
};

// Watchdog & Safety Constants
#define WATCHDOG_TIMEOUT_MS 1000
#define MOTION_LOOP_PERIOD_MS 20 // 50 Hz loop

// Wi-Fi Config Defaults
#define WIFI_AP_SSID "ArmLink_AP"
#define WIFI_AP_PASS "arm12345"
#define WEBSOCKET_PORT 81

// BLE Service & Characteristic UUIDs (Nordic UART style for Web Bluetooth)
#define BLE_SERVICE_UUID           "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define BLE_CHARACTERISTIC_UUID_RX "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define BLE_CHARACTERISTIC_UUID_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

#endif // ARMLINK_CONFIG_H
