import React, { useState } from 'react';
import type { ArmStoreState, PosePreset } from '../state/armStore';
import { transportManager } from '../transports/TransportManager';
import { Play, Pause, Save, Trash2, Plus, Repeat, ListPlus } from 'lucide-react';

interface SequencePlayerProps {
  store: ArmStoreState;
}

export const SequencePlayer: React.FC<SequencePlayerProps> = ({ store }) => {
  const [newPoseName, setNewPoseName] = useState('');

  const handleSavePose = () => {
    store.saveCurrentPose(newPoseName);
    setNewPoseName('');
  };

  const handlePlayPose = (pose: PosePreset) => {
    store.setAllAngles(pose.angles);
    transportManager.sendServoCommand(pose.angles, pose.duration);
  };

  const handleAddToSequence = (pose: PosePreset) => {
    store.setSequence([...store.activeSequence, pose]);
  };

  const handleRunSequence = () => {
    if (store.activeSequence.length === 0) return;
    store.setIsPlayingSequence(true);

    let step = 0;
    const playNextStep = () => {
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

      const targetPose = state.activeSequence[step];
      state.setCurrentStepIndex(step);
      state.setAllAngles(targetPose.angles);
      transportManager.sendServoCommand(targetPose.angles, targetPose.duration);

      step++;
      setTimeout(playNextStep, targetPose.duration + 200);
    };

    playNextStep();
  };

  const handleStopSequence = () => {
    store.setIsPlayingSequence(false);
  };

  return (
    <div className="card panel-sequence">
      <div className="panel-header">
        <div className="title-group">
          <ListPlus className="icon-cyan" size={20} />
          <h2>Pose Library & Macro Sequencer</h2>
        </div>
        <span className="badge-purple">{store.savedPoses.length} Poses Stored</span>
      </div>

      {/* Save Current Pose Box */}
      <div className="save-pose-box">
        <input
          type="text"
          placeholder="Enter pose name (e.g. Pick Object)..."
          value={newPoseName}
          onChange={(e) => setNewPoseName(e.target.value)}
          className="input-text"
        />
        <button className="btn-primary" onClick={handleSavePose}>
          <Save size={16} /> Save Current Pose
        </button>
      </div>

      {/* Saved Poses List */}
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
                className="btn-sm btn-secondary"
                onClick={() => handlePlayPose(pose)}
                title="Go to Pose"
              >
                <Play size={12} /> Play
              </button>
              <button
                className="btn-sm btn-secondary"
                onClick={() => handleAddToSequence(pose)}
                title="Add to Sequence"
              >
                <Plus size={12} /> Add
              </button>
              <button
                className="btn-sm btn-danger"
                onClick={() => store.deletePose(pose.id)}
                title="Delete Pose"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Macro Sequence Queue */}
      <div className="sequence-queue-box">
        <div className="queue-header">
          <h3>Active Macro Trajectory ({store.activeSequence.length} Steps)</h3>
          <button
            className={`btn-sm ${store.loopSequence ? 'btn-cyan' : 'btn-secondary'}`}
            onClick={() => store.setSequence(store.activeSequence)}
          >
            <Repeat size={14} /> Loop
          </button>
        </div>

        {store.activeSequence.length === 0 ? (
          <p className="empty-text">Sequence queue is empty. Click "+ Add" on poses to build sequence.</p>
        ) : (
          <div className="sequence-steps-list">
            {store.activeSequence.map((step, idx) => (
              <div
                key={idx}
                className={`step-pill ${store.currentStepIndex === idx && store.isPlayingSequence ? 'active' : ''}`}
              >
                <span>#{idx + 1} {step.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="sequence-controls-bar">
          {!store.isPlayingSequence ? (
            <button
              className="btn-success w-full"
              onClick={handleRunSequence}
              disabled={store.activeSequence.length === 0}
            >
              <Play size={16} /> Execute Macro Sequence
            </button>
          ) : (
            <button className="btn-danger w-full" onClick={handleStopSequence}>
              <Pause size={16} /> Stop Sequence
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
