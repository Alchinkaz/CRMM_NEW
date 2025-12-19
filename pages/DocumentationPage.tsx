
import React from 'react';
import { Database, Layout, Server, Cpu, ShieldCheck } from 'lucide-react';

export const DocumentationPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Архитектура CRM Системы</h1>
        <p className="text-slate-300 max-w-2xl">
          Техническое задание и структура системы для монтажной компании (GPS, Видеонаблюдение).
          Разработано системным аналитиком.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module Structure */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Layout size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">1. Структура (Модули)</h2>
          </div>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 min-w-[120px]">Auth Core:</span>
              <span className="text-gray-600">Авторизация, Роли (RBAC), Профиль</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 min-w-[120px]">CRM Core:</span>
              <span className="text-gray-600">Клиенты, Объекты (авто/здания), Контакты</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 min-w-[120px]">Sales:</span>
              <span className="text-gray-600">Сделки, КП, Номенклатура, Расчет маржи</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 min-w-[120px]">Service:</span>
              <span className="text-gray-600">Абонентская плата (GPS/ТО), Биллинг</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 min-w-[120px]">Field Ops:</span>
              <span className="text-gray-600">Заявки инженерам, Карта, Фотоотчеты</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 min-w-[120px]">HR/Payroll:</span>
              <span className="text-gray-600">Табель, Расчет KPI и ЗП</span>
            </li>
          </ul>
        </div>

        {/* Database Schema */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Database size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">2. База Данных (Логика)</h2>
          </div>
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-gray-50 rounded border border-gray-100">
              <div className="font-bold text-indigo-700">users</div>
              <div className="text-gray-500">id, login, password_hash, role, kpi_rates (json)</div>
            </div>
            <div className="p-3 bg-gray-50 rounded border border-gray-100">
              <div className="font-bold text-indigo-700">clients</div>
              <div className="text-gray-500">id, name, type (b2b/b2c), contacts, balance</div>
            </div>
            <div className="p-3 bg-gray-50 rounded border border-gray-100">
              <div className="font-bold text-indigo-700">client_objects</div>
              <div className="text-gray-500">id, client_id, type (car/building), name, address</div>
            </div>
            <div className="p-3 bg-gray-50 rounded border border-gray-100">
              <div className="font-bold text-indigo-700">tasks</div>
              <div className="text-gray-500">id, engineer_id, client_object_id, status, deadline, report_data (json)</div>
            </div>
            <div className="p-3 bg-gray-50 rounded border border-gray-100">
              <div className="font-bold text-indigo-700">subscriptions</div>
              <div className="text-gray-500">id, client_object_id, service_type, amount, next_bill_date</div>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Server size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">3. Рекомендованный Стек</h2>
          </div>
          <ul className="space-y-3 text-gray-700">
            <li className="flex flex-col">
              <span className="font-bold text-emerald-700">Frontend (Web & PWA)</span>
              <span>React 18 + TypeScript + Tailwind CSS + Vite. PWA для работы монтажников оффлайн.</span>
            </li>
            <li className="flex flex-col">
              <span className="font-bold text-emerald-700">Backend API</span>
              <span>NestJS (Node.js) или Django (Python). NestJS предпочтительнее для типизации с фронтендом.</span>
            </li>
            <li className="flex flex-col">
              <span className="font-bold text-emerald-700">Database</span>
              <span>PostgreSQL (надежность транзакций). Redis для кэширования сессий.</span>
            </li>
            <li className="flex flex-col">
              <span className="font-bold text-emerald-700">Integrations</span>
              <span>Telegram Bot API (уведомления), Wialon/Gurtam API (GPS данные).</span>
            </li>
          </ul>
        </div>

        {/* Business Process */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Cpu size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">4. Бизнес-процессы</h2>
          </div>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <div className="font-bold mb-1">Продажа и Монтаж:</div>
              <div className="pl-3 border-l-2 border-amber-300">
                Лид → КП → Сделка (Оплата) → Авто-создание Заявки на монтаж → Инженер принимает → Фотоотчет → Акт → Начисление ЗП → Постановка на ТО.
              </div>
            </div>
            <div>
              <div className="font-bold mb-1">Ежемесячное ТО:</div>
              <div className="pl-3 border-l-2 border-amber-300">
                1 число месяца → Генерация счетов → Проверка оплат → Если "Ок" → Продление. Если "Нет" → Блокировка/Заявка на демонтаж.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
