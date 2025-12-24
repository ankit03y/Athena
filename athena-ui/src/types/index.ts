// API Types for Athena Agent

export type AuthType = 'password' | 'private_key';

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'partial';

export type ScheduleType = 'once' | 'cron';

export interface Runbook {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    is_scheduled: boolean;
    next_run_at: string | null;
    server_count: number;
    command_count: number;
}

export interface Server {
    id: number;
    hostname: string;
    username: string;
    auth_type: AuthType;
    port: number;
    node_name?: string;
    created_at: string;
}

export interface ServerCreate {
    hostname: string;
    username: string;
    auth_type: AuthType;
    port: number;
    credential: string;
    node_name?: string;
}

export interface Command {
    id: number;
    script: string;
    description: string | null;  // AI hint for what to extract
    is_universal: boolean;
    server_id: number | null;
    order: number;
}

export interface CommandCreate {
    script: string;
    description?: string;  // AI hint: tells AI what to extract from output
    is_universal: boolean;
    server_id?: number | null;
    order?: number;
}

export interface Execution {
    id: number;
    runbook_id: number;
    runbook_name: string;
    status: ExecutionStatus;
    started_at: string;
    completed_at: string | null;
    triggered_by: string;
}

export interface ExecutionResult {
    id: number;
    server_id: number;
    hostname: string;
    status: ExecutionStatus;
    stdout: string | null;
    stderr: string | null;
    exit_code: number | null;
    ai_summary: string | null;
    ai_signals: string[];
    ai_resources: AIResource[];
}

export interface AIResource {
    name: string;
    status: 'OK' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
    reasoning?: string;
    metric_value?: string;
    value?: string | object;
}

export interface ExecutionDetails extends Execution {
    results: ExecutionResult[];
}

export interface ScheduleRequest {
    schedule_type: ScheduleType;
    cron_expression?: string;
    run_at?: string;
}
