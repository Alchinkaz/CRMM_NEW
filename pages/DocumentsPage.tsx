
import React, { useState, useRef, useEffect } from 'react';
import { User, Client, ClientType, ServiceDocument, UserRole } from '../types';
import { DOCUMENTS } from '../mockData';
import { Search, Plus, FileText, UploadCloud, X, ChevronDown, Download, Trash2, Save, Phone, MapPin, FilePlus, CreditCard, CheckSquare, Truck, RefreshCw, Shield, Printer } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../components/Toast';

interface DocumentsPageProps {
  user: User;
  clients: Client[];
  onAddClient: (client: Client) => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ user, clients, onAddClient }) => {
  const { addToast } = useToast();
  
  // Data State with Persistence
  const [documents, setDocuments] = useLocalStorage<ServiceDocument[]>('crm_documents', DOCUMENTS);
  
  // UI States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modals State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateTypeModalOpen, setIsCreateTypeModalOpen] = useState(false);
  
  const [documentSearch, setDocumentSearch] = useState('');
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // New Document Form State (For Upload)
  const [newDocument, setNewDocument] = useState({
      title: '',
      category: 'Contract' as ServiceDocument['category'],
      clientId: '',
      fileName: '',
      fileSize: ''
  });

  // Client Creation Modal State (Shared Logic)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClientFormData, setNewClientFormData] = useState({
    name: '',
    type: ClientType.COMPANY,
    phone: '',
    address: ''
  });

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- DOCUMENT LOGIC ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setNewDocument(prev => ({
              ...prev,
              fileName: file.name,
              fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB'
          }));
      }
  };

  const handleAddDocument = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newDocument.fileName) {
          addToast('Пожалуйста, выберите файл', 'error');
          return;
      }

      const client = clients.find(c => c.id === newDocument.clientId);
      
      const doc: ServiceDocument = {
          id: `doc_${Date.now()}`,
          title: newDocument.title,
          category: newDocument.category,
          clientId: newDocument.clientId,
          clientName: client?.name,
          date: new Date().toISOString().split('T')[0],
          fileName: newDocument.fileName,
          fileSize: newDocument.fileSize
      };

      setDocuments(prev => [doc, ...prev]);
      addToast('Документ сохранен', 'success');
      setIsUploadModalOpen(false);
      setNewDocument({ title: '', category: 'Contract', clientId: '', fileName: '', fileSize: '' });
  };

  const handleCreateDocumentByType = (type: string, titlePrefix: string) => {
      // Mock creation of a document
      const doc: ServiceDocument = {
          id: `doc_gen_${Date.now()}`,
          title: `${titlePrefix} №${Math.floor(Math.random() * 1000)}`,
          category: 'Other', // In real app, map to specific categories
          date: new Date().toISOString().split('T')[0],
          fileName: `${titlePrefix}_auto.pdf`,
          fileSize: '0.5 MB'
      };
      
      setDocuments(prev => [doc, ...prev]);
      addToast(`Документ "${titlePrefix}" сформирован`, 'success');
      setIsCreateTypeModalOpen(false);
  };

  const deleteDocument = (id: string) => {
      if (window.confirm('Вы уверены, что хотите удалить этот документ?')) {
          setDocuments(prev => prev.filter(d => d.id !== id));
          addToast('Документ удален', 'success');
      }
  };

  const filteredDocuments = documents.filter(d => 
      d.title.toLowerCase().includes(documentSearch.toLowerCase()) ||
      d.clientName?.toLowerCase().includes(documentSearch.toLowerCase()) ||
      d.fileName.toLowerCase().includes(documentSearch.toLowerCase())
  );

  // --- CLIENT MODAL LOGIC (Simplified for this page) ---
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
    
    onAddClient(newClient);
    addToast('Клиент успешно создан', 'success');
    
    // Auto-select
    setNewDocument(prev => ({ ...prev, clientId: newClient.id }));

    setIsClientModalOpen(false);
    setNewClientFormData({
        name: '',
        type: ClientType.COMPANY,
        phone: '',
        address: ''
    });
  };

  const docTypes = [
      { id: 'kp', label: 'Коммерческое предложение', icon: FileText, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
      { id: 'invoice', label: 'Счет на оплату', icon: CreditCard, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
      { id: 'avr', label: 'АВР (Акт работ)', icon: CheckSquare, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
      { id: 'waybill', label: 'Накладная', icon: Truck, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
      { id: 'reconciliation', label: 'Акт сверки', icon: RefreshCw, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30' },
      { id: 'contract', label: 'Договор', icon: Shield, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' },
  ];

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white dark:drop-shadow-sm">Документооборот</h1>
          <p className="text-slate-600 dark:text-gray-400 font-medium">Договоры, акты, инструкции</p>
        </div>
        
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-colors shadow-lg shadow-blue-500/30 font-bold"
            >
                <Plus size={18} />
                <span>Документ</span>
                <ChevronDown size={16} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                    <button 
                        onClick={() => { setIsCreateTypeModalOpen(true); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-slate-700 dark:text-gray-200 font-medium"
                    >
                        <FilePlus size={18} className="text-blue-500" />
                        Создать документ
                    </button>
                    <button 
                        onClick={() => { setIsUploadModalOpen(true); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-slate-700 dark:text-gray-200 font-medium border-t border-gray-100 dark:border-slate-700"
                    >
                        <UploadCloud size={18} className="text-green-500" />
                        Загрузить документ
                    </button>
                </div>
            )}
        </div>
      </div>

      <div className="space-y-6 flex-1 flex flex-col">
          <div className="relative max-w-md shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                  type="text" 
                  value={documentSearch}
                  onChange={(e) => setDocumentSearch(e.target.value)}
                  placeholder="Поиск документа, клиента или файла..." 
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 text-slate-800 dark:text-white transition-colors"
              />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm flex-1">
              <div className="overflow-x-auto h-full">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-700/50 text-slate-700 dark:text-white font-bold border-b border-gray-100 dark:border-slate-700 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-5">Название</th>
                            <th className="px-6 py-5">Тип</th>
                            <th className="px-6 py-5">Клиент</th>
                            <th className="px-6 py-5">Дата</th>
                            <th className="px-6 py-5">Файл</th>
                            <th className="px-6 py-5 text-center">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {filteredDocuments.map(doc => (
                            <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-800 dark:text-white flex items-center gap-2 dark:drop-shadow-sm">
                                    <FileText size={16} className="text-blue-500" />
                                    {doc.title}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                        doc.category === 'Contract' ? 'bg-indigo-100 text-indigo-700' : 
                                        doc.category === 'Act' ? 'bg-green-100 text-green-700' :
                                        doc.category === 'Manual' ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 text-gray-700'
                                    } dark:bg-opacity-20 dark:text-opacity-90`}>
                                        {doc.category === 'Contract' ? 'Договор' : doc.category === 'Act' ? 'Акт' : doc.category === 'Invoice' ? 'Счет' : doc.category === 'Manual' ? 'Инструкция' : 'Прочее'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 dark:text-gray-300">
                                    {doc.clientName || 'Общий документ'}
                                </td>
                                <td className="px-6 py-4 text-slate-500 dark:text-gray-400 font-mono text-xs">
                                    {doc.date}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs text-slate-500 dark:text-gray-400">
                                        <div className="font-semibold text-slate-700 dark:text-gray-300 truncate max-w-[150px]">{doc.fileName}</div>
                                        {doc.fileSize}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                            <Download size={16} />
                                        </button>
                                        <button 
                                            onClick={() => deleteDocument(doc.id)}
                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredDocuments.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-gray-500">
                                    <FileText size={48} className="mx-auto mb-2 opacity-20" />
                                    <p>Документы не найдены</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
              </div>
          </div>
      </div>

      {/* --- MODAL: CREATE DOCUMENT TYPE SELECTION --- */}
      {isCreateTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col border border-white/50 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-blue-50/50 dark:bg-blue-900/20 rounded-t-3xl">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2 dark:drop-shadow-sm">
                  <FilePlus size={24} className="text-blue-600 dark:text-blue-400" />
                  Создание документа
              </h2>
              <button onClick={() => setIsCreateTypeModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
                <p className="text-sm text-slate-500 dark:text-gray-400 mb-6 text-center">
                    Выберите тип документа для автоматической генерации. <br/>Система создаст черновик на основе шаблона.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {docTypes.map(doc => {
                        const Icon = doc.icon;
                        return (
                            <button
                                key={doc.id}
                                onClick={() => handleCreateDocumentByType(doc.id, doc.label)}
                                className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gray-50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-blue-200 dark:hover:border-slate-600 hover:shadow-lg transition-all group gap-3"
                            >
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${doc.color}`}>
                                    <Icon size={28} />
                                </div>
                                <span className="font-bold text-slate-700 dark:text-gray-200 text-sm text-center">{doc.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: UPLOAD DOCUMENT --- */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col border border-white/50 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 rounded-t-3xl">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2 dark:drop-shadow-sm">
                  <UploadCloud size={24} />
                  Загрузка документа
              </h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddDocument} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Название документа</label>
                <input 
                  required
                  type="text" 
                  value={newDocument.title}
                  onChange={e => setNewDocument({...newDocument, title: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                  placeholder="Например: Договор №123"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Категория</label>
                <div className="relative">
                    <select 
                        value={newDocument.category}
                        onChange={e => setNewDocument({...newDocument, category: e.target.value as any})}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
                    >
                        <option value="Contract">Договор</option>
                        <option value="Act">Акт выполненных работ</option>
                        <option value="Invoice">Счет на оплату</option>
                        <option value="Manual">Инструкция / Тех. док.</option>
                        <option value="Other">Прочее</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Client Select */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Клиент (если применимо)</label>
                <div className="relative">
                    <select 
                        value={newDocument.clientId}
                        onChange={e => {
                            const val = e.target.value;
                            if (val === 'NEW') {
                                setIsClientModalOpen(true);
                            } else {
                                setNewDocument({...newDocument, clientId: val});
                            }
                        }}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
                    >
                        <option value="">-- Общий документ --</option>
                        <option value="NEW" className="font-bold text-blue-600">+ Создать клиента</option>
                        <optgroup label="Клиенты">
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </optgroup>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">Файл</label>
                  <input 
                      type="file" 
                      ref={docFileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                  />
                  <div 
                      onClick={() => docFileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer"
                  >
                      <UploadCloud size={32} className="mb-2" />
                      {newDocument.fileName ? (
                          <div className="text-center">
                              <span className="font-bold text-slate-700 dark:text-white">{newDocument.fileName}</span>
                              <div className="text-xs mt-1">{newDocument.fileSize}</div>
                          </div>
                      ) : (
                          <span className="text-sm font-medium">Нажмите для выбора файла</span>
                      )}
                  </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsUploadModalOpen(false)}
                  className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 font-bold transition-colors"
                >
                  Загрузить
                </button>
              </div>
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
              <button onClick={() => setIsClientModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название / ФИО</label>
                <input 
                  required
                  autoFocus
                  type="text" 
                  value={newClientFormData.name}
                  onChange={e => setNewClientFormData({...newClientFormData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder-slate-400"
                  placeholder="Например: ТОО Ромашка"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип клиента</label>
                <div className="grid grid-cols-2 gap-2">
                  {[ClientType.COMPANY, ClientType.INDIVIDUAL].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewClientFormData({...newClientFormData, type})}
                      className={`py-3 px-1 text-xs sm:text-sm rounded-2xl border transition-colors font-bold ${
                        newClientFormData.type === type 
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 shadow-sm' 
                          : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Телефон</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                  <input 
                    required
                    type="tel" 
                    value={newClientFormData.phone}
                    onChange={e => setNewClientFormData({...newClientFormData, phone: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder-slate-400"
                    placeholder="+7 (7xx) xxx xx xx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Адрес (основной)</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-4 text-slate-400 dark:text-gray-500" />
                  <textarea 
                    rows={2}
                    value={newClientFormData.address}
                    onChange={e => setNewClientFormData({...newClientFormData, address: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder-slate-400"
                    placeholder="Город, Улица, Дом..."
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsClientModalOpen(false)}
                  className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:opacity-90 shadow-md dark:shadow-blue-900/30 font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
