import { createClient } from '@supabase/supabase-js';

// URL без порта, так как HTTPS обычно работает через 443. 
// Если сервер настроен на 8000, прокси должен пробрасывать его.
const SUPABASE_URL = 'https://supabase2.alchin.kz';
const SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTEwMDEwMCwiZXhwIjo0OTIwNzczNzAwLCJyb2xlIjoiYW5vbiJ9.YCgQhL6XM3vTYIP1TXUD8UjXJIluHuK5aYH5CvXMISM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Проверяет, доступен ли сервер Supabase в данный момент.
 */
export const checkDbConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('clients').select('id').limit(1);
    return !error;
  } catch (e) {
    return false;
  }
};

/**
 * Извлекает человекочитаемый текст ошибки из любого объекта (Error, PostgrestError, TypeError).
 * Гарантирует возвращение строки.
 */
export const parseDbError = (err: any): string => {
  if (!err) return 'Неизвестная ошибка';
  
  // 1. Если это уже строка
  if (typeof err === 'string') return err;
  
  // 2. Рекурсивный поиск сообщения (для вложенных TypeError и Supabase Error)
  const getMessage = (obj: any): string | null => {
    if (!obj || typeof obj !== 'object') return null;
    return obj.message || obj.error_description || obj.error?.message || obj.code || null;
  };

  const message = getMessage(err);
  
  if (message) {
    let result = String(message);
    
    // Обработка сетевых сбоев
    if (result.toLowerCase().includes('failed to fetch')) {
      return 'Сетевая ошибка: Сервер недоступен (проверьте подключение или VPN)';
    }

    if (err.details && typeof err.details === 'string' && err.details !== 'null') {
      result += `: ${err.details}`;
    }
    return result;
  }

  // 3. Если это объект без message, пробуем JSON.stringify
  try {
    const json = JSON.stringify(err);
    if (json !== '{}' && json !== 'null') return json;
    
    // Если JSON пустой, перечисляем ключи
    const keys = Object.keys(err);
    if (keys.length > 0) return `Ошибка (свойства: ${keys.join(', ')})`;
  } catch (e) {
    // Игнорируем ошибки сериализации
  }

  // 4. Последний шанс: String(), но исключаем [object Object]
  const fallback = String(err);
  return fallback === '[object Object]' ? 'Сложный объект ошибки (см. консоль)' : fallback;
};