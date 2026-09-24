/* ============================================================================
 * DIY Arduino Robot Arm (Dejan / HowToMechatronics) - ESP32 Port
 * 
 * Controls a 6-DOF Robotic Arm using ESP32 Built-in Bluetooth Classic (SPP)
 * Compatible with the MIT App Inventor Smartphone Application.
 * 
 * Target Board : ESP32 Dev Module / ESP32-WROOM-32
 * Library Req. : ESP32Servo (by Kevin Harrington / John K. Bennett)
 * ============================================================================
 */

#include <BluetoothSerial.h>
#include <ESP32Servo.h>

#if !defined(CONFIG_BT_ENABLED) || !defined(CONFIG_BLUEDROID_ENABLED)
#error Bluetooth is not enabled! Please enable Bluetooth in Arduino IDE Tools Menu.
#endif

BluetoothSerial SerialBT;

// Declare Servo objects for 6 axes
Servo servo01; // Waist / Base
Servo servo02; // Shoulder
Servo servo03; // Elbow
Servo servo04; // Wrist Pitch
Servo servo05; // Wrist Roll
Servo servo06; // Gripper

// ----------------------------------------------------------------------------
// ESP32 GPIO Pin Assignments (5V PWM Safe GPIOs)
// ----------------------------------------------------------------------------
const int PIN_SERVO1 = 13; // Waist / Base (MG996R)
const int PIN_SERVO2 = 12; // Shoulder     (MG996R)
const int PIN_SERVO3 = 14; // Elbow        (MG996R)
const int PIN_SERVO4 = 27; // Wrist Pitch  (SG90)
const int PIN_SERVO5 = 26; // Wrist Roll   (SG90)
const int PIN_SERVO6 = 25; // Gripper      (SG90)

// ----------------------------------------------------------------------------
// Dejan's Robot Arm Initial Default Servo Positions & State Variables
// ----------------------------------------------------------------------------
int servo1Pos = 90,  servo2Pos = 150, servo3Pos = 35,  servo4Pos = 140, servo5Pos = 85,  servo6Pos = 80;
int servo1PPos = 90, servo2PPos = 150, servo3PPos = 35, servo4PPos = 140, servo5PPos = 85, servo6PPos = 80;

// Recording Arrays (up to 50 steps for automatic mode)
const int MAX_STEPS = 50;
int servo01SP[MAX_STEPS];
int servo02SP[MAX_STEPS];
int servo03SP[MAX_STEPS];
int servo04SP[MAX_STEPS];
int servo05SP[MAX_STEPS];
int servo06SP[MAX_STEPS];

int speedDelay = 20; // Delay in ms between step iterations (controls speed)
int index = 0;       // Step counter
String dataIn = "";

// Function Declarations
void processIncomingData(String data);
void moveServoSmooth(Servo &servo, int &currentPos, int targetPos, int stepDelayMs);
void runservo();

void setup() {
  Serial.begin(115200);
  Serial.println("\n--- ESP32 Dejan 6-DOF Robot Arm Controller Initializing ---");

  // Initialize Built-in Bluetooth Classic (SPP)
  // App will connect to Bluetooth device named "ESP32_Robot_Arm"
  SerialBT.begin("ESP32_Robot_Arm");
  Serial.println("[Bluetooth] Bluetooth SPP started as 'ESP32_Robot_Arm'");

  // Allocate hardware PWM timers for ESP32Servo
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  // Set standard PWM frequency for RC Servos (50 Hz)
  servo01.setPeriodHertz(50);
  servo02.setPeriodHertz(50);
  servo03.setPeriodHertz(50);
  servo04.setPeriodHertz(50);
  servo05.setPeriodHertz(50);
  servo06.setPeriodHertz(50);

  // Attach servos with standard 500us to 2500us pulse range
  servo01.attach(PIN_SERVO1, 500, 2500);
  servo02.attach(PIN_SERVO2, 500, 2500);
  servo03.attach(PIN_SERVO3, 500, 2500);
  servo04.attach(PIN_SERVO4, 500, 2500);
  servo05.attach(PIN_SERVO5, 500, 2500);
  servo06.attach(PIN_SERVO6, 500, 2500);

  // --------------------------------------------------------------------------
  // Set Robot Arm to Default Home Positions (exact values from tutorial)
  // --------------------------------------------------------------------------
  servo1PPos = 90;   servo01.write(servo1PPos); // Waist / Base = 90 deg
  servo2PPos = 150;  servo02.write(servo2PPos); // Shoulder     = 150 deg
  servo3PPos = 35;   servo03.write(servo3PPos); // Elbow        = 35 deg
  servo4PPos = 140;  servo04.write(servo4PPos); // Wrist Pitch  = 140 deg
  servo5PPos = 85;   servo05.write(servo5PPos); // Wrist Roll   = 85 deg
  servo6PPos = 80;   servo06.write(servo6PPos); // Gripper      = 80 deg

  Serial.println("[Servos] All 6 Servos moved to default initial positions.");
  Serial.println("[System] Setup complete. Ready for smartphone app commands.");
}

void loop() {
  // Check for incoming Bluetooth serial data from Smartphone
  if (SerialBT.available() > 0) {
    dataIn = SerialBT.readString();
    dataIn.trim(); // Trim trailing newlines or whitespace
    processIncomingData(dataIn);
  }

  // Also check hardware USB Serial Monitor for testing commands
  if (Serial.available() > 0) {
    dataIn = Serial.readString();
    dataIn.trim();
    processIncomingData(dataIn);
  }
}

