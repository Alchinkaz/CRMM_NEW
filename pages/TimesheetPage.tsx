
import React, { useState, useEffect } from 'react';
import { User, UserRole, TimeEntry, AttendanceStatus, Advance } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Save, Edit2, AlertCircle, List, Plus, X, UserPlus, Phone, Briefcase, User as UserIcon, Wallet, CreditCard, DollarSign, ChevronDown } from 'lucide-react';
import { useToast } from '../components/Toast';
import { CustomSelect } from '../components/CustomSelect';

interface TimesheetPageProps {
  user: User;
  users: User[];
  timesheetData: TimeEntry[];
  advances: Advance[];
  onUpdateEntry: (entry: TimeEntry) => void;
  onDeleteEntry: (id: string) => void;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onAddAdvance: (advance: Advance) => void;
}

type Tab = 'timesheet' | 'employees';
type EmployeeViewMode = 'list' | 'form';

export const TimesheetPage: React.FC<TimesheetPageProps> = ({ user, users, timesheetData, advances, onUpdateEntry, onDeleteEntry, onAddUser, onUpdateUser, onAddAdvance }) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('timesheet');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Mobile specific state
  const [selectedMobileUserId, setSelectedMobileUserId] = useState<string>(user.id);

  // Employee View State (List vs Form)
  const [employeeViewMode, setEmployeeViewMode] = useState<EmployeeViewMode>('list');

  // User Form State (Create & Edit)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    role: UserRole.ENGINEER,
    position: '',
    phone: '',
    salary: ''
  });

  // Add Advance Modal State
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [newAdvanceForm, setNewAdvanceForm] = useState({
    userId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    comment: ''
  });

  // Update selectedMobileUser if current user changes or on mount
  useEffect(() => {
      if (user.role === UserRole.ENGINEER) {
          setSelectedMobileUserId(user.id);
      } else if (!selectedMobileUserId && users.length > 0) {
          setSelectedMobileUserId(users[0].id);
      }
  }, [user, users]);

  // --- Date Helpers ---

  const currentDateObj = new Date(selectedDate);

  const changeDate = (amount: number) => {
    const date = new Date(selectedDate);
    date.setMonth(date.getMonth() + amount);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const getHeaderDateLabel = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    const label = new Date(selectedDate).toLocaleDateString('ru-RU', options);
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  // --- Data Logic ---

  const getEntryForUser = (targetUserId: string, dateStr: string) => {
    return timesheetData.find(t => t.userId === targetUserId && t.date === dateStr);
  };

  // --- Visibility Filter ---
  const visibleUsers = user.role === UserRole.ENGINEER 
    ? users.filter(u => u.id === user.id) 
    : users;

  // --- User Handlers (Add & Edit) ---

  const openAddUserForm = () => {
    setEditingUser(null);
    setUserForm({ name: '', role: UserRole.ENGINEER, position: '', phone: '', salary: '' });
    setEmployeeViewMode('form');
  };

  const openEditUserForm = (targetUser: User) => {
    setEditingUser(targetUser);
    setUserForm({
      name: targetUser.name,
      role: targetUser.role,
      position: targetUser.position || '',
      phone: targetUser.phone || '',
      salary: targetUser.salary.toString()
    });
    setEmployeeViewMode('form');
  };

  const handleUserFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const salaryValue = parseInt(userForm.salary) || 0;
    
    if (editingUser) {
      const updatedUser: User = {
        ...editingUser,
        name: userForm.name,
        role: userForm.role,
        position: userForm.position,
        phone: userForm.phone,
        salary: salaryValue
      };
      onUpdateUser(updatedUser);
      addToast('Данные сотрудника обновлены', 'success');
    } else {
      const newUser: User = {
          id: `u${Date.now()}`,
          name: userForm.name,
          role: userForm.role,
          position: userForm.position,
          phone: userForm.phone,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userForm.name)}&background=random`,
          salary: salaryValue
      };
      onAddUser(newUser);
      addToast('Сотрудник добавлен', 'success');
    }
    setEmployeeViewMode('list');
  };

  // --- Advance Handlers ---
  
  const openAdvanceModal = (targetUserId?: string) => {
      setNewAdvanceForm({ 
          userId: targetUserId || '', 
          amount: '', 
          date: new Date().toISOString().split('T')[0], 
          comment: '' 
      });
      setIsAdvanceModalOpen(true);
  };

  const handleAddAdvanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdvanceForm.userId) return;
    
    const advance: Advance = {
        id: `adv${Date.now()}`,
        userId: newAdvanceForm.userId,
        amount: parseInt(newAdvanceForm.amount) || 0,
        date: newAdvanceForm.date,
        comment: newAdvanceForm.comment
    };
    onAddAdvance(advance);
    setIsAdvanceModalOpen(false);
    addToast('Аванс выдан', 'success');
  };

  // --- Edit Handlers (Timesheet) ---

  const updateEntry = (existingEntry: TimeEntry | undefined, userId: string, dateStr: string, status: AttendanceStatus | null) => {
     if (status === null) {
         if (existingEntry) {
             onDeleteEntry(existingEntry.id);
         }
         return;
     }

     let hours = 0;
     if (status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE) hours = 8;

     if (existingEntry) {
      onUpdateEntry({ ...existingEntry, status: status, totalHours: hours });
    } else {
      const newEntry: TimeEntry = {
        id: `te_${Date.now()}_${userId}_${dateStr}`,
        userId,
        date: dateStr,
        status: status,
        totalHours: hours,
        checkIn: status === AttendanceStatus.PRESENT ? '09:00' : '',
        checkOut: status === AttendanceStatus.PRESENT ? '18:00' : ''
      };
      onUpdateEntry(newEntry);
    }
  };

  const toggleCellStatus = (userId: string, dateStr: string) => {
      if (user.role === UserRole.ENGINEER) return;

      const entry = getEntryForUser(userId, dateStr);
      let nextStatus: AttendanceStatus | null = AttendanceStatus.PRESENT;

      if (entry) {
          switch (entry.status) {
              case AttendanceStatus.PRESENT: nextStatus = AttendanceStatus.SICK; break;
              case AttendanceStatus.SICK: nextStatus = AttendanceStatus.LEAVE; break;
              case AttendanceStatus.LEAVE: nextStatus = AttendanceStatus.ABSENT; break;
              case AttendanceStatus.ABSENT: nextStatus = null; break; // Clear
              default: nextStatus = AttendanceStatus.PRESENT;
          }
      }
      
      updateEntry(entry, userId, dateStr, nextStatus);
  };

  // --- Main Render Helpers ---

  const renderDesktopGrid = () => {
    const year = currentDateObj.getFullYear();
    const month = currentDateObj.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getDayLabel = (day: number) => {
        const d = new Date(year, month, day);
        return d.toLocaleDateString('ru-RU', { weekday: 'short' });
    };

    const isWeekend = (day: number) => {
        const d = new Date(year, month, day);
        const dayOfWeek = d.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6;
    };

    const getCellContent = (status?: AttendanceStatus) => {
        switch(status) {
            case AttendanceStatus.PRESENT: return '8';
            case AttendanceStatus.LATE: return '8*';
            case AttendanceStatus.SICK: return 'Б';
            case AttendanceStatus.LEAVE: return 'О';
            case AttendanceStatus.ABSENT: return 'Н';
            case AttendanceStatus.FIRED: return 'У';
            default: return '';
        }
    };

    const getCellClass = (status?: AttendanceStatus, isWknd?: boolean) => {
        let base = "border-r border-b border-gray-300 dark:border-slate-700 h-8 text-center text-sm cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors select-none text-gray-900 dark:text-gray-300";
        if (isWknd) base += " bg-yellow-100 dark:bg-yellow-900/20";
        if (!status) return base;
        switch(status) {
            case AttendanceStatus.SICK: return `${base} bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-200 font-bold`;
            case AttendanceStatus.ABSENT: return `${base} bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200 font-bold`;
            case AttendanceStatus.LEAVE: return `${base} bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200 font-bold`;
            case AttendanceStatus.FIRED: return `${base} bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-400`;
            default: return base;
        }
    };

    return (
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex-col w-full">
        <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-max">
                <thead>
                    <tr>
                        <th className="border-b border-r border-gray-300 dark:border-slate-700 bg-blue-50 dark:bg-slate-700/50 p-2 text-left min-w-[200px] z-10 sticky left-0 text-blue-900 dark:text-white font-bold">
                            Сотрудник
                        </th>
                        {daysArray.map(day => (
                            <th key={`h-${day}`} className={`border-b border-r border-gray-300 dark:border-slate-700 p-1 min-w-[30px] text-xs ${isWeekend(day) ? 'bg-yellow-200 dark:bg-yellow-900/30' : 'bg-blue-50 dark:bg-slate-700/50'}`}>
                                <div className="font-bold text-gray-700 dark:text-white">{String(day).padStart(2, '0')}</div>
                                <div className="font-normal text-gray-500 dark:text-gray-300 uppercase text-[10px]">{getDayLabel(day)}</div>
                            </th>
                        ))}
                        <th className="border-b border-l border-gray-300 dark:border-slate-700 bg-green-50 dark:bg-green-900/20 p-2 min-w-[60px] text-xs font-bold text-green-900 dark:text-green-300">
                            Часы
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {visibleUsers.map(u => {
                        let userTotalHours = 0;
                        return (
                            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td className="border-r border-b border-gray-300 dark:border-slate-700 p-2 bg-white dark:bg-slate-800 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate w-48">{u.name}</div>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-48">{u.position}</div>
                                </td>
                                {daysArray.map(day => {
                                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const entry = getEntryForUser(u.id, dateStr);
                                    if (entry) userTotalHours += entry.totalHours;
                                    return (
                                        <td key={`${u.id}-${day}`} onClick={() => toggleCellStatus(u.id, dateStr)} className={getCellClass(entry?.status, isWeekend(day))}>
                                            {getCellContent(entry?.status)}
                                        </td>
                                    );
                                })}
                                <td className="border-b border-l border-gray-300 dark:border-slate-700 bg-green-50 dark:bg-green-900/20 text-center text-sm font-bold text-gray-800 dark:text-white">
                                    {userTotalHours}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>
    );
  };

  const renderMobileCalendar = () => {
      const year = currentDateObj.getFullYear();
      const month = currentDateObj.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
      
      const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
      
      const emptySlots = Array.from({ length: startDay }, (_, i) => i);
      const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      const currentUserData = users.find(u => u.id === selectedMobileUserId) || user;
      const currentMonthEntries = timesheetData.filter(t => {
          const d = new Date(t.date);
          return t.userId === currentUserData.id && d.getMonth() === month && d.getFullYear() === year;
      });
      
      const totalHours = currentMonthEntries.reduce((sum, t) => sum + t.totalHours, 0);
      const workedDays = currentMonthEntries.filter(t => t.status === AttendanceStatus.PRESENT || t.status === AttendanceStatus.LATE).length;

      return (
          <div className="md:hidden space-y-4 w-full">
              {user.role !== UserRole.ENGINEER && (
                  <div className="relative">
                      <select 
                        value={selectedMobileUserId} 
                        onChange={(e) => setSelectedMobileUserId(e.target.value)}
                        className="w-full appearance-none bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold py-3 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      >
                          {users.map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
              )}

              <div className="bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-ios border border-gray-100 dark:border-slate-700">
                  <div className="grid grid-cols-7 mb-2 text-center">
                      {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, idx) => (
                          <div key={day} className={`text-xs font-semibold uppercase ${idx >= 5 ? 'text-red-400' : 'text-gray-400'}`}>
                              {day}
                          </div>
                      ))}
                  </div>

                  <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                      {emptySlots.map(i => <div key={`empty-${i}`} />)}
                      {daysArray.map(day => {
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const entry = getEntryForUser(selectedMobileUserId, dateStr);
                          
                          let bgClass = 'bg-gray-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300';
                          let content = '';

                          if (entry?.status) {
                              switch(entry.status) {
                                  case AttendanceStatus.PRESENT: 
                                      bgClass = 'bg-green-500 text-white shadow-md shadow-green-500/30'; 
                                      content = '8'; 
                                      break;
                                  case AttendanceStatus.LATE: 
                                      bgClass = 'bg-green-500 text-white opacity-80'; 
                                      content = '8*'; 
                                      break;
                                  case AttendanceStatus.SICK: 
                                      bgClass = 'bg-orange-400 text-white'; 
                                      content = 'Б'; 
                                      break;
                                  case AttendanceStatus.ABSENT: 
                                      bgClass = 'bg-red-500 text-white'; 
                                      content = 'Н'; 
                                      break;
                                  case AttendanceStatus.LEAVE: 
                                      bgClass = 'bg-blue-500 text-white'; 
                                      content = 'О'; 
                                      break;
                              }
                          }

                          return (
                              <div 
                                key={day} 
                                onClick={() => toggleCellStatus(selectedMobileUserId, dateStr)}
                                className={`aspect-square rounded-full flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-90 select-none ${bgClass}`}
                              >
                                  <span className={`text-sm font-bold leading-none ${entry?.status ? 'text-white' : ''}`}>{day}</span>
                                  {content && <span className="text-[9px] font-medium leading-none mt-0.5">{content}</span>}
                              </div>
                          );
                      })}
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Отработано дней</span>
                      <span className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{workedDays}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Всего часов</span>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalHours}</span>
                  </div>
              </div>
          </div>
      );
  };

  const renderEmployeesList = () => {
      const workDaysNorm = 22;

      return (
        <div className="space-y-6 w-full">
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Список сотрудников</h3>
                {(user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) && (
                    <button 
                        onClick={openAddUserForm}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-colors shadow-lg shadow-blue-500/30 font-bold active:scale-95"
                    >
                        <UserPlus size={18} />
                        <span className="hidden sm:inline">Добавить сотрудника</span>
                        <span className="sm:hidden">Добавить</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleUsers.map(u => {
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    const workedDays = timesheetData.filter(t => {
                        const d = new Date(t.date);
                        return t.userId === u.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear && (t.status === AttendanceStatus.PRESENT || t.status === AttendanceStatus.LATE);
                    }).length;

                    const dailyRate = u.salary / workDaysNorm;
                    const earned = dailyRate * workedDays;
                    const userAdvances = advances.filter(a => a.userId === u.id).reduce((sum, a) => sum + a.amount, 0);
                    const toPay = earned - userAdvances;

                    return (
                        <div key={u.id} className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
                            {/* Card Header */}
                            <div className="flex items-center gap-4 mb-4">
                                <img src={u.avatar} alt={u.name} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                                <div>
                                    <div className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{u.name}</div>
                                    <div className="text-sm text-slate-500 dark:text-gray-400 font-medium">{u.position}</div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-2 mb-4 bg-gray-50 dark:bg-slate-700/50 p-3 rounded-2xl border border-gray-100 dark:border-slate-600/50">
                                <div className="text-center">
                                    <div className="text-xs text-gray-400 font-bold uppercase mb-1">Дней</div>
                                    <div className="text-sm font-bold text-slate-800 dark:text-white">{workedDays}</div>
                                </div>
                                <div className="text-center border-l border-gray-200 dark:border-slate-600">
                                    <div className="text-xs text-gray-400 font-bold uppercase mb-1">Начислено</div>
                                    <div className="text-sm font-bold text-green-600 dark:text-green-400">+{Math.round(earned / 1000)}k</div>
                                </div>
                                <div className="text-center border-l border-gray-200 dark:border-slate-600">
                                    <div className="text-xs text-gray-400 font-bold uppercase mb-1">Аванс</div>
                                    <div className="text-sm font-bold text-orange-500 dark:text-orange-400">-{userAdvances > 0 ? `${userAdvances/1000}k` : '0'}</div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="mt-auto pt-2 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">К выдаче</div>
                                    <div className="text-xl font-extrabold text-slate-900 dark:text-white">{Math.round(toPay).toLocaleString()} ₸</div>
                                </div>
                                
                                {(user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) && (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => openAdvanceModal(u.id)}
                                            className="w-10 h-10 flex items-center justify-center bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 rounded-xl hover:bg-orange-200 transition-colors"
                                            title="Выдать аванс"
                                        >
                                            <Wallet size={18} />
                                        </button>
                                        <button 
                                            onClick={() => openEditUserForm(u)}
                                            className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-slate-600 transition-colors"
                                            title="Редактировать"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      );
  };

  // --- Main Page Render ---
  return (
    <div className="space-y-6 max-w-full mx-auto relative h-full flex flex-col overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:drop-shadow-sm">Сотрудники и Табель</h1>
           <p className="text-gray-500 dark:text-gray-400">Учет рабочего времени и заработной платы</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-slate-700 overflow-x-auto shrink-0 w-full no-scrollbar">
        <button 
          onClick={() => { setActiveTab('timesheet'); setEmployeeViewMode('list'); }}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'timesheet' ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        >
          <div className="flex items-center gap-2"><List size={18} />Табель (График)</div>
        </button>
        <button 
          onClick={() => { setActiveTab('employees'); setEmployeeViewMode('list'); }}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'employees' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        >
          <div className="flex items-center gap-2"><CreditCard size={18} />Сотрудники и Зарплата</div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 md:pb-0 w-full">
        {activeTab === 'timesheet' && (
            <div className="space-y-4 w-full">
                <div className="flex justify-between md:justify-end items-center gap-2 my-2">
                    <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-1">
                        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-600 dark:text-gray-300"><ChevronLeft size={20} /></button>
                        <div className="px-4 py-1 flex items-center gap-2 font-bold text-gray-800 dark:text-white min-w-[140px] md:min-w-[200px] justify-center text-sm md:text-base"><CalendarIcon size={18} className="text-blue-500" /><span className="capitalize">{getHeaderDateLabel()}</span></div>
                        <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-600 dark:text-gray-300"><ChevronRight size={20} /></button>
                    </div>
                </div>
                
                {/* Desktop View: Table */}
                {renderDesktopGrid()}

                {/* Mobile View: Interactive Calendar */}
                {renderMobileCalendar()}
                
                <div className="hidden md:flex bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 justify-between items-center text-sm text-gray-500 dark:text-gray-400 rounded-lg">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> На работе: {visibleUsers.filter(u => getEntryForUser(u.id, selectedDate)?.status === AttendanceStatus.PRESENT).length}</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Больничный: {visibleUsers.filter(u => getEntryForUser(u.id, selectedDate)?.status === AttendanceStatus.SICK).length}</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Прогул: {visibleUsers.filter(u => getEntryForUser(u.id, selectedDate)?.status === AttendanceStatus.ABSENT).length}</span>
                    </div>
                    {user.role === UserRole.ENGINEER && <div className="text-xs italic"><AlertCircle size={12} className="inline mr-1" />Для редактирования обратитесь к менеджеру</div>}
                </div>
            </div>
        )}

        {activeTab === 'employees' && renderEmployeesList()}
      </div>

      {/* --- ADD/EDIT EMPLOYEE FORM MODAL --- */}
      {employeeViewMode === 'form' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            {/* 
                Responsive Container: 
                Mobile: Full screen (inset-0)
                Desktop: Centered Modal (max-w-xl, rounded)
            */}
            <div className="w-full h-full md:h-auto md:max-h-[90vh] md:w-full md:max-w-xl bg-white dark:bg-slate-900 md:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 md:p-6 border-b border-gray-100 dark:border-slate-800 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                    <button 
                        onClick={() => setEmployeeViewMode('list')}
                        className="p-2 bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {editingUser ? 'Редактировать' : 'Новый сотрудник'}
                    </h2>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <form onSubmit={handleUserFormSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ФИО Сотрудника</label>
                            <div className="relative">
                                <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    required
                                    type="text" 
                                    value={userForm.name}
                                    onChange={e => setUserForm({...userForm, name: e.target.value})}
                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                                    placeholder="Иванов Иван Иванович"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Должность</label>
                                <div className="relative">
                                    <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        required
                                        type="text" 
                                        value={userForm.position}
                                        onChange={e => setUserForm({...userForm, position: e.target.value})}
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                                        placeholder="Инженер"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Оклад (₸)</label>
                                <div className="relative">
                                    <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        required
                                        type="number" 
                                        value={userForm.salary}
                                        onChange={e => setUserForm({...userForm, salary: e.target.value})}
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                                        placeholder="250000"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Телефон</label>
                            <div className="relative">
                                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    required
                                    type="tel" 
                                    value={userForm.phone}
                                    onChange={e => setUserForm({...userForm, phone: e.target.value})}
                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                                    placeholder="+7 700 000 00 00"
                                />
                            </div>
                        </div>

                        <div className="pt-6 pb-20 md:pb-0">
                            <button 
                                type="submit" 
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:opacity-90 shadow-lg shadow-blue-500/30 font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Save size={20} />
                                {editingUser ? 'Сохранить изменения' : 'Создать сотрудника'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}

      {/* --- ADD ADVANCE MODAL --- */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col border dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-orange-50 dark:bg-orange-900/20 rounded-t-2xl">
              <h2 className="text-xl font-bold text-orange-900 dark:text-orange-300 flex items-center gap-2 dark:drop-shadow-sm">
                  <Wallet size={24} />
                  Выдача аванса
              </h2>
              <button onClick={() => setIsAdvanceModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddAdvanceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Сотрудник</label>
                <CustomSelect 
                    value={newAdvanceForm.userId}
                    onChange={(val) => setNewAdvanceForm({...newAdvanceForm, userId: val})}
                    options={users.map(u => ({ value: u.id, label: u.name }))}
                    placeholder="-- Выберите сотрудника --"
                    icon={<UserIcon size={16} />}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Сумма (₸)</label>
                <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input 
                      required
                      autoFocus
                      type="number" 
                      value={newAdvanceForm.amount}
                      onChange={e => setNewAdvanceForm({...newAdvanceForm, amount: e.target.value})}
                      className="w-full pl-9 pr-3 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-lg font-bold"
                      placeholder="0"
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Дата выдачи</label>
                <input 
                  required
                  type="date" 
                  value={newAdvanceForm.date}
                  onChange={e => setNewAdvanceForm({...newAdvanceForm, date: e.target.value})}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Комментарий (необязательно)</label>
                <input 
                  type="text" 
                  value={newAdvanceForm.comment}
                  onChange={e => setNewAdvanceForm({...newAdvanceForm, comment: e.target.value})}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Например: на ремонт авто"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors font-medium"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 shadow-md dark:shadow-orange-900/30 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Выдать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
