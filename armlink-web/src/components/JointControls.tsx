import React from 'react';
import type { JointAngles } from '../robot/kinematics';
import type { ArmStoreState } from '../state/armStore';
import { transportManager } from '../transports/TransportManager';
import { Sliders, RotateCw, ShieldAlert, Compass } from 'lucide-react';

interface JointControlsProps {
  store: ArmStoreState;
}

const JOINT_INFO: Record<keyof JointAngles, { label: string; axis: string; motor: string }> = {
  base:       { label: 'Joint 1: Waist Base', axis: 'Yaw Rotate', motor: 'MG996R' },
  shoulder:   { label: 'Joint 2: Shoulder',   axis: 'Pitch Lift', motor: 'MG996R' },
  elbow:      { label: 'Joint 3: Elbow',      axis: 'Pitch Flex', motor: 'MG996R' },
  wristPitch: { label: 'Joint 4: Wrist Pitch',axis: 'Pitch Tilt', motor: 'MG90S' },
  wristRoll:  { label: 'Joint 5: Wrist Roll', axis: 'Roll Twist', motor: 'MG90S' },
  gripper:    { label: 'Joint 6: Gripper',    axis: 'Claw Open',  motor: 'MG90S' }
};

const QUICK_DEGREES = [0, 45, 90, 135, 180];

export const JointControls: React.FC<JointControlsProps> = ({ store }) => {
  const handleSliderChange = (joint: keyof JointAngles, value: number) => {
    store.setJointAngle(joint, value);
    const updatedAngles = { ...store.angles, [joint]: value };
    transportManager.sendServoCommand(updatedAngles, 150);
  };

  const handleStep = (joint: keyof JointAngles, delta: number) => {
    const current = store.angles[joint];
    const newAngle = current + delta;
    handleSliderChange(joint, newAngle);
  };

  const handleQuickStance = (presetType: 'home' | 'center' | 'rest') => {
    let target: JointAngles;
    if (presetType === 'home') {
      transportManager.sendHome();
      return;
    } else if (presetType === 'center') {
      target = { base: 90, shoulder: 90, elbow: 90, wristPitch: 90, wristRoll: 90, gripper: 45 };
    } else {
      target = { base: 90, shoulder: 130, elbow: 20, wristPitch: 90, wristRoll: 90, gripper: 10 };
    }
    store.setAllAngles(target);
    transportManager.sendServoCommand(target, 400);
  };

  return (
    <div className="card panel-joint-controls">
      <div className="panel-header">
        <div className="title-group">
          <Sliders className="icon-primary" size={20} />
          <h2>Joint Angle Controls</h2>
        </div>
        <button
          className="btn-m3-filled"
          onClick={() => handleQuickStance('home')}
          title="Reset to Home Position"
        >
          <RotateCw size={14} /> Reset Home
        </button>
      </div>

      {/* Quick Stance Presets Bar */}
      <div className="quick-stances-bar">
        <span className="bar-label"><Compass size={14} /> Quick Stances:</span>
        <button className="btn-m3-tonal" onClick={() => handleQuickStance('home')}>
          Home Position
        </button>
        <button className="btn-m3-tonal" onClick={() => handleQuickStance('center')}>
          Center All (90°)
        </button>
        <button className="btn-m3-tonal" onClick={() => handleQuickStance('rest')}>
          Rest Stance
        </button>
      </div>

      <div className="joints-list">
        {(Object.keys(JOINT_INFO) as Array<keyof JointAngles>).map((jointKey) => {
          const info = JOINT_INFO[jointKey];
          const currentAngle = store.angles[jointKey];
          const limits = store.jointLimits[jointKey];
          const isAtLimit = currentAngle <= limits.min || currentAngle >= limits.max;

          return (
            <div key={jointKey} className={`joint-row ${isAtLimit ? 'at-limit' : ''}`}>
              <div className="joint-meta">
                <div className="joint-name-box">
                  <span className="joint-title">{info.label}</span>
                  <span className="joint-badge">{info.motor}</span>
                </div>
                <div className="joint-val-box">
                  {isAtLimit && (
                    <span className="limit-warning" title="At Mechanical Limit">
                      <ShieldAlert size={14} /> Limit
                    </span>
                  )}
                  <span className="joint-degrees">{currentAngle}°</span>
                </div>
              </div>

              {/* Slider & Fine Steppers */}
              <div className="slider-control-group">
                <div className="step-btns">
                  <button
                    className="btn-step"
                    onClick={() => handleStep(jointKey, -5)}
                    title="Decrease 5°"
                  >
                    -5°
                  </button>
                  <button
                    className="btn-step"
                    onClick={() => handleStep(jointKey, -1)}
                    title="Decrease 1°"
                  >
                    -1°
                  </button>
                </div>

                <input
                  type="range"
                  min={limits.min}
                  max={limits.max}
                  value={currentAngle}
                  onChange={(e) => handleSliderChange(jointKey, Number(e.target.value))}
                  disabled={store.estopActive}
                  className="joint-slider"
                />

                <div className="step-btns">
                  <button
                    className="btn-step"
                    onClick={() => handleStep(jointKey, 1)}
                    title="Increase 1°"
                  >
                    +1°
                  </button>
                  <button
                    className="btn-step"
                    onClick={() => handleStep(jointKey, 5)}
                    title="Increase 5°"
                  >
                    +5°
                  </button>
                </div>
              </div>

              {/* Quick Degree Selector Buttons */}
              <div className="quick-degrees-row">
                <span className="quick-deg-label">Quick Degree:</span>
                {QUICK_DEGREES.map((deg) => {
                  const isAvailable = deg >= limits.min && deg <= limits.max;
                  const isSelected = currentAngle === deg;

                  return (
                    <button
                      key={deg}
                      className={`btn-deg-chip ${isSelected ? 'selected' : ''}`}
                      disabled={!isAvailable || store.estopActive}
                      onClick={() => handleSliderChange(jointKey, deg)}
                    >
                      {deg}°
                    </button>
                  );
                })}
              </div>

              <div className="joint-range-footer">
                <span>Min: {limits.min}°</span>
                <span className="axis-label">{info.axis}</span>
                <span>Max: {limits.max}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
