import { useEffect, useState } from 'react';
import { getArmStoreState } from '../state/armStore';
import { transportManager } from '../transports/TransportManager';
import type { JointAngles } from '../robot/kinematics';

export interface GamepadState {
  connected: boolean;
  id: string;
  leftStickX: number;
  leftStickY: number;
  rightStickX: number;
  rightStickY: number;
  leftTrigger: number;
  rightTrigger: number;
  buttons: boolean[];
}

export function useGamepad() {
  const [gamepadState, setGamepadState] = useState<GamepadState>({
    connected: false,
    id: '',
    leftStickX: 0,
    leftStickY: 0,
    rightStickX: 0,
    rightStickY: 0,
    leftTrigger: 0,
    rightTrigger: 0,
    buttons: []
  });

  useEffect(() => {
    let animId: number;

    const applyDeadzone = (val: number, threshold = 0.15): number => {
      if (Math.abs(val) < threshold) return 0;
      return (val - Math.sign(val) * threshold) / (1 - threshold);
    };

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = Array.from(gamepads).find((g) => g !== null && g.connected);

      if (gp) {
        const lx = applyDeadzone(gp.axes[0] || 0);
        const ly = applyDeadzone(gp.axes[1] || 0);
        const rx = applyDeadzone(gp.axes[2] || 0);
        const ry = applyDeadzone(gp.axes[3] || 0);
        const lt = gp.buttons[6] ? gp.buttons[6].value : 0;
        const rt = gp.buttons[7] ? gp.buttons[7].value : 0;

        const buttonStates = gp.buttons.map((b) => b.pressed);

        setGamepadState({
          connected: true,
          id: gp.id,
          leftStickX: lx,
          leftStickY: ly,
          rightStickX: rx,
          rightStickY: ry,
          leftTrigger: lt,
          rightTrigger: rt,
          buttons: buttonStates
        });

        const store = getArmStoreState();
        if ((store.controlMode === 'gamepad' || store.controlMode === 'sequence') && !store.estopActive) {
          // Velocity control mapping:
          // Left Stick X -> Base Rotate
          // Left Stick Y -> Shoulder Pitch
          // Right Stick Y -> Elbow Pitch
          // Right Stick X -> Wrist Roll
          // Triggers -> Gripper open/close

          const stepSpeed = 2.5; // deg per tick
          let changed = false;
          const nextAngles: JointAngles = { ...store.angles };

          if (lx !== 0) {
            nextAngles.base = Math.round(nextAngles.base - lx * stepSpeed);
            changed = true;
          }
          if (ly !== 0) {
            nextAngles.shoulder = Math.round(nextAngles.shoulder - ly * stepSpeed);
            changed = true;
          }
          if (ry !== 0) {
            nextAngles.elbow = Math.round(nextAngles.elbow - ry * stepSpeed);
            changed = true;
          }
          if (rx !== 0) {
            nextAngles.wristRoll = Math.round(nextAngles.wristRoll + rx * stepSpeed);
            changed = true;
          }
          if (lt > 0.1 || rt > 0.1) {
            const gripDelta = (rt - lt) * (stepSpeed * 1.5);
            nextAngles.gripper = Math.round(nextAngles.gripper + gripDelta);
            changed = true;
          }

          // Button 0 (A button): Home pose
          if (gp.buttons[0] && gp.buttons[0].pressed) {
            transportManager.sendHome();
          }

          // Button 1 (B button / Red): E-Stop
          if (gp.buttons[1] && gp.buttons[1].pressed) {
            transportManager.sendEstop(true);
          }

          if (changed) {
            store.setAllAngles(nextAngles);
            transportManager.sendServoCommand(nextAngles, 100);
          }
        }
      } else {
        setGamepadState((prev) => (prev.connected ? { ...prev, connected: false } : prev));
      }

      animId = requestAnimationFrame(pollGamepad);
    };

    animId = requestAnimationFrame(pollGamepad);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return gamepadState;
}
