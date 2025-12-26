import asyncio
import asyncssh
import sys
import os
from sqlmodel import select, Session
from database import sync_engine
from chat_models import KnownNode
from crypto import decrypt_credential

# Ensure proper Windows asyncio support if needed
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def test_single_host(host, username, key_content, name):
    print(f"\n{'='*60}")
    print(f"Testing Connection to {name} ({host})")
    print(f"{'='*60}")
    
    try:
        # Import the private key from the string content
        priv_key = asyncssh.import_private_key(key_content)
        
        print(f"[*] Key loaded successfully. Type: {priv_key.get_algorithm()}")
        print(f"[*] Attempting SSH connection as '{username}'...")
        
        async with asyncssh.connect(
            host,
            username=username,
            client_keys=[priv_key],
            known_hosts=None, # Skip host key verification for debugging
            connect_timeout=10,
            login_timeout=10
        ) as conn:
            print("✅ CONNECTION SUCCESSFUL!")
            
            # Run a simple command
            print("[*] Running 'hostname'...")
            result = await conn.run("hostname")
            print(f"    > {result.stdout.strip()}")
            
            print("[*] Running 'uptime'...")
            result = await conn.run("uptime")
            print(f"    > {result.stdout.strip()}")
            
            return True
            
    except asyncssh.PermissionDenied as e:
        print(f"❌ AUTHENTICATION FAILED: {e}")
        print("    -> The key was rejected. Double check if the public key is in ~/.ssh/authorized_keys on the remote server.")
    except asyncssh.ConnectionLost as e:
        print(f"❌ CONNECTION LOST: {e}")
    except OSError as e:
        print(f"❌ NETWORK ERROR: {e}")
        print("    -> Host might be unreachable or port 22 is blocked.")
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
    
    return False

async def main():
    print("Fetching 'agent-vm' credentials from database...")
    
    with Session(sync_engine) as session:
        node = session.exec(select(KnownNode).where(KnownNode.name == "agent-vm")).first()
        
        if not node:
            print("❌ Error: 'agent-vm' not found in database known_node table.")
            return

        print(f"Found node: {node.name} ({node.hostname})")
        key_content = decrypt_credential(node.credential_encrypted)

        # Run user requested commands on agent-vm
        commands = "df -h; free -h; systemctl --failed; journalctl -b -p 3; netstat -tulpn"
        print(f"\nRunning requested commands on {node.name}...")
        
        # We need to run this function again with new commands logic or just use conn.run inside test_single_host
        # Let's just redefine test_single_host locally or modify it. 
        # For simplicity, I will call a new function here or modify test_single_host above to take commands.
        pass

    # Re-run logic with custom commands
    async def run_commands(host, username, key, cmd):
        try:
            priv_key = asyncssh.import_private_key(key)
            async with asyncssh.connect(host, username=username, client_keys=[priv_key], known_hosts=None) as conn:
                print(f"✅ Connected to {host}")
                print(f"[*] Executing: {cmd}")
                result = await conn.run(cmd)
                print("\n--- OUTPUT START ---")
                print(result.stdout)
                print(result.stderr)
                print("--- OUTPUT END ---\n")
                return True
        except Exception as e:
            print(f"❌ Failed to connect to {host}: {e}")
            return False

    # Run on agent-vm
    await run_commands(node.hostname, node.username, key_content, commands)

    # Add Primary node if not exists
    with Session(sync_engine) as session:
        primary = session.exec(select(KnownNode).where(KnownNode.name == "Primary")).first()
        if not primary:
            print("Adding 'Primary' (192.168.2.6) to database...")
            new_node = KnownNode(
                name="Primary",
                hostname="192.168.2.6",
                username="ubuntu",
                credential_encrypted=node.credential_encrypted # Sharing key
            )
            session.add(new_node)
            session.commit()
            print("✅ Primary node added.")
        else:
            print("Primary node already exists.")
            
    # Try running on Primary just in case (we know it fails, but for completeness)
    await run_commands("192.168.2.6", "ubuntu", key_content, commands)

if __name__ == "__main__":
    asyncio.run(main())
