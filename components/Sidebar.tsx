
import React, { useState } from 'react';
import { UserRole } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  Wrench, 
  Banknote, 
  Settings, 
  Car,
  BookOpen,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  FileText,
  Package
} from 'lucide-react';

interface SidebarProps {
  role: UserRole;
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, currentRoute, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.ENGINEER] },
    { id: 'chat', label: 'Чат', icon: MessageCircle, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.ENGINEER] },
    { id: 'tasks', label: 'Заявки', icon: Wrench, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.ENGINEER] },
    { id: 'clients', label: 'Клиенты', icon: Briefcase, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: 'service', label: 'Обслуживание', icon: Car, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: 'warehouse', label: 'Склад', icon: Package, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.ENGINEER] },
    { id: 'documents_list', label: 'Документооборот', icon: FileText, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: 'finance', label: 'Финансы', icon: Banknote, roles: [UserRole.ADMIN] },
    { id: 'employees', label: 'Сотрудники', icon: Users, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: 'docs', label: 'Архитектура', icon: BookOpen, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.ENGINEER] },
    { id: 'settings', label: 'Настройки', icon: Settings, roles: [UserRole.ADMIN] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <aside className={`hidden md:flex flex-col h-full glass-panel border-r-0 border-white/40 m-4 rounded-3xl shadow-glass z-20 transition-all duration-300 relative select-none ${isCollapsed ? 'w-24' : 'w-72'}`}>
      
      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-full p-1 shadow-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 z-50 transition-colors cursor-pointer"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className={`p-8 border-b border-white/20 flex ${isCollapsed ? 'justify-center px-2' : 'items-center gap-3'}`}>
        <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Wrench className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && <span className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white animate-in fade-in duration-200">ServiceCRM</span>}
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6 px-4">
        <ul className="space-y-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl transition-all duration-300 group cursor-pointer ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/40' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10 hover:text-blue-600 dark:hover:text-blue-400'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                >
                  <Icon size={20} className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  {!isCollapsed && <span className="font-semibold truncate">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={`p-6 border-t border-white/20 text-xs text-slate-500 dark:text-slate-400 text-center font-medium ${isCollapsed ? 'hidden' : 'block'}`}>
        <div className="bg-white/30 dark:bg-black/20 rounded-xl py-2 backdrop-blur-sm">
          Liquid Glass v2.1
        </div>
      </div>
    </aside>
  );
};
