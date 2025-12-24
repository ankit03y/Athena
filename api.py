"""
Athena Agent - API Server
FastAPI application with runbook management, execution, and scheduling endpoints
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import json
import os

load_dotenv()

from database import (
    create_db_and_tables, get_sync_session,
    RunbookCRUD, ServerCRUD, CommandCRUD, ExecutionCRUD
)
from models import (
    RunbookCreate, ServerCreate, CommandCreate,
    AuthType, ExecutionStatus, ScheduleType
)
from scheduler import (
    start_scheduler, shutdown_scheduler,
    schedule_runbook, unschedule_runbook, get_scheduled_jobs, get_next_run_time
)
from executor import execute_runbook


# --- LIFECYCLE ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    start_scheduler()
    print("🚀 Athena Agent API started!")
    yield
    # Shutdown
    shutdown_scheduler()
    print("👋 Athena Agent API stopped!")


app = FastAPI(
    title="Athena Agent",
    description="AI-powered Infrastructure Automation Platform",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- REQUEST/RESPONSE MODELS ---
class RunbookResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    is_scheduled: bool
    next_run_at: Optional[datetime]
    server_count: int = 0
    command_count: int = 0


class ServerResponse(BaseModel):
    id: int
    hostname: str
    username: str
    auth_type: AuthType
    port: int
    node_name: Optional[str] = None
    created_at: datetime


class CommandResponse(BaseModel):
    id: int
    script: str
    description: Optional[str] = None
    is_universal: bool
    server_id: Optional[int]
    order: int


class ExecutionResponse(BaseModel):
    id: int
    runbook_id: int
    runbook_name: str
    status: ExecutionStatus
    started_at: datetime
    completed_at: Optional[datetime]
    triggered_by: str


class ExecutionResultResponse(BaseModel):
    id: int
    server_id: int
    hostname: str
    status: ExecutionStatus
    stdout: Optional[str]
    stderr: Optional[str]
    exit_code: Optional[int]
    ai_summary: Optional[str]
    ai_signals: Optional[list]
    ai_resources: Optional[list]


class ScheduleRequest(BaseModel):
    schedule_type: ScheduleType
    cron_expression: Optional[str] = None
    run_at: Optional[datetime] = None


# --- RUNBOOK ENDPOINTS ---

@app.get("/runbooks", response_model=List[RunbookResponse])
def list_runbooks():
    """Get all runbooks"""
    with get_sync_session() as session:
        runbooks = RunbookCRUD.get_all(session)
        results = []
        for r in runbooks:
            servers = ServerCRUD.get_servers_for_runbook(session, r.id)
            commands = CommandCRUD.get_for_runbook(session, r.id)
            next_run = get_next_run_time(r.id) if r.is_scheduled else None
            results.append(RunbookResponse(
                id=r.id,
                name=r.name,
                description=r.description,
                created_at=r.created_at,
                updated_at=r.updated_at,
                is_scheduled=r.is_scheduled,
                next_run_at=next_run,
                server_count=len(servers),
                command_count=len(commands),
            ))
        return results


@app.post("/runbooks", response_model=RunbookResponse)
def create_runbook(runbook: RunbookCreate):
    """Create a new runbook"""
    with get_sync_session() as session:
        db_runbook = RunbookCRUD.create(session, runbook)
        return RunbookResponse(
            id=db_runbook.id,
            name=db_runbook.name,
            description=db_runbook.description,
            created_at=db_runbook.created_at,
            updated_at=db_runbook.updated_at,
            is_scheduled=db_runbook.is_scheduled,
            next_run_at=None,
            server_count=0,
            command_count=0,
        )


@app.get("/runbooks/{runbook_id}", response_model=RunbookResponse)
def get_runbook(runbook_id: int):
    """Get a specific runbook"""
    with get_sync_session() as session:
        runbook = RunbookCRUD.get_by_id(session, runbook_id)
        if not runbook:
            raise HTTPException(status_code=404, detail="Runbook not found")
        
        servers = ServerCRUD.get_servers_for_runbook(session, runbook_id)
        commands = CommandCRUD.get_for_runbook(session, runbook_id)
        next_run = get_next_run_time(runbook_id) if runbook.is_scheduled else None
        
        return RunbookResponse(
            id=runbook.id,
            name=runbook.name,
            description=runbook.description,
            created_at=runbook.created_at,
            updated_at=runbook.updated_at,
            is_scheduled=runbook.is_scheduled,
            next_run_at=next_run,
            server_count=len(servers),
            command_count=len(commands),
        )


@app.put("/runbooks/{runbook_id}", response_model=RunbookResponse)
def update_runbook(runbook_id: int, updates: RunbookCreate):
    """Update a runbook"""
    with get_sync_session() as session:
        runbook = RunbookCRUD.update(session, runbook_id, updates.model_dump())
        if not runbook:
            raise HTTPException(status_code=404, detail="Runbook not found")
        
        servers = ServerCRUD.get_servers_for_runbook(session, runbook_id)
        commands = CommandCRUD.get_for_runbook(session, runbook_id)
        
        return RunbookResponse(
            id=runbook.id,
            name=runbook.name,
            description=runbook.description,
            created_at=runbook.created_at,
            updated_at=runbook.updated_at,
            is_scheduled=runbook.is_scheduled,
            next_run_at=None,
            server_count=len(servers),
            command_count=len(commands),
        )


@app.delete("/runbooks/{runbook_id}")
def delete_runbook(runbook_id: int):
    """Delete a runbook"""
    with get_sync_session() as session:
        # Unschedule if scheduled
        unschedule_runbook(runbook_id)
        
        success = RunbookCRUD.delete(session, runbook_id)
        if not success:
            raise HTTPException(status_code=404, detail="Runbook not found")
        return {"status": "deleted"}


# --- SERVER ENDPOINTS ---

@app.get("/runbooks/{runbook_id}/servers", response_model=List[ServerResponse])
def list_servers(runbook_id: int):
    """Get all servers for a runbook"""
    with get_sync_session() as session:
        servers = ServerCRUD.get_servers_for_runbook(session, runbook_id)
        return [
            ServerResponse(
                id=s.id,
                hostname=s.hostname,
                username=s.username,
                auth_type=s.auth_type,
                port=s.port,
                node_name=s.node_name,
                created_at=s.created_at,
            )
            for s in servers
        ]


@app.post("/runbooks/{runbook_id}/servers", response_model=ServerResponse)
def add_server(runbook_id: int, server: ServerCreate):
    """Add a server to a runbook"""
    with get_sync_session() as session:
        # Verify runbook exists
        runbook = RunbookCRUD.get_by_id(session, runbook_id)
        if not runbook:
            raise HTTPException(status_code=404, detail="Runbook not found")
        
        db_server = ServerCRUD.create(session, server, runbook_id)
        return ServerResponse(
            id=db_server.id,
            hostname=db_server.hostname,
            username=db_server.username,
            auth_type=db_server.auth_type,
            port=db_server.port,
            node_name=db_server.node_name,
            created_at=db_server.created_at,
        )


@app.delete("/runbooks/{runbook_id}/servers/{server_id}")
def remove_server(runbook_id: int, server_id: int):
    """Remove a server from a runbook"""
    with get_sync_session() as session:
        success = ServerCRUD.delete(session, server_id)
        if not success:
            raise HTTPException(status_code=404, detail="Server not found")
        return {"status": "deleted"}


# --- COMMAND ENDPOINTS ---

@app.get("/runbooks/{runbook_id}/commands", response_model=List[CommandResponse])
def list_commands(runbook_id: int):
    """Get all commands for a runbook"""
    with get_sync_session() as session:
        commands = CommandCRUD.get_for_runbook(session, runbook_id)
        return [
            CommandResponse(
                id=c.id,
                script=c.script,
                description=c.description,
                is_universal=c.is_universal,
                server_id=c.server_id,
                order=c.order,
            )
            for c in commands
        ]


@app.post("/runbooks/{runbook_id}/commands", response_model=CommandResponse)
def add_command(runbook_id: int, command: CommandCreate):
    """Add a command to a runbook"""
    with get_sync_session() as session:
        # Verify runbook exists
        runbook = RunbookCRUD.get_by_id(session, runbook_id)
        if not runbook:
            raise HTTPException(status_code=404, detail="Runbook not found")
        
        db_command = CommandCRUD.create(session, runbook_id, command)
        return CommandResponse(
            id=db_command.id,
            script=db_command.script,
            description=db_command.description,
            is_universal=db_command.is_universal,
            server_id=db_command.server_id,
            order=db_command.order,
        )


@app.put("/runbooks/{runbook_id}/commands/{command_id}", response_model=CommandResponse)
def update_command(runbook_id: int, command_id: int, updates: CommandCreate):
    """Update a command"""
    with get_sync_session() as session:
        command = CommandCRUD.update(session, command_id, updates.model_dump())
        if not command:
            raise HTTPException(status_code=404, detail="Command not found")
        return CommandResponse(
            id=command.id,
            script=command.script,
            is_universal=command.is_universal,
            server_id=command.server_id,
            order=command.order,
        )


@app.delete("/runbooks/{runbook_id}/commands/{command_id}")
def delete_command(runbook_id: int, command_id: int):
    """Delete a command"""
    with get_sync_session() as session:
        success = CommandCRUD.delete(session, command_id)
        if not success:
            raise HTTPException(status_code=404, detail="Command not found")
        return {"status": "deleted"}


# --- EXECUTION ENDPOINTS ---

@app.post("/runbooks/{runbook_id}/execute", response_model=ExecutionResponse)
async def execute_runbook_endpoint(runbook_id: int, background_tasks: BackgroundTasks):
    """Execute a runbook"""
    with get_sync_session() as session:
        runbook = RunbookCRUD.get_by_id(session, runbook_id)
        if not runbook:
            raise HTTPException(status_code=404, detail="Runbook not found")
        
        # Create execution record
        execution = ExecutionCRUD.create(session, runbook_id, triggered_by="manual")
        
        # Execute in background
        background_tasks.add_task(execute_runbook, runbook_id, execution.id)
        
        return ExecutionResponse(
            id=execution.id,
            runbook_id=runbook_id,
            runbook_name=runbook.name,
            status=execution.status,
            started_at=execution.started_at,
            completed_at=execution.completed_at,
            triggered_by=execution.triggered_by,
        )


@app.get("/executions", response_model=List[ExecutionResponse])
def list_executions(limit: int = 20):
    """Get recent executions"""
    with get_sync_session() as session:
        executions = ExecutionCRUD.get_recent(session, limit)
        results = []
        for e in executions:
            runbook = RunbookCRUD.get_by_id(session, e.runbook_id)
            results.append(ExecutionResponse(
                id=e.id,
                runbook_id=e.runbook_id,
                runbook_name=runbook.name if runbook else "Unknown",
                status=e.status,
                started_at=e.started_at,
                completed_at=e.completed_at,
                triggered_by=e.triggered_by,
            ))
        return results


@app.get("/executions/{execution_id}", response_model=dict)
def get_execution_details(execution_id: int):
    """Get execution details with results"""
    with get_sync_session() as session:
        execution = ExecutionCRUD.get_by_id(session, execution_id)
        if not execution:
            raise HTTPException(status_code=404, detail="Execution not found")
        
        runbook = RunbookCRUD.get_by_id(session, execution.runbook_id)
        
        # Get results
        results = []
        for r in execution.results:
            server = ServerCRUD.get_by_id(session, r.server_id)
            results.append(ExecutionResultResponse(
                id=r.id,
                server_id=r.server_id,
                hostname=server.hostname if server else "Unknown",
                status=r.status,
                stdout=r.stdout,
                stderr=r.stderr,
                exit_code=r.exit_code,
                ai_summary=r.ai_summary,
                ai_signals=json.loads(r.ai_signals) if r.ai_signals else [],
                ai_resources=json.loads(r.ai_resources) if r.ai_resources else [],
            ))
        
        return {
            "id": execution.id,
            "runbook_id": execution.runbook_id,
            "runbook_name": runbook.name if runbook else "Unknown",
            "status": execution.status,
            "started_at": execution.started_at,
            "completed_at": execution.completed_at,
            "triggered_by": execution.triggered_by,
            "results": results,
        }


# --- SCHEDULING ENDPOINTS ---

@app.post("/runbooks/{runbook_id}/schedule")
def schedule_runbook_endpoint(runbook_id: int, schedule: ScheduleRequest):
    """Schedule a runbook"""
    with get_sync_session() as session:
        runbook = RunbookCRUD.get_by_id(session, runbook_id)
        if not runbook:
            raise HTTPException(status_code=404, detail="Runbook not found")
        
        try:
            job_id = schedule_runbook(
                runbook_id,
                schedule.schedule_type.value,
                cron_expression=schedule.cron_expression,
                run_at=schedule.run_at,
            )
            
            # Update runbook
            RunbookCRUD.update(session, runbook_id, {
                "is_scheduled": True,
                "schedule_type": schedule.schedule_type,
                "cron_expression": schedule.cron_expression,
            })
            
            return {"status": "scheduled", "job_id": job_id}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))


@app.delete("/runbooks/{runbook_id}/schedule")
def unschedule_runbook_endpoint(runbook_id: int):
    """Unschedule a runbook"""
    with get_sync_session() as session:
        success = unschedule_runbook(runbook_id)
        
        # Update runbook
        RunbookCRUD.update(session, runbook_id, {
            "is_scheduled": False,
            "schedule_type": None,
            "cron_expression": None,
        })
        
        return {"status": "unscheduled" if success else "not_scheduled"}


@app.get("/schedules")
def list_schedules():
    """Get all scheduled jobs"""
    return get_scheduled_jobs()


# --- HEALTH CHECK ---

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "2.0.0"}


# --- SERVER STARTUP ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")