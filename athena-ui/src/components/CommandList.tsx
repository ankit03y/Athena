import { Trash2, Terminal, Globe, Server } from 'lucide-react';
import type { Command, Server as ServerType } from '../types';

interface CommandListProps {
    commands: Command[];
    servers: ServerType[];
    onDelete: (commandId: number) => void;
}

export function CommandList({ commands, servers, onDelete }: CommandListProps) {
    const getServerName = (serverId: number | null): string => {
        if (!serverId) return 'All Servers';
        const server = servers.find(s => s.id === serverId);
        return server ? server.hostname : 'Unknown';
    };

    if (commands.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-400 px-1">Added Commands</h3>
            <div className="space-y-2">
                {commands.map((command, index) => (
                    <div
                        key={command.id}
                        className="glass rounded-lg p-3 group hover:border-slate-600"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-800 text-xs text-slate-400 font-mono shrink-0">
                                    {index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {command.is_universal ? (
                                            <span className="flex items-center gap-1 text-xs text-blue-400">
                                                <Globe className="w-3 h-3" />
                                                Universal
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs text-amber-400">
                                                <Server className="w-3 h-3" />
                                                {getServerName(command.server_id)}
                                            </span>
                                        )}
                                    </div>
                                    <pre className="text-sm font-mono text-slate-200 whitespace-pre-wrap break-all bg-slate-900/50 rounded p-2">
                                        {command.script}
                                    </pre>
                                </div>
                            </div>

                            <button
                                onClick={() => onDelete(command.id)}
                                className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
