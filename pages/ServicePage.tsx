
import React, { useState } from 'react';
import { User, GpsTracker, Client, ClientType, CmsObject, MaintenanceObject, UserRole, MonthlyService, Task, TaskStatus } from '../types';
import { GPS_TRACKERS, CMS_OBJECTS, MAINTENANCE_OBJECTS } from '../mockData';
import { Check, X, Plus, Satellite, Search, Smartphone, Barcode, Save, Database, DollarSign, Shield, Home, FileText, Wrench, Video, BellRing, Eye, Radio, Lock, User as UserIcon, AlertTriangle, ChevronDown } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../components/Toast';
import { CustomSelect, SelectOption } from '../components/CustomSelect';

interface ServicePageProps {
  user: User;
  clients: Client[];
  monthlyServices: MonthlyService[];
  tasks: Task[];
  onUpdateTasks: (tasks: Task[]) => void;
  onUpdateServices: (services: MonthlyService[]) => void;
  onAddClient: (client: Client) => void;
}

type ServiceSection = 'gps' | 'maintenance' | 'cou';
type GpsTab = 'payments' | 'trackers';

export const ServicePage: React.FC<ServicePageProps> = ({ user, clients, monthlyServices, tasks, onUpdateTasks, onAddClient }) => {
  const { addToast } = useToast();

  // Navigation State
  const [activeSection, setActiveSection] = useState<ServiceSection>('gps');
  const [activeGpsTab, setActiveGpsTab] = useState<GpsTab>('payments');
  
  // Data State with Persistence
  const [trackers, setTrackers] = useLocalStorage<GpsTracker[]>('crm_trackers', GPS_TRACKERS);
  const [cmsObjects, setCmsObjects] = useLocalStorage<CmsObject[]>('crm_cms_objects', CMS_OBJECTS);
  const [maintenanceObjects, setMaintenanceObjects] = useLocalStorage<MaintenanceObject[]>('crm_maintenance_objects', MAINTENANCE_OBJECTS);
  
  // Trackers Modal State
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
  const [trackerSearch, setTrackerSearch] = useState('');
  
  // CMS Modal State
  const [isCmsModalOpen, setIsCmsModalOpen] = useState(false);
  const [cmsSearch, setCmsSearch] = useState('');

  // Maintenance Modal State
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceSearch, setMaintenanceSearch] = useState('');

  // --- FULL CLIENT CREATION MODAL STATE ---
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientFormSource, setClientFormSource] = useState<'tracker' | 'cms' | 'maintenance' | null>(null);
  const [newClientFormData, setNewClientFormData] = useState({
    name: '',
    type: ClientType.COMPANY,
    phone: '',
    address: ''
  });
  
  // New Tracker Form State
  const [newTracker, setNewTracker] = useState({
    model: '',
    imei: '',
    simNumber: '',
    clientId: ''
  });

  // New CMS Object Form State
  const [newCmsObject, setNewCmsObject] = useState({
    name: '',
    address: '',
    contractNumber: '',
    monthlyFee: '',
    clientId: ''
  });

  // New Maintenance Object Form State
  const [newMaintenanceObject, setNewMaintenanceObject] = useState({
    type: 'CCTV' as 'CCTV' | 'APS' | 'OPS' | 'ACCESS',
    name: '',
    address: '',
    monthlyFee: '',
    clientId: '',
    startDate: new Date().toISOString().split('T')[0] // Default to today
  });

  // Access Control
  if (user.role === UserRole.ENGINEER) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 bg-white dark:bg-slate-800 rounded-3xl m-8 shadow-sm">
        <Lock size={48} className="mb-4 text-slate-400" />
        <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white dark:drop-shadow-sm">Доступ ограничен</h2>
        <p className="text-slate-600 dark:text-gray-300">Инженеры не имеют доступа к разделу сервиса и биллинга.</p>
      </div>
    );
  }

  // --- HANDLER: CREATE NEW CLIENT ---
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
    
    // Add to global state
    onAddClient(newClient);
    addToast('Клиент успешно создан', 'success');
    
    // Auto-select in the source form
    if (clientFormSource === 'tracker') {
        setNewTracker(prev => ({ ...prev, clientId: newClient.id }));
    } else if (clientFormSource === 'cms') {
        setNewCmsObject(prev => ({ ...prev, clientId: newClient.id }));
    } else if (clientFormSource === 'maintenance') {
        setNewMaintenanceObject(prev => ({ ...prev, clientId: newClient.id }));
    }

    // Close modal and reset form
    setIsClientModalOpen(false);
    setNewClientFormData({
        name: '',
        type: ClientType.COMPANY,
        phone: '',
        address: ''
    });
  };

  const openClientModal = (source: 'tracker' | 'cms' | 'maintenance') => {
      setClientFormSource(source);
      setNewClientFormData({
        name: '',
        type: ClientType.COMPANY,
        phone: '',
        address: ''
      });
      setIsClientModalOpen(true);
  };

  // --- ADD TRACKER ---
  const handleAddTracker = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === newTracker.clientId);
    
    const createdTracker: GpsTracker = {
      id: `gps${Date.now()}`,
      model: newTracker.model,
      imei: newTracker.imei,
      simNumber: newTracker.simNumber,
      clientId: newTracker.clientId,
      clientName: client ? client.name : 'Неизвестно',
      status: 'Active',
      installDate: new Date().toISOString().split('T')[0]
    };

    setTrackers([createdTracker, ...trackers]);
    addToast('Трекер добавлен в базу', 'success');
    setIsTrackerModalOpen(false);
    resetForms();
  };

  // --- ADD CMS OBJECT ---
  const handleAddCmsObject = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === newCmsObject.clientId);

    const createdObject: CmsObject = {
        id: `cms${Date.now()}`,
        name: newCmsObject.name,
        address: newCmsObject.address,
        contractNumber: newCmsObject.contractNumber,
        monthlyFee: parseInt(newCmsObject.monthlyFee) || 0,
        clientId: newCmsObject.clientId,
        clientName: client ? client.name : 'Неизвестно',
        status: 'Active',
        connectionDate: new Date().toISOString().split('T')[0]
    };

    setCmsObjects([createdObject, ...cmsObjects]);
    addToast('Объект ЦОУ создан', 'success');
    setIsCmsModalOpen(false);
    resetForms();
  };

  // --- ADD MAINTENANCE OBJECT ---
  const handleAddMaintenanceObject = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === newMaintenanceObject.clientId);
    const objectId = `m${Date.now()}`;

    // 1. Create the Object
    const createdObject: MaintenanceObject = {
      id: objectId,
      type: newMaintenanceObject.type,
      name: newMaintenanceObject.name,
      address: newMaintenanceObject.address,
      monthlyFee: parseInt(newMaintenanceObject.monthlyFee) || 0,
      clientId: newMaintenanceObject.clientId,
      clientName: client ? client.name : 'Неизвестно',
      status: 'Active',
      lastCheckDate: newMaintenanceObject.startDate // Initial "last check" is start date effectively or null
    };

    setMaintenanceObjects([createdObject, ...maintenanceObjects]);

    // 2. Create the First Monthly Task Automatically
    const sysNameMap: Record<string, string> = {
        'CCTV': 'Видеонаблюдение',
        'APS': 'АПС',
        'OPS': 'ОПС',
        'ACCESS': 'СКУД'
    };
    const sysName = sysNameMap[newMaintenanceObject.type] || newMaintenanceObject.type;
    
    const initialTask: Task = {
        id: `t_maint_${Date.now()}`,
        title: `ТО: ${sysName} - ${newMaintenanceObject.name}`,
        clientName: client ? client.name : 'Неизвестно',
        address: newMaintenanceObject.address,
        deadline: newMaintenanceObject.startDate, // User selected date
        status: TaskStatus.NEW,
        priority: 'Medium',
        // Description without fee info for Engineers safety
        description: `Ежемесячное техническое обслуживание объекта.\nТип системы: ${sysName}.`,
        isRecurring: true, // FLAG FOR RECURRING
        maintenanceObjectId: objectId
    };

    onUpdateTasks([initialTask, ...tasks]);
    addToast('Объект принят на ТО, заявка создана', 'success');

    setIsMaintenanceModalOpen(false);
    resetForms();
  };

  const resetForms = () => {
    setNewTracker({ model: '', imei: '', simNumber: '', clientId: '' });
    setNewCmsObject({ name: '', address: '', contractNumber: '', monthlyFee: '', clientId: '' });
    setNewMaintenanceObject({ type: 'CCTV', name: '', address: '', monthlyFee: '', clientId: '', startDate: new Date().toISOString().split('T')[0] });
  };

  const filteredTrackers = trackers.filter(t => 
    t.clientName.toLowerCase().includes(trackerSearch.toLowerCase()) || 
    t.imei.includes(trackerSearch) ||
    t.model.toLowerCase().includes(trackerSearch.toLowerCase())
  );

  const filteredCmsObjects = cmsObjects.filter(o => 
    o.clientName.toLowerCase().includes(cmsSearch.toLowerCase()) ||
    o.name.toLowerCase().includes(cmsSearch.toLowerCase()) ||
    o.address.toLowerCase().includes(cmsSearch.toLowerCase())
  );

  const filteredMaintenanceObjects = maintenanceObjects.filter(o => 
    o.clientName.toLowerCase().includes(maintenanceSearch.toLowerCase()) ||
    o.name.toLowerCase().includes(maintenanceSearch.toLowerCase()) ||
    o.address.toLowerCase().includes(maintenanceSearch.toLowerCase())
  );

  // Helper for Maintenance Icons
  const getMaintenanceIcon = (type: string) => {
    switch(type) {
        case 'CCTV': return <Video size={16} className="text-blue-500" />;
        case 'APS': return <BellRing size={16} className="text-red-500" />;
        case 'OPS': return <Shield size={16} className="text-orange-500" />;
        case 'ACCESS': return <Eye size={16} className="text-purple-500" />;
        default: return <Wrench size={16} className="text-gray-500" />;
    }
  };

  // --- OPTIONS ---
  const clientOptions: SelectOption[] = [
      { value: 'NEW', label: '+ Создать нового клиента', isAction: true },
      ...clients.map(c => ({ value: c.id, label: c.name }))
  ];

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white dark:drop-shadow-sm">Обслуживание</h1>
          <p className="text-slate-600 dark:text-gray-400 font-medium">Управление парком GPS, объектами ЦОУ и ТО</p>
        </div>
        
        {/* Actions based on current section */}
        {activeSection === 'gps' && activeGpsTab === 'trackers' && (
             <button 
             onClick={() => { resetForms(); setIsTrackerModalOpen(true); }}
             className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-colors shadow-lg shadow-blue-500/30 font-bold"
           >
             <Plus size={18} />
             <span>Добавить трекер</span>
           </button>
        )}
        
        {activeSection === 'cou' && (
             <button 
             onClick={() => { resetForms(); setIsCmsModalOpen(true); }}
             className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-colors shadow-lg shadow-blue-500/30 font-bold"
           >
             <Plus size={18} />
             <span>Добавить объект</span>
           </button>
        )}

        {activeSection === 'maintenance' && (
             <button 
             onClick={() => { resetForms(); setIsMaintenanceModalOpen(true); }}
             className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-colors shadow-lg shadow-blue-500/30 font-bold"
           >
             <Plus size={18} />
             <span>Добавить на ТО</span>
           </button>
        )}
      </div>

      {/* TOP LEVEL NAVIGATION (SECTIONS) */}
      <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl flex overflow-x-auto gap-2 shadow-sm border border-gray-100 dark:border-slate-700">
        <button 
          onClick={() => setActiveSection('gps')}
          className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeSection === 'gps' 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20' 
              : 'text-slate-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Radio size={18} />
            GPS Мониторинг
          </div>
        </button>
        <button 
          onClick={() => setActiveSection('cou')}
          className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeSection === 'cou' 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20' 
              : 'text-slate-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Shield size={18} />
            Объекты ЦОУ
          </div>
        </button>
        <button 
          onClick={() => setActiveSection('maintenance')}
          className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeSection === 'maintenance' 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20' 
              : 'text-slate-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Wrench size={18} />
            Тех. Обслуживание
          </div>
        </button>
      </div>

      {/* SECOND LEVEL NAVIGATION (GPS ONLY) */}
      {activeSection === 'gps' && (
        <div className="flex gap-2 p-1 bg-white dark:bg-slate-800 rounded-xl w-fit border border-gray-100 dark:border-slate-700">
          <button 
            onClick={() => setActiveGpsTab('payments')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeGpsTab === 'payments' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-sm' 
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <DollarSign size={16} />
              Платежи и Абонплата
            </div>
          </button>
          <button 
            onClick={() => setActiveGpsTab('trackers')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeGpsTab === 'trackers' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-sm' 
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database size={16} />
              База трекеров
            </div>
          </button>
        </div>
      )}

      {/* --- SECTION: GPS CONTENT --- */}
      {activeSection === 'gps' && (
        <>
            {/* GPS TAB: PAYMENTS */}
            {activeGpsTab === 'payments' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-700/50 text-slate-700 dark:text-white font-bold border-b border-gray-100 dark:border-slate-700">
                    <tr>
                        <th className="px-6 py-5">Клиент</th>
                        <th className="px-6 py-5">Объект</th>
                        <th className="px-6 py-5">Услуга</th>
                        <th className="px-6 py-5">Сумма</th>
                        <th className="px-6 py-5">Статус</th>
                        <th className="px-6 py-5">Действия</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {monthlyServices.map(service => (
                        <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-white dark:drop-shadow-sm">{service.clientName}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-gray-300">{service.objectName}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${service.serviceType === 'GPS' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'}`}>
                            {service.serviceType}
                            </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{service.amount} ₸</td>
                        <td className="px-6 py-4">
                            {service.status === 'Done' ? (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-extrabold uppercase bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-lg w-fit">
                                <Check size={14} /> Оплачено
                            </span>
                            ) : (
                            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs font-extrabold uppercase bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-lg w-fit">
                                <AlertTriangle size={14} /> Ожидание
                            </span>
                            )}
                        </td>
                        <td className="px-6 py-4 flex gap-2">
                            {service.status === 'Pending' && (
                            <>
                                <button className="p-2 bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400 rounded-lg transition-colors" title="Подтвердить оплату">
                                    <Check size={16} />
                                </button>
                                <button className="p-2 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg transition-colors" title="Отключить">
                                    <X size={16} />
                                </button>
                            </>
                            )}
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}

            {/* GPS TAB: TRACKERS */}
            {activeGpsTab === 'trackers' && (
                <div className="space-y-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                        type="text" 
                        value={trackerSearch}
                        onChange={(e) => setTrackerSearch(e.target.value)}
                        placeholder="Поиск по IMEI, Модели или Клиенту..." 
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 text-slate-800 dark:text-white transition-colors"
                    />
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm">
                    <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-700/50 text-slate-700 dark:text-white font-bold border-b border-gray-100 dark:border-slate-700">
                        <tr>
                        <th className="px-6 py-5">Модель</th>
                        <th className="px-6 py-5">IMEI</th>
                        <th className="px-6 py-5">SIM-карта</th>
                        <th className="px-6 py-5">Клиент (Владелец)</th>
                        <th className="px-6 py-5">Дата установки</th>
                        <th className="px-6 py-5">Статус</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {filteredTrackers.map(tracker => (
                        <tr key={tracker.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-white flex items-center gap-2 dark:drop-shadow-sm">
                                <Satellite size={16} className="text-blue-500" />
                                {tracker.model}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-gray-300">{tracker.imei}</td>
                            <td className="px-6 py-4 text-slate-600 dark:text-gray-300">{tracker.simNumber}</td>
                            <td className="px-6 py-4">
                                <span className="font-semibold text-slate-800 dark:text-white">{tracker.clientName}</span>
                            </td>
                            <td className="px-6 py-4 text-slate-500 dark:text-gray-400">{tracker.installDate}</td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-bold">
                                    {tracker.status}
                                </span>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                </div>
            )}
        </>
      )}

      {/* --- SECTION: COU OBJECTS --- */}
      {activeSection === 'cou' && (
        <div className="space-y-6">
          <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                  type="text" 
                  value={cmsSearch}
                  onChange={(e) => setCmsSearch(e.target.value)}
                  placeholder="Поиск по объекту, клиенту или адресу..." 
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 text-slate-800 dark:text-white transition-colors"
              />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50 text-slate-700 dark:text-white font-bold border-b border-gray-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-5">Объект</th>
                  <th className="px-6 py-5">Адрес</th>
                  <th className="px-6 py-5">Клиент</th>
                  <th className="px-6 py-5">Договор</th>
                  <th className="px-6 py-5">Абон. плата</th>
                  <th className="px-6 py-5">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {filteredCmsObjects.map(obj => (
                  <tr key={obj.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-white flex items-center gap-2 dark:drop-shadow-sm">
                        <Home size={16} className="text-indigo-500" />
                        {obj.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-gray-300">{obj.address}</td>
                    <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 dark:text-white">{obj.clientName}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-gray-400 flex items-center gap-1 font-mono text-xs">
                        <FileText size={14} />
                        {obj.contractNumber}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{obj.monthlyFee} ₸</td>
                    <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${obj.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {obj.status === 'Active' ? 'На охране' : 'Приостановлен'}
                        </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SECTION: MAINTENANCE --- */}
      {activeSection === 'maintenance' && (
        <div className="space-y-6">
          <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                  type="text" 
                  value={maintenanceSearch}
                  onChange={(e) => setMaintenanceSearch(e.target.value)}
                  placeholder="Поиск по системе, клиенту или адресу..." 
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-slate-400 text-slate-800 dark:text-white transition-colors"
              />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50 text-slate-700 dark:text-white font-bold border-b border-gray-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-5">Система</th>
                  <th className="px-6 py-5">Объект / Адрес</th>
                  <th className="px-6 py-5">Клиент</th>
                  <th className="px-6 py-5">Стоимость ТО</th>
                  <th className="px-6 py-5">Посл. проверка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {filteredMaintenanceObjects.map(obj => (
                  <tr key={obj.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-white flex items-center gap-2 dark:drop-shadow-sm">
                        {getMaintenanceIcon(obj.type)}
                        <span>{obj.type === 'CCTV' ? 'Видео' : obj.type === 'APS' ? 'АПС' : obj.type === 'OPS' ? 'ОПС' : 'СКУД'}</span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{obj.name}</div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">{obj.address}</div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="font-medium text-slate-800 dark:text-gray-300">{obj.clientName}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{obj.monthlyFee} ₸</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-gray-400">
                        {obj.lastCheckDate}
                    </td>
                  </tr>
                ))}
                {filteredMaintenanceObjects.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-gray-400 font-medium">
                            Объекты на обслуживании не найдены
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ... MODALS START HERE (TRACKER, CMS, MAINTENANCE, CLIENT) ... */}
      
      {isTrackerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col border border-white/50 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 rounded-t-3xl">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white dark:drop-shadow-sm">Новый GPS трекер</h2>
              <button onClick={() => setIsTrackerModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddTracker} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Модель оборудования</label>
                <div className="relative">
                    <Satellite size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                    <input required type="text" value={newTracker.model} onChange={e => setNewTracker({...newTracker, model: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder-slate-400" placeholder="Например: Teltonika FMB920"/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">IMEI</label>
                <div className="relative">
                    <Barcode size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                    <input required type="text" value={newTracker.imei} onChange={e => setNewTracker({...newTracker, imei: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder-slate-400" placeholder="15-значный код" maxLength={15}/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">SIM-карта (Номер)</label>
                <div className="relative">
                    <Smartphone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                    <input required type="text" value={newTracker.simNumber} onChange={e => setNewTracker({...newTracker, simNumber: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder-slate-400" placeholder="+7 700 000 00 00"/>
                </div>
              </div>

              {/* CLIENT SELECTION */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Владелец (Клиент)</label>
                <CustomSelect value={newTracker.clientId} onChange={(val) => { if (val === 'NEW') { openClientModal('tracker'); } else { setNewTracker(prev => ({...prev, clientId: val})); } }} options={clientOptions} placeholder="Выберите клиента" icon={<UserIcon size={16} />} />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsTrackerModalOpen(false)} className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold">Отмена</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:opacity-90 shadow-lg shadow-blue-500/30 font-bold transition-colors flex items-center justify-center gap-2"><Save size={18} /> Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD CMS OBJECT MODAL --- */}
      {isCmsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col border border-white/50 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 rounded-t-3xl">
              <h2 className="text-xl font-extrabold text-indigo-900 dark:text-white flex items-center gap-2 dark:drop-shadow-sm"><Shield size={24} /> Новый объект ЦОУ</h2>
              <button onClick={() => setIsCmsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleAddCmsObject} className="p-6 space-y-4">
              <div><label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Название объекта</label><input required type="text" value={newCmsObject.name} onChange={e => setNewCmsObject({...newCmsObject, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder-slate-400" placeholder="Магазин 'Продукты', Дом"/></div>
              <div><label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Адрес объекта</label><input required type="text" value={newCmsObject.address} onChange={e => setNewCmsObject({...newCmsObject, address: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder-slate-400" placeholder="Улица, дом..."/></div>
              <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">№ Договора</label><input required type="text" value={newCmsObject.contractNumber} onChange={e => setNewCmsObject({...newCmsObject, contractNumber: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder-slate-400" placeholder="123-А"/></div>
                  <div><label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Абон. плата (₸)</label><input required type="number" value={newCmsObject.monthlyFee} onChange={e => setNewCmsObject({...newCmsObject, monthlyFee: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder-slate-400" placeholder="5000"/></div>
              </div>
              <div><label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Владелец (Клиент)</label><CustomSelect value={newCmsObject.clientId} onChange={(val) => { if (val === 'NEW') { openClientModal('cms'); } else { setNewCmsObject(prev => ({...prev, clientId: val})); } }} options={clientOptions} placeholder="Выберите клиента" icon={<UserIcon size={16} />} /></div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsCmsModalOpen(false)} className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold">Отмена</button><button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:opacity-90 shadow-lg shadow-indigo-500/30 font-bold transition-colors flex items-center justify-center gap-2"><Save size={18} /> Сохранить</button></div>
            </form>
          </div>
        </div>
      )}

       {/* --- ADD MAINTENANCE OBJECT MODAL --- */}
       {isMaintenanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col border border-white/50 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-orange-50/50 dark:bg-orange-900/20 rounded-t-3xl">
              <h2 className="text-xl font-extrabold text-orange-900 dark:text-white flex items-center gap-2 dark:drop-shadow-sm"><Wrench size={24} /> На обслуживание (ТО)</h2>
              <button onClick={() => setIsMaintenanceModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleAddMaintenanceObject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Тип системы</label>
                <div className="grid grid-cols-2 gap-2">
                    {['CCTV', 'APS', 'OPS', 'ACCESS'].map((type) => (<button key={type} type="button" onClick={() => setNewMaintenanceObject({...newMaintenanceObject, type: type as any})} className={`py-3 px-3 rounded-2xl border text-sm font-bold transition-all ${newMaintenanceObject.type === type ? 'bg-orange-100 border-orange-500 text-orange-800 shadow-sm' : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 text-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{type === 'CCTV' ? 'Видеонаблюдение' : type === 'APS' ? 'АПС (Пожарная)' : type === 'OPS' ? 'ОПС (Охранная)' : 'СКУД'}</button>))}
                </div>
              </div>
              <div><label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Название объекта</label><input required type="text" value={newMaintenanceObject.name} onChange={e => setNewMaintenanceObject({...newMaintenanceObject, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-slate-900 dark:text-white placeholder-slate-400" placeholder="Офис, Склад, Магазин"/></div>
              <div><label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Адрес</label><input required type="text" value={newMaintenanceObject.address} onChange={e => setNewMaintenanceObject({...newMaintenanceObject, address: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-slate-900 dark:text-white placeholder-slate-400" placeholder="Адрес установки"/></div>
              <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Стоимость ТО (₸)</label><input required type="number" value={newMaintenanceObject.monthlyFee} onChange={e => setNewMaintenanceObject({...newMaintenanceObject, monthlyFee: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-slate-900 dark:text-white placeholder-slate-400" placeholder="15000"/></div>
                  <div><label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Дата начала</label><div className="relative"><input required type="date" value={newMaintenanceObject.startDate} onChange={e => setNewMaintenanceObject({...newMaintenanceObject, startDate: e.target.value})} className="w-full pl-4 pr-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-slate-900 dark:text-white"/></div></div>
              </div>
              <div><label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Владелец (Клиент)</label><CustomSelect value={newMaintenanceObject.clientId} onChange={(val) => { if (val === 'NEW') { openClientModal('maintenance'); } else { setNewMaintenanceObject(prev => ({...prev, clientId: val})); } }} options={clientOptions} placeholder="Выберите клиента" icon={<UserIcon size={16} />} /></div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsMaintenanceModalOpen(false)} className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold">Отмена</button><button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:opacity-90 shadow-lg shadow-orange-500/30 font-bold transition-colors flex items-center justify-center gap-2"><Save size={18} /> Сохранить</button></div>
            </form>
          </div>
        </div>
      )}

      {/* --- CREATE CLIENT MODAL (SHARED) --- */}
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
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Телефон</label><div className="relative"><Smartphone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" /><input required type="tel" value={newClientFormData.phone} onChange={e => setNewClientFormData({...newClientFormData, phone: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder-slate-400" placeholder="+7 (7xx) xxx xx xx"/></div></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Адрес (основной)</label><div className="relative"><Home size={16} className="absolute left-4 top-4 text-slate-400 dark:text-gray-500" /><textarea rows={2} value={newClientFormData.address} onChange={e => setNewClientFormData({...newClientFormData, address: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder-slate-400" placeholder="Город, Улица, Дом..."/></div></div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsClientModalOpen(false)} className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold">Отмена</button><button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:opacity-90 shadow-md dark:shadow-blue-900/30 font-bold transition-colors flex items-center justify-center gap-2"><Save size={18} /> Создать</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
