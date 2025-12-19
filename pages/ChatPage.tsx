
import React, { useState, useRef, useEffect } from 'react';
import { User, ChatMessage } from '../types';
import { Send, Image as ImageIcon, Search, ChevronLeft, MoreVertical, Phone, User as UserIcon, Users, MessageSquare } from 'lucide-react';

interface ChatPageProps {
  currentUser: User;
  users: User[];
  messages: ChatMessage[];
  onSendMessage: (text: string, receiverId?: string) => void;
  onReadMessages: (senderId: string) => void; // Mark messages from this sender as read
}

export const ChatPage: React.FC<ChatPageProps> = ({ currentUser, users, messages, onSendMessage, onReadMessages }) => {
  // 'general' or userId
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  
  // Mobile UI State
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Detect Mobile
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedChatId]);

  // Mark as read when opening chat
  useEffect(() => {
      if (selectedChatId && selectedChatId !== 'general') {
          onReadMessages(selectedChatId);
      }
  }, [selectedChatId, messages.length]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    // If 'general', receiverId is undefined. If user, it is the ID.
    const receiver = selectedChatId === 'general' ? undefined : selectedChatId || undefined;
    onSendMessage(inputText, receiver);
    setInputText('');
  };

  const handleSelectChat = (id: string) => {
      setSelectedChatId(id);
      if (isMobileView) setShowChatOnMobile(true);
  };

  const handleBackToContacts = () => {
      setShowChatOnMobile(false);
      setSelectedChatId(null);
  };

  // --- FILTERS & DATA PREP ---

  // 1. Prepare Contact List with Search (Name OR Message Content)
  const normalizedSearch = searchQuery.toLowerCase().trim();

  const allContacts = [
      { id: 'general', name: 'Общий чат', avatar: null, isGroup: true },
      ...users.filter(u => u.id !== currentUser.id)
  ];

  const contacts = allContacts.filter(contact => {
      if (!normalizedSearch) return true;

      // 1. Check Name
      if (contact.name.toLowerCase().includes(normalizedSearch)) return true;

      // 2. Check Message History Content
      const hasMatchingMessage = messages.some(m => {
          // Optimization: Check text content match first
          if (!m.text.toLowerCase().includes(normalizedSearch)) return false;

          // Then check if message belongs to this chat
          if (contact.id === 'general') {
              return !m.receiverId; // General chat messages
          } else {
              return (m.senderId === currentUser.id && m.receiverId === contact.id) ||
                     (m.senderId === contact.id && m.receiverId === currentUser.id);
          }
      });

      return hasMatchingMessage;
  });

  const getContactMeta = (contactId: string, isGroup: boolean) => {
      let chatMsgs: ChatMessage[] = [];
      if (isGroup) {
          chatMsgs = messages.filter(m => !m.receiverId);
      } else {
          chatMsgs = messages.filter(m => 
              (m.senderId === currentUser.id && m.receiverId === contactId) ||
              (m.senderId === contactId && m.receiverId === currentUser.id)
          );
      }
      
      const lastMsg = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : null;
      
      // Unread count: Messages sent BY contact TO me that are NOT read
      const unreadCount = !isGroup 
        ? messages.filter(m => m.senderId === contactId && m.receiverId === currentUser.id && !m.isRead).length
        : 0; // Logic for group unread is complex (needs per-user read status), skipping for MVP

      return { lastMsg, unreadCount };
  };

  // 2. Get Messages for Active Chat
  const activeMessages = messages.filter(m => {
      if (selectedChatId === 'general') {
          return !m.receiverId;
      }
      return (m.senderId === currentUser.id && m.receiverId === selectedChatId) ||
             (m.senderId === selectedChatId && m.receiverId === currentUser.id);
  });

  const activeContact = contacts.find(c => c.id === selectedChatId);

  // --- RENDER HELPERS ---
  
  const formatTime = (isoString: string) => {
      const date = new Date(isoString);
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden relative">
      
      {/* --- SIDEBAR (CONTACTS) --- */}
      <div className={`w-full md:w-80 bg-gray-50/50 dark:bg-slate-900/50 border-r border-gray-200 dark:border-slate-700 flex flex-col ${isMobileView && showChatOnMobile ? 'hidden' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Сообщения</h2>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск..." 
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
                />
            </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
            {contacts.map(contact => {
                const { lastMsg, unreadCount } = getContactMeta(contact.id, (contact as any).isGroup);
                const isActive = selectedChatId === contact.id;

                return (
                    <div 
                        key={contact.id}
                        onClick={() => handleSelectChat(contact.id)}
                        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-slate-800 last:border-0 ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                    >
                        <div className="relative shrink-0">
                            {contact.avatar ? (
                                <img src={contact.avatar} alt={contact.name} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                                    {(contact as any).isGroup ? <Users size={20} /> : <UserIcon size={20} />}
                                </div>
                            )}
                            {/* Online status could go here */}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h3 className="font-bold text-slate-900 dark:text-white truncate">{contact.name}</h3>
                                {lastMsg && <span className="text-[10px] text-gray-400 font-medium">{formatTime(lastMsg.createdAt)}</span>}
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate pr-2">
                                    {lastMsg ? (
                                        <>
                                            {lastMsg.senderId === currentUser.id && <span className="text-blue-500">Вы: </span>}
                                            {lastMsg.text}
                                        </>
                                    ) : <span className="italic opacity-50">Нет сообщений</span>}
                                </p>
                                {unreadCount > 0 && (
                                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
            {contacts.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">
                    Ничего не найдено
                </div>
            )}
        </div>
      </div>

      {/* --- CHAT AREA --- */}
      <div className={`flex-1 flex flex-col bg-[#F0F2F5] dark:bg-[#0B141A] ${isMobileView && !showChatOnMobile ? 'hidden' : 'flex'}`}>
          {selectedChatId ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between shrink-0 z-10">
                    <div className="flex items-center gap-3">
                        {isMobileView && (
                            <button onClick={handleBackToContacts} className="mr-1 text-slate-500 hover:text-slate-800 dark:text-slate-400">
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        {activeContact?.avatar ? (
                            <img src={activeContact.avatar} className="w-10 h-10 rounded-full" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                {activeContact?.id === 'general' ? <Users size={20}/> : <UserIcon size={20}/>}
                            </div>
                        )}
                        <div>
                            <div className="font-bold text-slate-900 dark:text-white leading-tight">{activeContact?.name}</div>
                            {activeContact?.id !== 'general' && (
                                <div className="text-xs text-green-600 dark:text-green-400">В сети</div>
                            )}
                        </div>
                    </div>
                    {activeContact?.id !== 'general' && (
                        <div className="flex gap-4 text-blue-600 dark:text-blue-400">
                            <Phone size={20} className="cursor-pointer hover:opacity-70" />
                            <MoreVertical size={20} className="cursor-pointer hover:opacity-70" />
                        </div>
                    )}
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Date separators could go here */}
                    {activeMessages.map(msg => {
                        const isMe = msg.senderId === currentUser.id;
                        const senderName = users.find(u => u.id === msg.senderId)?.name || 'Неизвестный';
                        
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] md:max-w-[60%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    {/* Name in Group Chat */}
                                    {!isMe && selectedChatId === 'general' && (
                                        <span className="text-[10px] font-bold text-gray-500 ml-2 mb-1">{senderName}</span>
                                    )}
                                    
                                    <div className={`px-4 py-2 rounded-2xl text-[15px] leading-relaxed shadow-sm relative group ${
                                        isMe 
                                            ? 'bg-blue-600 text-white rounded-br-none' 
                                            : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-none'
                                    }`}>
                                        {msg.text}
                                        <div className={`text-[10px] text-right mt-1 opacity-70 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                            {formatTime(msg.createdAt)}
                                            {isMe && (
                                                <span className="ml-1">{msg.isRead ? '✓✓' : '✓'}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex items-end gap-2">
                    <button type="button" className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <ImageIcon size={24} />
                    </button>
                    <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-2xl px-4 py-2">
                        <textarea 
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            rows={1}
                            placeholder="Написать сообщение..."
                            className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 text-slate-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none"
                            style={{ minHeight: '24px' }}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={!inputText.trim()}
                        className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                        <Send size={20} className={inputText.trim() ? 'ml-0.5' : ''} />
                    </button>
                </form>
              </>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
                  <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                      <MessageSquare size={48} className="text-gray-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 dark:text-gray-300 mb-1">Выберите чат</h3>
                  <p className="text-sm">Начните общение с коллегами</p>
              </div>
          )}
      </div>
    </div>
  );
};
