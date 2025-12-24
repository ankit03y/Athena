import axios from 'axios';
import type {
    Runbook, Server, ServerCreate, Command, CommandCreate,
    Execution, ExecutionDetails, ScheduleRequest
} from '../types';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Runbook API ---
export const runbookApi = {
    list: async (): Promise<Runbook[]> => {
        const { data } = await api.get('/runbooks');
        return data;
    },

    create: async (name: string, description?: string): Promise<Runbook> => {
        const { data } = await api.post('/runbooks', { name, description });
        return data;
    },

    get: async (id: number): Promise<Runbook> => {
        const { data } = await api.get(`/runbooks/${id}`);
        return data;
    },

    update: async (id: number, name: string, description?: string): Promise<Runbook> => {
        const { data } = await api.put(`/runbooks/${id}`, { name, description });
        return data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/runbooks/${id}`);
    },

    execute: async (id: number): Promise<Execution> => {
        const { data } = await api.post(`/runbooks/${id}/execute`);
        return data;
    },

    schedule: async (id: number, schedule: ScheduleRequest): Promise<void> => {
        await api.post(`/runbooks/${id}/schedule`, schedule);
    },

    unschedule: async (id: number): Promise<void> => {
        await api.delete(`/runbooks/${id}/schedule`);
    },
};

// --- Server API ---
export const serverApi = {
    list: async (runbookId: number): Promise<Server[]> => {
        const { data } = await api.get(`/runbooks/${runbookId}/servers`);
        return data;
    },

    add: async (runbookId: number, server: ServerCreate): Promise<Server> => {
        const { data } = await api.post(`/runbooks/${runbookId}/servers`, server);
        return data;
    },

    remove: async (runbookId: number, serverId: number): Promise<void> => {
        await api.delete(`/runbooks/${runbookId}/servers/${serverId}`);
    },
};

// --- Command API ---
export const commandApi = {
    list: async (runbookId: number): Promise<Command[]> => {
        const { data } = await api.get(`/runbooks/${runbookId}/commands`);
        return data;
    },

    add: async (runbookId: number, command: CommandCreate): Promise<Command> => {
        const { data } = await api.post(`/runbooks/${runbookId}/commands`, command);
        return data;
    },

    update: async (runbookId: number, commandId: number, command: CommandCreate): Promise<Command> => {
        const { data } = await api.put(`/runbooks/${runbookId}/commands/${commandId}`, command);
        return data;
    },

    delete: async (runbookId: number, commandId: number): Promise<void> => {
        await api.delete(`/runbooks/${runbookId}/commands/${commandId}`);
    },
};

// --- Execution API ---
export const executionApi = {
    list: async (limit = 20): Promise<Execution[]> => {
        const { data } = await api.get(`/executions?limit=${limit}`);
        return data;
    },

    get: async (id: number): Promise<ExecutionDetails> => {
        const { data } = await api.get(`/executions/${id}`);
        return data;
    },
};

// --- Health Check ---
export const healthApi = {
    check: async (): Promise<{ status: string; version: string }> => {
        const { data } = await api.get('/health');
        return data;
    },
};
