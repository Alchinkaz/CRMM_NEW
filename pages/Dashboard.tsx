import React, { useState, useMemo } from 'react';
import { User, UserRole, TaskStatus, TimeEntry, AttendanceStatus, Task, Sale, MonthlyService, Advance } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle, Wallet, Users as UsersIcon, Clock, Play, Square, MapPin, Loader2, Zap, ArrowUpRight, ChevronRight, Calendar as CalendarIcon, Briefcase, Calculator, Banknote, ArrowDownLeft } from 'lucide-react';
import { useToast } from '../components/Toast';

interface DashboardProps {
  user: User;
  timesheetData: TimeEntry[];
  advances?: Advance[];
  tasks: Task[];
  sales: Sale[];
  monthlyServices: MonthlyService[];
  onCheckIn: (location?: { lat: number; lng: number }) => void;
  onCheckOut: () => void;
}

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30'];

export const Dashboard: React.FC<DashboardProps> = ({ user, timesheetData, advances = [], tasks, sales, monthlyServices, onCheckIn, onCheckOut }) => {
  const { addToast } = useToast();
  const [isLocating, setIsLocating] = useState(false);

  const totalSales = sales.reduce((acc, sale) => acc + sale.amount, 0);
  const activeTasks = tasks.filter(t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELED).length;
  const pendingService = monthlyServices.filter(s => s.status === 'Pending').length;
  
  const todayDate = new Date().toISOString().split('T')[0];
  const salesToday = sales.filter(s => s.date === todayDate).reduce((acc, s) => acc + s.amount, 0);

  const todayEntry = timesheetData.find(t => t.userId === user.id && t.date === todayDate);
  const isCheckedIn = todayEntry?.status === AttendanceStatus.PRESENT && !todayEntry.checkOut;
  const isWorkDone = todayEntry?.status === AttendanceStatus.PRESENT && todayEntry.checkOut;

  const salesChartData = useMemo(() => {
      const data = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const dayName = d.toLocaleDateString('ru-RU', { weekday: 'short' });
          const dailyTotal = sales.filter(s => s.date === dateStr).reduce((sum, s) => sum + s.amount, 0);
          data.push({ name: dayName.charAt(0).toUpperCase() + dayName.slice(1), amount: dailyTotal, fullDate: dateStr });
      }
      return data;
  }, [sales]);

  const taskData = [
    { name: 'Новые', value: tasks.filter(t => t.status === TaskStatus.NEW).length },
    { name: 'В работе', value: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length },
    { name: 'Готово', value: tasks.filter(t => t.status === TaskStatus.COMPLETED).length },
  ];

  const recentSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);

  const handleGeoCheckIn = () => {
    setIsLocating(true);
    
    const geoOptions = {
        enableHighAccuracy: true,
        timeout: 25000, // Увеличено до 25 сек для борьбы с Timeout expired
        maximumAge: 30000 // Кэшируем на 30 сек
    };

    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                onCheckIn({ lat: latitude, lng: longitude });
                setIsLocating(false);
                addToast("Смена открыта (GPS OK)", "success");
            },
            (error) => {
                console.warn("GPS Attempt 1 failed:", error.message);
                
                // Если ошибка TimeOut, пробуем один раз без высокой точности (быстрее внутри зданий)
                if (error.code === error.TIMEOUT) {
                    addToast("Долгое ожидание GPS. Пробуем быстрый поиск...", "info");
                    
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            onCheckIn({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                            setIsLocating(false);
                            addToast("Смена открыта (Сеть OK)", "success");
                        },
                        (err2) => {
                            addToast("GPS недоступен. Чекин без координат.", "warning");
                            onCheckIn();
                            setIsLocating(false);
                        },
                        { enableHighAccuracy: false, timeout: 5000 }
                    );
                } else {
                    addToast(`Геолокация: ${error.message}. Чекин без координат.`, "warning");
                    onCheckIn(); 
                    setIsLocating(false);
                }
            },
            geoOptions
        );
    } else {
        addToast("Браузер не поддерживает геолокацию", "error");
        onCheckIn();
        setIsLocating(false);
    }
  };

  const handleCheckOutWrapper = () => {
      onCheckOut();
      addToast("Смена завершена", "info");
  };

  if (user.role === UserRole.ENGINEER) {
    const myTasks = tasks.filter(t => {
        const isAssignedToMe = t.engineerId === user.id;
        const isUnassignedMaintenance = !t.engineerId && t.isRecurring;
        if (t.isRecurring) {
            const today = new Date();
            const taskDate = new Date(t.deadline);
            const isFutureMonth = taskDate.getFullYear() > today.getFullYear() || (taskDate.getFullYear() === today.getFullYear() && taskDate.getMonth() > today.getMonth());
            if (isFutureMonth) return false;
        }
        return isAssignedToMe || isUnassignedMaintenance;
    });

    const calculateFinancials = () => {
        const currentDateObj = new Date();
        const year = currentDateObj.getFullYear();
        const month = currentDateObj.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let workingDaysInMonth = 0;
        for (let i = 1; i <= daysInMonth; i++) {
            const dayOfWeek = new Date(year, month, i).getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDaysInMonth++;
        }
        const dailyRate = workingDaysInMonth > 0 ? user.salary / workingDaysInMonth : 0;
        const workedDaysCount = timesheetData.filter(t => {
            const d = new Date(t.date);
            return t.userId === user.id && d.getMonth() === month && d.getFullYear() === year && (t.status === AttendanceStatus.PRESENT || t.status === AttendanceStatus.LATE);
        }).length;
        const earnedAmount = Math.round(dailyRate * workedDaysCount);
        const advancesTaken = advances.filter(a => {
            const d = new Date(a.date);
            return a.userId === user.id && d.getMonth() === month && d.getFullYear() === year;
        }).reduce((sum, a) => sum + a.amount, 0);
        return { workingDaysInMonth, dailyRate, workedDaysCount, earnedAmount, advancesTaken, toPay: earnedAmount - advancesTaken };
    };

    const financials = calculateFinancials();

    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight mb-2">Главная</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-ios-blue text-white rounded-ios p-8 relative overflow-hidden shadow-ios-float flex flex-col justify-between min-h-[300px]">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/20 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h2 className="text-[28px] font-bold mb-1">Привет, {user.name.split(' ')[0]}!</h2>
                    <p className="text-blue-100 text-[17px]">У тебя {myTasks.filter(t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELED).length} активных заявок.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-ios-sm p-5 border border-white/20">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[13px] font-semibold uppercase tracking-wide opacity-80 flex items-center gap-1.5"><Clock size={14} /> Смена</span>
                        {isCheckedIn && <span className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.8)]"></span>}
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                             <div className="text-[34px] font-bold leading-none">{isCheckedIn ? todayEntry.checkIn : isWorkDone ? `${todayEntry.totalHours}ч` : '--:--'}</div>
                             <div className="text-[13px] opacity-70 mt-1">{isCheckedIn ? 'Начало работы' : isWorkDone ? 'Всего за день' : 'Не начато'}</div>
                        </div>
                        {isCheckedIn ? (
                            <button onClick={handleCheckOutWrapper} className="bg-white text-ios-red px-6 py-3 rounded-full font-semibold text-[15px] shadow-sm active:scale-95 transition-transform">Завершить</button>
                        ) : (
                            <button onClick={handleGeoCheckIn} disabled={!!isWorkDone || isLocating} className="bg-white text-ios-blue px-6 py-3 rounded-full font-semibold text-[15px] shadow-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2">
                                {isLocating && <Loader2 size={16} className="animate-spin" />}
                                {isWorkDone ? 'Закрыто' : 'Начать'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-ios p-6 shadow-ios flex flex-col justify-between min-h-[300px] border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center justify-center"><Wallet size={20} /></div>
                    <div><h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Мои финансы</h3><p className="text-xs text-gray-500 dark:text-gray-400">Октябрь ({financials.workingDaysInMonth} раб. дней)</p></div>
                </div>
                <div className="space-y-3 flex-1">
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Banknote size={14}/> Оклад (мес.)</span><span className="font-bold text-gray-900 dark:text-white">{user.salary.toLocaleString()} ₸</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Calculator size={14}/> Ставка в день</span><span className="font-medium text-gray-700 dark:text-gray-300">{Math.round(financials.dailyRate).toLocaleString()} ₸</span></div>
                    <div className="w-full h-px bg-gray-100 dark:bg-slate-700 my-2"></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500 dark:text-gray-400">Отработано дней</span><span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">{financials.workedDaysCount}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500 dark:text-gray-400">Начислено</span><span className="font-bold text-green-600 dark:text-green-400">+{financials.earnedAmount.toLocaleString()} ₸</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500 dark:text-gray-400">Авансы</span><span className="font-bold text-orange-600 dark:text-orange-400">-{financials.advancesTaken.toLocaleString()} ₸</span></div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700"><div className="flex justify-between items-end"><span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">К выдаче</span><span className="text-2xl font-bold text-gray-900 dark:text-white">{financials.toPay.toLocaleString()} ₸</span></div></div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end mb-4">
        <div>
          <h1 className="text-[34px] font-bold text-black dark:text-white tracking-tight leading-tight">Обзор</h1>
          <p className="text-[17px] text-gray-500 dark:text-gray-400">Сводка за сегодня: {new Date().toLocaleDateString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-full p-1 pl-4 pr-1 shadow-sm flex items-center gap-3">
             <div className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Статус:</div>
             {isCheckedIn ? (
                <button onClick={handleCheckOutWrapper} className="bg-ios-red text-white px-4 py-1.5 rounded-full font-medium text-[15px] flex items-center gap-2 active:scale-95 transition-transform"><Square size={12} fill="currentColor"/> Стоп ({todayEntry.checkIn})</button>
             ) : (
                <button onClick={handleGeoCheckIn} className="bg-ios-blue text-white px-4 py-1.5 rounded-full font-medium text-[15px] flex items-center gap-2 active:scale-95 transition-transform" disabled={isLocating}>{isLocating ? <Loader2 size={12} className="animate-spin"/> : <Play size={12} fill="currentColor"/>} Старт</button>
             )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: 'Всего Продаж (Все время)', value: totalSales.toLocaleString() + ' ₸', icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-100' },
            { label: 'Продажи (Сегодня)', value: salesToday.toLocaleString() + ' ₸', icon: Zap, color: 'text-ios-green', bg: 'bg-ios-green' },
            { label: 'Активные Заявки', value: activeTasks, icon: CheckCircle, color: 'text-ios-blue', bg: 'bg-ios-blue' },
            { label: 'Долги по ТО', value: pendingService, icon: AlertCircle, color: 'text-ios-orange', bg: 'bg-ios-orange' }
        ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-ios shadow-ios hover:scale-[1.02] transition-transform">
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 ${stat.bg}/10 ${stat.color} rounded-full flex items-center justify-center`}><stat.icon size={22} /></div>
                    <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
                </div>
                <div className="text-[13px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{stat.label}</div>
                <div className="text-[28px] font-bold text-black dark:text-white leading-none">{stat.value}</div>
            </div>
        ))}
      </div>
    </div>
  );
};