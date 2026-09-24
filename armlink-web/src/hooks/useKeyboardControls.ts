import { useEffect } from 'react';
import { getArmStoreState } from '../state/armStore';
import { transportManager } from '../transports/TransportManager';
import type { JointAngles } from '../robot/kinematics';

export function useKeyboardControls() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture hotkeys if user is typing in an input field
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const store = getArmStoreState();
      if (store.estopActive) return;

      const step = e.shiftKey ? 5 : 1;
      const key = e.key.toLowerCase();
      let changed = false;
      const nextAngles: JointAngles = { ...store.angles };

      switch (key) {
        // Base (J1): Q / A
        case 'q':
          nextAngles.base += step;
          changed = true;
          break;
        case 'a':
          nextAngles.base -= step;
          changed = true;
          break;

        // Shoulder (J2): W / S
        case 'w':
          nextAngles.shoulder += step;
          changed = true;
          break;
        case 's':
          nextAngles.shoulder -= step;
          changed = true;
          break;

        // Elbow (J3): E / D
        case 'e':
          nextAngles.elbow += step;
          changed = true;
          break;
        case 'd':
          nextAngles.elbow -= step;
          changed = true;
          break;

        // Wrist Pitch (J4): R / F
        case 'r':
          nextAngles.wristPitch += step;
          changed = true;
          break;
        case 'f':
          nextAngles.wristPitch -= step;
          changed = true;
          break;

        // Wrist Roll (J5): T / G
        case 't':
          nextAngles.wristRoll += step;
          changed = true;
          break;
        case 'g':
          nextAngles.wristRoll -= step;
          changed = true;
          break;

        // Gripper (J6): O / P
        case 'o':
          nextAngles.gripper -= step;
          changed = true;
          break;
        case 'p':
          nextAngles.gripper += step;
          changed = true;
          break;

        // Emergency Stop: Spacebar
        case ' ':
          e.preventDefault();
          transportManager.sendEstop(true);
          break;

        // Home pose: H key
        case 'h':
          transportManager.sendHome();
          break;

        // Capture Pose in Sequence Mode: C or Enter key
        case 'c':
        case 'enter':
          if (store.controlMode === 'sequence') {
            const nextStepNum = store.activeSequence.length + 1;
            const newStep = {
              id: `step_${Date.now()}`,
              name: `Step ${nextStepNum}`,
              angles: { ...store.angles },
              duration: 1000
            };
            store.setSequence([...store.activeSequence, newStep]);
          }
          break;
      }

      if (changed) {
        store.setAllAngles(nextAngles);
        transportManager.sendServoCommand(nextAngles, 150);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
