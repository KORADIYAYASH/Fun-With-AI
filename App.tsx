import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import { TOOLS } from './constants';
import { ToolId } from './types';
import ChatTool from './components/tools/ChatTool';
import ImageTool from './components/tools/ImageTool';
import TTSTool from './components/tools/TTSTool';
import VideoTool from './components/tools/VideoTool';
import LiveTool from './components/tools/LiveTool';

const App: React.FC = () => {
  const [activeToolId, setActiveToolId] = useState<string>(ToolId.CHAT_BASIC);

  const activeTool = TOOLS.find(t => t.id === activeToolId) || TOOLS[0];

  const renderTool = () => {
    switch (activeTool.id) {
        case ToolId.CHAT_BASIC:
        case ToolId.CHAT_CODE:
        case ToolId.SEARCH_GROUNDING:
        case ToolId.MAPS_GROUNDING:
            return <ChatTool 
                key={activeTool.id} 
                toolId={activeTool.id} 
                model={activeTool.model} 
                title={activeTool.name}
                description={activeTool.description}
            />;
        case ToolId.IMAGE_GEN:
            return <ImageTool key="gen" mode="generate" />;
        case ToolId.IMAGE_EDIT:
            return <ImageTool key="edit" mode="edit" />;
        case ToolId.TTS:
            return <TTSTool />;
        case ToolId.VIDEO_VEO:
            return <VideoTool />;
        case ToolId.LIVE_AUDIO:
            return <LiveTool />;
        default:
            return <div className="text-white">Tool not implemented yet</div>;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      <Sidebar 
        tools={TOOLS} 
        activeToolId={activeToolId} 
        onSelectTool={setActiveToolId} 
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Bar */}
        <header className="h-16 bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 flex items-center px-6 justify-between shrink-0">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
                <span>Current Tool:</span>
                <span className="text-white font-medium px-2 py-1 bg-indigo-900/50 rounded border border-indigo-500/30">
                    {activeTool.name}
                </span>
            </div>
            <div className="text-xs text-slate-600 font-mono">
                Model: {activeTool.model}
            </div>
        </header>

        {/* Tool Content */}
        <div className="flex-1 overflow-hidden relative">
            {renderTool()}
        </div>
      </main>
    </div>
  );
};

export default App;