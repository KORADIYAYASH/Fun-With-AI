import React from 'react';
import { ToolConfig, ToolCategory } from '../types';

interface SidebarProps {
  tools: ToolConfig[];
  activeToolId: string;
  onSelectTool: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ tools, activeToolId, onSelectTool }) => {
  const categories = Array.from(new Set(tools.map((t) => t.category)));

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-full flex flex-col overflow-y-auto shrink-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-indigo-400 tracking-tight">Gemini Suite</h1>
        <p className="text-xs text-slate-500 mt-1">Educational AI Dashboard</p>
      </div>
      
      <nav className="flex-1 px-4 pb-6 space-y-6">
        {categories.map((category) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
              {category}
            </h3>
            <div className="space-y-1">
              {tools
                .filter((t) => t.category === category)
                .map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => onSelectTool(tool.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeToolId === tool.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                        <span className="text-lg">{tool.icon}</span>
                        <span>{tool.name}</span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;