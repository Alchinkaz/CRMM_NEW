
import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, FinancialAccount, Transaction, AccountType, Client, ClientType } from '../types';
import { Wallet, TrendingUp, TrendingDown, Plus, CreditCard, Landmark, DollarSign, Search, Filter, X, Save, ArrowDownLeft, ArrowUpRight, Calendar as CalendarIcon, ChevronDown, Check, ChevronLeft, ChevronRight, CornerDownRight, Hash, Edit2, Upload, AlertTriangle, FileText, Trash2, CheckCircle, CheckSquare, ArrowUpDown, ChevronUp, AlertOctagon, ShieldAlert, FileUp, RefreshCw, FileWarning, History, Calculator, UserPlus, Building2 } from 'lucide-react';
import { useToast } from '../components/Toast';

interface FinanceManagerProps {
  user: User;
  clients: Client[];
  onAddClient: (client: Client) => void;
  // Lifted State Props
  transactions: Transaction[];
  onUpdateTransactions: (transactions: Transaction[]) => void;
  accounts: FinancialAccount[];
  onUpdateAccounts: (accounts: FinancialAccount[]) => void;
}

export const FinanceManager: React.FC<FinanceManagerProps> = ({ 
    user, 
    clients, 
    onAddClient,
    transactions,
    onUpdateTransactions,
    accounts,
    onUpdateAccounts
}) => {
  const { addToast } = useToast();
  
  const [filterType, setFilterType] = useState<'All' | 'Income' | 'Expense'>('All');
  
  // --- Date Helpers ---
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMonthName = (monthIndex: number) => {
      const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
      return months[monthIndex];
  };

  const todayIso = formatDate(new Date());

  // --- Date Filter State ---
  const [dateFilter, setDateFilter] = useState({
    start: '2020-01-01',
    end: '2100-01-01',
    label: 'За всё время'
  });
  
  // Calendar UI State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [viewDate, setViewDate] = useState(new Date()); // Current month shown in picker
  const [tempRange, setTempRange] = useState<{start: string | null, end: string | null}>({ start: null, end: null });

  // 1C Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImportTransactions, setPendingImportTransactions] = useState<any[] | null>(null);
  const [pendingImportAccountInfo, setPendingImportAccountInfo] = useState<any | null>(null);
  
  // New State for the intermediate "Account Not Found" modal
  const [isUnknownAccountModalOpen, setIsUnknownAccountModalOpen] = useState(false);
  const [pendingNewAccountDetails, setPendingNewAccountDetails] = useState<{
      number: string;
      balance: number;
      bankName: string;
  } | null>(null);

  // --- NEW: MISSING CLIENTS MODAL STATE ---
  const [isMissingClientsModalOpen, setIsMissingClientsModalOpen] = useState(false);
  const [missingClients, setMissingClients] = useState<{name: string, bin: string}[]>([]);

  // IMPORT RESULT MODAL STATE
  const [importResult, setImportResult] = useState<{
      open: boolean;
      accountName: string;
      accountId: string; // Needed for correction
      added: number;
      duplicates: number;
      fileFinalBalance?: number; // From 1C file
      projectedBalance: number; // Current System Balance + Added Txs
      skippedBalanceUpdate: boolean; // Flag if we ignored file balance
  }>({ open: false, accountName: '', accountId: '', added: 0, duplicates: 0, projectedBalance: 0, skippedBalanceUpdate: false });

  // --- PAGINATION & SEARCH & SORT STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // --- DELETE ACCOUNT MODAL STATE ---
  const [deletingAccount, setDeletingAccount] = useState<FinancialAccount | null>(null);
  const [deleteStep, setDeleteStep] = useState<number>(0); // 0 = closed, 1 = warning, 2 = danger, 3 = final input
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');

  // --- DELETE TRANSACTIONS MODAL STATE ---
  const [isDeleteTxModalOpen, setIsDeleteTxModalOpen] = useState(false);

  // Close date picker on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync temp range when opening
  useEffect(() => {
      if (isDatePickerOpen) {
          setTempRange({ start: dateFilter.start, end: dateFilter.end });
          setViewDate(new Date()); // Open on current date month
      }
  }, [isDatePickerOpen]);

  // Reset pagination when filters change
  useEffect(() => {
      setCurrentPage(1);
      setSelectedTxIds(new Set()); // Clear selection on filter change to avoid confusion
  }, [dateFilter, filterType, searchTerm, itemsPerPage, sortConfig]);

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  
  // Transaction Form State
  const [txType, setTxType] = useState<'Income' | 'Expense'>('Income');
  const [txForm, setTxForm] = useState({
    amount: '',
    category: '',
    accountId: '',
    description: '',
    date: formatDate(new Date())
  });

  // Account Form State
  const [accForm, setAccForm] = useState({
      name: '',
      type: 'Cash' as AccountType,
      initialBalance: '',
      accountNumber: '', // IIK
      parentId: '' // Link to parent
  });

  if (user.role !== UserRole.ADMIN) {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <div className="w-16 h-16 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                <DollarSign size={28} className="text-gray-400" />
            </div>
            <h2 className="text-[20px] font-semibold text-black dark:text-white">Доступ ограничен</h2>
            <p className="text-gray-500 dark:text-gray-400">Финансовый раздел доступен только руководителю.</p>
        </div>
    );
  }

  // --- Logic ---

  // Sort Handler
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Delete Account Start
  const initiateDeleteAccount = (account: FinancialAccount) => {
      setDeletingAccount(account);
      setDeleteStep(1);
      setDeleteConfirmationName('');
  };

  // Delete Account Final Execution
  const executeDeleteAccount = () => {
      if (!deletingAccount) return;

      // 1. Delete all transactions linked to this account
      onUpdateTransactions(transactions.filter(t => t.accountId !== deletingAccount.id));

      // 2. Delete the account itself
      onUpdateAccounts(accounts.filter(a => a.id !== deletingAccount.id));

      // 3. Reset state
      setDeletingAccount(null);
      setDeleteStep(0);
      setDeleteConfirmationName('');
      addToast('Счет удален', 'success');
  };

  // Bulk Delete Transactions - ENTRY
  const handleDeleteSelected = () => {
      if (selectedTxIds.size === 0) return;
      setIsDeleteTxModalOpen(true);
  };

  // Bulk Delete Transactions - EXECUTE
  const executeDeleteSelected = () => {
      // Calculate impact on balances before deleting
      const txsToDelete = transactions.filter(t => selectedTxIds.has(t.id));
      
      // Group balance updates by account
      const balanceUpdates: Record<string, number> = {};
      
      txsToDelete.forEach(tx => {
          if (!balanceUpdates[tx.accountId]) balanceUpdates[tx.accountId] = 0;
          // Reverting transaction: subtract Income, add Expense
          if (tx.type === 'Income') {
              balanceUpdates[tx.accountId] -= tx.amount;
          } else {
              balanceUpdates[tx.accountId] += tx.amount;
          }
      });

      // Update Accounts
      onUpdateAccounts(accounts.map(acc => {
          if (balanceUpdates[acc.id]) {
              return { ...acc, balance: acc.balance + balanceUpdates[acc.id] };
          }
          return acc;
      }));

      // Remove Transactions
      onUpdateTransactions(transactions.filter(t => !selectedTxIds.has(t.id)));
      setSelectedTxIds(new Set());
      setIsDeleteTxModalOpen(false);
      addToast(`Удалено ${txsToDelete.length} операций`, 'success');
  };

  // Toggle Selection
  const toggleSelectOne = (id: string) => {
      const newSet = new Set(selectedTxIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedTxIds(newSet);
  };

  // --- 1C Import Reconciliation Logic ---
  const applyImportCorrection = () => {
      if (!importResult.fileFinalBalance && importResult.fileFinalBalance !== 0) return;
      
      // Only update the balance to match the 1C file final balance
      onUpdateAccounts(accounts.map(a => a.id === importResult.accountId ? { ...a, balance: importResult.fileFinalBalance! } : a));
      
      // Close modal
      setImportResult({...importResult, open: false});
      addToast('Баланс скорректирован', 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
            const text = event.target?.result as string;
            parse1CFile(text);
          } catch (error) {
            console.error("1C Parse Error", error);
            addToast("Ошибка при чтении файла. Убедитесь, что это корректный файл выписки 1С (txt).", 'error');
          }
      };
      reader.readAsText(file); 
      e.target.value = '';
  };

  const parse1CFile = (text: string) => {
      const lines = text.split('\n');
      let currentSection = '';
      let accountInfo: any = {};
      let documents: any[] = [];
      let currentDoc: any = {};

      for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const upperLine = trimmed.toUpperCase();
          if (upperLine.startsWith('СЕКЦИЯРАСЧСЧЕТ')) { currentSection = 'account'; continue; }
          else if (upperLine.startsWith('КОНЕЦРАСЧСЧЕТ')) { currentSection = ''; continue; }
          else if (upperLine.startsWith('СЕКЦИЯДОКУМЕНТ')) { currentSection = 'document'; continue; }
          else if (upperLine.startsWith('КОНЕЦДОКУМЕНТА')) { documents.push(currentDoc); currentDoc = {}; currentSection = ''; continue; }

          const [rawKey, ...values] = trimmed.split('=');
          const key = rawKey?.trim().toUpperCase(); 
          const value = values.join('=').trim(); 

          if (currentSection === 'account') {
              if (key === 'РАСЧСЧЕТ') accountInfo.number = value;
              if (key === 'НАЧАЛЬНЫЙОСТАТОК') accountInfo.initialBalance = parseFloat(value);
              if (key === 'КОНЕЧНЫЙОСТАТОК') accountInfo.finalBalance = parseFloat(value);
          } else if (currentSection === 'document') {
              // Normalize Keys: Remove spaces, specific suffixes might be handled in logic
              currentDoc[key] = value;
          } else if (!currentSection && key === 'РАСЧСЧЕТ') {
              if (!accountInfo.number) accountInfo.number = value;
          }
      }

      // --- CRITICAL: IDENTIFY COUNTERPARTIES AND MISSING CLIENTS ---
      const foundMissingClients: {name: string, bin: string}[] = [];
      const seenBins = new Set<string>();

      documents.forEach(doc => {
          let direction: 'Income' | 'Expense' | null = null;
          const sumIn = parseFloat(doc['СУММАПРИХОД'] || '0'); 
          const sumOut = parseFloat(doc['СУММАРАСХОД'] || '0');

          if (sumIn > 0) direction = 'Income'; 
          else if (sumOut > 0) direction = 'Expense'; 

          if (direction) {
              let bin = '';
              let name = '';

              // Extract BIN based on direction (Counterparty)
              // If Income, Payer is the client. If Expense, Receiver is the client.
              if (direction === 'Income') {
                  bin = doc['ПЛАТЕЛЬЩИКБИН_ИИН'] || doc['ПЛАТЕЛЬЩИКБИН'] || doc['ПЛАТЕЛЬЩИКРНН'];
                  name = doc['ПЛАТЕЛЬЩИКНАИМЕНОВАНИЕ'];
              } else {
                  bin = doc['ПОЛУЧАТЕЛЬБИН_ИИН'] || doc['ПОЛУЧАТЕЛЬБИН'] || doc['ПОЛУЧАТЕЛЬРНН'];
                  name = doc['ПОЛУЧАТЕЛЬНАИМЕНОВАНИЕ'];
              }

              // Validate BIN/IIN
              if (bin && bin.length >= 10 && !seenBins.has(bin)) {
                  // Check against existing database
                  const exists = clients.some(c => c.bin === bin);
                  
                  if (!exists) {
                      foundMissingClients.push({ 
                          name: name || 'Без названия', 
                          bin: bin 
                      });
                      seenBins.add(bin);
                  }
              }
          }
      });

      if (foundMissingClients.length > 0) {
          // Pause logic, show Missing Clients Modal
          setPendingImportTransactions(documents);
          setPendingImportAccountInfo(accountInfo);
          setMissingClients(foundMissingClients);
          setIsMissingClientsModalOpen(true);
          return; // STOP execution until clients are resolved
      }

      // Continue to Account Logic if no missing clients (or recursively called after adding)
      continueImportProcess(documents, accountInfo);
  };

  const handleCreateMissingClients = () => {
      // Add all missing clients to the database via onAddClient
      missingClients.forEach((c, index) => {
          onAddClient({
              id: `c_auto_${c.bin}_${Date.now()}_${index}`, // Unique ID with index to prevent collisions
              name: c.name,
              bin: c.bin,
              type: ClientType.COMPANY, // Defaulting to Company/IP as per requirements
              phone: '',
              address: '',
              balance: 0
          });
      });
      
      addToast(`Добавлено ${missingClients.length} новых клиентов`, 'success');
      setIsMissingClientsModalOpen(false);
      setMissingClients([]);

      // Continue import automatically
      if (pendingImportTransactions && pendingImportAccountInfo) {
          continueImportProcess(pendingImportTransactions, pendingImportAccountInfo);
      }
  };

  const continueImportProcess = (documents: any[], accountInfo: any) => {
      if (accountInfo.number) {
          const existingAccount = accounts.find(a => a.accountNumber === accountInfo.number);
          if (existingAccount) {
              const { newTransactions } = getTransactionsFromDocs(documents, existingAccount.id, accountInfo.number);
              const totalFound = newTransactions.length;
              if (totalFound === 0) { addToast(`В файле не найдено транзакций для счета "${existingAccount.name}".`, 'warning'); return; }

              // 1. Determine dates to protect balance
              let fileMaxDateStr = '1970-01-01';
              newTransactions.forEach(t => {
                  if (t.date > fileMaxDateStr) fileMaxDateStr = t.date;
              });

              let systemMaxDateStr = '1970-01-01';
              const accountTxs = transactions.filter(t => t.accountId === existingAccount.id);
              accountTxs.forEach(t => {
                  if (t.date > systemMaxDateStr) systemMaxDateStr = t.date;
              });

              // Logic: If file date is older than system date, do NOT update balance
              const isFileOlder = fileMaxDateStr < systemMaxDateStr;

              const uniqueTransactions = newTransactions.filter(newTx => {
                  return !transactions.some(existingTx => 
                      existingTx.accountId === newTx.accountId &&
                      existingTx.amount === newTx.amount &&
                      existingTx.date === newTx.date &&
                      existingTx.type === newTx.type &&
                      (existingTx.description || '').trim() === (newTx.description || '').trim()
                  );
              });

              const addedCount = uniqueTransactions.length;
              const duplicateCount = totalFound - addedCount;
              
              const transactionDelta = uniqueTransactions.reduce((acc, tx) => acc + (tx.type === 'Income' ? tx.amount : -tx.amount), 0);
              const newProjectedBalance = existingAccount.balance + transactionDelta;

              if (addedCount > 0) {
                  onUpdateTransactions([...uniqueTransactions, ...transactions]);
                  
                  // Update Balance Logic
                  onUpdateAccounts(accounts.map(a => {
                      if (a.id === existingAccount.id) {
                          // Only update balance if file is current or newer than what we have
                          if (!isFileOlder) {
                              return { ...a, balance: newProjectedBalance };
                          }
                          // If file is older, keep current balance (just added history)
                          return a; 
                      }
                      return a;
                  }));
              }
              
              setImportResult({ 
                  open: true, 
                  accountName: existingAccount.name, 
                  accountId: existingAccount.id,
                  added: addedCount, 
                  duplicates: duplicateCount,
                  fileFinalBalance: accountInfo.finalBalance, 
                  projectedBalance: isFileOlder ? existingAccount.balance : newProjectedBalance, // Show current if skipped
                  skippedBalanceUpdate: isFileOlder // Flag for UI
              });
          } else {
              let bankName = 'Банковский счет';
              const foundBank = documents.find(d => (d['ПЛАТЕЛЬЩИКИИК'] === accountInfo.number && d['ПЛАТЕЛЬЩИКБАНКНАИМЕНОВАНИЕ']) || (d['ПОЛУЧАТЕЛЬИИК'] === accountInfo.number && d['ПОЛУЧАТЕЛЬБАНКНАИМЕНОВАНИЕ']));
              if (foundBank) {
                  if (foundBank['ПЛАТЕЛЬЩИКИИК'] === accountInfo.number) bankName = foundBank['ПЛАТЕЛЬЩИКБАНКНАИМЕНОВАНИЕ'];
                  else bankName = foundBank['ПОЛУЧАТЕЛЬБАНКНАИМЕНОВАНИЕ'];
              }
              setPendingImportTransactions(documents);
              setPendingNewAccountDetails({ number: accountInfo.number, balance: accountInfo.initialBalance || 0, bankName: bankName });
              setIsUnknownAccountModalOpen(true);
          }
      } else { addToast('Не удалось определить номер счета в файле выписки. Проверьте формат файла.', 'error'); }
  };

  const proceedToCreateAccount = () => {
      if (!pendingNewAccountDetails) return;
      setEditingAccount(null);
      setAccForm({
          name: pendingNewAccountDetails.bankName || `Счет ${pendingNewAccountDetails.number.slice(-4)}`,
          type: 'Bank',
          initialBalance: pendingNewAccountDetails.balance.toString(),
          accountNumber: pendingNewAccountDetails.number,
          parentId: ''
      });
      setIsUnknownAccountModalOpen(false);
      setIsAccountModalOpen(true);
  };

  const getTransactionsFromDocs = (docs: any[], accountId: string, myAccountNumber?: string) => {
      const newTransactions: Transaction[] = [];
      let totalDelta = 0;
      docs.forEach(doc => {
          let amount = 0;
          let type: 'Income' | 'Expense' | null = null;
          const sumIn = doc['СУММАПРИХОД']; 
          const sumOut = doc['СУММАРАСХОД'];
          const sumGeneral = doc['СУММА'];

          if (sumIn && parseFloat(sumIn) > 0) { amount = parseFloat(sumIn); type = 'Income'; } 
          else if (sumOut && parseFloat(sumOut) > 0) { amount = parseFloat(sumOut); type = 'Expense'; } 
          else if (sumGeneral && parseFloat(sumGeneral) > 0 && myAccountNumber) {
              const payerIIK = doc['ПЛАТЕЛЬЩИКИИК'];
              const receiverIIK = doc['ПОЛУЧАТЕЛЬИИК'];
              const val = parseFloat(sumGeneral);
              if (payerIIK === myAccountNumber) { type = 'Expense'; amount = val; } 
              else if (receiverIIK === myAccountNumber) { type = 'Income'; amount = val; }
          }

          if (!type || amount === 0) return;

          const dateStr = doc['ДАТАДОКУМЕНТА'] || doc['ДАТАОПЕРАЦИИ'];
          let dateIso = formatDate(new Date());
          if (dateStr) {
             const dateParts = dateStr.split('.');
             if (dateParts.length === 3) dateIso = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
          }

          const payerName = doc['ПЛАТЕЛЬЩИКНАИМЕНОВАНИЕ'] || 'Неизвестный плательщик';
          const receiverName = doc['ПОЛУЧАТЕЛЬНАИМЕНОВАНИЕ'] || 'Неизвестный получатель';
          const purpose = doc['НАЗНАЧЕНИЕПЛАТЕЖА'] || '';
          
          // EXTRACT BINs with Fallbacks
          const payerBin = doc['ПЛАТЕЛЬЩИКБИН_ИИН'] || doc['ПЛАТЕЛЬЩИКБИН'] || doc['ПЛАТЕЛЬЩИКРНН'] || '';
          const receiverBin = doc['ПОЛУЧАТЕЛЬБИН_ИИН'] || doc['ПОЛУЧАТЕЛЬБИН'] || doc['ПОЛУЧАТЕЛЬРНН'] || '';

          // Determine the Counterparty (Client) to show in Description
          let counterpartyName = '';
          let counterpartyBin = '';

          if (type === 'Income') {
              // We received money, so the client is the Payer
              counterpartyName = payerName;
              counterpartyBin = payerBin;
          } else {
              // We paid money, so the client is the Receiver
              counterpartyName = receiverName;
              counterpartyBin = receiverBin;
          }
          
          // Clean BIN for reliable storage (digits only)
          const cleanRelatedBin = counterpartyBin ? counterpartyBin.replace(/\D/g, '') : undefined;

          const description = purpose.length > 100 ? purpose.substring(0, 100) + '...' : purpose;
          const docNum = doc['НОМЕРДОКУМЕНТА'] || Math.random().toString(36).substr(2, 5);

          // IMPORTANT: Construct a robust description that ClientsPage can fuzzy match against
          // Format: "CounterpartyName (БИН: 12345). Purpose"
          const binSuffix = counterpartyBin ? ` (БИН: ${counterpartyBin})` : '';
          const fullDescription = `${counterpartyName}${binSuffix}. ${description}`;

          newTransactions.push({
              id: `1c_${docNum}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              date: dateIso,
              amount: amount,
              type: type,
              category: type === 'Income' ? 'Поступление' : 'Расход',
              accountId: accountId,
              description: fullDescription,
              is1C: true,
              relatedBin: cleanRelatedBin // STORE EXACT BIN FOR MATCHING
          });
          totalDelta += (type === 'Income' ? amount : -amount);
      });
      return { newTransactions, totalDelta };
  };

  // --- Calendar Logic ---

  const handlePreset = (preset: 'month' | 'last_month' | 'year' | 'all') => {
      const now = new Date();
      let start = '';
      let end = '';
      let label = '';

      switch (preset) {
          case 'month':
              start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
              end = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
              label = 'За текущий месяц';
              break;
          case 'last_month':
              start = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
              end = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
              label = 'За прошлый месяц';
              break;
          case 'year':
              start = formatDate(new Date(now.getFullYear(), 0, 1));
              end = formatDate(new Date(now.getFullYear(), 11, 31));
              label = 'За текущий год';
              break;
          case 'all':
              start = '2020-01-01';
              end = '2100-01-01';
              label = 'За всё время';
              break;
      }
      setDateFilter({ start, end, label });
      setIsDatePickerOpen(false);
  };

  const changeViewMonth = (amount: number) => {
      const newDate = new Date(viewDate);
      newDate.setMonth(newDate.getMonth() + amount);
      setViewDate(newDate);
  };

  const handleDateClick = (dateStr: string) => {
      if (!tempRange.start || (tempRange.start && tempRange.end)) {
          // Start new selection
          setTempRange({ start: dateStr, end: null });
      } else {
          // Complete selection
          let start = tempRange.start;
          let end = dateStr;
          if (new Date(end) < new Date(start)) {
              [start, end] = [end, start];
          }
          setTempRange({ start, end });
      }
  };

  const applyCustomRange = () => {
      if (tempRange.start && tempRange.end) {
          setDateFilter({
              start: tempRange.start,
              end: tempRange.end,
              label: `${tempRange.start} - ${tempRange.end}`
          });
          setIsDatePickerOpen(false);
      }
  };

  const renderCalendar = () => {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
      // Adjust so Monday is 0, Sunday is 6
      const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
      
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days = [];

      // Empty slots for start
      for (let i = 0; i < startDay; i++) {
          days.push(<div key={`empty-${i}`} />);
      }

      for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = formatDate(new Date(year, month, day));
          
          let isSelected = false;
          let isInRange = false;

          if (tempRange.start === dateStr || tempRange.end === dateStr) isSelected = true;
          
          if (tempRange.start && tempRange.end) {
              if (dateStr > tempRange.start && dateStr < tempRange.end) isInRange = true;
          }

          // Special case for currently active filter if no temp range
          if (!tempRange.start && !tempRange.end) {
               if (dateStr >= dateFilter.start && dateStr <= dateFilter.end) isInRange = true;
          }

          days.push(
              <div 
                  key={day}
                  onClick={() => handleDateClick(dateStr)}
                  className={`w-8 h-8 flex items-center justify-center text-sm rounded-full cursor-pointer transition-all ${
                      isSelected 
                          ? 'bg-blue-600 text-white font-bold shadow-md' 
                          : isInRange 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' 
                              : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                  }`}
              >
                  {day}
              </div>
          );
      }
      return days;
  };

  // --- FILTER & PAGINATION PIPELINE ---
  const transactionsInPeriod = transactions.filter(t => 
    t.date >= dateFilter.start && t.date <= dateFilter.end
  );

  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0); 
  const periodIncome = transactionsInPeriod.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
  const periodExpense = transactionsInPeriod.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);

  // --- GLOBAL INTEGRITY CHECK ---
  const allTimeIncome = transactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
  const allTimeExpense = transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
  
  const calculatedNet = allTimeIncome - allTimeExpense;
  const balanceDiscrepancy = totalBalance - calculatedNet;
  const hasBalanceMismatch = Math.abs(balanceDiscrepancy) > 1;

  const typeFiltered = transactionsInPeriod.filter(t => filterType === 'All' || t.type === filterType);
  
  const searchFiltered = typeFiltered.filter(t => {
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return (
          t.description?.toLowerCase().includes(lower) ||
          t.category.toLowerCase().includes(lower) ||
          t.amount.toString().includes(lower)
      );
  });

  const sortedTransactions = [...searchFiltered].sort((a, b) => {
    if (!sortConfig) return new Date(b.date).getTime() - new Date(a.date).getTime();
    const { key, direction } = sortConfig;
    let aValue: any = '';
    let bValue: any = '';
    switch (key) {
        case 'date': aValue = new Date(a.date).getTime(); bValue = new Date(b.date).getTime(); break;
        case 'amount': aValue = a.amount; bValue = b.amount; break;
        case 'category': aValue = a.category.toLowerCase(); bValue = b.category.toLowerCase(); break;
        case 'account': 
            aValue = accounts.find(acc => acc.id === a.accountId)?.name.toLowerCase() || ''; 
            bValue = accounts.find(acc => acc.id === b.accountId)?.name.toLowerCase() || ''; 
            break;
        case 'type': aValue = a.type; bValue = b.type; break;
        default: return 0;
    }
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalItems = sortedTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = sortedTransactions.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
      }
  };

  const handleTxSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!txForm.accountId) return;

      const amount = parseFloat(txForm.amount);
      const newTx: Transaction = {
          id: `tr${Date.now()}`,
          date: txForm.date,
          amount: amount,
          type: txType,
          category: txForm.category,
          accountId: txForm.accountId,
          description: txForm.description,
          is1C: false
      };

      onUpdateTransactions([newTx, ...transactions]);
      onUpdateAccounts(accounts.map(acc => {
          if (acc.id === txForm.accountId) {
              return {
                  ...acc,
                  balance: txType === 'Income' ? acc.balance + amount : acc.balance - amount
              };
          }
          return acc;
      }));
      setIsTxModalOpen(false);
      setTxForm({ amount: '', category: '', accountId: '', description: '', date: formatDate(new Date()) });
      addToast('Транзакция добавлена', 'success');
  };

  const openAccountModal = (account?: FinancialAccount) => {
    if (account) {
        setEditingAccount(account);
        setAccForm({
            name: account.name,
            type: account.type,
            initialBalance: account.balance.toString(),
            accountNumber: account.accountNumber || '',
            parentId: account.parentId || ''
        });
    } else {
        setEditingAccount(null);
        setAccForm({
            name: '',
            type: 'Cash',
            initialBalance: '',
            accountNumber: '',
            parentId: ''
        });
    }
    if (!pendingImportTransactions) { }
    setIsAccountModalOpen(true);
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const initialFormBalance = parseFloat(accForm.initialBalance) || 0;
      
      if (editingAccount) {
          onUpdateAccounts(accounts.map(acc => {
              if (acc.id === editingAccount.id) {
                  return {
                      ...acc,
                      name: accForm.name,
                      // RESTRICT: Keep original sensitive fields when editing
                      type: acc.type,
                      balance: acc.balance,
                      accountNumber: acc.accountNumber,
                      parentId: accForm.type === 'SubAccount' ? accForm.parentId : undefined
                  };
              }
              return acc;
          }));
          addToast('Счет обновлен', 'success');
      } else {
          const targetAccountId = `acc${Date.now()}`;
          let finalBalance = initialFormBalance;
          let transactionsToAdd: Transaction[] = [];

          if (pendingImportTransactions) {
              const { newTransactions } = getTransactionsFromDocs(pendingImportTransactions, targetAccountId, accForm.accountNumber);
              transactionsToAdd = newTransactions;
              const totalDelta = newTransactions.reduce((acc, tx) => acc + (tx.type === 'Income' ? tx.amount : -tx.amount), 0);
              finalBalance += totalDelta;
          }

          const newAcc: FinancialAccount = {
              id: targetAccountId,
              name: accForm.name,
              type: accForm.type,
              balance: finalBalance,
              accountNumber: (accForm.type === 'Bank' || accForm.type === 'SubAccount') ? accForm.accountNumber : undefined,
              parentId: accForm.type === 'SubAccount' ? accForm.parentId : undefined
          };

          onUpdateAccounts([...accounts, newAcc]);
          if (transactionsToAdd.length > 0) {
              onUpdateTransactions([...transactionsToAdd, ...transactions]);
          }
          setPendingImportTransactions(null);
          addToast('Новый счет создан', 'success');
      }
      setIsAccountModalOpen(false);
  };

  const openTxModal = () => {
      setTxForm(prev => ({ ...prev, accountId: accounts[0]?.id || '' }));
      setIsTxModalOpen(true);
  };

  // --- SELECTION LOGIC ---
  const isAllPageSelected = currentTransactions.length > 0 && currentTransactions.every(t => selectedTxIds.has(t.id));
  const isAllTotalSelected = totalItems > 0 && searchFiltered.every(t => selectedTxIds.has(t.id));

  const toggleSelectPage = () => {
      const newSet = new Set(selectedTxIds);
      if (isAllPageSelected) {
          currentTransactions.forEach(t => newSet.delete(t.id));
      } else {
          currentTransactions.forEach(t => newSet.add(t.id));
      }
      setSelectedTxIds(newSet);
  };

  const selectAllGlobally = () => {
      const newSet = new Set<string>();
      searchFiltered.forEach(t => newSet.add(t.id));
      setSelectedTxIds(newSet);
  };

  const clearSelection = () => {
      setSelectedTxIds(new Set());
  };

  // --- LAST UPDATE HELPER ---
  const getAccountLastUpdate = (accountId: string) => {
      const accTxs = transactions.filter(t => t.accountId === accountId);
      if (accTxs.length === 0) return null;
      accTxs.sort((a, b) => b.date.localeCompare(a.date));
      return accTxs[0].date;
  };

  // STRICT check for today
  const anyBankOutdated = accounts.some(acc => {
      if (acc.type !== 'Bank') return false;
      const last = getAccountLastUpdate(acc.id);
      return last !== todayIso;
  });

  const outdatedAccountsCount = accounts.filter(acc => {
      if (acc.type !== 'Bank') return false;
      const last = getAccountLastUpdate(acc.id);
      return last !== todayIso;
  }).length;

  return (
    <div className="space-y-6 relative pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-extrabold text-black dark:text-white tracking-tight leading-tight">Финансы</h1>
           <p className="text-[17px] text-gray-500 dark:text-gray-400">Управление счетами и потоками</p>
        </div>
        <div className="flex gap-3">
             <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept=".txt"
                onChange={handleFileUpload}
             />
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 px-3 sm:px-5 py-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm font-semibold text-[15px]"
                title="Импорт 1С"
             >
                <Upload size={18} />
                <span className="hidden sm:inline">Импорт 1С</span>
             </button>
             <button 
                onClick={openTxModal}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 sm:px-5 py-2.5 rounded-2xl hover:opacity-90 transition-all shadow-md shadow-blue-500/30 font-semibold text-[15px]"
                title="Новая транзакция"
             >
                <Plus size={18} />
                <span className="hidden sm:inline">Новая транзакция</span>
             </button>
        </div>
      </div>

      {/* --- INTEGRITY WARNING --- */}
      {hasBalanceMismatch && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-full text-orange-600 dark:text-orange-400">
                  <Calculator size={24} />
              </div>
              <div>
                  <h4 className="font-bold text-orange-900 dark:text-orange-200 text-base">Расхождение истории операций</h4>
                  <div className="text-sm text-orange-800/90 dark:text-orange-300/90 mt-1 leading-relaxed">
                      <p>Баланс счетов не сходится с историей транзакций.</p>
                      <ul className="list-disc pl-4 mt-1 mb-2 space-y-0.5">
                          <li>Текущий баланс: <b>{totalBalance.toLocaleString()} ₸</b></li>
                          <li>Доходы - Расходы: <b>{calculatedNet.toLocaleString()} ₸</b></li>
                          <li>Разница: <b className="text-red-600 dark:text-red-400">{Math.abs(balanceDiscrepancy).toLocaleString()} ₸</b></li>
                      </ul>
                      <p>
                          Система имеет верный остаток (установлен вручную или импортом), но <b>история неполная</b>. 
                          Для устранения расхождения необходимо добавить выписки за предыдущие периоды (начальные остатки).
                      </p>
                  </div>
              </div>
          </div>
      )}

      {anyBankOutdated && !hasBalanceMismatch && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 mb-4 shadow-sm">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full text-red-600 dark:text-red-400">
                  <AlertTriangle size={24} />
              </div>
              <div>
                  <h4 className="font-bold text-red-900 dark:text-red-200 text-base">Актуализируйте выписки!</h4>
                  <p className="text-sm text-red-800/80 dark:text-red-300/80 mt-1">
                      Для корректного отображения остатков необходимо загрузить выписку 1С за <b>сегодняшний день</b> ({todayIso}).
                      <br/>
                      Устаревшие счета: <strong>{outdatedAccountsCount}</strong>. Система ожидает подтверждения операций за текущую дату.
                  </p>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-ios shadow-ios flex flex-col justify-between h-[140px]">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400"><Wallet size={20} /></div>
                  <span className="font-medium text-[15px]">Общий баланс</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight">{totalBalance.toLocaleString()} ₸</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-ios shadow-ios flex flex-col justify-between h-[140px]">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400"><TrendingUp size={20} /></div>
                  <span className="font-medium text-[15px]">Доход <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({dateFilter.label})</span></span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400 tracking-tight">+{periodIncome.toLocaleString()} ₸</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-ios shadow-ios flex flex-col justify-between h-[140px]">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400"><TrendingDown size={20} /></div>
                  <span className="font-medium text-[15px]">Расход <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({dateFilter.label})</span></span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400 tracking-tight">-{periodExpense.toLocaleString()} ₸</div>
          </div>
      </div>

      <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
              <h2 className="text-[20px] font-bold text-black dark:text-white">Счета и Кассы</h2>
              <button onClick={() => openAccountModal()} className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:opacity-70">
                  + Добавить счет
              </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
              {accounts.map(acc => {
                  const parentAcc = acc.parentId ? accounts.find(a => a.id === acc.parentId) : null;
                  const lastUpdate = getAccountLastUpdate(acc.id);
                  const isUpToDate = lastUpdate === todayIso;
                  
                  return (
                    <div key={acc.id} className={`min-w-[280px] bg-white dark:bg-slate-800 p-5 rounded-ios shadow-ios border flex flex-col justify-between h-[160px] relative overflow-hidden group transition-all ${!isUpToDate && acc.type === 'Bank' ? 'border-red-200 dark:border-red-800/50 shadow-red-100 dark:shadow-none' : 'border-gray-100 dark:border-slate-700'}`}>
                        <div className="absolute right-[-10px] top-[-10px] opacity-10 transform rotate-12 group-hover:scale-110 transition-transform pointer-events-none text-black dark:text-white">
                            {acc.type === 'Cash' ? <Wallet size={80} /> : acc.type === 'Bank' ? <Landmark size={80} /> : <CreditCard size={80} />}
                        </div>
                        
                        <div className="absolute top-3 right-3 flex gap-1 z-10">
                             <button 
                                onClick={(e) => { e.stopPropagation(); openAccountModal(acc); }}
                                className="p-1.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Редактировать"
                            >
                                <Edit2 size={14} />
                            </button>
                             <button 
                                onClick={(e) => { e.stopPropagation(); initiateDeleteAccount(acc); }}
                                className="p-1.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Удалить счет"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center 
                                ${acc.type === 'Cash' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 
                                  acc.type === 'Bank' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 
                                  'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                                    {acc.type === 'Cash' ? <DollarSign size={20} /> : acc.type === 'Bank' ? <Landmark size={20} /> : <CreditCard size={20} />}
                            </div>
                            <div>
                                <div className="font-bold text-black dark:text-white text-[15px]">{acc.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                                    {acc.type === 'Cash' ? 'Наличные' : acc.type === 'Bank' ? 'Банк' : 'Подсчет'}
                                    {parentAcc && <span className="text-[10px] bg-gray-100 dark:bg-slate-700 px-1 rounded flex items-center"><CornerDownRight size={8} className="mr-0.5"/> {parentAcc.name}</span>}
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <div className="text-lg sm:text-xl md:text-2xl font-bold text-black dark:text-white">{acc.balance.toLocaleString()} ₸</div>
                            {acc.accountNumber && (
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-1 flex items-center gap-1">
                                    <Hash size={10} /> {acc.accountNumber}
                                </div>
                            )}
                        </div>

                        <div className="pt-2 mt-auto border-t border-dashed border-gray-100 dark:border-slate-700">
                            {acc.type === 'Bank' ? (
                                !isUpToDate ? (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                        className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors w-full justify-center animate-pulse shadow-sm"
                                    >
                                        <FileUp size={12} />
                                        Требуется выписка за СЕГОДНЯ
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded w-fit">
                                        <CheckCircle size={10} />
                                        Выписка актуальна
                                    </div>
                                )
                            ) : (
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                                    {acc.type === 'Cash' ? 'Сверка через кассу' : 'Синхронизируется автоматически'}
                                </div>
                            )}
                        </div>
                    </div>
                  );
              })}
              
              <button onClick={() => openAccountModal()} className="min-w-[100px] flex flex-col items-center justify-center gap-2 rounded-ios border-2 border-dashed border-gray-300 dark:border-slate-600 text-gray-400 dark:text-gray-500 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors h-[160px]">
                  <Plus size={24} />
                  <span className="text-sm font-medium">Новый</span>
              </button>
          </div>
      </div>

      {/* --- TRANSACTIONS LIST --- */}
      <div className="bg-white dark:bg-slate-800 rounded-ios shadow-ios border border-gray-200 dark:border-slate-700 overflow-visible relative">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
                 <h2 className="text-[17px] font-bold text-black dark:text-white whitespace-nowrap">История операций</h2>
                 
                 <div className="relative" ref={datePickerRef}>
                    <button 
                        onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 border border-transparent hover:border-gray-200 dark:hover:border-slate-500 rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all"
                    >
                        <CalendarIcon size={16} className="text-gray-500 dark:text-gray-400"/>
                        <span>{dateFilter.label}</span>
                        <ChevronDown size={14} className={`text-gray-400 dark:text-gray-500 transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDatePickerOpen && (
                        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 z-50 flex flex-col sm:flex-row w-[320px] sm:w-[540px] overflow-hidden animate-in fade-in slide-in-from-top-2">
                            {/* ... (Calendar Picker Logic) ... */}
                            <div className="w-full sm:w-1/3 bg-gray-50/80 dark:bg-slate-900/50 border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-slate-700 p-2 flex flex-col gap-1">
                                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Быстрый выбор</div>
                                {[
                                    { id: 'month', label: 'За текущий месяц' },
                                    { id: 'last_month', label: 'За прошлый месяц' },
                                    { id: 'year', label: 'За текущий год' },
                                    { id: 'all', label: 'За всё время' }
                                ].map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => handlePreset(preset.id as any)}
                                        className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${dateFilter.label === preset.label ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'}`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="w-full sm:w-2/3 p-4">
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <button onClick={() => changeViewMonth(-1)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-gray-400"><ChevronLeft size={20} /></button>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{getMonthName(viewDate.getMonth())} {viewDate.getFullYear()}</span>
                                    <button onClick={() => changeViewMonth(1)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-gray-400"><ChevronRight size={20} /></button>
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                    {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
                                        <div key={d} className="text-xs text-gray-400 font-medium">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1 place-items-center">
                                    {renderCalendar()}
                                </div>
                                
                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {tempRange.start ? `${tempRange.start} — ` : 'Выберите даты'}
                                        {tempRange.end ? tempRange.end : ''}
                                    </div>
                                    <button 
                                        onClick={applyCustomRange}
                                        disabled={!tempRange.start || !tempRange.end}
                                        className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Применить
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                 </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto justify-end">
                 
                 {selectedTxIds.size > 0 && (
                     <div className="flex items-center gap-2 animate-in fade-in">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{selectedTxIds.size} выбрано</span>
                        <button 
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                            <Trash2 size={16} />
                            <span className="hidden sm:inline">Удалить</span>
                        </button>
                     </div>
                 )}

                 <div className="relative w-full sm:w-auto">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                     <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Поиск..." 
                        className="w-full sm:w-48 pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white"
                     />
                 </div>

                 <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-2xl w-full sm:w-auto">
                    {(['All', 'Income', 'Expense'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`flex-1 sm:flex-none px-3 py-1 text-[13px] font-medium rounded-xl transition-all ${filterType === type ? 'bg-white dark:bg-slate-600 shadow-sm text-black dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >
                            {type === 'All' ? 'Все' : type === 'Income' ? 'Доходы' : 'Расходы'}
                        </button>
                    ))}
                 </div>
              </div>
          </div>
          
          {isAllPageSelected && !isAllTotalSelected && (
              <div className="bg-blue-50/80 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-900/50 p-2 text-center text-sm text-blue-800 dark:text-blue-300 animate-in fade-in slide-in-from-top-1">
                  <span>Выбрано <b>{currentTransactions.length}</b> на этой странице.</span>
                  <button 
                    onClick={selectAllGlobally}
                    className="ml-2 font-bold underline hover:text-blue-900 cursor-pointer"
                  >
                      Выбрать все транзакции ({totalItems})
                  </button>
              </div>
          )}
          {isAllTotalSelected && totalItems > currentTransactions.length && (
              <div className="bg-blue-50/80 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-900/50 p-2 text-center text-sm text-blue-800 dark:text-blue-300 animate-in fade-in slide-in-from-top-1">
                  <span>Выбраны все <b>{totalItems}</b> транзакций.</span>
                  <button 
                    onClick={clearSelection}
                    className="ml-2 font-bold underline hover:text-blue-900 cursor-pointer"
                  >
                      Снять выделение
                  </button>
              </div>
          )}

          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 font-medium">
                      <tr>
                          <th className="px-4 py-3 w-[40px] text-center">
                              <input 
                                type="checkbox" 
                                className="rounded border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 cursor-pointer dark:bg-slate-700"
                                checked={isAllPageSelected}
                                onChange={toggleSelectPage}
                              />
                          </th>
                          <th onClick={() => handleSort('date')} className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group select-none">
                              <div className="flex items-center gap-1">
                                  Дата
                                  {sortConfig?.key === 'date' ? (
                                      sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-black dark:text-white"/> : <ChevronDown size={14} className="text-black dark:text-white"/>
                                  ) : (
                                      <ArrowUpDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                              </div>
                          </th>
                          <th onClick={() => handleSort('category')} className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group select-none">
                              <div className="flex items-center gap-1">
                                  Категория / Описание
                                  {sortConfig?.key === 'category' ? (
                                      sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-black dark:text-white"/> : <ChevronDown size={14} className="text-black dark:text-white"/>
                                  ) : (
                                      <ArrowUpDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                              </div>
                          </th>
                          <th onClick={() => handleSort('account')} className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group select-none">
                              <div className="flex items-center gap-1">
                                  Счет
                                  {sortConfig?.key === 'account' ? (
                                      sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-black dark:text-white"/> : <ChevronDown size={14} className="text-black dark:text-white"/>
                                  ) : (
                                      <ArrowUpDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                              </div>
                          </th>
                          <th onClick={() => handleSort('amount')} className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group select-none">
                              <div className="flex items-center justify-end gap-1">
                                  Сумма
                                  {sortConfig?.key === 'amount' ? (
                                      sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-black dark:text-white"/> : <ChevronDown size={14} className="text-black dark:text-white"/>
                                  ) : (
                                      <ArrowUpDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                              </div>
                          </th>
                          <th onClick={() => handleSort('type')} className="px-6 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group select-none">
                              <div className="flex items-center justify-center gap-1">
                                  Тип
                                  {sortConfig?.key === 'type' ? (
                                      sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-black dark:text-white"/> : <ChevronDown size={14} className="text-black dark:text-white"/>
                                  ) : (
                                      <ArrowUpDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                              </div>
                          </th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {currentTransactions.length > 0 ? (
                          currentTransactions.map(tx => {
                            const account = accounts.find(a => a.id === tx.accountId);
                            const isSelected = selectedTxIds.has(tx.id);
                            return (
                                <tr key={tx.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                    <td className="px-4 py-4 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 cursor-pointer dark:bg-slate-700"
                                            checked={isSelected}
                                            onChange={() => toggleSelectOne(tx.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-400">{tx.date}</td>
                                    <td className="px-6 py-4 max-w-[250px]">
                                        <div className="font-semibold text-gray-900 dark:text-gray-200 flex items-center gap-2 truncate" title={tx.category}>
                                            {tx.category}
                                            {tx.is1C && <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-800 font-bold shrink-0">1С</span>}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={tx.description}>{tx.description}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-[150px] truncate" title={account ? account.name : 'Неизвестно'}>
                                        {account ? account.name : 'Неизвестно'}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold text-[15px] ${tx.type === 'Income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {tx.type === 'Income' ? '+' : '-'}{tx.amount.toLocaleString()} ₸
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${tx.type === 'Income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                            {tx.type === 'Income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                      ) : (
                          <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                  Нет операций за выбранный период
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>

          {totalItems > 0 && (
              <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-slate-700/30">
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Показано {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} из {totalItems}
                  </div>
                  
                  <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 relative">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Строк:</span>
                          <div className="relative">
                            <select 
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-xs rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-1.5 pr-6 appearance-none cursor-pointer"
                            >
                                {[10, 20, 30, 40, 50, 100, 1000].map(val => (
                                    <option key={val} value={val}>{val}</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                      </div>

                      <div className="flex items-center gap-1">
                          {/* Pagination Buttons */}
                          <button 
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          >
                              <ChevronLeft size={18} />
                          </button>
                          
                          <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{currentPage} / {totalPages}</span>
                          </div>

                          <button 
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          >
                              <ChevronRight size={18} />
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* --- MODAL: NEW TRANSACTION --- */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className={`p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center`}>
              <h2 className={`text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white`}>
                  Новая транзакция
              </h2>
              <button onClick={() => setIsTxModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleTxSubmit} className="p-6 space-y-4">
              <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setTxType('Income')}
                  className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    txType === 'Income' 
                      ? 'bg-white dark:bg-slate-600 shadow-sm text-green-700 dark:text-green-400' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <ArrowDownLeft size={16} />
                  Доход
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('Expense')}
                  className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    txType === 'Expense' 
                      ? 'bg-white dark:bg-slate-600 shadow-sm text-red-700 dark:text-red-400' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <ArrowUpRight size={16} />
                  Расход
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Сумма (₸)</label>
                <input 
                  required
                  autoFocus
                  type="number" 
                  value={txForm.amount}
                  onChange={e => setTxForm({...txForm, amount: e.target.value})}
                  className={`w-full px-4 py-3 bg-white dark:bg-slate-700 border rounded-2xl focus:outline-none focus:ring-2 text-2xl font-bold text-gray-900 dark:text-white transition-colors ${
                      txType === 'Income' 
                        ? 'border-gray-300 dark:border-slate-600 focus:ring-green-500' 
                        : 'border-gray-300 dark:border-slate-600 focus:ring-red-500'
                  }`}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Счет / Касса</label>
                <div className="relative">
                    <select 
                    required
                    value={txForm.accountId}
                    onChange={e => setTxForm({...txForm, accountId: e.target.value})}
                    className="w-full pl-4 pr-10 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                    >
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance.toLocaleString()} ₸)</option>
                    ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Категория</label>
                <input 
                  required
                  type="text" 
                  value={txForm.category}
                  onChange={e => setTxForm({...txForm, category: e.target.value})}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={txType === 'Income' ? "Оплата от клиента, Возврат..." : "Аренда, Зарплата, Закуп..."}
                  list="categories"
                />
                <datalist id="categories">
                    <option value="Оплата от клиента" />
                    <option value="Зарплата" />
                    <option value="Аренда" />
                    <option value="Закуп оборудования" />
                    <option value="ГСМ" />
                    <option value="Налоги" />
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Описание / Комментарий</label>
                <textarea 
                  rows={2}
                  value={txForm.description}
                  onChange={e => setTxForm({...txForm, description: e.target.value})}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Детали операции..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Дата</label>
                <input 
                  required
                  type="date" 
                  value={txForm.date}
                  onChange={e => setTxForm({...txForm, date: e.target.value})}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsTxModalOpen(false)}
                  className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className={`flex-1 px-4 py-3 text-white rounded-2xl shadow-md font-bold transition-colors flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90`}
                >
                  <Save size={18} />
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- UNKNOWN ACCOUNT MODAL (FOR 1C) --- */}
      {isUnknownAccountModalOpen && pendingNewAccountDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col p-6 text-center border border-orange-100 dark:border-orange-900/30">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileWarning size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Неизвестный счет</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    В выписке найден счет <strong>{pendingNewAccountDetails.number}</strong>, которого нет в системе. Создать его?
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => { setIsUnknownAccountModalOpen(false); setPendingImportTransactions(null); }}
                        className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold"
                    >
                        Отмена
                    </button>
                    <button 
                        onClick={proceedToCreateAccount}
                        className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 font-bold transition-colors"
                    >
                        Создать
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- MISSING CLIENTS MODAL --- */}
      {isMissingClientsModalOpen && missingClients.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col border border-indigo-100 dark:border-indigo-900/30 max-h-[80vh]">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                        <UserPlus size={24} />
                        Новые контрагенты
                    </h3>
                    <div className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-2 py-1 rounded-full">
                        {missingClients.length}
                    </div>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        В выписке обнаружены организации, которых нет в базе клиентов. Необходимо добавить их для корректного импорта.
                    </p>
                    <div className="space-y-3">
                        {missingClients.map((client, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-slate-600">
                                <div className="p-2 bg-white dark:bg-slate-600 rounded-lg text-indigo-600 dark:text-indigo-400 shadow-sm">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-white text-sm">{client.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">БИН/ИИН: {client.bin}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex gap-3 bg-gray-50/50 dark:bg-slate-800/50 rounded-b-2xl">
                    <button 
                        onClick={() => { setIsMissingClientsModalOpen(false); setPendingImportTransactions(null); setMissingClients([]); }}
                        className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold border border-transparent hover:border-gray-200 dark:hover:border-slate-600"
                    >
                        Отмена
                    </button>
                    <button 
                        onClick={handleCreateMissingClients}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl hover:opacity-90 shadow-lg shadow-indigo-500/30 font-bold transition-all"
                    >
                        Добавить всех и продолжить
                    </button>
                </div>
            </div>
        </div>
      )}
      
      {/* --- DELETE TX CONFIRMATION MODAL --- */}
      {isDeleteTxModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col p-6 text-center border border-red-100 dark:border-red-900/30">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertOctagon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Удалить операции?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                      Вы выбрали <strong>{selectedTxIds.size}</strong> операций. Это действие отменит изменения баланса счетов.
                  </p>
                  <div className="flex gap-3">
                      <button 
                          onClick={() => setIsDeleteTxModalOpen(false)}
                          className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold"
                      >
                          Отмена
                      </button>
                      <button 
                          onClick={executeDeleteSelected}
                          className="flex-1 px-4 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 font-bold transition-colors"
                      >
                          Удалить
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- DELETE ACCOUNT MODAL --- */}
      {deletingAccount && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col p-6 text-center border border-red-100 dark:border-red-900/30">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShieldAlert size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Удаление счета</h3>
                  
                  {deleteStep === 1 && (
                      <>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                              Внимание! Это действие удалит счет <strong>{deletingAccount.name}</strong> и ВСЕ связанные с ним операции. Баланс будет утерян.
                          </p>
                          <div className="flex gap-3">
                              <button 
                                  onClick={() => setDeletingAccount(null)}
                                  className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold"
                              >
                                  Отмена
                              </button>
                              <button 
                                  onClick={() => setDeleteStep(2)}
                                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 font-bold transition-colors"
                              >
                                  Понятно
                              </button>
                          </div>
                      </>
                  )}

                  {deleteStep === 2 && (
                      <>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                              Для подтверждения введите название счета: <br/>
                              <span className="font-mono font-bold select-all bg-gray-100 dark:bg-slate-700 px-1 rounded">{deletingAccount.name}</span>
                          </p>
                          <input 
                              type="text" 
                              autoFocus
                              value={deleteConfirmationName}
                              onChange={(e) => setDeleteConfirmationName(e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 text-center mb-4 text-gray-900 dark:text-white"
                              placeholder="Введите название"
                          />
                          <div className="flex gap-3">
                              <button 
                                  onClick={() => setDeletingAccount(null)}
                                  className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold"
                              >
                                  Отмена
                              </button>
                              <button 
                                  onClick={executeDeleteAccount}
                                  disabled={deleteConfirmationName !== deletingAccount.name}
                                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  Удалить
                              </button>
                          </div>
                      </>
                  )}
              </div>
          </div>
      )}
      
      {/* --- IMPORT RESULT MODAL --- */}
      {importResult.open && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20">
                      <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                          <RefreshCw size={20} />
                          Результат импорта
                      </h3>
                      <button onClick={() => setImportResult({...importResult, open: false})} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{importResult.added}</div>
                              <div className="text-xs text-green-700 dark:text-green-300 font-medium">Добавлено</div>
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-2xl">
                              <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{importResult.duplicates}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Дубликаты</div>
                          </div>
                      </div>

                      {importResult.fileFinalBalance !== undefined && (
                          <div className="border border-gray-200 dark:border-slate-600 rounded-2xl p-4 bg-gray-50/50 dark:bg-slate-700/30">
                              <div className="flex justify-between items-center text-sm mb-2">
                                  <span className="text-gray-500 dark:text-gray-400">Остаток в файле 1С:</span>
                                  <span className="font-bold text-gray-900 dark:text-white">{importResult.fileFinalBalance.toLocaleString()} ₸</span>
                              </div>
                              <div className="flex justify-between items-center text-sm mb-2">
                                  <span className="text-gray-500 dark:text-gray-400">Расчетный остаток:</span>
                                  <span className="font-bold text-gray-900 dark:text-white">{importResult.projectedBalance.toLocaleString()} ₸</span>
                              </div>
                              
                              {importResult.skippedBalanceUpdate ? (
                                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600 text-xs text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center gap-1 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg">
                                      <History size={14} /> Баланс сохранен (Выписка за прошлый период)
                                  </div>
                              ) : importResult.fileFinalBalance !== importResult.projectedBalance ? (
                                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600">
                                      <div className="text-xs text-red-500 dark:text-red-400 font-medium mb-2 flex items-center gap-1">
                                          <AlertTriangle size={12} /> Обнаружено расхождение!
                                      </div>
                                      <button 
                                          onClick={applyImportCorrection}
                                          className="w-full py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-xl text-sm font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                      >
                                          Скорректировать баланс
                                      </button>
                                  </div>
                              ) : (
                                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600 text-xs text-green-600 dark:text-green-400 font-bold flex items-center justify-center gap-1">
                                      <CheckCircle size={14} /> Баланс сходится идеально
                                  </div>
                              )}
                          </div>
                      )}

                      <button 
                          onClick={() => setImportResult({...importResult, open: false})}
                          className="w-full py-3 bg-gray-900 text-white dark:bg-white dark:text-black rounded-2xl font-bold hover:opacity-90 transition-opacity"
                      >
                          Закрыть
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL: NEW / EDIT ACCOUNT --- */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20">
              <h2 className="text-xl font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <Landmark size={24} />
                  {editingAccount ? 'Редактировать счет' : 'Новый счет'}
              </h2>
              <button 
                onClick={() => { setIsAccountModalOpen(false); setPendingImportTransactions(null); }} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAccountSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название счета</label>
                <input 
                  required
                  type="text" 
                  value={accForm.name}
                  onChange={e => setAccForm({...accForm, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  placeholder="Касса №2, Halyk Gold..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип счета</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Cash', label: 'Касса' }, 
                      { id: 'Bank', label: 'Банк' }, 
                      { id: 'SubAccount', label: 'Подсчет' }
                    ].map(type => (
                        <button
                            key={type.id}
                            type="button"
                            disabled={!!editingAccount} // DISABLE EDITING
                            onClick={() => !editingAccount && setAccForm({...accForm, type: type.id as AccountType, accountNumber: '', parentId: ''})}
                            className={`py-3 px-1 rounded-2xl border text-sm font-bold transition-colors ${accForm.type === type.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'} ${editingAccount ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
              </div>

              {(accForm.type === 'Bank' || accForm.type === 'SubAccount') && (
                  <div className="animate-in fade-in slide-in-from-top-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {accForm.type === 'SubAccount' ? 'Номер карты / счета' : 'Номер счета (ИИК)'}
                    </label>
                    <input 
                      type="text" 
                      value={accForm.accountNumber}
                      disabled={!!editingAccount} // DISABLE EDITING
                      onChange={e => setAccForm({...accForm, accountNumber: e.target.value})}
                      className={`w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900 dark:text-white ${editingAccount ? 'bg-gray-100 dark:bg-slate-900 text-gray-500' : ''}`}
                      placeholder={accForm.type === 'SubAccount' ? "0000 0000 0000 0000" : "KZ..."}
                    />
                  </div>
              )}

              {accForm.type === 'SubAccount' && (
                  <div className="animate-in fade-in slide-in-from-top-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Родительский счет</label>
                    <div className="relative">
                        <select
                        required
                        value={accForm.parentId}
                        onChange={e => setAccForm({...accForm, parentId: e.target.value})}
                        className="w-full pl-4 pr-10 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                        >
                            <option value="">Выберите главный счет</option>
                            {accounts.filter(a => a.type !== 'SubAccount' && a.id !== editingAccount?.id).map(a => (
                                <option key={a.id} value={a.id}>{a.name} ({a.type === 'Cash' ? 'Касса' : 'Банк'})</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {editingAccount ? 'Текущий баланс' : 'Начальный остаток'}
                </label>
                <input 
                  required
                  type="number" 
                  value={accForm.initialBalance}
                  disabled={!!editingAccount} // DISABLE EDITING
                  onChange={e => setAccForm({...accForm, initialBalance: e.target.value})}
                  className={`w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white ${editingAccount ? 'bg-gray-100 dark:bg-slate-900 text-gray-500' : ''}`}
                  placeholder="0"
                />
                {editingAccount && <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">Баланс изменяется только через транзакции или сверку.</p>}
              </div>

              {pendingImportTransactions && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-sm border border-blue-200 dark:border-blue-900/40 flex gap-2">
                      <FileText size={16} className="shrink-0 mt-0.5" />
                      <div>
                          <strong>Авто-импорт:</strong> При создании будет загружено {pendingImportTransactions.length} операций.
                      </div>
                  </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => { setIsAccountModalOpen(false); setPendingImportTransactions(null); }}
                  className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:opacity-90 shadow-lg shadow-blue-500/30 font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {editingAccount ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
