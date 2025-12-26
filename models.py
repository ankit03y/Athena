"""
Athena Agent - Database Models
SQLModel definitions for all entities
"""
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime
from enum import Enum


# --- ENUMS ---
class AuthType(str, Enum):
    PASSWORD = "password"
    PRIVATE_KEY = "private_key"


class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"  # Some servers succeeded, some failed


class ScheduleType(str, Enum):
    ONCE = "once"
    CRON = "cron"


# --- LINK TABLE ---
class RunbookServerLink(SQLModel, table=True):
    """Many-to-many link between Runbooks and Servers"""
    __tablename__ = "runbook_server_link"
    
    runbook_id: Optional[int] = Field(default=None, foreign_key="runbook.id", primary_key=True)
    server_id: Optional[int] = Field(default=None, foreign_key="server.id", primary_key=True)


# --- SERVER ---
class ServerBase(SQLModel):
    """Base server fields"""
    hostname: str = Field(index=True)
    username: str
    auth_type: AuthType = AuthType.PASSWORD
    port: int = 22
    node_name: Optional[str] = None  # Friendly name for the server


class Server(ServerBase, table=True):
    """Server entity - stores SSH connection details"""
    __tablename__ = "server"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Encrypted credential (password or private key)
    encrypted_credential: str
    
    # Relationships
    runbooks: List["Runbook"] = Relationship(back_populates="servers", link_model=RunbookServerLink)
    commands: List["Command"] = Relationship(back_populates="server")
    execution_results: List["ExecutionResult"] = Relationship(back_populates="server")


class ServerCreate(ServerBase):
    """Server creation schema"""
    credential: str  # Plain text - will be encrypted before storage


class ServerRead(ServerBase):
    """Server read schema - never exposes credentials"""
    id: int
    created_at: datetime


# --- COMMAND ---
class CommandBase(SQLModel):
    """Base command fields"""
    script: str  # The actual command(s) to run
    description: Optional[str] = None  # AI hint: what to extract from output
    is_universal: bool = True  # If True, runs on all servers


class Command(CommandBase, table=True):
    """Command entity"""
    __tablename__ = "command"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    runbook_id: int = Field(foreign_key="runbook.id")
    server_id: Optional[int] = Field(default=None, foreign_key="server.id")  # Only if not universal
    order: int = 0  # Execution order within runbook
    
    # Relationships
    runbook: "Runbook" = Relationship(back_populates="commands")
    server: Optional[Server] = Relationship(back_populates="commands")


class CommandCreate(CommandBase):
    """Command creation schema"""
    server_id: Optional[int] = None
    order: int = 0


# --- RUNBOOK ---
class RunbookBase(SQLModel):
    """Base runbook fields"""
    name: str = Field(index=True)
    description: Optional[str] = None


class Runbook(RunbookBase, table=True):
    """Runbook entity - the main automation workflow"""
    __tablename__ = "runbook"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Schedule fields
    is_scheduled: bool = False
    schedule_type: Optional[ScheduleType] = None
    cron_expression: Optional[str] = None  # e.g., "0 0 * * 0" for weekly
    next_run_at: Optional[datetime] = None
    
    # Relationships
    servers: List[Server] = Relationship(back_populates="runbooks", link_model=RunbookServerLink)
    commands: List[Command] = Relationship(back_populates="runbook")
    executions: List["Execution"] = Relationship(back_populates="runbook")


class RunbookCreate(RunbookBase):
    """Runbook creation schema"""
    pass


class RunbookRead(RunbookBase):
    """Runbook read schema"""
    id: int
    created_at: datetime
    is_scheduled: bool
    next_run_at: Optional[datetime]


# --- EXECUTION ---
class Execution(SQLModel, table=True):
    """Execution run - tracks a single execution of a runbook"""
    __tablename__ = "execution"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    runbook_id: int = Field(foreign_key="runbook.id")
    
    status: ExecutionStatus = ExecutionStatus.PENDING
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    triggered_by: str = "manual"  # "manual" or "scheduler"
    
    # Relationships
    runbook: Runbook = Relationship(back_populates="executions")
    results: List["ExecutionResult"] = Relationship(back_populates="execution")


class ExecutionRead(SQLModel):
    """Execution read schema"""
    id: int
    runbook_id: int
    runbook_name: Optional[str] = None
    status: ExecutionStatus
    started_at: datetime
    completed_at: Optional[datetime]
    triggered_by: str


# --- EXECUTION RESULT ---
class ExecutionResult(SQLModel, table=True):
    """Per-server execution result"""
    __tablename__ = "execution_result"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    execution_id: int = Field(foreign_key="execution.id")
    server_id: Optional[int] = Field(default=None, foreign_key="server.id")  # Nullable to allow server deletion
    command_id: Optional[int] = Field(default=None, foreign_key="command.id")
    hostname: str = ""  # Store hostname directly so it persists after server deletion
    
    # Results
    status: ExecutionStatus = ExecutionStatus.PENDING
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    exit_code: Optional[int] = None
    
    # AI Analysis
    ai_summary: Optional[str] = None
    ai_signals: Optional[str] = None  # JSON string of signals
    ai_resources: Optional[str] = None  # JSON string of resource analysis
    
    executed_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    execution: Execution = Relationship(back_populates="results")
    server: Optional[Server] = Relationship(back_populates="execution_results")


class ExecutionResultRead(SQLModel):
    """Execution result read schema"""
    id: int
    server_hostname: str
    status: ExecutionStatus
    stdout: Optional[str]
    stderr: Optional[str]
    exit_code: Optional[int]
    ai_summary: Optional[str]
