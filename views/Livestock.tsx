import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Plus, 
  AlertCircle 
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Pig, HealthStatus, Gender } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Livestock: React.FC = () => {
  const { isAdmin } = useAuth();
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Pig>>({
    tagNumber: '',
    breed: '大白猪',
    gender: Gender.SOW,
    weightKg: 0,
    penLocation: '1号产房',
    healthStatus: HealthStatus.HEALTHY
  });

  const fetchPigs = () => {
    const res = StorageService.getPigs();
    if (res.success && res.data) setPigs(res.data);
  };

  useEffect(() => {
    fetchPigs();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newPig: Pig = {
      id: crypto.randomUUID(),
      birthDate: new Date().toISOString().split('T')[0],
      lastCheckup: new Date().toISOString().split('T')[0],
      ...formData as Pig
    };
    
    StorageService.savePig(newPig);
    setIsModalOpen(false);
    fetchPigs();
    setFormData({ 
      tagNumber: '', breed: '大白猪', gender: Gender.SOW, 
      weightKg: 0, penLocation: '1号产房', healthStatus: HealthStatus.HEALTHY 
    });
  };

  const filteredPigs = pigs.filter(pig => {
    const matchesSearch = pig.tagNumber.toLowerCase().includes(filter.toLowerCase()) || 
                          pig.penLocation.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter === 'All' || pig.healthStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: HealthStatus) => {
    switch (status) {
      case HealthStatus.HEALTHY: return 'bg-green-100 text-green-700';
      case HealthStatus.SICK: return 'bg-red-100 text-red-700';
      case HealthStatus.QUARANTINE: return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">猪只档案管理</h2>
          <p className="text-slate-500 text-sm">存栏盘点、转群记录与生物档案</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            新猪入栏
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="搜索耳号、品种或栏位..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">全部状态</option>
            {Object.values(HealthStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">耳号 ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">基本信息</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">位置</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">体重</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">健康状态</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPigs.map((pig) => (
                <tr key={pig.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono font-medium text-slate-900">{pig.tagNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">{pig.breed}</span>
                      <span className="text-xs text-slate-500">{pig.gender} • {pig.birthDate}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{pig.penLocation}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">{pig.weightKg} kg</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pig.healthStatus)}`}>
                      {pig.healthStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isAdmin && (
                      <button className="text-slate-400 hover:text-brand-600 p-1">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPigs.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>未找到匹配记录</p>
          </div>
        )}
      </div>

      {/* Simple Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">登记新猪只</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">耳号</label>
                <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={formData.tagNumber} onChange={e => setFormData({...formData, tagNumber: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">品种</label>
                  <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={formData.breed} onChange={e => setFormData({...formData, breed: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">体重 (kg)</label>
                   <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={formData.weightKg} onChange={e => setFormData({...formData, weightKg: Number(e.target.value)})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">保存记录</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Livestock;
