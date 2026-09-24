import React, { useState } from 'react';
import type { ArmStoreState } from '../state/armStore';
import { transportManager } from '../transports/TransportManager';
import { Wifi, Bluetooth, Cable, Monitor, AlertOctagon, Cpu, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  store: ArmStoreState;
}

export const Header: React.FC<HeaderProps> = ({ store }) => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [wifiIp, setWifiIp] = useState(store.ipAddress);

  const handleConnectWifi = async () => {
    await transportManager.connectWifi(wifiIp);
    setShowConnectModal(false);
  };

  const handleConnectBle = async () => {
    await transportManager.connectBle();
    setShowConnectModal(false);
  };

  const handleConnectSerial = async () => {
    await transportManager.connectSerial();
    setShowConnectModal(false);
  };

  const handleSelectMock = () => {
    store.setTransport('mock');
    setShowConnectModal(false);
  };

  const toggleTheme = () => {
    store.setTheme(store.theme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="main-header">
      <div className="header-left">
        <div className="brand-logo">
          <div className="brand-icon-wrapper">
            <Cpu size={22} />
          </div>
          <div className="brand-titles">
            <h1>ArmLink</h1>
            <span className="brand-subtitle">Robotic Manipulation Link</span>
          </div>
        </div>

        <div className={`connection-chip ${store.isConnected ? 'online' : 'offline'}`}>
          <span className="pulse-dot" />
          <span>
            {store.transportType.toUpperCase()}: {store.statusMessage}
          </span>
        </div>
      </div>

      <div className="header-right">
        {/* Material 3 Segmented Control Tabs */}
        <div className="segmented-control">
          <button
            className={`segment-btn ${store.controlMode === 'manual' ? 'active' : ''}`}
            onClick={() => store.setControlMode('manual')}
          >
            Sliders
          </button>
          <button
            className={`segment-btn ${store.controlMode === 'gamepad' ? 'active' : ''}`}
            onClick={() => store.setControlMode('gamepad')}
          >
            Gamepad
          </button>
          <button
            className={`segment-btn ${store.controlMode === 'ik' ? 'active' : ''}`}
            onClick={() => store.setControlMode('ik')}
          >
            3D IK
          </button>
          <button
            className={`segment-btn ${store.controlMode === 'sequence' ? 'active' : ''}`}
            onClick={() => store.setControlMode('sequence')}
          >
            Sequencer
          </button>
          <button
            className={`segment-btn ${store.controlMode === 'calibrate' ? 'active' : ''}`}
            onClick={() => store.setControlMode('calibrate')}
          >
            Calibration
          </button>
        </div>

        {/* Theme Mode Toggle (Sun/Moon) */}
        <button
          className="btn-icon-theme"
          onClick={toggleTheme}
          title={`Switch to ${store.theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {store.theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button className="btn-m3-outlined" onClick={() => setShowConnectModal(true)}>
          Transport
        </button>

        {/* Material Emergency Stop Button */}
        <button
          className="btn-m3-estop"
          onClick={() => transportManager.sendEstop(!store.estopActive)}
        >
          <AlertOctagon size={18} />
          {store.estopActive ? 'E-STOP ACTIVE' : 'E-STOP'}
        </button>
      </div>

      {/* Material Dialog Modal */}
      {showConnectModal && (
        <div className="modal-backdrop" onClick={() => setShowConnectModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Select Communication Transport</h2>
            <p className="opt-desc">Connect your ESP32 Robotic Arm over Wi-Fi, Web Bluetooth, USB Serial, or Simulation:</p>

            <div className="transports-grid">
              {/* Wi-Fi WebSocket */}
              <div className="transport-option">
                <div className="opt-title">
                  <Wifi size={20} className="icon-primary" />
                  <span>Wi-Fi WebSocket</span>
                </div>
                <input
                  type="text"
                  placeholder="192.168.4.1"
                  value={wifiIp}
                  onChange={(e) => setWifiIp(e.target.value)}
                  className="input-text"
                />
                <button className="btn-m3-filled" onClick={handleConnectWifi}>
                  Connect Wi-Fi
                </button>
              </div>

              {/* Web Bluetooth */}
              <div className="transport-option">
                <div className="opt-title">
                  <Bluetooth size={20} className="icon-primary" />
                  <span>Web Bluetooth BLE</span>
                </div>
                <p className="opt-desc">Connects via Nordic GATT BLE service.</p>
                <button className="btn-m3-filled" onClick={handleConnectBle}>
                  Pair Bluetooth
                </button>
              </div>

              {/* USB Serial */}
              <div className="transport-option">
                <div className="opt-title">
                  <Cable size={20} className="icon-primary" />
                  <span>USB Web Serial</span>
                </div>
                <p className="opt-desc">Connects via USB UART cable @ 115200 baud.</p>
                <button className="btn-m3-filled" onClick={handleConnectSerial}>
                  Open Serial
                </button>
              </div>

              {/* Offline Simulation */}
              <div className="transport-option">
                <div className="opt-title">
                  <Monitor size={20} className="icon-primary" />
                  <span>Offline Simulation</span>
                </div>
                <p className="opt-desc">Simulates physical arm in 3D digital twin.</p>
                <button className="btn-m3-tonal" onClick={handleSelectMock}>
                  Activate Simulation
                </button>
              </div>
            </div>

            <button className="btn-close-modal" onClick={() => setShowConnectModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
