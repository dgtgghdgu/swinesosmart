import { 
  FarmZone, FarmPen, DeviceConfig, DeviceState, EnvironmentData,
  DeviceStatus, SystemConfig
} from '../types';
import { ConfigService } from './configService';

/**
 * Unified Data Gateway (Frontend Abstraction Layer)
 */
class DataGateway {
  private envSubscribers: ((data: EnvironmentData[]) => void)[] = [];
  private deviceSubscribers: ((states: DeviceState[]) => void)[] = [];
  
  // Local cache simulating the Backend State Store
  private deviceStates: Map<string, DeviceState> = new Map();
  private envStates: Map<string, EnvironmentData> = new Map();
  private intervalId: number | null = null;

  // Active Configuration
  private currentConfig: SystemConfig;

  constructor() {
    this.currentConfig = ConfigService.getCurrentConfig();
    this.initSimulation();
    this.connect();

    // Listen for config changes to reload simulation context
    window.addEventListener('smartfarm-config-updated', () => {
      console.log('[DataGateway] Config updated, reloading context...');
      this.reloadContext();
    });
  }

  public getZones() { return this.currentConfig.zones; }
  public getPens() { return this.currentConfig.pens; }
  public getDevices() { return this.currentConfig.devices; }

  // Simulate establishing WebSocket connection
  private connect() {
    console.log('[DataGateway] Connecting to Unified Backend (WS)...');
    setTimeout(() => console.log('[DataGateway] Connected. Stream active.'), 500);
    this.startHeartbeat();
  }

  private reloadContext() {
    this.currentConfig = ConfigService.getCurrentConfig();
    // Re-init simulation for new devices/pens without destroying existing state if possible
    // For simplicity, we merge new config into state
    
    // 1. Ensure all configured devices have a state entry
    this.currentConfig.devices.forEach(conf => {
      if (!this.deviceStates.has(conf.id)) {
        this.deviceStates.set(conf.id, {
          deviceId: conf.id,
          status: DeviceStatus.RUNNING,
          value: conf.controlMode === 'SWITCH' ? 1 : 50, // Default on
          runtimeHours: 0,
          lastUpdate: Date.now()
        });
      }
    });

    // 2. Ensure all pens have env data
    this.currentConfig.pens.forEach(pen => {
      if (!this.envStates.has(pen.id)) {
        this.envStates.set(pen.id, {
          penId: pen.id,
          timestamp: Date.now(),
          temperature: pen.targetTemp,
          humidity: 60,
          co2: 400,
          ammonia: 5
        });
      }
    });

    // 3. Clean up orphans (items removed from config)
    const validDeviceIds = new Set(this.currentConfig.devices.map(d => d.id));
    for (const id of this.deviceStates.keys()) {
      if (!validDeviceIds.has(id)) this.deviceStates.delete(id);
    }
    
    const validPenIds = new Set(this.currentConfig.pens.map(p => p.id));
    for (const id of this.envStates.keys()) {
      if (!validPenIds.has(id)) this.envStates.delete(id);
    }

    this.notifySubscribers();
  }

  private initSimulation() {
    this.reloadContext();
  }

  private startHeartbeat() {
    if (this.intervalId) return;
    this.intervalId = window.setInterval(() => {
      this.processIncomingData();
    }, 2000);
  }

  private processIncomingData() {
    // 1. Simulate Environmental Sensor Data Ingestion
    this.currentConfig.pens.forEach(pen => {
      const current = this.envStates.get(pen.id);
      if (!current) return;

      current.temperature += (Math.random() - 0.5) * 0.2;
      current.humidity += (Math.random() - 0.5) * 1.5;
      current.co2 += (Math.random() - 0.5) * 15;
      current.timestamp = Date.now();
      
      // Formatting
      current.temperature = Number(current.temperature.toFixed(1));
      current.humidity = Math.max(30, Math.min(99, Math.round(current.humidity)));
      current.co2 = Math.round(current.co2);
      
      this.envStates.set(pen.id, current);
    });

    // 2. Simulate Device Status Feedback
    this.deviceStates.forEach((state) => {
      if (state.status === DeviceStatus.RUNNING && state.value > 0) {
        state.runtimeHours += 0.0005;
      }
    });

    this.notifySubscribers();
  }

  // --- Subscription Interfaces ---

  public subscribeEnv(callback: (data: EnvironmentData[]) => void) {
    this.envSubscribers.push(callback);
    callback(Array.from(this.envStates.values()));
    return () => { this.envSubscribers = this.envSubscribers.filter(cb => cb !== callback); };
  }

  public subscribeDevices(callback: (states: DeviceState[]) => void) {
    this.deviceSubscribers.push(callback);
    callback(Array.from(this.deviceStates.values()));
    return () => { this.deviceSubscribers = this.deviceSubscribers.filter(cb => cb !== callback); };
  }

  private notifySubscribers() {
    const envList = Array.from(this.envStates.values());
    this.envSubscribers.forEach(cb => cb(envList));

    const devList = Array.from(this.deviceStates.values());
    this.deviceSubscribers.forEach(cb => cb(devList));
  }

  // --- Control Interfaces (Commands to Backend) ---

  public async sendControlCommand(deviceId: string, value: number): Promise<boolean> {
    console.log(`[DataGateway] Command sent: ${deviceId} -> ${value}`);
    const state = this.deviceStates.get(deviceId);
    if (state) {
      state.value = value;
      state.status = value === 0 ? DeviceStatus.OFF : DeviceStatus.RUNNING;
      state.lastUpdate = Date.now();
      this.deviceStates.set(deviceId, state);
      this.notifySubscribers();
      return true;
    }
    return false;
  }
}

export const TelemetryService = new DataGateway();
