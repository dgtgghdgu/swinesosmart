import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PawPrint, 
  Stethoscope, 
  Activity, 
  Menu, 
  X,
  Sprout,
  Cpu,
  Zap,
  LogOut,
  Settings,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { name: '综合驾驶舱', path: '/', icon: LayoutDashboard },
    { name: '环境监控', path: '/environment', icon: Activity },
    { name: '设备智控', path: '/devices', icon: Cpu },
    { name: '能耗管理', path: '/energy', icon: Zap },
    { name: '猪只档案', path: '/livestock', icon: PawPrint },
    { name: 'AI 兽医', path: '/vet', icon: Stethoscope },
  ];

  if (isAdmin) {
    navItems.push({ name: '系统配置', path: '/settings', icon: Settings });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-brand-800 text-white p-4 flex justify-between items-center shadow-md z-20 sticky top-0">
        <div className="flex items-center gap-2">
          <Sprout className="w-6 h-6 text-brand-500" />
          <span className="font-bold text-lg">智慧猪场 Pro</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-10 w-64 bg-slate-900 text-slate-100 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 shadow-xl flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-brand-600 p-2 rounded-lg">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">智慧猪场</h1>
            <p className="text-xs text-slate-400">Pro 生产管理系统</p>
          </div>
        </div>

        {/* User Profile Snippet */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-850/50">
          <div className="flex items-center gap-3">
            <img 
              src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=guest"} 
              alt="User" 
              className="w-10 h-10 rounded-full border-2 border-slate-700"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                <p className="text-xs text-slate-400">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="mt-4 px-4 space-y-2 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${isActive(item.path) 
                  ? 'bg-brand-700 text-white shadow-lg shadow-brand-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="bg-slate-800 rounded-lg p-3">
             <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">系统连接</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
             </div>
             <div className="text-xs text-slate-400 space-y-1 font-mono">
                <div className="flex justify-between"><span>MQTT:</span> <span className="text-emerald-400">CONNECTED</span></div>
                <div className="flex justify-between"><span>DB:</span> <span className="text-emerald-400">READY</span></div>
             </div>
          </div>

          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> 退出登录
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto overflow-x-hidden bg-slate-50">
        <div className="max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-0 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Layout;