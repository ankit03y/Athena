"""
Chat Engine - LLM-powered rule parsing and execution narration
"""
import os
import json
import re
from typing import Optional, Dict, List, Any, Tuple
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Initialize Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are Athena, an Advanced Automation AI Agent.
Your goal is to parse "Plain English + light structure" requests into sophisticated automation rules.

## CORE RESPONSIBILITY
Convert semi-structured user input into a precise JSON Rule Object.
The user will provide lists of IPs, credentials, commands, and conditions. You must structure this for the execution engine.

## JSON SCHEMA
Respond ONLY with this JSON structure:

{
  "type": "rule",
  "rule": {
    "name": "Short descriptive name",
    "nodes": [
      {
        "name": "hostname or label",
        "hostname": "192.168.1.1 or example.com",
        "auth": {
          "type": "password" | "private_key" | "auto",
          "username": "...",
          "password": "...", 
          "key_path": "..."
        }
      }
    ],
    "commands": [
      {
        "cmd": "actual shell command",
        "logic": "plain english explanation of success/failure logic (e.g., 'fail if usage > 80%')"
      }
    ],
    "execution": "sequential" | "parallel",
    "aggregation": "merge" | "individual",
    "report": {
        "formats": ["json", "csv", "excel"],
        "email_to": ["email@example.com"]
    },
    "schedule": "human readable schedule string"
  }
}

## PARSING RULES
1. **Nodes**: Extract every IP/Hostname. If credentials are provided inline (e.g., "user:pass"), parse them into the `auth` object. If not provided, assume `auth: {"type": "auto"}`.
2. **Commands**: For each command line, extract the exact shell command and the logic/condition meant for it. 
   - Example: "df -h (alert > 80%)" -> cmd: "df -h", logic: "alert if filesystem usage > 80%"
3. **Execution Mode**: If user asks to run "at once" or "concurrently", set `execution: "parallel"`. Default is `sequential`.
4. **Report**: Extract email addresses and requested formats (Excel, CSV).

## EXAMPLE INPUT
"Check 10.0.0.1 (user: root) and 10.0.0.2. Run uptime and free -m. Send csv to admin@corp.com"

