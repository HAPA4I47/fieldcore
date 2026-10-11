import { ViewType } from '../App';
import {
  LayoutDashboard,
  Network,
  Database,
  FileCode2,
  Globe,
  FolderTree,
  Leaf,
  Layers,
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const navItems: { id: ViewType; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'overview', label: 'Обзор', icon: <LayoutDashboard size={18} />, description: 'Общая информация' },
  { id: 'modules', label: 'Модули', icon: <Layers size={18} />, description: '6 модулей системы' },
  { id: 'architecture', label: 'Архитектура', icon: <Network size={18} />, description: 'Clean Architecture / DDD' },
  { id: 'database', label: 'База данных', icon: <Database size={18} />, description: '12 моделей, PostGIS' },
  { id: 'api', label: 'API Docs', icon: <Globe size={18} />, description: '32+ эндпоинтов' },
  { id: 'code', label: 'Исходный код', icon: <FileCode2 size={18} />, description: 'Все файлы проекта' },
];

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-72 h-full bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
            <Leaf size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">AgriCRM</h1>
            <p className="text-xs text-gray-400">Backend MVP v1.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Навигация
        </p>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
              currentView === item.id
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            {item.icon}
            <div>
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
          </button>
        ))}

        {/* Tech stack */}
        <div className="mt-6 px-3">
          <p className="py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Стек технологий
          </p>
          <div className="space-y-1.5">
            {[
              { name: 'Python 3.11+', color: 'bg-blue-400' },
              { name: 'FastAPI (async)', color: 'bg-teal-400' },
              { name: 'PostgreSQL 15 + PostGIS', color: 'bg-indigo-400' },
              { name: 'SQLAlchemy 2.0', color: 'bg-red-400' },
              { name: 'Redis + Celery', color: 'bg-rose-400' },
              { name: 'Docker Compose', color: 'bg-cyan-400' },
              { name: 'Pydantic V2', color: 'bg-emerald-400' },
            ].map((tech) => (
              <div key={tech.name} className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400">
                <div className={`w-1.5 h-1.5 rounded-full ${tech.color}`} />
                {tech.name}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <FolderTree size={14} />
          <span>Clean Architecture / DDD</span>
        </div>
      </div>
    </aside>
  );
}
