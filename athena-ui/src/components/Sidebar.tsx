import { useState } from 'react';
import { Plus, Book, Clock, Trash2, MoreVertical } from 'lucide-react';
import type { Runbook } from '../types';

interface SidebarProps {
    runbooks: Runbook[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    onCreate: () => void;
    onDelete: (id: number) => void;
}

export function Sidebar({ runbooks, selectedId, onSelect, onCreate, onDelete }: SidebarProps) {
    const [menuOpen, setMenuOpen] = useState<number | null>(null);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <aside className="w-80 h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Book className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Athena</h1>
                        <p className="text-xs text-slate-500">Automation Agent</p>
                    </div>
                </div>

                <button
                    onClick={onCreate}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-5 h-5" />
                    New Runbook
                </button>
            </div>

            {/* Section Label */}
            <div className="px-5 py-3">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Your Runbooks
                </span>
            </div>

            {/* Runbook List */}
            <div className="flex-1 overflow-y-auto px-3">
                {runbooks.length === 0 ? (
                    <div className="text-center py-12 px-4">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800 flex items-center justify-center">
                            <Book className="w-6 h-6 text-slate-600" />
                        </div>
                        <p className="text-sm text-slate-500">No runbooks yet</p>
                        <p className="text-xs text-slate-600 mt-1">Create your first runbook to get started</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {runbooks.map((runbook) => (
                            <div
                                key={runbook.id}
                                className={`group relative rounded-xl cursor-pointer transition-all ${selectedId === runbook.id
                                        ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/10 border border-blue-500/30'
                                        : 'hover:bg-slate-800/50 border border-transparent'
                                    }`}
                                onClick={() => onSelect(runbook.id)}
                            >
                                <div className="p-3.5">
                                    {/* Title row */}
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className={`text-sm font-medium pr-6 ${selectedId === runbook.id ? 'text-white' : 'text-slate-200'
                                            }`}>
                                            {runbook.name}
                                        </h3>

                                        {/* Menu button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMenuOpen(menuOpen === runbook.id ? null : runbook.id);
                                            }}
                                            className="absolute right-2 top-3 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-700 text-slate-400 transition-all"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>

                                        {/* Dropdown menu */}
                                        {menuOpen === runbook.id && (
                                            <div className="absolute right-2 top-9 z-10 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1 min-w-[120px]">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(runbook.id);
                                                        setMenuOpen(null);
                                                    }}
                                                    className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats row */}
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="text-slate-500">
                                            {runbook.server_count} {runbook.server_count === 1 ? 'server' : 'servers'}
                                        </span>
                                        <span className="text-slate-600">•</span>
                                        <span className="text-slate-500">
                                            {runbook.command_count} {runbook.command_count === 1 ? 'cmd' : 'cmds'}
                                        </span>
                                        {runbook.is_scheduled && (
                                            <>
                                                <span className="text-slate-600">•</span>
                                                <span className="flex items-center gap-1 text-amber-400">
                                                    <Clock className="w-3 h-3" />
                                                    Scheduled
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Date */}
                                    <div className="mt-2 text-xs text-slate-600">
                                        {formatDate(runbook.updated_at)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Athena Agent v2.0</span>
                    <span>{runbooks.length} runbooks</span>
                </div>
            </div>
        </aside>
    );
}
