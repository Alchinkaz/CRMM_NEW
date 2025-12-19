
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Client, TimeEntry, AttendanceStatus, Advance, Task, Sale, MonthlyService, ChatMessage, Transaction, FinancialAccount } from './types';
import { USERS, CLIENTS, TIMESHEET, ADVANCES, TASKS, SALES, MONTHLY_SERVICES, MESSAGES, TRANSACTIONS, ACCOUNTS, ROLES } from './mockData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './pages/Dashboard';
import { TasksPage } from './pages/TasksPage';
import { ClientsPage } from './pages/ClientsPage';
import { FinancePage } from './pages/FinancePage';
import { DocumentationPage } from './pages/DocumentationPage';
import { SettingsPage } from './pages/SettingsPage';
import { TimesheetPage } from './pages/TimesheetPage';
import { ServicePage } from './pages/ServicePage';
import { WarehousePage } from './pages/WarehousePage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ChatPage } from './pages/ChatPage';
import { PublicTaskConfirmation } from './pages/PublicTaskConfirmation'; 
import { PublicRequestPage } from './pages/PublicRequestPage';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ToastProvider, useToast } from './components/Toast';
import { supabase, parseDbError, checkDbConnection } from './supabase';

const AppContent: React.FC = () => {
  const { addToast } = useToast();
  
  // --- Global State ---
  const [users, setUsers] = useLocalStorage<User[]>('crm_users', USERS);
  const [currentUser, setCurrentUser] = useState<User>(users[0]);
  const [clients, setClients] = useLocalStorage<Client[]>('crm_clients', CLIENTS);
  const [tasks, setTasks] = useLocalStorage<Task[]>('crm_tasks', TASKS);
  const [accounts, setAccounts] = useLocalStorage<FinancialAccount[]>('crm_finance_accounts', ACCOUNTS as FinancialAccount[]);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('crm_finance_transactions', TRANSACTIONS);
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>('crm_messages', MESSAGES);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [hasSyncError, setHasSyncError] = useState(false);
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('crm_theme', 'light');

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  
  const [sales, setSales] = useLocalStorage<Sale[]>('crm_sales', SALES);
  const [monthlyServices, setMonthlyServices] = useLocalStorage<MonthlyService[]>('crm_services', MONTHLY_SERVICES);
  const [timesheetData, setTimesheetData] = useLocalStorage<TimeEntry[]>('crm_timesheet', TIMESHEET);
  const [advances, setAdvances] = useLocalStorage<Advance[]>('crm_advances', ADVANCES);

  const [currentHash, setCurrentHash] = useState<string>(window.location.hash || '#dashboard');

  // --- REALTIME SUBSCRIPTION (INSTANT MESSAGES) ---
  useEffect(() => {
    const channel = supabase
      .channel('realtime_messages')
      .on('postgres_changes', { event: '*', table: 'messages', schema: 'public' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const m = payload.new as any;
          const mapped: ChatMessage = {
              id: m.id,
              senderId: m.sender_id,
              receiverId: m.receiver_id || undefined,
              text: m.text,
              createdAt: m.created_at,
              isRead: m.is_read,
              type: m.type as 'text' | 'image',
              attachmentUrl: m.attachment_url
          };
          setMessages(prev => {
              if (prev.some(existing => existing.id === mapped.id)) return prev;
              return [...prev, mapped];
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [setMessages]);

  // --- INITIAL SYNC ---
  const syncWithSupabase = useCallback(async () => {
      if (isSyncing) return;
      setIsSyncing(true);
      setHasSyncError(false);
      setDbStatus('checking');
      try {
          const [clientsRes, accountsRes, tasksRes, transactionsRes, messagesRes] = await Promise.all([
              supabase.from('clients').select('*'),
              supabase.from('accounts').select('*'),
              supabase.from('tasks').select('*'),
              supabase.from('transactions').select('*'),
              supabase.from('messages').select('*').order('created_at', { ascending: true })
          ]);

          if (clientsRes.error) throw clientsRes.error;
          if (accountsRes.error) throw accountsRes.error;
          if (tasksRes.error) throw tasksRes.error;
          if (transactionsRes.error) throw transactionsRes.error;
          if (messagesRes.error) throw messagesRes.error;

          if (clientsRes.data) setClients(clientsRes.data);
          if (accountsRes.data) setAccounts(accountsRes.data);
          if (tasksRes.data) setTasks(tasksRes.data);
          if (transactionsRes.data) setTransactions(transactionsRes.data);
          if (messagesRes.data) {
              setMessages(messagesRes.data.map((m: any) => ({
                  id: m.id, senderId: m.sender_id, receiverId: m.receiver_id || undefined,
                  text: m.text, createdAt: m.created_at, isRead: m.is_read,
                  type: m.type, attachmentUrl: m.attachment_url
              })));
          }
          setDbStatus('online');
      } catch (err: any) {
          console.error('Initial Sync Error:', parseDbError(err));
          setDbStatus('offline');
          setHasSyncError(true);
      } finally {
          setIsSyncing(false);
      }
  }, [isSyncing, setClients, setAccounts, setTasks, setTransactions, setMessages]);

  useEffect(() => {
      syncWithSupabase();
      const checkInterval = setInterval(async () => {
          const isAlive = await checkDbConnection();
          setDbStatus(isAlive ? 'online' : 'offline');
      }, 120000);
      return () => clearInterval(checkInterval);
  }, []);

  // --- INSTANT CHAT SEND ---
  const handleSendMessage = async (txt: string, receiverId?: string) => {
      const newMessage: ChatMessage = {
          id: `m${Date.now()}`,
          senderId: currentUser.id,
          receiverId: receiverId,
          text: txt,
          createdAt: new Date().toISOString(),
          isRead: false,
          type: 'text'
      };

      // 1. Optimistic UI update
      setMessages(prev => [...prev, newMessage]);

      // 2. Immediate push to DB (Realtime will handle broadcast)
      try {
          await supabase.from('messages').insert({
              id: newMessage.id,
              sender_id: newMessage.senderId,
              // FIX: Corrected property access from receiver_id to receiverId to match ChatMessage interface
              receiver_id: newMessage.receiverId || null,
              text: newMessage.text,
              created_at: newMessage.createdAt,
              is_read: newMessage.isRead,
              type: newMessage.type
          });
      } catch (e) {
          console.error("Failed to push message instantly:", e);
      }
  };

  // --- BACKGROUND AUTO-SAVE (For other data) ---
  useEffect(() => {
    if (isSyncing || hasSyncError || dbStatus === 'offline') return;
    const timer = setTimeout(async () => {
        try {
            const savePromises = [];
            if (clients.length > 0) savePromises.push(supabase.from('clients').upsert(clients));
            if (accounts.length > 0) savePromises.push(supabase.from('accounts').upsert(accounts));
            if (tasks.length > 0) savePromises.push(supabase.from('tasks').upsert(tasks));
            if (transactions.length > 0) savePromises.push(supabase.from('transactions').upsert(transactions));
            if (savePromises.length > 0) await Promise.all(savePromises);
        } catch (e) {
            const msg = parseDbError(e);
            if (msg.toLowerCase().includes('fetch')) setDbStatus('offline');
        }
    }, 3000); 
    return () => clearTimeout(timer);
  }, [clients, tasks, transactions, accounts, isSyncing, hasSyncError, dbStatus]);

  // --- SYSTEM WIPE (DANGER ZONE) ---
  const handleResetSystem = async () => {
    setIsSyncing(true);
    try {
      // 1. Clear Supabase Tables
      const tables = ['transactions', 'tasks', 'messages', 'accounts', 'clients'];
      for (const table of tables) {
        await supabase.from(table).delete().neq('id', '0'); 
      }

      // 2. Clear Local State to Mocks
      setClients([]);
      setTasks([]);
      setAccounts([]);
      setTransactions([]);
      setMessages(MESSAGES);
      setSales([]);
      setMonthlyServices([]);
      setTimesheetData([]);
      setAdvances([]);
      
      // 3. Reset Storage keys manually for non-state synced data
      localStorage.removeItem('crm_inventory');
      localStorage.removeItem('crm_cms_objects');
      localStorage.removeItem('crm_maintenance_objects');
      localStorage.removeItem('crm_documents');
      
      addToast('Система успешно очищена', 'success');
      window.location.hash = '#dashboard';
    } catch (e) {
      addToast('Ошибка при очистке: ' + parseDbError(e), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash || '#dashboard');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (hash: string) => window.location.hash = hash;
  if (currentHash.startsWith('#public-task')) return <PublicTaskConfirmation />;
  if (currentHash.startsWith('#public-request')) return <PublicRequestPage />;

  const handleAddClient = (client: Client) => setClients(prev => [client, ...prev]);
  const handleAddUser = (newUser: User) => setUsers(prev => [...prev, newUser]);
  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser.id === updatedUser.id) setCurrentUser(updatedUser);
  };
  
  const handleCheckIn = (location?: { lat: number, lng: number }) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const existingEntry = timesheetData.find(t => t.userId === currentUser.id && t.date === today);
    if (existingEntry) {
      setTimesheetData(prev => prev.map(t => t.id === existingEntry.id ? { ...t, status: AttendanceStatus.PRESENT, checkIn: now, totalHours: 0, location } : t));
    } else {
      const newEntry: TimeEntry = { id: `te_${Date.now()}`, userId: currentUser.id, date: today, status: AttendanceStatus.PRESENT, checkIn: now, totalHours: 0, location };
      setTimesheetData(prev => [...prev, newEntry]);
    }
  };

  const handleCheckOut = () => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    setTimesheetData(prev => prev.map(t => {
      if (t.userId === currentUser.id && t.date === today) {
        let hours = 8; 
        if (t.checkIn) {
             const [h1, m1] = t.checkIn.split(':').map(Number);
             const [h2, m2] = now.split(':').map(Number);
             const diff = (h2 + m2/60) - (h1 + m1/60);
             hours = Math.max(0, parseFloat(diff.toFixed(2)));
        }
        return { ...t, checkOut: now, totalHours: Math.round(hours) };
      }
      return t;
    }));
  };

  const isAccessAllowed = (route: string, role: UserRole): boolean => {
    const cleanRoute = route.split('?')[0];
    switch (cleanRoute) {
      case 'dashboard': case 'tasks': case 'docs': case 'chat': case 'warehouse': return true; 
      case 'employees': return role === UserRole.ADMIN || role === UserRole.MANAGER;
      case 'clients': case 'service': case 'documents_list': return role === UserRole.ADMIN || role === UserRole.MANAGER;
      case 'finance': case 'settings': return role === UserRole.ADMIN;
      default: return true;
    }
  };

  const renderContent = () => {
    const [route, queryString] = currentHash.replace('#', '').split('?');
    const params = new URLSearchParams(queryString || '');
    const targetId = params.get('id') || undefined;
    if (!isAccessAllowed(route, currentUser.role)) return <div className="p-8 text-center glass-panel rounded-3xl m-8"><ShieldAlert size={48} className="mx-auto text-red-500 mb-4" /><h2 className="text-2xl font-bold">Нет доступа</h2><button onClick={() => navigate('#dashboard')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl">На главную</button></div>;

    switch (route) {
      case 'dashboard': return <Dashboard user={currentUser} timesheetData={timesheetData} advances={advances} tasks={tasks} sales={sales} monthlyServices={monthlyServices} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} />;
      case 'chat': return <ChatPage currentUser={currentUser} users={users} messages={messages} onSendMessage={handleSendMessage} onReadMessages={(sid) => setMessages(prev => prev.map(m => m.senderId === sid && m.receiverId === currentUser.id ? {...m, isRead: true} : m))} />;
      case 'tasks': return <TasksPage user={currentUser} users={users} clients={clients} tasks={tasks} onUpdateTasks={setTasks} onAddClient={handleAddClient} targetId={targetId} />;
      case 'clients': return <ClientsPage user={currentUser} clients={clients} tasks={tasks} sales={sales} onAddClient={handleAddClient} targetId={targetId} transactions={transactions} />;
      case 'service': return <ServicePage user={currentUser} users={users} clients={clients} monthlyServices={monthlyServices} tasks={tasks} onUpdateTasks={setTasks} onUpdateServices={setMonthlyServices} onAddClient={handleAddClient} />;
      case 'warehouse': return <WarehousePage user={currentUser} />;
      case 'documents_list': return <DocumentsPage user={currentUser} clients={clients} onAddClient={handleAddClient} />;
      case 'finance': return <FinancePage user={currentUser} clients={clients} onAddClient={handleAddClient} transactions={transactions} onUpdateTransactions={setTransactions} accounts={accounts} onUpdateAccounts={setAccounts} />;
      case 'employees': return <TimesheetPage user={currentUser} users={users} timesheetData={timesheetData} advances={advances} onUpdateEntry={e => setTimesheetData(prev => prev.map(t => t.id === e.id ? e : t))} onDeleteEntry={id => setTimesheetData(prev => prev.filter(t => t.id !== id))} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onAddAdvance={a => setAdvances(prev => [...prev, a])} />; 
      case 'docs': return <DocumentationPage />;
      case 'settings': return <SettingsPage user={currentUser} users={users} onUpdateUser={handleUpdateUser} onResetSystem={handleResetSystem} />;
      default: return <Dashboard user={currentUser} timesheetData={timesheetData} advances={advances} tasks={tasks} sales={sales} monthlyServices={monthlyServices} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar role={currentUser.role} currentRoute={currentHash.replace('#', '').split('?')[0]} onNavigate={navigate} />
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <Header user={currentUser} users={users} clients={clients} tasks={tasks} isDarkMode={theme === 'dark'} onToggleTheme={toggleTheme} onSwitchUser={setCurrentUser} dbStatus={dbStatus} />
        {(isSyncing) && (
            <div className="fixed top-24 right-8 bg-blue-600/90 backdrop-blur-md text-white px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xl z-50 animate-in slide-in-from-right-4">
                <RefreshCw size={14} className="animate-spin" /> Обновление...
            </div>
        )}
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6 scroll-smooth">{renderContent()}</main>
        <BottomNav role={currentUser.role} currentRoute={currentHash.replace('#', '').split('?')[0]} onNavigate={navigate} />
      </div>
    </div>
  );
};

const App: React.FC = () => (
    <ToastProvider>
        <AppContent />
    </ToastProvider>
);

export default App;
