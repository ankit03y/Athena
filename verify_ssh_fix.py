import requests
import json
import time

BASE_URL = "http://localhost:8000/chat"

def verify_ssh_fix():
    # 1. New Session
    print("1. Creating Session...")
    res = requests.post(f"{BASE_URL}/sessions", json={"title": "SSH Verification Session"})
    if res.status_code != 200:
        print("FAILED: Session creation")
        print(res.text)
        return
    session_id = res.json()["id"]
    print(f"   Session ID: {session_id}")

    # 2. Send Message (targeting 192.168.2.5 explicitly)
    # Assuming 192.168.2.5 is the host user complained about
    # We will simulate a rule that uses it.
    print("\n2. Sending Message...")
    # NOTE: We can't easily mock the ACTUAL SSH connection if the host is down or unreachable from this environment
    # BUT we can check if the API tries to use the key.
    # However, for this verification, I'll use "localhost" or a dummy IP, but the logic change was generic.
    # Let's try to target "localhost" which should be up, and see if it tries to connect using local keys.
    # If the user's "192.168.2.5" is reachable, that's better.
    
    # I will stick to what the user said: "Check 192.168.2.5"
    msg = "Check 192.168.2.5"
    res = requests.post(f"{BASE_URL}/message", json={"message": msg, "session_id": session_id})
    data = res.json()
    
    if data["type"] != "rule":
        print("   FAILED: Expected rule.")
        print(data)
        return

    rule_id = data["rule_id"]
    print(f"   Rule ID: {rule_id}")
    
    # 3. Execute
    print("\n3. Triggering Execution...")
    res = requests.post(f"{BASE_URL}/execute/{rule_id}")
    execution_id = res.json()["execution_id"]
    print(f"   Execution ID: {execution_id}")

    # 4. Stream (Wait for error or connecting)
    print("\n4. Streaming Events...")
    url = f"{BASE_URL}/execute/{execution_id}/stream"
    headers = {'Accept': 'text/event-stream'}
    
    response = requests.get(url, stream=True, headers=headers)
    
    for event in response.iter_lines():
        if event:
            decoded = event.decode('utf-8')
            if decoded.startswith("data: "):
                payload = json.loads(decoded[6:])
                print(f"   [EVENT] {payload.get('type')} - {payload.get('message')}")
                # We expect "Connecting..." then maybe "Connected" or "Error"
                # If we see "Permission denied", it might still fail if the key is wrong for that host,
                # but we want to confirm it doesn't fail with "No credentials" immediately if that was the issue.
                # Actually, the user's error WAS "Permission denied", meaning it tried SOMETHING.
                # But my fix tries MORE keys.
                
                if payload.get("type") in ["complete", "error"]:
                    break

if __name__ == "__main__":
    verify_ssh_fix()
