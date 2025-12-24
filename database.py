"""
Athena Agent - Database Connection
PostgreSQL with async support, fallback to SQLite for development
"""
import os
from typing import AsyncGenerator, Optional, List
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///athena.db")

# Determine if using PostgreSQL or SQLite
IS_POSTGRES = DATABASE_URL.startswith("postgresql")

if IS_POSTGRES:
    # Async PostgreSQL
    ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    
    async_engine = create_async_engine(
        ASYNC_DATABASE_URL,
        echo=False,
        pool_size=5,
        max_overflow=10,
    )
    
    # Sync engine for migrations
    sync_engine = create_engine(DATABASE_URL, echo=False)
    
    AsyncSessionLocal = sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
else:
    # SQLite fallback for development
    sync_engine = create_engine(
        DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False}
    )
    async_engine = None
    AsyncSessionLocal = None


def create_db_and_tables():
    """Create all tables - call on startup"""
    from models import (
        Runbook, Server, Command, Execution, 
        ExecutionResult, RunbookServerLink
    )
    SQLModel.metadata.create_all(sync_engine)
    print("📂 Database tables created!")


def get_sync_session() -> Session:
    """Get synchronous session for simple operations"""
    return Session(sync_engine)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async session for API endpoints"""
    if AsyncSessionLocal is None:
        # Fallback for SQLite
        with Session(sync_engine) as session:
            yield session
    else:
        async with AsyncSessionLocal() as session:
            yield session


# --- CRUD Operations ---

from models import (
    Runbook, RunbookCreate, Server, ServerCreate, 
    Command, CommandCreate, Execution, ExecutionResult,
    RunbookServerLink, ExecutionStatus
)
from crypto import encrypt_credential, decrypt_credential
from sqlmodel import select
from datetime import datetime


class RunbookCRUD:
    """Runbook CRUD operations"""
    
    @staticmethod
    def create(session: Session, runbook: RunbookCreate) -> Runbook:
        db_runbook = Runbook.model_validate(runbook)
        session.add(db_runbook)
        session.commit()
        session.refresh(db_runbook)
        return db_runbook
    
    @staticmethod
    def get_all(session: Session) -> List[Runbook]:
        statement = select(Runbook).order_by(Runbook.updated_at.desc())
        return session.exec(statement).all()
    
    @staticmethod
    def get_by_id(session: Session, runbook_id: int) -> Optional[Runbook]:
        return session.get(Runbook, runbook_id)
    
    @staticmethod
    def update(session: Session, runbook_id: int, updates: dict) -> Optional[Runbook]:
        runbook = session.get(Runbook, runbook_id)
        if runbook:
            for key, value in updates.items():
                setattr(runbook, key, value)
            runbook.updated_at = datetime.utcnow()
            session.add(runbook)
            session.commit()
            session.refresh(runbook)
        return runbook
    
    @staticmethod
    def delete(session: Session, runbook_id: int) -> bool:
        runbook = session.get(Runbook, runbook_id)
        if runbook:
            session.delete(runbook)
            session.commit()
            return True
        return False


class ServerCRUD:
    """Server CRUD operations with credential encryption"""
    
    @staticmethod
    def create(session: Session, server: ServerCreate, runbook_id: int = None) -> Server:
        # Encrypt the credential before storing
        encrypted = encrypt_credential(server.credential)
        
        db_server = Server(
            hostname=server.hostname,
            username=server.username,
            auth_type=server.auth_type,
            port=server.port,
            encrypted_credential=encrypted,
        )
        session.add(db_server)
        session.commit()
        session.refresh(db_server)
        
        # Link to runbook if provided
        if runbook_id:
            link = RunbookServerLink(runbook_id=runbook_id, server_id=db_server.id)
            session.add(link)
            session.commit()
        
        return db_server
    
    @staticmethod
    def get_by_id(session: Session, server_id: int) -> Optional[Server]:
        return session.get(Server, server_id)
    
    @staticmethod
    def get_decrypted_credential(server: Server) -> str:
        """Get decrypted credential for SSH connection"""
        return decrypt_credential(server.encrypted_credential)
    
    @staticmethod
    def get_servers_for_runbook(session: Session, runbook_id: int) -> List[Server]:
        statement = (
            select(Server)
            .join(RunbookServerLink)
            .where(RunbookServerLink.runbook_id == runbook_id)
        )
        return session.exec(statement).all()
    
    @staticmethod
    def delete(session: Session, server_id: int) -> bool:
        server = session.get(Server, server_id)
        if server:
            session.delete(server)
            session.commit()
            return True
        return False


class CommandCRUD:
    """Command CRUD operations"""
    
    @staticmethod
    def create(session: Session, runbook_id: int, command: CommandCreate) -> Command:
        db_command = Command(
            runbook_id=runbook_id,
            script=command.script,
            is_universal=command.is_universal,
            server_id=command.server_id,
            order=command.order,
        )
        session.add(db_command)
        session.commit()
        session.refresh(db_command)
        return db_command
    
    @staticmethod
    def get_for_runbook(session: Session, runbook_id: int) -> List[Command]:
        statement = (
            select(Command)
            .where(Command.runbook_id == runbook_id)
            .order_by(Command.order)
        )
        return session.exec(statement).all()
    
    @staticmethod
    def update(session: Session, command_id: int, updates: dict) -> Optional[Command]:
        command = session.get(Command, command_id)
        if command:
            for key, value in updates.items():
                setattr(command, key, value)
            session.add(command)
            session.commit()
            session.refresh(command)
        return command
    
    @staticmethod
    def delete(session: Session, command_id: int) -> bool:
        command = session.get(Command, command_id)
        if command:
            session.delete(command)
            session.commit()
            return True
        return False


class ExecutionCRUD:
    """Execution CRUD operations"""
    
    @staticmethod
    def create(session: Session, runbook_id: int, triggered_by: str = "manual") -> Execution:
        execution = Execution(
            runbook_id=runbook_id,
            triggered_by=triggered_by,
            status=ExecutionStatus.PENDING,
        )
        session.add(execution)
        session.commit()
        session.refresh(execution)
        return execution
    
    @staticmethod
    def update_status(session: Session, execution_id: int, status: ExecutionStatus) -> Execution:
        execution = session.get(Execution, execution_id)
        if execution:
            execution.status = status
            if status in [ExecutionStatus.SUCCESS, ExecutionStatus.FAILED, ExecutionStatus.PARTIAL]:
                execution.completed_at = datetime.utcnow()
            session.add(execution)
            session.commit()
            session.refresh(execution)
        return execution
    
    @staticmethod
    def get_recent(session: Session, limit: int = 20) -> List[Execution]:
        statement = (
            select(Execution)
            .order_by(Execution.started_at.desc())
            .limit(limit)
        )
        return session.exec(statement).all()
    
    @staticmethod
    def get_by_id(session: Session, execution_id: int) -> Optional[Execution]:
        return session.get(Execution, execution_id)
    
    @staticmethod
    def add_result(
        session: Session,
        execution_id: int,
        server_id: int,
        command_id: int = None,
        status: ExecutionStatus = ExecutionStatus.PENDING,
        stdout: str = None,
        stderr: str = None,
        exit_code: int = None,
        ai_summary: str = None,
        ai_signals: str = None,
        ai_resources: str = None,
    ) -> ExecutionResult:
        result = ExecutionResult(
            execution_id=execution_id,
            server_id=server_id,
            command_id=command_id,
            status=status,
            stdout=stdout,
            stderr=stderr,
            exit_code=exit_code,
            ai_summary=ai_summary,
            ai_signals=ai_signals,
            ai_resources=ai_resources,
        )
        session.add(result)
        session.commit()
        session.refresh(result)
        return result