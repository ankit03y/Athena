"""
Athena Agent - SSH Executor
Async SSH execution with password and key-based authentication
"""
import asyncio
import asyncssh
from typing import Optional
from models import Server, AuthType
from database import ServerCRUD


class SSHExecutor:
    """SSH executor with support for password and key authentication"""
    
    def __init__(self, server: Server):
        self.server = server
        self.hostname = server.hostname
        self.username = server.username
        self.port = server.port
        self.auth_type = server.auth_type
    
    async def connect(self) -> asyncssh.SSHClientConnection:
        """Establish SSH connection"""
        credential = ServerCRUD.get_decrypted_credential(self.server)
        
        connect_options = {
            "host": self.hostname,
            "port": self.port,
            "username": self.username,
            "known_hosts": None,  # Disable host key checking for now
        }
        
        if self.auth_type == AuthType.PASSWORD:
            connect_options["password"] = credential
        elif self.auth_type == AuthType.PRIVATE_KEY:
            # credential is the private key content
            connect_options["client_keys"] = [asyncssh.import_private_key(credential)]
        
        return await asyncssh.connect(**connect_options)
    
    async def run_command(self, command: str, timeout: int = 300) -> dict:
        """
        Execute a command on the remote server
        
        Args:
            command: The command to execute
            timeout: Timeout in seconds (default 5 minutes)
            
        Returns:
            dict with status, stdout, stderr, exit_code
        """
        try:
            async with await self.connect() as conn:
                result = await asyncio.wait_for(
                    conn.run(command, check=False),
                    timeout=timeout
                )
                
                return {
                    "status": "SUCCESS" if result.exit_status == 0 else "FAILED",
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "exit_code": result.exit_status,
                }
                
        except asyncio.TimeoutError:
            return {
                "status": "FAILED",
                "stdout": "",
                "stderr": f"Command timed out after {timeout} seconds",
                "exit_code": -1,
            }
        except asyncssh.Error as e:
            return {
                "status": "FAILED",
                "stdout": "",
                "stderr": f"SSH error: {str(e)}",
                "exit_code": -1,
            }
        except Exception as e:
            return {
                "status": "FAILED",
                "stdout": "",
                "stderr": f"Unexpected error: {str(e)}",
                "exit_code": -1,
            }


def execute_command_on_server(
    hostname: str, 
    username: str, 
    credential: str, 
    command: str, 
    port: int = 22,
    auth_type: str = "private_key"
) -> dict:
    """
    Synchronous wrapper to execute command on a server.
    Used by chat API for simple execution.
    """
    async def _run():
        try:
            connect_options = {
                "host": hostname,
                "port": port,
                "username": username,
                "known_hosts": None,
            }
            
            if auth_type == "password":
                connect_options["password"] = credential
            else:
                connect_options["client_keys"] = [asyncssh.import_private_key(credential)]
            
            async with await asyncssh.connect(**connect_options) as conn:
                result = await asyncio.wait_for(
                    conn.run(command, check=False),
                    timeout=60
                )
                return {
                    "status": "SUCCESS" if result.exit_status == 0 else "FAILED",
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "exit_code": result.exit_status,
                }
        except Exception as e:
            return {
                "status": "FAILED",
                "stdout": "",
                "stderr": str(e),
                "exit_code": -1,
            }
    
    return asyncio.get_event_loop().run_until_complete(_run())


async def execute_on_server(server: Server, command: str) -> dict:
    """Execute a command on a single server"""
    executor = SSHExecutor(server)
    result = await executor.run_command(command)
    result["server_id"] = server.id
    result["hostname"] = server.hostname
    return result


async def execute_on_servers(servers: list[Server], command: str) -> list[dict]:
    """Execute a command on multiple servers in parallel"""
    tasks = [execute_on_server(server, command) for server in servers]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Handle any exceptions
    processed_results = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            processed_results.append({
                "server_id": servers[i].id,
                "hostname": servers[i].hostname,
                "status": "FAILED",
                "stdout": "",
                "stderr": str(result),
                "exit_code": -1,
            })
        else:
            processed_results.append(result)
    
    return processed_results


async def execute_runbook(runbook_id: int, execution_id: int):
    """
    Execute a complete runbook
    
    This is the main execution function that:
    1. Gets all servers for the runbook
    2. Gets all commands for the runbook
    3. Executes commands on servers (universal or per-server)
    4. Stores results with AI analysis
    """
    import json
    from database import (
        get_sync_session, RunbookCRUD, ServerCRUD, CommandCRUD, 
        ExecutionCRUD, ExecutionStatus
    )
    from ai_engine import AIEngine
    import os
    
    with get_sync_session() as session:
        # Update execution status
        ExecutionCRUD.update_status(session, execution_id, ExecutionStatus.RUNNING)
        
        # Get runbook data
        runbook = RunbookCRUD.get_by_id(session, runbook_id)
        if not runbook:
            ExecutionCRUD.update_status(session, execution_id, ExecutionStatus.FAILED)
            return
        
        servers = ServerCRUD.get_servers_for_runbook(session, runbook_id)
        commands = CommandCRUD.get_for_runbook(session, runbook_id)
        
        if not servers:
            print(f"⚠️ No servers configured for runbook {runbook_id}")
            ExecutionCRUD.update_status(session, execution_id, ExecutionStatus.FAILED)
            return
        
        if not commands:
            print(f"⚠️ No commands configured for runbook {runbook_id}")
            ExecutionCRUD.update_status(session, execution_id, ExecutionStatus.FAILED)
            return
        
        # Initialize AI engine
        ai = AIEngine(os.environ.get("GROQ_API_KEY"))
        
        all_success = True
        any_success = False
        
        for command in commands:
            print(f"🔄 Executing command: {command.script[:50]}...")
            
            if command.is_universal:
                # Run on all servers
                target_servers = servers
            else:
                # Run on specific server
                target_servers = [s for s in servers if s.id == command.server_id]
            
            # Execute in parallel
            results = await execute_on_servers(target_servers, command.script)
            
            # Process results
            for result in results:
                status = ExecutionStatus.SUCCESS if result["status"] == "SUCCESS" else ExecutionStatus.FAILED
                
                if status == ExecutionStatus.SUCCESS:
                    any_success = True
                else:
                    all_success = False
                
                # AI analysis for successful commands
                ai_analysis = {}
                if result["status"] == "SUCCESS" and result["stdout"]:
                    try:
                        ai_analysis = ai.parse_command_output(command.script, result["stdout"])
                    except Exception as e:
                        print(f"⚠️ AI analysis failed: {e}")
                        ai_analysis = {"summary": "AI analysis unavailable", "signals": []}
                
                # Store result
                ExecutionCRUD.add_result(
                    session,
                    execution_id=execution_id,
                    server_id=result["server_id"],
                    command_id=command.id,
                    status=status,
                    stdout=result["stdout"],
                    stderr=result["stderr"],
                    exit_code=result["exit_code"],
                    ai_summary=ai_analysis.get("summary"),
                    ai_signals=json.dumps(ai_analysis.get("signals", [])),
                    ai_resources=json.dumps(ai_analysis.get("resources", [])),
                )
        
        # Update final execution status
        if all_success:
            final_status = ExecutionStatus.SUCCESS
        elif any_success:
            final_status = ExecutionStatus.PARTIAL
        else:
            final_status = ExecutionStatus.FAILED
        
        ExecutionCRUD.update_status(session, execution_id, final_status)
        print(f"✅ Runbook {runbook_id} execution completed with status: {final_status}")