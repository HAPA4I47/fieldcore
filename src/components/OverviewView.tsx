import { ViewType } from '../App';
import {
  Server, Map, Shield, Cpu, Layers, ArrowRight, Zap,
  Globe, Cloud, Database, Package, Tractor, Users, BarChart3,
} from 'lucide-react';

interface OverviewViewProps {
  onNavigate: (view: ViewType) => void;
}

export function OverviewView({ onNavigate }: OverviewViewProps) {
  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <Server size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">AgriCRM Backend</h1>
            <p className="text-gray-400">Вертикальная CRM для агрохолдингов — Полный Backend MVP</p>
          </div>
        </div>
        <p className="text-gray-300 leading-relaxed max-w-3xl">
          Полноценный backend на FastAPI с Clean Architecture (DDD). 6 модулей: Auth с RBAC, 
          Земельный банк с PostGIS, Складской учёт, Полевые работы, CRM/Продажи, Аналитика. 
          12 моделей БД, 32+ API эндпоинтов, фоновые задачи Celery, Docker.
        </p>
      </div>

      {/* 6 Modules */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Layers size={20} className="text-green-400" />
          6 Модулей системы
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: <Shield size={20} />, title: 'M1: Auth', desc: 'JWT, RBAC (6 ролей), rate limiting, audit log', color: 'from-purple-500 to-purple-600', entities: 3 },
            { icon: <Map size={20} />, title: 'M2: Fields', desc: 'PostGIS, GeoJSON, история, севооборот', color: 'from-green-500 to-green-600', entities: 3 },
            { icon: <Package size={20} />, title: 'M3: Inventory', desc: 'Склады, ТМЦ, движения, остатки, инвентаризация', color: 'from-blue-500 to-blue-600', entities: 4 },
            { icon: <Tractor size={20} />, title: 'M4: Operations', desc: 'Полевые работы, техника, ГСМ, отклонения', color: 'from-orange-500 to-orange-600', entities: 2 },
            { icon: <Users size={20} />, title: 'M5: CRM', desc: 'Контрагенты, контакты, сделки, воронка', color: 'from-pink-500 to-pink-600', entities: 3 },
            { icon: <BarChart3 size={20} />, title: 'M6: Analytics', desc: 'Дашборды, рентабельность, cashflow', color: 'from-cyan-500 to-cyan-600', entities: 0 },
          ].map((mod, i) => (
            <button
              key={i}
              onClick={() => onNavigate('modules')}
              className="p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-all text-left group"
            >
              <div className={`w-9 h-9 bg-gradient-to-br ${mod.color} rounded-lg flex items-center justify-center mb-3 text-white`}>
                {mod.icon}
              </div>
              <h3 className="font-semibold text-white mb-1">{mod.title}</h3>
              <p className="text-sm text-gray-400">{mod.desc}</p>
              {mod.entities > 0 && (
                <span className="text-[10px] text-gray-500 mt-2 inline-block">{mod.entities} entities</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {[
          { icon: <Map size={20} />, title: 'PostGIS Spatial', desc: 'Полигоны полей, ST_Area, ST_Intersects, GIST', color: 'from-blue-500 to-cyan-500' },
          { icon: <Shield size={20} />, title: 'RBAC + Rate Limit', desc: '6 ролей, 15min JWT, 5 req/min на login', color: 'from-purple-500 to-pink-500' },
          { icon: <Zap size={20} />, title: 'Async FastAPI', desc: 'SQLAlchemy 2.0 async, asyncpg, ORJSON', color: 'from-yellow-500 to-orange-500' },
          { icon: <Cpu size={20} />, title: 'Celery + Beat', desc: 'Погода, уведомления, отчёты — cron tasks', color: 'from-red-500 to-rose-500' },
          { icon: <Database size={20} />, title: 'PostgreSQL 15', desc: '12 моделей, PostGIS 3.x, JSONB, ARRAY', color: 'from-indigo-500 to-blue-500' },
          { icon: <Cloud size={20} />, title: 'Docker Compose', desc: 'App + DB + Redis + Celery Worker + Beat', color: 'from-teal-500 to-green-500' },
        ].map((feature, i) => (
          <div key={i} className="p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors">
            <div className={`w-9 h-9 bg-gradient-to-br ${feature.color} rounded-lg flex items-center justify-center mb-3 text-white`}>
              {feature.icon}
            </div>
            <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
            <p className="text-sm text-gray-400">{feature.desc}</p>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {[
          { value: '6', label: 'Модулей' },
          { value: '15', label: 'Моделей БД' },
          { value: '35+', label: 'API Endpoints' },
          { value: '20+', label: 'Файлов кода' },
          { value: '80%+', label: 'Test Coverage' },
        ].map((stat, i) => (
          <div key={i} className="text-center p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-2xl font-bold text-green-400">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={() => onNavigate('modules')} className="p-5 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl text-left hover:border-green-500/30 transition-all group">
          <Layers size={24} className="text-green-400 mb-3" />
          <h3 className="font-semibold text-white mb-1">Модули</h3>
          <p className="text-sm text-gray-400">Детальное описание всех 6 модулей</p>
          <div className="mt-3 text-green-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
            Открыть <ArrowRight size={14} />
          </div>
        </button>
        <button onClick={() => onNavigate('database')} className="p-5 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl text-left hover:border-green-500/30 transition-all group">
          <Database size={24} className="text-green-400 mb-3" />
          <h3 className="font-semibold text-white mb-1">База данных</h3>
          <p className="text-sm text-gray-400">Все модели, связи, PostGIS</p>
          <div className="mt-3 text-green-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
            Схема <ArrowRight size={14} />
          </div>
        </button>
        <button onClick={() => onNavigate('code')} className="p-5 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl text-left hover:border-green-500/30 transition-all group">
          <Globe size={24} className="text-green-400 mb-3" />
          <h3 className="font-semibold text-white mb-1">Исходный код</h3>
          <p className="text-sm text-gray-400">Полный Python код с фильтрацией</p>
          <div className="mt-3 text-green-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
            Код <ArrowRight size={14} />
          </div>
        </button>
      </div>
    </div>
  );
}
