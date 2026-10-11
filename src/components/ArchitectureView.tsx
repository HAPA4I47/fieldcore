import { projectStructure } from '../data/backendCode';

export function ArchitectureView() {
  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Архитектура</h1>
      <p className="text-gray-400 mb-8">Clean Architecture (DDD) с разделением на 6 бизнес-модулей</p>

      {/* Architecture Diagram */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Слои системы</h2>
        <div className="space-y-3">
          {[
            {
              layer: 'API Layer (Presentation)',
              color: 'from-blue-500/20 to-blue-600/20',
              border: 'border-blue-500/30',
              items: ['FastAPI Routers (6 модулей)', 'Pydantic V2 Schemas (DTOs)', 'Dependencies (DI)', 'Rate Limiting (SlowAPI)', 'Request Validation'],
              desc: 'HTTP endpoints, валидация, dependency injection, rate limiting',
            },
            {
              layer: 'Service Layer (Application)',
              color: 'from-purple-500/20 to-purple-600/20',
              border: 'border-purple-500/30',
              items: ['Бизнес-оркестрация', 'Управление транзакциями', 'Cross-domain координация', 'Event publishing'],
              desc: 'Координирует доменную логику, управляет транзакциями',
            },
            {
              layer: 'Domain Layer (Core)',
              color: 'from-green-500/20 to-green-600/20',
              border: 'border-green-500/30',
              items: ['Entities (Pure Python dataclasses)', 'Domain Services (crop rotation, soil health)', 'Repository Interfaces', 'Business Rules (sevoоборот)'],
              desc: 'Чистая бизнес-логика без зависимостей от фреймворков',
            },
            {
              layer: 'Infrastructure Layer',
              color: 'from-orange-500/20 to-orange-600/20',
              border: 'border-orange-500/30',
              items: ['SQLAlchemy 2.0 Models (15 моделей)', 'Repository Implementations', 'PostGIS Spatial Queries', 'External API Clients', 'Celery Tasks'],
              desc: 'Реализации для работы с БД, внешними API, фоновыми задачами',
            },
          ].map((layer, i) => (
            <div key={i} className={`p-5 bg-gradient-to-r ${layer.color} border ${layer.border} rounded-xl`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white text-lg">{layer.layer}</h3>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                  Layer {4 - i}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-3">{layer.desc}</p>
              <div className="flex flex-wrap gap-2">
                {layer.items.map((item, j) => (
                  <span key={j} className="text-xs bg-gray-800/80 text-gray-300 px-2.5 py-1 rounded-md border border-gray-700">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Flow */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Поток запроса</h2>
        <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-900 border border-gray-800 rounded-xl">
          {[
            { step: 'Client', color: 'bg-gray-700' },
            { step: 'Rate Limiter', color: 'bg-red-900/50 border border-red-700' },
            { step: 'FastAPI Router', color: 'bg-blue-900/50 border border-blue-700' },
            { step: 'Dependencies', color: 'bg-purple-900/50 border border-purple-700' },
            { step: 'Service', color: 'bg-green-900/50 border border-green-700' },
            { step: 'Repository', color: 'bg-orange-900/50 border border-orange-700' },
            { step: 'PostgreSQL + PostGIS', color: 'bg-cyan-900/50 border border-cyan-700' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`text-xs px-3 py-1.5 rounded-lg ${item.color} text-gray-200`}>
                {item.step}
              </span>
              {i < 6 && <span className="text-gray-600">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Modules Map */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Модульная структура</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: 'Auth', module: 'M1', color: 'border-purple-500/30 bg-purple-500/5', files: ['auth.py', 'user.py', 'security.py'] },
            { name: 'Fields', module: 'M2', color: 'border-green-500/30 bg-green-500/5', files: ['fields.py', 'field.py', 'fields/services.py'] },
            { name: 'Inventory', module: 'M3', color: 'border-blue-500/30 bg-blue-500/5', files: ['inventory.py', 'inventory models', 'Stock triggers'] },
            { name: 'Operations', module: 'M4', color: 'border-orange-500/30 bg-orange-500/5', files: ['operations.py', 'operation.py', 'machinery.py'] },
            { name: 'CRM', module: 'M5', color: 'border-pink-500/30 bg-pink-500/5', files: ['crm.py', 'Company/Contact/Deal'] },
            { name: 'Analytics', module: 'M6', color: 'border-cyan-500/30 bg-cyan-500/5', files: ['analytics.py', 'Dashboard queries'] },
          ].map((mod, i) => (
            <div key={i} className={`p-3 border ${mod.color} rounded-lg`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">{mod.module}</span>
                <span className="font-semibold text-white text-sm">{mod.name}</span>
              </div>
              <div className="space-y-1">
                {mod.files.map((f, j) => (
                  <div key={j} className="text-xs text-gray-400 font-mono flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Structure */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Структура проекта</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 overflow-x-auto">
          <pre className="text-sm text-gray-300 font-mono whitespace-pre leading-relaxed">
            {projectStructure}
          </pre>
        </div>
      </div>

      {/* Infrastructure */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Инфраструктура</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              name: 'PostgreSQL 15 + PostGIS 3.x',
              role: 'Основное хранилище + гео-данные',
              details: ['PostGIS для геометрии полей', 'Async connections (asyncpg)', 'Connection pool (20+10)', 'Alembic миграции', 'JSONB для гибких данных', 'GIST spatial indexes'],
              color: 'border-blue-500/30 bg-blue-500/5',
            },
            {
              name: 'Redis 7',
              role: 'Кэш, сессии, брокер задач',
              details: ['Celery broker (DB 1)', 'Result backend (DB 2)', 'Session cache (DB 0)', 'Rate limiting storage', 'Pub/Sub для событий'],
              color: 'border-red-500/30 bg-red-500/5',
            },
            {
              name: 'Celery + Beat',
              role: 'Фоновые задачи',
              details: ['Обновление погоды (daily)', 'Low stock уведомления (hourly)', 'Генерация отчётов (daily)', 'Password reset emails', '3 очереди: weather, notifications, reports'],
              color: 'border-yellow-500/30 bg-yellow-500/5',
            },
          ].map((service, i) => (
            <div key={i} className={`p-4 border ${service.color} rounded-xl`}>
              <h3 className="font-semibold text-white mb-1">{service.name}</h3>
              <p className="text-xs text-gray-400 mb-3">{service.role}</p>
              <ul className="space-y-1">
                {service.details.map((d, j) => (
                  <li key={j} className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-gray-500" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
