import re
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel


# --- 1. THE DICTIONARY (DSSL) ---
# This is the "Language" our Agent will speak.

class SignalLevel(str, Enum):
    OK = "OK"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"


class DiskSignal(BaseModel):
    filesystem: str
    mount_point: str
    usage_percent: float
    signal: SignalLevel
    raw_evidence: str  # We keep the original text for debugging


# --- 2. THE TRANSLATOR (Deterministic Logic) ---
# This function converts "dumb" text into "smart" objects.

def parse_disk_usage(stdout: str, warning_threshold=80.0, critical_threshold=90.0) -> List[DiskSignal]:
    signals = []

    # Skip the header line using logic, split by lines
    lines = stdout.strip().split('\n')

    for line in lines:
        # Skip headers or empty lines
        if "Filesystem" in line or not line.strip():
            continue

        # Regex to handle variable spaces between columns
        # Typical df -h line: "/dev/sda1   20G   10G   10G   50%   /"
        parts = re.split(r'\s+', line.strip())

        if len(parts) >= 6:
            filesystem = parts[0]
            size = parts[1]
            used = parts[2]
            avail = parts[3]
            use_pct_str = parts[4]  # e.g., "50%"
            mount = parts[5]

            # Convert "50%" to 50.0
            try:
                use_pct = float(use_pct_str.replace('%', ''))
            except ValueError:
                continue  # Skip lines we can't parse

            # --- DETERMINISTIC LOGIC ---
            # This is where we define "Truth" before the AI sees it.
            status = SignalLevel.OK
            if use_pct >= critical_threshold:
                status = SignalLevel.CRITICAL
            elif use_pct >= warning_threshold:
                status = SignalLevel.WARNING

            # Create the Signal Object
            signal = DiskSignal(
                filesystem=filesystem,
                mount_point=mount,
                usage_percent=use_pct,
                signal=status,
                raw_evidence=line
            )
            signals.append(signal)

    return signals