// ----------------------------------------------------------------------------
// Process Smartphone App Commands (s1..s6, SAVE, RUN, PAUSE, RESET, ss)
// ----------------------------------------------------------------------------
void processIncomingData(String data) {
  // Servo 1: Waist / Base
  if (data.startsWith("s1")) {
    servo1Pos = data.substring(2).toInt();
    moveServoSmooth(servo01, servo1PPos, servo1Pos, 20);
  }
  // Servo 2: Shoulder
  else if (data.startsWith("s2")) {
    servo2Pos = data.substring(2).toInt();
    moveServoSmooth(servo02, servo2PPos, servo2Pos, 50);
  }
  // Servo 3: Elbow
  else if (data.startsWith("s3")) {
    servo3Pos = data.substring(2).toInt();
    moveServoSmooth(servo03, servo3PPos, servo3Pos, 30);
  }
  // Servo 4: Wrist Pitch
  else if (data.startsWith("s4")) {
    servo4Pos = data.substring(2).toInt();
    moveServoSmooth(servo04, servo4PPos, servo4Pos, 30);
  }
  // Servo 5: Wrist Roll
  else if (data.startsWith("s5")) {
    servo5Pos = data.substring(2).toInt();
    moveServoSmooth(servo05, servo5PPos, servo5Pos, 30);
  }
  // Servo 6: Gripper
  else if (data.startsWith("s6")) {
    servo6Pos = data.substring(2).toInt();
    moveServoSmooth(servo06, servo6PPos, servo6Pos, 30);
  }
  // SAVE Button: Store current pose into step array
  else if (data.startsWith("SAVE")) {
    if (index < MAX_STEPS) {
      servo01SP[index] = servo1PPos;
      servo02SP[index] = servo2PPos;
      servo03SP[index] = servo3PPos;
      servo04SP[index] = servo4PPos;
      servo05SP[index] = servo5PPos;
      servo06SP[index] = servo6PPos;
      index++;
      Serial.printf("[SAVE] Recorded Step #%d: [%d, %d, %d, %d, %d, %d]\n",
                    index, servo1PPos, servo2PPos, servo3PPos, servo4PPos, servo5PPos, servo6PPos);
    }
  }
  // RUN Button: Automatic replay mode
  else if (data.startsWith("RUN")) {
    Serial.println("[AUTOMATIC MODE] Running recorded sequence...");
    runservo();
  }
  // RESET Button: Clear step memory
  else if (data == "RESET") {
    memset(servo01SP, 0, sizeof(servo01SP));
    memset(servo02SP, 0, sizeof(servo02SP));
    memset(servo03SP, 0, sizeof(servo03SP));
    memset(servo04SP, 0, sizeof(servo04SP));
    memset(servo05SP, 0, sizeof(servo05SP));
    memset(servo06SP, 0, sizeof(servo06SP));
    index = 0;
    Serial.println("[RESET] Step memory reset to 0.");
  }
}

// ----------------------------------------------------------------------------
// Move Servo Gradually to Prevent Jerk and Control Speed
// ----------------------------------------------------------------------------
void moveServoSmooth(Servo &servo, int &currentPos, int targetPos, int stepDelayMs) {
  if (currentPos > targetPos) {
    for (int j = currentPos; j >= targetPos; j--) {
      servo.write(j);
      delay(stepDelayMs);
    }
  } else if (currentPos < targetPos) {
    for (int j = currentPos; j <= targetPos; j++) {
      servo.write(j);
      delay(stepDelayMs);
    }
  }
  currentPos = targetPos;
}

// ----------------------------------------------------------------------------
// Automatic Sequence Execution Function
// ----------------------------------------------------------------------------
void runservo() {
  while (dataIn != "RESET") {
    for (int i = 0; i <= index - 2; i++) {
      // Check for incoming control commands during loop
      if (SerialBT.available() > 0) {
        dataIn = SerialBT.readString();
        dataIn.trim();

        if (dataIn == "PAUSE") {
          Serial.println("[AUTOMATIC MODE] Paused.");
          while (dataIn != "RUN") {
            if (SerialBT.available() > 0) {
              dataIn = SerialBT.readString();
              dataIn.trim();
              if (dataIn == "RESET") break;
            }
            delay(10);
          }
          Serial.println("[AUTOMATIC MODE] Resumed.");
        }
        
        // Speed slider command (prefix "ss")
        if (dataIn.startsWith("ss")) {
          String speedVal = dataIn.substring(2);
          speedDelay = speedVal.toInt();
          Serial.printf("[SPEED] Updated delay to %d ms\n", speedDelay);
        }

        if (dataIn == "RESET") {
          break;
        }
      }

      // Replay stored motion for each joint
      moveServoSmooth(servo01, servo1PPos, servo01SP[i + 1], speedDelay);
      moveServoSmooth(servo02, servo2PPos, servo02SP[i + 1], speedDelay);
      moveServoSmooth(servo03, servo3PPos, servo03SP[i + 1], speedDelay);
      moveServoSmooth(servo04, servo4PPos, servo04SP[i + 1], speedDelay);
      moveServoSmooth(servo05, servo5PPos, servo05SP[i + 1], speedDelay);
      moveServoSmooth(servo06, servo6PPos, servo06SP[i + 1], speedDelay);
    }
  }
}
