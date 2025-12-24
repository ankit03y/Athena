import { useState, useEffect, useCallback } from 'react';
import {
  Play, RefreshCw, Clock, History,
  AlertCircle, CheckCircle2
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ServerTable } from './components/ServerTable';
import { CommandInput } from './components/CommandInput';
import { CommandList } from './components/CommandList';
import { ExecutionResults } from './components/ExecutionResults';
import { runbookApi, serverApi, commandApi, healthApi } from './api';
import type { Runbook, Server, Command, CommandCreate, ServerCreate } from './types';
import './index.css';

function App() {
  // State
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [selectedRunbookId, setSelectedRunbookId] = useState<number | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [executionId, setExecutionId] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check API connection
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await healthApi.check();
        setApiConnected(true);
      } catch {
        setApiConnected(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load runbooks
  const loadRunbooks = useCallback(async () => {
    try {
      const data = await runbookApi.list();
      setRunbooks(data);
    } catch (e) {
      console.error('Failed to load runbooks:', e);
    }
  }, []);

  useEffect(() => {
    if (apiConnected) {
      loadRunbooks();
    }
  }, [apiConnected, loadRunbooks]);

  // Load runbook details when selected
  useEffect(() => {
    const loadDetails = async () => {
      if (!selectedRunbookId) {
        setServers([]);
        setCommands([]);
        return;
      }
      try {
        const [serversData, commandsData] = await Promise.all([
          serverApi.list(selectedRunbookId),
          commandApi.list(selectedRunbookId),
        ]);
        setServers(serversData);
        setCommands(commandsData);
      } catch (e) {
        console.error('Failed to load runbook details:', e);
      }
    };
    loadDetails();
  }, [selectedRunbookId]);

  // Handlers
  const handleCreateRunbook = async () => {
    const name = prompt('Enter runbook name:');
    if (!name) return;

    try {
      const runbook = await runbookApi.create(name);
      setRunbooks(prev => [runbook, ...prev]);
      setSelectedRunbookId(runbook.id);
    } catch (e) {
      setError('Failed to create runbook');
    }
  };

  const handleDeleteRunbook = async (id: number) => {
    if (!confirm('Are you sure you want to delete this runbook?')) return;

    try {
      await runbookApi.delete(id);
      setRunbooks(prev => prev.filter(r => r.id !== id));
      if (selectedRunbookId === id) {
        setSelectedRunbookId(null);
      }
    } catch (e) {
      setError('Failed to delete runbook');
    }
  };

  const handleAddServer = async (server: ServerCreate) => {
    if (!selectedRunbookId) return;

    try {
      const newServer = await serverApi.add(selectedRunbookId, server);
      setServers(prev => [...prev, newServer]);
      loadRunbooks(); // Refresh counts
    } catch (e) {
      setError('Failed to add server');
    }
  };

  const handleBulkAddServers = async (serverList: ServerCreate[]) => {
    if (!selectedRunbookId) return;

    try {
      const results = await Promise.all(
        serverList.map(server => serverApi.add(selectedRunbookId, server))
      );
      setServers(prev => [...prev, ...results]);
      loadRunbooks(); // Refresh counts
    } catch (e) {
      setError('Failed to add some servers');
    }
  };

  const handleRemoveServer = async (serverId: number) => {
    if (!selectedRunbookId) return;

    try {
      await serverApi.remove(selectedRunbookId, serverId);
      setServers(prev => prev.filter(s => s.id !== serverId));
      loadRunbooks(); // Refresh counts
    } catch (e) {
      setError('Failed to remove server');
    }
  };

  const handleAddCommand = async (command: CommandCreate) => {
    if (!selectedRunbookId) return;

    try {
      const newCommand = await commandApi.add(selectedRunbookId, command);
      setCommands(prev => [...prev, newCommand]);
      loadRunbooks(); // Refresh counts
    } catch (e) {
      setError('Failed to add command');
    }
  };

  const handleDeleteCommand = async (commandId: number) => {
    if (!selectedRunbookId) return;

    try {
      await commandApi.delete(selectedRunbookId, commandId);
      setCommands(prev => prev.filter(c => c.id !== commandId));
      loadRunbooks(); // Refresh counts
    } catch (e) {
      setError('Failed to delete command');
    }
  };

  const handleExecute = async () => {
    if (!selectedRunbookId || servers.length === 0 || commands.length === 0) {
      setError('Add at least one server and one command before executing');
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const execution = await runbookApi.execute(selectedRunbookId);
      setExecutionId(execution.id);
    } catch (e) {
      setError('Failed to execute runbook');
    } finally {
      setIsExecuting(false);
    }
  };

  const selectedRunbook = runbooks.find(r => r.id === selectedRunbookId);

  // Render
  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        runbooks={runbooks}
        selectedId={selectedRunbookId}
        onSelect={setSelectedRunbookId}
        onCreate={handleCreateRunbook}
        onDelete={handleDeleteRunbook}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* API Status Bar */}
        <div className={`px-4 py-2 text-xs flex items-center justify-between ${apiConnected === false ? 'bg-red-500/10' : 'bg-slate-900/50'
          }`}>
          <div className="flex items-center gap-2">
            {apiConnected === null ? (
              <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
            ) : apiConnected ? (
              <CheckCircle2 className="w-3 h-3 text-green-400" />
            ) : (
              <AlertCircle className="w-3 h-3 text-red-400" />
            )}
            <span className={apiConnected === false ? 'text-red-400' : 'text-slate-400'}>
              {apiConnected === null
                ? 'Connecting to API...'
                : apiConnected
                  ? 'Connected to Athena API'
                  : 'API disconnected - Start backend with python3 api.py'}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
            <span className="text-sm text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              ×
            </button>
          </div>
        )}

        {!selectedRunbookId ? (
          /* Empty State */
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <History className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Welcome to Athena Agent</h2>
              <p className="text-slate-400 mb-4">Select a runbook or create a new one to get started</p>
              <button onClick={handleCreateRunbook} className="btn-primary">
                Create Your First Runbook
              </button>
            </div>
          </div>
        ) : (
          /* Runbook Editor */
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{selectedRunbook?.name}</h1>
                <p className="text-sm text-slate-400">
                  ID: {selectedRunbookId} • {servers.length} servers • {commands.length} commands
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className="btn-secondary flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Schedule
                </button>
                <button
                  onClick={handleExecute}
                  disabled={isExecuting || servers.length === 0 || commands.length === 0}
                  className="btn-primary flex items-center gap-2"
                >
                  {isExecuting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isExecuting ? 'Executing...' : 'Execute Now'}
                </button>
              </div>
            </div>

            {/* Server Configuration */}
            <ServerTable
              servers={servers}
              onAdd={handleAddServer}
              onBulkAdd={handleBulkAddServers}
              onRemove={handleRemoveServer}
            />

            {/* Command Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              <CommandInput
                servers={servers}
                onSubmit={handleAddCommand}
              />
              <CommandList
                commands={commands}
                servers={servers}
                onDelete={handleDeleteCommand}
              />
            </div>

            {/* Execution Results */}
            {executionId && (
              <ExecutionResults
                executionId={executionId}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
