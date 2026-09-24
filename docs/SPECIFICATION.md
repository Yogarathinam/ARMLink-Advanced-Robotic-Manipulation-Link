# ArmLink – Full Project Specification Document

**Version:** 0.1  
**Date:** 24 September 2026  
**Author:** ArmLink Project  
**Target Hardware:** ESP32‑WROOM‑32 + PCA9685 + 6 Servos (3× MG996, 3× MG90S)

---

## 1. Project Overview
ArmLink is a web-based robotic arm control system with a real-time 3D digital twin. It allows precise, multi-transport control (Wi‑Fi, BLE, USB serial) of a 6‑servo, 5‑DOF (+ gripper) robotic arm using an ESP32‑WROOM module and a PCA9685 servo driver. The browser interface supports Xbox controller, keyboard, mouse, and slider inputs, with safety features such as joint limits, emergency stop, and communication timeout handling.

---

## 2. System Objectives
- **Bidirectional Control:** Real-time bidirectional control between web application and physical arm hardware.
- **3D Digital Twin:** Interactive 3D visualization using Three.js mirroring servo angles in real time.
- **Multi-Transport Support:** Unified JSON command protocol across Wi‑Fi (WebSocket), BLE (Web Bluetooth), and USB (Web Serial).
- **Multi-Input Control:** Support for Xbox controller, keyboard hotkeys, mouse, UI sliders, and Inverse Kinematics target control.
- **Safety System:** Joint angle limits, speed/acceleration rate caps, hardware/software Emergency Stop (E-Stop), and watchdog communication timeout.
- **Calibration Workflow:** Per-joint calibration wizard with persistent configuration storage in ESP32 Non-Volatile Storage (NVS / Preferences) and browser storage.
- **Modular Architecture:** Extensible software and firmware design for future enhancements (Inverse Kinematics, trajectory recording, telemetry logging, multi-arm support).

---

## 3. Hardware Specifications

### 3.1 Microcontroller: ESP32‑WROOM‑32
- **MCU:** ESP32-D0WDQ6, dual-core Tensilica LX6, up to 240 MHz
- **Flash:** 4 MB SPI Flash
- **Wi-Fi:** 802.11 b/g/n, 2.4 GHz, up to 150 Mbps
- **Bluetooth:** v4.2 BR/EDR + BLE
- **GPIO:** ~34 pins, hardware PWM, I2C, SPI, UART
- **Operating Voltage:** 3.0–3.6 V logic (typically 3.3 V)
- **Peripherals Used:**
  - `I2C`: GPIO21 (SDA), GPIO22 (SCL) → PCA9685
  - `UART0`: USB-Serial bridge (for Web Serial interface)
  - `Wi-Fi STA/AP`: WebSocket server (port 81 / 80)
  - `BLE GATT`: Custom service & characteristics (Web Bluetooth)

### 3.2 Servo Driver: PCA9685
- **Channels:** 16 independent PWM outputs (12-bit resolution, 4096 steps)
- **PWM Frequency:** 50 Hz default for RC servos (configurable 24 Hz – 1.6 kHz)
- **Interface:** I2C address 0x40 (default)
- **Pin Mapping to ESP32:**

| PCA9685 Pin | ESP32 Pin | Function |
|-------------|-----------|----------|
| VCC | 3.3 V | Logic power |
| GND | GND | Common ground |
| SDA | GPIO21 | I2C Data |
| SCL | GPIO22 | I2C Clock |
| V+ | 5–6 V PSU | External Servo Power |
| GND | PSU GND | Common Ground |
| 0–5 | Servos (J1–J6) | Servo Signal Wires |

### 3.3 Servos: MG996 & MG90S
- **3× MG996 (High Torque Metal Gear):**
  - Base (J1), Shoulder (J2), Elbow (J3)
  - Operating Voltage: 4.8–6.0 V
  - Stall Current: ~2.0–2.5 A @ 6 V
  - Torque: 10–12 kg·cm @ 6 V
  - Control Signal: 50 Hz PWM (~500–2500 µs pulse width)
