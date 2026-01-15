"""
Configuration settings for PC Monitoring Agent
Supports both .exe GUI app and Python script modes
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# Firebase Configuration
# ============================================================
FIREBASE_CREDENTIALS_PATH = os.getenv('FIREBASE_CREDENTIALS_PATH', 'firebase-credentials.json')
FIREBASE_PROJECT_ID = os.getenv('FIREBASE_PROJECT_ID', 'pcmonitoring-2178d')
FIREBASE_DATABASE_URL = os.getenv(
    'FIREBASE_DATABASE_URL', 
    f'https://{FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com'
)

# ============================================================
# User Authentication
# ============================================================
# Agent linking code from user's account (get from web app Settings)
AGENT_LINKING_CODE = os.getenv('AGENT_LINKING_CODE', '')
# Direct user ID (resolved from linking code or set manually)
USER_ID = os.getenv('USER_ID', '')

# ============================================================
# Local Database (Offline Storage)
# ============================================================
DATABASE_PATH = os.getenv('DATABASE_PATH', 'monitoring_data.db')

# ============================================================
# Monitoring Settings
# ============================================================
MONITORING_INTERVAL = int(os.getenv('MONITORING_INTERVAL', '3'))  # seconds - real-time monitoring
SYNC_INTERVAL = int(os.getenv('SYNC_INTERVAL', '5'))  # seconds - near real-time sync
SYNC_BATCH_SIZE = int(os.getenv('SYNC_BATCH_SIZE', '100'))  # records per batch

# ============================================================
# Offline Mode Settings
# ============================================================
# Always save locally first, sync when online
OFFLINE_FIRST = os.getenv('OFFLINE_FIRST', 'true').lower() == 'true'
# Retry failed syncs after this many seconds
SYNC_RETRY_INTERVAL = int(os.getenv('SYNC_RETRY_INTERVAL', '300'))
# Maximum days to keep unsynced data locally
MAX_OFFLINE_DAYS = int(os.getenv('MAX_OFFLINE_DAYS', '30'))

# ============================================================
# Internet Check
# ============================================================
INTERNET_CHECK_URL = 'https://www.google.com'
INTERNET_CHECK_TIMEOUT = 5  # seconds

# ============================================================
# Logging
# ============================================================
LOG_FILE = os.getenv('LOG_FILE', 'agent.log')
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

# ============================================================
# Advanced Settings
# ============================================================
AUTO_START = os.getenv('AUTO_START', 'true').lower() == 'true'
MINIMIZE_TO_TRAY = os.getenv('MINIMIZE_TO_TRAY', 'true').lower() == 'true'
CHECK_UPDATES = os.getenv('CHECK_UPDATES', 'false').lower() == 'true'
