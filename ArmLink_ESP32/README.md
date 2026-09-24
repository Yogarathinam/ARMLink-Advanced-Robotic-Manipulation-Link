# ArmLink ESP32 Firmware (Arduino IDE & PlatformIO Compatible)

Firmware for the **ESP32-WROOM-32** controller driving a 6-servo robotic arm via **PCA9685 I2C Servo Driver**.

---

## 💻 Arduino IDE Setup Instructions

### 1. Board Installation
1. Open **Arduino IDE** (v2.0+ recommended).
2. Go to `File` → `Preferences`.
3. Add the following URL to **Additional Boards Manager URLs**:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to `Tools` → `Board` → `Boards Manager...`, search for `esp32` by Espressif Systems, and click **Install**.
5. Select Board: `Tools` → `Board` → `ESP32 Arduino` → `ESP32 Dev Module`.

### 2. Install Required Libraries from Library Manager
Go to `Tools` → `Manage Libraries...` (or Ctrl+Shift+I) and install the following:

| Library Name | Author | Version | Notes |
|--------------|--------|---------|-------|
| **Adafruit PWM Servo Driver Library** | Adafruit | 3.0.2+ | PCA9685 I2C servo control |
| **ArduinoJson** | Benoit Blanchon | 7.x+ | Fast JSON parsing & generation |
| **WebSockets** | Markus Sattler | 2.4.x+ | WebSocket server for Wi-Fi control |

*Built-in ESP32 core libraries used automatically:* `Wire`, `WiFi`, `Preferences`, `BLEDevice`, `BLEServer`, `BLEUtils`, `BLE2902`.

### 3. Open & Upload Sketch
1. Open `ArmLink_ESP32/ArmLink_ESP32.ino` in Arduino IDE.
2. Connect your ESP32 via USB cable.
3. Select Port: `Tools` → `Port` → Select your ESP32 COM port.
4. Click **Upload** (or press Ctrl+U).
5. Open **Serial Monitor** at **115200 baud** to see startup logs and IP addresses.

---

## 📌 Pin Mapping (ESP32 ↔ PCA9685)

| ESP32 Pin | PCA9685 Pin | Function |
|-----------|-------------|----------|
| **GPIO 21** | SDA | I2C Data Line |
| **GPIO 22** | SCL | I2C Clock Line |
| **3.3V** | VCC | Driver Logic Power |
| **GND** | GND | Common Ground |
| — | V+ | **External 5V–6V 10A+ PSU** |
| — | GND | Power Ground |

---

## 🛠️ PCA9685 Servo Channel Assignment

| Channel | Joint Name | Servo Model | Range |
|---------|------------|-------------|-------|
| **0** | Base | MG996 | 10° – 170° |
| **1** | Shoulder | MG996 | 25° – 150° |
| **2** | Elbow | MG996 | 15° – 165° |
| **3** | Wrist Pitch | MG90S | 0° – 180° |
| **4** | Wrist Roll | MG90S | 0° – 180° |
| **5** | Gripper | MG90S | 0° – 90° |