- **3× MG90S (Micro Servo Metal Gear):**
  - Wrist Pitch (J4), Wrist Roll (J5), Gripper (J6)
  - Operating Voltage: 4.8–6.0 V
  - Stall Current: ~0.5–0.8 A @ 6 V
  - Torque: 1.8–2.2 kg·cm @ 6 V
- **Power Budgeting (Worst-case Peak):**
  - 3× MG996 @ 2.5 A = 7.5 A
  - 3× MG90S @ 0.8 A = 2.4 A
  - **Total Worst-Case Stall:** ~9.9 A
  - **Power Supply Requirement:** 5–6 V, 10 A+ regulated DC supply. Bulk decoupling capacitor (1000 µF+) across PCA9685 V+ and GND terminals.

---

## 4. Mechanical & Kinematic Specifications

### 4.1 Arm Configuration

| Joint | Servo | DOF | Mechanical Range | Default Min/Max |
|-------|-------|-----|------------------|-----------------|
| J1 | MG996 | Base Rotate | ~0–180° | 10° – 170° |
| J2 | MG996 | Shoulder | ~0–180° | 25° – 150° |
| J3 | MG996 | Elbow | ~0–180° | 15° – 165° |
| J4 | MG90S | Wrist Pitch | ~0–180° | 0° – 180° |
| J5 | MG90S | Wrist Roll | ~0–180° | 0° – 180° |
| J6 | MG90S | Gripper | ~0–90° | 0° – 90° (Closed/Open) |

### 4.2 Kinematic Chain
```text
base (J1)
 └── shoulder_link (J2)
      └── upper_arm
           └── elbow (J3)
                └── forearm
                     └── wrist_pitch (J4)
                          └── wrist_roll (J5)
                               └── gripper (J6)
```

---

## 5. Communication Protocol (ArmLink Protocol)

All transports (WebSocket, Web Bluetooth, Web Serial) pass standard line-delimited JSON payloads.

### 5.1 Command Payload (Host → ESP32)
```json
{
  "type": "servo_command",
  "angles": {
    "base": 90,
    "shoulder": 70,
    "elbow": 110,
    "wristPitch": 90,
    "wristRoll": 90,
    "gripper": 35
  },
  "duration": 300
}
```

Other command types:
- `home`: `{ "type": "home" }`
- `estop`: `{ "type": "estop" }`
- `calibrate`: `{ "type": "calibrate", "joint": "shoulder", "angle": 90 }`
- `config_get`: `{ "type": "config_get" }`
- `config_set`: `{ "type": "config_set", "limits": { "base": { "min": 10, "max": 170 } } }`

### 5.2 State Payload (ESP32 → Host)
```json
{
  "type": "servo_state",
  "angles": {
    "base": 90,
    "shoulder": 70,
    "elbow": 110,
    "wristPitch": 90,
    "wristRoll": 90,
    "gripper": 35
  },
  "timestamp": 1727167320000,
  "transport": "wifi",
  "estop_active": false,
  "timeout_active": false
}
```

---

## 6. Software Architecture

```text
ArmLink Repository
├── docs/                      # Architectural and specification documentation
├── ArmLink_ESP32/             # ESP32 C++ PlatformIO / Arduino Firmware
│   ├── include/               # Pinout, defaults & struct definitions
│   └── src/                   # HAL drivers, MotionPlanner, SafetyManager, ConfigStore, Transports
└── armlink-web/               # Vite + React + TypeScript + Three.js Web Application
    ├── public/                # 3D assets & static files
    └── src/
        ├── components/        # ArmScene, JointControls, GamepadPanel, ConnectionPanel, SafetyPanel, etc.
        ├── hooks/             # useGamepad, useKeyboardControls, useArmLink
        ├── robot/             # Forward Kinematics, Inverse Kinematics, armConfig
        ├── state/             # Zustand state management (armStore)
        └── transports/        # WifiTransport, BleTransport, SerialTransport, MockTransport
```
