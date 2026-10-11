import { useState } from 'react';
import { backendFiles } from '../data/backendCode';
import { FileCode2, FolderOpen, Copy, Check, ChevronRight, ChevronDown, Filter } from 'lucide-react';

interface TreeNode {
  name: string;
  path?: string;
  children?: TreeNode[];
  isFile?: boolean;
}

function buildTree(): TreeNode {
  const root: TreeNode = { name: 'agricrm/', children: [] };
  
  for (const file of backendFiles) {
    const parts = file.path.split('/');
    let current = root;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      
      if (isLast) {
        if (!current.children) current.children = [];
        current.children.push({ name: part, path: file.path, isFile: true });
      } else {
        if (!current.children) current.children = [];
        let existing = current.children.find(c => c.name === part + '/');
        if (!existing) {
          existing = { name: part + '/', children: [] };
          current.children.push(existing);
        }
        current = existing;
      }
    }
  }
  
  return root;
}

function FileTree({ tree, depth = 0, onSelect, selectedPath }: {
  tree: TreeNode;
  depth?: number;
  onSelect: (path: string) => void;
  selectedPath: string | null;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  
  if (!tree.children) return null;
  
  return (
    <div>
      {tree.children.map((node, i) => (
        <div key={i}>
          <button
            className={`w-full flex items-center gap-1.5 px-2 py-1 text-left text-xs rounded hover:bg-gray-800 transition-colors ${
              node.path === selectedPath ? 'bg-green-500/10 text-green-400' : 'text-gray-400'
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => {
              if (node.isFile && node.path) {
                onSelect(node.path);
              } else {
                setExpanded(!expanded);
              }
            }}
          >
            {node.isFile ? (
              <>
                <FileCode2 size={12} className="text-gray-500 flex-shrink-0" />
                <span className="truncate">{node.name}</span>
              </>
            ) : (
              <>
                {expanded ? <ChevronDown size={12} className="flex-shrink-0" /> : <ChevronRight size={12} className="flex-shrink-0" />}
                <FolderOpen size={12} className="text-yellow-500/70 flex-shrink-0" />
                <span className="truncate">{node.name}</span>
              </>
            )}
          </button>
          {!node.isFile && expanded && node.children && (
            <FileTree tree={node} depth={depth + 1} onSelect={onSelect} selectedPath={selectedPath} />
          )}
        </div>
      ))}
    </div>
  );
}

const moduleColors: Record<string, string> = {
  core: 'text-gray-400',
  auth: 'text-purple-400',
  fields: 'text-green-400',
  inventory: 'text-blue-400',
  operations: 'text-orange-400',
  crm: 'text-pink-400',
  analytics: 'text-cyan-400',
};

const moduleLabels: Record<string, string> = {
  core: 'Core',
  auth: 'M1: Auth',
  fields: 'M2: Fields',
  inventory: 'M3: Inventory',
  operations: 'M4: Operations',
  crm: 'M5: CRM',
  analytics: 'M6: Analytics',
};

export function CodeViewer() {
  const [selectedFile, setSelectedFile] = useState<string>(backendFiles[0].path);
  const [copied, setCopied] = useState(false);
  const [showTree, setShowTree] = useState(true);
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  
  const filteredFiles = moduleFilter === 'all' 
    ? backendFiles 
    : backendFiles.filter(f => f.module === moduleFilter);
  
  const currentFile = filteredFiles.find(f => f.path === selectedFile) || filteredFiles[0] || backendFiles[0];
  const tree = buildTree();
  
  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = currentFile.code.split('\n').length;
  const modules = [...new Set(backendFiles.map(f => f.module))];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <FileCode2 size={20} className="text-green-400" />
          <div>
            <h1 className="text-lg font-bold text-white">Исходный код</h1>
            <p className="text-xs text-gray-400">{backendFiles.length} файлов • Полный backend код</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Module filter */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setModuleFilter('all')}
              className={`text-xs px-2 py-1 rounded ${moduleFilter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Все
            </button>
            {modules.map(m => (
              <button
                key={m}
                onClick={() => setModuleFilter(m)}
                className={`text-xs px-2 py-1 rounded ${moduleFilter === m ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {moduleLabels[m] || m}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowTree(!showTree)}
            className="text-xs text-gray-400 bg-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {showTree ? 'Скрыть' : 'Показать'} дерево
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        {showTree && (
          <div className="w-64 border-r border-gray-800 overflow-y-auto flex-shrink-0 p-2">
            <div className="mb-2 px-2 py-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase">Файлы</span>
              <span className="text-[10px] text-gray-600">{filteredFiles.length} файлов</span>
            </div>
            <FileTree tree={tree} onSelect={setSelectedFile} selectedPath={selectedFile} />
          </div>
        )}

        {/* Code Display */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* File info bar */}
          <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <code className={`text-sm font-mono ${moduleColors[currentFile.module] || 'text-gray-400'}`}>
                {currentFile.path}
              </code>
              <span className="text-xs text-gray-500">
                {currentFile.language} • {lineCount} строк
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                currentFile.module === 'core' ? 'bg-gray-800 text-gray-400 border-gray-700' :
                currentFile.module === 'auth' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                currentFile.module === 'fields' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                currentFile.module === 'inventory' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                currentFile.module === 'operations' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                currentFile.module === 'crm' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' :
                'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
              }`}>
                {moduleLabels[currentFile.module] || currentFile.module}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800 px-2.5 py-1 rounded hover:bg-gray-700 transition-colors"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied ? 'Скопировано!' : 'Копировать'}
            </button>
          </div>

          {/* Description */}
          <div className="px-4 py-2 border-b border-gray-800/50 bg-gray-900/30 flex-shrink-0">
            <p className="text-xs text-gray-400">{currentFile.description}</p>
          </div>

          {/* Code content */}
          <div className="flex-1 overflow-auto">
            <pre className="p-4 text-sm font-mono leading-relaxed">
              <code>
                {currentFile.code.split('\n').map((line, i) => (
                  <div key={i} className="flex hover:bg-gray-800/30">
                    <span className="inline-block w-12 text-right pr-4 text-gray-600 select-none text-xs leading-relaxed">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-gray-300 whitespace-pre">
                      {highlightLine(line, currentFile.language)}
                    </span>
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function highlightLine(line: string, _language: string): React.ReactNode {
  // Comments
  if (line.trimStart().startsWith('#') || line.trimStart().startsWith('//')) {
    return <span className="text-gray-500 italic">{line}</span>;
  }
  // Docstrings
  if (line.trimStart().startsWith('"""') || line.trimStart().startsWith("'''")) {
    return <span className="text-green-600">{line}</span>;
  }
  return line;
}
