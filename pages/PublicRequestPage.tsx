
import React, { useState, useRef } from 'react';
import { Task, TaskStatus } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Send, CheckCircle, Phone, User, MessageSquare, Loader2, ClipboardList, ArrowRight, Eye, Camera, X, Image as ImageIcon, ChevronDown } from 'lucide-react';

type Locale = 'kk' | 'ru';

const translations = {
    kk: {
        title: 'Жаңа өтінім',
        subtitle: 'Мәліметтерді қалдырыңыз, біз хабарласамыз',
        typeLabel: 'НЕ ҚАЖЕТ?',
        typePlaceholder: '-- Қызмет түрін таңдаңыз --',
        typeManager: 'Сату, есептеу',
        typeEngineer: 'Жөндеу, сервис',
        nameLabel: 'АТЫҢЫЗ',
        namePlaceholder: 'Сізге қалай хабарласуға болады?',
        phoneLabel: 'ТЕЛЕФОН',
        phonePlaceholder: '+7 (___) ___-__-__',
        commentLabel: 'ӨТІНІШ МӘНІ',
        commentPlaceholder: 'Тапсырманы немесе ақауды сипаттаңыз...',
        mediaLabel: 'ФОТО НЕМЕСЕ ВИДЕО (МІНДЕТТІ ЕМЕС)',
        submitBtn: 'Өтінімді жіберу',
        submitting: 'Жіберілуде...',
        successTitle: 'Қабылданды!',
        successSubtitle: 'Өтінім нөмірі:',
        statusBtn: 'Мәртебені көру',
        statusHint: 'Осы сілтемені сақтаңыз. Жұмыс есебі осында болады.',
        resetBtn: 'Тағы біреу',
        managerPrefix: '[САТУ]',
        engineerPrefix: '[ЖӨНДЕУ]',
        systemAction: 'Веб-форма арқылы жасалды'
    },
    ru: {
        title: 'Новая заявка',
        subtitle: 'Оставьте детали задачи, и мы свяжемся',
        typeLabel: 'ЧТО ТРЕБУЕТСЯ?',
        typePlaceholder: '-- Выберите тип услуги --',
        typeManager: 'Продажа, расчет',
        typeEngineer: 'Ремонт, сервис',
        nameLabel: 'ВАШЕ ИМЯ',
        namePlaceholder: 'Как к вам обращаться?',
        phoneLabel: 'ТЕЛЕФОН',
        phonePlaceholder: '+7 (___) ___-__-__',
        commentLabel: 'СУТЬ ОБРАЩЕНИЯ',
        commentPlaceholder: 'Опишите задачу или неисправность...',
        mediaLabel: 'ФОТО ИЛИ ВИДЕО (НЕОБЯЗАТЕЛЬНО)',
        submitBtn: 'Отправить заявку',
        submitting: 'Отправка...',
        successTitle: 'Принята!',
        successSubtitle: 'Номер заявки:',
        statusBtn: 'Статус заявки',
        statusHint: 'Сохраните ссылку для отслеживания отчета.',
        resetBtn: 'Отправить еще',
        managerPrefix: '[ПРОДАЖА]',
        engineerPrefix: '[РЕМОНТ]',
        systemAction: 'Создана через веб-форму'
    }
};

const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const scaleSize = MAX_WIDTH / img.width;
                if (scaleSize < 1) {
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
        reader.onerror = (err) => reject(err);
    });
};

