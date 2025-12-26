"""
Chat-first automation rules and incidents models
"""
from datetime import datetime
from typing import Optional, List
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship


class IncidentSeverity(str, Enum):
    """Incident severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class RuleStatus(str, Enum):
    """Rule execution status"""
    CREATED = "created"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"


# --- CHAT SESSION ---
class ChatSession(SQLModel, table=True):
    """A chat thread/context for a single automation goal"""
    __tablename__ = "chat_session"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = "New Session"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    messages: List["ChatMessage"] = Relationship(back_populates="session")
    rules: List["AutomationRule"] = Relationship(back_populates="session")


# --- CHAT MESSAGE ---
class ChatMessage(SQLModel, table=True):
    """Persistent chat history"""
    __tablename__ = "chat_message"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: Optional[int] = Field(default=None, foreign_key="chat_session.id")
    role: str  # "user" or "assistant"
    content: str
    rule_id: Optional[int] = Field(default=None, foreign_key="automation_rule.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    session: Optional[ChatSession] = Relationship(back_populates="messages")


# --- AUTOMATION RULE ---
class AutomationRule(SQLModel, table=True):
    """User-created automation rule from natural language"""
    __tablename__ = "automation_rule"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    
    # Parsed from user intent
    session_id: Optional[int] = Field(default=None, foreign_key="chat_session.id")
    nodes_json: str = "[]"  # JSON list of node configs
    
    # Advanced: List of commands with logic
    commands_json: str = "[]"
    
    # Legacy fields (kept for compatibility or simple rules)
    command: Optional[str] = None 
    extraction_hint: Optional[str] = None
    condition: Optional[str] = None
    action: Optional[str] = None
    
    # Execution & Reporting
    execution_mode: str = "sequential"  # "sequential" | "parallel"
    report_config_json: Optional[str] = None # JSON config for reports
    
    # Scheduling
    schedule_cron: Optional[str] = None  # e.g., "*/30 * * * *"
    schedule_human: Optional[str] = None  # e.g., "Every 30 minutes"
    
    # Status
    status: RuleStatus = RuleStatus.CREATED
    last_executed_at: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    session: Optional[ChatSession] = Relationship(back_populates="rules")
    executions: List["RuleExecution"] = Relationship(back_populates="rule")
    incidents: List["Incident"] = Relationship(back_populates="rule")


# --- RULE EXECUTION ---
class RuleExecution(SQLModel, table=True):
    """Execution instance of a rule"""
    __tablename__ = "rule_execution"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    rule_id: int = Field(foreign_key="automation_rule.id")
    
    status: RuleStatus = RuleStatus.EXECUTING
    
    # Timeline events stored as JSON
    timeline_json: str = "[]"
    
    # Results
    raw_output: Optional[str] = None
    parsed_value: Optional[str] = None
    condition_met: Optional[bool] = None
    
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    # Relationships
    rule: AutomationRule = Relationship(back_populates="executions")


# --- INCIDENT ---
class Incident(SQLModel, table=True):
    """Raised when condition is met"""
    __tablename__ = "incident"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    rule_id: int = Field(foreign_key="automation_rule.id")
    execution_id: Optional[int] = None
    
    severity: IncidentSeverity = IncidentSeverity.WARNING
    node: str
    message: str
    metric_value: Optional[str] = None
    threshold: Optional[str] = None
    
    acknowledged: bool = False
    resolved: bool = False
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    
    # Relationships
    rule: AutomationRule = Relationship(back_populates="incidents")


# --- KNOWN NODE (for auto-resolution) ---
class KnownNode(SQLModel, table=True):
    """Store nodes for auto-resolution"""
    __tablename__ = "known_node"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)  # e.g., "db-server"
    hostname: str  # IP or hostname
    username: str = "ubuntu"
    port: int = 22
    auth_type: str = "private_key"  # or "password"
    credential_encrypted: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
