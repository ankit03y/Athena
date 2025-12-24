import asyncio
import asyncssh
import sys

async def test_connection():
    HOST = "192.168.64.2"
    USER = "ubuntu"
    KEY = "/Users/ankityadav/.ssh/agent_vm_key"
    
    print(f"Testing SSH connection to {USER}@{HOST}")
    print(f"Using key: {KEY}")
    print(f"Known hosts: None (skipping verification)")
    print("-" * 50)
    
    try:
        print("Attempting connection...")
        async with asyncssh.connect(
            HOST,
            username=USER,
            client_keys=[KEY],
            known_hosts=None,
            connect_timeout=10,
            login_timeout=10
        ) as conn:
            print("✅ Connection successful!")
            
            result = await conn.run("whoami")
            print(f"\nTest command 'whoami' output:")
            print(result.stdout)
            
            result = await conn.run("df -h")
            print(f"\nTest command 'df -h' output:")
            print(result.stdout)
            
    except asyncssh.DisconnectError as e:
        print(f"❌ Disconnect Error: {e}")
    except asyncssh.PermissionDenied as e:
        print(f"❌ Permission Denied: {e}")
    except asyncssh.ConnectionLost as e:
        print(f"❌ Connection Lost: {e}")
    except TimeoutError as e:
        print(f"❌ Timeout: {e}")
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(test_connection())
