import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Wind, Droplets, Thermometer, CloudFog } from 'lucide-react';
import { TelemetryService } from '../services/telemetryService';
import { EnvironmentData, FarmPen, FarmZone } from '../types';

const Environment: React.FC = () => {
  const [pens, setPens] = useState<FarmPen[]>([]);
  const [zones, setZones] = useState<FarmZone[]>([]);
  const [activePenId, setActivePenId] = useState<string>('');
  
  const [liveData, setLiveData] = useState<EnvironmentData[]>([]);
  const [history, setHistory] = useState<Record<string, EnvironmentData[]>>({});

  // 1. Load Config
  useEffect(() => {
    const loadConfig = () => {
      const ps = TelemetryService.getPens();
      const zs = TelemetryService.getZones();
      setPens(ps);
      setZones(zs);
      
      // Init history buckets
      const initialHistory: Record<string, EnvironmentData[]> = {};
      ps.forEach(p => initialHistory[p.id] = []);
      setHistory(prev => ({...initialHistory, ...prev}));

      if (ps.length > 0 && !activePenId) {
        setActivePenId(ps[0].id);
      }
    };
    
    loadConfig();
    window.addEventListener('smartfarm-config-updated', loadConfig);
    return () => window.removeEventListener('smartfarm-config-updated', loadConfig);
  }, [activePenId]);

  // 2. Subscribe Telemetry
  useEffect(() => {
    const unsubscribe = TelemetryService.subscribeEnv((data) => {
      setLiveData(data);
      
      setHistory(prev => {
        const next = { ...prev };
        data.forEach(d => {
          if (!next[d.penId]) next[d.penId] = [];
          const zoneHistory = [...next[d.penId], d];
          if (zoneHistory.length > 30) zoneHistory.shift();
          next[d.penId] = zoneHistory;
        });
        return next;
      });
    });

    return () => unsubscribe();
  }, []);

  const currentPenData = liveData.find(d => d.penId === activePenId);
  const currentPenHistory = history[activePenId] || [];
  const currentPenConfig = pens.find(p => p.id === activePenId);
  const currentZone = zones.find(z => z.id === currentPenConfig?.zoneId);

  // Format timestamp for chart
  const chartData = currentPenHistory.map(d => ({
    ...d,
    timeStr: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }));

  if (pens.length === 0) return <div className="p-6">正在加载...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">环境监控中心</h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm text-slate-500">
               数据源: {currentZone?.name || '未知区域'} - {currentPenConfig?.name}
            </span>
          </div>
        </div>
        
        {/* Pen Selector */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          {pens.map(pen => (
            <button
              key={pen.id}
              onClick={() => setActivePenId(pen.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                activePenId === pen.id 
                  ? 'bg-brand-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {pen.name}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 transition-all duration-500 bg-white ${
            (currentPenData?.temperature || 0) > (currentPenConfig?.targetTemp || 25) + 2 ? 'border-l-red-500' : 'border-l-green-500'
        }`}>
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">当前温度</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2 font-mono">{currentPenData?.temperature || '--'} <span className="text-lg text-slate-400">°C</span></h3>
            </div>
            <Thermometer className="text-slate-400" />
          </div>
          <p className="text-xs text-slate-500 mt-2">目标设定: {currentPenConfig?.targetTemp}°C</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
           <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">相对湿度</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2 font-mono">{currentPenData?.humidity || '--'} <span className="text-lg text-slate-400">%</span></h3>
            </div>
            <Droplets className="text-blue-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">适宜范围: 50% - 70%</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-slate-500">
           <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">CO2 浓度</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2 font-mono">{currentPenData?.co2 || '--'} <span className="text-lg text-slate-400">ppm</span></h3>
            </div>
            <Wind className="text-slate-500" />
          </div>
           <p className="text-xs text-slate-500 mt-2">空气质量: 良</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
           <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">氨气浓度</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2 font-mono">{currentPenData?.ammonia || '--'} <span className="text-lg text-slate-400">ppm</span></h3>
            </div>
            <CloudFog className="text-amber-500" />
          </div>
           <p className="text-xs text-amber-600 mt-2 font-medium">注意通风</p>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-red-500"/> 温度实时趋势
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="timeStr" stroke="#94a3b8" fontSize={10} tick={{dy: 10}} />
                <YAxis stroke="#94a3b8" domain={['dataMin - 1', 'dataMax + 1']} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip />
                <Area type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" name="温度" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-500"/> 湿度实时趋势
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="timeStr" stroke="#94a3b8" fontSize={10} tick={{dy: 10}} />
                <YAxis stroke="#94a3b8" domain={[40, 100]} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip />
                <Area type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorHum)" name="湿度" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Environment;
