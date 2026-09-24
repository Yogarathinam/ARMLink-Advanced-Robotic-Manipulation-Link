import React from 'react';
import { useGamepad } from '../hooks/useGamepad';
import { Gamepad, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const GamepadPanel: React.FC = () => {
  const gp = useGamepad();

  return (
    <div className="card panel-gamepad">
      <div className="panel-header">
        <div className="title-group">
          <Gamepad className="icon-primary" size={22} />
          <h2>Xbox Gamepad Controller</h2>
        </div>
        <div className={`connection-chip ${gp.connected ? 'online' : 'offline'}`}>
          {gp.connected ? (
            <>
              <CheckCircle2 size={14} /> Active
            </>
          ) : (
            <>
              <AlertCircle size={14} /> Disconnected
            </>
          )}
        </div>
      </div>

      {!gp.connected ? (
        <div className="gamepad-body" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <Gamepad size={48} style={{ color: 'var(--md-sys-color-on-surface-dim)', margin: '0 auto' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '0.75rem' }}>
            No Gamepad Connected
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '0.35rem' }}>
            Connect an Xbox or Bluetooth gamepad and press any button to activate live control.
          </p>
        </div>
      ) : (
        <div className="gamepad-visualizer-card">
          <div className="gamepad-body">
            <div className="gamepad-top-bar">
              <div className="gamepad-logo-badge">
                <Sparkles size={16} /> Xbox Controller Active
              </div>
              <span className="key-badge">{gp.id.substring(0, 25)}</span>
            </div>

            {/* Interactive Dual Analog Sticks Visualizer */}
            <div className="xbox-sticks-row">
              {/* Left Stick */}
              <div className="stick-ring-container">
                <span className="joint-title" style={{ fontSize: '0.78rem' }}>
                  Left Stick (Base Yaw / Shoulder Pitch)
                </span>
                <div className="stick-outer-ring">
                  <div
                    className="stick-knob"
                    style={{
                      transform: `translate(${gp.leftStickX * 32}px, ${gp.leftStickY * 32}px)`
                    }}
                  />
                </div>
                <span className="stick-value-text">
                  X: {gp.leftStickX.toFixed(2)} | Y: {gp.leftStickY.toFixed(2)}
                </span>
              </div>

              {/* Right Stick */}
              <div className="stick-ring-container">
                <span className="joint-title" style={{ fontSize: '0.78rem' }}>
                  Right Stick (Elbow / Wrist Roll)
                </span>
                <div className="stick-outer-ring">
                  <div
                    className="stick-knob"
                    style={{
                      transform: `translate(${gp.rightStickX * 32}px, ${gp.rightStickY * 32}px)`
                    }}
                  />
                </div>
                <span className="stick-value-text">
                  X: {gp.rightStickX.toFixed(2)} | Y: {gp.rightStickY.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Triggers Telemetry */}
            <div className="triggers-bar-container">
              <div className="trigger-bar-item">
                <div className="trigger-label-row">
                  <span>Left Trigger (Close Claw)</span>
                  <span>{(gp.leftTrigger * 100).toFixed(0)}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${gp.leftTrigger * 100}%` }} />
                </div>
              </div>

              <div className="trigger-bar-item">
                <div className="trigger-label-row">
                  <span>Right Trigger (Open Claw)</span>
                  <span>{(gp.rightTrigger * 100).toFixed(0)}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${gp.rightTrigger * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="keys-grid">
            <span className="key-badge">A Button: Reset Home</span>
            <span className="key-badge danger">B Button: Emergency Stop</span>
            <span className="key-badge">LT / RT: Gripper Pinch</span>
          </div>
        </div>
      )}
    </div>
  );
};
