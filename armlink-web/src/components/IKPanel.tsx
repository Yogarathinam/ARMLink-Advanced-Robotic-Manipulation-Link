import React, { useState } from 'react';
import type { ArmStoreState } from '../state/armStore';
import { calculateIK, type Vector3D } from '../robot/kinematics';
import { transportManager } from '../transports/TransportManager';
import { Target, CheckCircle2, AlertTriangle, ArrowRight, Compass } from 'lucide-react';

interface IKPanelProps {
  store: ArmStoreState;
}

export const IKPanel: React.FC<IKPanelProps> = ({ store }) => {
  const currentPos = store.endEffectorPos;
  const [targetPos, setTargetPos] = useState<Vector3D>({
    x: currentPos.x,
    y: currentPos.y,
    z: currentPos.z
  });
  const [desiredPitch, setDesiredPitch] = useState<number>(90);
  const [solveError, setSolveError] = useState<string | null>(null);

  const handleSolveAndMove = () => {
    const ikResult = calculateIK(targetPos, desiredPitch);
    if (!ikResult) {
      setSolveError('Target position is outside reachable 3D workspace limits!');
      return;
    }
    setSolveError(null);
    store.setAllAngles(ikResult);
    transportManager.sendServoCommand(ikResult, 400);
  };

  const handleStepCoord = (axis: keyof Vector3D, delta: number) => {
    const updated = { ...targetPos, [axis]: targetPos[axis] + delta };
    setTargetPos(updated);
    const ikResult = calculateIK(updated, desiredPitch);
    if (ikResult) {
      setSolveError(null);
      store.setAllAngles(ikResult);
      transportManager.sendServoCommand(ikResult, 200);
    } else {
      setSolveError('Target unreachable');
    }
  };

  return (
    <div className="card panel-ik">
      <div className="panel-header">
        <div className="title-group">
          <Target className="icon-primary" size={22} />
          <h2>3D Inverse Kinematics (IK)</h2>
        </div>
        <span className="joint-badge">3D Spatial Target</span>
      </div>

      <div className="quick-stances-bar">
        <span className="bar-label"><Compass size={14} /> End-Effector:</span>
        <span>X: <strong>{currentPos.x} mm</strong></span>
        <span>Y: <strong>{currentPos.y} mm</strong></span>
        <span>Z: <strong>{currentPos.z} mm</strong></span>
      </div>

      <div className="ik-inputs-grid">
        {(['x', 'y', 'z'] as Array<keyof Vector3D>).map((axis) => (
          <div key={axis} className="ik-input-group">
            <label>Target {axis.toUpperCase()} Position (mm)</label>
            <div className="input-with-steppers">
              <button className="btn-step" onClick={() => handleStepCoord(axis, -10)}>-10</button>
              <button className="btn-step" onClick={() => handleStepCoord(axis, -2)}>-2</button>
              <input
                type="number"
                value={targetPos[axis]}
                onChange={(e) => setTargetPos({ ...targetPos, [axis]: Number(e.target.value) })}
                className="input-num"
              />
              <button className="btn-step" onClick={() => handleStepCoord(axis, 2)}>+2</button>
              <button className="btn-step" onClick={() => handleStepCoord(axis, 10)}>+10</button>
            </div>
          </div>
        ))}

        <div className="ik-input-group">
          <label>Desired Wrist Pitch (°)</label>
          <div className="slider-control-group">
            <input
              type="range"
              min={0}
              max={180}
              value={desiredPitch}
              onChange={(e) => setDesiredPitch(Number(e.target.value))}
              className="joint-slider"
            />
            <span className="joint-degrees" style={{ fontSize: '1rem' }}>{desiredPitch}°</span>
          </div>
        </div>
      </div>

      {solveError ? (
        <div className="alert-box error">
          <AlertTriangle size={16} />
          <span>{solveError}</span>
        </div>
      ) : (
        <div className="alert-box success">
          <CheckCircle2 size={16} />
          <span>Target Reachable & Kinematically Valid</span>
        </div>
      )}

      <button className="btn-m3-filled" style={{ width: '100%' }} onClick={handleSolveAndMove}>
        Solve IK & Execute Trajectory <ArrowRight size={16} />
      </button>
    </div>
  );
};
