
import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, Task, TaskStatus, Client, ClientType, TaskHistory, TaskComment } from '../types';
import { MapPin, Calendar, Clock, Plus, Camera, CheckSquare, Users as UsersIcon, X, Save, Upload, UserPlus, List, Phone, User as UserIcon, ChevronDown, Repeat, Edit2, RotateCcw, MessageSquare, History, Send, Info, ExternalLink, Image as ImageIcon, Trash2, Maximize2, Share2, Star, Timer, PlayCircle, StopCircle, Columns, Search as SearchIcon, GripVertical } from 'lucide-react';
import { useToast } from '../components/Toast';
import { CustomSelect, SelectOption } from '../components/CustomSelect';

interface TasksPageProps {
  user: User;
  users: User[]; // Received from App state
  clients: Client[];
  tasks: Task[];
  onUpdateTasks: (tasks: Task[]) => void;
  onAddClient?: (client: Client) => void;
  targetId?: string; // Optional ID for deep linking
}

// ... (Utility functions: compressImage, formatDuration, formatDateTime - Keep them as is)
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
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

const formatDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs < 0) return '0 мин';
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours > 0) return `${hours}ч ${mins}мин`;
    return `${mins}мин`;
};

const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Не указано';
    return new Date(isoString).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
};

export const TasksPage: React.FC<TasksPageProps> = ({ user, users, clients, tasks, onUpdateTasks, onAddClient, targetId }) => {
  const { addToast } = useToast();
  
  // VIEW STATE
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filter, setFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeTaskForReport, setActiveTaskForReport] = useState<string | null>(null);

  // Edit Mode State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');

  // Photo Preview State
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Form state for new/edit task
  const [isManualClient, setIsManualClient] = useState(true); // Default to true
  const [manualClientName, setManualClientName] = useState('');
  
  const [newTask, setNewTask] = useState({
    title: '',
    clientId: '',
    address: '',
    deadline: new Date().toISOString().split('T')[0], // Default to today
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    description: '',
    engineerId: ''
  });

  // Comment Input
  const [commentText, setCommentText] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Client Creation Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClientFormData, setNewClientFormData] = useState({
    name: '',
    type: ClientType.COMPANY,
    phone: '',
    address: ''
  });

  // Form state for report
  const [reportComment, setReportComment] = useState('');
  const [reportImages, setReportImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // --- DEEP LINKING EFFECT ---
  useEffect(() => {
      if (targetId) {
          const foundTask = tasks.find(t => t.id === targetId);
          if (foundTask) {
              handleEditTask(foundTask);
          }
      }
  }, [targetId, tasks]);

  // Scroll to bottom of comments
  useEffect(() => {
      if (activeTab === 'comments' && commentsEndRef.current) {
          commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
  }, [activeTab, isCreateModalOpen, tasks]);

  // --- FILTERING LOGIC ---
  const filteredTasks = tasks.filter(task => {
    // ... (Filter logic identical to previous)
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = 
            task.id.toLowerCase().includes(query) ||
            task.title.toLowerCase().includes(query) ||
            task.clientName.toLowerCase().includes(query) ||
            task.address.toLowerCase().includes(query) ||
            task.description.toLowerCase().includes(query);
        if (!matches) return false;
    }
    if (viewMode === 'list' && filter !== 'ALL' && task.status !== filter) return false;
    if (user.role === UserRole.ENGINEER) {
      if (task.engineerId && task.engineerId !== user.id) return false;
      if (!task.engineerId && !task.isRecurring) return false;
      if (task.isRecurring) {
          const today = new Date();
          const taskDate = new Date(task.deadline);
          const isFutureMonth = taskDate.getFullYear() > today.getFullYear() || 
                               (taskDate.getFullYear() === today.getFullYear() && taskDate.getMonth() > today.getMonth());
          if (isFutureMonth) return false;
      }
      return true;
    }
    return true;
  });

  const getEngineerInfo = (id?: string) => {
      if (!id) return null;
      return users.find(u => u.id === id);
  };

  const createHistoryEntry = (action: string, details?: string): TaskHistory => ({
      id: `h_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      action,
      details,
      createdAt: new Date().toISOString()
  });

  const copyPublicLink = (task: Task) => {
      const token = task.publicToken || 'default';
      const url = `${window.location.origin}/#public-task?id=${task.id}&token=${token}`;
      navigator.clipboard.writeText(url);
      addToast('Ссылка скопирована в буфер обмена', 'success');
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    if (newStatus === TaskStatus.COMPLETED) {
      setActiveTaskForReport(taskId);
      setReportComment('');
      setReportImages([]);
      setIsReportModalOpen(true);
    } else {
      const updatedTasks = tasks.map(t => {
          if (t.id === taskId) {
              const oldStatusLabel = getStatusLabel(t.status);
              const newStatusLabel = getStatusLabel(newStatus);
              const updates: Partial<Task> = { 
                  status: newStatus,
                  history: [...(t.history || []), createHistoryEntry('Изменил статус', `${oldStatusLabel} -> ${newStatusLabel}`)]
              };
              if (newStatus === TaskStatus.IN_PROGRESS && !t.startedAt) {
                  updates.startedAt = new Date().toISOString();
              }
              if (newStatus === TaskStatus.IN_PROGRESS && !t.engineerId && user.role === UserRole.ENGINEER) {
                  updates.engineerId = user.id;
                  updates.history?.push(createHistoryEntry('Принял задачу', 'Назначил себя исполнителем'));
              }
              return { ...t, ...updates };
          }
          return t;
      });
      onUpdateTasks(updatedTasks);
      addToast(`Статус обновлен на "${getStatusLabel(newStatus)}"`, 'success');
    }
  };

  // ... (Drag & Drop handlers identical to previous) ...
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
      setDraggedTaskId(taskId);
      e.dataTransfer.effectAllowed = 'move';
      e.currentTarget.classList.add('opacity-50');
  };
  const handleDragEnd = (e: React.DragEvent) => {
      setDraggedTaskId(null);
      e.currentTarget.classList.remove('opacity-50');
  };
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
      e.preventDefault();
      if (!draggedTaskId) return;
      const task = tasks.find(t => t.id === draggedTaskId);
      if (task && task.status !== targetStatus) {
          if (targetStatus === TaskStatus.COMPLETED) {
              setActiveTaskForReport(draggedTaskId);
              setReportComment('');
              setReportImages([]);
              setIsReportModalOpen(true);
          } else {
              handleStatusChange(draggedTaskId, targetStatus);
          }
      }
      setDraggedTaskId(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setIsCompressing(true);
          const newImages: string[] = [];
          try {
              for (let i = 0; i < e.target.files.length; i++) {
                  const file = e.target.files[i];
                  const compressedBase64 = await compressImage(file);
                  newImages.push(compressedBase64);
              }
              setReportImages(prev => [...prev, ...newImages]);
          } catch (error) {
              console.error("Compression error:", error);
              addToast("Ошибка при обработке фото", "error");
          } finally {
              setIsCompressing(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      }
  };

  const removeReportImage = (index: number) => {
      setReportImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditTask = (task: Task) => {
      setEditingTaskId(task.id);
      setActiveTab('details');
      setNewTask({
          title: task.title,
          clientId: tasks.find(t => t.id === task.id)?.clientId || '', 
          address: task.address,
          deadline: task.deadline,
          priority: task.priority,
          description: task.description,
          engineerId: task.engineerId || ''
      });
      const existingClient = clients.find(c => c.name === task.clientName);
      if (existingClient) {
          setIsManualClient(false);
          setNewTask(prev => ({...prev, clientId: existingClient.id}));
      } else {
          setIsManualClient(true);
          setManualClientName(task.clientName);
      }
      setIsCreateModalOpen(true);
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: Client = {
      id: `c${Date.now()}`,
      name: newClientFormData.name,
      type: newClientFormData.type,
      phone: newClientFormData.phone,
      address: newClientFormData.address,
      balance: 0
    };
    if (onAddClient) onAddClient(newClient);
    setIsManualClient(false);
    setNewTask(prev => ({ ...prev, clientId: newClient.id, address: newClient.address || prev.address }));
    setIsClientModalOpen(false);
    setNewClientFormData({ name: '', type: ClientType.COMPANY, phone: '', address: '' });
    addToast('Клиент успешно создан', 'success');
  };

  const createTaskLogic = (shouldKeepOpen: boolean) => {
    let clientName = 'Неизвестный клиент';
    if (isManualClient) {
      clientName = manualClientName || 'Без названия';
    } else {
      const client = clients.find(c => c.id === newTask.clientId);
      if (client) clientName = client.name;
    }

    if (editingTaskId) {
        const updatedTasks = tasks.map(t => {
            if (t.id === editingTaskId) {
                const changes: TaskHistory[] = [];
                if (t.engineerId !== newTask.engineerId) {
                    const engName = users.find(u => u.id === newTask.engineerId)?.name || 'Никто';
                    changes.push(createHistoryEntry('Изменил исполнителя', `Новый: ${engName}`));
                }
                if (t.priority !== newTask.priority) {
                    changes.push(createHistoryEntry('Изменил приоритет', `${t.priority} -> ${newTask.priority}`));
                }
                if (t.deadline !== newTask.deadline) {
                    changes.push(createHistoryEntry('Перенес срок', `${t.deadline} -> ${newTask.deadline}`));
                }
                return {
                    ...t,
                    title: newTask.title,
                    clientName: clientName,
                    address: newTask.address,
                    deadline: newTask.deadline,
                    priority: newTask.priority,
                    description: newTask.description,
                    engineerId: newTask.engineerId || undefined,
                    history: [...(t.history || []), ...changes]
                };
            }
            return t;
        });
        onUpdateTasks(updatedTasks);
        addToast('Заявка обновлена', 'success');
        setIsCreateModalOpen(false);
        resetForm();
    } else {
        const existingIds = tasks.map(t => t.id).filter(id => id.startsWith('T-')).map(id => parseInt(id.replace('T-', ''), 10)).filter(num => !isNaN(num));
        const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 1000;
        const newId = `T-${maxId + 1}`;
        const createdTask: Task = {
            id: newId,
            title: newTask.title,
            clientName: clientName,
            address: newTask.address,
            deadline: newTask.deadline,
            status: TaskStatus.NEW,
            priority: newTask.priority,
            description: newTask.description,
            engineerId: newTask.engineerId || undefined,
            history: [createHistoryEntry('Создал заявку')],
            comments: [],
            publicToken: Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10)
        };
        onUpdateTasks([createdTask, ...tasks]);
        addToast(`Заявка ${newId} создана`, 'success');
        if (shouldKeepOpen) {
            setNewTask(prev => ({ ...prev, title: '', description: '' }));
        } else {
            setIsCreateModalOpen(false);
            resetForm();
        }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => { e.preventDefault(); createTaskLogic(false); };
  const handleSaveAndCreateAnother = (e: React.MouseEvent) => {
    e.preventDefault();
    const form = e.currentTarget.closest('form');
    if (form && form.checkValidity()) { createTaskLogic(true); } else { form?.reportValidity(); }
  };

  const handlePostComment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!commentText.trim() || !editingTaskId) return;
      const newComment: TaskComment = {
          id: `cm_${Date.now()}`,
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar,
          text: commentText,
          createdAt: new Date().toISOString()
      };
      const updatedTasks = tasks.map(t => t.id === editingTaskId ? { ...t, comments: [...(t.comments || []), newComment] } : t);
      onUpdateTasks(updatedTasks);
      setCommentText('');
  };

  const resetForm = () => {
    setNewTask({ title: '', clientId: '', address: '', deadline: new Date().toISOString().split('T')[0], priority: 'Medium', description: '', engineerId: '' });
    setIsManualClient(true);
    setManualClientName('');
    setEditingTaskId(null);
    setActiveTab('details');
  };

  const handleCompleteTask = () => {
    if (!activeTaskForReport) return;
    const currentTask = tasks.find(t => t.id === activeTaskForReport);
    let newTaskList = tasks.map(t => 
      t.id === activeTaskForReport ? { ...t, status: TaskStatus.COMPLETED, description: `${t.description} \n\n[ОТЧЕТ ИНЖЕНЕРА]: ${reportComment}`, history: [...(t.history || []), createHistoryEntry('Завершил работу', `Сдал отчет. Фото: ${reportImages.length}`)], attachments: reportImages, completedAt: new Date().toISOString() } : t
    );
    if (currentTask && currentTask.isRecurring) {
        const currentDeadline = new Date(currentTask.deadline);
        const nextMonthDate = new Date(currentDeadline.setMonth(currentDeadline.getMonth() + 1));
        const nextDeadlineStr = nextMonthDate.toISOString().split('T')[0];
        const duplicateExists = tasks.some(t => t.maintenanceObjectId === currentTask.maintenanceObjectId && t.deadline === nextDeadlineStr);
        if (!duplicateExists) {
            const nextRecurringTask: Task = {
                ...currentTask,
                id: `t_maint_${Date.now()}`,
                deadline: nextDeadlineStr,
                status: TaskStatus.NEW,
                description: currentTask.description.split('\n\n[ОТЧЕТ ИНЖЕНЕРА]')[0],
                engineerId: currentTask.engineerId,
                history: [createHistoryEntry('Авто-создание (ТО)', 'Ежемесячная генерация')],
                comments: [],
                attachments: [],
                publicToken: Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10),
                startedAt: undefined,
                completedAt: undefined
            };
            newTaskList = [nextRecurringTask, ...newTaskList];
            addToast(`Создана заявка на ТО на ${nextDeadlineStr}`, 'info');
        }
    }
    onUpdateTasks(newTaskList);
    addToast('Работа завершена!', 'success');
    setIsReportModalOpen(false);
    setActiveTaskForReport(null);
    setReportComment('');
    setReportImages([]);
  };

  const getStatusColor = (status: TaskStatus) => {
    switch(status) {
      case TaskStatus.NEW: return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case TaskStatus.IN_PROGRESS: return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
      case TaskStatus.COMPLETED: return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      case TaskStatus.CANCELED: return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch(status) {
        case TaskStatus.NEW: return 'Новая';
        case TaskStatus.IN_PROGRESS: return 'В работе';
        case TaskStatus.COMPLETED: return 'Выполнена';
        case TaskStatus.CANCELED: return 'Отменена';
        default: return status;
    }
  };

  const currentEditingTask = editingTaskId ? tasks.find(t => t.id === editingTaskId) : null;

  // --- DROPDOWN OPTIONS ---
  const clientOptions: SelectOption[] = [
      ...(user.role !== UserRole.ENGINEER ? [{ value: 'NEW', label: '+ Создать нового клиента', isAction: true }] : []),
      ...clients.map(c => ({ value: c.id, label: c.name }))
  ];

  const priorityOptions: SelectOption[] = [
      { value: 'Low', label: 'Низкий' },
      { value: 'Medium', label: 'Средний' },
      { value: 'High', label: 'Высокий' }
  ];

  const engineerOptions: SelectOption[] = [
      { value: '', label: 'Не назначен' },
      ...users.filter(u => u.role === UserRole.ENGINEER).map(u => ({ value: u.id, label: u.name }))
  ];

  // --- RENDER HELPERS ---
  const renderTaskCard = (task: Task, isKanban = false) => {
      const assignedEngineer = getEngineerInfo(task.engineerId);
      return (
        <div 
            key={task.id} 
            draggable={isKanban}
            onDragStart={(e) => isKanban && handleDragStart(e, task.id)}
            onDragEnd={handleDragEnd}
            onClick={() => handleEditTask(task)}
            className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border flex flex-col transition-all cursor-pointer ${
                task.isRecurring ? 'border-l-4 border-l-orange-400 dark:border-l-orange-500' : 'border-gray-200 dark:border-slate-700'
            } ${isKanban ? 'p-3 hover:shadow-md active:cursor-grabbing hover:border-blue-400 dark:hover:border-blue-500' : 'p-5 hover:shadow-md h-full'}`}
        >
            {/* KANBAN COMPACT HEADER */}
            <div className="flex justify-between items-start mb-2">
                {!isKanban && (
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusColor(task.status)}`}>
                            {getStatusLabel(task.status)}
                        </span>
                        <span className="text-xs font-mono text-gray-400 font-bold">#{task.id}</span>
                    </div>
                )}
                {isKanban && (
                    <div className="flex gap-1 flex-wrap">
                        {task.priority === 'High' && <div className="w-2 h-2 rounded-full bg-red-500" title="Срочно"></div>}
                        {task.isRecurring && <Repeat size={10} className="text-orange-500" />}
                        {task.attachments?.length ? <ImageIcon size={10} className="text-blue-500" /> : null}
                        {task.comments?.length ? <MessageSquare size={10} className="text-gray-400" /> : null}
                    </div>
                )}
                
                <div className={`flex gap-2 ${isKanban ? 'ml-auto' : ''}`}>
                    {!isKanban && task.attachments && task.attachments.length > 0 && (
                        <span className="text-gray-400 flex items-center" title={`${task.attachments.length} фото`}>
                            <ImageIcon size={16} />
                        </span>
                    )}
                    {!isKanban && (
                        <button className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {user.role === UserRole.ENGINEER ? <Info size={16} /> : <Edit2 size={16} />}
                        </button>
                    )}
                    {!isKanban && task.isRecurring && (
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded flex items-center gap-1">
                            <Repeat size={12} /> ТО
                        </span>
                    )}
                    {!isKanban && task.priority === 'High' && (
                        <span className="text-xs font-bold text-red-500 dark:text-red-400 flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                            <Clock size={12} />
                            Срочно
                        </span>
                    )}
                </div>
            </div>
            
            {isKanban && <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">#{task.id}</div>}
            <h3 className={`${isKanban ? 'text-sm' : 'text-lg'} font-bold text-gray-900 dark:text-white mb-1 dark:drop-shadow-sm line-clamp-2`}>{task.title}</h3>
            <div className={`text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1 truncate`}>
                <UsersIcon size={12} />
                <span className="truncate">{task.clientName}</span>
            </div>
            <div className={`text-xs text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-1 hover:underline w-fit ${isKanban ? 'line-clamp-1' : ''}`}>
                <MapPin size={12} />
                <span className="truncate">{task.address}</span>
            </div>
            {!isKanban && (
                <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-200 mb-4 whitespace-pre-wrap border border-gray-100 dark:border-slate-600/50 line-clamp-3">
                    {task.description}
                </div>
            )}
            <div className={`mt-auto pt-3 border-t border-gray-100 dark:border-slate-700/50 flex items-center justify-between`}>
                {assignedEngineer ? (
                    <div className="flex items-center gap-2">
                        <img src={assignedEngineer.avatar} alt={assignedEngineer.name} className={`${isKanban ? 'w-6 h-6' : 'w-8 h-8'} rounded-full object-cover border border-gray-200 dark:border-slate-600`} />
                        {!isKanban && (
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{task.status === TaskStatus.COMPLETED ? 'Выполнил' : 'Исполнитель'}</span>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 leading-tight">{assignedEngineer.name}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <div className={`${isKanban ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center border border-dashed border-gray-400 dark:border-slate-500`}>
                            <UserIcon size={isKanban ? 12 : 16} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        {!isKanban && (
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Исполнитель</span>
                                <span className="text-sm font-semibold text-orange-500 dark:text-orange-400 leading-tight">Не назначен</span>
                            </div>
                        )}
                    </div>
                )}
                {task.status === TaskStatus.COMPLETED && task.startedAt && task.completedAt ? (
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1">
                        <Timer size={12} className="text-blue-500" />
                        {formatDuration(task.startedAt, task.completedAt)}
                    </div>
                ) : (
                    <div className={`flex items-center gap-1 font-medium ${isKanban ? 'text-[10px]' : 'text-sm'}`}>
                        <Calendar size={isKanban ? 12 : 14} />
                        <span className={task.isRecurring ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}>
                            {new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' })}
                        </span>
                    </div>
                )}
            </div>
            {!isKanban && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex gap-3">
                    {user.role === UserRole.ENGINEER && task.status === TaskStatus.NEW && (
                        <button onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, TaskStatus.IN_PROGRESS); }} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Принять</button>
                    )}
                    {user.role === UserRole.ENGINEER && task.status === TaskStatus.IN_PROGRESS && (
                        <button onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, TaskStatus.COMPLETED); }} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2"><CheckSquare size={14} /> Завершить</button>
                    )}
                    {task.status === TaskStatus.COMPLETED && (
                        <button onClick={(e) => { e.stopPropagation(); copyPublicLink(task); }} className="w-full py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-sm font-bold hover:bg-blue-100 flex items-center justify-center gap-2"><Share2 size={14} /> Ссылка</button>
                    )}
                </div>
            )}
        </div>
      );
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:drop-shadow-sm">Заявки на работы</h1>
                <p className="text-gray-500 dark:text-gray-400">Монтаж, ремонт и обслуживание</p>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск..." className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div className="flex bg-gray-200 dark:bg-slate-700 p-1 rounded-xl shrink-0">
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} title="Список"><List size={18} /></button>
                    <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} title="Канбан доска"><Columns size={18} /></button>
                </div>
                {user.role !== UserRole.ENGINEER && (
                <button onClick={() => { resetForm(); setIsCreateModalOpen(true); }} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-md shadow-blue-500/30 shrink-0"><Plus size={18} /><span className="hidden md:inline">Создать</span></button>
                )}
            </div>
        </div>
        {viewMode === 'list' && (
            <div className="flex gap-2 overflow-x-auto pb-2 shrink-0">
                {(['ALL', TaskStatus.NEW, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED] as const).map(status => (
                <button key={status} onClick={() => setFilter(status)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${filter === status ? 'bg-slate-800 dark:bg-white text-white dark:text-black border-slate-800 dark:border-white shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>{status === 'ALL' ? 'Все' : getStatusLabel(status)}</button>
                ))}
            </div>
        )}
      </div>

      {/* --- LIST VIEW --- */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
            {filteredTasks.map(task => renderTaskCard(task, false))}
            {filteredTasks.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                    <SearchIcon size={48} className="mb-4 opacity-20" />
                    <p>Задачи не найдены</p>
                </div>
            )}
        </div>
      )}

      {/* --- KANBAN VIEW --- */}
      {viewMode === 'kanban' && (
          <div className="flex-1 overflow-x-auto pb-4">
              <div className="flex gap-6 min-w-[800px] h-full">
                  <div className="flex-1 bg-gray-100 dark:bg-slate-800/50 rounded-2xl flex flex-col h-full min-h-[500px]" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, TaskStatus.NEW)}>
                      <div className="p-4 flex justify-between items-center sticky top-0 bg-gray-100/90 dark:bg-slate-800/90 backdrop-blur-sm z-10 rounded-t-2xl">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><h3 className="font-bold text-gray-700 dark:text-gray-200">Новые</h3><span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 dark:text-gray-400 shadow-sm select-none cursor-default">{filteredTasks.filter(t => t.status === TaskStatus.NEW).length}</span></div>
                          <button onClick={() => { resetForm(); setIsCreateModalOpen(true); }} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Plus size={18} /></button>
                      </div>
                      <div className="p-3 space-y-3 flex-1 overflow-y-auto">{filteredTasks.filter(t => t.status === TaskStatus.NEW).map(task => renderTaskCard(task, true))}</div>
                  </div>
                  <div className="flex-1 bg-yellow-50/50 dark:bg-slate-800/50 rounded-2xl flex flex-col h-full min-h-[500px]" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, TaskStatus.IN_PROGRESS)}>
                      <div className="p-4 flex items-center gap-2 sticky top-0 bg-yellow-50/90 dark:bg-slate-800/90 backdrop-blur-sm z-10 rounded-t-2xl"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><h3 className="font-bold text-gray-700 dark:text-gray-200">В работе</h3><span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 dark:text-gray-400 shadow-sm select-none cursor-default">{filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length}</span></div>
                      <div className="p-3 space-y-3 flex-1 overflow-y-auto">{filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).map(task => renderTaskCard(task, true))}</div>
                  </div>
                  <div className="flex-1 bg-green-50/50 dark:bg-slate-800/50 rounded-2xl flex flex-col h-full min-h-[500px]" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, TaskStatus.COMPLETED)}>
                      <div className="p-4 flex items-center gap-2 sticky top-0 bg-green-50/90 dark:bg-slate-800/90 backdrop-blur-sm z-10 rounded-t-2xl"><div className="w-3 h-3 rounded-full bg-green-500"></div><h3 className="font-bold text-gray-700 dark:text-gray-200">Выполненные</h3><span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 dark:text-gray-400 shadow-sm select-none cursor-default">{filteredTasks.filter(t => t.status === TaskStatus.COMPLETED).length}</span></div>
                      <div className="p-3 space-y-3 flex-1 overflow-y-auto">{filteredTasks.filter(t => t.status === TaskStatus.COMPLETED).map(task => renderTaskCard(task, true))}</div>
                  </div>
              </div>
          </div>
      )}

      {/* ... CREATE / EDIT TASK MODAL ... */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white dark:drop-shadow-sm flex items-center gap-2">{editingTaskId ? <Edit2 size={20}/> : <Plus size={20}/>}{editingTaskId ? 'Карточка заявки' : 'Новая заявка'}</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={24} /></button>
            </div>

            {editingTaskId && (
                <div className="flex border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <button onClick={() => setActiveTab('details')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'details' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}><List size={16} /> Детали</button>
                    <button onClick={() => setActiveTab('comments')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'comments' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}><MessageSquare size={16} /> Чат ({currentEditingTask?.comments?.length || 0})</button>
                    <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'history' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}><History size={16} /> История</button>
                </div>
            )}
            
            <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-slate-900/50">
            {activeTab === 'details' && (
                <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                {editingTaskId && currentEditingTask && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-xl flex items-center justify-between">
                        <div className="text-sm text-blue-800 dark:text-blue-300 font-medium flex items-center gap-2"><Share2 size={16} /> Ссылка для клиента</div>
                        <button type="button" onClick={() => copyPublicLink(currentEditingTask)} className="text-xs bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors font-bold">Скопировать</button>
                    </div>
                )}
                {currentEditingTask && (currentEditingTask.startedAt || currentEditingTask.completedAt) && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl mb-4">
                        <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-3 flex items-center gap-2"><Clock size={14} /> Хронология выполнения</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div><div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><PlayCircle size={10}/> Начало работ</div><div className="text-sm font-bold text-gray-900 dark:text-white">{formatDateTime(currentEditingTask.startedAt)}</div></div>
                            <div><div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><StopCircle size={10}/> Завершение</div><div className="text-sm font-bold text-gray-900 dark:text-white">{currentEditingTask.completedAt ? formatDateTime(currentEditingTask.completedAt) : <span className="text-orange-500">В процессе...</span>}</div></div>
                        </div>
                        {currentEditingTask.completedAt && currentEditingTask.startedAt && (
                            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 flex justify-between items-center"><span className="text-sm text-blue-800 dark:text-blue-300 font-medium">Общее время:</span><span className="text-lg font-bold text-blue-900 dark:text-white flex items-center gap-1"><Timer size={16} className="text-blue-500"/>{formatDuration(currentEditingTask.startedAt, currentEditingTask.completedAt)}</span></div>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Название задачи</label>
                    <input required disabled={user.role === UserRole.ENGINEER} type="text" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder-slate-400 disabled:opacity-70 disabled:bg-gray-100 dark:disabled:bg-slate-800" placeholder="Например: Монтаж GPS на Камаз"/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-bold text-slate-700 dark:text-gray-300">Клиент</label>
                        {user.role !== UserRole.ENGINEER && (
                            <button type="button" onClick={() => { setIsManualClient(!isManualClient); if (!isManualClient) { setNewTask(prev => ({ ...prev, clientId: '', address: '' })); setManualClientName(''); } }} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 transition-colors font-bold">{isManualClient ? <List size={12}/> : <UserPlus size={12}/>}{isManualClient ? 'Выбрать из списка' : 'Ввести вручную'}</button>
                        )}
                    </div>
                    {isManualClient ? (
                        <input required disabled={user.role === UserRole.ENGINEER} type="text" value={manualClientName} onChange={e => setManualClientName(e.target.value)} placeholder="Имя клиента..." className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder-slate-400 disabled:opacity-70"/>
                    ) : (
                        <CustomSelect 
                            value={newTask.clientId}
                            onChange={(val) => {
                                if (val === 'NEW') {
                                    setIsClientModalOpen(true);
                                } else {
                                    const client = clients.find(c => c.id === val);
                                    setNewTask({...newTask, clientId: val, address: client?.address || ''});
                                }
                            }}
                            options={clientOptions}
                            disabled={user.role === UserRole.ENGINEER}
                            placeholder="Выберите клиента"
                            icon={<UserIcon size={16} />}
                        />
                    )}
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Приоритет</label>
                        <CustomSelect value={newTask.priority} onChange={(val) => setNewTask({...newTask, priority: val as any})} options={priorityOptions} disabled={user.role === UserRole.ENGINEER}/>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Адрес объекта</label>
                    <input required disabled={user.role === UserRole.ENGINEER} type="text" value={newTask.address} onChange={e => setNewTask({...newTask, address: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder-slate-400 disabled:opacity-70"/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Срок (Дедлайн)</label>
                    <input required disabled={user.role === UserRole.ENGINEER} type="date" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white disabled:opacity-70"/>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Исполнитель</label>
                        <CustomSelect value={newTask.engineerId} onChange={(val) => setNewTask({...newTask, engineerId: val})} options={engineerOptions} disabled={user.role === UserRole.ENGINEER} placeholder="Не назначен"/>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Описание работ</label>
                    <textarea required disabled={user.role === UserRole.ENGINEER} rows={4} value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder-slate-400 disabled:opacity-70" placeholder="Что именно нужно сделать..."/>
                </div>

                {editingTaskId && currentEditingTask?.attachments && currentEditingTask.attachments.length > 0 && (
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">Фотоотчет</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {currentEditingTask.attachments.map((img, idx) => (
                                <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 cursor-pointer relative group" onClick={() => setPreviewImage(img)}>
                                    <img src={img} alt="Attachment" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center"><Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={20} /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {user.role !== UserRole.ENGINEER && (
                    <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3 border-t border-gray-100 dark:border-slate-700 mt-4">
                        {!editingTaskId && (
                            <button type="button" onClick={handleSaveAndCreateAnother} className="px-4 py-3 bg-white dark:bg-slate-700 border border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/30 font-bold transition-colors flex items-center gap-2 justify-center"><Plus size={18} /><span>Сохранить +</span></button>
                        )}
                        <button type="submit" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:opacity-90 shadow-lg shadow-blue-500/20 font-bold transition-colors">{editingTaskId ? 'Сохранить изменения' : 'Создать'}</button>
                    </div>
                )}
                </form>
            )}

            {/* TAB CONTENT: COMMENTS & HISTORY */}
            {activeTab === 'comments' && currentEditingTask && (
                <div className="flex flex-col h-full">
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {(currentEditingTask.comments && currentEditingTask.comments.length > 0) ? (
                            currentEditingTask.comments.map(comment => (
                                <div key={comment.id} className={`flex gap-3 ${comment.userId === user.id ? 'flex-row-reverse' : ''}`}>
                                    <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700">
                                        {comment.userAvatar ? <img src={comment.userAvatar} alt={comment.userName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-500"><UserIcon size={16}/></div>}
                                    </div>
                                    <div className={`max-w-[80%] space-y-1`}>
                                        <div className={`text-xs text-gray-500 dark:text-gray-400 ${comment.userId === user.id ? 'text-right' : ''}`}><span className="font-bold">{comment.userName}</span> • {new Date(comment.createdAt).toLocaleString()}</div>
                                        <div className={`p-3 rounded-2xl text-sm ${comment.userId === user.id ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-800 dark:text-white rounded-tl-sm'}`}>{comment.text}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-400"><MessageSquare size={48} className="mb-2 opacity-50" /><p>Нет комментариев</p></div>
                        )}
                        <div ref={commentsEndRef} />
                    </div>
                    <form onSubmit={handlePostComment} className="p-3 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 flex gap-2">
                        <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Написать комментарий..." className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white"/>
                        <button type="submit" disabled={!commentText.trim()} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Send size={20} /></button>
                    </form>
                </div>
            )}

            {activeTab === 'history' && currentEditingTask && (
                <div className="p-6">
                    <div className="relative border-l-2 border-gray-200 dark:border-slate-700 ml-3 space-y-6">
                        {(currentEditingTask.history || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(item => (
                            <div key={item.id} className="relative pl-6">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 bg-gray-200 dark:bg-slate-600 rounded-full border-2 border-white dark:border-slate-800"></div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white"><span className="font-bold text-blue-600 dark:text-blue-400">{item.userName}</span> {item.action}</div>
                                {item.details && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 bg-white dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700 inline-block">{item.details}</div>}
                                <div className="text-[10px] text-gray-400 mt-1">{new Date(item.createdAt).toLocaleString()}</div>
                            </div>
                        ))}
                        {(!currentEditingTask.history || currentEditingTask.history.length === 0) && <div className="pl-6 text-gray-400 text-sm italic">История пуста</div>}
                    </div>
                </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* --- REPORT & COMPLETE MODAL (WITH PHOTO UPLOAD) --- */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700 max-h-[90vh] flex flex-col">
             <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-green-50 dark:bg-green-900/20">
                <h2 className="text-lg font-bold text-green-800 dark:text-green-300 flex items-center gap-2"><CheckSquare size={20} /> Завершение работы</h2>
                <button onClick={() => setIsReportModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={24} /></button>
             </div>
             <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Отчет о проделанной работе</label>
                    <textarea autoFocus rows={4} value={reportComment} onChange={e => setReportComment(e.target.value)} placeholder="Опишите, что было сделано..." className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Фотоотчет (Обязательно)</label>
                    <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} capture="environment" />
                    {reportImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-3 animate-in fade-in">
                            {reportImages.map((img, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 group">
                                    <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                    <button onClick={() => removeReportImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><X size={12} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div onClick={() => !isCompressing && fileInputRef.current?.click()} className={`border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-green-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all cursor-pointer active:scale-95 ${isCompressing ? 'opacity-50 cursor-wait' : ''}`}>
                        {isCompressing ? <span className="animate-pulse">Обработка фото...</span> : <><Camera size={32} className="mb-2" /><span className="text-sm font-medium">Нажмите, чтобы добавить фото</span><span className="text-xs opacity-70 mt-1">До 10 фото</span></>}
                    </div>
                </div>
                <div className="pt-2">
                    <button onClick={handleCompleteTask} disabled={!reportComment.trim() || isCompressing} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg hover:opacity-90 shadow-md shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"><Save size={20} /> Отправить отчет и закрыть</button>
                </div>
             </div>
           </div>
        </div>
      )}

      {previewImage && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-pointer" onClick={() => setPreviewImage(null)}>
              <img src={previewImage} className="max-w-full max-h-full rounded shadow-2xl" alt="Full view" />
              <button className="absolute top-4 right-4 text-white hover:text-gray-300"><X size={32} /></button>
          </div>
      )}

      {isClientModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col border border-gray-100 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white dark:drop-shadow-sm">Новый клиент</h2>
              <button onClick={() => setIsClientModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateClient} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название / ФИО</label><input required autoFocus type="text" value={newClientFormData.name} onChange={e => setNewClientFormData({...newClientFormData, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder-slate-400" placeholder="Например: ТОО Ромашка"/></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип клиента</label>
                <div className="grid grid-cols-2 gap-2">{[ClientType.COMPANY, ClientType.INDIVIDUAL].map((type) => (<button key={type} type="button" onClick={() => setNewClientFormData({...newClientFormData, type})} className={`py-3 px-1 text-xs sm:text-sm rounded-2xl border transition-colors font-bold ${newClientFormData.type === type ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 shadow-sm' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>{type}</button>))}</div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Телефон</label><div className="relative"><Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" /><input required type="tel" value={newClientFormData.phone} onChange={e => setNewClientFormData({...newClientFormData, phone: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder-slate-400" placeholder="+7 (7xx) xxx xx xx"/></div></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Адрес (основной)</label><div className="relative"><MapPin size={16} className="absolute left-4 top-4 text-slate-400 dark:text-gray-500" /><textarea rows={2} value={newClientFormData.address} onChange={e => setNewClientFormData({...newClientFormData, address: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder-slate-400" placeholder="Город, Улица, Дом..."/></div></div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsClientModalOpen(false)} className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold">Отмена</button><button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:opacity-90 shadow-md dark:shadow-blue-900/30 font-bold transition-colors flex items-center justify-center gap-2"><Save size={18} /> Создать</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
