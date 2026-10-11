import { useState } from 'react';
import {
  Shield, Map, Package, Tractor, Users, BarChart3,
  ChevronDown, ChevronRight, CheckCircle2, AlertTriangle,
  Database, Key, Globe, Fuel, TrendingUp, FileText,
} from 'lucide-react';

interface ModuleInfo {
  id: string;
  name: string;
  nameRu: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  description: string;
  entities: {
    name: string;
    table: string;
    description: string;
    keyFields: string[];
    critical?: boolean;
  }[];
  endpoints: { method: string; path: string; desc: string }[];
  businessRules: string[];
  roles: string[];
}

const modules: ModuleInfo[] = [
  {
    id: 'auth',
    name: 'Authentication & Authorization',
    nameRu: 'Аутентификация и авторизация',
    icon: <Shield size={22} />,
    color: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/30',
    description: 'JWT аутентификация с RBAC, rate limiting, audit log',
    entities: [
      { name: 'User', table: 'users', description: 'Пользователь системы', keyFields: ['email (unique)', 'hashed_password (bcrypt)', 'role (enum)', 'organization_id (FK)', 'last_login', 'password_reset_token'], critical: false },
      { name: 'Organization', table: 'organizations', description: 'Организация/холдинг', keyFields: ['name', 'legal_name', 'tax_id (ИНН, unique)', 'total_area_ha (calculated)'] },
      { name: 'AuthAuditLog', table: 'auth_audit_logs', description: 'Аудит всех auth событий', keyFields: ['event_type', 'ip_address', 'user_agent', 'success', 'details'] },
    ],
    endpoints: [
      { method: 'POST', path: '/auth/register', desc: 'Регистрация нового пользователя' },
      { method: 'POST', path: '/auth/login', desc: 'Вход (rate limited: 5/min)' },
      { method: 'POST', path: '/auth/refresh', desc: 'Обновление access token' },
      { method: 'POST', path: '/auth/password-reset/request', desc: 'Запрос сброса пароля (3/min)' },
      { method: 'POST', path: '/auth/password-reset/confirm', desc: 'Подтверждение сброса' },
      { method: 'GET', path: '/auth/me', desc: 'Профиль текущего пользователя' },
    ],
    businessRules: [
      'JWT access token: 15 минут',
      'JWT refresh token: 7 дней',
      'Rate limiting: 5 попыток/мин на login',
      '6 ролей: super_admin, admin, manager, agronomist, operator, viewer',
      'Все auth события логируются в AuthAuditLog',
      'Password reset через email с токеном (1 час)',
    ],
    roles: ['Все роли'],
  },
  {
    id: 'fields',
    name: 'Land Bank & GIS',
    nameRu: 'Земельный банк и ГИС',
    icon: <Map size={22} />,
    color: 'from-green-500/20 to-green-600/10',
    borderColor: 'border-green-500/30',
    description: 'PostGIS: полигоны полей, история, севооборот, массовая загрузка',
    entities: [
      { name: 'Field', table: 'fields', description: 'Сельхоз поле — ГЛАВНАЯ СУЩНОСТЬ', keyFields: ['geometry (POLYGON, 4326, GIST)', 'centroid (POINT, auto)', 'area_ha (ST_Area)', 'cadastral_number', 'soil_type (enum)', 'ph_level', 'humus_percent', 'region, district'], critical: true },
      { name: 'FieldHistory', table: 'field_history', description: 'История использования поля по годам', keyFields: ['year', 'crop_type', 'variety', 'yield_tons_per_ha', 'fertilizers_used (JSONB)', 'pesticides_used (JSONB)'] },
      { name: 'FieldCropRotation', table: 'field_crop_rotations', description: 'Планирование севооборота', keyFields: ['year', 'planned_crop', 'is_valid_rotation', 'expected_yield'] },
    ],
    endpoints: [
      { method: 'POST', path: '/fields', desc: 'Создать поле (GeoJSON)' },
      { method: 'GET', path: '/fields', desc: 'Список полей (пагинация, фильтры)' },
      { method: 'GET', path: '/fields/{id}', desc: 'Детали поля' },
      { method: 'PUT', path: '/fields/{id}', desc: 'Обновить поле' },
      { method: 'DELETE', path: '/fields/{id}', desc: 'Архивировать (soft delete)' },
      { method: 'POST', path: '/fields/{id}/history', desc: 'Добавить запись истории' },
      { method: 'GET', path: '/fields/{id}/history', desc: 'История поля' },
      { method: 'POST', path: '/fields/upload-geojson', desc: 'Массовая загрузка GeoJSON' },
      { method: 'GET', path: '/fields/statistics', desc: 'Статистика по полям' },
    ],
    businessRules: [
      'Автоматический расчёт площади через ST_Area (ST_Transform → 3857)',
      'Автоматический расчёт центроида',
      'Валидация геометрии (ST_IsValid, self-intersection check)',
      'Проверка пересечения границ полей (ST_Intersects)',
      'Севооборот: нельзя сеять одну культуру 2 года подряд',
      'GIST индекс на geometry для быстрых пространственных запросов',
      'Обновление total_area_ha организации при создании/удалении поля',
    ],
    roles: ['admin', 'manager', 'agronomist', 'viewer (read)'],
  },
  {
    id: 'inventory',
    name: 'Warehouse & Inventory',
    nameRu: 'Складской учёт ТМЦ',
    icon: <Package size={22} />,
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/30',
    description: 'Склады, материалы, движения ТМЦ, остатки, инвентаризация',
    entities: [
      { name: 'Warehouse', table: 'warehouses', description: 'Склад (центральный/полевой/мобильный)', keyFields: ['type (central/field/mobile)', 'location (POINT PostGIS)', 'is_active'] },
      { name: 'Material', table: 'materials', description: 'Справочник ТМЦ', keyFields: ['sku (unique)', 'category (seeds/fertilizers/pesticides/fuel/spare_parts)', 'unit', 'active_ingredient (для СЗР)', 'min_stock', 'max_stock', 'cost_per_unit'] },
      { name: 'StockMovement', table: 'stock_movements', description: 'Движение ТМЦ — САМАЯ ВАЖНАЯ', keyFields: ['movement_type (IN/OUT/TRANSFER)', 'quantity', 'unit_cost', 'total_cost', 'reference_type (purchase/writeoff/operation)', 'batch_number', 'expiry_date'], critical: true },
      { name: 'Stock', table: 'stock', description: 'Актуальные остатки (materialized)', keyFields: ['warehouse_id + material_id (unique)', 'quantity'], critical: true },
    ],
    endpoints: [
      { method: 'GET', path: '/inventory/materials', desc: 'Список материалов' },
      { method: 'POST', path: '/inventory/materials', desc: 'Создать материал' },
      { method: 'GET', path: '/inventory/stock', desc: 'Остатки (по складу)' },
      { method: 'POST', path: '/inventory/movements', desc: 'Создать движение (приход/расход)' },
      { method: 'GET', path: '/inventory/movements', desc: 'История движений' },
      { method: 'POST', path: '/inventory/stocktake', desc: 'Инвентаризация' },
      { method: 'GET', path: '/inventory/reports', desc: 'Отчёты (ABC, оборачиваемость)' },
    ],
    businessRules: [
      'При списании на операцию — обязательна привязка к полю',
      'Контроль минимальных остатков → уведомления',
      'Партионный учёт для СЗР (срок годности, серия)',
      'Stock автоматически пересчитывается через триггеры',
      'При создании операции — резервирование ТМЦ',
      'При завершении — фактическое списание',
      'FIFO/LIFO для расчёта себестоимости (опционально)',
    ],
    roles: ['admin', 'agronomist (read/write)', 'manager (read)', 'operator (read)'],
  },
  {
    id: 'operations',
    name: 'Field Operations',
    nameRu: 'Полевые работы',
    icon: <Tractor size={22} />,
    color: 'from-orange-500/20 to-orange-600/10',
    borderColor: 'border-orange-500/30',
    description: 'Полевые операции, техника, ГСМ, контроль отклонений',
    entities: [
      { name: 'FieldOperation', table: 'operations', description: 'Полевая работа', keyFields: ['operation_type (plowing/sowing/spraying/harvesting)', 'status (planned/in_progress/completed)', 'area_ha', 'materials_used (JSONB)', 'machinery_used (JSONB)', 'fuel_consumed_liters', 'fuel_consumed_per_ha', 'photos (ARRAY)'], critical: true },
      { name: 'Machinery', table: 'machinery', description: 'Сельхозтехника', keyFields: ['type (tractor/combine/sprayer)', 'brand, model', 'license_plate (unique)', 'fuel_tank_capacity', 'fuel_consumption_per_ha', 'gps_tracker_id'] },
    ],
    endpoints: [
      { method: 'POST', path: '/operations', desc: 'Создать операцию (с резервом ТМЦ)' },
      { method: 'GET', path: '/operations', desc: 'Список (фильтры: поле, статус, даты)' },
      { method: 'PUT', path: '/operations/{id}', desc: 'Обновить операцию' },
      { method: 'POST', path: '/operations/{id}/complete', desc: 'Завершить (списание ТМЦ, расчёт ГСМ)' },
      { method: 'GET', path: '/operations/calendar', desc: 'Календарь работ' },
    ],
    businessRules: [
      'При создании — резервирование ТМЦ на складе',
      'При завершении — фактическое списание ТМЦ',
      'Расчёт отклонений ГСМ (план vs факт)',
      'Алерт при отклонении >20% от норматива',
      'Нельзя выполнить операцию без истории предыдущей культуры',
      'fuel_consumed_per_ha = fuel_liters / area_ha',
      'Фото-отчёты (массив URL)',
    ],
    roles: ['admin', 'agronomist (full)', 'operator (read/update)'],
  },
  {
    id: 'crm',
    name: 'CRM & Sales',
    nameRu: 'CRM и продажи',
    icon: <Users size={22} />,
    color: 'from-pink-500/20 to-pink-600/10',
    borderColor: 'border-pink-500/30',
    description: 'Контрагенты, контакты, сделки, воронка продаж',
    entities: [
      { name: 'Company', table: 'companies', description: 'Контрагент', keyFields: ['type (buyer/supplier/partner)', 'tax_id', 'legal_address', 'reliability_score (0-100)'] },
      { name: 'Contact', table: 'contacts', description: 'Контактное лицо', keyFields: ['company_id (FK)', 'position', 'email', 'phone'] },
      { name: 'Deal', table: 'deals', description: 'Сделка', keyFields: ['deal_type (crop_sale/purchase/service)', 'status (lead/negotiation/contract/won/lost)', 'value, currency', 'crop_type, quantity_tons, price_per_ton', 'stage_history (JSONB)'], critical: true },
    ],
    endpoints: [
      { method: 'GET/POST', path: '/crm/companies', desc: 'Список/создание контрагентов' },
      { method: 'GET/POST', path: '/crm/contacts', desc: 'Список/создание контактов' },
      { method: 'GET/POST', path: '/crm/deals', desc: 'Список/создание сделок' },
      { method: 'PATCH', path: '/crm/deals/{id}/status', desc: 'Обновить статус сделки' },
      { method: 'GET', path: '/crm/pipeline', desc: 'Воронка продаж' },
      { method: 'GET', path: '/crm/analytics', desc: 'CRM аналитика (конверсия)' },
    ],
    businessRules: [
      'Stage history — JSONB с историей переходов',
      'Conversion rate = won / total deals',
      'Reliability score для контрагентов (0-100)',
      'Сделки привязаны к культурам (crop_type, quantity, price)',
    ],
    roles: ['admin', 'manager (full)', 'viewer (read)'],
  },
  {
    id: 'analytics',
    name: 'Analytics & Dashboards',
    nameRu: 'Аналитика и дашборды',
    icon: <BarChart3 size={22} />,
    color: 'from-cyan-500/20 to-cyan-600/10',
    borderColor: 'border-cyan-500/30',
    description: 'Сводки, рентабельность, ГСМ, оборачиваемость, прогноз cashflow',
    entities: [],
    endpoints: [
      { method: 'GET', path: '/analytics/fields-summary', desc: 'Сводка по полям (площади, кол-во)' },
      { method: 'GET', path: '/analytics/crop-rotation', desc: 'Анализ севооборота' },
      { method: 'GET', path: '/analytics/fuel-consumption', desc: 'Анализ расхода ГСМ' },
      { method: 'GET', path: '/analytics/inventory-turnover', desc: 'Оборачиваемость склада' },
      { method: 'GET', path: '/analytics/profitability/{field_id}', desc: 'Рентабельность поля' },
      { method: 'GET', path: '/analytics/cashflow-forecast', desc: 'Прогноз cashflow' },
    ],
    businessRules: [
      'Profitability = (revenue - costs) / costs',
      'Fuel deviation alert при >20% отклонении',
      'Cashflow = deals_income - planned_expenses',
      'Crop rotation analysis за N лет',
      'Inventory turnover по категориям',
    ],
    roles: ['admin', 'manager (read)', 'agronomist (read)'],
  },
];

