/* ============================================================================
 * ArmLink - Direct GPIO ESP32 Robotic Arm Firmware (Arduino IDE Sketch)
 * 
 * NO PCA9685 MODULE NEEDED! Servos connect directly to ESP32 GPIO pins.
 * ZERO EXTERNAL LIBRARIES REQUIRED! Compiles out-of-the-box in Arduino IDE.
 * 
 * Hardware GPIO Connection Mapping:
 *   - Joint 1 (Waist / Base)    : GPIO 13 (MG996R)
 *   - Joint 2 (Shoulder)        : GPIO 12 (MG996R)
 *   - Joint 3 (Elbow)           : GPIO 14 (MG996R)
 *   - Joint 4 (Wrist Pitch)     : GPIO 27 (SG90)
 *   - Joint 5 (Wrist Roll)      : GPIO 26 (SG90)
 *   - Joint 6 (Gripper)         : GPIO 25 (SG90)
 * 
 * Supports 3 Transports Simultaneously:
 *   1. USB Web Serial (UART0 @ 115200 baud)
 *   2. Wi-Fi SoftAP Server (http://192.168.4.1:81)
 *   3. Web Bluetooth LE (Nordic UART GATT Service UUID 6e400001-...)
 * ============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <esp_arduino_version.h>

// ----------------------------------------------------------------------------
// GPIO Pin Definitions (Direct Servo Pins)
// ----------------------------------------------------------------------------
const uint8_t SERVO_PINS[6] = { 13, 12, 14, 27, 26, 25 };

#define WIFI_SSID "ArmLink_AP"
#define WIFI_PASS "arm12345"

#define BLE_SERVICE_UUID           "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define BLE_CHARACTERISTIC_UUID_RX "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define BLE_CHARACTERISTIC_UUID_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

#define NUM_JOINTS 6

// ----------------------------------------------------------------------------
// Joint Structures & Default Angles (Dejan / ArmLink Stance)
// ----------------------------------------------------------------------------
struct JointConfig {
  uint8_t gpioPin;
  uint8_t ledcChannel;
  float currentAngle;
  float targetAngle;
  float minLimit;
  float maxLimit;
  uint16_t minPulseUs;
  uint16_t maxPulseUs;
};

JointConfig joints[NUM_JOINTS] = {
  { 13, 0,  90.0f,  90.0f, 10.0f, 170.0f, 500, 2500 }, // J1: Base (MG996R)
  { 12, 1, 150.0f, 150.0f, 25.0f, 150.0f, 500, 2500 }, // J2: Shoulder (MG996R)
  { 14, 2,  35.0f,  35.0f, 15.0f, 165.0f, 500, 2500 }, // J3: Elbow (MG996R)
  { 27, 3, 140.0f, 140.0f,  0.0f, 180.0f, 500, 2500 }, // J4: Wrist Pitch (SG90)
  { 26, 4,  85.0f,  85.0f,  0.0f, 180.0f, 500, 2500 }, // J5: Wrist Roll (SG90)
  { 25, 5,  80.0f,  80.0f,  0.0f,  90.0f, 500, 2500 }  // J6: Gripper (SG90)
};

bool estopActive = false;
unsigned long lastBroadcastTime = 0;

// Bluetooth LE Objects
BLEServer* pBleServer = NULL;
BLECharacteristic* pTxCharacteristic = NULL;
bool bleClientConnected = false;

// Wi-Fi Server Object
WiFiServer wifiServer(81);

// Function Declarations
void initDirectServoPWM(uint8_t jointIdx);
void writeServoPulseUs(uint8_t jointIdx, uint16_t pulseUs);
void setServoAngle(uint8_t jointIdx, float angleDeg);
void parseAndExecuteCommand(String cmd);
void loopMotionAndTelemetry();
void broadcastState();

// ----------------------------------------------------------------------------
// BLE Callbacks
// ----------------------------------------------------------------------------
class ServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      bleClientConnected = true;
      Serial.println("[BLE] Web Bluetooth Client Connected.");
    };
    void onDisconnect(BLEServer* pServer) {
      bleClientConnected = false;
      Serial.println("[BLE] Client Disconnected. Restarting advertising.");
      pServer->getAdvertising()->start();
    }
};

class BleRxCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      String rxValue = pCharacteristic->getValue().c_str();
      if (rxValue.length() > 0) {
        parseAndExecuteCommand(rxValue);
      }
    }
};

// ----------------------------------------------------------------------------
// Setup
// ----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n==================================================");
  Serial.println("  ArmLink Direct GPIO ESP32 Servo Firmware Ready  ");
  Serial.println("==================================================");

  // 1. Initialize Direct ESP32 LEDC PWM Timers for Servos
  for (int i = 0; i < NUM_JOINTS; i++) {
    initDirectServoPWM(i);
    setServoAngle(i, joints[i].currentAngle);
  }
  Serial.println("[Hardware] All 6 Servos attached to direct GPIO pins (13,12,14,27,26,25).");

  // 2. Initialize Wi-Fi SoftAP Server
  WiFi.softAP(WIFI_SSID, WIFI_PASS);
  IPAddress myIP = WiFi.softAPIP();
  wifiServer.begin();
  Serial.print("[Wi-Fi] SoftAP Started. IP: ");
  Serial.print(myIP);
  Serial.println(" Port: 81");

  // 3. Initialize Web Bluetooth LE
  BLEDevice::init("ESP32_ArmLink_BLE");
  pBleServer = BLEDevice::createServer();
  pBleServer->setCallbacks(new ServerCallbacks());

  BLEService *pService = pBleServer->createService(BLE_SERVICE_UUID);
  pTxCharacteristic = pService->createCharacteristic(
                        BLE_CHARACTERISTIC_UUID_TX,
                        BLECharacteristic::PROPERTY_NOTIFY
                      );
  pTxCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
                                          BLE_CHARACTERISTIC_UUID_RX,
                                          BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
                                        );
  pRxCharacteristic->setCallbacks(new BleRxCallbacks());

  pService->start();
  pBleServer->getAdvertising()->start();
  Serial.println("[BLE] Web Bluetooth GATT Server Advertising.");
}

// ----------------------------------------------------------------------------
// Direct ESP32 Hardware PWM Functions
// ----------------------------------------------------------------------------
void initDirectServoPWM(uint8_t jointIdx) {
  uint8_t pin = joints[jointIdx].gpioPin;
  uint8_t ch = joints[jointIdx].ledcChannel;

  #if ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcAttach(pin, 50, 16); // pin, 50Hz, 16-bit timer resolution
  #else
    ledcSetup(ch, 50, 16);   // channel, 50Hz, 16-bit timer resolution
    ledcAttachPin(pin, ch);
  #endif
}

void writeServoPulseUs(uint8_t jointIdx, uint16_t pulseUs) {
  uint8_t pin = joints[jointIdx].gpioPin;
  uint8_t ch = joints[jointIdx].ledcChannel;

  // 16-bit resolution @ 50Hz = 65535 ticks per 20000 microseconds
  uint32_t duty = (pulseUs * 65535UL) / 20000UL;

  #if ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcWrite(pin, duty);
  #else
    ledcWrite(ch, duty);
  #endif
}

void setServoAngle(uint8_t jointIdx, float angleDeg) {
  if (jointIdx >= NUM_JOINTS) return;

  // Clamp angle to mechanical limits
  angleDeg = constrain(angleDeg, joints[jointIdx].minLimit, joints[jointIdx].maxLimit);

  // Map 0-180 degrees to microsecond pulse range (500us - 2500us)
  float pulseUs = joints[jointIdx].minPulseUs + (angleDeg / 180.0f) * (joints[jointIdx].maxPulseUs - joints[jointIdx].minPulseUs);

  writeServoPulseUs(jointIdx, (uint16_t)pulseUs);
}

// ----------------------------------------------------------------------------
// Loop Execution
// ----------------------------------------------------------------------------
void loop() {
  // 1. Handle Wi-Fi Client Connections
  WiFiClient client = wifiServer.available();
  if (client) {
    while (client.connected()) {
      if (client.available()) {
        String req = client.readStringUntil('\n');
        req.trim();
        if (req.length() > 0) parseAndExecuteCommand(req);
      }
      loopMotionAndTelemetry();
    }
  } else {
    loopMotionAndTelemetry();
  }
}

void loopMotionAndTelemetry() {
  // USB Serial Input Check
  if (Serial.available() > 0) {
    String serialInput = Serial.readStringUntil('\n');
    serialInput.trim();
    if (serialInput.length() > 0) parseAndExecuteCommand(serialInput);
  }

  // Servo Motion Smooth Interpolation (~50Hz)
  static unsigned long lastMotionTick = 0;
  if (millis() - lastMotionTick >= 20) {
    lastMotionTick = millis();

    if (!estopActive) {
      for (int i = 0; i < NUM_JOINTS; i++) {
        float diff = joints[i].targetAngle - joints[i].currentAngle;
        if (abs(diff) > 0.1f) {
          joints[i].currentAngle += diff * 0.25f; // Step interpolation
          setServoAngle(i, joints[i].currentAngle);
        } else {
          joints[i].currentAngle = joints[i].targetAngle;
          setServoAngle(i, joints[i].currentAngle);
        }
      }
    }
  }

  // Periodic Telemetry State Broadcast (~10Hz)
  if (millis() - lastBroadcastTime >= 100) {
    lastBroadcastTime = millis();
    broadcastState();
  }
}

// ----------------------------------------------------------------------------
// Command Parser
// ----------------------------------------------------------------------------
float extractNumber(String str, String key) {
  int idx = str.indexOf(key);
  if (idx == -1) return -999.0f;
  int start = str.indexOf(':', idx) + 1;
  int end = str.indexOf(',', start);
  if (end == -1) end = str.indexOf('}', start);
  if (end == -1) return -999.0f;
  return str.substring(start, end).toFloat();
}

void parseAndExecuteCommand(String cmd) {
  // ArmLink JSON Protocol: {"type":"servo_command", "angles":{...}}
  if (cmd.indexOf("servo_command") != -1 || cmd.indexOf("angles") != -1) {
    float val;
    val = extractNumber(cmd, "\"base\"");       if (val != -999.0f) joints[0].targetAngle = val;
    val = extractNumber(cmd, "\"shoulder\"");   if (val != -999.0f) joints[1].targetAngle = val;
    val = extractNumber(cmd, "\"elbow\"");      if (val != -999.0f) joints[2].targetAngle = val;
    val = extractNumber(cmd, "\"wristPitch\""); if (val != -999.0f) joints[3].targetAngle = val;
    val = extractNumber(cmd, "\"wristRoll\"");  if (val != -999.0f) joints[4].targetAngle = val;
    val = extractNumber(cmd, "\"gripper\"");    if (val != -999.0f) joints[5].targetAngle = val;
  }
  // Mobile App Slider Command Prefixes (s1..s6)
  else if (cmd.startsWith("s1")) joints[0].targetAngle = cmd.substring(2).toFloat();
  else if (cmd.startsWith("s2")) joints[1].targetAngle = cmd.substring(2).toFloat();
  else if (cmd.startsWith("s3")) joints[2].targetAngle = cmd.substring(2).toFloat();
  else if (cmd.startsWith("s4")) joints[3].targetAngle = cmd.substring(2).toFloat();
  else if (cmd.startsWith("s5")) joints[4].targetAngle = cmd.substring(2).toFloat();
  else if (cmd.startsWith("s6")) joints[5].targetAngle = cmd.substring(2).toFloat();
  
  // Home Pose
  else if (cmd.indexOf("home") != -1) {
    joints[0].targetAngle = 90.0f;
    joints[1].targetAngle = 150.0f;
    joints[2].targetAngle = 35.0f;
    joints[3].targetAngle = 140.0f;
    joints[4].targetAngle = 85.0f;
    joints[5].targetAngle = 80.0f;
    Serial.println("[Command] Returning to Home stance.");
  }
  // Emergency Stop (E-Stop)
  else if (cmd.indexOf("estop") != -1) {
    estopActive = (cmd.indexOf("true") != -1);
    if (estopActive) {
      Serial.println("[E-STOP] Emergency Stop Activated!");
    } else {
      Serial.println("[E-STOP] Emergency Stop Released.");
    }
  }
}

// ----------------------------------------------------------------------------
// Telemetry State Broadcast (ESP32 -> Host)
// ----------------------------------------------------------------------------
void broadcastState() {
  String json = "{\"type\":\"servo_state\",\"angles\":{";
  json += "\"base\":" + String(joints[0].currentAngle, 1) + ",";
  json += "\"shoulder\":" + String(joints[1].currentAngle, 1) + ",";
  json += "\"elbow\":" + String(joints[2].currentAngle, 1) + ",";
  json += "\"wristPitch\":" + String(joints[3].currentAngle, 1) + ",";
  json += "\"wristRoll\":" + String(joints[4].currentAngle, 1) + ",";
  json += "\"gripper\":" + String(joints[5].currentAngle, 1);
  json += "},\"timestamp\":" + String(millis()) + ",\"estop_active\":" + (estopActive ? "true" : "false") + "}";

  // Broadcast to USB Serial
  Serial.println(json);

  // Broadcast to BLE Client
  if (bleClientConnected && pTxCharacteristic) {
    pTxCharacteristic->setValue(json.c_str());
    pTxCharacteristic->notify();
  }
}
