import { useState, useRef } from 'react';
import { Plus, Trash2, Eye, EyeOff, Server as ServerIcon, Upload, FileSpreadsheet, X } from 'lucide-react';
import type { Server, ServerCreate, AuthType } from '../types';

interface ServerTableProps {
    servers: Server[];
    onAdd: (server: ServerCreate) => void;
    onBulkAdd: (servers: ServerCreate[]) => void;
    onRemove: (serverId: number) => void;
}

export function ServerTable({ servers, onAdd, onBulkAdd, onRemove }: ServerTableProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [showCredential, setShowCredential] = useState(false);
    const [csvContent, setCsvContent] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newServer, setNewServer] = useState<ServerCreate>({
        hostname: '',
        username: '',
        auth_type: 'password',
        port: 22,
        credential: '',
        node_name: '',
    });

    const handleAdd = () => {
        if (!newServer.hostname || !newServer.username || !newServer.credential) return;
        onAdd(newServer);
        setNewServer({
            hostname: '',
            username: '',
            auth_type: 'password',
            port: 22,
            credential: '',
            node_name: '',
        });
        setIsAdding(false);
    };

    const parseCSV = (content: string): ServerCreate[] => {
        const lines = content.trim().split('\n');
        const servers: ServerCreate[] = [];

        // Skip header row if it exists
        const startIndex = lines[0]?.toLowerCase().includes('hostname') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const parts = lines[i].split(',').map(p => p.trim());
            if (parts.length >= 3) {
                servers.push({
                    hostname: parts[0],
                    username: parts[1],
                    credential: parts[2],
                    node_name: parts[3] || '',
                    port: parseInt(parts[4]) || 22,
                    auth_type: (parts[5]?.toLowerCase() === 'key' ? 'private_key' : 'password') as AuthType,
                });
            }
        }
        return servers;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setCsvContent(content);
        };
        reader.readAsText(file);
    };

    const handleBulkUpload = () => {
        const servers = parseCSV(csvContent);
        if (servers.length > 0) {
            onBulkAdd(servers);
            setCsvContent('');
            setShowUpload(false);
        }
    };

    return (
        <div className="glass rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ServerIcon className="w-5 h-5 text-blue-400" />
                    <h2 className="font-semibold text-white">Server Configuration</h2>
                    <span className="text-xs text-slate-500 ml-2">({servers.length} servers)</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowUpload(!showUpload)}
                        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        Bulk Upload
                    </button>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Server
                    </button>
                </div>
            </div>

            {/* Bulk Upload Panel */}
            {showUpload && (
                <div className="p-4 bg-slate-800/50 border-b border-slate-700/50">
                    <div className="flex items-start gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <FileSpreadsheet className="w-4 h-4 text-green-400" />
                                <span className="text-sm font-medium text-white">CSV Format</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">
                                hostname, username, password, node_name (optional), port (optional), auth_type (optional: password/key)
                            </p>
                            <textarea
                                value={csvContent}
                                onChange={(e) => setCsvContent(e.target.value)}
                                placeholder={`192.168.1.10, ubuntu, mypassword, Web Server 1, 22, password
192.168.1.11, admin, secret123, DB Server, 22, password
192.168.1.12, root, pass456, App Server`}
                                className="input-field w-full h-32 font-mono text-xs"
                            />
                            <div className="flex items-center gap-3 mt-3">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="btn-secondary text-sm"
                                >
                                    <Upload className="w-4 h-4 mr-1.5 inline" />
                                    Choose File
                                </button>
                                <button
                                    onClick={handleBulkUpload}
                                    disabled={!csvContent.trim()}
                                    className="btn-primary text-sm"
                                >
                                    Import {parseCSV(csvContent).length} Servers
                                </button>
                                <button
                                    onClick={() => { setShowUpload(false); setCsvContent(''); }}
                                    className="text-slate-400 hover:text-white p-1"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
                            <th className="text-left px-4 py-3 font-medium">Hostname / IP</th>
                            <th className="text-left px-4 py-3 font-medium">Node Name</th>
                            <th className="text-left px-4 py-3 font-medium">Username</th>
                            <th className="text-left px-4 py-3 font-medium">Auth</th>
                            <th className="text-left px-4 py-3 font-medium">Port</th>
                            <th className="text-right px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                        {servers.map((server) => (
                            <tr key={server.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-3">
                                    <span className="text-sm font-mono text-slate-200">{server.hostname}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-slate-400">{server.node_name || '-'}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-slate-300">{server.username}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${server.auth_type === 'private_key'
                                            ? 'bg-green-500/10 text-green-400'
                                            : 'bg-amber-500/10 text-amber-400'
                                        }`}>
                                        {server.auth_type === 'private_key' ? 'Key' : 'Pwd'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-slate-400">{server.port}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => onRemove(server.id)}
                                        className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {/* Add new server row */}
                        {isAdding && (
                            <>
                                <tr className="bg-slate-800/50">
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            placeholder="192.168.1.10"
                                            value={newServer.hostname}
                                            onChange={(e) => setNewServer({ ...newServer, hostname: e.target.value })}
                                            className="input-field w-full text-sm"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            placeholder="Server Name"
                                            value={newServer.node_name}
                                            onChange={(e) => setNewServer({ ...newServer, node_name: e.target.value })}
                                            className="input-field w-full text-sm"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            placeholder="ubuntu"
                                            value={newServer.username}
                                            onChange={(e) => setNewServer({ ...newServer, username: e.target.value })}
                                            className="input-field w-full text-sm"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <select
                                            value={newServer.auth_type}
                                            onChange={(e) => setNewServer({ ...newServer, auth_type: e.target.value as AuthType })}
                                            className="input-field w-full text-sm"
                                        >
                                            <option value="password">Password</option>
                                            <option value="private_key">Key</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="number"
                                            value={newServer.port}
                                            onChange={(e) => setNewServer({ ...newServer, port: parseInt(e.target.value) || 22 })}
                                            className="input-field w-16 text-sm"
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex items-center gap-1 justify-end">
                                            <button onClick={handleAdd} className="btn-primary text-xs py-1 px-2">Save</button>
                                            <button onClick={() => setIsAdding(false)} className="btn-secondary text-xs py-1 px-2">×</button>
                                        </div>
                                    </td>
                                </tr>
                                <tr className="bg-slate-800/50">
                                    <td colSpan={6} className="px-4 py-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-slate-400 shrink-0">
                                                {newServer.auth_type === 'private_key' ? 'Private Key:' : 'Password:'}
                                            </span>
                                            <div className="flex-1 relative">
                                                <input
                                                    type={showCredential ? 'text' : 'password'}
                                                    placeholder={newServer.auth_type === 'private_key' ? 'Paste private key...' : 'Enter password...'}
                                                    value={newServer.credential}
                                                    onChange={(e) => setNewServer({ ...newServer, credential: e.target.value })}
                                                    className="input-field w-full text-sm pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCredential(!showCredential)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                                >
                                                    {showCredential ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </>
                        )}

                        {servers.length === 0 && !isAdding && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                    <ServerIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No servers configured</p>
                                    <p className="text-xs mt-1">Add servers manually or use bulk upload</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
