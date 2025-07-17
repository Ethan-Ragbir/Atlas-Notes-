import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Plus, Search, GitBranch, Cloud, FileText, Trash2, Edit3, Link, Download, Upload, Settings, User, Menu, X } from 'lucide-react';

const MindMapNotesApp = () => {
  const [notes, setNotes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [viewMode, setViewMode] = useState('mindmap'); // 'mindmap' or 'list'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [driveConnected, setDriveConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const svgRef = useRef(null);
  const [draggedNode, setDraggedNode] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Sample initial data
  useEffect(() => {
    const sampleNotes = [
      {
        id: '1',
        title: 'Project Planning',
        content: 'Main project overview and planning notes',
        x: 400,
        y: 300,
        color: '#3B82F6',
        tags: ['project', 'planning'],
        lastModified: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Research Ideas',
        content: 'Collection of research topics and ideas',
        x: 200,
        y: 200,
        color: '#10B981',
        tags: ['research', 'ideas'],
        lastModified: new Date().toISOString()
      },
      {
        id: '3',
        title: 'Meeting Notes',
        content: 'Notes from team meetings and discussions',
        x: 600,
        y: 200,
        color: '#F59E0B',
        tags: ['meetings', 'team'],
        lastModified: new Date().toISOString()
      },
      {
        id: '4',
        title: 'Code Snippets',
        content: 'Useful code snippets and examples',
        x: 300,
        y: 450,
        color: '#EF4444',
        tags: ['code', 'development'],
        lastModified: new Date().toISOString()
      }
    ];

    const sampleConnections = [
      { id: 'c1', from: '1', to: '2' },
      { id: 'c2', from: '1', to: '3' },
      { id: 'c3', from: '1', to: '4' }
    ];

    setNotes(sampleNotes);
    setConnections(sampleConnections);
  }, []);

  const createNote = (x = 400, y = 300) => {
    const newNote = {
      id: Date.now().toString(),
      title: 'New Note',
      content: '',
      x,
      y,
      color: '#6B7280',
      tags: [],
      lastModified: new Date().toISOString()
    };
    setNotes([...notes, newNote]);
    setSelectedNote(newNote);
    setIsCreatingNote(true);
  };

  const updateNote = (noteId, updates) => {
    setNotes(notes.map(note => 
      note.id === noteId 
        ? { ...note, ...updates, lastModified: new Date().toISOString() }
        : note
    ));
    if (selectedNote && selectedNote.id === noteId) {
      setSelectedNote({ ...selectedNote, ...updates });
    }
  };

  const deleteNote = (noteId) => {
    setNotes(notes.filter(note => note.id !== noteId));
    setConnections(connections.filter(conn => conn.from !== noteId && conn.to !== noteId));
    if (selectedNote && selectedNote.id === noteId) {
      setSelectedNote(null);
    }
  };

  const createConnection = (fromId, toId) => {
    const connectionExists = connections.some(
      conn => (conn.from === fromId && conn.to === toId) || 
               (conn.from === toId && conn.to === fromId)
    );
    
    if (!connectionExists && fromId !== toId) {
      const newConnection = {
        id: `${fromId}-${toId}`,
        from: fromId,
        to: toId
      };
      setConnections([...connections, newConnection]);
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleMouseDown = (e, note) => {
    e.preventDefault();
    setDraggedNode(note);
    setSelectedNote(note);
  };

  const handleMouseMove = useCallback((e) => {
    if (draggedNode) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      updateNote(draggedNode.id, { x, y });
    }
  }, [draggedNode, updateNote]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  useEffect(() => {
    if (draggedNode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedNode, handleMouseMove, handleMouseUp]);

  const renderConnections = () => {
    return connections.map(connection => {
      const fromNote = notes.find(note => note.id === connection.from);
      const toNote = notes.find(note => note.id === connection.to);
      
      if (!fromNote || !toNote) return null;

      return (
        <line
          key={connection.id}
          x1={fromNote.x}
          y1={fromNote.y}
          x2={toNote.x}
          y2={toNote.y}
          stroke="#6B7280"
          strokeWidth="2"
          strokeDasharray="5,5"
          opacity="0.6"
        />
      );
    });
  };

  const renderMindMap = () => (
    <div className="flex-1 relative bg-gray-50">
      <svg
        ref={svgRef}
        className="w-full h-full cursor-crosshair"
        onDoubleClick={(e) => {
          const rect = svgRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          createNote(x, y);
        }}
      >
        {renderConnections()}
        {filteredNotes.map(note => (
          <g key={note.id}>
            <circle
              cx={note.x}
              cy={note.y}
              r="40"
              fill={note.color}
              stroke={selectedNote?.id === note.id ? "#1F2937" : "transparent"}
              strokeWidth="3"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseDown={(e) => handleMouseDown(e, note)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setSelectedNote(note);
                setIsCreatingNote(true);
              }}
            />
            <text
              x={note.x}
              y={note.y + 5}
              textAnchor="middle"
              className="pointer-events-none text-white text-sm font-medium"
              style={{ maxWidth: '70px' }}
            >
              {note.title.length > 8 ? note.title.substring(0, 8) + '...' : note.title}
            </text>
          </g>
        ))}
      </svg>
      
      {/* Floating action button */}
      <button
        onClick={() => createNote()}
        className="absolute bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <Plus size={24} />
      </button>
    </div>
  );

  const renderListView = () => (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNotes.map(note => (
          <div
            key={note.id}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedNote(note)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: note.color }}
                />
                <h3 className="font-semibold text-gray-900">{note.title}</h3>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNote(note.id);
                }}
                className="text-gray-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-3 line-clamp-3">
              {note.content || 'No content'}
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              {note.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              {new Date(note.lastModified).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">MindMap Notes</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* View Toggle */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('mindmap')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'mindmap'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mind Map
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List View
            </button>
          </div>
        </div>

        {/* Integrations */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Integrations</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud size={18} className={driveConnected ? 'text-green-600' : 'text-gray-400'} />
                <span className="text-sm">Google Drive</span>
              </div>
              <button
                onClick={() => setDriveConnected(!driveConnected)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  driveConnected
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {driveConnected ? 'Connected' : 'Connect'}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch size={18} className={githubConnected ? 'text-green-600' : 'text-gray-400'} />
                <span className="text-sm">GitHub</span>
              </div>
              <button
                onClick={() => setGithubConnected(!githubConnected)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  githubConnected
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {githubConnected ? 'Connected' : 'Connect'}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Notes */}
        <div className="flex-1 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Notes</h3>
          <div className="space-y-2">
            {notes.slice(0, 10).map(note => (
              <div
                key={note.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedNote?.id === note.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedNote(note)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: note.color }}
                  />
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {note.title}
                  </h4>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {note.content || 'No content'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => createNote()}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              <span className="text-sm">New Note</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings size={16} />
              <span className="text-sm">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Menu size={20} />
                </button>
              )}
              <h2 className="text-lg font-semibold text-gray-900">
                {viewMode === 'mindmap' ? 'Mind Map View' : 'List View'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {driveConnected && (
                <button className="flex items-center gap-2 py-2 px-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                  <Download size={16} />
                  <span className="text-sm">Sync Drive</span>
                </button>
              )}
              {githubConnected && (
                <button className="flex items-center gap-2 py-2 px-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
                  <Upload size={16} />
                  <span className="text-sm">Push to Git</span>
                </button>
              )}
              <button className="flex items-center gap-2 py-2 px-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                <Save size={16} />
                <span className="text-sm">Save All</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {viewMode === 'mindmap' ? renderMindMap() : renderListView()}
      </div>

      {/* Note Editor Modal */}
      {(selectedNote && isCreatingNote) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Note</h3>
                <button
                  onClick={() => setIsCreatingNote(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={selectedNote.title}
                    onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={selectedNote.content}
                    onChange={(e) => updateNote(selectedNote.id, { content: e.target.value })}
                    rows="8"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Write your note content here..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="flex gap-3">
                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'].map(color => (
                      <button
                        key={color}
                        onClick={() => updateNote(selectedNote.id, { color })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          selectedNote.color === color ? 'border-gray-900' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={selectedNote.tags.join(', ')}
                    onChange={(e) => updateNote(selectedNote.id, { 
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="project, important, research"
                  />
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => deleteNote(selectedNote.id)}
                  className="flex items-center gap-2 py-2 px-4 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} />
                  Delete Note
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsCreatingNote(false)}
                    className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setIsCreatingNote(false)}
                    className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Export/Import</h4>
                  <div className="space-y-2">
                    <button className="w-full py-2 px-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-left">
                      Export to JSON
                    </button>
                    <button className="w-full py-2 px-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-left">
                      Import from JSON
                    </button>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Sync Settings</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm text-gray-700">Auto-sync with Google Drive</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm text-gray-700">Auto-commit to GitHub</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MindMapNotesApp;
