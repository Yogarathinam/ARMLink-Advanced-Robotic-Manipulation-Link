import type { JointAngles } from '../robot/kinematics';
import { getArmStoreState, type TransportType } from '../state/armStore';

export interface ServoCommandPayload {
  type: 'servo_command';
  angles: Record<string, number>;
  duration?: number;
}

export class TransportManager {
  private static instance: TransportManager;
  private ws: WebSocket | null = null;
  private bleDevice: any = null;
  private bleCharacteristic: any = null;
  private serialPort: any = null;
  private serialWriter: any = null;
  private mockInterval: any = null;

  public getBleDevice() {
    return this.bleDevice;
  }

  public getSerialPort() {
    return this.serialPort;
  }

  private constructor() {
    this.startMockEngine();
  }

  public static getInstance(): TransportManager {
    if (!TransportManager.instance) {
      TransportManager.instance = new TransportManager();
    }
    return TransportManager.instance;
  }

  /**
   * Start mock background state loop for offline simulation
   */
  private startMockEngine() {
    if (this.mockInterval) clearInterval(this.mockInterval);
    this.mockInterval = setInterval(() => {
      const store = getArmStoreState();
      if (store.transportType === 'mock') {
        // Smoothly interpolate current angles toward target angles in mock mode
        const cur = store.angles;
        const tgt = store.targetAngles;
        let updated = false;

        const nextAngles: JointAngles = { ...cur };
        (Object.keys(cur) as Array<keyof JointAngles>).forEach((j) => {
          const diff = tgt[j] - cur[j];
          if (Math.abs(diff) > 0.5) {
            nextAngles[j] = Math.round(cur[j] + diff * 0.25);
            updated = true;
          } else {
            nextAngles[j] = tgt[j];
          }
        });

        if (updated) {
          store.setAllAngles(nextAngles);
        }
      }
    }, 40);
  }

  /**
   * Connect to ESP32 via Wi-Fi WebSockets
   */
  public async connectWifi(ip: string): Promise<boolean> {
    const store = getArmStoreState();
    store.setConnected(false, `Connecting to WebSocket ws://${ip}:81...`);

    return new Promise((resolve) => {
      try {
        if (this.ws) this.ws.close();
        this.ws = new WebSocket(`ws://${ip}:81`);

        this.ws.onopen = () => {
          store.setTransport('wifi');
          store.setConnected(true, `Connected to ESP32 Wi-Fi WebSocket (${ip})`);
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleIncomingJson(event.data);
        };

        this.ws.onerror = (err) => {
          console.error('WebSocket Error:', err);
          store.setConnected(false, 'Wi-Fi Connection Failed');
          resolve(false);
        };

        this.ws.onclose = () => {
          store.setConnected(false, 'Wi-Fi Connection Closed');
        };
      } catch (e: any) {
        store.setConnected(false, `Wi-Fi Error: ${e.message}`);
        resolve(false);
      }
    });
  }

  /**
   * Connect to ESP32 via Web Bluetooth (BLE GATT)
   */
  public async connectBle(): Promise<boolean> {
    const store = getArmStoreState();
    store.setConnected(false, 'Requesting Bluetooth LE Device...');

    if (!('bluetooth' in navigator)) {
      store.setConnected(false, 'Web Bluetooth API not supported in this browser!');
      return false;
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ namePrefix: 'ArmLink' }, { namePrefix: 'ESP32' }],
        optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
      this.bleCharacteristic = await service.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e');

      this.bleDevice = device;
      store.setTransport('ble');
      store.setConnected(true, `Connected to BLE Device: ${device.name}`);
      return true;
    } catch (e: any) {
      console.error('BLE Error:', e);
      store.setConnected(false, `BLE Connection Error: ${e.message}`);
      return false;
    }
  }

  /**
   * Connect to ESP32 via Web Serial (USB UART)
   */
  public async connectSerial(baud = 115200): Promise<boolean> {
    const store = getArmStoreState();
    store.setConnected(false, 'Selecting USB Serial Port...');

    if (!('serial' in navigator)) {
      store.setConnected(false, 'Web Serial API not supported in this browser!');
      return false;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: baud });
      
      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(port.writable);
      this.serialWriter = textEncoder.writable.getWriter();
      this.serialPort = port;

      store.setTransport('serial');
      store.setConnected(true, `Connected via USB Serial @ ${baud} baud`);
      
      // Listen for incoming serial data
      this.readSerialLoop(port);
      return true;
    } catch (e: any) {
      console.error('Serial Error:', e);
      store.setConnected(false, `Serial Connection Error: ${e.message}`);
      return false;
    }
  }

  private async readSerialLoop(port: any) {
    const textDecoder = new TextDecoderStream();
    port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) this.handleIncomingJson(value);
      }
    } catch (err) {
      console.error('Serial Read Error:', err);
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Handle incoming line JSON telemetry broadcast from ESP32
   */
  private handleIncomingJson(dataStr: string) {
    try {
      const json = JSON.parse(dataStr);
      const store = getArmStoreState();

      if (json.type === 'servo_state' && json.angles) {
        store.setAllAngles({
          base: json.angles.base ?? store.angles.base,
          shoulder: json.angles.shoulder ?? store.angles.shoulder,
          elbow: json.angles.elbow ?? store.angles.elbow,
          wristPitch: json.angles.wristPitch ?? store.angles.wristPitch,
          wristRoll: json.angles.wristRoll ?? store.angles.wristRoll,
          gripper: json.angles.gripper ?? store.angles.gripper
        });

        if (json.estop_active !== undefined) {
          store.setEstop(json.estop_active);
        }
      }
    } catch (e) {
      // Ignore raw string prints
    }
  }

  /**
   * Send Servo Command to Active Transport
   */
  public sendServoCommand(angles: JointAngles, duration = 300) {
    const store = getArmStoreState();
    
    // Always update target angles in state
    store.setTargetAngles(angles);

    const payload: ServoCommandPayload = {
      type: 'servo_command',
      angles: {
        base: angles.base,
        shoulder: angles.shoulder,
        elbow: angles.elbow,
        wristPitch: angles.wristPitch,
        wristRoll: angles.wristRoll,
        gripper: angles.gripper
      },
      duration
    };

    const jsonStr = JSON.stringify(payload) + '\n';
    this.transmitString(jsonStr, store.transportType);
  }

  /**
   * Send E-Stop Command
   */
  public sendEstop(active: boolean) {
    const store = getArmStoreState();
    store.setEstop(active);
    const payload = JSON.stringify({ type: 'estop', active }) + '\n';
    this.transmitString(payload, store.transportType);
  }

  /**
   * Send Home Stance Command & Reset State Angles
   */
  public sendHome() {
    const store = getArmStoreState();
    const homeAngles: JointAngles = {
      base: 90,
      shoulder: 150,
      elbow: 35,
      wristPitch: 140,
      wristRoll: 85,
      gripper: 80
    };
    store.setAllAngles(homeAngles);
    this.sendServoCommand(homeAngles, 500);
    const payload = JSON.stringify({ type: 'home' }) + '\n';
    this.transmitString(payload, store.transportType);
  }

  /**
   * Transmit formatted JSON string across current active transport
   */
  private transmitString(data: string, transport: TransportType) {
    if (transport === 'wifi' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else if (transport === 'ble' && this.bleCharacteristic) {
      const encoder = new TextEncoder();
      this.bleCharacteristic.writeValue(encoder.encode(data));
    } else if (transport === 'serial' && this.serialWriter) {
      this.serialWriter.write(data);
    }
  }
}

export const transportManager = TransportManager.getInstance();
