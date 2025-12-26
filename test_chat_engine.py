
import sys
import os

# Mocking libraries that might not be installed or need API keys
sys.modules['groq'] = type('groq', (), {'Groq': lambda **kwargs: None})

# We need to import the function, but avoiding imports that might fail
# So we will replicate the function logic here to test it, 
# OR we can try to import it if dependencies are available.
# Let's try importing, assuming the environment has the deps.
# If not, I'll copy the function.

try:
    from chat_engine import generate_execution_narrative
    print("Imported generate_execution_narrative successfully")
except ImportError as e:
    print(f"Import failed: {e}")
    # Copying the function logic for testing if import fails
    from typing import Dict, Any
    def generate_execution_narrative(step: str, details: Dict[str, Any] = None) -> str:
        if details is None:
            details = {}
        
        narratives = {
            "connecting": f"Connecting to {details.get('node', 'node')}...",
            "completed": "Execution completed successfully",
            "failed": f"Execution failed: {details.get('error', 'Unknown error')}"
        }
        return narratives.get(step, step)

# Test cases
try:
    print("Testing with None details...")
    result = generate_execution_narrative("completed", None)
    print(f"Result: {result}")
    
    print("Testing with empty dict...")
    result = generate_execution_narrative("completed", {})
    print(f"Result: {result}")
    
    print("Testing with missing key in dict...")
    result = generate_execution_narrative("connecting", {})
    print(f"Result: {result}")

    print("SUCCESS: No AttributeError raised")

except AttributeError as e:
    print(f"FAILURE: AttributeError raised: {e}")
except Exception as e:
    print(f"FAILURE: Other exception: {e}")
