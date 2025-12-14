import { 
  SystemConfig, ConfigVersion, FarmZone, FarmPen, DeviceConfig, FeedTower,
  ZoneType, DeviceType, DeviceControlMode
} from '../types';

const STORAGE_KEY_CONFIG = 'smartfarm_config_head';
const STORAGE_KEY_HISTORY = 'smartfarm_config_history';

// --- Default/Seed Data (Moved from TelemetryService) ---

const DEFAULT_ZONES: FarmZone[] = [
  { id: 'z_farrow', name: 'A区-分娩舍', type: ZoneType.FARROWING },
  { id: 'z_nursery', name: 'B区-保育舍', type: ZoneType.NURSERY },
  { id: 'z_fatten', name: 'C区-育肥舍', type: ZoneType.FATTENING },
];

const DEFAULT_PENS: FarmPen[] = [
  { id: 'p_f1', name: '分娩1室', zoneId: 'z_farrow', targetTemp: 24, area: 120, capacity: 20 },
  { id: 'p_f2', name: '分娩2室', zoneId: 'z_farrow', targetTemp: 24, area: 120, capacity: 20 },
  { id: 'p_n1', name: '保育1室', zoneId: 'z_nursery', targetTemp: 26, area: 200, capacity: 100 },
  { id: 'p_ft1', name: '育肥1室', zoneId: 'z_fatten', targetTemp: 20, area: 400, capacity: 200 },
  { id: 'p_ft2', name: '育肥2室', zoneId: 'z_fatten', targetTemp: 20, area: 400, capacity: 200 },
];

const generateDevicesForPen = (pen: FarmPen): DeviceConfig[] => {
  const devices: DeviceConfig[] = [];
  const prefix = pen.id;

  devices.push({
    id: `${prefix}_fan_var_1`, name: '变频风机 1', penId: pen.id,
    type: DeviceType.FAN_VAR, controlMode: DeviceControlMode.RANGE, powerRating: 1.5
  });

  if (pen.zoneId === 'z_fatten') {
    devices.push({
      id: `${prefix}_fan_fix_1`, name: '定频风机 1', penId: pen.id,
      type: DeviceType.FAN_FIXED, controlMode: DeviceControlMode.TOGGLE, powerRating: 1.1
    });
    devices.push({
      id: `${prefix}_fan_fix_2`, name: '定频风机 2', penId: pen.id,
      type: DeviceType.FAN_FIXED, controlMode: DeviceControlMode.TOGGLE, powerRating: 1.1
    });
  }

  devices.push({
    id: `${prefix}_inlet`, name: '侧墙小窗', penId: pen.id,
    type: DeviceType.INLET, controlMode: DeviceControlMode.RANGE, powerRating: 0.2
  });

  devices.push({
    id: `${prefix}_pump`, name: '湿帘泵', penId: pen.id,
    type: DeviceType.PUMP, controlMode: DeviceControlMode.TOGGLE, powerRating: 0.75
  });

  if (pen.zoneId === 'z_farrow' || pen.zoneId === 'z_nursery') {
    devices.push({
      id: `${prefix}_heat`, name: '地暖系统', penId: pen.id,
      type: DeviceType.HEATER, controlMode: DeviceControlMode.RANGE, powerRating: 3.0
    });
  }

  return devices;
};

const DEFAULT_DEVICES: DeviceConfig[] = DEFAULT_PENS.flatMap(pen => generateDevicesForPen(pen));

const DEFAULT_TOWERS: FeedTower[] = [
  { id: 't_1', name: '1号主料塔', maxCapacity: 10000, currentWeight: 8500, linkedPenIds: ['p_f1', 'p_f2', 'p_n1'] },
  { id: 't_2', name: '2号育肥塔', maxCapacity: 15000, currentWeight: 4200, linkedPenIds: ['p_ft1', 'p_ft2'] }
];

const DEFAULT_CONFIG: SystemConfig = {
  zones: DEFAULT_ZONES,
  pens: DEFAULT_PENS,
  devices: DEFAULT_DEVICES,
  feedTowers: DEFAULT_TOWERS
};

// --- Config Service Implementation ---

export const ConfigService = {
  
  // Initialize and get current config
  getCurrentConfig: (): SystemConfig => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) {
        const config = JSON.parse(stored);
        // Migration: Ensure new fields exist for old data
        config.pens = config.pens.map((p: any) => ({
          ...p,
          area: p.area || 100,
          capacity: p.capacity || 50
        }));
        // Migration for Feed Towers
        if (!config.feedTowers) {
          config.feedTowers = DEFAULT_TOWERS;
        }
        return config;
      }
      // First time init
      ConfigService.saveConfig(DEFAULT_CONFIG, 'System', '初始化默认配置');
      return DEFAULT_CONFIG;
    } catch (e) {
      console.error('Config Load Error', e);
      return DEFAULT_CONFIG;
    }
  },

  // Save new config and create history entry
  saveConfig: (newConfig: SystemConfig, author: string, description: string): boolean => {
    try {
      // 1. Save Head
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));

      // 2. Create Version Entry
      const version: ConfigVersion = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        author,
        description,
        configSnapshot: newConfig
      };

      // 3. Append to History
      const historyStr = localStorage.getItem(STORAGE_KEY_HISTORY);
      const history: ConfigVersion[] = historyStr ? JSON.parse(historyStr) : [];
      
      // Keep only last 20 versions
      const newHistory = [version, ...history].slice(0, 20);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory));

      // Dispatch event for components to reload if needed (basic reactivity)
      window.dispatchEvent(new Event('smartfarm-config-updated'));
      
      return true;
    } catch (e) {
      console.error('Config Save Error', e);
      return false;
    }
  },

  getHistory: (): ConfigVersion[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  rollback: (version: ConfigVersion, user: string): boolean => {
    // Rollback is essentially saving an old config as a new head with a rollback message
    return ConfigService.saveConfig(
      version.configSnapshot, 
      user, 
      `回滚至版本 ${new Date(version.timestamp).toLocaleString()}: ${version.description}`
    );
  }
};