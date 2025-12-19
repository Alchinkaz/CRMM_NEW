
import React, { useState } from 'react';
import { User, InventoryItem, UserRole } from '../types';
import { INVENTORY } from '../mockData';
import { Package, Plus, Search, Satellite, Smartphone, Box, ArrowRightLeft, Users, X, Save, Building2, ChevronDown } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../components/Toast';

interface WarehousePageProps {
  user: User;
}

export const WarehousePage: React.FC<WarehousePageProps> = ({ user }) => {
  const { addToast } = useToast();
  // Fetch users locally needed for transfer
  const [users] = useLocalStorage<User[]>('crm_users', []);
  const [inventory, setInventory] = useLocalStorage<InventoryItem[]>('crm_inventory', INVENTORY);

  // States
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedItemForTransfer, setSelectedItemForTransfer] = useState<InventoryItem | null>(null);
  
  // New Inventory Item Form State
  const [newInventoryItem, setNewInventoryItem] = useState({
      category: 'GPS' as any,
      model: '',
      quantity: 1,
  });

  // Transfer Form State
  const [transferData, setTransferData] = useState({
      targetUserId: '',
      quantity: 1
  });

  // --- INVENTORY LOGIC ---
  const handleAddInventoryItem = (e: React.FormEvent) => {
      e.preventDefault();
      const newItem: InventoryItem = {
          id: `inv${Date.now()}`,
          category: newInventoryItem.category,
          model: newInventoryItem.model,
          quantity: Number(newInventoryItem.quantity),
          ownerId: 'warehouse'
      };
      setInventory(prev => [...prev, newItem]);
      addToast('Товар добавлен на склад', 'success');
      setIsInventoryModalOpen(false);
      setNewInventoryItem({ category: 'GPS', model: '', quantity: 1 });
  };

  const openTransferModal = (item: InventoryItem) => {
      setSelectedItemForTransfer(item);
      setTransferData({ targetUserId: '', quantity: 1 });
      setIsTransferModalOpen(true);
  };

  const handleTransfer = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedItemForTransfer || !transferData.targetUserId) return;

      const qtyToTransfer = Number(transferData.quantity);
      if (qtyToTransfer > selectedItemForTransfer.quantity) {
          addToast('Недостаточно товара на складе', 'error');
          return;
      }

      setInventory(prev => {
          const updated = [...prev];
          
          // 1. Decrease Source
          const sourceItemIndex = updated.findIndex(i => i.id === selectedItemForTransfer.id);
          if (sourceItemIndex > -1) {
              updated[sourceItemIndex].quantity -= qtyToTransfer;
          }

          // 2. Increase Target (Engineer)
          const targetItemIndex = updated.findIndex(i => 
              i.ownerId === transferData.targetUserId && 
              i.model === selectedItemForTransfer.model && 
              i.category === selectedItemForTransfer.category
          );

          if (targetItemIndex > -1) {
              updated[targetItemIndex].quantity += qtyToTransfer;
          } else {
              updated.push({
                  id: `inv_usr_${Date.now()}`,
                  category: selectedItemForTransfer.category,
                  model: selectedItemForTransfer.model,
                  quantity: qtyToTransfer,
                  ownerId: transferData.targetUserId
              });
          }

          return updated;
      });

      addToast(`Выдано ${qtyToTransfer} шт. инженеру`, 'success');
      setIsTransferModalOpen(false);
  };

  return (
    <div className="space-y-6 relative h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white dark:drop-shadow-sm">Склад</h1>
          <p className="text-slate-600 dark:text-gray-400 font-medium">Учет оборудования и материалов</p>
        </div>
        
        <button 
            onClick={() => { setIsInventoryModalOpen(true); }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-colors shadow-lg shadow-blue-500/30 font-bold"
        >
            <Plus size={18} />
            <span>Поступление товара</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* MAIN WAREHOUSE */}
          <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                      Главный Склад
                  </h3>
              </div>
              
              <div className="space-y-3">
                  {inventory.filter(i => i.ownerId === 'warehouse').map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-2xl border border-gray-100 dark:border-slate-600/50">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                  {item.category === 'GPS' ? <Satellite size={20}/> : item.category === 'SIM' ? <Smartphone size={20}/> : <Box size={20}/>}
                              </div>
                              <div>
                                  <div className="font-bold text-slate-900 dark:text-white">{item.model}</div>
                                  <div className="text-xs text-slate-500 dark:text-gray-400 uppercase font-semibold">{item.category}</div>
                              </div>
                          </div>
                          <div className="flex items-center gap-4">
                              <div className="text-right">
                                  <div className="text-xl font-bold text-slate-900 dark:text-white">{item.quantity} шт.</div>
                              </div>
                              <button 
                                onClick={() => openTransferModal(item)}
                                className="p-2 bg-white dark:bg-slate-600 border border-gray-200 dark:border-slate-500 rounded-xl text-slate-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-500 transition-colors"
                                title="Выдать инженеру"
                              >
                                  <ArrowRightLeft size={18} />
                              </button>
                          </div>
                      </div>
                  ))}
                  {inventory.filter(i => i.ownerId === 'warehouse').length === 0 && (
                      <div className="text-center py-8 text-slate-400 dark:text-gray-500">Склад пуст</div>
                  )}
              </div>
          </div>

          {/* ENGINEERS STOCK */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                  <Users size={20} className="text-indigo-600 dark:text-indigo-400" />
                  У инженеров
              </h3>
              
              <div className="space-y-6 overflow-y-auto max-h-[600px] pr-2">
                  {/* Filter only engineers who have stock */}
                  {users.filter(u => inventory.some(i => i.ownerId === u.id)).map(u => (
                      <div key={u.id}>
                          <div className="flex items-center gap-2 mb-3">
                              <img src={u.avatar} className="w-6 h-6 rounded-full" alt={u.name} />
                              <span className="font-bold text-sm text-slate-700 dark:text-gray-300">{u.name}</span>
                          </div>
                          <div className="space-y-2 pl-3 border-l-2 border-gray-100 dark:border-slate-700">
                              {inventory.filter(i => i.ownerId === u.id).map(item => (
                                  <div key={item.id} className="flex justify-between items-center text-sm">
                                      <span className="text-slate-600 dark:text-gray-400 truncate max-w-[150px]" title={item.model}>{item.model}</span>
                                      <span className="font-bold text-slate-800 dark:text-white bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg">{item.quantity}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
                  {users.filter(u => inventory.some(i => i.ownerId === u.id)).length === 0 && (
                      <div className="text-center py-8 text-slate-400 dark:text-gray-500">Оборудование не выдано</div>
                  )}
              </div>
          </div>
      </div>

      {/* --- MODAL: ADD INVENTORY --- */}
      {isInventoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col border border-white/50 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 rounded-t-3xl">
              <h2 className="text-xl font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-2 dark:drop-shadow-sm">
                  <Package size={24} />
                  Поступление на склад
              </h2>
              <button onClick={() => setIsInventoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddInventoryItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Категория</label>
                <div className="grid grid-cols-2 gap-2">
                    {['GPS', 'SIM', 'Consumable', 'Tool'].map(cat => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setNewInventoryItem({...newInventoryItem, category: cat as any})}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                                newInventoryItem.category === cat
                                ? 'bg-blue-100 border-blue-500 text-blue-800'
                                : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-slate-600 dark:text-gray-300'
                            }`}
                        >
                            {cat === 'GPS' ? 'Оборудование (GPS)' : cat === 'SIM' ? 'SIM-карты' : cat === 'Consumable' ? 'Расходники' : 'Инструмент'}
                        </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Модель / Название</label>
                <input 
                  required
                  type="text" 
                  value={newInventoryItem.model}
                  onChange={e => setNewInventoryItem({...newInventoryItem, model: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                  placeholder="Teltonika FMB920"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Количество</label>
                <input 
                  required
                  type="number" 
                  min="1"
                  value={newInventoryItem.quantity}
                  onChange={e => setNewInventoryItem({...newInventoryItem, quantity: Number(e.target.value)})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsInventoryModalOpen(false)}
                  className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 font-bold transition-colors"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: TRANSFER INVENTORY --- */}
      {isTransferModalOpen && selectedItemForTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col border border-white/50 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 rounded-t-3xl">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <ArrowRightLeft size={24} />
                  Выдача оборудования
              </h2>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleTransfer} className="p-6 space-y-4">
              <div className="bg-gray-100 dark:bg-slate-700 p-3 rounded-xl mb-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Товар</div>
                  <div className="font-bold text-slate-900 dark:text-white">{selectedItemForTransfer.model}</div>
                  <div className="text-xs text-slate-500 dark:text-gray-400">На складе: {selectedItemForTransfer.quantity} шт.</div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Кому выдать (Инженер)</label>
                <div className="relative">
                    <select 
                        required
                        value={transferData.targetUserId}
                        onChange={e => setTransferData({...transferData, targetUserId: e.target.value})}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
                    >
                        <option value="">Выберите инженера...</option>
                        {users.filter(u => u.role === UserRole.ENGINEER).map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">Количество</label>
                <input 
                  required
                  type="number" 
                  min="1"
                  max={selectedItemForTransfer.quantity}
                  value={transferData.quantity}
                  onChange={e => setTransferData({...transferData, quantity: Number(e.target.value)})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsTransferModalOpen(false)}
                  className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 font-bold transition-colors"
                >
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
