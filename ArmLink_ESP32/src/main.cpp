#include <Arduino.h>
#include "Config.h"
#include "ServoDriver.h"
#include "ConfigStore.h"
#include "SafetyManager.h"
#include "MotionPlanner.h"
#include "CommandParser.h"
#include "SerialManager.h"
#include "WifiManager.h"
#include "BleManager.h"

// Global System State & Configs
ArmStateStruct armState;
JointConfig jointConfigs[NUM_JOINTS];

// Broadcast timer tick
unsigned long lastBroadcastTime = 0;
const unsigned long BROADCAST_INTERVAL_MS = 100; // 10 Hz state broadcast

void setup() {
  // 1. Initialize Serial Communication
  serialManager.begin(115200);
  Serial.println("\n======================================");
  Serial.println("   ArmLink Robotic Arm Control System ");
  Serial.printf("   Firmware Version: %s\n", ARMLINK_FIRMWARE_VERSION);
  Serial.println("======================================\n");

  // 2. Load Joint Configuration & Limits from NVS (Preferences)
  configStore.begin();
  configStore.loadJointConfigs(jointConfigs);

  // 3. Initialize PCA9685 Servo Driver HAL
  servoDriver.begin(PIN_I2C_SDA, PIN_I2C_SCL);

  // 4. Initialize Safety & Motion Planner
  safetyManager.begin();
  motionPlanner.begin(armState, jointConfigs);

  // 5. Initialize Network Transports (Wi-Fi WebSocket & BLE GATT)
  wifiManager.begin(&armState, jointConfigs);
  bleManager.begin(&armState, jointConfigs);

  Serial.println("[System] ArmLink initialization complete. Ready for commands.");
}

void loop() {
  // 1. Handle incoming USB Serial commands
  serialManager.handleSerialInput(armState, jointConfigs);

  // 2. Process Wi-Fi WebSocket events
  wifiManager.loop();

  // 3. Motion Interpolation Tick (~50 Hz)
  static unsigned long lastMotionTick = 0;
  if (millis() - lastMotionTick >= MOTION_LOOP_PERIOD_MS) {
    lastMotionTick = millis();
    motionPlanner.tick(armState, jointConfigs);
  }

  // 4. Periodic State Broadcast (~10 Hz)
  if (millis() - lastBroadcastTime >= BROADCAST_INTERVAL_MS) {
    lastBroadcastTime = millis();

    String stateJson = commandParser.createServoStateJson(armState, "broadcast");
    
    // Broadcast to connected WebSocket clients
    if (wifiManager.isConnected()) {
      wifiManager.broadcastState(stateJson);
    }

    // Broadcast to connected BLE client
    if (bleManager.isConnected()) {
      bleManager.broadcastState(stateJson);
    }
  }
}
