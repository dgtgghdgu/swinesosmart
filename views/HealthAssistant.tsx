import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  AlertOctagon, 
  CheckCircle2, 
  Thermometer, 
  Loader2 
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { Pig, AiVetDiagnosis } from '../types';

const HealthAssistant: React.FC = () => {
  const [selectedPigId, setSelectedPigId] = useState<string>('');
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<AiVetDiagnosis | null>(null);

  useEffect(() => {
    const res = StorageService.getPigs();
    if (res.success && res.data) setPigs(res.data);
  }, []);

  const handleAnalyze = async () => {
    if (!selectedPigId || !symptoms) return;

    setLoading(true);
    setDiagnosis(null);
    
    const pig = pigs.find(p => p.id === selectedPigId);
    if (pig) {
      const result = await GeminiService.analyzeHealth(symptoms, pig);
      setDiagnosis(result);
    }
    setLoading(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case '危急': return 'bg-red-600 text-white';
      case '高': return 'bg-orange-500 text-white';
      case '中': return 'bg-yellow-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-brand-900 to-brand-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
            <Bot className="w-8 h-8 text-brand-200" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI 兽医助手</h1>
            <p className="text-brand-100">基于 Gemini 2.5 Flash 大模型 • 实时病情诊断支持</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-brand-600" />
              病例详情
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">选择猪只</label>
                <select 
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  value={selectedPigId}
                  onChange={(e) => setSelectedPigId(e.target.value)}
                >
                  <option value="">-- 选择耳号 --</option>
                  {pigs.map(p => (
                    <option key={p.id} value={p.id}>{p.tagNumber} ({p.breed})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">症状描述</label>
                <textarea 
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none min-h-[120px]"
                  placeholder="请详细描述行为、食欲、体征 (如咳嗽、体表变色、跛行等)..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>

              <button 
                onClick={handleAnalyze}
                disabled={loading || !selectedPigId || !symptoms}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? 'AI 分析中...' : '开始诊断'}
              </button>
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="lg:col-span-2">
          {diagnosis ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-900 text-lg">诊断报告</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getSeverityColor(diagnosis.severity)}`}>
                  {diagnosis.severity} 严重程度
                </span>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">可能诊断</h4>
                  <p className="text-xl font-medium text-slate-900">{diagnosis.diagnosis}</p>
                  <div className="mt-2 w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-brand-500 h-2 rounded-full transition-all duration-1000" 
                      style={{ width: `${diagnosis.confidence}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-right text-slate-400 mt-1">{diagnosis.confidence}% 匹配度</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    建议措施
                  </h4>
                  <ul className="space-y-2">
                    {diagnosis.recommendedActions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-blue-900">
                        <span className="mt-1.5 w-1 h-1 bg-blue-400 rounded-full flex-shrink-0"></span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>

                {diagnosis.requiresIsolation && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 text-red-800 rounded-lg border border-red-100">
                    <AlertOctagon className="w-6 h-6 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-sm">必须隔离</p>
                      <p className="text-xs mt-0.5">请立即隔离该猪只以防止猪群交叉感染。</p>
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">饲养调整建议</h4>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {diagnosis.dietaryAdjustments}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Bot className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-center font-medium">请选择猪只并描述症状<br/>以获取 AI 辅助兽医建议。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthAssistant;
