
import React, { useState, useEffect } from 'react';
import { Task, User, TaskStatus } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { CheckCircle, MapPin, Calendar, Clock, Star, MessageSquare, AlertTriangle, Send, ExternalLink, ThumbsUp, Wrench, Timer, Loader2, Hourglass, User as UserIcon, ShieldCheck, Lock, X } from 'lucide-react';

const ui = {
    loading: 'Жүктелуде... / Загрузка...',
    error: 'Қате / Ошибка',
    back: 'Басты бет / На главную',
    successTitle: 'Рақмет! / Спасибо!',
    successDesc: 'Жұмыс орындалды деп расталды. / Выполнение работ подтверждено.',
    gisTitle: '2GIS-те бағалаңыз / Оцените в 2GIS',
    gisDesc: 'Сіздің пікіріңіз біз үшін мамызды. / Ваше мнение очень важно для нас.',
    gisBtn: 'Пікір қалдыру / Оставить отзыв',
    taskNumber: 'Өтінім / Заявка',
    statusNew: 'Жаңа / Новая',
    statusNewDesc: 'Инженердің келуін күтіңіз / Ожидайте выезда инженера',
    statusActive: 'Жұмыста / В работе',
    statusActiveDesc: 'Инженер тапсырманы орындауда / Инженер выполняет задачу',
    statusDone: 'Аяқталды / Завершено',
    statusDoneDesc: 'Растауыңызды күтеміз / Ожидаем подтверждения',
    labelWhat: 'Не істеу керек / Что нужно сделать',
    labelAddress: 'Мекенжай / Адрес',
    labelDate: 'Орындалу күні / Дата выполнения',
    labelEngineer: 'Орындаушы / Исполнитель',
    labelPending: 'Тағайындалуда... / Назначается...',
    labelDetails: 'Есеп / Отчет',
    labelTime: 'Уақыт / Время:',
    labelPhotos: 'Фотоесеп / Фотоотчет',
    btnConfirm: 'Орындалуын растау / Подтвердить выполнение',
    btnLocked: 'Растау жабық / Подтверждение закрыто',
    hintLocked: 'Жұмыс аяқталған соң белсенді болады / Будет доступно после завершения',
    hintConfirm: 'Басу арқылы шағымның жоқтығын растайсыз / Нажимая, вы подтверждаете отсутствие претензий',
    monthsKK: ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'],
    monthsRU: ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'],
    daysKK: ['Жексенбі', 'Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі'],
    daysRU: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
};

