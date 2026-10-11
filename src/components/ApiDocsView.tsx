import { useState } from 'react';

interface Endpoint {
  method: string;
  path: string;
  summary: string;
  auth: boolean;
  roles?: string[];
  description?: string;
}

interface ApiModule {
  name: string;
  nameRu: string;
  prefix: string;
  color: string;
  endpoints: Endpoint[];
}

const apiModules: ApiModule[] = [
  {
    name: 'Authentication',
    nameRu: 'M1: Аутентификация',
    prefix: '/api/v1/auth',
    color: 'border-purple-500/30',
    endpoints: [
      { method: 'POST', path: '/register', summary: 'Регистрация нового пользователя', auth: false, description: 'Email + password, bcrypt hashing' },
      { method: 'POST', path: '/login', summary: 'Вход (rate limited: 5/min)', auth: false, description: 'JWT access (15min) + refresh (7d) tokens' },
      { method: 'POST', path: '/refresh', summary: 'Обновление access token', auth: false, description: 'Refresh token → новая пара токенов' },
      { method: 'POST', path: '/password-reset/request', summary: 'Запрос сброса пароля (3/min)', auth: false, description: 'Отправляет email с токеном (1 час)' },
      { method: 'POST', path: '/password-reset/confirm', summary: 'Подтверждение сброса', auth: false },
      { method: 'GET', path: '/me', summary: 'Профиль пользователя', auth: true },
      { method: 'PATCH', path: '/me', summary: 'Обновление профиля', auth: true },
      { method: 'POST', path: '/change-password', summary: 'Смена пароля', auth: true },
    ],
  },
  {
    name: 'Fields',
    nameRu: 'M2: Земельный банк',
    prefix: '/api/v1/fields',
    color: 'border-green-500/30',
    endpoints: [
      { method: 'POST', path: '', summary: 'Создать поле (GeoJSON)', auth: true, roles: ['admin', 'manager'], description: 'PostGIS: валидация, ST_Area, ST_Intersects, авто-центроид' },
      { method: 'GET', path: '', summary: 'Список полей (пагинация)', auth: true, description: 'Фильтры: soil_type, region, search, is_active' },
      { method: 'GET', path: '/{id}', summary: 'Детали поля', auth: true, description: 'GeoJSON geometry + centroid' },
      { method: 'PUT', path: '/{id}', summary: 'Обновить поле', auth: true, roles: ['admin', 'manager'] },
      { method: 'DELETE', path: '/{id}', summary: 'Архивировать (soft delete)', auth: true, roles: ['admin', 'manager'] },
      { method: 'POST', path: '/{id}/history', summary: 'Добавить историю', auth: true, roles: ['admin', 'agronomist'], description: 'Культура, урожай, удобрения (JSONB), СЗР' },
      { method: 'GET', path: '/{id}/history', summary: 'История поля', auth: true, description: 'По годам, с удобрениями и СЗР' },
      { method: 'POST', path: '/upload-geojson', summary: 'Массовая загрузка GeoJSON', auth: true, roles: ['admin', 'manager'], description: 'Загрузка файла с множественными полигонами' },
      { method: 'GET', path: '/statistics', summary: 'Статистика по полям', auth: true, description: 'Общая площадь, кол-во, типы почв' },
    ],
  },
  {
    name: 'Inventory',
    nameRu: 'M3: Складской учёт',
    prefix: '/api/v1/inventory',
    color: 'border-blue-500/30',
    endpoints: [
      { method: 'GET', path: '/materials', summary: 'Список материалов', auth: true, description: 'Фильтры: category, search' },
      { method: 'POST', path: '/materials', summary: 'Создать материал', auth: true, roles: ['admin', 'manager'], description: 'SKU, категория, единица, мин/макс остаток' },
      { method: 'GET', path: '/stock', summary: 'Остатки по складу', auth: true, description: 'warehouse_id filter' },
      { method: 'POST', path: '/movements', summary: 'Движение ТМЦ (приход/расход)', auth: true, roles: ['admin', 'agronomist'], description: 'IN/OUT/TRANSFER, авто-обновление Stock, алерт при min_stock' },
      { method: 'GET', path: '/movements', summary: 'История движений', auth: true, description: 'С фильтрами по material, warehouse, date' },
      { method: 'POST', path: '/stocktake', summary: 'Инвентаризация', auth: true, roles: ['admin', 'manager'], description: 'Корректировка остатков, создание movements' },
      { method: 'GET', path: '/reports', summary: 'Отчёты (ABC, оборачиваемость)', auth: true },
    ],
  },
  {
    name: 'Operations',
    nameRu: 'M4: Полевые работы',
    prefix: '/api/v1/operations',
    color: 'border-orange-500/30',
    endpoints: [
      { method: 'POST', path: '', summary: 'Создать операцию', auth: true, roles: ['admin', 'agronomist'], description: 'Резервирование ТМЦ, валидация поля' },
      { method: 'GET', path: '', summary: 'Список операций', auth: true, description: 'Фильтры: field_id, status, type, dates' },
      { method: 'PUT', path: '/{id}', summary: 'Обновить операцию', auth: true, roles: ['admin', 'agronomist'] },
      { method: 'POST', path: '/{id}/complete', summary: 'Завершить операцию', auth: true, roles: ['admin', 'agronomist'], description: 'Списание ТМЦ, расчёт ГСМ, алерт при >20% отклонении' },
      { method: 'GET', path: '/calendar', summary: 'Календарь работ', auth: true, description: 'По месяцу/году, для планирования' },
    ],
  },
  {
    name: 'CRM',
    nameRu: 'M5: CRM и продажи',
    prefix: '/api/v1/crm',
    color: 'border-pink-500/30',
    endpoints: [
      { method: 'GET', path: '/companies', summary: 'Список контрагентов', auth: true, description: 'Фильтр: type (buyer/supplier/partner)' },
      { method: 'POST', path: '/companies', summary: 'Создать контрагента', auth: true, roles: ['admin', 'manager'] },
      { method: 'GET', path: '/contacts', summary: 'Список контактов', auth: true, description: 'Фильтр: company_id' },
      { method: 'POST', path: '/contacts', summary: 'Создать контакт', auth: true, roles: ['admin', 'manager'] },
      { method: 'GET', path: '/deals', summary: 'Список сделок', auth: true, description: 'Фильтры: status, deal_type' },
      { method: 'POST', path: '/deals', summary: 'Создать сделку', auth: true, roles: ['admin', 'manager'], description: 'Тип, сумма, культура, количество, цена' },
      { method: 'PATCH', path: '/deals/{id}/status', summary: 'Обновить статус сделки', auth: true, roles: ['admin', 'manager'], description: 'Автоматическая запись в stage_history (JSONB)' },
      { method: 'GET', path: '/pipeline', summary: 'Воронка продаж', auth: true, description: 'Кол-во и сумма по этапам' },
      { method: 'GET', path: '/analytics', summary: 'CRM аналитика', auth: true, description: 'Конверсия, общая сумма won deals' },
    ],
  },
  {
    name: 'Analytics',
    nameRu: 'M6: Аналитика',
    prefix: '/api/v1/analytics',
    color: 'border-cyan-500/30',
    endpoints: [
      { method: 'GET', path: '/fields-summary', summary: 'Сводка по полям', auth: true, description: 'Общая площадь, кол-во, средний размер' },
      { method: 'GET', path: '/crop-rotation', summary: 'Анализ севооборота', auth: true, description: 'Культуры по годам' },
      { method: 'GET', path: '/fuel-consumption', summary: 'Анализ расхода ГСМ', auth: true, description: 'По типам операций, литры, литры/га' },
      { method: 'GET', path: '/inventory-turnover', summary: 'Оборачиваемость склада', auth: true, description: 'По категориям ТМЦ' },
      { method: 'GET', path: '/profitability/{field_id}', summary: 'Рентабельность поля', auth: true, description: 'Revenue - Costs = Profit, profit/ha, profitability index' },
      { method: 'GET', path: '/cashflow-forecast', summary: 'Прогноз cashflow', auth: true, description: 'Expected income - Planned expenses' },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-green-500/10 text-green-400 border-green-500/30',
  POST: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  PUT: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  PATCH: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  DELETE: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export function ApiDocsView() {
  const [expandedModule, setExpandedModule] = useState<string | null>('Fields');

  const totalEndpoints = apiModules.reduce((acc, m) => acc + m.endpoints.length, 0);

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">API Документация</h1>
      <p className="text-gray-400 mb-2">RESTful API с JWT аутентификацией — {totalEndpoints} эндпоинтов в 6 модулях</p>
      <p className="text-sm text-gray-500 mb-8">
        Base URL: <code className="bg-gray-800 px-2 py-0.5 rounded text-green-400">http://localhost:8000/api/v1</code>
        {' '}• Swagger: <code className="bg-gray-800 px-2 py-0.5 rounded text-blue-400">/docs</code>
        {' '}• ReDoc: <code className="bg-gray-800 px-2 py-0.5 rounded text-purple-400">/redoc</code>
      </p>

      {/* Auth info */}
      <div className="mb-8 p-4 bg-gray-900 border border-gray-800 rounded-xl">
        <h3 className="text-sm font-semibold text-white mb-2">Аутентификация</h3>
        <p className="text-xs text-gray-400 mb-2">
          Все защищённые эндпоинты требуют Bearer token. Access token действует 15 минут, refresh — 7 дней.
        </p>
        <code className="text-xs bg-gray-800 px-3 py-1.5 rounded text-gray-300 block">
          Authorization: Bearer &lt;access_token&gt;
        </code>
        <div className="mt-3 flex flex-wrap gap-2">
          {['super_admin', 'admin', 'manager', 'agronomist', 'operator', 'viewer'].map(role => (
            <span key={role} className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">
              {role}
            </span>
          ))}
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        {apiModules.map((module) => (
          <div key={module.name} className={`bg-gray-900 border ${module.color} rounded-xl overflow-hidden`}>
            <button
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
              onClick={() => setExpandedModule(expandedModule === module.name ? null : module.name)}
            >
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-white">{module.nameRu}</h3>
                <code className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded font-mono">
                  {module.prefix}
                </code>
                <span className="text-xs text-gray-500">
                  {module.endpoints.length} endpoints
                </span>
              </div>
              <span className={`text-gray-400 transition-transform ${expandedModule === module.name ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {expandedModule === module.name && (
              <div className="border-t border-gray-800">
                {module.endpoints.map((endpoint, i) => (
                  <div key={i} className="px-5 py-3 border-b border-gray-800/50 last:border-b-0 hover:bg-gray-800/20">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${methodColors[endpoint.method.split('/')[0]] || methodColors.GET}`}>
                        {endpoint.method}
                      </span>
                      <code className="text-sm text-gray-200 font-mono">
                        {module.prefix}{endpoint.path}
                      </code>
                      {endpoint.auth && (
                        <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/20">
                          🔒
                        </span>
                      )}
                      {endpoint.roles && (
                        <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">
                          {endpoint.roles.join(', ')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 ml-0">{endpoint.summary}</p>
                    {endpoint.description && (
                      <p className="text-xs text-gray-500 mt-1">{endpoint.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Response Format */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-white mb-4">Формат ответов</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-green-400 mb-2">Успех (пагинация)</h3>
            <pre className="text-xs text-gray-300 font-mono bg-gray-800 p-3 rounded-lg overflow-x-auto">
{`{
  "items": [...],
  "total": 42,
  "page": 1,
  "per_page": 20,
  "pages": 3
}`}
            </pre>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-red-400 mb-2">Ошибка</h3>
            <pre className="text-xs text-gray-300 font-mono bg-gray-800 p-3 rounded-lg overflow-x-auto">
{`{
  "error": "Field not found",
  "detail": {
    "resource": "Field",
    "id": "abc-123"
  }
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