## EXAMPLE OUTPUT
{
  "type": "rule",
  "rule": {
    "name": "Uptime & Memory Check",
    "nodes": [
      {"name": "10.0.0.1", "hostname": "10.0.0.1", "auth": {"type": "password", "username": "root"}},
      {"name": "10.0.0.2", "hostname": "10.0.0.2", "auth": {"type": "auto"}}
    ],
    "commands": [
      {"cmd": "uptime", "logic": "report output"},
      {"cmd": "free -m", "logic": "report output"}
    ],
    "execution": "sequential",
    "aggregation": "merge",
    "report": {
      "formats": ["csv"],
      "email_to": ["admin@corp.com"]
    }
  }
}
"""


def parse_user_intent(message: str, known_nodes: List[str] = None) -> Dict[str, Any]:
    """
    Parse user's natural language into a structured automation rule.
    Returns the parsed rule or a clarification request.
    """
    context = ""
    if known_nodes:
        context = f"\n\nKnown nodes in the system: {', '.join(known_nodes)}"
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT + context},
                {"role": "user", "content": message}
            ],
            temperature=0.3,
            max_tokens=1000
        )
        
        content = response.choices[0].message.content.strip()
        
        # Clean up potential markdown formatting
        if content.startswith("```"):
            content = re.sub(r'^```json?\s*', '', content)
            content = re.sub(r'\s*```$', '', content)
        
        return json.loads(content)
        
    except json.JSONDecodeError as e:
        return {
            "type": "chat",
            "message": "I understood your request but had trouble formatting it. Could you rephrase?"
        }
    except Exception as e:
        return {
            "type": "chat", 
            "message": f"I encountered an issue: {str(e)}. Please try again."
        }


def generate_execution_narrative(step: str, details: Dict[str, Any] = None) -> str:
    """
    Generate human-readable, confident execution timeline messages.
    """
    if details is None:
        details = {}
    
    # Ensure details is a dict
    if not isinstance(details, dict):
        details = {}

    node_name = details.get('node', 'node')
    command = details.get('command', '...')
    value = details.get('value', 'N/A')
    condition = details.get('condition', '')
    message = details.get('message', '')
    error = details.get('error', 'Unknown error')
    
    narratives = {
        "connecting": f"Connecting to {node_name}...",
        "connected": f"SSH connection established to {node_name}",
        "executing": f"Running command: {command}",
        "output_received": "Output received successfully",
        "analyzing": "Analyzing output...",
        "value_extracted": f"Extracted value: {value}",
        "condition_checking": f"Checking condition: {condition}",
        "condition_met": f"⚠️ Condition met: {message or 'threshold exceeded'}",
        "condition_not_met": f"✓ All clear: {message or 'within normal range'}",
        "incident_raised": f"🚨 Incident raised: {message}",
        "completed": "Execution completed successfully",
        "failed": f"Execution failed: {error}"
    }
    
    return narratives.get(step, step)


def resolve_node(node_name: str, known_nodes: Dict[str, Dict]) -> Tuple[bool, Optional[Dict]]:
    """
    Try to resolve a node name to its connection details.
    Returns (resolved: bool, node_config: dict or None)
    """
    # Check if it's a known node
    if node_name in known_nodes:
        return True, known_nodes[node_name]
    
    # Check if node name contains IP pattern
    ip_pattern = r'\((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\)'
    match = re.search(ip_pattern, node_name)
    if match:
        ip = match.group(1)
        clean_name = re.sub(ip_pattern, '', node_name).strip()
        return True, {
            "name": clean_name or node_name,
            "hostname": ip,
            "username": "ubuntu",  # Default
            "port": 22
        }
    
    # Try direct IP
    if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', node_name):
        return True, {
            "name": node_name,
            "hostname": node_name,
            "username": "ubuntu",
            "port": 22
        }
    
    # Can't resolve - needs clarification
    return False, None


def generate_rule_card_text(rule: Dict) -> str:
    """
    Generate the human-readable rule card text for display.
    """
    # Format Nodes
    nodes = rule.get('nodes', [])
    if not nodes:
        nodes_str = "(no nodes specified)"
    else:
        node_items = []
        for n in nodes:
            if isinstance(n, str):
                node_items.append(n)
            else:
                name = n.get('name') or n.get('hostname') or '?'
                auth = n.get('auth', {}).get('username')
                if auth:
                    node_items.append(f"{name} ({auth})")
                else:
                    node_items.append(name)
        nodes_str = ', '.join(node_items)

    # Format Commands
    commands = rule.get('commands', [])
    if not commands:
        # Fallback to legacy command
        cmd_str = rule.get('command', '(auto-detect)')
    else:
        cmd_items = []
        for c in commands:
            cmd = c.get('cmd', 'unknown')
            logic = c.get('logic')
            if logic:
                cmd_items.append(f"• {cmd}  [Logic: {logic}]")
            else:
                cmd_items.append(f"• {cmd}")
        cmd_str = '\n   '.join(cmd_items)
    
    card = f"""🧩 Rule Created: {rule.get('name', 'Unnamed Rule')}

📍 Nodes:
   • {nodes_str}

💻 Commands:
   {cmd_str}

⚖️ Execution Mode:
   • {rule.get('execution', 'sequential').title()}

⚡ Action:
   • {rule.get('action', 'Report only').replace('_', ' ').title()}
"""
    return card


def analyze_output_with_llm(output: str, extraction_hint: str, condition: str) -> Dict[str, Any]:
    """
    Use LLM to analyze command output and check conditions.
    """
    prompt = f"""Analyze this command output and extract the relevant metric.

Output:
{output}

Extraction hint: {extraction_hint}
Condition to check: {condition}

Respond in JSON:
{{
  "extracted_value": "the value found",
  "condition_met": true/false,
  "summary": "one line human readable summary",
  "severity": "info" | "warning" | "critical"
}}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You analyze command outputs. Respond only with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=500
        )
        
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = re.sub(r'^```json?\s*', '', content)
            content = re.sub(r'\s*```$', '', content)
            
        return json.loads(content)
        
    except Exception as e:
        return {
            "extracted_value": "unknown",
            "condition_met": False,
            "summary": f"Could not analyze: {str(e)}",
            "severity": "info"
        }
