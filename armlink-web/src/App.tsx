import { useState, useEffect } from 'react';
import { getArmStoreState, subscribeArmStore, type ArmStoreState } from './state/armStore';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { Header } from './components/Header';
import { ArmScene } from './components/ArmScene';
import { JointControls } from './components/JointControls';
import { GamepadPanel } from './components/GamepadPanel';
import { IKPanel } from './components/IKPanel';
import { SequencePlayer } from './components/SequencePlayer';
import { CalibrationWizard } from './components/CalibrationWizard';
import { Activity, ShieldCheck, Compass, Terminal, Eye } from 'lucide-react';
import './App.css';

export function App() {
  const [storeState, setStoreState] = useState<ArmStoreState>(getArmStoreState());

  // Subscribe to store state updates
  useEffect(() => {
    const unsubscribe = subscribeArmStore(() => {
      setStoreState({ ...getArmStoreState() });
    });
    return () => unsubscribe();
  }, []);

  // Activate keyboard hotkeys listener
  useKeyboardControls();

  return (
    <div className="app-container" data-theme={storeState.theme}>
      {/* Material 3 App Bar Header */}
      <Header store={storeState} />

      {/* Main Workspace Grid */}
      <main className="workspace">
        {/* Left Column: 3D Digital Twin Viewport & Telemetry */}
        <section className="viewport-section">
          <div className="card viewport-card">
            <ArmScene
              angles={storeState.angles}
              targetPos={storeState.endEffectorPos}
              isIKMode={storeState.controlMode === 'ik'}
              theme={storeState.theme}
            />

            <div className="canvas-overlay-badge">
              <Eye size={14} /> 3D DIGITAL TWIN • 60 FPS
            </div>

            <div className="telemetry-bar">
              <div className="telemetry-item">
                <Compass size={16} className="icon-primary" />
                <span>Base Yaw: <strong>{storeState.angles.base}°</strong></span>
              </div>
              <div className="telemetry-item">
                <Activity size={16} className="icon-primary" />
                <span>Shoulder: <strong>{storeState.angles.shoulder}°</strong></span>
              </div>
              <div className="telemetry-item">
                <Activity size={16} className="icon-primary" />
                <span>Elbow: <strong>{storeState.angles.elbow}°</strong></span>
              </div>
              <div className="telemetry-item">
                <ShieldCheck size={16} className="icon-primary" />
                <span>Tip: <strong>[{storeState.endEffectorPos.x}, {storeState.endEffectorPos.y}, {storeState.endEffectorPos.z}] mm</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Keyboard Hotkey Legend */}
          <div className="card hotkey-legend-card">
            <div className="legend-header">
              <Terminal size={16} className="icon-primary" />
              <span>Keyboard Velocity Hotkeys Legend</span>
            </div>
            <div className="keys-grid">
              <span className="key-badge">Q/A: Base</span>
              <span className="key-badge">W/S: Shoulder</span>
              <span className="key-badge">E/D: Elbow</span>
              <span className="key-badge">R/F: Wrist Pitch</span>
              <span className="key-badge">T/G: Wrist Roll</span>
              <span className="key-badge">O/P: Gripper</span>
              <span className="key-badge danger">Spacebar: E-Stop</span>
              <span className="key-badge">H: Home Stance</span>
            </div>
          </div>
        </section>

        {/* Right Column: Active Control Panel */}
        <section className="controls-section">
          {storeState.controlMode === 'manual' && <JointControls store={storeState} />}
          {storeState.controlMode === 'gamepad' && <GamepadPanel />}
          {storeState.controlMode === 'ik' && <IKPanel store={storeState} />}
          {storeState.controlMode === 'sequence' && <SequencePlayer store={storeState} />}
          {storeState.controlMode === 'calibrate' && <CalibrationWizard store={storeState} />}
        </section>
      </main>

      {/* Material Footer */}
      <footer className="main-footer">
        <span>ArmLink v0.1.0 • ESP32 6-DOF Robotic Arm Control System</span>
        <span>Google Material Design 3 UI • USB / Wi-Fi / BLE</span>
      </footer>
    </div>
  );
}

export default App;
