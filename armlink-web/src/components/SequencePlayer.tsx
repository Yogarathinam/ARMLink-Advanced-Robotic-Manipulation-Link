import React, { useState } from 'react';
import type { ArmStoreState, PosePreset } from '../state/armStore';
import type { JointAngles } from '../robot/kinematics';
import { transportManager } from '../transports/TransportManager';
import {
  Play,
  Pause,
  Save,
  Trash2,
  Plus,
  Repeat,
  ListPlus,
  SkipForward,
  SkipBack,
  Clock,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Copy,
  RefreshCw,
  Sliders,
  MousePointerClick,
  Keyboard,
  Gamepad2
} from 'lucide-react';

interface SequencePlayerProps {
  store: ArmStoreState;
}

const JOINT_LABELS: Record<keyof JointAngles, string> = {
  base: 'J1 Base',
  shoulder: 'J2 Shoulder',
  elbow: 'J3 Elbow',
  wristPitch: 'J4 Wrist Pitch',
  wristRoll: 'J5 Wrist Roll',
  gripper: 'J6 Gripper'
};

export const SequencePlayer: React.FC<SequencePlayerProps> = ({ store }) => {
  const [newPoseName, setNewPoseName] = useState('');
  const [defaultStepDuration, setDefaultStepDuration] = useState<number>(1000);
  const [showJointDeck, setShowJointDeck] = useState<boolean>(true);

  // Quick Macro Sequence Presets
  const MACRO_PRESETS: { name: string; sequence: PosePreset[] }[] = [
    {
      name: 'Pick & Place Routine',
      sequence: [
        { id: 'p1', name: 'Home Stance', angles: { base: 90, shoulder: 150, elbow: 35, wristPitch: 140, wristRoll: 85, gripper: 80 }, duration: 1000 },
        { id: 'p2', name: 'Reach Pick (Left)', angles: { base: 30, shoulder: 60, elbow: 120, wristPitch: 45, wristRoll: 90, gripper: 90 }, duration: 1200 },
        { id: 'p3', name: 'Grip Object', angles: { base: 30, shoulder: 60, elbow: 120, wristPitch: 45, wristRoll: 90, gripper: 0 }, duration: 800 },
        { id: 'p4', name: 'Lift High', angles: { base: 30, shoulder: 110, elbow: 70, wristPitch: 90, wristRoll: 90, gripper: 0 }, duration: 1000 },
        { id: 'p5', name: 'Reach Place (Right)', angles: { base: 150, shoulder: 60, elbow: 120, wristPitch: 45, wristRoll: 90, gripper: 0 }, duration: 1500 },
        { id: 'p6', name: 'Release Object', angles: { base: 150, shoulder: 60, elbow: 120, wristPitch: 45, wristRoll: 90, gripper: 90 }, duration: 800 }
      ]
    },
    {
      name: 'Wave Greeting',
      sequence: [
        { id: 'w1', name: 'Raise Arm', angles: { base: 90, shoulder: 80, elbow: 110, wristPitch: 90, wristRoll: 90, gripper: 45 }, duration: 1000 },
        { id: 'w2', name: 'Wave Left', angles: { base: 90, shoulder: 80, elbow: 110, wristPitch: 90, wristRoll: 40, gripper: 45 }, duration: 500 },
        { id: 'w3', name: 'Wave Right', angles: { base: 90, shoulder: 80, elbow: 110, wristPitch: 90, wristRoll: 140, gripper: 45 }, duration: 500 },
        { id: 'w4', name: 'Wave Left', angles: { base: 90, shoulder: 80, elbow: 110, wristPitch: 90, wristRoll: 40, gripper: 45 }, duration: 500 },
        { id: 'w5', name: 'Return Home', angles: { base: 90, shoulder: 150, elbow: 35, wristPitch: 140, wristRoll: 85, gripper: 80 }, duration: 1000 }
      ]
    },
    {
      name: '3D Workspace Scan Arc',
      sequence: [
        { id: 's1', name: 'Left Scan Arc', angles: { base: 20, shoulder: 90, elbow: 90, wristPitch: 90, wristRoll: 90, gripper: 45 }, duration: 1200 },
        { id: 's2', name: 'Center Scan Arc', angles: { base: 90, shoulder: 90, elbow: 90, wristPitch: 90, wristRoll: 90, gripper: 45 }, duration: 1000 },
        { id: 's3', name: 'Right Scan Arc', angles: { base: 160, shoulder: 90, elbow: 90, wristPitch: 90, wristRoll: 90, gripper: 45 }, duration: 1200 }
      ]
    }
  ];

  // Capture current live posture as step in active sequence queue
  const handleCaptureLivePose = () => {
    const nextStepNum = store.activeSequence.length + 1;
    const newStep: PosePreset = {
      id: `step_${Date.now()}`,
      name: `Step ${nextStepNum}`,
      angles: { ...store.angles },
      duration: defaultStepDuration
    };
    store.setSequence([...store.activeSequence, newStep]);
  };

  const handleSavePoseToLibrary = () => {
    const poseName = newPoseName.trim() || `Pose ${store.savedPoses.length + 1}`;
    store.saveCurrentPose(poseName);
    setNewPoseName('');
  };

  const handlePlayPose = (pose: PosePreset) => {
    store.setAllAngles(pose.angles);
    transportManager.sendServoCommand(pose.angles, pose.duration);
  };

  const handleAddPresetStep = (pose: PosePreset) => {
    store.setSequence([...store.activeSequence, { ...pose, id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, duration: defaultStepDuration }]);
  };

  const handleRemoveStep = (index: number) => {
    const updated = [...store.activeSequence];
    updated.splice(index, 1);
    store.setSequence(updated);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= store.activeSequence.length) return;
    const updated = [...store.activeSequence];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    store.setSequence(updated);
  };

  const handleDuplicateStep = (index: number) => {
    const sourceStep = store.activeSequence[index];
    const duplicated: PosePreset = {
      ...sourceStep,
      id: `step_${Date.now()}`,
      name: `${sourceStep.name} (Copy)`
    };
    const updated = [...store.activeSequence];
    updated.splice(index + 1, 0, duplicated);
    store.setSequence(updated);
  };

  const handleOverwriteStepWithLive = (index: number) => {
    const updated = [...store.activeSequence];
    updated[index] = {
      ...updated[index],
      angles: { ...store.angles }
    };
    store.setSequence(updated);
  };

  const handleUpdateStepDuration = (index: number, duration: number) => {
    const updated = [...store.activeSequence];
    updated[index] = {
      ...updated[index],
      duration: Math.max(100, duration)
    };
    store.setSequence(updated);
  };

  const handleUpdateStepName = (index: number, name: string) => {
    const updated = [...store.activeSequence];
    updated[index] = {
      ...updated[index],
      name
    };
    store.setSequence(updated);
  };

  const handleRunSequence = () => {
    if (store.activeSequence.length === 0) return;
    store.setIsPlayingSequence(true);

    let step = 0;
    const executeStep = () => {
      const state = store;
      if (!state.isPlayingSequence && step > 0) return;

      if (step >= state.activeSequence.length) {
        if (state.loopSequence) {
          step = 0;
        } else {
          state.setIsPlayingSequence(false);
          return;
        }
      }

      const currentTarget = state.activeSequence[step];
      state.setCurrentStepIndex(step);
      state.setAllAngles(currentTarget.angles);
      transportManager.sendServoCommand(currentTarget.angles, currentTarget.duration);

      step++;
      setTimeout(executeStep, currentTarget.duration + 150);
    };

    executeStep();
  };

  const handleStopSequence = () => {
    store.setIsPlayingSequence(false);
  };

  const handleStepForward = () => {
    if (store.activeSequence.length === 0) return;
    const nextIdx = (store.currentStepIndex + 1) % store.activeSequence.length;
    store.setCurrentStepIndex(nextIdx);
    handlePlayPose(store.activeSequence[nextIdx]);
  };

  const handleStepBackward = () => {
    if (store.activeSequence.length === 0) return;
    const prevIdx = (store.currentStepIndex - 1 + store.activeSequence.length) % store.activeSequence.length;
    store.setCurrentStepIndex(prevIdx);
    handlePlayPose(store.activeSequence[prevIdx]);
  };

  const handleLoadMacroPreset = (macro: typeof MACRO_PRESETS[0]) => {
    store.setSequence(macro.sequence);
  };

  const handleSliderChange = (joint: keyof JointAngles, value: number) => {
    store.setJointAngle(joint, value);
    const updatedAngles = { ...store.angles, [joint]: value };
    transportManager.sendServoCommand(updatedAngles, 150);
  };

  const handleStepJoint = (joint: keyof JointAngles, delta: number) => {
    const current = store.angles[joint];
    handleSliderChange(joint, current + delta);
  };

  return (
    <div className="card panel-sequence" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Bar */}
      <div className="panel-header" style={{ marginBottom: 0 }}>
        <div className="title-group">
          <ListPlus className="icon-primary" size={22} />
          <div>
            <h2>Motion Sequencer & Pose Capture</h2>
            <p style={{ fontSize: '0.74rem', color: 'var(--md-sys-color-on-surface-variant)', margin: 0 }}>
              Position arm via Keyboard, Xbox Gamepad, 3D Click, or Sliders, then capture steps
            </p>
          </div>
        </div>
        <button
          className="btn-m3-tonal"
          onClick={() => setShowJointDeck(!showJointDeck)}
          title="Toggle Live Joint Sliders Deck"
        >
          <Sliders size={14} /> {showJointDeck ? 'Hide Controls' : 'Show Controls'}
        </button>
      </div>

      {/* Preset Routine Loader Bar */}
      <div className="quick-stances-bar">
        <span className="bar-label"><Sparkles size={14} /> Presets:</span>
        {MACRO_PRESETS.map((macro, idx) => (
          <button
            key={idx}
            className="btn-m3-tonal"
            onClick={() => handleLoadMacroPreset(macro)}
          >
            {macro.name}
          </button>
        ))}
      </div>

      {/* Embedded Live Joint Controller Deck (Collapsible) */}
      {showJointDeck && (
        <div className="ik-input-group" style={{ padding: '1rem', background: 'var(--md-sys-color-surface-variant)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sliders size={14} className="icon-primary" /> Live Joint Adjustment Deck
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Keyboard size={12} /> Hotkeys Q-P</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Gamepad2 size={12} /> Xbox Gamepad</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><MousePointerClick size={12} /> 3D Mesh Click</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            {(Object.keys(JOINT_LABELS) as Array<keyof JointAngles>).map((jointKey) => {
              const label = JOINT_LABELS[jointKey];
              const angle = store.angles[jointKey];
              const limits = store.jointLimits[jointKey];
              const isSelectedIn3D = store.selectedJointKey === jointKey;

              return (
                <div
                  key={jointKey}
                  style={{
                    background: isSelectedIn3D ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface)',
                    border: isSelectedIn3D ? '2px solid var(--md-sys-color-primary)' : '1px solid var(--md-sys-color-outline)',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', fontWeight: 600 }}>
                    <span>{label}</span>
                    <span style={{ color: 'var(--md-sys-color-primary)', fontFamily: 'var(--font-mono)' }}>{angle}°</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button className="btn-step" style={{ padding: '0.15rem 0.4rem', fontSize: '0.68rem' }} onClick={() => handleStepJoint(jointKey, -2)}>-2°</button>
                    <input
                      type="range"
                      min={limits.min}
                      max={limits.max}
                      value={angle}
                      onChange={(e) => handleSliderChange(jointKey, Number(e.target.value))}
                      style={{ flex: 1, height: '4px', accentColor: 'var(--md-sys-color-primary)' }}
                    />
                    <button className="btn-step" style={{ padding: '0.15rem 0.4rem', fontSize: '0.68rem' }} onClick={() => handleStepJoint(jointKey, 2)}>+2°</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1-CLICK CAPTURE LIVE POSE AS STEP BUTTON */}
      <div className="ik-input-group" style={{ padding: '1rem', border: '2px dashed var(--md-sys-color-primary)', background: 'var(--md-sys-color-surface-variant)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={16} className="icon-primary" /> Live Pose Ready to Capture
            </div>
            <div style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '0.2rem' }}>
              Current: [{store.angles.base}°, {store.angles.shoulder}°, {store.angles.elbow}°, {store.angles.wristPitch}°, {store.angles.wristRoll}°, {store.angles.gripper}°]
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={14} />
              <input
                type="number"
                value={defaultStepDuration}
                onChange={(e) => setDefaultStepDuration(Number(e.target.value))}
                style={{ width: '65px', padding: '0.3rem', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline)', fontFamily: 'var(--font-mono)' }}
                step={100}
                min={100}
              />
              <span style={{ fontSize: '0.74rem' }}>ms</span>
            </div>

            <button
              className="btn-m3-filled"
              onClick={handleCaptureLivePose}
              style={{ padding: '0.6rem 1.4rem', fontSize: '0.88rem', boxShadow: '0 4px 12px rgba(11, 87, 208, 0.35)' }}
            >
              <Plus size={18} /> Capture Step (Press 'C')
            </button>
          </div>
        </div>
      </div>

      {/* Active Trajectory Steps Queue */}
      <div className="ik-input-group" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700 }}>
            Macro Trajectory Queue ({store.activeSequence.length} Steps)
          </h3>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              className={`btn-m3-tonal ${store.loopSequence ? 'btn-m3-filled' : ''}`}
              onClick={() => store.setSequence(store.activeSequence)}
            >
              <Repeat size={14} /> Loop
            </button>
            <button className="btn-step" onClick={() => store.setSequence([])} disabled={store.activeSequence.length === 0}>
              Clear Queue
            </button>
          </div>
        </div>

        {store.activeSequence.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 0 0.3rem 0' }}>Queue is empty</p>
            <p style={{ fontSize: '0.76rem', margin: 0 }}>
              Adjust joints live via keyboard/gamepad/sliders/3D click and click <strong>"Capture Step (Press 'C')"</strong> above!
            </p>
          </div>
        ) : (
          <div className="sequence-steps-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
            {store.activeSequence.map((step, idx) => {
              const isActive = store.currentStepIndex === idx && store.isPlayingSequence;

              return (
                <div
                  key={step.id || idx}
                  className={`pose-card ${isActive ? 'at-limit' : ''}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.65rem 0.85rem',
                    background: isActive ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface)',
                    border: isActive ? '2px solid var(--md-sys-color-primary)' : '1px solid var(--md-sys-color-outline)',
                    borderRadius: '10px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1, marginRight: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--md-sys-color-primary)' }}>
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => handleUpdateStepName(idx, e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.82rem', color: 'var(--md-sys-color-on-surface)', width: '130px' }}
                      />
                    </div>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      [{step.angles.base}°, {step.angles.shoulder}°, {step.angles.elbow}°, {step.angles.wristPitch}°, {step.angles.wristRoll}°, {step.angles.gripper}°]
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {/* Duration Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginRight: '0.3rem' }}>
                      <Clock size={12} />
                      <input
                        type="number"
                        value={step.duration}
                        onChange={(e) => handleUpdateStepDuration(idx, Number(e.target.value))}
                        style={{ width: '55px', padding: '0.15rem', fontSize: '0.72rem', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--md-sys-color-outline)', fontFamily: 'var(--font-mono)' }}
                        step={100}
                      />
                      <span style={{ fontSize: '0.68rem' }}>ms</span>
                    </div>

                    <button className="btn-step" onClick={() => handlePlayPose(step)} title="Test Step Live">
                      <Play size={12} />
                    </button>
                    <button className="btn-step" onClick={() => handleOverwriteStepWithLive(idx)} title="Overwrite step with live posture">
                      <RefreshCw size={12} />
                    </button>
                    <button className="btn-step" onClick={() => handleDuplicateStep(idx)} title="Duplicate Step">
                      <Copy size={12} />
                    </button>
                    <button className="btn-step" onClick={() => handleMoveStep(idx, 'up')} disabled={idx === 0} title="Move Up">
                      <ArrowUp size={12} />
                    </button>
                    <button className="btn-step" onClick={() => handleMoveStep(idx, 'down')} disabled={idx === store.activeSequence.length - 1} title="Move Down">
                      <ArrowDown size={12} />
                    </button>
                    <button className="btn-step" onClick={() => handleRemoveStep(idx)} style={{ color: 'var(--md-sys-color-error)' }} title="Delete Step">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Playback Control Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
          <button className="btn-m3-tonal" onClick={handleStepBackward} disabled={store.activeSequence.length === 0} title="Previous Step">
            <SkipBack size={16} /> Step Back
          </button>

          {!store.isPlayingSequence ? (
            <button
              className="btn-m3-filled"
              style={{ flex: 1, padding: '0.65rem' }}
              onClick={handleRunSequence}
              disabled={store.activeSequence.length === 0}
            >
              <Play size={16} /> Execute Trajectory Sequence
            </button>
          ) : (
            <button className="btn-m3-estop" style={{ flex: 1, padding: '0.65rem' }} onClick={handleStopSequence}>
              <Pause size={16} /> Stop Playback
            </button>
          )}

          <button className="btn-m3-tonal" onClick={handleStepForward} disabled={store.activeSequence.length === 0} title="Next Step">
            Step Next <SkipForward size={16} />
          </button>
        </div>
      </div>

      {/* Save Trajectory to Library */}
      <div className="ik-input-group" style={{ padding: '0.85rem 1rem' }}>
        <div className="save-pose-box" style={{ margin: 0 }}>
          <input
            type="text"
            placeholder="Save Current Live Pose to Library (e.g. Block Pick)..."
            value={newPoseName}
            onChange={(e) => setNewPoseName(e.target.value)}
            className="input-text"
            style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline)', fontSize: '0.82rem' }}
          />
          <button className="btn-m3-tonal" onClick={handleSavePoseToLibrary}>
            <Save size={14} /> Save to Library
          </button>
        </div>

        {store.savedPoses.length > 0 && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '140px', overflowY: 'auto' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>Saved Pose Library:</span>
            {store.savedPoses.map((pose) => (
              <div key={pose.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.6rem', background: 'var(--md-sys-color-surface)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '6px', fontSize: '0.76rem' }}>
                <span><strong>{pose.name}</strong> [{pose.angles.base}°, {pose.angles.shoulder}°, {pose.angles.elbow}°]</span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button className="btn-step" onClick={() => handlePlayPose(pose)} title="Go to Pose"><Play size={10} /></button>
                  <button className="btn-step" onClick={() => handleAddPresetStep(pose)} title="Add as Step"><Plus size={10} /></button>
                  <button className="btn-step" onClick={() => store.deletePose(pose.id)} style={{ color: 'var(--md-sys-color-error)' }} title="Delete"><Trash2 size={10} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