export const PublicTaskConfirmation: React.FC = () => {
  const [tasks, setTasks] = useLocalStorage<Task[]>('crm_tasks', []);
  const [users] = useLocalStorage<User[]>('crm_users', []);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [engineer, setEngineer] = useState<User | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('?')) {
        setError('Параметрлер қате / Ошибка параметров');
        setLoading(false);
        return;
    }

    const queryString = hash.split('?')[1];
    const urlParams = new URLSearchParams(queryString);
    const taskId = urlParams.get('id');
    const token = urlParams.get('token');

    const foundTask = tasks.find(t => t.id === taskId);

    if (!foundTask || foundTask.publicToken !== token) {
        setError('Өтінім табылмады / Заявка не найдена');
        setLoading(false);
        return;
    }

    setTask(foundTask);
    
    if (foundTask.engineerId) {
        const eng = users.find(u => u.id === foundTask.engineerId);
        setEngineer(eng || null);
    }

    if (foundTask.clientConfirmation?.isConfirmed) {
        setSubmitted(true);
    }

    setLoading(false);
  }, [tasks, users]);

  const handleConfirm = () => {
      if (!task) return;
      const updatedTask: Task = {
          ...task,
          clientConfirmation: {
              isConfirmed: true,
              confirmedAt: new Date().toISOString(),
              rating: 5
          },
      };
      setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));
      setSubmitted(true);
  };

  const getBilingualDate = (dateString: string) => {
    const date = new Date(dateString);
    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear();
    const w = date.getDay();

    return (
        <div className="flex flex-col">
            <span className="font-bold text-slate-800">{ui.daysKK[w]}, {d} {ui.monthsKK[m]} {y} ж.</span>
            <span className="text-xs text-slate-500 font-medium">{ui.daysRU[w]}, {d} {ui.monthsRU[m]} {y} г.</span>
        </div>
    );
  };

  const renderStatusBadge = (status: TaskStatus) => {
      // Added explicit animate: '' to ensure all object branches have the same shape for TypeScript inference
      const config = {
          [TaskStatus.NEW]: { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'bg-blue-100 text-blue-600', title: ui.statusNew, desc: ui.statusNewDesc, iconComp: <Calendar size={24} />, animate: '' },
          [TaskStatus.IN_PROGRESS]: { bg: 'bg-orange-50', border: 'border-orange-100', icon: 'bg-orange-100 text-orange-600', title: ui.statusActive, desc: ui.statusActiveDesc, iconComp: <Wrench size={24} />, animate: 'animate-pulse' },
          [TaskStatus.COMPLETED]: { bg: 'bg-green-50', border: 'border-green-100', icon: 'bg-green-100 text-green-600', title: ui.statusDone, desc: ui.statusDoneDesc, iconComp: <ShieldCheck size={24} />, animate: '' },
          [TaskStatus.CANCELED]: { bg: 'bg-red-50', border: 'border-red-100', icon: 'bg-red-100 text-red-600', title: 'Болдырылмады / Отмена', desc: '', iconComp: <X size={24} />, animate: '' }
      };

      const c = config[status] || config[TaskStatus.NEW];

      return (
          <div className={`flex flex-col items-center justify-center p-6 ${c.bg} rounded-2xl border ${c.border} text-center w-full ${c.animate || ''}`}>
              <div className={`w-12 h-12 ${c.icon} rounded-full flex items-center justify-center mb-2 shadow-sm`}>
                  {c.iconComp}
              </div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">{c.title}</h3>
              <p className="text-xs text-slate-600 font-medium mt-1">{c.desc}</p>
          </div>
      );
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-slate-500 font-bold">{ui.loading}</p>
    </div>
  );

  if (error) return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-gray-100">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">{ui.error}</h2>
              <p className="text-slate-500 font-medium mb-6">{error}</p>
              <a href="/" className="inline-block py-3 px-6 bg-slate-100 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition-colors">{ui.back}</a>
          </div>
      </div>
  );

  if (!task) return null;

  return (
    <div className="min-h-screen bg-[#F2F2F7] py-8 px-4 font-sans text-slate-900 selection:bg-blue-100">
        <div className="max-w-lg mx-auto space-y-6">
            
            <div className="text-center mb-2">
                <h1 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">ServiceCRM Pro</h1>
            </div>

            {submitted ? (
                <div className="bg-white p-8 rounded-[40px] shadow-2xl text-center animate-in zoom-in duration-500 border border-white">
                    <div className="w-24 h-24 bg-gradient-to-tr from-green-400 to-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/40">
                        <CheckCircle size={48} strokeWidth={3} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">{ui.successTitle}</h2>
                    <p className="text-slate-500 font-bold mb-8">{ui.successDesc}</p>

                    <div className="bg-slate-50 border border-slate-200 rounded-[32px] p-6 text-left relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
                                <Star className="text-[#2ECC71] fill-[#2ECC71]" size={20} />
                                {ui.gisTitle}
                            </h3>
                            <p className="text-slate-600 text-xs font-medium mb-5 leading-relaxed">
                                {ui.gisDesc}
                            </p>
                            <a 
                                href="https://2gis.kz/aktau/firm/70000001081123283/tab/reviews/addreview" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 w-full py-4 bg-[#2ECC71] hover:bg-[#27AE60] text-white rounded-2xl font-black transition-all shadow-lg shadow-green-500/20 active:scale-[0.98]"
                            >
                                {ui.gisBtn}
                                <ExternalLink size={18} />
                            </a>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-white relative">
                        <div className="p-6 border-b border-gray-50 flex flex-col gap-5">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                                    {ui.taskNumber} #{task.id.slice(-4)}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                    {new Date(task.createdAt || Date.now()).toLocaleDateString('ru-RU')}
                                </span>
                            </div>
                            
                            {renderStatusBadge(task.status)}
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">{ui.labelWhat}</label>
                                <h2 className="text-xl font-black text-slate-900 leading-tight">{task.title}</h2>
                            </div>

                            <div className="space-y-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-0.5">{ui.labelAddress}</div>
                                        <div className="font-bold text-slate-700 text-sm">{task.address}</div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-0.5">{ui.labelDate}</div>
                                        {getBilingualDate(task.deadline)}
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
                                        <UserIcon size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-0.5">{ui.labelEngineer}</div>
                                        {engineer ? (
                                            <div className="font-bold text-slate-800">{engineer.name} <span className="text-blue-500 text-xs font-medium ml-1">/ Инженер</span></div>
                                        ) : (
                                            <div className="font-bold text-orange-500 italic text-sm">{ui.labelPending}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {task.status === TaskStatus.COMPLETED && (
                                <div className="space-y-5 pt-4 border-t border-slate-50 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">{ui.labelDetails}</div>
                                        <p className="text-xs font-bold text-slate-700 leading-relaxed italic">
                                            {task.description.split('[ОТЧЕТ ИНЖЕНЕРА]:')[1] || task.description}
                                        </p>
                                    </div>

                                    {task.attachments && task.attachments.length > 0 && (
                                        <div>
                                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">{ui.labelPhotos} ({task.attachments.length})</div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {task.attachments.map((img, idx) => (
                                                    <div key={idx} className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                                                        <img src={img} alt="Report" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="sticky bottom-6">
                        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-2xl p-4 border border-white/60">
                            {task.status === TaskStatus.COMPLETED ? (
                                <button 
                                    onClick={handleConfirm}
                                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                >
                                    <ThumbsUp size={24} />
                                    {ui.btnConfirm}
                                </button>
                            ) : (
                                <button 
                                    disabled
                                    className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black text-lg cursor-not-allowed flex items-center justify-center gap-3 border border-slate-200"
                                >
                                    <Lock size={22} />
                                    {ui.btnLocked}
                                </button>
                            )}
                            <p className="text-center text-[10px] font-bold text-slate-400 mt-3 px-4">
                                {task.status === TaskStatus.COMPLETED 
                                    ? ui.hintConfirm 
                                    : ui.hintLocked}
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    </div>
  );
};
