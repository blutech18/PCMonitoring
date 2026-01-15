"""
Quick launcher for updated agent with active session fix
Run this instead of the .exe to test the latest changes
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Import and run the GUI app
from gui_app import main

if __name__ == '__main__':
    main()