export const PublicRequestPage: React.FC = () => {
  const [tasks, setTasks] = useLocalStorage<Task[]>('crm_tasks', []);
  const [locale, setLocale] = useState<Locale>('kk');
  const t = translations[locale];
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    comment: '',
    type: '' as 'MANAGER' | 'ENGINEER' | ''
  });
  
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ id: string, token: string } | null>(null);

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsCompressing(true);
      const newMedia: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file);
          newMedia.push(compressed);
        }
      }
      setAttachments(prev => [...prev, ...newMedia]);
      setIsCompressing(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type) return;
    setIsSubmitting(true);

    setTimeout(() => {
      const existingIds = tasks
        .map(task => task.id)
        .filter(id => id.startsWith('T-'))
        .map(id => parseInt(id.replace('T-', ''), 10))
        .filter(num => !isNaN(num));
      
      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 1000;
      const newId = `T-${maxId + 1}`;
      const generatedToken = Math.random().toString(36).substring(2, 15);
      const typePrefix = formData.type === 'MANAGER' ? t.managerPrefix : t.engineerPrefix;

      const newTask: Task = {
        id: newId,
        title: `${typePrefix} - ${formData.name}`,
        clientName: formData.name,
        address: locale === 'kk' ? 'Анықтау қажет' : 'Требуется уточнение',
        deadline: new Date().toISOString().split('T')[0],
        status: TaskStatus.NEW,
        priority: formData.type === 'MANAGER' ? 'High' : 'Medium',
        description: `TEL: ${formData.phone}\n${formData.comment}`,
        publicToken: generatedToken,
        attachments: attachments,
        history: [{
          id: `h_${Date.now()}`,
          userId: 'system',
          userName: 'Web Form',
          action: t.systemAction,
          createdAt: new Date().toISOString()
        }]
      };

      setTasks([newTask, ...tasks]);
      setSubmissionResult({ id: newId, token: generatedToken });
      setIsSubmitting(false);
    }, 1200);
  };

  if (submissionResult) {
    const statusLink = `/#public-task?id=${submissionResult.id}&token=${submissionResult.token}`;
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-4 font-sans selection:bg-blue-100">
        <div className="bg-white p-8 rounded-[40px] shadow-2xl text-center max-w-md w-full border border-white animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle size={40} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">{t.successTitle}</h2>
          <p className="text-slate-500 font-bold mb-6">{t.successSubtitle}</p>
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl py-4 mb-8">
            <span className="text-4xl font-black text-blue-600 tracking-tighter">#{submissionResult.id}</span>
          </div>

          <div className="space-y-4 mb-8">
            <a 
              href={statusLink}
              className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-blue-500/30"
            >
              <Eye size={22} />
              {t.statusBtn}
            </a>
            <p className="text-[10px] text-slate-400 font-bold px-4 leading-relaxed uppercase tracking-wider">
              {t.statusHint}
            </p>
          </div>

          <button 
            onClick={() => { setSubmissionResult(null); setFormData({name:'', phone:'', comment:'', type: ''}); setAttachments([]); }}
            className="text-xs font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-[0.2em]"
          >
            {t.resetBtn}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center py-10 px-4 font-sans selection:bg-blue-100">
      <div className="w-full max-w-md space-y-6">
        
        <div className="bg-white rounded-[40px] shadow-2xl border border-white relative overflow-hidden">
          
          {/* Header Area with Language Switcher */}
          <div className="p-8 pb-4 relative">
             <div className="absolute top-6 right-6 flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm z-10">
                <button 
                    onClick={() => setLocale('kk')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${locale === 'kk' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    ҚАЗ
                </button>
                <button 
                    onClick={() => setLocale('ru')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${locale === 'ru' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    РУС
                </button>
            </div>

            <div className="space-y-2 pr-24">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{t.title}</h1>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t.subtitle}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 pt-0 space-y-5">
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">{t.typeLabel}</label>
              <div className="relative group">
                <select 
                  required
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value as any})}
                  className="w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-transparent group-hover:border-blue-100 focus:border-blue-500 rounded-2xl outline-none transition-all text-slate-900 font-black text-sm appearance-none cursor-pointer"
                >
                  <option value="" disabled>{t.typePlaceholder}</option>
                  <option value="MANAGER">{t.typeManager}</option>
                  <option value="ENGINEER">{t.typeEngineer}</option>
                </select>
                <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">{t.nameLabel}</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500/50" />
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all text-slate-900 font-bold text-sm placeholder:text-slate-400"
                  placeholder={t.namePlaceholder}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">{t.phoneLabel}</label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500/50" />
                <input 
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all text-slate-900 font-bold text-sm placeholder:text-slate-400 font-mono"
                  placeholder={t.phonePlaceholder}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">{t.commentLabel}</label>
              <div className="relative">
                <MessageSquare size={18} className="absolute left-4 top-5 text-blue-500/50" />
                <textarea 
                  required
                  rows={3}
                  value={formData.comment}
                  onChange={e => setFormData({...formData, comment: e.target.value})}
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all text-slate-900 font-bold text-sm placeholder:text-slate-400"
                  placeholder={t.commentPlaceholder}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">
                {t.mediaLabel}
              </label>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleMediaSelect}
              />
              
              <div className="flex flex-wrap gap-3">
                {attachments.map((src, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shadow-sm group animate-in zoom-in">
                    <img src={src} className="w-full h-full object-cover" alt="Preview" />
                    <button 
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all active:scale-95 bg-slate-50/50"
                >
                  {isCompressing ? <Loader2 size={24} className="animate-spin text-blue-600" /> : <Camera size={24} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting || !formData.type || isCompressing}
              className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-lg shadow-2xl shadow-blue-500/40 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  {t.submitting}
                </>
              ) : (
                <>
                  {t.submitBtn}
                  <ArrowRight size={22} />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black">
                © {new Date().getFullYear()} ServiceCRM Pro
            </p>
        </div>
      </div>
    </div>
  );
};
