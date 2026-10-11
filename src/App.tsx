import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { CodeViewer } from './components/CodeViewer';
import { ArchitectureView } from './components/ArchitectureView';
import { ApiDocsView } from './components/ApiDocsView';
import { OverviewView } from './components/OverviewView';
import { DatabaseView } from './components/DatabaseView';
import { ModulesView } from './components/ModulesView';
import { Menu, X } from 'lucide-react';

export type ViewType = 'overview' | 'modules' | 'architecture' | 'database' | 'api' | 'code';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <OverviewView onNavigate={setCurrentView} />;
      case 'modules':
        return <ModulesView />;
      case 'architecture':
        return <ArchitectureView />;
      case 'database':
        return <DatabaseView />;
      case 'api':
        return <ApiDocsView />;
      case 'code':
        return <CodeViewer />;
      default:
        return <OverviewView onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg border border-gray-700"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 transition-transform duration-300`}>
        <Sidebar
          currentView={currentView}
          onViewChange={(view: ViewType) => {
            setCurrentView(view);
            setMobileMenuOpen(false);
          }}
        />
      </div>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {renderView()}
      </main>
    </div>
  );
}

export default App;
