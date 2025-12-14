import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Zap, Droplets, Download } from 'lucide-react';

const energyData = [
  { name: '00:00', electricity: 12, water: 5 },
  { name: '04:00', electricity: 10, water: 4 },
  { name: '08:00', electricity: 45, water: 20 },
  { name: '12:00', electricity: 55, water: 35 },
  { name: '16:00', electricity: 50, water: 30 },
  { name: '20:00', electricity: 35, water: 25 },
  { name: '23:59', electricity: 20, water: 10 },
];

const breakdownData = [
  { name: '风机系统', value: 45, color: '#3b82f6' },
  { name: '温控/地暖', value: 30, color: '#ef4444' },
  { name: '饲喂系统', value: 15, color: '#f59e0b' },
  { name: '照明及其他', value: 10, color: '#64748b' },
];

const Energy: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">能耗与水耗统计</h2>
          <p className="text-sm text-slate-500">资源使用效率分析与报表</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Download className="w-4 h-4" /> 导出报表 (Excel)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-amber-100 rounded-lg"><Zap className="w-5 h-5 text-amber-600"/></div>
             <div>
               <p className="text-sm text-slate-500">今日总用电</p>
               <h3 className="text-2xl font-bold text-slate-900">324.5 kWh</h3>
             </div>
           </div>
           <div className="w-full bg-slate-100 rounded-full h-2">
             <div className="bg-amber-500 h-2 rounded-full" style={{width: '65%'}}></div>
           </div>
           <p className="text-xs text-slate-500 mt-2 text-right">占预计定额 65%</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-blue-100 rounded-lg"><Droplets className="w-5 h-5 text-blue-600"/></div>
             <div>
               <p className="text-sm text-slate-500">今日总用水</p>
               <h3 className="text-2xl font-bold text-slate-900">12.8 m³</h3>
             </div>
           </div>
           <div className="w-full bg-slate-100 rounded-full h-2">
             <div className="bg-blue-500 h-2 rounded-full" style={{width: '40%'}}></div>
           </div>
           <p className="text-xs text-slate-500 mt-2 text-right">占预计定额 40%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-6">24小时消耗曲线</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={energyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis yAxisId="left" orientation="left" stroke="#f59e0b" />
                <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar yAxisId="left" dataKey="electricity" name="用电 (kWh)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="water" name="用水 (m³)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-6">用电分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {breakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {breakdownData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                 <div className="flex items-center gap-2">
                   <span className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></span>
                   <span className="text-slate-600">{item.name}</span>
                 </div>
                 <span className="font-medium text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Energy;
