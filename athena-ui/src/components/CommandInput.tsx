import { useState } from 'react';
import { Terminal, Globe, Server, MessageSquare } from 'lucide-react';
import type { CommandCreate, Server as ServerType } from '../types';

interface CommandInputProps {
    servers: ServerType[];
    onSubmit: (command: CommandCreate) => void;
}

export function CommandInput({ servers, onSubmit }: CommandInputProps) {
    const [script, setScript] = useState('');
    const [description, setDescription] = useState('');
    const [isUniversal, setIsUniversal] = useState(true);
    const [selectedServerId, setSelectedServerId] = useState<number | null>(null);

    const handleAdd = () => {
        if (!script.trim()) return;

        onSubmit({
            script: script.trim(),
            description: description.trim() || undefined,
            is_universal: isUniversal,
            server_id: isUniversal ? null : selectedServerId,
            order: 0,
        });

        setScript('');
        setDescription('');
    };

    return (
        <div className="glass rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-green-400" />
                    <h2 className="font-semibold text-white">Command Input</h2>
                </div>

                {/* Toggle */}
                <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg">
                    <button
                        onClick={() => setIsUniversal(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${isUniversal
                                ? 'bg-blue-500 text-white'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <Globe className="w-3.5 h-3.5" />
                        Universal
                    </button>
                    <button
                        onClick={() => setIsUniversal(false)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${!isUniversal
                                ? 'bg-blue-500 text-white'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <Server className="w-3.5 h-3.5" />
                        Per-Server
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Server selector for per-server mode */}
                {!isUniversal && (
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Target Server</label>
                        <select
                            value={selectedServerId || ''}
                            onChange={(e) => setSelectedServerId(e.target.value ? parseInt(e.target.value) : null)}
                            className="input-field w-full"
                        >
                            <option value="">Select a server...</option>
                            {servers.map((server) => (
                                <option key={server.id} value={server.id}>
                                    {server.node_name || server.hostname} ({server.username})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Command textarea */}
                <div>
                    <label className="text-xs text-slate-400 mb-1 block">Command Script</label>
                    <div className="relative">
                        <textarea
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                            placeholder={`# Enter your commands here\ndf -h / | tail -n 1\nfree -m`}
                            className="input-field w-full h-28 font-mono text-sm resize-none"
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* AI Description hint */}
                <div>
                    <label className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        AI Extraction Hint (optional)
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g., Extract disk usage percentage and available space only"
                        className="input-field w-full text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Tell the AI what specific data to extract. Leave empty for intelligent auto-detection.
                    </p>
                </div>

                {/* Add button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleAdd}
                        disabled={!script.trim() || (!isUniversal && !selectedServerId)}
                        className="btn-primary"
                    >
                        Add Command
                    </button>
                </div>
            </div>
        </div>
    );
}
