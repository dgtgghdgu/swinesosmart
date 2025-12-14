import React, { useState, useEffect } from 'react';
import { 
  Save, 
  RotateCcw, 
  History, 
  LayoutGrid,
  Cpu,
  Plus,
  Trash2,
  AlertTriangle,
  Check,
  ChevronRight,
  Thermometer,
  Ruler,
  Users,
  Copy,
  ArrowRightLeft,
  Database,
  Link as LinkIcon,
  Unlink
} from 'lucide-react';
import { ConfigService } from '../services/configService';
import { 
  ConfigVersion, SystemConfig, FarmZone, FarmPen, DeviceConfig, 
  ZoneType, DeviceType, DeviceControlMode, FeedTower
} from '../types';
import { useAuth } from '../contexts/AuthContext';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'structure' | 'devices' | 'towers' | 'history'>('structure');
  
  // Local Working Copy (Draft)
  const [config, setConfig] = useState<SystemConfig | null>(null);
  
  // History State
  const [history, setHistory] = useState<ConfigVersion[]>([]);
  
  // UI State
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedPenId, setSelectedPenId] = useState<string>('');
  const [saveDescription, setSaveDescription] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Copy Feature State (Pens Attributes)
  const [copySourcePen, setCopySourcePen] = useState<FarmPen | null>(null);
  const [targetPenIds, setTargetPenIds] = useState<Set<string>>(new Set());

  // Copy Feature State (Devices Single)
  const [copySourceDevice, setCopySourceDevice] = useState<DeviceConfig | null>(null);
  const [targetDeviceIds, setTargetDeviceIds] = useState<Set<string>>(new Set());

  // Copy Feature State (Clone Whole Pen Devices)
  const [deviceCloneSourcePen, setDeviceCloneSourcePen] = useState<FarmPen | null>(null);

  // Tower Management State
  const [activeTowerId, setActiveTowerId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentConfig();
    loadHistory();
  }, []);

  const loadCurrentConfig = () => {
    const current = ConfigService.getCurrentConfig();
    setConfig(current);
    if (current.zones.length > 0) {
      setSelectedZoneId(current.zones[0].id);
    }
  };

  const loadHistory = () => {
    setHistory(ConfigService.getHistory());
  };

  // --- Actions ---

  const handleSave = () => {
    if (!config) return;
    if (!saveDescription.trim()) {
      setMessage({ type: 'error', text: '请输入变更说明以生成审计记录' });
      return;
    }

    const saved = ConfigService.saveConfig(config, user?.name || 'Unknown', saveDescription);
    if (saved) {
      setMessage({ type: 'success', text: '系统配置已更新并生效' });
      setSaveDescription('');
      setShowSaveModal(false);
      loadHistory();
      
      // Auto hide success message
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: '保存失败' });
    }
  };

  const handleRollback = (version: ConfigVersion) => {
    if (window.confirm(`⚠️ 警告：确定要回滚到 ${new Date(version.timestamp).toLocaleString()} 的版本吗？\n\n这将覆盖当前的所有未保存更改。`)) {
      ConfigService.rollback(version, user?.name || 'Unknown');
      loadCurrentConfig();
      loadHistory();
      setMessage({ type: 'success', text: `已回滚至版本: ${version.description}` });
      setActiveTab('structure');
    }
  };

  const handlePenCopySubmit = () => {
    if (!copySourcePen || !config) return;
    
    updateConfig(prev => ({
      ...prev,
      pens: prev.pens.map(p => {
        if (targetPenIds.has(p.id)) {
          return {
            ...p,
            area: copySourcePen.area,
            capacity: copySourcePen.capacity,
            targetTemp: copySourcePen.targetTemp
          };
        }
        return p;
      })
    }));
    
    setMessage({ type: 'success', text: `已成功将属性复制到 ${targetPenIds.size} 个圈舍` });
    setCopySourcePen(null);
    setTargetPenIds(new Set());
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeviceCopySubmit = () => {
    if (!copySourceDevice || !config) return;
    
    updateConfig(prev => ({
      ...prev,
      devices: prev.devices.map(d => {
        if (targetDeviceIds.has(d.id)) {
          return {
            ...d,
            type: copySourceDevice.type,
            controlMode: copySourceDevice.controlMode,
            powerRating: copySourceDevice.powerRating
            // Note: We do NOT copy 'name' as device names should be unique/specific
          };
        }
        return d;
      })
    }));
    
    setMessage({ type: 'success', text: `已成功将配置应用到 ${targetDeviceIds.size} 个设备` });
    setCopySourceDevice(null);
    setTargetDeviceIds(new Set());
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePenDeviceCloneSubmit = () => {
    if (!deviceCloneSourcePen || !config) return;

    // 1. Get source devices (Template)
    const templateDevices = config.devices.filter(d => d.penId === deviceCloneSourcePen.id);

    if (templateDevices.length === 0) {
      setMessage({ type: 'error', text: '源圈舍没有设备可复制' });
      return;
    }

    // 2. Filter out devices currently in target pens (Wipe targets)
    // We keep devices that belong to pens NOT in the target list
    let remainingDevices = config.devices.filter(d => !targetPenIds.has(d.penId));

    // 3. Generate new devices for each target pen
    const newDevices: DeviceConfig[] = [];
    
    targetPenIds.forEach(targetPenId => {
      templateDevices.forEach(tmpl => {
        newDevices.push({
          ...tmpl,
          id: `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate new unique ID
          penId: targetPenId, // Reassign to target
          name: tmpl.name // Keep the same name structure
        });
      });
    });

    // 4. Update config
    updateConfig(prev => ({
      ...prev,
      devices: [...remainingDevices, ...newDevices]
    }));

    setMessage({ type: 'success', text: `已将 ${templateDevices.length} 个设备配置克隆到 ${targetPenIds.size} 个圈舍` });
    setDeviceCloneSourcePen(null);
    setTargetPenIds(new Set());
    setTimeout(() => setMessage(null), 3000);
  };

  // --- Tower Logic ---
  
  const handleTowerDrop = (e: React.DragEvent, towerId: string) => {
    e.preventDefault();
    const penId = e.dataTransfer.getData('text/plain');
    if (!penId || !config) return;

    // Remove pen from any other tower first (Exclusive linkage logic)
    const updatedTowers = config.feedTowers.map(t => ({
      ...t,
      linkedPenIds: t.linkedPenIds.filter(id => id !== penId)
    }));

    // Add to target tower
    const targetTower = updatedTowers.find(t => t.id === towerId);
    if (targetTower && !targetTower.linkedPenIds.includes(penId)) {
      targetTower.linkedPenIds.push(penId);
      updateConfig(prev => ({
        ...prev,
        feedTowers: updatedTowers
      }));
      // Visual feedback handled by React update
    }
  };

  const handlePenClickAssign = (penId: string) => {
    if (!activeTowerId || !config) return;
    
    const isCurrentlyLinked = config.feedTowers.find(t => t.id === activeTowerId)?.linkedPenIds.includes(penId);

    if (isCurrentlyLinked) {
      // Unlink
      updateConfig(prev => ({
        ...prev,
        feedTowers: prev.feedTowers.map(t => 
          t.id === activeTowerId 
            ? { ...t, linkedPenIds: t.linkedPenIds.filter(id => id !== penId) }
            : t
        )
      }));
    } else {
      // Link (and unlink from others)
      updateConfig(prev => ({
        ...prev,
        feedTowers: prev.feedTowers.map(t => {
          if (t.id === activeTowerId) {
            return { ...t, linkedPenIds: [...t.linkedPenIds, penId] };
          } else {
            return { ...t, linkedPenIds: t.linkedPenIds.filter(id => id !== penId) };
          }
        })
      }));
    }
  };


  // --- Helper Functions for State Updates ---
  
  const updateConfig = (updater: (prev: SystemConfig) => SystemConfig) => {
    setConfig(prev => prev ? updater({...prev}) : null);
  };

  // --- Renderers ---

  if (!config) return <div className="p-8 text-center text-slate-500">正在加载配置...</div>;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">系统配置管理</h2>
          <p className="text-sm text-slate-500">可视化调整场区结构与设备参数</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('structure')}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'structure' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> 区域与环境
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'devices' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Cpu className="w-4 h-4" /> 设备资产
          </button>
          <button
            onClick={() => setActiveTab('towers')}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'towers' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Database className="w-4 h-4" /> 料塔供料
          </button>
          <button
             onClick={() => setActiveTab('history')}
             className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'history' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" /> 版本历史
          </button>
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-fade-in ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* --- TAB 1: STRUCTURE (ZONES & PENS) --- */}
      {activeTab === 'structure' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Zone List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-bold text-slate-700">功能区域 (栋舍)</h3>
              <button 
                onClick={() => {
                  const newId = `z_${Date.now()}`;
                  updateConfig(prev => ({
                    ...prev,
                    zones: [...prev.zones, { id: newId, name: '新区域', type: ZoneType.FATTENING }]
                  }));
                  setSelectedZoneId(newId);
                }}
                className="text-xs flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-50"
              >
                <Plus className="w-3 h-3" /> 新增
              </button>
            </div>
            
            <div className="space-y-3">
              {config.zones.map(zone => (
                <div 
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedZoneId === zone.id 
                      ? 'bg-white border-brand-500 shadow-md ring-1 ring-brand-500' 
                      : 'bg-white border-slate-200 hover:border-brand-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase text-slate-400">{zone.id}</span>
                    {config.zones.length > 1 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('删除区域将同时删除其下的圈舍和设备，确定继续吗？')) {
                            updateConfig(prev => ({
                              ...prev,
                              zones: prev.zones.filter(z => z.id !== zone.id),
                              pens: prev.pens.filter(p => p.zoneId !== zone.id),
                              devices: prev.devices.filter(d => {
                                const pen = prev.pens.find(p => p.id === d.penId);
                                return pen?.zoneId !== zone.id; // Keep devices not in this zone
                              })
                            }));
                            if (selectedZoneId === zone.id) setSelectedZoneId(config.zones[0]?.id || '');
                          }
                        }}
                        className="text-slate-300 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      value={zone.name}
                      onChange={(e) => updateConfig(prev => ({
                        ...prev,
                        zones: prev.zones.map(z => z.id === zone.id ? { ...z, name: e.target.value } : z)
                      }))}
                      className="w-full font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none bg-transparent"
                    />
                    <select 
                      value={zone.type}
                      onChange={(e) => updateConfig(prev => ({
                        ...prev,
                        zones: prev.zones.map(z => z.id === zone.id ? { ...z, type: e.target.value as ZoneType } : z)
                      }))}
                      className="w-full text-sm text-slate-600 bg-slate-50 rounded p-1 border border-transparent hover:border-slate-300"
                    >
                      {Object.values(ZoneType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Pen List for Selected Zone */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-slate-500" />
                {config.zones.find(z => z.id === selectedZoneId)?.name || '未选择区域'} - 圈舍管理
              </h3>
              <button 
                onClick={() => {
                   if (!selectedZoneId) return;
                   const newId = `p_${Date.now()}`;
                   updateConfig(prev => ({
                     ...prev,
                     pens: [...prev.pens, { 
                       id: newId, 
                       name: '新圈舍', 
                       zoneId: selectedZoneId, 
                       targetTemp: 22,
                       area: 100,
                       capacity: 50
                     }]
                   }));
                }}
                disabled={!selectedZoneId}
                className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> 新增圈舍
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto min-h-[400px]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-semibold text-slate-500 border-b border-slate-100">
                      <th className="px-4 py-3 min-w-[80px]">圈舍 ID</th>
                      <th className="px-4 py-3 min-w-[120px]">圈舍名称</th>
                      <th className="px-4 py-3 min-w-[80px]">面积 (m²)</th>
                      <th className="px-4 py-3 min-w-[80px]">容量 (头)</th>
                      <th className="px-4 py-3 min-w-[100px]">目标温度</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {config.pens.filter(p => p.zoneId === selectedZoneId).map(pen => (
                      <tr key={pen.id} className="hover:bg-slate-50 group">
                        <td className="px-4 py-3 text-xs font-mono text-slate-400">{pen.id}</td>
                        <td className="px-4 py-3">
                          <input 
                            type="text"
                            value={pen.name}
                            onChange={(e) => updateConfig(prev => ({
                              ...prev,
                              pens: prev.pens.map(p => p.id === pen.id ? { ...p, name: e.target.value } : p)
                            }))}
                            className="w-full bg-transparent border border-transparent hover:border-slate-300 rounded px-2 py-1 focus:border-brand-500 focus:outline-none"
                          />
                        </td>
                         <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Ruler className="w-3 h-3 text-slate-400" />
                            <input 
                              type="number"
                              value={pen.area || 0}
                              onChange={(e) => updateConfig(prev => ({
                                ...prev,
                                pens: prev.pens.map(p => p.id === pen.id ? { ...p, area: Number(e.target.value) } : p)
                              }))}
                              className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center focus:border-brand-500 focus:outline-none font-mono text-sm"
                            />
                          </div>
                        </td>
                         <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3 text-slate-400" />
                            <input 
                              type="number"
                              value={pen.capacity || 0}
                              onChange={(e) => updateConfig(prev => ({
                                ...prev,
                                pens: prev.pens.map(p => p.id === pen.id ? { ...p, capacity: Number(e.target.value) } : p)
                              }))}
                              className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center focus:border-brand-500 focus:outline-none font-mono text-sm"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Thermometer className="w-3 h-3 text-slate-400" />
                            <input 
                              type="number"
                              value={pen.targetTemp}
                              onChange={(e) => updateConfig(prev => ({
                                ...prev,
                                pens: prev.pens.map(p => p.id === pen.id ? { ...p, targetTemp: Number(e.target.value) } : p)
                              }))}
                              className="w-14 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center focus:border-brand-500 focus:outline-none font-mono text-sm"
                            />
                            <span className="text-xs text-slate-400">°C</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setCopySourcePen(pen);
                                setTargetPenIds(new Set());
                              }}
                              className="p-1.5 text-slate-300 hover:text-brand-600 hover:bg-brand-50 rounded"
                              title="复制圈舍属性(面积/容量/温度)"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                setDeviceCloneSourcePen(pen);
                                setTargetPenIds(new Set());
                              }}
                              className="p-1.5 text-slate-300 hover:text-purple-600 hover:bg-purple-50 rounded"
                              title="克隆整舍设备配置"
                            >
                              <Cpu className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm('删除圈舍将同时删除其下的所有设备，确定吗？')) {
                                  updateConfig(prev => ({
                                    ...prev,
                                    pens: prev.pens.filter(p => p.id !== pen.id),
                                    devices: prev.devices.filter(d => d.penId !== pen.id)
                                  }));
                                }
                              }}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {config.pens.filter(p => p.zoneId === selectedZoneId).length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                          该区域下暂无圈舍，请点击上方“新增”按钮
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: DEVICES --- */}
      {activeTab === 'devices' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
          {/* Navigation Tree */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-sm">
              位置筛选
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {config.zones.map(zone => (
                <div key={zone.id}>
                  <div className="px-2 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <LayoutGrid className="w-3 h-3" /> {zone.name}
                  </div>
                  <div className="pl-2 space-y-0.5 border-l-2 border-slate-100 ml-3">
                    {config.pens.filter(p => p.zoneId === zone.id).map(pen => (
                      <button
                        key={pen.id}
                        onClick={() => setSelectedPenId(pen.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group ${
                          selectedPenId === pen.id 
                            ? 'bg-brand-50 text-brand-700 font-medium' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{pen.name}</span>
                        {selectedPenId === pen.id && <ChevronRight className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Device Table */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
             <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-500" />
                设备列表
                {selectedPenId && <span className="text-sm font-normal text-slate-500">
                  ( 位于: {config.pens.find(p => p.id === selectedPenId)?.name} )
                </span>}
              </h3>
              <button 
                onClick={() => {
                   if (!selectedPenId) {
                     alert('请先从左侧选择一个圈舍');
                     return;
                   }
                   const newId = `dev_${Date.now()}`;
                   updateConfig(prev => ({
                     ...prev,
                     devices: [...prev.devices, {
                        id: newId, 
                        name: '新设备', 
                        penId: selectedPenId, 
                        type: DeviceType.FAN_FIXED,
                        controlMode: DeviceControlMode.TOGGLE,
                        powerRating: 1.0
                     }]
                   }));
                }}
                disabled={!selectedPenId}
                className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> 添加设备
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
               {selectedPenId ? (
                 <div className="grid grid-cols-1 gap-4">
                   {config.devices.filter(d => d.penId === selectedPenId).map(device => (
                     <div key={device.id} className="border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start md:items-center bg-slate-50/50 hover:bg-white transition-colors">
                        <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-400">
                          <Cpu className="w-6 h-6" />
                        </div>
                        
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                          <div>
                            <label className="text-[10px] uppercase text-slate-400 font-bold">设备名称</label>
                            <input 
                              type="text" 
                              value={device.name}
                              onChange={(e) => updateConfig(prev => ({
                                ...prev,
                                devices: prev.devices.map(d => d.id === device.id ? { ...d, name: e.target.value } : d)
                              }))}
                              className="w-full text-sm font-medium bg-transparent border-b border-slate-300 focus:border-brand-500 outline-none pb-1"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] uppercase text-slate-400 font-bold">设备类型</label>
                            <select 
                              value={device.type}
                              onChange={(e) => updateConfig(prev => ({
                                ...prev,
                                devices: prev.devices.map(d => d.id === device.id ? { ...d, type: e.target.value as DeviceType } : d)
                              }))}
                              className="w-full text-sm bg-transparent border-b border-slate-300 focus:border-brand-500 outline-none pb-1"
                            >
                              {Object.values(DeviceType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] uppercase text-slate-400 font-bold">控制模式</label>
                            <select 
                              value={device.controlMode}
                              onChange={(e) => updateConfig(prev => ({
                                ...prev,
                                devices: prev.devices.map(d => d.id === device.id ? { ...d, controlMode: e.target.value as DeviceControlMode } : d)
                              }))}
                              className="w-full text-sm bg-transparent border-b border-slate-300 focus:border-brand-500 outline-none pb-1"
                            >
                              <option value={DeviceControlMode.TOGGLE}>开关 (Switch)</option>
                              <option value={DeviceControlMode.RANGE}>调节 (0-100%)</option>
                              <option value={DeviceControlMode.READ_ONLY}>仅读取 (Sensor)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] uppercase text-slate-400 font-bold">额定功率 (kW)</label>
                            <input 
                              type="number" 
                              step="0.1"
                              value={device.powerRating}
                              onChange={(e) => updateConfig(prev => ({
                                ...prev,
                                devices: prev.devices.map(d => d.id === device.id ? { ...d, powerRating: Number(e.target.value) } : d)
                              }))}
                              className="w-full text-sm font-mono bg-transparent border-b border-slate-300 focus:border-brand-500 outline-none pb-1"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => {
                              setCopySourceDevice(device);
                              setTargetDeviceIds(new Set());
                            }}
                            className="p-2 text-slate-300 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="复制设备配置"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => updateConfig(prev => ({
                              ...prev,
                              devices: prev.devices.filter(d => d.id !== device.id)
                            }))}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除设备"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                     </div>
                   ))}
                   {config.devices.filter(d => d.penId === selectedPenId).length === 0 && (
                     <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                       暂无设备，请点击上方“添加设备”
                     </div>
                   )}
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <LayoutGrid className="w-12 h-12 mb-2 opacity-20" />
                    <p>请从左侧列表选择一个圈舍以管理设备</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: FEED TOWERS --- */}
      {activeTab === 'towers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
          {/* Left: Towers Management (Drop Zone) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-500" />
                料塔配置
              </h3>
              <button 
                onClick={() => {
                   const newId = `t_${Date.now()}`;
                   updateConfig(prev => ({
                     ...prev,
                     feedTowers: [...prev.feedTowers, {
                        id: newId, 
                        name: '新料塔', 
                        maxCapacity: 10000, 
                        currentWeight: 0, 
                        linkedPenIds: []
                     }]
                   }));
                }}
                className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> 新增料塔
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
              {config.feedTowers.map(tower => {
                const fillPercentage = Math.min(100, Math.max(0, (tower.currentWeight / tower.maxCapacity) * 100)) || 0;
                
                return (
                  <div 
                    key={tower.id}
                    onClick={() => setActiveTowerId(tower.id === activeTowerId ? null : tower.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleTowerDrop(e, tower.id)}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all cursor-pointer group
                      ${activeTowerId === tower.id ? 'border-brand-500 bg-brand-50 shadow-md ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-brand-200'}
                    `}
                  >
                    <div className="flex justify-between items-start mb-3 relative z-10">
                      <div className="flex items-center gap-3">
                         <div className={`p-2.5 rounded-lg ${activeTowerId === tower.id ? 'bg-brand-200 text-brand-800' : 'bg-slate-100 text-slate-500'}`}>
                           <Database className="w-6 h-6" />
                         </div>
                         <div>
                            <input 
                              type="text" 
                              value={tower.name}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateConfig(prev => ({
                                ...prev,
                                feedTowers: prev.feedTowers.map(t => t.id === tower.id ? { ...t, name: e.target.value } : t)
                              }))}
                              className="font-bold text-slate-900 bg-transparent border-b border-transparent focus:border-brand-500 outline-none w-32"
                            />
                            <p className="text-xs text-slate-500 mt-0.5">
                               ID: <span className="font-mono">{tower.id}</span>
                            </p>
                         </div>
                      </div>
                      <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           if (window.confirm('确定删除此料塔吗？')) {
                              updateConfig(prev => ({
                                ...prev,
                                feedTowers: prev.feedTowers.filter(t => t.id !== tower.id)
                              }));
                              if (activeTowerId === tower.id) setActiveTowerId(null);
                           }
                         }}
                         className="text-slate-300 hover:text-red-500 p-1"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                      <div>
                         <label className="text-[10px] font-bold text-slate-400 uppercase">当前重量 (kg)</label>
                         <input 
                              type="number" 
                              value={tower.currentWeight}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateConfig(prev => ({
                                ...prev,
                                feedTowers: prev.feedTowers.map(t => t.id === tower.id ? { ...t, currentWeight: Number(e.target.value) } : t)
                              }))}
                              className="w-full text-sm font-mono font-medium bg-transparent border-b border-slate-300 focus:border-brand-500 outline-none"
                          />
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-slate-400 uppercase">最大容量 (kg)</label>
                         <input 
                              type="number" 
                              value={tower.maxCapacity}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateConfig(prev => ({
                                ...prev,
                                feedTowers: prev.feedTowers.map(t => t.id === tower.id ? { ...t, maxCapacity: Number(e.target.value) } : t)
                              }))}
                              className="w-full text-sm font-mono font-medium bg-transparent border-b border-slate-300 focus:border-brand-500 outline-none"
                          />
                      </div>
                    </div>

                    {/* Progress Bar Visual */}
                    <div className="mt-4 pt-4 border-t border-slate-200/50 relative z-10">
                       <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500 font-medium">余料 {fillPercentage.toFixed(1)}%</span>
                          <span className="text-slate-400">{tower.linkedPenIds.length} 个供料点</span>
                       </div>
                       <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                             className={`h-full rounded-full transition-all duration-500 ${fillPercentage < 20 ? 'bg-red-500' : 'bg-brand-500'}`}
                             style={{ width: `${fillPercentage}%` }}
                          ></div>
                       </div>
                    </div>

                    {/* Drag Hint Overlay */}
                    <div className="absolute inset-0 bg-brand-50/80 border-2 border-dashed border-brand-400 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-10 pointer-events-none z-0">
                       <span className="text-brand-700 font-bold">拖拽圈舍到此处</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Map / Pen Draggables */}
          <div className="lg:col-span-2 bg-slate-50 rounded-xl border border-slate-200 shadow-inner p-4 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">圈舍分布图 (拖拽圈舍以分配)</h3>
              {activeTowerId && (
                <div className="text-xs bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200 text-brand-600 font-medium animate-pulse">
                   正在配置: {config.feedTowers.find(t => t.id === activeTowerId)?.name} (点击圈舍亦可快速分配)
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {config.zones.map(zone => (
                <div key={zone.id} className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                     <LayoutGrid className="w-4 h-4" /> {zone.name}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     {config.pens.filter(p => p.zoneId === zone.id).map(pen => {
                       // Find if this pen is linked to any tower
                       const linkedTower = config.feedTowers.find(t => t.linkedPenIds.includes(pen.id));
                       const isLinkedToActive = activeTowerId && linkedTower?.id === activeTowerId;
                       
                       return (
                         <div
                           key={pen.id}
                           draggable
                           onDragStart={(e) => {
                             e.dataTransfer.setData('text/plain', pen.id);
                             e.dataTransfer.effectAllowed = 'link';
                           }}
                           onClick={() => handlePenClickAssign(pen.id)}
                           className={`
                             p-3 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing transition-all relative overflow-hidden
                             ${isLinkedToActive 
                                ? 'bg-brand-50 border-brand-500 ring-2 ring-brand-500' 
                                : linkedTower 
                                  ? 'bg-white border-slate-300 hover:border-slate-400' 
                                  : 'bg-white border-slate-200 border-dashed opacity-80 hover:opacity-100 hover:border-slate-400'
                             }
                           `}
                         >
                            <div className="flex justify-between items-start">
                               <div>
                                  <div className="font-bold text-slate-900 text-sm">{pen.name}</div>
                                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                     <Users className="w-3 h-3" /> {pen.capacity}头
                                  </div>
                               </div>
                               {linkedTower ? (
                                 <div className={`p-1 rounded ${isLinkedToActive ? 'bg-brand-200 text-brand-800' : 'bg-slate-100 text-slate-500'}`} title={`已连接: ${linkedTower.name}`}>
                                   <LinkIcon className="w-3 h-3" />
                                 </div>
                               ) : (
                                 <div className="p-1 rounded text-slate-300">
                                   <Unlink className="w-3 h-3" />
                                 </div>
                               )}
                            </div>
                            
                            {/* Tower Label */}
                            {linkedTower && (
                              <div className={`mt-2 text-[10px] font-mono px-1.5 py-0.5 rounded border truncate ${
                                isLinkedToActive ? 'bg-brand-100 border-brand-200 text-brand-800' : 'bg-slate-50 border-slate-200 text-slate-500'
                              }`}>
                                 {linkedTower.name}
                              </div>
                            )}
                         </div>
                       );
                     })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: HISTORY --- */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">版本时间</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">修改人</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">变更说明</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((version, index) => (
                <tr key={version.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-mono text-sm text-slate-900">
                        {new Date(version.timestamp).toLocaleString()}
                      </span>
                      {index === 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 w-fit mt-1">
                          当前版本
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500 font-bold">
                        {version.author.charAt(0)}
                      </div>
                      {version.author}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700 max-w-md truncate">
                    {version.description}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {index !== 0 && (
                      <button 
                        onClick={() => handleRollback(version)}
                        className="text-brand-600 hover:text-brand-800 text-sm font-medium flex items-center gap-1 ml-auto"
                      >
                        <RotateCcw className="w-3 h-3" /> 回滚
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Action Bar (Always visible for edit tabs) */}
      {(activeTab === 'structure' || activeTab === 'devices' || activeTab === 'towers') && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-50">
          <div className="text-sm">
            <span className="font-bold">配置状态:</span> <span className="text-brand-400">编辑中 (未保存)</span>
          </div>
          <div className="h-4 w-px bg-slate-600"></div>
          <button 
            onClick={() => loadCurrentConfig()} // Reset to disk state
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            重置更改
          </button>
          <button 
            onClick={() => setShowSaveModal(true)}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> 保存并发布
          </button>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">发布系统配置</h3>
              <p className="text-sm text-slate-500 mt-1">请输入本次变更的简要说明以作为系统日志</p>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                className="w-full border border-slate-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="例如: 新增保育舍C区2号温控风机..."
                rows={4}
                autoFocus
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors"
                >
                  确认发布
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

       {/* Copy Pen Config Modal (Area/Capacity) */}
      {copySourcePen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">复制圈舍属性</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    源圈舍: <span className="font-bold text-brand-700">{copySourcePen.name}</span> 
                    <span className="ml-2 px-2 py-0.5 bg-white border border-slate-200 rounded-md text-xs font-mono">
                      {copySourcePen.area}m² | {copySourcePen.capacity}头 | {copySourcePen.targetTemp}°C
                    </span>
                  </p>
                </div>
                <button onClick={() => setCopySourcePen(null)} className="text-slate-400 hover:text-slate-600 p-2">
                   <span className="text-2xl leading-none">&times;</span>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                 <div className="space-y-6">
                   <div className="flex items-start gap-3 mb-2 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm border border-blue-100 shadow-sm">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">警告：</span>
                        勾选的目标圈舍将被覆盖 面积、容量、目标温度 属性。此操作在您点击页面下方的“保存并发布”之前不会永久生效。
                      </div>
                   </div>
                 
                   {config?.zones.map(zone => {
                      const zonePens = config.pens.filter(p => p.zoneId === zone.id && p.id !== copySourcePen.id);
                      if (zonePens.length === 0) return null;
                      
                      const allSelected = zonePens.every(p => targetPenIds.has(p.id));
                      
                      return (
                        <div key={zone.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <LayoutGrid className="w-4 h-4 text-slate-400" />
                              <span className="font-bold text-slate-700">{zone.name}</span>
                              <span className="text-xs text-slate-400 px-2 py-0.5 bg-slate-100 rounded-full">{zonePens.length} 个可用</span>
                            </div>
                            <button 
                              onClick={() => {
                                 const next = new Set(targetPenIds);
                                 if (allSelected) {
                                   zonePens.forEach(p => next.delete(p.id));
                                 } else {
                                   zonePens.forEach(p => next.add(p.id));
                                 }
                                 setTargetPenIds(next);
                              }}
                              className="text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-1 rounded hover:bg-brand-100 transition-colors"
                            >
                              {allSelected ? '取消全选' : '本区全选'}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                            {zonePens.map(pen => {
                              const isSelected = targetPenIds.has(pen.id);
                              return (
                                <div 
                                  key={pen.id}
                                  onClick={() => {
                                     const next = new Set(targetPenIds);
                                     if (isSelected) next.delete(pen.id);
                                     else next.add(pen.id);
                                     setTargetPenIds(next);
                                  }}
                                  className={`
                                    cursor-pointer p-3 rounded-lg border flex items-center gap-3 transition-all
                                    ${isSelected ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500 shadow-sm' : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-sm'}
                                  `}
                                >
                                   <div className={`
                                     w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0
                                     ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-slate-300'}
                                   `}>
                                     {isSelected && <Check className="w-3.5 h-3.5" />}
                                   </div>
                                   <div>
                                     <div className="font-medium text-slate-900 text-sm">{pen.name}</div>
                                     <div className="text-xs text-slate-400 flex gap-2">
                                       <span>{pen.area}m²</span>
                                       <span>{pen.capacity}头</span>
                                     </div>
                                   </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                   })}
                 </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                  <button 
                    onClick={() => setCopySourcePen(null)}
                    className="px-6 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handlePenCopySubmit}
                    disabled={targetPenIds.size === 0}
                    className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    确认覆盖 {targetPenIds.size} 个圈舍
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* Copy Device Config Modal (Single Device) */}
      {copySourceDevice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">复制设备配置</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    源设备: <span className="font-bold text-brand-700">{copySourceDevice.name}</span> 
                    <span className="ml-2 px-2 py-0.5 bg-white border border-slate-200 rounded-md text-xs font-mono">
                      {copySourceDevice.type} | {copySourceDevice.powerRating}kW
                    </span>
                  </p>
                </div>
                <button onClick={() => setCopySourceDevice(null)} className="text-slate-400 hover:text-slate-600 p-2">
                   <span className="text-2xl leading-none">&times;</span>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                 <div className="space-y-6">
                   <div className="flex items-start gap-3 mb-2 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm border border-blue-100 shadow-sm">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">警告：</span>
                        目标设备将被覆盖 <b>类型</b>、<b>控制模式</b> 和 <b>额定功率</b>。设备名称将保持不变。
                      </div>
                   </div>
                 
                   {config?.zones.map(zone => {
                      const zonePens = config.pens.filter(p => p.zoneId === zone.id);
                      // Filter out pens that have no devices or only contain the source device itself
                      const relevantPens = zonePens.filter(pen => {
                         const penDevices = config.devices.filter(d => d.penId === pen.id && d.id !== copySourceDevice.id);
                         return penDevices.length > 0;
                      });
                      
                      if (relevantPens.length === 0) return null;
                      
                      return (
                        <div key={zone.id} className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 px-2">
                            <LayoutGrid className="w-3 h-3" /> {zone.name}
                          </h4>
                          
                          {relevantPens.map(pen => {
                            const penDevices = config.devices.filter(d => d.penId === pen.id && d.id !== copySourceDevice.id);
                            const allSelected = penDevices.every(d => targetDeviceIds.has(d.id));

                            return (
                              <div key={pen.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                  <span className="font-bold text-slate-700 text-sm">{pen.name}</span>
                                  <button 
                                    onClick={() => {
                                      const next = new Set(targetDeviceIds);
                                      if (allSelected) {
                                        penDevices.forEach(d => next.delete(d.id));
                                      } else {
                                        penDevices.forEach(d => next.add(d.id));
                                      }
                                      setTargetDeviceIds(next);
                                    }}
                                    className="text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-1 rounded hover:bg-brand-100 transition-colors"
                                  >
                                    {allSelected ? '取消全选' : '本圈舍全选'}
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                                  {penDevices.map(dev => {
                                    const isSelected = targetDeviceIds.has(dev.id);
                                    return (
                                      <div 
                                        key={dev.id}
                                        onClick={() => {
                                          const next = new Set(targetDeviceIds);
                                          if (isSelected) next.delete(dev.id);
                                          else next.add(dev.id);
                                          setTargetDeviceIds(next);
                                        }}
                                        className={`
                                          cursor-pointer p-3 rounded-lg border flex items-center gap-3 transition-all
                                          ${isSelected ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500 shadow-sm' : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-sm'}
                                        `}
                                      >
                                        <div className={`
                                          w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0
                                          ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-slate-300'}
                                        `}>
                                          {isSelected && <Check className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-slate-900 text-sm truncate">{dev.name}</div>
                                          <div className="text-xs text-slate-400 truncate">{dev.type}</div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                   })}
                 </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                  <button 
                    onClick={() => setCopySourceDevice(null)}
                    className="px-6 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleDeviceCopySubmit}
                    disabled={targetDeviceIds.size === 0}
                    className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    确认应用到 {targetDeviceIds.size} 个设备
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* Clone Pen Devices Modal (Whole Pen Clone) */}
      {deviceCloneSourcePen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-purple-600" />
                    克隆整舍设备配置
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    模板源: <span className="font-bold text-purple-700">{deviceCloneSourcePen.name}</span>
                    <span className="ml-2 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100">
                      包含 {config?.devices.filter(d => d.penId === deviceCloneSourcePen.id).length} 个设备
                    </span>
                  </p>
                </div>
                <button onClick={() => setDeviceCloneSourcePen(null)} className="text-slate-400 hover:text-slate-600 p-2">
                   <span className="text-2xl leading-none">&times;</span>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                 <div className="space-y-6">
                   <div className="flex items-start gap-3 mb-2 p-4 bg-red-50 text-red-800 rounded-xl text-sm border border-red-100 shadow-sm">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">高风险操作警告：</span>
                        <p className="mt-1">此操作将 <span className="font-bold underline">彻底清空</span> 目标圈舍现有的所有设备，并替换为源圈舍设备的克隆副本。</p>
                      </div>
                   </div>

                   {/* Template Preview */}
                   <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">将被复制的设备清单</h4>
                      <div className="flex flex-wrap gap-2">
                         {config?.devices.filter(d => d.penId === deviceCloneSourcePen.id).map(d => (
                           <span key={d.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                             {d.name} ({d.type})
                           </span>
                         ))}
                         {config?.devices.filter(d => d.penId === deviceCloneSourcePen.id).length === 0 && (
                           <span className="text-sm text-slate-400 italic">源圈舍暂无设备</span>
                         )}
                      </div>
                   </div>
                 
                   {/* Target Selection */}
                   {config?.zones.map(zone => {
                      const zonePens = config.pens.filter(p => p.zoneId === zone.id && p.id !== deviceCloneSourcePen.id);
                      if (zonePens.length === 0) return null;
                      
                      const allSelected = zonePens.every(p => targetPenIds.has(p.id));
                      
                      return (
                        <div key={zone.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <LayoutGrid className="w-4 h-4 text-slate-400" />
                              <span className="font-bold text-slate-700">{zone.name}</span>
                              <span className="text-xs text-slate-400 px-2 py-0.5 bg-slate-100 rounded-full">{zonePens.length} 个可用</span>
                            </div>
                            <button 
                              onClick={() => {
                                 const next = new Set(targetPenIds);
                                 if (allSelected) {
                                   zonePens.forEach(p => next.delete(p.id));
                                 } else {
                                   zonePens.forEach(p => next.add(p.id));
                                 }
                                 setTargetPenIds(next);
                              }}
                              className="text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-1 rounded hover:bg-brand-100 transition-colors"
                            >
                              {allSelected ? '取消全选' : '本区全选'}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                            {zonePens.map(pen => {
                              const isSelected = targetPenIds.has(pen.id);
                              // Count existing devices in target to show impact
                              const existingCount = config.devices.filter(d => d.penId === pen.id).length;
                              
                              return (
                                <div 
                                  key={pen.id}
                                  onClick={() => {
                                     const next = new Set(targetPenIds);
                                     if (isSelected) next.delete(pen.id);
                                     else next.add(pen.id);
                                     setTargetPenIds(next);
                                  }}
                                  className={`
                                    cursor-pointer p-3 rounded-lg border flex items-center gap-3 transition-all
                                    ${isSelected ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500 shadow-sm' : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-sm'}
                                  `}
                                >
                                   <div className={`
                                     w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0
                                     ${isSelected ? 'bg-purple-500 border-purple-500 text-white' : 'bg-white border-slate-300'}
                                   `}>
                                     {isSelected && <Check className="w-3.5 h-3.5" />}
                                   </div>
                                   <div className="flex-1">
                                     <div className="font-medium text-slate-900 text-sm">{pen.name}</div>
                                     <div className="text-xs text-slate-400 flex justify-between mt-0.5">
                                        <span>现有设备: {existingCount}</span>
                                        {existingCount > 0 && isSelected && (
                                          <span className="text-red-500 font-bold">将被清空</span>
                                        )}
                                     </div>
                                   </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                   })}
                 </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                  <button 
                    onClick={() => setDeviceCloneSourcePen(null)}
                    className="px-6 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handlePenDeviceCloneSubmit}
                    disabled={targetPenIds.size === 0}
                    className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    覆盖克隆到 {targetPenIds.size} 个圈舍
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;