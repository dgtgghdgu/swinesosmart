import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, Shield, Eye, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role: UserRole) => {
    login(role);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-brand-600 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <Sprout className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">智慧猪场 Pro</h1>
          <p className="text-brand-100 mt-2 text-sm">生产级全生命周期管理系统</p>
        </div>
        
        <div className="p-8">
          <p className="text-center text-slate-500 mb-8 text-sm">请选择登录角色以进入系统</p>
          
          <div className="space-y-4">
            <button
              onClick={() => handleLogin(UserRole.ADMIN)}
              className="w-full group relative flex items-center p-4 border border-slate-200 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all duration-200"
            >
              <div className="p-3 bg-slate-100 rounded-lg group-hover:bg-brand-100 transition-colors">
                <Shield className="w-6 h-6 text-slate-600 group-hover:text-brand-600" />
              </div>
              <div className="ml-4 text-left flex-1">
                <h3 className="font-bold text-slate-900">管理员入口</h3>
                <p className="text-xs text-slate-500">全权限控制 • 系统配置 • 设备操作</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-brand-600" />
            </button>

            <button
              onClick={() => handleLogin(UserRole.OPERATOR)}
              className="w-full group relative flex items-center p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
            >
              <div className="p-3 bg-slate-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                <Eye className="w-6 h-6 text-slate-600 group-hover:text-blue-600" />
              </div>
              <div className="ml-4 text-left flex-1">
                <h3 className="font-bold text-slate-900">普通用户入口</h3>
                <p className="text-xs text-slate-500">只读视图 • 数据监控 • 报表查看</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600" />
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">
              接入状态: <span className="text-emerald-500 font-medium">● MQTT 在线</span> | <span className="text-emerald-500 font-medium">● DB 连接正常</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;