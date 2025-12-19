
import { Client, Sale, Task, TimeEntry, MonthlyService, User, UserRole, GpsTracker, CmsObject, MaintenanceObject, Advance, Role, FinancialAccount, Transaction, InventoryItem, ChatMessage, ServiceDocument } from './types';

// Default Permissions Setup - System Structure (Keep this)
const ALL_ACTIONS: any[] = ['view', 'create', 'edit', 'delete'];
const VIEW_ONLY: any[] = ['view'];

export const ROLES: Role[] = [
  {
    id: 'r_admin',
    name: 'Руководитель (Admin)',
    description: 'Полный доступ ко всем разделам системы',
    isSystem: true,
    permissions: [
      { resourceId: 'dashboard', actions: ALL_ACTIONS },
      { resourceId: 'clients', actions: ALL_ACTIONS },
      { resourceId: 'clients_export', actions: ALL_ACTIONS },
      { resourceId: 'tasks', actions: ALL_ACTIONS },
      { resourceId: 'tasks_assign', actions: ALL_ACTIONS },
      { resourceId: 'service', actions: ALL_ACTIONS },
      { resourceId: 'trackers', actions: ALL_ACTIONS },
      { resourceId: 'service_billing', actions: ALL_ACTIONS },
      { resourceId: 'finance', actions: ALL_ACTIONS },
      { resourceId: 'salary', actions: ALL_ACTIONS },
      { resourceId: 'settings', actions: ALL_ACTIONS },
      { resourceId: 'users', actions: ALL_ACTIONS },
    ]
  },
  {
    id: 'r_manager',
    name: 'Менеджер',
    description: 'Работа с клиентами, продажами и сервисом',
    isSystem: true,
    permissions: [
      { resourceId: 'dashboard', actions: VIEW_ONLY },
      { resourceId: 'clients', actions: ALL_ACTIONS },
      { resourceId: 'tasks', actions: ALL_ACTIONS },
      { resourceId: 'service', actions: ALL_ACTIONS },
      { resourceId: 'trackers', actions: ALL_ACTIONS },
      { resourceId: 'service_billing', actions: ['view', 'create', 'edit'] },
      { resourceId: 'salary', actions: VIEW_ONLY },
    ]
  },
  {
    id: 'r_engineer',
    name: 'Инженер',
    description: 'Доступ только к своим заявкам и табелю',
    isSystem: true,
    permissions: [
      { resourceId: 'dashboard', actions: VIEW_ONLY },
      { resourceId: 'tasks', actions: ['view', 'edit'] },
      { resourceId: 'salary', actions: VIEW_ONLY },
    ]
  }
];

// Initial System User (Required to login)
export const USERS: User[] = [
  { 
    id: 'u_admin', 
    name: 'Администратор', 
    role: UserRole.ADMIN, 
    customRoleId: 'r_admin', 
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff', 
    position: 'Владелец', 
    phone: '', 
    salary: 0, 
    email: 'admin@system.local', 
    isSystemUser: true 
  }
];

// Empty Data Arrays for Fresh Start
export const ADVANCES: Advance[] = [];
export const CLIENTS: Client[] = [];
export const TASKS: Task[] = [];
export const SALES: Sale[] = [];
export const MONTHLY_SERVICES: MonthlyService[] = [];
export const TIMESHEET: TimeEntry[] = [];
export const GPS_TRACKERS: GpsTracker[] = [];
export const CMS_OBJECTS: CmsObject[] = [];
export const MAINTENANCE_OBJECTS: MaintenanceObject[] = [];
export const ACCOUNTS: FinancialAccount[] = [];
export const TRANSACTIONS: Transaction[] = [];

// Initial Warehouse Mock
export const INVENTORY: InventoryItem[] = [
    { id: 'i1', category: 'GPS', model: 'Teltonika FMB920', quantity: 15, ownerId: 'warehouse' },
    { id: 'i2', category: 'GPS', model: 'Teltonika FMB125', quantity: 5, ownerId: 'warehouse' },
    { id: 'i3', category: 'SIM', model: 'Beeline M2M', quantity: 50, ownerId: 'warehouse' },
    { id: 'i4', category: 'Consumable', model: 'Изолента (Синяя)', quantity: 20, ownerId: 'warehouse' },
];

export const MESSAGES: ChatMessage[] = [
    {
        id: 'msg1',
        senderId: 'u_admin',
        text: 'Добро пожаловать в общий чат компании! Здесь публикуем важные анонсы.',
        createdAt: new Date().toISOString(),
        isRead: true,
        type: 'text'
    }
];

export const DOCUMENTS: ServiceDocument[] = [
    {
        id: 'doc1',
        title: 'Типовой договор на GPS',
        category: 'Contract',
        date: '2023-10-01',
        fileName: 'contract_template_2023.docx',
        fileSize: '1.2 MB'
    },
    {
        id: 'doc2',
        title: 'Инструкция по монтажу FMB920',
        category: 'Manual',
        date: '2023-01-15',
        fileName: 'fmb920_manual_ru.pdf',
        fileSize: '4.5 MB'
    }
];
