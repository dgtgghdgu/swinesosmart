// Enums
export enum HealthStatus {
  HEALTHY = '健康',
  SICK = '患病',
  INJURED = '受伤',
  QUARANTINE = '隔离',
  DECEASED = '死亡'
}

export enum Gender {
  BOAR = '公猪',
  SOW = '母猪',
  GILT = '后备母猪',
  BARROW = '阉公猪'
}

// 1. 功能区类型 (Functional Zones)
export enum ZoneType {
  GESTATION = '配怀舍', // 配种+妊娠
  FARROWING = '分娩舍',
  NURSERY = '保育舍',
  FATTENING = '育肥舍',
  GILT = '后备舍'
}

// 2. 设备类型与控制模式
export enum DeviceType {
  FAN_FIXED = '定频风机',      // On/Off
  FAN_VAR = '变频风机',        // 0-100%
  INLET = '通风小窗',          // 0-100%
  SHUTTER = '百叶窗',          // 0-100%
  PUMP = '水帘水泵',           // On/Off
  HEATER = '取暖设备',         // Power/Status
  FEEDER = '饲喂器',
  LIGHT = '照明'
}

export enum DeviceControlMode {
  TOGGLE = 'SWITCH', // 开关控制
  RANGE = 'SLIDER',  // 比例控制 (0-100)
  READ_ONLY = 'READ' // 仅读取
}

export enum DeviceStatus {
  OFF = '停止',
  RUNNING = '运行',
  FAULT = '故障',
  OFFLINE = '离线'
}

// 3. 数据模型：静态配置 vs 实时状态

// 实时状态 (来自 MQTT/Redis)
export interface DeviceState {
  deviceId: string;
  status: DeviceStatus;
  value: number; // 0 or 1 for toggle, 0-100 for range
  runtimeHours: number;
  lastUpdate: number;
}

// 静态配置 (来自 数据库/配置中心)
export interface DeviceConfig {
  id: string;
  name: string;
  type: DeviceType;
  controlMode: DeviceControlMode;
  penId: string; // 归属圈舍
  powerRating: number; // kW
}

// 圈舍 (Pen/Room) - 最小环境控制单元
export interface FarmPen {
  id: string;
  name: string;
  zoneId: string;
  targetTemp: number; // 目标温度配置
  area: number; // 面积 (平方米)
  capacity: number; // 设计容量 (头)
}

// 功能区 (Functional Zone)
export interface FarmZone {
  id: string;
  name: string;
  type: ZoneType;
}

// 料塔 (Feed Tower) - 共享资源
export interface FeedTower {
  id: string;
  name: string;
  maxCapacity: number; // kg
  currentWeight: number; // kg
  linkedPenIds: string[]; // 供料的圈舍ID集合
}

// 环境遥测数据 (通常以圈舍为单位)
export interface EnvironmentData {
  penId: string;
  timestamp: number;
  temperature: number;
  humidity: number;
  co2: number;
  ammonia: number;
}

// 完整数据聚合 (用于前端显示)
export interface Device extends DeviceConfig, DeviceState {}

// --- Configuration Management Types ---

export interface SystemConfig {
  zones: FarmZone[];
  pens: FarmPen[];
  devices: DeviceConfig[];
  feedTowers: FeedTower[];
}

export interface ConfigVersion {
  id: string;
  timestamp: number;
  author: string;
  description: string;
  configSnapshot: SystemConfig;
}

// Domain Models
export interface Pig {
  id: string;
  tagNumber: string;
  breed: string;
  gender: Gender;
  birthDate: string;
  weightKg: number;
  penLocation: string; // Simplified for display
  healthStatus: HealthStatus;
  lastCheckup: string;
  notes?: string;
}

export interface AiVetDiagnosis {
  diagnosis: string;
  severity: '低' | '中' | '高' | '危急';
  confidence: number;
  recommendedActions: string[];
  dietaryAdjustments: string;
  requiresIsolation: boolean;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// --- Auth & Permissions ---

export enum UserRole {
  ADMIN = '管理员',     // Full access
  OPERATOR = '操作员',  // Read-only
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
}