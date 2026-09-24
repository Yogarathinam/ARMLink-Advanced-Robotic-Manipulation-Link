import React, { useState } from 'react';
import type { ArmStoreState, PosePreset } from '../state/armStore';
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
  ArrowDown
} from 'lucide-react';

interface SequencePlayerProps {
  store: ArmStoreState;
}

export const SequencePlayer: React.FC<SequencePlayerProps> = ({ store }) => {
  const [newPoseName, setNewPoseName] = useState('');
  const [stepDuration, setStepDuration] = useState<number>(1000);

  // Quick Macro Sequence Presets
  const MACRO_PRESETS: { name: string; sequence: PosePreset[] }[] = [
    {
      name: 'Pick and Place Sequence',
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
      name: 'Wave Greeting Routine',
      sequence: [
        { id: 'w1', name: 'Raise Arm', angles: { base: 90, shoulder: 80, elbow: 110, wristPitch: 90, wristRoll: 90, gripper: 45 }, duration: 1000 },
        { id: 'w2', name: 'Wave Left', angles: { base: 90, shoulder: 80, elbow: 110, wristPitch: 90, wristRoll: 40, gripper: 45 }, duration: 500 },
        { id: 'w3', name: 'Wave Right', angles: { base: 90, shoulder: 80, elbow: 110, wristPitch: 90, wristRoll: 140, gripper: 45 }, duration: 500 },
        { id: 'w4', name: 'Wave Left', angles: { base: 90, shoulder: 80, elbow: 110, wristPitch: 90, wristRoll: 40, gripper: 45 }, duration: 500 },
        { id: 'w5', name: 'Return Home', angles: { base: 90, shoulder: 150, elbow: 35, wristPitch: 140, wristRoll: 85, gripper: 80 }, duration: 1000 }
      ]
    }
  ];

  const handleSavePose = () => {
    const poseAngles = store.angles;
    const newPose: PosePreset = {
      id: `pose_${Date.now()}`,
      name: newPoseName.trim() || `Pose ${store.savedPoses.length + 1}`,
      angles: { ...poseAngles },
      duration: stepDuration
    };
    store.saveCurrentPose(newPose.name);
    setNewPoseName('');
  };

  const handlePlayPose = (pose: PosePreset) => {
    store.setAllAngles(pose.angles);
    transportManager.sendServoCommand(pose.angles, pose.duration);
  };

  const handleAddStepToSequence = (pose: PosePreset) => {
    store.setSequence([...store.activeSequence, { ...pose, duration: stepDuration }]);
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

  return (
    <div className="card panel-sequence">
      <div className="panel-header">
        <div className="title-group">
          <ListPlus className="icon-primary" size={22} />
          <h2>Pose Library & Motion Sequencer</h2>
        </div>
        <span className="joint-badge">{store.savedPoses.length} Poses Stored</span>
      </div>

      {/* Preset Macro Routines Loader */}
      <div className="quick-stances-bar">
        <span className="bar-label"><Sparkles size={14} /> Preset Routines:</span>
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

      {/* Save Pose & Step Duration Input */}
      <div className="ik-input-group" style={{ marginBottom: '1.25rem' }}>
        <div className="save-pose-box" style={{ margin: 0 }}>
          <input
            type="text"
            placeholder="Pose Name (e.g., Pick Up Block)..."
            value={newPoseName}
            onChange={(e) => setNewPoseName(e.target.value)}
            className="input-text"
          />
          <button className="btn-m3-filled" onClick={handleSavePose}>
            <Save size={16} /> Save Pose
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.6rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
            <Clock size={14} /> Motion Duration:
          </label>
          <div className="input-with-steppers">
            <button className="btn-step" onClick={() => setStepDuration(Math.max(300, stepDuration - 200))}>-200ms</button>
            <span className="input-num" style={{ width: '80px' }}>{stepDuration} ms</span>
            <button className="btn-step" onClick={() => setStepDuration(stepDuration + 200)}>+200ms</button>
          </div>
        </div>
      </div>

      {/* Saved Pose Library Cards */}
      <div className="poses-grid">
        {store.savedPoses.map((pose) => (
          <div key={pose.id} className="pose-card">
            <div className="pose-info">
              <strong>{pose.name}</strong>
              <span className="pose-angles">
                [{pose.angles.base}°, {pose.angles.shoulder}°, {pose.angles.elbow}°, {pose.angles.wristPitch}°]
              </span>
            </div>
            <div className="pose-actions">
              <button
                className="btn-m3-tonal"
                onClick={() => handlePlayPose(pose)}
                title="Go to Pose"
              >
                <Play size={12} /> Play
              </button>
              <button
                className="btn-m3-outlined"
                onClick={() => handleAddStepToSequence(pose)}
                title="Add to Trajectory Queue"
              >
                <Plus size={12} /> Add Step
              </button>
              <button
                className="btn-step"
                onClick={() => store.deletePose(pose.id)}
                title="Delete Pose"
                style={{ color: 'var(--md-sys-color-error)' }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Active Trajectory Timeline Queue */}
      <div className="ik-input-group" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Macro Trajectory Queue ({store.activeSequence.length} Steps)
          </h3>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              className={`btn-m3-tonal ${store.loopSequence ? 'btn-m3-filled' : ''}`}
              onClick={() => store.setSequence(store.activeSequence)}
            >
              <Repeat size={14} /> Loop
            </button>
            <button className="btn-step" onClick={() => store.setSequence([])}>
              Clear
            </button>
          </div>
        </div>

        {store.activeSequence.length === 0 ? (
          <p className="opt-desc" style={{ textAlign: 'center', padding: '1rem 0' }}>
            Trajectory queue is empty. Click "+ Add Step" on saved poses or select a preset routine.
          </p>
        ) : (
          <div className="sequence-steps-list">
            {store.activeSequence.map((step, idx) => {
              const isActive = store.currentStepIndex === idx && store.isPlayingSequence;

              return (
                <div key={idx} className={`pose-card ${isActive ? 'at-limit' : ''}`} style={{ marginBottom: '0.4rem' }}>
                  <div className="pose-info">
                    <strong>#{idx + 1} {step.name}</strong>
                    <span className="pose-angles">
                      [{step.angles.base}°, {step.angles.shoulder}°, {step.angles.elbow}°, {step.angles.wristPitch}°] • {step.duration}ms
                    </span>
                  </div>
                  <div className="pose-actions">
                    <button className="btn-step" onClick={() => handleMoveStep(idx, 'up')} disabled={idx === 0}>
                      <ArrowUp size={12} />
                    </button>
                    <button className="btn-step" onClick={() => handleMoveStep(idx, 'down')} disabled={idx === store.activeSequence.length - 1}>
                      <ArrowDown size={12} />
                    </button>
                    <button className="btn-m3-tonal" onClick={() => handlePlayPose(step)}>
                      <Play size={12} />
                    </button>
                    <button className="btn-step" onClick={() => handleRemoveStep(idx)} style={{ color: 'var(--md-sys-color-error)' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Debugging & Playback Control Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button className="btn-m3-tonal" onClick={handleStepBackward} title="Previous Step">
            <SkipBack size={16} /> Step Back
          </button>

          {!store.isPlayingSequence ? (
            <button
              className="btn-m3-filled"
              style={{ flex: 1 }}
              onClick={handleRunSequence}
              disabled={store.activeSequence.length === 0}
            >
              <Play size={16} /> Execute Macro Trajectory
            </button>
          ) : (
            <button className="btn-m3-estop" style={{ flex: 1 }} onClick={handleStopSequence}>
              <Pause size={16} /> Stop Playback
            </button>
          )}

          <button className="btn-m3-tonal" onClick={handleStepForward} title="Next Step">
            Step Next <SkipForward size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
