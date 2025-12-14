import React, { useState, useEffect } from 'react';
import { 
  Fan, 
  ThermometerSun, 
  Droplets, 
  Wind, 
  Grid, 
  Activity,
  Settings2,
  Lock
} from 'lucide-react';
import { TelemetryService } from '../services/telemetryService';
import { Device, DeviceState, DeviceType, DeviceControlMode, DeviceStatus, FarmZone, FarmPen, EnvironmentData } from '../types';
import { useAuth } from '../contexts/AuthContext';

// Icons Mapping
const getDeviceIcon = (type: DeviceType) => {
  switch (type) {
    case DeviceType.FAN_FIXED:
    case DeviceType.FAN_VAR: return Fan;
    case DeviceType.HEATER: return ThermometerSun;
    case DeviceType.PUMP: return Droplets;
    case DeviceType.INLET: 
    case DeviceType.SHUTTER: return Wind;
    default: return Settings2;
  }
};

const Devices: React.FC = () => {
  const { isAdmin } = useAuth();
  
  // Dynamic Config State
  const [zones, setZones] = useState<FarmZone[]>([]);
  const [pens, setPens] = useState<FarmPen[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);

  // Navigation State
  const [selectedZone, setSelectedZone] = useState<FarmZone | null>(null);
  const [selectedPen, setSelectedPen] = useState<FarmPen | null>(null);

  // Data State
  const [deviceStates, setDeviceStates] = useState<Record<string, DeviceState>>({});
  const [envData, setEnvData] = useState<Record<string, EnvironmentData>>({});

  // 1. Initial Load & Config Subscriptions
  useEffect(() => {
    const loadConfig = () => {
      const zs = TelemetryService.getZones();
      const ps = TelemetryService.getPens();
      const ds = TelemetryService.getDevices();
      
      setZones(zs);
      setPens(ps);
      setConfigs(ds);
      
      // Set defaults if nothing selected or selection is invalid
      if (zs.length > 0 && (!selectedZone || !zs.find(z => z.id === selectedZone.id))) {
        setSelectedZone(zs[0]);
      }
    };

    loadConfig();
    window.addEventListener('smartfarm-config-updated', loadConfig);
    return () => window.removeEventListener('smartfarm-config-updated', loadConfig);
  }, []); // Run once on mount, then listeners handle updates

  // 2. Update Pens when Zone changes
  useEffect(() => {
    if (selectedZone) {
      const zonePens = pens.filter(p => p.zoneId === selectedZone.id);
      if (zonePens.length > 0) {
        // Keep selection if valid, else pick first
        if (!selectedPen || selectedPen.zoneId !== selectedZone.id) {
          setSelectedPen(zonePens[0]);
        }
      } else {
        setSelectedPen(null);
      }
    }
  }, [selectedZone, pens]);

  // 3. Subscribe to Telemetry
  useEffect(() => {
    const unsubDev = TelemetryService.subscribeDevices((states) => {
      const map: Record<string, DeviceState> = {};
      states.forEach(s => map[s.deviceId] = s);
      setDeviceStates(map);
    });

    const unsubEnv = TelemetryService.subscribeEnv((envs) => {
      const map: Record<string, EnvironmentData> = {};
      envs.forEach(e => map[e.penId] = e);
      setEnvData(map);
    });

    return () => {
      unsubDev();
      unsubEnv();
    };
  }, []);

  // 4. Merge Config + State for rendering
  const currentPenDevices = configs.filter(c => c.penId === selectedPen?.id).map(config => {
    const state = deviceStates[config.id] || { 
      deviceId: config.id, status: DeviceStatus.OFFLINE, value: 0, runtimeHours: 0, lastUpdate: 0 
    };
    return { ...config, ...state };
  });

  const currentEnv = selectedPen ? envData[selectedPen.id] : null;

  // Control Handlers
  const handleToggle = (id: string, currentValue: number) => {
    if (!isAdmin) return;
    const newValue = currentValue > 0 ? 0 : 1;
    TelemetryService.sendControlCommand(id, newValue);
  };

  const handleSliderChange = (id: string, newValue: number) => {
    if (!isAdmin) return;
    TelemetryService.sendControlCommand(id, newValue);
  };

  if (zones.length === 0) return <div className="p-8 text-center text-slate-500">正在加载系统配置...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-100px)]">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">设备智控中心</h2>
          <div className="flex items-center gap-2 mt-1">
             <p className="text-sm text-slate-500">多级分区设备管理与实时控制</p>
             {!isAdmin && (
               <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                 <Lock className="w-3 h-3" /> 只读模式
               </span>
             )}
          </div>
        </div>
        
        {/* Environment Summary for Current Pen */}
        {currentEnv && (
          <div className="flex w-full md:w-auto gap-4 bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-sm text-sm justify-around md:justify-start">
            <div className="flex items-center gap-2">
              <ThermometerSun className="w-4 h-4 text-red-500" />
              <span className="font-mono font-bold text-slate-700">{currentEnv.temperature}°C</span>
            </div>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
              <Droplets className="w-4 h-4 text-blue-500" />
              <span className="font-mono font-bold text-slate-700">{currentEnv.humidity}%</span>
            </div>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
              <Wind className="w-4 h-4 text-green-500" />
              <span className="font-mono font-bold text-slate-700">{currentEnv.co2}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
        
        {/* Left Sidebar: Zones */}
        <div className="w-full lg:w-64 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col shrink-0 overflow-hidden max-h-[120px] lg:max-h-none">
          <div className="p-3 lg:p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex items-center gap-2 text-sm lg:text-base">
            <Grid className="w-4 h-4" /> 养殖功能区
          </div>
          <div className="overflow-x-auto lg:overflow-y-auto p-2 flex lg:block gap-2 custom-scrollbar">
            {zones.map(zone => (
              <button
                key={zone.id}
                onClick={() => setSelectedZone(zone)}
                className={`
                  whitespace-nowrap flex-shrink-0 lg:w-full text-left px-4 py-2 lg:py-3 rounded-lg text-sm font-medium transition-colors flex justify-between items-center
                  ${selectedZone?.id === zone.id 
                    ? 'bg-brand-50 text-brand-700 border border-brand-200' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'}
                `}
              >
                {zone.name}
                {selectedZone?.id === zone.id && <div className="hidden lg:block w-2 h-2 rounded-full bg-brand-500"></div>}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Top Tabs: Pens */}
          <div className="flex items-center gap-2 p-2 border-b border-slate-200 overflow-x-auto bg-slate-50 custom-scrollbar shrink-0">
            {selectedZone && pens.filter(p => p.zoneId === selectedZone.id).map(pen => (
              <button
                key={pen.id}
                onClick={() => setSelectedPen(pen)}
                className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedPen?.id === pen.id
                    ? 'bg-white text-brand-600 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {pen.name}
              </button>
            ))}
            {selectedZone && pens.filter(p => p.zoneId === selectedZone.id).length === 0 && (
              <span className="text-sm text-slate-400 px-4">该区域下暂无圈舍</span>
            )}
          </div>

          {/* Devices Grid */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {currentPenDevices.map((device) => (
                <DeviceCard 
                  key={device.id} 
                  device={device} 
                  canControl={isAdmin}
                  onToggle={() => handleToggle(device.id, device.value)}
                  onChange={(val) => handleSliderChange(device.id, val)}
                />
              ))}
              
              {currentPenDevices.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                  该圈舍暂无配置设备
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-component: Device Card ---
const DeviceCard: React.FC<{
  device: Device;
  canControl: boolean;
  onToggle: () => void;
  onChange: (val: number) => void;
}> = ({ device, canControl, onToggle, onChange }) => {
  const Icon = getDeviceIcon(device.type);
  const isRunning = device.status === DeviceStatus.RUNNING;
  
  return (
    <div className={`rounded-xl border p-5 transition-all ${
      isRunning ? 'border-brand-200 bg-brand-50/30' : 'border-slate-200 bg-white'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${
            isRunning ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'
          }`}>
            <Icon className={`w-6 h-6 ${isRunning && (device.type === DeviceType.FAN_FIXED || device.type === DeviceType.FAN_VAR) ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">{device.name}</h4>
            <span className="text-xs text-slate-500">{device.type}</span>
          </div>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
          isRunning ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {device.status}
        </div>
      </div>

      {/* Control Area */}
      <div className={`mt-4 ${!canControl ? 'opacity-60 pointer-events-none' : ''}`}>
        {device.controlMode === DeviceControlMode.TOGGLE && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">运行状态</span>
            <button
              onClick={onToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                device.value > 0 ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                device.value > 0 ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        )}

        {device.controlMode === DeviceControlMode.RANGE && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">
                {device.type === DeviceType.HEATER ? '输出功率' : '开启开度'}
              </span>
              <span className="font-mono font-bold text-brand-700">{device.value}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={device.value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
             <div className="flex justify-between text-[10px] text-slate-400 px-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
             </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3" /> {device.powerRating} kW
        </span>
        <span className="font-mono">{device.runtimeHours.toFixed(1)} h</span>
      </div>
    </div>
  );
};

export default Devices;
