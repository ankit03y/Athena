import asyncio
import json
import os
import sys
from dotenv import load_dotenv

from executor import SSHExecutor
from ai_engine import AIEngine

# Load environment variables from .env file
load_dotenv()

# Configuration: Choose which API provider to use
# Options: "groq" or "openrouter"
API_PROVIDER = "groq"  # Change this to "openrouter" if you want to use OpenRouter instead


async def run_pipeline():
    # 1. SETUP
    HOST = "192.168.2.5"  # Your VM
    USER = "ubuntu"
    KEY = "/Users/ankityadav/.ssh/agent_vm_key"

    # Initialize executor with known_hosts=None to skip host key verification
    executor = SSHExecutor(HOST, USER, KEY, known_hosts=None)
    
    # Get API key based on selected provider
    if API_PROVIDER == "groq":
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in .env file!")
        print(f"🔑 Using Groq API")
    elif API_PROVIDER == "openrouter":
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not found in .env file!")
        print(f"🔑 Using OpenRouter API")
    else:
        raise ValueError(f"Invalid API_PROVIDER: {API_PROVIDER}. Use 'groq' or 'openrouter'")
    
    ai = AIEngine(api_key)

    # --- SCENARIO 1: Disk Space (The Classic) ---
    print("\n💿 TEST 1: Running 'df -h'...")
    res1 = await executor.run_command("df -h")

    if res1['status'] == 'SUCCESS':
        print("🤖 AI is thinking...")
        analysis1 = ai.parse_command_output("df -h", res1['stdout'])
        print(json.dumps(analysis1, indent=2))

    # --- SCENARIO 2: Something totally different (Process List) ---
    # Let's run 'uptime' or 'free -m' or even 'ps aux | head -5'
    cmd2 = "free -m"
    print(f"\n🧠 TEST 2: Running '{cmd2}' (No code changes needed!)...")
    res2 = await executor.run_command(cmd2)

    if res2['status'] == 'SUCCESS':
        print("🤖 AI is thinking...")
        analysis2 = ai.parse_command_output(cmd2, res2['stdout'])
        print(json.dumps(analysis2, indent=2))


if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_pipeline())