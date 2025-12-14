import React, { useEffect, useState } from 'react';
import { 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Droplets,
  Zap,
  Wind
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { TelemetryService } from '../services/telemetryService';
import { Pig, HealthStatus, EnvironmentData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

const StatCard = ({ title, value, subtext, icon: Icon, trend, alert, colorClass }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg ${colorClass ? colorClass : (alert ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600')}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm">
      {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />}
      {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />}
      <span className="text-slate-600">{subtext}</span>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [envData, setEnvData] = useState<EnvironmentData | null>(null);
  
  useEffect(() => {
    // Load Pig Data
    const response = StorageService.getPigs();
    if (response.success && response.data) {
      setPigs(response.data);
    }

    // Subscribe to Telemetry (using the first zone/pen for summary)
    const unsubscribe = TelemetryService.subscribeEnv((data) => {
      // Pick the first pen data available
      if (data.length > 0) setEnvData(data[0]);
    });

    return () => unsubscribe();
  }, []);

  // Compute Metrics
  const totalPigs = pigs.length;
  const sickPigs = pigs.filter(p => p.healthStatus === HealthStatus.SICK || p.healthStatus === HealthStatus.QUARANTINE).length;
  const avgWeight = pigs.length > 0 ? Math.round(pigs.reduce((acc, p) => acc + p.weightKg, 0) / pigs.length) : 0;
  
  // Simulated Chart Data (usually would come from API)
  const weightData = [
    { name: '周一', weight: avgWeight - 5 },
    { name: '周二', weight: avgWeight - 4 },
    { name: '周三', weight: avgWeight - 2 },
    { name: '周四', weight: avgWeight },
    { name: '周五', weight: avgWeight + 1 },
    { name: '周六', weight: avgWeight + 2 },
    { name: '周日', weight: avgWeight + 3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">综合驾驶舱</h2>
          <p className="text-sm text-slate-500">全场生产关键指标实时监控</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 text-xs font-medium">
           <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
           系统运行正常
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="存栏总数" 
          value={`${totalPigs} 头`} 
          subtext="本月新增 +4" 
          icon={Users} 
          trend="up" 
        />
        <StatCard 
          title="健康预警" 
          value={`${sickPigs} 例`} 
          subtext="需要立即关注" 
          icon={AlertTriangle} 
          alert={sickPigs > 0}
        />
        <StatCard 
          title="实时均温 (1号舍)" 
          value={envData ? `${envData.temperature}°C` : '--'} 
          subtext={envData ? `湿度 ${envData.humidity}%` : '--'} 
          icon={Wind} 
          colorClass="bg-blue-50 text-blue-600"
        />
         <StatCard 
          title="今日能耗" 
          value="124 kWh" 
          subtext="较昨日下降 5%" 
          icon={Zap} 
          trend="down"
          colorClass="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Environment Quick View */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-slate-900">周体重增长趋势</h3>
            <select className="text-sm border-slate-200 border rounded-lg p-1 text-slate-600">
              <option>全场平均</option>
              <option>保育舍</option>
              <option>育肥舍</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} unit="kg" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="weight" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Status Summary */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">关键设备状态</h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg"><Wind className="w-4 h-4"/></div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">主风机组</p>
                    <p className="text-xs text-slate-500">运行中 • 负载 80%</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
             </div>
             <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Droplets className="w-4 h-4"/></div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">循环水泵</p>
                    <p className="text-xs text-slate-500">运行中 • 压力正常</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
             </div>
             <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 text-slate-600 rounded-lg"><Package className="w-4 h-4"/></div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">自动料线</p>
                    <p className="text-xs text-slate-500">待机中 • 定时: 14:00</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
             </div>
          </div>
          <button className="w-full mt-6 py-2 text-sm text-brand-600 font-medium border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors">
            查看所有设备
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
