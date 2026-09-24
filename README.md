# ArmLink — Advanced Robotic Manipulation Link

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Firmware](https://img.shields.io/badge/Firmware-ESP32%20%7C%20FreeRTOS%20%7C%20PCA9685-orange.svg)](#firmware-architecture)
[![Web App](https://img.shields.io/badge/Web%20App-React%20%7C%20Vite%20%7C%20Three.js%20%7C%20TypeScript-blueviolet.svg)](#web-application)
[![Transports](https://img.shields.io/badge/Transports-Wi--Fi%20%7C%20BLE%20%7C%20USB%20Serial-green.svg)](#communication-protocol)

**ArmLink** is an end-to-end, high-performance robotic arm control system featuring a real-time **3D Digital Twin**, multi-transport connectivity (**Wi-Fi WebSocket, Web Bluetooth BLE, USB Web Serial**), and multi-modal controls (**Xbox Gamepad, Keyboard Hotkeys, UI Sliders, Forward & Inverse Kinematics**). 

Targeted for an **ESP32-WROOM-32** paired with a **PCA9685 16-channel PWM driver** and a **6-servo, 5-DOF + Gripper arm** (3× MG996 high-torque metal gear servos, 3× MG90S micro servos).

---

## 🤖 Features Overview

- 🌐 **Unified Multi-Transport Interface:** Seamless switching between Wi-Fi (WebSocket), Bluetooth Low Energy (Web Bluetooth GATT), USB Serial (Web Serial API), and an offline Simulation Mode.
- 🎮 **Real-Time 3D Digital Twin:** Rendered with Three.js / React Three Fiber at 60 FPS featuring interactive joint hierarchy, shadows, spatial axes gizmo, dynamic end-effector position tracking, and target marker positioning.
- 🕹️ **Multi-Input Control Engine:**
  - **Xbox / Gamepad Control:** Live stick axis velocity mapping, trigger control, button action triggers, customizable deadzones, and interactive gamepad visualizer.
  - **Keyboard Hotkeys:** Q/A, W/S, E/D, R/F, T/G, O/P velocity controls + Spacebar instant E-Stop + H Home key.
  - **Precision Sliders:** Fine numeric stepping (+/- 1°, +/- 5°), soft min/max limit enforcement.
  - **Inverse Kinematics (IK):** Point-and-click end-effector target positioning (X, Y, Z coordinates).
- 🛡️ **Industrial Safety System:**
  - Hard & soft joint angle limits stored in ESP32 Non-Volatile Storage (NVS).
  - Software & hardware Emergency Stop (E-Stop) disabling servo output immediately.
  - Watchdog timer timeout detection (auto-holds pose on loss of connectivity).
  - Velocity & acceleration rate-limiting (interpolates motion over target duration).
- 🔧 **Per-Joint Calibration Wizard:** Interactive UI to adjust servo horn neutral points, reverse direction flags, angle offsets, and min/max mechanical limits stored in ESP32 NVS memory.
- 💾 **Pose Library & Sequence Player:** Save custom joint poses, build automated pick-and-place macro sequences, and execute smooth motion trajectories.

---

## 📐 System Architecture

```text
                               ┌────────────────────────────────────────────────┐
                               │             Web Application (Browser)          │
                               │  Vite + React + TypeScript + Three.js Digital  │
                               │   Twin + Gamepad / Keyboard / IK Controllers   │
                               └───────────────────────┬────────────────────────┘
                                                       │
                                 ┌─────────────────────┼─────────────────────┐
                                 │ (WebSocket)         │ (Web Bluetooth)     │ (Web Serial)
                                 ▼                     ▼                     ▼
                        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
                        │ Wi-Fi Manager    │  │ BLE Manager      │  │ Serial Manager   │
                        └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
                                 │                     │                     │
                                 └─────────────────────┼─────────────────────┘
                                                       │ Unified JSON Protocol
                                                       ▼
                                      ┌─────────────────────────────────┐
                                      │      ESP32-WROOM-32 MCU         │
                                      │  CommandParser & SafetyManager  │
                                      │  MotionPlanner FreeRTOS Task    │
                                      │  NVS / ConfigStore Persistence  │
                                      └────────────────┬────────────────┘
                                                       │ I2C Bus (SDA 21, SCL 22)
                                                       ▼
                                      ┌─────────────────────────────────┐
                                      │  PCA9685 16-Ch 12-Bit PWM Driver│
                                      └────────────────┬────────────────┘
                                                       │ Servo Signals (50Hz)
                                                       ▼
                             ┌───────────────────────────────────────────────────┐
                             │ 6-Servo Robotic Arm (3x MG996 + 3x MG90S Servos) │
                             └───────────────────────────────────────────────────┘
```

---

## 🔌 Hardware Schematics & Wiring

### ESP32 ↔ PCA9685 Driver Pinout

| PCA9685 Pin | ESP32 Pin / Power Rail | Wire Description |
|-------------|------------------------|------------------|
| **VCC** | ESP32 `3.3V` | PCA9685 Logic Power |
| **GND** | ESP32 `GND` | Common Logic Ground |
| **SDA** | ESP32 `GPIO21` | I2C Data Line |
| **SCL** | ESP32 `GPIO22` | I2C Clock Line |
| **V+** | External PSU `+5V to +6V` (10A+) | High-Current Servo Power |
| **GND (Power)** | External PSU `GND` | High-Current Power Ground |

> ⚠️ **CRITICAL POWER SAFETY NOTE:**
> Servo peak stall current can reach **~9.9 A** (3× MG996 @ 2.5A + 3× MG90S @ 0.8A). **NEVER** power the servos directly from the ESP32 5V/3V3 pins or USB port! Connect a **5V–6V, 10A+ regulated power supply** to the PCA9685 screw terminals and place a **1000 µF capacitor** across the power terminals.

---

## 📡 ArmLink Communication Protocol

All transports communicate via line-delimited JSON messages.

### Command Message (Host → ESP32)
```json
{
  "type": "servo_command",
  "angles": {
    "base": 90.0,
    "shoulder": 70.0,
    "elbow": 110.0,
    "wristPitch": 90.0,
    "wristRoll": 90.0,
    "gripper": 35.0
  },
  "duration": 300
}
```

### State Broadcast Message (ESP32 → Host)
```json
{
  "type": "servo_state",
  "angles": {
    "base": 90.0,
    "shoulder": 70.0,
    "elbow": 110.0,
    "wristPitch": 90.0,
    "wristRoll": 90.0,
    "gripper": 35.0
  },
  "timestamp": 1727167320000,
  "transport": "wifi",
  "estop_active": false,
  "timeout_active": false
}
```

---

## 📁 Repository Structure

```text
ArmLink/
├── docs/                      # Specification & architectural documents
│   └── SPECIFICATION.md       # Full ArmLink Technical Specification v0.1
├── ArmLink_ESP32/             # ESP32 C++ Firmware (PlatformIO / Arduino)
│   ├── platformio.ini         # PlatformIO project & library configuration
│   ├── include/
│   │   └── Config.h           # Default pinouts, joint limits, PWM timings
│   └── src/
│       ├── main.cpp           # FreeRTOS multi-task scheduler & main setup
│       ├── ServoDriver.cpp/.h # PCA9685 I2C 12-bit PWM driver HAL
│       ├── ConfigStore.cpp/.h # ESP32 Preferences (NVS) read/write
│       ├── SafetyManager.cpp/.h# Watchdog, angle clamping, E-Stop logic
│       ├── MotionPlanner.cpp/.h# Trapezoidal velocity & joint angle interpolation
│       ├── CommandParser.cpp/.h# Unified JSON protocol parser & validator
│       ├── SerialManager.cpp/.h# Web Serial / UART0 handler
│       ├── WifiManager.cpp/.h # Wi-Fi STA/AP WebSocket server
│       └── BleManager.cpp/.h  # BLE GATT Nordic UART server
└── armlink-web/               # ArmLink Web Application (Vite + React + TS + Three.js)
    ├── index.html
    ├── vite.config.ts
    ├── package.json
    └── src/
        ├── components/        # ArmScene, JointControls, GamepadPanel, etc.
        ├── hooks/             # useGamepad, useKeyboardControls, useArmLink
        ├── robot/             # Forward/Inverse Kinematics & Arm Geometry
        ├── state/             # Zustand arm state store
        └── transports/        # Wifi, BLE, Serial, and Mock Transport engines
```

---

## 🚀 Quick Start Guide

### 1. Web Application Setup

```bash
cd armlink-web
npm install
npm run dev
```

Open `http://localhost:5173` in a Chrome or Edge browser (Chrome/Edge required for Web Bluetooth and Web Serial support).

To build for production:
```bash
npm run build
```

### 2. ESP32 Firmware Flash

Using PlatformIO CLI or VSCode extension:

```bash
cd ArmLink_ESP32
pio run -t upload
```

Or open the `ArmLink_ESP32` directory in VSCode with PlatformIO installed and click **Upload**.

---

## 🔗 GitHub Remote Repository Setup

This repository is hosted on GitHub:
- **Repository URL:** `https://github.com/Yogarathinam/ARMLink-Advanced-Robotic-Manipulation-Link.git`

Command line setup:

```bash
git init
git add .
git commit -m "Initial commit: ArmLink complete project specification, ESP32 firmware, and Vite Three.js web app"
git branch -M main
git remote add origin https://github.com/Yogarathinam/ARMLink-Advanced-Robotic-Manipulation-Link.git
git push -u origin main
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
