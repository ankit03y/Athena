import os
import json
from groq import Groq
from pydantic import BaseModel, Field
from typing import List, Literal


# --- 1. THE UNIVERSAL SCHEMA ---
# Instead of "DiskSignal", we define a generic "ResourceStatus"
# that can apply to a Disk, a Docker Container, a Service, etc.

class ResourceSignal(BaseModel):
    resource_name: str = Field(...,
                               description="The name of the item (e.g., '/dev/sda1', 'container_id', 'service_name')")
    status: Literal["OK", "WARNING", "CRITICAL", "UNKNOWN"] = Field(..., description="The inferred health status")
    metric_value: str = Field(..., description="Key metric if available (e.g., '85%', 'Up 2 hours', '500ms')")
    reasoning: str = Field(..., description="Why did you assign this status?")


class AgentResponse(BaseModel):
    summary: str = Field(..., description="A one-line summary of the command output")
    signals: List[ResourceSignal]


# --- 2. THE AI PARSER ---

class AIEngine:
    def __init__(self, api_key):
        self.client = Groq(api_key=api_key)

    def parse_command_output(self, command: str, raw_output: str) -> AgentResponse:
        """
        Takes ANY command output and converts it into structured signals.
        """

        # We enforce structure using JSON mode
        prompt = f"""
        You are an Infrastructure Reliability Agent.

        COMMAND RUN: {command}

        RAW OUTPUT:
        {raw_output}

        TASK:
        1. Parse the output above.
        2. Extract every distinct resource (disk, container, service, etc.).
        3. Assign a status (OK, WARNING, CRITICAL) based on industry standard thresholds (e.g., disk > 90% is CRITICAL).
        4. Return the result strictly as JSON.
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a helpful JSON parser."},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.3-70b-versatile",  # Updated model (replaces deprecated llama3-70b-8192)
                response_format={"type": "json_object"},
                temperature=0
            )

            # Parse the raw string into our Pydantic model for validation
            result_json = chat_completion.choices[0].message.content
            # We wrap it in a structure that matches our Pydantic model
            # Note: The prompt usually returns the keys, but for robustness we parse manually
            # or rely on the LLM adhering to the schema request.
            # For simplicity in this step, we assume the LLM follows instructions well.

            return json.loads(result_json)

        except Exception as e:
            return {"summary": "AI Parsing Failed", "signals": [], "error": str(e)}