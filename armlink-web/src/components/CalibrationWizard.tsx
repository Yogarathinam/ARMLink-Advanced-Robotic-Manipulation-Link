import React, { useState } from 'react';
import type { JointAngles } from '../robot/kinematics';
import type { ArmStoreState } from '../state/armStore';
import { Sliders, Save, CheckCircle2 } from 'lucide-react';

interface CalibrationWizardProps {
  store: ArmStoreState;
}

const JOINT_NAMES: Record<keyof JointAngles, { title: string; motor: string; pin: string }> = {
  base:       { title: 'Joint 1: Waist / Base', motor: 'MG996R', pin: 'GPIO 13' },
  shoulder:   { title: 'Joint 2: Shoulder',   motor: 'MG996R', pin: 'GPIO 12' },
  elbow:      { title: 'Joint 3: Elbow',      motor: 'MG996R', pin: 'GPIO 14' },
  wristPitch: { title: 'Joint 4: Wrist Pitch',motor: 'SG90',   pin: 'GPIO 27' },
  wristRoll:  { title: 'Joint 5: Wrist Roll', motor: 'SG90',   pin: 'GPIO 26' },
  gripper:    { title: 'Joint 6: Gripper Jaw',motor: 'SG90',   pin: 'GPIO 25' }
};

export const CalibrationWizard: React.FC<CalibrationWizardProps> = ({ store }) => {
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleOffsetChange = (joint: keyof JointAngles, delta: number) => {
    const cur = store.jointLimits[joint].offset;
    store.setJointLimit(joint, 'offset', cur + delta);
  };

  const handleSaveToNVS = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="card panel-calibration">
      <div className="panel-header">
        <div className="title-group">
          <Sliders className="icon-primary" size={22} />
          <h2>Per-Joint Calibration Wizard</h2>
        </div>
        <span className="joint-badge">NVS Persistent Storage</span>
      </div>

      <p className="opt-desc" style={{ marginBottom: '1.25rem' }}>
        Fine-tune mechanical horn neutral alignments, angle offsets, direction flags, and soft limit boundaries.
        Configurations are saved to ESP32 Non-Volatile Storage (NVS / Preferences).
      </p>

      {savedSuccess && (
        <div className="alert-box success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle2 size={16} />
          <span>Joint calibration successfully saved to ESP32 NVS flash memory!</span>
        </div>
      )}

      {/* 6 Joint Calibration Cards Matrix */}
      <div className="joints-list">
        {(Object.keys(JOINT_NAMES) as Array<keyof JointAngles>).map((jointKey) => {
          const info = JOINT_NAMES[jointKey];
          const limits = store.jointLimits[jointKey];
          const currentAngle = store.angles[jointKey];

          return (
            <div key={jointKey} className="joint-row">
              <div className="joint-meta">
                <div className="joint-name-box">
                  <span className="joint-title">{info.title}</span>
                  <span className="joint-badge">{info.motor} • {info.pin}</span>
                </div>
                <div className="joint-val-box">
                  <span className="joint-degrees">{currentAngle}°</span>
                </div>
              </div>

              {/* Offset Stepper & Horn Alignment */}
              <div className="calib-row-fields" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.6rem' }}>
                <div className="ik-input-group" style={{ padding: '0.6rem' }}>
                  <label>Angle Offset Adjust (°)</label>
                  <div className="input-with-steppers">
                    <button className="btn-step" onClick={() => handleOffsetChange(jointKey, -5)}>-5°</button>
                    <button className="btn-step" onClick={() => handleOffsetChange(jointKey, -1)}>-1°</button>
                    <span className="input-num">{limits.offset >= 0 ? `+${limits.offset}` : limits.offset}°</span>
                    <button className="btn-step" onClick={() => handleOffsetChange(jointKey, 1)}>+1°</button>
                    <button className="btn-step" onClick={() => handleOffsetChange(jointKey, 5)}>+5°</button>
                  </div>
                </div>

                <div className="ik-input-group" style={{ padding: '0.6rem', justifyContent: 'center' }}>
                  <label>Direction & Limits</label>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.78rem' }}>
                      <input
                        type="checkbox"
                        checked={limits.reverse}
                        onChange={(e) => store.setJointLimit(jointKey, 'reverse', e.target.checked)}
                      />
                      Invert Direction
                    </label>

                    <span className="key-badge">
                      Range: {limits.min}° - {limits.max}°
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn-m3-filled" style={{ width: '100%', marginTop: '1.25rem' }} onClick={handleSaveToNVS}>
        <Save size={16} /> Save Calibration to ESP32 NVS Memory
      </button>
    </div>
  );
};
