
import React, { useState } from 'react';
import { User, UserRole, Role, ResourceAction, Permission } from '../types';
import { ROLES } from '../mockData';
import { Shield, Key, UserCheck, Plus, X, Save, Lock, Mail, Users, User as UserIcon, UserPlus, Check, Trash2, Edit, ChevronDown, ChevronRight, Folder, Link as LinkIcon, Copy, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../components/Toast';

interface SettingsPageProps {
  user: User;
  users: User[];
  onUpdateUser: (user: User) => void;
  onResetSystem?: () => Promise<void>;
}

// Hierarchical Resource Definition
interface ResourceNode {
  id: string;
  label: string;
  children?: ResourceNode[];
}

const RESOURCE_TREE: ResourceNode[] = [
  {
    id: 'section_analytics',
    label: 'Аналитика',
    children: [
        { id: 'dashboard', label: 'Базовая аналитика' },
    ]
  },
  {
    id: 'section_clients',
    label: 'Клиенты',
    children: [
        { id: 'clients', label: 'Просмотр и редактирование клиентов' },
        { id: 'clients_export', label: 'Экспорт базы данных' },
    ]
  },
  {
    id: 'section_tasks',
    label: 'Заявки и Работы',
    children: [
        { id: 'tasks', label: 'Работа с заявками' },
        { id: 'tasks_assign', label: 'Назначение исполнителей' },
    ]
  },
  {
    id: 'section_service',
    label: 'Сервис и Оборудование',
    children: [
        { id: 'service', label: 'Управление объектами' },
        { id: 'trackers', label: 'База GPS трекеров' },
        { id: 'service_billing', label: 'Биллинг и начисления' },
    ]
  },
  {
    id: 'section_finance',
    label: 'Финансы и Учет',
    children: [
        { id: 'finance', label: 'Доходы и Расходы' },
        { id: 'salary', label: 'Сотрудники и Зарплата' },
    ]
  },
  {
    id: 'section_system',
    label: 'Настройки системы',
    children: [
        { id: 'settings', label: 'Общие настройки' },
        { id: 'users', label: 'Управление пользователями' },
    ]
  },
];

const ACTIONS: { id: ResourceAction, label: string }[] = [
    { id: 'view', label: 'Просмотр' },
    { id: 'create', label: 'Добавление' },
    { id: 'edit', label: 'Изменение' },
    { id: 'delete', label: 'Удаление' }
];

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, users, onUpdateUser, onResetSystem }) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'security' | 'links' | 'maintenance'>('users');
  
  // Roles State with Persistence
  const [roles, setRoles] = useLocalStorage<Role[]>('crm_roles', ROLES);
  
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  // Expand/Collapse state for sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['section_analytics', 'section_clients']));

  const [roleForm, setRoleForm] = useState<{
      name: string;
      description: string;
      permissions: Record<string, ResourceAction[]>; // resourceId -> actions[]
  }>({ name: '', description: '', permissions: {} });

  // Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Users State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    roleId: ''
  });

  const copyPublicRequestLink = () => {
    const url = `${window.location.origin}/#public-request`;
    navigator.clipboard.writeText(url);
    addToast('Ссылка на форму заявок скопирована', 'success');
  };

  // --- ROLE MANAGEMENT LOGIC ---

  const toggleSection = (sectionId: string) => {
      const newSet = new Set(expandedSections);
      if (newSet.has(sectionId)) {
          newSet.delete(sectionId);
      } else {
          newSet.add(sectionId);
      }
      setExpandedSections(newSet);
  };

  const openRoleModal = (role?: Role) => {
      const allSections = RESOURCE_TREE.map(n => n.id);
      setExpandedSections(new Set(allSections));

      if (role) {
          setEditingRole(role);
          const permsObj: Record<string, ResourceAction[]> = {};
          role.permissions.forEach(p => {
              permsObj[p.resourceId] = p.actions;
          });
          setRoleForm({ name: role.name, description: role.description, permissions: permsObj });
      } else {
          setEditingRole(null);
          setRoleForm({ name: '', description: '', permissions: {} });
      }
      setIsRoleModalOpen(true);
  };

  const togglePermission = (resourceId: string, action: ResourceAction) => {
      setRoleForm(prev => {
          const currentActions = prev.permissions[resourceId] || [];
          let newActions;
          if (currentActions.includes(action)) {
              newActions = currentActions.filter(a => a !== action);
          } else {
              newActions = [...currentActions, action];
          }
          return {
              ...prev,
              permissions: { ...prev.permissions, [resourceId]: newActions }
          };
      });
  };

  const toggleRowPermissions = (resourceId: string) => {
      setRoleForm(prev => {
          const currentActions = prev.permissions[resourceId] || [];
          const isFull = currentActions.length === 4;
          return {
              ...prev,
              permissions: {
                  ...prev.permissions,
                  [resourceId]: isFull ? [] : ['view', 'create', 'edit', 'delete']
              }
          };
      });
  };

  const handleRoleSave = (e: React.FormEvent) => {
      e.preventDefault();
      const permissionsArray: Permission[] = (Object.entries(roleForm.permissions) as [string, ResourceAction[]][])
          .filter(([_, actions]) => actions.length > 0)
          .map(([resourceId, actions]) => ({ resourceId, actions }));

      if (editingRole) {
          setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, name: roleForm.name, description: roleForm.description, permissions: permissionsArray } : r));
          addToast('Роль успешно обновлена', 'success');
      } else {
          const newRole: Role = {
              id: `r_${Date.now()}`,
              name: roleForm.name,
              description: roleForm.description,
              isSystem: false,
              permissions: permissionsArray
          };
          setRoles(prev => [...prev, newRole]);
          addToast('Новая роль создана', 'success');
      }
      setIsRoleModalOpen(false);
  };
  
  const deleteRole = (roleId: string) => {
      if (confirm('Вы уверены, что хотите удалить эту роль?')) {
        setRoles(prev => prev.filter(r => r.id !== roleId));
        addToast('Роль удалена', 'success');
      }
  };

  const handleResetExecute = async () => {
    if (resetConfirmText !== 'ОЧИСТИТЬ') return;
    setIsResetting(true);
    if (onResetSystem) {
        await onResetSystem();
    }
    setIsResetting(false);
    setIsResetModalOpen(false);
    setResetConfirmText('');
  };

  // --- USER MANAGEMENT LOGIC ---

  const handleCreateSystemUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    const employee = users.find(u => u.id === selectedEmployeeId);
    if (!employee) return;
    
    const selectedRole = roles.find(r => r.id === userFormData.roleId);
    
    let legacyRole = UserRole.ENGINEER;
    if (selectedRole?.id === 'r_admin') legacyRole = UserRole.ADMIN;
    if (selectedRole?.id === 'r_manager') legacyRole = UserRole.MANAGER;

    const updatedUser: User = {
      ...employee,
      email: userFormData.email,
      password: userFormData.password,
      role: legacyRole,
      customRoleId: userFormData.roleId,
      isSystemUser: true
    };

    onUpdateUser(updatedUser);
    setIsUserModalOpen(false);
    resetUserForm();
    addToast('Доступ для пользователя создан', 'success');
  };

  const resetUserForm = () => {
    setSelectedEmployeeId('');
    setUserFormData({ email: '', password: '', roleId: '' });
  };

  const systemUsers = users.filter(u => u.isSystemUser);
  const availableEmployees = users.filter(u => !u.isSystemUser);

  if (user.role !== UserRole.ADMIN) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl m-8 shadow-sm">
        <Lock className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 dark:drop-shadow-sm">Доступ ограничен</h2>
        <p className="text-slate-600 dark:text-gray-300">Только администраторы могут управлять настройками системы.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white dark:drop-shadow-sm">Настройки системы</h1>
          <p className="text-slate-600 dark:text-gray-400 font-medium">Управление пользователями, ролями и правами доступа</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-3">
           <button 
                onClick={() => setActiveTab('users')}
                className={`w-full text-left px-5 py-4 font-bold rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'users' ? 'bg-white/60 dark:bg-slate-700/60 text-blue-700 dark:text-blue-300 shadow-glass border border-white/40 dark:border-slate-600' : 'text-slate-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-slate-800/30'}`}
            >
             <UserCheck size={20} />
             Пользователи
           </button>
           <button 
                onClick={() => setActiveTab('roles')}
                className={`w-full text-left px-5 py-4 font-bold rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'roles' ? 'bg-white/60 dark:bg-slate-700/60 text-blue-700 dark:text-blue-300 shadow-glass border border-white/40 dark:border-slate-600' : 'text-slate-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-slate-800/30'}`}
            >
             <Shield size={20} />
             Роли и Права
           </button>
           <button 
                onClick={() => setActiveTab('links')}
                className={`w-full text-left px-5 py-4 font-bold rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'links' ? 'bg-white/60 dark:bg-slate-700/60 text-blue-700 dark:text-blue-300 shadow-glass border border-white/40 dark:border-slate-600' : 'text-slate-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-slate-800/30'}`}
            >
             <LinkIcon size={20} />
             Публичные ссылки
           </button>
           <button 
                onClick={() => setActiveTab('maintenance')}
                className={`w-full text-left px-5 py-4 font-bold rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'maintenance' ? 'bg-red-50/60 dark:bg-red-900/30 text-red-700 dark:text-red-400 shadow-glass border border-red-200 dark:border-red-900/40' : 'text-slate-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-slate-800/30'}`}
            >
             <RefreshCw size={20} />
             Обслуживание
           </button>
           <button 
                onClick={() => setActiveTab('security')}
                className={`w-full text-left px-5 py-4 font-bold rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'security' ? 'bg-white/60 dark:bg-slate-700/60 text-blue-700 dark:text-blue-300 shadow-glass border border-white/40 dark:border-slate-600' : 'text-slate-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-slate-800/30'}`}
            >
             <Key size={20} />
             Безопасность
           </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          {activeTab === 'users' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden animate-in fade-in shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="p-6 border-b border-white/20 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Users size={20} className="text-blue-600 dark:text-blue-400" />
                    Список пользователей
                </h3>
                <button 
                    onClick={() => setIsUserModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-md shadow-blue-500/30 font-bold"
                    >
                    <Plus size={16} />
                    <span>Добавить</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/30 dark:bg-slate-700/30 text-slate-500 dark:text-gray-400 border-b border-white/20 dark:border-slate-700">
                    <tr>
                        <th className="px-6 py-4 font-bold">Пользователь</th>
                        <th className="px-6 py-4 font-bold">Логин (Email)</th>
                        <th className="px-6 py-4 font-bold">Роль</th>
                        <th className="px-6 py-4 font-bold text-center">Статус</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20 dark:divide-slate-700">
                    {systemUsers.map(u => {
                        const userRoleName = roles.find(r => r.id === u.customRoleId)?.name || u.role;
                        return (
                        <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-xl shadow-sm" />
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white dark:drop-shadow-sm">{u.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-gray-400">{u.position}</div>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-gray-300">
                            {u.email || 'Не указан'}
                        </td>
                        <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-lg text-xs font-bold uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                {userRoleName}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-blue-900/40 text-green-700 dark:text-green-300">
                                Активен
                            </span>
                        </td>
                        </tr>
                    )})}
                    </tbody>
                </table>
                </div>
             </div>
          )}

          {activeTab === 'maintenance' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 animate-in fade-in shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Обслуживание системы</h3>
                        <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">Опасные операции и сброс данных</p>
                    </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/40 rounded-[24px] p-6 space-y-4">
                    <h4 className="font-bold text-red-800 dark:text-red-300 text-lg">Полная очистка базы данных</h4>
                    <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">
                        Это действие <b>безвозвратно удалит</b> всех клиентов, заявки, счета и историю транзакций из базы данных Supabase и локального хранилища. 
                        Ваша текущая учетная запись администратора и системные роли будут сохранены.
                    </p>
                    <button 
                        onClick={() => setIsResetModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-red-500/30 flex items-center gap-2 active:scale-95"
                    >
                        <Trash2 size={20} />
                        Очистить всё (Reset System)
                    </button>
                </div>
              </div>
          )}

          {activeTab === 'links' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 animate-in fade-in shadow-sm border border-gray-100 dark:border-slate-700">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                      <LinkIcon size={20} className="text-blue-500" />
                      Публичные интерфейсы
                  </h3>
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800 flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex-1">
                          <h4 className="font-bold text-blue-900 dark:text-blue-300 text-lg mb-1">Форма подачи заявок клиентом</h4>
                          <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                              Разместите эту ссылку в WhatsApp, Instagram или на сайте. Клиент сможет самостоятельно оставить заявку, которая сразу появится в системе.
                          </p>
                      </div>
                      <button onClick={copyPublicRequestLink} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 whitespace-nowrap active:scale-95">
                          <Copy size={18} />
                          Копировать ссылку
                      </button>
                  </div>
              </div>
          )}

          {activeTab === 'roles' && (
              <div className="space-y-4 animate-in fade-in">
                  <div className="flex justify-end">
                      <button onClick={() => openRoleModal()} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 font-bold dark:shadow-indigo-900/20">
                        <Plus size={18} />
                        <span>Создать роль</span>
                      </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                      {roles.map(role => (
                          <div key={role.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow border border-gray-100 dark:border-slate-700">
                              <div className="flex items-start gap-4">
                                  <div className={`p-4 rounded-2xl ${role.isSystem ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'} shadow-sm`}>
                                      <Shield size={24} />
                                  </div>
                                  <div>
                                      <h4 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 dark:drop-shadow-sm">
                                          {role.name}
                                          {role.isSystem && <span className="text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">System</span>}
                                      </h4>
                                      <p className="text-sm text-slate-500 dark:text-gray-400">{role.description}</p>
                                      <div className="mt-2 text-xs font-bold text-slate-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-700/40 w-fit px-2 py-1 rounded-lg">
                                          Доступ к: {role.permissions.length} разделам
                                      </div>
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => openRoleModal(role)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors" title="Редактировать права">
                                      <Edit size={20} />
                                  </button>
                                  {!role.isSystem && (
                                    <button onClick={() => deleteRole(role.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors" title="Удалить роль">
                                        <Trash2 size={20} />
                                    </button>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {activeTab === 'security' && (
              <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl text-center animate-in fade-in shadow-sm border border-gray-100 dark:border-slate-700">
                  <div className="inline-block p-6 bg-slate-100 dark:bg-slate-700 rounded-full mb-6 shadow-inner">
                      <Lock size={40} className="text-slate-400 dark:text-gray-300" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white dark:drop-shadow-sm">Журнал безопасности</h3>
                  <p className="text-slate-500 dark:text-gray-400 mb-8 max-w-md mx-auto">История входов и действий пользователей будет отображена здесь.</p>
                  <button className="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors font-bold">
                      Скачать логи (CSV)
                  </button>
              </div>
          )}
        </div>
      </div>

      {/* --- RESET SYSTEM MODAL --- */}
      {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-red-100 dark:border-red-900/30">
                  <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Вы уверены?</h3>
                    <p className="text-slate-500 dark:text-gray-400 mb-6 leading-relaxed">
                        Это действие <b>необратимо</b>. Все данные будут стерты из облака и локальной памяти.
                    </p>
                    
                    <div className="space-y-4">
                        <div className="text-left">
                            <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest text-center">Введите слово «ОЧИСТИТЬ» для подтверждения</label>
                            <input 
                                type="text"
                                value={resetConfirmText}
                                onChange={(e) => setResetConfirmText(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-700 border-2 border-red-100 dark:border-red-900/30 rounded-2xl focus:border-red-500 focus:ring-0 outline-none text-center font-black text-xl tracking-widest text-red-600"
                                placeholder="ОЧИСТИТЬ"
                            />
                        </div>
                        
                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setIsResetModalOpen(false)}
                                className="flex-1 py-4 text-slate-500 font-bold hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl transition-colors"
                            >
                                Отмена
                            </button>
                            <button 
                                onClick={handleResetExecute}
                                disabled={resetConfirmText !== 'ОЧИСТИТЬ' || isResetting}
                                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-500/30 disabled:opacity-30 disabled:grayscale transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isResetting ? <RefreshCw className="animate-spin" size={20} /> : <Trash2 size={20} />}
                                СТЕРЕТЬ ВСЁ
                            </button>
                        </div>
                    </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- CREATE USER MODAL --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col border border-gray-100 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-blue-50/50 dark:bg-blue-900/20 rounded-t-3xl">
              <h2 className="text-xl font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-2 dark:drop-shadow-sm">
                  <UserPlus size={24} />
                  Создание пользователя
              </h2>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSystemUser} className="p-6 space-y-4">
              <div className="bg-yellow-50/70 dark:bg-yellow-900/20 p-4 rounded-2xl border border-yellow-100 dark:border-yellow-900/30 mb-4">
                <label className="block text-sm font-bold text-yellow-800 dark:text-yellow-200 mb-2">1. Выберите сотрудника</label>
                <div className="relative">
                    <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 z-10" />
                    <select required value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="w-full pl-11 pr-10 py-3 bg-white dark:bg-slate-700 border border-yellow-200 dark:border-yellow-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-800 dark:text-white appearance-none cursor-pointer">
                      <option value="">-- Выберите из списка --</option>
                      {availableEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.position})</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-700 dark:text-gray-300 mb-3">2. Настройка доступа</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1">Email (Логин)</label>
                    <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                        <input required type="email" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} className="w-full pl-11 pr-3 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" placeholder="employee@company.com"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1">Пароль</label>
                    <div className="relative">
                        <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                        <input required type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full pl-11 pr-3 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" placeholder="••••••••"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1">Роль в системе</label>
                    <div className="relative">
                      <select required value={userFormData.roleId} onChange={e => setUserFormData({...userFormData, roleId: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-800 dark:text-white appearance-none cursor-pointer">
                        <option value="">Выберите роль...</option>
                        {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors font-medium">Отмена</button>
                <button type="submit" disabled={!selectedEmployeeId} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Save size={18} />
                  Создать доступ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ROLE EDITOR MODAL --- */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col my-8 max-h-[90vh] border border-gray-100 dark:border-slate-700">
             <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/20 rounded-t-3xl">
              <h2 className="text-xl font-extrabold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 dark:drop-shadow-sm">
                  <Shield size={24} />
                  {editingRole ? 'Редактирование роли' : 'Создание роли'}
              </h2>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200"><X size={24} /></button>
            </div>

            <form onSubmit={handleRoleSave} className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 bg-white dark:bg-slate-700/30 border-b border-gray-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Название роли</label>
                        <input required type="text" value={roleForm.name} onChange={e => setRoleForm({...roleForm, name: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" placeholder="Например: Бухгалтер"/>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Описание</label>
                        <input type="text" value={roleForm.description} onChange={e => setRoleForm({...roleForm, description: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" placeholder="Краткое описание обязанностей"/>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-slate-900/30">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 dark:drop-shadow-sm">
                         <Folder size={18} className="text-slate-500 dark:text-gray-400"/>
                         Права доступа
                    </h3>
                    
                    <div className="border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                        <div className="flex items-center bg-gray-100/50 dark:bg-slate-700/50 text-slate-600 dark:text-gray-300 font-bold text-xs uppercase tracking-wider border-b border-gray-200 dark:border-slate-700">
                            <div className="flex-1 px-6 py-4">Раздел</div>
                            {ACTIONS.map(action => (<div key={action.id} className="w-[100px] text-center px-2 py-4">{action.label}</div>))}
                            <div className="w-[60px] text-center px-2 py-4">Все</div>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-slate-700">
                            {RESOURCE_TREE.map(section => {
                                const isExpanded = expandedSections.has(section.id);
                                return (
                                    <React.Fragment key={section.id}>
                                        <div className="flex items-center bg-gray-50/50 dark:bg-slate-700/20 hover:bg-gray-100 dark:hover:bg-slate-700/40 cursor-pointer transition-colors border-l-4 border-l-transparent hover:border-l-indigo-400" onClick={() => toggleSection(section.id)}>
                                            <div className="flex-1 px-4 py-4 flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                {section.label}
                                            </div>
                                            {ACTIONS.map(a => <div key={a.id} className="w-[100px]"></div>)}
                                            <div className="w-[60px]"></div>
                                        </div>
                                        {isExpanded && section.children?.map(child => {
                                            const resourcePerms = roleForm.permissions[child.id] || [];
                                            const isFull = resourcePerms.length === 4;
                                            return (
                                                <div key={child.id} className="flex items-center hover:bg-indigo-50/30 dark:hover:bg-indigo-900/30 transition-colors animate-in fade-in slide-in-from-top-1 bg-white dark:bg-slate-800">
                                                    <div className="flex-1 px-4 py-3 pl-12 text-sm font-medium text-slate-700 dark:text-gray-300">{child.label}</div>
                                                    {ACTIONS.map(action => {
                                                        const isChecked = resourcePerms.includes(action.id);
                                                        return (
                                                            <div key={action.id} className="w-[100px] flex justify-center py-3 border-l border-gray-100 dark:border-slate-700">
                                                                <input type="checkbox" checked={isChecked} onChange={() => togglePermission(child.id, action.id)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 dark:border-slate-600 cursor-pointer bg-white dark:bg-slate-700"/>
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="w-[60px] flex justify-center py-3 border-l border-gray-100 dark:border-slate-700">
                                                        <button type="button" onClick={() => toggleRowPermissions(child.id)} className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors ${isFull ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' : 'text-slate-300 dark:text-gray-600'}`} title={isFull ? 'Снять все' : 'Выбрать все'}><Check size={18} /></button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3 bg-gray-50/50 dark:bg-slate-800/30">
                    <button type="button" onClick={() => setIsRoleModalOpen(false)} className="px-6 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-slate-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 font-bold transition-colors">Отмена</button>
                    <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 font-bold transition-colors flex items-center gap-2"><Save size={18} />Сохранить роль</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
