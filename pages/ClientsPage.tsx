
import React, { useState, useEffect } from 'react';
import { User, ClientType, Client, UserRole, Task, Sale, TaskStatus, Transaction } from '../types';
import { Search, Plus, Building2, User as UserIcon, X, Save, MapPin, Phone, Lock, Eye, Briefcase, Wallet, Clock, CheckCircle, AlertTriangle, Hash, TrendingUp, ArrowDownLeft, ArrowUpRight, FileText, Calculator, CheckSquare, History } from 'lucide-react';
import { useToast } from '../components/Toast';

interface ClientsPageProps {
  user: User;
  clients: Client[];
  tasks: Task[]; 
  sales: Sale[]; 
  onAddClient: (client: Client) => void;
  targetId?: string; 
  transactions: Transaction[]; 
}

export const ClientsPage: React.FC<ClientsPageProps> = ({ user, clients, tasks, sales, onAddClient, targetId, transactions }) => {
  const { addToast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'tasks' | 'finance'>('info');

  const [formData, setFormData] = useState({
    name: '',
    bin: '',
    type: ClientType.COMPANY,
    phone: '',
    address: '',
    contractNumber: '',
    contractAmount: ''
  });

  useEffect(() => {
      if (targetId) {
          const client = clients.find(c => c.id === targetId);
          if (client) setSelectedClient(client);
      }
  }, [targetId, clients]);

  if (user.role === UserRole.ENGINEER) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 text-gray-500 dark:text-gray-400">
        <Lock size={48} className="mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2 text-black dark:text-white">Доступ ограничен</h2>
        <p>Инженеры не имеют доступа к финансовым данным клиентов.</p>
      </div>
    );
  }

  const formatClientName = (name: string) => {
    if (!name) return '';
    return name
      .replace(/Республиканское государственное учреждение/gi, 'РГУ')
      .replace(/Государственное учреждение/gi, 'ГУ')
      .replace(/Индивидуальный предприниматель/gi, 'ИП')
      .replace(/Товарищество с ограниченной ответственностью/gi, 'ТОО');
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: Client = {
      id: `c${Date.now()}`,
      name: formData.name,
      bin: formData.bin,
      type: formData.type,
      phone: formData.phone,
      address: formData.address,
      balance: 0,
      contractNumber: formData.contractNumber,
      contractAmount: parseFloat(formData.contractAmount) || 0
    };
    
    onAddClient(newClient);
    setIsModalOpen(false);
    setFormData({ name: '', bin: '', type: ClientType.COMPANY, phone: '', address: '', contractNumber: '', contractAmount: '' });
    addToast('Клиент и договор зарегистрированы', 'success');
  };

  const getClientStats = (client: Client) => {
      const clientTasks = tasks.filter(t => t.clientId === client.id || t.clientName === client.name);
      const clientBin = client.bin ? client.bin.replace(/\D/g, '') : null;

      const clientTransactions = transactions.filter(t => {
          if (t.clientId === client.id) return true;
          if (clientBin && t.relatedBin === clientBin) return true;
          return false;
      });

      const totalIncome = clientTransactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
      const contractTotal = client.contractAmount || 0;
      const debt = contractTotal - totalIncome;
      const payPercent = contractTotal > 0 ? Math.min(100, Math.round((totalIncome / contractTotal) * 100)) : 0;

      return { clientTasks, clientTransactions, totalIncome, contractTotal, debt, payPercent };
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (client.contractNumber && client.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || client.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Контрагенты</h1>
          <p className="text-gray-500 dark:text-gray-400">Учет договоров и задолженности</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-ios-blue text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
          <Plus size={18} />
          <span>Новый договор</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Поиск по клиенту или № договора..." className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                    <tr>
                        <th className="px-6 py-4">Клиент / Договор</th>
                        <th className="px-6 py-4 text-right">Сумма договора</th>
                        <th className="px-6 py-4 text-right">Оплачено</th>
                        <th className="px-6 py-4 text-right">Остаток / Долг</th>
                        <th className="px-6 py-4 text-center">Инфо</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {filteredClients.map(client => {
                        const stats = getClientStats(client);
                        return (
                            <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer" onClick={() => setSelectedClient(client)}>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{formatClientName(client.name)}</div>
                                    <div className="text-[10px] mt-0.5 flex items-center gap-2">
                                        <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-1.5 py-0.5 rounded font-mono">№ {client.contractNumber || '---'}</span>
                                        {client.bin && <span className="text-gray-400">БИН: {client.bin}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-300">
                                    {client.contractAmount?.toLocaleString()} ₸
                                </td>
                                <td className="px-6 py-4 text-right text-green-600 dark:text-green-400 font-medium">
                                    {stats.totalIncome.toLocaleString()} ₸
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {stats.debt <= 0 ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                                            <CheckCircle size={14}/> Оплачен
                                        </span>
                                    ) : (
                                        <span className="text-red-600 dark:text-red-400 font-black animate-pulse">
                                            {stats.debt.toLocaleString()} ₸
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-400 hover:text-blue-600 transition-colors">
                                        <Eye size={16} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- DETAILS MODAL --- */}
      {selectedClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20">
                  <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                      <div>
                          <h2 className="text-2xl font-black text-gray-900 dark:text-white">{formatClientName(selectedClient.name)}</h2>
                          <p className="text-sm text-gray-500 font-medium flex items-center gap-2 mt-1">
                              <FileText size={14} className="text-blue-500"/> Договор №{selectedClient.contractNumber}
                          </p>
                      </div>
                      <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                          <X size={24} className="text-gray-400" />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-slate-900/50">
                      {(() => {
                          const stats = getClientStats(selectedClient);
                          return (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  {/* Financial Summary Card */}
                                  <div className="md:col-span-2 space-y-6">
                                      <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-gray-100 dark:border-slate-700">
                                          <div className="flex justify-between items-end mb-4">
                                              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                  <Calculator size={18} className="text-blue-500" /> Состояние счета
                                              </h3>
                                              <span className="text-2xl font-black text-blue-600">{stats.payPercent}%</span>
                                          </div>
                                          
                                          <div className="w-full bg-gray-100 dark:bg-slate-700 h-3 rounded-full mb-8 overflow-hidden">
                                              <div className={`h-full transition-all duration-1000 ${stats.payPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${stats.payPercent}%` }}></div>
                                          </div>

                                          <div className="grid grid-cols-3 gap-4">
                                              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-2xl border border-gray-100 dark:border-slate-600">
                                                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">По договору</div>
                                                  <div className="text-lg font-black text-gray-900 dark:text-white">{stats.contractTotal.toLocaleString()} ₸</div>
                                              </div>
                                              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800">
                                                  <div className="text-[10px] font-bold text-green-600 uppercase mb-1">Получено</div>
                                                  <div className="text-lg font-black text-green-700 dark:text-green-400">+{stats.totalIncome.toLocaleString()} ₸</div>
                                              </div>
                                              <div className={`p-4 rounded-2xl border ${stats.debt > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'}`}>
                                                  <div className={`text-[10px] font-bold uppercase mb-1 ${stats.debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Остаток</div>
                                                  <div className={`text-lg font-black ${stats.debt > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                                      {stats.debt <= 0 ? '0 ₸' : `${stats.debt.toLocaleString()} ₸`}
                                                  </div>
                                              </div>
                                          </div>
                                      </div>

                                      {/* Transactions Card */}
                                      <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                                          <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 font-bold text-xs uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                              <History size={14}/> История платежей
                                          </div>
                                          <div className="divide-y divide-gray-50 dark:divide-slate-700 max-h-[300px] overflow-y-auto">
                                              {stats.clientTransactions.length > 0 ? stats.clientTransactions.map(tx => (
                                                  <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                                      <div className="flex items-center gap-3">
                                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'Income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                              {tx.type === 'Income' ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}
                                                          </div>
                                                          <div>
                                                              <div className="text-sm font-bold text-gray-900 dark:text-white">{tx.category}</div>
                                                              <div className="text-[10px] text-gray-400 font-mono">{tx.date}</div>
                                                          </div>
                                                      </div>
                                                      <div className={`font-black ${tx.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                                          {tx.type === 'Income' ? '+' : '-'}{tx.amount.toLocaleString()} ₸
                                                      </div>
                                                  </div>
                                              )) : <div className="p-10 text-center text-gray-400 italic">Платежей еще не было</div>}
                                          </div>
                                      </div>
                                  </div>

                                  {/* Contact & Actions */}
                                  <div className="space-y-4">
                                      <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-gray-100 dark:border-slate-700">
                                          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Информация</h3>
                                          <div className="space-y-4">
                                              <div className="flex items-start gap-3">
                                                  <MapPin size={18} className="text-gray-400 shrink-0 mt-1" />
                                                  <span className="text-sm text-gray-600 dark:text-gray-300">{selectedClient.address || 'Адрес не указан'}</span>
                                              </div>
                                              <div className="flex items-center gap-3">
                                                  <Phone size={18} className="text-gray-400 shrink-0" />
                                                  <span className="text-sm font-bold text-blue-600">{selectedClient.phone || 'Нет телефона'}</span>
                                              </div>
                                          </div>
                                      </div>
                                      
                                      <button className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-black/10">
                                          <Plus size={20}/> Создать заявку
                                      </button>
                                  </div>
                              </div>
                          );
                      })()}
                  </div>
              </div>
          </div>
      )}

      {/* --- ADD MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-lg shadow-2xl flex flex-col border border-white/20">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 rounded-t-[32px]">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Новый контрагент</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleAddClient} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">Название организации / ФИО</label>
                <input required autoFocus type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" placeholder="ТОО Ромашка или Иванов И.И." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">БИН / ИИН</label>
                    <input type="text" value={formData.bin} onChange={e => setFormData({...formData, bin: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl font-mono text-sm dark:text-white" placeholder="12 цифр" maxLength={12} />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">Тип</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as ClientType})} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl outline-none dark:text-white">
                        <option value={ClientType.COMPANY}>Юр. лицо</option>
                        <option value={ClientType.INDIVIDUAL}>Физ. лицо</option>
                    </select>
                  </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-[24px] border border-blue-100 dark:border-blue-900/40 space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-[0.2em] flex items-center gap-2 mb-2">
                      <FileText size={14}/> Договорные условия
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-blue-800 dark:text-blue-300 mb-1 uppercase">№ Договора</label>
                        <input type="text" value={formData.contractNumber} onChange={e => setFormData({...formData, contractNumber: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900 rounded-xl outline-none font-bold text-sm dark:text-white" placeholder="01/24" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-blue-800 dark:text-blue-300 mb-1 uppercase">Сумма (₸)</label>
                        <input required type="number" value={formData.contractAmount} onChange={e => setFormData({...formData, contractAmount: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900 rounded-xl outline-none font-black text-blue-700 dark:text-blue-300 text-sm" placeholder="0" />
                    </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-2">
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl outline-none dark:text-white" placeholder="Телефон: +7 (7xx) xxx xx xx" />
                  <textarea rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl outline-none dark:text-white text-sm" placeholder="Юридический или фактический адрес" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-4 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl transition-colors">Отмена</button>
                <button type="submit" className="flex-1 px-4 py-4 bg-ios-blue text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Save size={18} /> Сохранить договор
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