export function ModulesView() {
  const [expandedModule, setExpandedModule] = useState<string | null>('fields');

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Модули системы</h1>
      <p className="text-gray-400 mb-8">6 модулей с детальным описанием сущностей, API и бизнес-логики</p>

      <div className="space-y-4">
        {modules.map((mod) => (
          <div key={mod.id} className={`bg-gradient-to-r ${mod.color} border ${mod.borderColor} rounded-xl overflow-hidden`}>
            {/* Header */}
            <button
              className="w-full px-5 py-4 flex items-center justify-between text-left"
              onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
            >
              <div className="flex items-center gap-4">
                <div className="text-white">{mod.icon}</div>
                <div>
                  <h3 className="font-bold text-white text-lg">{mod.nameRu}</h3>
                  <p className="text-sm text-gray-400">{mod.name} — {mod.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">
                  {mod.entities.length} entities • {mod.endpoints.length} endpoints
                </span>
                {expandedModule === mod.id ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
              </div>
            </button>

            {/* Expanded content */}
            {expandedModule === mod.id && (
              <div className="px-5 pb-5 space-y-5 border-t border-gray-800/50 pt-4">
                {/* Entities */}
                {mod.entities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                      <Database size={14} className="text-blue-400" /> Сущности (Models)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {mod.entities.map((entity) => (
                        <div key={entity.name} className="bg-gray-900/60 border border-gray-700/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-white text-sm">{entity.name}</span>
                            <code className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{entity.table}</code>
                            {entity.critical && (
                              <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">CRITICAL</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{entity.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {entity.keyFields.map((f, i) => (
                              <span key={i} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-mono">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Endpoints */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Globe size={14} className="text-green-400" /> API Endpoints
                  </h4>
                  <div className="space-y-1.5">
                    {mod.endpoints.map((ep, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-1.5 bg-gray-900/40 rounded text-sm">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          ep.method.includes('GET') ? 'bg-green-500/10 text-green-400' :
                          ep.method.includes('POST') ? 'bg-blue-500/10 text-blue-400' :
                          ep.method.includes('PUT') || ep.method.includes('PATCH') ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {ep.method.split('/')[0]}
                        </span>
                        <code className="text-xs text-gray-300 font-mono">{ep.path}</code>
                        <span className="text-xs text-gray-500 ml-auto">{ep.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Business Rules */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-yellow-400" /> Бизнес-правила
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {mod.businessRules.map((rule, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-400 bg-gray-900/30 px-3 py-2 rounded">
                        <CheckCircle2 size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Roles */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    <Key size={14} className="text-purple-400" /> Доступные роли
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {mod.roles.map((role, i) => (
                      <span key={i} className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded border border-purple-500/20">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
