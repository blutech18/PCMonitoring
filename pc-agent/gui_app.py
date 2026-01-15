"""
PC Monitoring Agent - Standalone Application
A complete GUI application that handles setup and monitoring
Users just download and run this .exe - no Python installation needed!
"""
import tkinter as tk
from tkinter import ttk, messagebox
import os
import sys
import json
import threading
import time
from pathlib import Path
from datetime import datetime
import sqlite3
import uuid
import socket
import ctypes

# Determine if running as exe or script
if getattr(sys, 'frozen', False):
    APP_DIR = Path(sys.executable).parent
else:
    APP_DIR = Path(__file__).parent.parent

# Configuration
CONFIG_FILE = APP_DIR / 'config.json'
DATABASE_FILE = APP_DIR / 'monitoring_data.db'
LOG_FILE = APP_DIR / 'agent.log'

# Default settings
DEFAULT_CONFIG = {
    'linking_code': '',
    'user_id': '',
    'firebase_project_id': 'pcmonitoring-2178d',
    'monitoring_interval': 3,    # Check activity every 3 seconds for real-time feel
    'sync_interval': 5,          # Sync to cloud every 5 seconds for near real-time updates
    'sync_retry_interval': 300,  # Retry sync every 5 min when offline
    'max_offline_days': 30,      # Keep offline data for 30 days
    'auto_start': True,
    'minimize_to_tray': True,
    'offline_first': True,       # Always save locally first
}


class Logger:
    """Simple file logger"""
    def __init__(self, log_file):
        self.log_file = log_file
    
    def log(self, level, message):
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        line = f"[{timestamp}] [{level}] {message}\n"
        try:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(line)
        except:
            pass
    
    def info(self, message):
        self.log('INFO', message)
    
    def error(self, message):
        self.log('ERROR', message)
    
    def warning(self, message):
        self.log('WARNING', message)


logger = Logger(LOG_FILE)


class ConfigManager:
    """Manages application configuration"""
    
    @staticmethod
    def load():
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, 'r') as f:
                    config = json.load(f)
                    return {**DEFAULT_CONFIG, **config}
            except:
                pass
        return DEFAULT_CONFIG.copy()
    
    @staticmethod
    def save(config):
        try:
            with open(CONFIG_FILE, 'w') as f:
                json.dump(config, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Failed to save config: {e}")
            return False


class LocalDatabase:
    """Local SQLite database for offline storage"""
    
    def __init__(self):
        self.db_path = DATABASE_FILE
        self.connection = None
        self._initialize()
    
    def _get_connection(self):
        if self.connection is None:
            self.connection = sqlite3.connect(str(self.db_path), check_same_thread=False)
            self.connection.row_factory = sqlite3.Row
        return self.connection
    
    def _initialize(self):
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS computer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                computer_id TEXT UNIQUE NOT NULL,
                computer_name TEXT,
                registered_at TEXT,
                synced INTEGER DEFAULT 0
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS session_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                computer_id TEXT NOT NULL,
                username TEXT NOT NULL,
                session_start TEXT,
                session_end TEXT,
                duration_minutes INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                synced INTEGER DEFAULT 0
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS application_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                computer_id TEXT NOT NULL,
                username TEXT NOT NULL,
                application_name TEXT NOT NULL,
                window_title TEXT,
                start_time TEXT NOT NULL,
                end_time TEXT,
                duration_seconds INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                synced INTEGER DEFAULT 0
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_link (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                linked_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
    
    def get_computer_id(self):
        cursor = self._get_connection().cursor()
        cursor.execute('SELECT computer_id FROM computer LIMIT 1')
        row = cursor.fetchone()
        if row:
            return row['computer_id']
        
        # Register new computer
        computer_id = str(uuid.uuid4())
        computer_name = os.environ.get('COMPUTERNAME', 'Unknown')
        cursor.execute('''
            INSERT INTO computer (computer_id, computer_name, registered_at, synced)
            VALUES (?, ?, ?, 0)
        ''', (computer_id, computer_name, datetime.now().isoformat()))
        self._get_connection().commit()
        return computer_id
    
    def get_linked_user_id(self):
        cursor = self._get_connection().cursor()
        cursor.execute('SELECT user_id FROM user_link ORDER BY id DESC LIMIT 1')
        row = cursor.fetchone()
        return row['user_id'] if row else None
    
    def save_linked_user_id(self, user_id):
        cursor = self._get_connection().cursor()
        cursor.execute('DELETE FROM user_link')
        cursor.execute('INSERT INTO user_link (user_id) VALUES (?)', (user_id,))
        self._get_connection().commit()
    
    def log_session_start(self, computer_id, username):
        cursor = self._get_connection().cursor()
        cursor.execute('''
            INSERT INTO session_logs (computer_id, username, session_start, synced)
            VALUES (?, ?, ?, 0)
        ''', (computer_id, username, datetime.now().isoformat()))
        self._get_connection().commit()
        return cursor.lastrowid
    
    def log_session_end(self, session_id):
        cursor = self._get_connection().cursor()
        cursor.execute('SELECT session_start FROM session_logs WHERE id = ?', (session_id,))
        row = cursor.fetchone()
        if row:
            start_time = datetime.fromisoformat(row['session_start'])
            end_time = datetime.now()
            duration = int((end_time - start_time).total_seconds() / 60)
            cursor.execute('''
                UPDATE session_logs SET session_end = ?, duration_minutes = ? WHERE id = ?
            ''', (end_time.isoformat(), duration, session_id))
            self._get_connection().commit()
    
    def log_application(self, computer_id, username, app_name, window_title):
        cursor = self._get_connection().cursor()
        cursor.execute('''
            INSERT INTO application_logs 
            (computer_id, username, application_name, window_title, start_time, synced)
            VALUES (?, ?, ?, ?, ?, 0)
        ''', (computer_id, username, app_name, window_title, datetime.now().isoformat()))
        self._get_connection().commit()
        return cursor.lastrowid
    
    def update_application_end(self, log_id):
        cursor = self._get_connection().cursor()
        cursor.execute('SELECT start_time FROM application_logs WHERE id = ?', (log_id,))
        row = cursor.fetchone()
        if row:
            start_time = datetime.fromisoformat(row['start_time'])
            end_time = datetime.now()
            duration = int((end_time - start_time).total_seconds())
            cursor.execute('''
                UPDATE application_logs SET end_time = ?, duration_seconds = ? WHERE id = ?
            ''', (end_time.isoformat(), duration, log_id))
            self._get_connection().commit()
    
    def get_unsynced_sessions(self, limit=100):
        cursor = self._get_connection().cursor()
        cursor.execute('''
            SELECT * FROM session_logs WHERE synced = 0 AND session_end IS NOT NULL LIMIT ?
        ''', (limit,))
        return [dict(row) for row in cursor.fetchall()]
    
    def get_active_sessions(self):
        """Get active (ongoing) sessions"""
        cursor = self._get_connection().cursor()
        cursor.execute('''
            SELECT * FROM session_logs WHERE session_end IS NULL
        ''')
        return [dict(row) for row in cursor.fetchall()]
    
    def get_unsynced_applications(self, limit=100):
        cursor = self._get_connection().cursor()
        cursor.execute('''
            SELECT * FROM application_logs WHERE synced = 0 AND end_time IS NOT NULL LIMIT ?
        ''', (limit,))
        return [dict(row) for row in cursor.fetchall()]
    
    def mark_sessions_synced(self, ids):
        if not ids:
            return
        cursor = self._get_connection().cursor()
        placeholders = ','.join('?' * len(ids))
        cursor.execute(f'UPDATE session_logs SET synced = 1 WHERE id IN ({placeholders})', ids)
        self._get_connection().commit()
    
    def mark_applications_synced(self, ids):
        if not ids:
            return
        cursor = self._get_connection().cursor()
        placeholders = ','.join('?' * len(ids))
        cursor.execute(f'UPDATE application_logs SET synced = 1 WHERE id IN ({placeholders})', ids)
        self._get_connection().commit()


class FirebaseSync:
    """Handles syncing to Firebase using REST API - no credentials file needed!"""
    
    # Public Firebase config (same as mobile app)
    DATABASE_URL = "https://pcmonitoring-2178d-default-rtdb.firebaseio.com"
    
    def __init__(self, config, database):
        self.config = config
        self.database = database
        self.user_id = None
        self.initialized = False
        self.offline_mode = False
        self.sync_failures = 0
        self.last_sync_attempt = None
        self.last_status_update = None
        self.computer_registered = False
        
        # Use requests for REST API
        try:
            import requests
            self.requests = requests
            self.has_requests = True
        except ImportError:
            self.has_requests = False
            self.offline_mode = True
            logger.warning("requests library not available")
    
    def is_online(self) -> bool:
        """Check internet connectivity"""
        try:
            socket.create_connection(("8.8.8.8", 53), timeout=3)
            return True
        except OSError:
            return False
    
    def _firebase_get(self, path: str):
        """GET data from Firebase REST API"""
        url = f"{self.DATABASE_URL}/{path}.json"
        try:
            response = self.requests.get(url, timeout=10)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Firebase GET error: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Firebase GET exception: {e}")
            return None
    
    def _firebase_put(self, path: str, data: dict):
        """PUT data to Firebase REST API"""
        url = f"{self.DATABASE_URL}/{path}.json"
        try:
            response = self.requests.put(url, json=data, timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Firebase PUT exception: {e}")
            return False
    
    def _firebase_patch(self, path: str, data: dict):
        """PATCH data to Firebase REST API"""
        url = f"{self.DATABASE_URL}/{path}.json"
        try:
            response = self.requests.patch(url, json=data, timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Firebase PATCH exception: {e}")
            return False
    
    def initialize(self):
        if not self.has_requests:
            self.offline_mode = True
            return False
        
        # Check internet first
        if not self.is_online():
            logger.warning("No internet connection - running in offline mode")
            self.offline_mode = True
            return False
        
        try:
            # Resolve user ID from linking code
            if not self._resolve_user_id():
                self.offline_mode = True
                return False
            
            self.initialized = True
            self.offline_mode = False
            self.sync_failures = 0
            logger.info("Firebase REST API initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Firebase init error: {e}")
            self.offline_mode = True
            return False
    
    def _resolve_user_id(self):
        # Check saved user ID
        saved_id = self.database.get_linked_user_id()
        if saved_id:
            self.user_id = saved_id
            return True
        
        # Look up from linking code using public agentCodes path
        code = self.config.get('linking_code', '')
        if not code:
            logger.error("No linking code configured")
            return False
        
        try:
            # Look up code in public agentCodes path (no auth required)
            code_data = self._firebase_get(f'agentCodes/{code}')
            
            if code_data and isinstance(code_data, dict):
                if code_data.get('active', False) and code_data.get('userId'):
                    self.user_id = code_data['userId']
                    self.database.save_linked_user_id(self.user_id)
                    logger.info(f"Linked to user: {self.user_id[:8]}...")
                    return True
            
            logger.error(f"Invalid or inactive linking code: {code}")
            return False
            
        except Exception as e:
            logger.error(f"Error looking up user: {e}")
            return False
    
    def sync_all(self):
        """Sync all data with offline handling and auto-retry - optimized for real-time"""
        self.last_sync_attempt = datetime.now()
        results = {'sessions': 0, 'active_sessions': 0, 'applications': 0, 'offline': self.offline_mode}
        
        # If offline, try to reconnect periodically
        if self.offline_mode:
            if self.is_online():
                logger.info("Internet restored - attempting reconnect")
                if self.initialize():
                    logger.info("Reconnected to Firebase")
                else:
                    self.sync_failures += 1
                    return results
            else:
                return results
        
        if not self.initialized:
            if not self.initialize():
                self.sync_failures += 1
                return results
        
        try:
            computer_id = self.database.get_computer_id()
            
            # Register computer on first run only (without GET check to avoid 401)
            if not self.computer_registered:
                comp_path = f"users/{self.user_id}/computers/{computer_id}"
                computer_name = os.environ.get('COMPUTERNAME', 'Unknown')
                username = os.environ.get('USERNAME', 'Unknown')
                try:
                    ip_address = socket.gethostbyname(socket.gethostname())
                except:
                    ip_address = '127.0.0.1'
                
                # Just PUT the data (creates or updates)
                self._firebase_put(comp_path, {
                    'id': computer_id,
                    'name': f'{computer_name} - {username}',
                    'ipAddress': ip_address,
                    'status': 'online',
                    'lastSeen': datetime.now().isoformat(),
                    'registeredAt': datetime.now().isoformat()
                })
                self.computer_registered = True
            
            # Sync active sessions (ongoing) to sessions/active/
            active_sessions = self.database.get_active_sessions()
            for session in active_sessions:
                session_id = f"{computer_id}_{session['id']}"
                session_data = {
                    'computerId': session['computer_id'],
                    'computerName': os.environ.get('COMPUTERNAME', 'Unknown'),
                    'userId': session['username'],
                    'userName': session['username'],
                    'startTime': session['session_start'],
                    'currentActivity': 'Monitoring',
                    'status': 'active'
                }
                
                path = f"users/{self.user_id}/sessions/active/{session_id}"
                if self._firebase_put(path, session_data):
                    results['active_sessions'] += 1
            
            # Sync completed sessions to sessions/history/
            sessions = self.database.get_unsynced_sessions()
            synced_session_ids = []
            
            for session in sessions:
                session_id = f"{computer_id}_{session['id']}"
                session_data = {
                    'computerId': session['computer_id'],
                    'computerName': os.environ.get('COMPUTERNAME', 'Unknown'),
                    'userId': session['username'],
                    'userName': session['username'],
                    'startTime': session['session_start'],
                    'endTime': session['session_end'],
                    'totalDuration': (session['duration_minutes'] or 0) * 60,
                    'date': session['session_start'].split('T')[0],
                    'status': 'completed'
                }
                
                # Move to history
                history_path = f"users/{self.user_id}/sessions/history/{session_id}"
                if self._firebase_put(history_path, session_data):
                    synced_session_ids.append(session['id'])
                    
                    # Remove from active sessions (using DELETE by setting to null)
                    active_path = f"users/{self.user_id}/sessions/active/{session_id}"
                    try:
                        url = f"{self.DATABASE_URL}/{active_path}.json"
                        self.requests.delete(url, timeout=10)
                    except:
                        pass  # Ignore if doesn't exist
            
            self.database.mark_sessions_synced(synced_session_ids)
            results['sessions'] = len(synced_session_ids)
            
            # Sync applications (real-time activity updates)
            apps = self.database.get_unsynced_applications()
            synced_app_ids = []
            
            for app in apps:
                activity_id = f"{computer_id}_{app['id']}"
                activity_data = {
                    'applicationName': app['application_name'],
                    'windowTitle': app['window_title'],
                    'startTime': app['start_time'],
                    'endTime': app['end_time'],
                    'durationSeconds': app['duration_seconds'] or 0
                }
                
                path = f"users/{self.user_id}/activities/{activity_id}"
                if self._firebase_put(path, activity_data):
                    synced_app_ids.append(app['id'])
            
            self.database.mark_applications_synced(synced_app_ids)
            results['applications'] = len(synced_app_ids)
            
            # Update computer status only every 30 seconds to reduce writes
            should_update_status = (
                self.last_status_update is None or
                (datetime.now() - self.last_status_update).total_seconds() >= 30
            )
            
            if should_update_status or results['sessions'] > 0 or results['applications'] > 0:
                comp_path = f"users/{self.user_id}/computers/{computer_id}"
                self._firebase_patch(comp_path, {
                    'status': 'online',
                    'lastSeen': datetime.now().isoformat()
                })
                self.last_status_update = datetime.now()
            
            results['offline'] = False
            self.sync_failures = 0
            
            # Only log when there's actual data synced
            if results['sessions'] > 0 or results['applications'] > 0 or results['active_sessions'] > 0:
                parts = []
                if results['active_sessions'] > 0:
                    parts.append(f"{results['active_sessions']} active")
                if results['sessions'] > 0:
                    parts.append(f"{results['sessions']} completed")
                if results['applications'] > 0:
                    parts.append(f"{results['applications']} apps")
                logger.info(f"Synced: {', '.join(parts)}")
            
        except Exception as e:
            logger.error(f"Sync error: {e}")
            self.sync_failures += 1
        
        return results


class MonitoringAgent:
    """Main monitoring agent"""
    
    def __init__(self, config, database, sync):
        self.config = config
        self.database = database
        self.sync = sync
        self.running = False
        self.current_session_id = None
        self.current_app_log_id = None
        self.last_app = None
        self.computer_id = database.get_computer_id()
    
    def start(self):
        self.running = True
        self.current_session_id = self.database.log_session_start(
            self.computer_id,
            os.environ.get('USERNAME', 'Unknown')
        )
        logger.info("Monitoring started")
        
        # Start monitoring threads
        threading.Thread(target=self._monitor_loop, daemon=True).start()
        threading.Thread(target=self._sync_loop, daemon=True).start()
    
    def stop(self):
        self.running = False
        if self.current_session_id:
            self.database.log_session_end(self.current_session_id)
        if self.current_app_log_id:
            self.database.update_application_end(self.current_app_log_id)
        logger.info("Monitoring stopped")
    
    def _monitor_loop(self):
        while self.running:
            try:
                self._check_foreground_app()
            except Exception as e:
                logger.error(f"Monitor error: {e}")
            time.sleep(self.config.get('monitoring_interval', 5))
    
    def _sync_loop(self):
        while self.running:
            try:
                results = self.sync.sync_all()
                # Logging is now handled inside sync_all for real-time updates
            except Exception as e:
                logger.error(f"Sync loop error: {e}")
            time.sleep(self.config.get('sync_interval', 5))
    
    def _check_foreground_app(self):
        try:
            # Get foreground window
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            if not hwnd:
                return
            
            # Get window title
            length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
            buff = ctypes.create_unicode_buffer(length + 1)
            ctypes.windll.user32.GetWindowTextW(hwnd, buff, length + 1)
            window_title = buff.value
            
            # Get process name
            pid = ctypes.c_ulong()
            ctypes.windll.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            
            try:
                import psutil
                process = psutil.Process(pid.value)
                app_name = process.name()
            except:
                app_name = "Unknown"
            
            # Check if app changed
            current_app = f"{app_name}|{window_title}"
            if current_app != self.last_app:
                # End previous app log
                if self.current_app_log_id:
                    self.database.update_application_end(self.current_app_log_id)
                
                # Start new app log
                self.current_app_log_id = self.database.log_application(
                    self.computer_id,
                    os.environ.get('USERNAME', 'Unknown'),
                    app_name,
                    window_title[:200] if window_title else ''
                )
                self.last_app = current_app
                
        except Exception as e:
            logger.error(f"App check error: {e}")


class PCMonitorApp:
    """Main application with modern GUI - Professional White/Blue Theme"""
    
    # Professional White/Blue color scheme
    COLORS = {
        'bg': '#FFFFFF',              # White background
        'bg_secondary': '#F8FAFC',    # Light gray card background
        'bg_tertiary': '#EFF6FF',     # Light blue tint for accents
        'bg_hover': '#E2E8F0',        # Hover state
        'primary': '#2563EB',         # Blue primary
        'primary_light': '#3B82F6',   # Lighter blue
        'primary_hover': '#1D4ED8',   # Darker blue on hover
        'primary_bg': '#DBEAFE',      # Very light blue background
        'success': '#059669',         # Green (darker for white bg)
        'success_light': '#10B981',   # Lighter green
        'success_bg': '#D1FAE5',      # Light green background
        'warning': '#D97706',         # Orange
        'warning_bg': '#FEF3C7',      # Light orange background
        'error': '#DC2626',           # Red
        'error_bg': '#FEE2E2',        # Light red background
        'text': '#1E293B',            # Dark text
        'text_secondary': '#64748B',  # Gray text
        'text_muted': '#94A3B8',      # Muted text
        'border': '#E2E8F0',          # Light border
        'border_focus': '#3B82F6',    # Blue border on focus
        'shadow': '#0000001A',        # Subtle shadow
        'icon': '#3B82F6',            # Blue icons
    }
    
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("PC Monitoring Agent")
        self.root.geometry("480x580")
        self.root.resizable(False, False)
        self.root.configure(bg=self.COLORS['bg'])
        
        # Configure styles
        self.setup_styles()
        
        # Load config
        self.config = ConfigManager.load()
        self.database = LocalDatabase()
        self.sync = FirebaseSync(self.config, self.database)
        self.agent = None
        self.monitoring = False
        
        # Variables
        self.linking_code = tk.StringVar(value=self.config.get('linking_code', ''))
        self.status_text = tk.StringVar(value="Stopped")
        
        # Check if already configured
        if self.config.get('linking_code') and self.config.get('user_id'):
            self.create_main_screen()
        else:
            self.create_setup_screen()
        
        # Center window
        self.center_window()
        
        # Handle close
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
    
    def setup_styles(self):
        """Configure ttk styles for professional white/blue theme"""
        style = ttk.Style()
        style.theme_use('clam')
        
        # Frame styles
        style.configure('Main.TFrame', background=self.COLORS['bg'])
        style.configure('Card.TFrame', background=self.COLORS['bg_secondary'])
        style.configure('CardBlue.TFrame', background=self.COLORS['bg_tertiary'])
        
        # Label styles
        style.configure('Title.TLabel', 
            background=self.COLORS['bg'],
            foreground=self.COLORS['text'],
            font=('Segoe UI', 24, 'bold'))
        style.configure('Subtitle.TLabel',
            background=self.COLORS['bg'],
            foreground=self.COLORS['text_secondary'],
            font=('Segoe UI', 11))
        style.configure('Main.TLabel',
            background=self.COLORS['bg'],
            foreground=self.COLORS['text'],
            font=('Segoe UI', 11))
        style.configure('Card.TLabel',
            background=self.COLORS['bg_secondary'],
            foreground=self.COLORS['text'],
            font=('Segoe UI', 11))
        style.configure('CardTitle.TLabel',
            background=self.COLORS['bg_secondary'],
            foreground=self.COLORS['text'],
            font=('Segoe UI', 13, 'bold'))
        style.configure('Status.TLabel',
            background=self.COLORS['bg_secondary'],
            foreground=self.COLORS['success'],
            font=('Segoe UI', 16, 'bold'))
        style.configure('Icon.TLabel',
            background=self.COLORS['bg'],
            foreground=self.COLORS['icon'],
            font=('Segoe UI', 48))
        
        # Button styles
        style.configure('Primary.TButton',
            background=self.COLORS['primary'],
            foreground='#FFFFFF',
            font=('Segoe UI', 12, 'bold'),
            padding=(20, 12))
        style.map('Primary.TButton',
            background=[('active', self.COLORS['primary_hover'])])
        
        style.configure('Secondary.TButton',
            background=self.COLORS['bg_secondary'],
            foreground=self.COLORS['text'],
            font=('Segoe UI', 11),
            padding=(16, 10))
        style.map('Secondary.TButton',
            background=[('active', self.COLORS['bg_hover'])])
        
        # Entry styles
        style.configure('Main.TEntry',
            fieldbackground=self.COLORS['bg_secondary'],
            foreground=self.COLORS['text'],
            insertcolor=self.COLORS['text'],
            font=('Consolas', 18, 'bold'))
    
    def center_window(self):
        self.root.update_idletasks()
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f'{width}x{height}+{x}+{y}')
    
    def clear_window(self):
        for widget in self.root.winfo_children():
            widget.destroy()
    
    def create_setup_screen(self):
        """Professional setup screen with white/blue theme"""
        self.clear_window()
        
        # Main container with responsive padding
        main = tk.Frame(self.root, bg=self.COLORS['bg'])
        main.pack(fill=tk.BOTH, expand=True)
        
        # Top accent bar
        accent_bar = tk.Frame(main, bg=self.COLORS['primary'], height=4)
        accent_bar.pack(fill=tk.X)
        
        # Content area with padding
        content = tk.Frame(main, bg=self.COLORS['bg'])
        content.pack(fill=tk.BOTH, expand=True, padx=40, pady=30)
        
        # Logo/Icon container with blue background circle effect
        icon_container = tk.Frame(content, bg=self.COLORS['primary_bg'], width=100, height=100)
        icon_container.pack(pady=(20, 20))
        icon_container.pack_propagate(False)
        
        icon_label = tk.Label(icon_container, text="🖥️", font=('Segoe UI', 40), 
                             bg=self.COLORS['primary_bg'], fg=self.COLORS['primary'])
        icon_label.place(relx=0.5, rely=0.5, anchor='center')
        
        # Title
        tk.Label(content, text="PC Monitoring", 
                font=('Segoe UI', 26, 'bold'),
                fg=self.COLORS['text'], bg=self.COLORS['bg']).pack()
        
        tk.Label(content, text="Agent Setup",
                font=('Segoe UI', 13),
                fg=self.COLORS['text_secondary'], bg=self.COLORS['bg']).pack(pady=(2, 25))
        
        # Card container with border effect
        card_outer = tk.Frame(content, bg=self.COLORS['border'])
        card_outer.pack(fill=tk.X, pady=(0, 5))
        
        card = tk.Frame(card_outer, bg=self.COLORS['bg_secondary'], padx=28, pady=24)
        card.pack(fill=tk.X, padx=1, pady=1)
        
        # Instructions with icon
        header_frame = tk.Frame(card, bg=self.COLORS['bg_secondary'])
        header_frame.pack(anchor='w', fill=tk.X)
        
        tk.Label(header_frame, text="🔗",
                font=('Segoe UI', 14),
                fg=self.COLORS['primary'], bg=self.COLORS['bg_secondary']).pack(side=tk.LEFT, padx=(0, 8))
        
        tk.Label(header_frame, text="Enter your linking code",
                font=('Segoe UI', 13, 'bold'),
                fg=self.COLORS['text'], bg=self.COLORS['bg_secondary']).pack(side=tk.LEFT)
        
        tk.Label(card, text="Get it from Settings → PC Agent Setup in the web app",
                font=('Segoe UI', 10),
                fg=self.COLORS['text_secondary'], bg=self.COLORS['bg_secondary']).pack(anchor='w', pady=(4, 18))
        
        # Code entry with border styling
        entry_outer = tk.Frame(card, bg=self.COLORS['border'], padx=2, pady=2)
        entry_outer.pack(fill=tk.X, pady=(0, 20))
        
        entry_frame = tk.Frame(entry_outer, bg=self.COLORS['bg'])
        entry_frame.pack(fill=tk.X)
        
        code_entry = tk.Entry(
            entry_frame,
            textvariable=self.linking_code,
            font=('Segoe UI', 22, 'bold'),
            justify='center',
            bg=self.COLORS['bg'],
            fg=self.COLORS['text'],
            insertbackground=self.COLORS['primary'],
            relief='flat',
            highlightthickness=0
        )
        code_entry.pack(fill=tk.X, ipady=14)
        code_entry.focus()
        
        # Focus effect for entry
        def on_entry_focus(e):
            entry_outer.config(bg=self.COLORS['border_focus'])
        def on_entry_unfocus(e):
            entry_outer.config(bg=self.COLORS['border'])
        code_entry.bind('<FocusIn>', on_entry_focus)
        code_entry.bind('<FocusOut>', on_entry_unfocus)
        
        # Auto uppercase
        def format_code(*args):
            value = self.linking_code.get().upper()[:8]
            self.linking_code.set(value)
        self.linking_code.trace('w', format_code)
        
        # Connect button
        connect_btn = tk.Button(
            card,
            text="Connect Account  →",
            command=self.connect_account,
            font=('Segoe UI', 13, 'bold'),
            bg=self.COLORS['primary'],
            fg='#FFFFFF',
            activebackground=self.COLORS['primary_hover'],
            activeforeground='#FFFFFF',
            relief='flat',
            cursor='hand2',
            padx=30, pady=14,
            bd=0
        )
        connect_btn.pack(fill=tk.X)
        
        # Hover effects
        connect_btn.bind('<Enter>', lambda e: connect_btn.config(bg=self.COLORS['primary_hover']))
        connect_btn.bind('<Leave>', lambda e: connect_btn.config(bg=self.COLORS['primary']))
        
        # Help text with icon
        help_frame = tk.Frame(content, bg=self.COLORS['bg'])
        help_frame.pack(pady=(20, 0))
        
        tk.Label(help_frame, text="ℹ️",
                font=('Segoe UI', 10),
                fg=self.COLORS['text_muted'], bg=self.COLORS['bg']).pack(side=tk.LEFT, padx=(0, 6))
        
        tk.Label(help_frame, text="Don't have a code? Create an account at the web app first.",
                font=('Segoe UI', 10),
                fg=self.COLORS['text_muted'], bg=self.COLORS['bg']).pack(side=tk.LEFT)
    
    def create_main_screen(self):
        """Professional main monitoring screen with white/blue theme"""
        self.clear_window()
        
        # Main container
        main = tk.Frame(self.root, bg=self.COLORS['bg'])
        main.pack(fill=tk.BOTH, expand=True)
        
        # Top accent bar
        accent_bar = tk.Frame(main, bg=self.COLORS['primary'], height=4)
        accent_bar.pack(fill=tk.X)
        
        # Content area
        content = tk.Frame(main, bg=self.COLORS['bg'])
        content.pack(fill=tk.BOTH, expand=True, padx=30, pady=25)
        
        # Header with logo
        header = tk.Frame(content, bg=self.COLORS['bg'])
        header.pack(fill=tk.X, pady=(0, 20))
        
        # Logo container
        logo_container = tk.Frame(header, bg=self.COLORS['primary_bg'], width=56, height=56)
        logo_container.pack(side=tk.LEFT)
        logo_container.pack_propagate(False)
        
        # Center the icon using place with exact center positioning
        icon_label = tk.Label(logo_container, text="💻", font=('Segoe UI', 24), 
                bg=self.COLORS['primary_bg'], fg=self.COLORS['primary'])
        icon_label.place(relx=0.5, rely=0.5, anchor='center')
        
        title_frame = tk.Frame(header, bg=self.COLORS['bg'])
        title_frame.pack(side=tk.LEFT, padx=15)
        
        tk.Label(title_frame, text="PC Monitoring",
                font=('Segoe UI', 18, 'bold'),
                fg=self.COLORS['text'], bg=self.COLORS['bg']).pack(anchor='w')
        tk.Label(title_frame, text="Agent",
                font=('Segoe UI', 11),
                fg=self.COLORS['text_secondary'], bg=self.COLORS['bg']).pack(anchor='w')
        
        # Status Card with border
        status_outer = tk.Frame(content, bg=self.COLORS['border'])
        status_outer.pack(fill=tk.X, pady=(0, 12))
        
        self.status_card = tk.Frame(status_outer, bg=self.COLORS['bg_secondary'], padx=22, pady=18)
        self.status_card.pack(fill=tk.X, padx=1, pady=1)
        
        status_header = tk.Frame(self.status_card, bg=self.COLORS['bg_secondary'])
        status_header.pack(fill=tk.X)
        
        tk.Label(status_header, text="Monitoring Status",
                font=('Segoe UI', 10),
                fg=self.COLORS['text_secondary'], bg=self.COLORS['bg_secondary']).pack(side=tk.LEFT)
        
        self.status_indicator = tk.Label(status_header, text="●",
                font=('Segoe UI', 12),
                fg=self.COLORS['text_muted'], bg=self.COLORS['bg_secondary'])
        self.status_indicator.pack(side=tk.RIGHT)
        
        self.status_label = tk.Label(self.status_card, text="Stopped",
                font=('Segoe UI', 22, 'bold'),
                fg=self.COLORS['text'], bg=self.COLORS['bg_secondary'])
        self.status_label.pack(anchor='w', pady=(6, 0))
        
        # Info Card with border
        info_outer = tk.Frame(content, bg=self.COLORS['border'])
        info_outer.pack(fill=tk.X, pady=(0, 12))
        
        info_card = tk.Frame(info_outer, bg=self.COLORS['bg_secondary'], padx=22, pady=18)
        info_card.pack(fill=tk.X, padx=1, pady=1)
        
        # Info header with icon
        info_header = tk.Frame(info_card, bg=self.COLORS['bg_secondary'])
        info_header.pack(anchor='w', fill=tk.X, pady=(0, 12))
        
        tk.Label(info_header, text="📊",
                font=('Segoe UI', 11),
                fg=self.COLORS['primary'], bg=self.COLORS['bg_secondary']).pack(side=tk.LEFT, padx=(0, 8))
        
        tk.Label(info_header, text="System Information",
                font=('Segoe UI', 11, 'bold'),
                fg=self.COLORS['text'], bg=self.COLORS['bg_secondary']).pack(side=tk.LEFT)
        
        computer_name = os.environ.get('COMPUTERNAME', 'Unknown')
        username = os.environ.get('USERNAME', 'Unknown')
        
        # Info rows with better styling
        info_items = [
            ("💻", "Computer", computer_name),
            ("👤", "User", username),
            ("🔗", "Linked Code", self.config.get('linking_code', 'N/A')[:4] + '****')
        ]
        
        for icon, label, value in info_items:
            row = tk.Frame(info_card, bg=self.COLORS['bg_secondary'])
            row.pack(fill=tk.X, pady=4)
            
            left_frame = tk.Frame(row, bg=self.COLORS['bg_secondary'])
            left_frame.pack(side=tk.LEFT)
            
            tk.Label(left_frame, text=icon,
                    font=('Segoe UI', 10),
                    fg=self.COLORS['text_muted'], bg=self.COLORS['bg_secondary']).pack(side=tk.LEFT, padx=(0, 8))
            tk.Label(left_frame, text=label, font=('Segoe UI', 11),
                    fg=self.COLORS['text_secondary'], bg=self.COLORS['bg_secondary']).pack(side=tk.LEFT)
            
            tk.Label(row, text=value, font=('Segoe UI', 11, 'bold'),
                    fg=self.COLORS['text'], bg=self.COLORS['bg_secondary']).pack(side=tk.RIGHT)
        
        # Buttons container
        btn_frame = tk.Frame(content, bg=self.COLORS['bg'])
        btn_frame.pack(fill=tk.X, pady=(8, 0))
        
        # Start/Stop button
        self.start_btn = tk.Button(
            btn_frame,
            text="▶  Start Monitoring",
            command=self.toggle_monitoring,
            font=('Segoe UI', 13, 'bold'),
            bg=self.COLORS['success'],
            fg='#FFFFFF',
            activebackground=self.COLORS['success_light'],
            activeforeground='#FFFFFF',
            relief='flat',
            cursor='hand2',
            padx=20, pady=14,
            bd=0
        )
        self.start_btn.pack(fill=tk.X, pady=(0, 10))
        
        # Settings button
        settings_btn = tk.Button(
            btn_frame,
            text="⚙  Settings",
            command=self.show_settings,
            font=('Segoe UI', 11),
            bg=self.COLORS['bg_secondary'],
            fg=self.COLORS['text'],
            activebackground=self.COLORS['bg_hover'],
            activeforeground=self.COLORS['text'],
            relief='flat',
            cursor='hand2',
            padx=20, pady=12,
            bd=0
        )
        settings_btn.pack(fill=tk.X)
        
        # Hover effects
        def on_start_enter(e):
            if self.monitoring:
                self.start_btn.config(bg='#B91C1C')  # Darker red
            else:
                self.start_btn.config(bg=self.COLORS['success_light'])
        
        def on_start_leave(e):
            if self.monitoring:
                self.start_btn.config(bg=self.COLORS['error'])
            else:
                self.start_btn.config(bg=self.COLORS['success'])
        
        self.start_btn.bind('<Enter>', on_start_enter)
        self.start_btn.bind('<Leave>', on_start_leave)
        settings_btn.bind('<Enter>', lambda e: settings_btn.config(bg=self.COLORS['bg_hover']))
        settings_btn.bind('<Leave>', lambda e: settings_btn.config(bg=self.COLORS['bg_secondary']))
        
        # Auto-start if configured
        if self.config.get('auto_start', True):
            self.root.after(1000, self.start_monitoring)
    
    def connect_account(self):
        """Validate and save linking code"""
        code = self.linking_code.get().strip()
        
        if not code:
            messagebox.showerror("Error", "Please enter your linking code.")
            return
        
        if len(code) != 8:
            messagebox.showerror("Error", "Linking code must be 8 characters.")
            return
        
        # Save code
        self.config['linking_code'] = code
        
        # Try to connect
        self.sync = FirebaseSync(self.config, self.database)
        if self.sync.initialize():
            self.config['user_id'] = self.sync.user_id
            ConfigManager.save(self.config)
            messagebox.showinfo("Success", "Connected successfully!")
            self.create_main_screen()
        else:
            messagebox.showerror(
                "Connection Failed",
                "Could not connect with this code.\n\n"
                "Please check:\n"
                "• The code is correct (get it from app Settings)\n"
                "• You have internet connection\n"
                "• The code has not expired"
            )
    
    def toggle_monitoring(self):
        if self.monitoring:
            self.stop_monitoring()
        else:
            self.start_monitoring()
    
    def start_monitoring(self):
        if self.monitoring:
            return
        
        self.agent = MonitoringAgent(self.config, self.database, self.sync)
        self.agent.start()
        self.monitoring = True
        
        # Update UI with success colors
        self.status_label.config(text="Running", fg=self.COLORS['success'])
        self.status_indicator.config(fg=self.COLORS['success'])
        self.start_btn.config(
            text="■  Stop Monitoring",
            bg=self.COLORS['error'],
            activebackground='#B91C1C'
        )
        logger.info("Monitoring started via GUI")
    
    def stop_monitoring(self):
        if not self.monitoring:
            return
        
        if self.agent:
            self.agent.stop()
            self.agent = None
        self.monitoring = False
        
        # Update UI with stopped colors
        self.status_label.config(text="Stopped", fg=self.COLORS['text'])
        self.status_indicator.config(fg=self.COLORS['text_muted'])
        self.start_btn.config(
            text="▶  Start Monitoring",
            bg=self.COLORS['success'],
            activebackground=self.COLORS['success_light']
        )
        logger.info("Monitoring stopped via GUI")
    
    def show_settings(self):
        """Professional settings dialog with white/blue theme"""
        settings_win = tk.Toplevel(self.root)
        settings_win.title("Settings")
        settings_win.geometry("440x450")
        settings_win.configure(bg=self.COLORS['bg'])
        settings_win.transient(self.root)
        settings_win.grab_set()
        settings_win.resizable(False, False)
        
        # Center the settings window
        settings_win.update_idletasks()
        x = self.root.winfo_x() + (self.root.winfo_width() // 2) - 220
        y = self.root.winfo_y() + (self.root.winfo_height() // 2) - 225
        settings_win.geometry(f'+{x}+{y}')
        
        # Top accent bar
        accent_bar = tk.Frame(settings_win, bg=self.COLORS['primary'], height=4)
        accent_bar.pack(fill=tk.X)
        
        main = tk.Frame(settings_win, bg=self.COLORS['bg'], padx=28, pady=25)
        main.pack(fill=tk.BOTH, expand=True)
        
        # Title with icon
        title_frame = tk.Frame(main, bg=self.COLORS['bg'])
        title_frame.pack(anchor='w', pady=(0, 20))
        
        tk.Label(title_frame, text="⚙️",
                font=('Segoe UI', 20),
                fg=self.COLORS['primary'], bg=self.COLORS['bg']).pack(side=tk.LEFT, padx=(0, 10))
        
        tk.Label(title_frame, text="Settings",
                font=('Segoe UI', 20, 'bold'),
                fg=self.COLORS['text'], bg=self.COLORS['bg']).pack(side=tk.LEFT)
        
        # Settings card with border
        card_outer = tk.Frame(main, bg=self.COLORS['border'])
        card_outer.pack(fill=tk.X, pady=(0, 18))
        
        card = tk.Frame(card_outer, bg=self.COLORS['bg_secondary'], padx=22, pady=20)
        card.pack(fill=tk.X, padx=1, pady=1)
        
        # Auto-start checkbox with better styling
        auto_start = tk.BooleanVar(value=self.config.get('auto_start', True))
        auto_cb = tk.Checkbutton(
            card,
            text="  Start monitoring automatically",
            variable=auto_start,
            font=('Segoe UI', 11),
            fg=self.COLORS['text'],
            bg=self.COLORS['bg_secondary'],
            activebackground=self.COLORS['bg_secondary'],
            activeforeground=self.COLORS['text'],
            selectcolor=self.COLORS['bg'],
            highlightthickness=0,
            bd=0
        )
        auto_cb.pack(anchor='w', pady=(0, 18))
        
        # Monitoring interval
        tk.Label(card, text="Monitoring interval (seconds)",
                font=('Segoe UI', 11),
                fg=self.COLORS['text_secondary'], bg=self.COLORS['bg_secondary']).pack(anchor='w')
        
        mon_entry_outer = tk.Frame(card, bg=self.COLORS['border'], padx=1, pady=1)
        mon_entry_outer.pack(anchor='w', pady=(6, 18))
        
        mon_entry = tk.Entry(mon_entry_outer, font=('Segoe UI', 12),
                            bg=self.COLORS['bg'], fg=self.COLORS['text'],
                            insertbackground=self.COLORS['primary'], relief='flat', width=12)
        mon_entry.insert(0, str(self.config.get('monitoring_interval', 5)))
        mon_entry.pack(ipady=8, padx=1, pady=1)
        
        # Focus effects for monitoring entry
        def on_mon_focus(e):
            mon_entry_outer.config(bg=self.COLORS['border_focus'])
        def on_mon_unfocus(e):
            mon_entry_outer.config(bg=self.COLORS['border'])
        mon_entry.bind('<FocusIn>', on_mon_focus)
        mon_entry.bind('<FocusOut>', on_mon_unfocus)
        
        # Sync interval
        tk.Label(card, text="Sync interval (seconds)",
                font=('Segoe UI', 11),
                fg=self.COLORS['text_secondary'], bg=self.COLORS['bg_secondary']).pack(anchor='w')
        
        sync_entry_outer = tk.Frame(card, bg=self.COLORS['border'], padx=1, pady=1)
        sync_entry_outer.pack(anchor='w', pady=(6, 0))
        
        sync_entry = tk.Entry(sync_entry_outer, font=('Segoe UI', 12),
                             bg=self.COLORS['bg'], fg=self.COLORS['text'],
                             insertbackground=self.COLORS['primary'], relief='flat', width=12)
        sync_entry.insert(0, str(self.config.get('sync_interval', 60)))
        sync_entry.pack(ipady=8, padx=1, pady=1)
        
        # Focus effects for sync entry
        def on_sync_focus(e):
            sync_entry_outer.config(bg=self.COLORS['border_focus'])
        def on_sync_unfocus(e):
            sync_entry_outer.config(bg=self.COLORS['border'])
        sync_entry.bind('<FocusIn>', on_sync_focus)
        sync_entry.bind('<FocusOut>', on_sync_unfocus)
        
        # Save button
        def save_settings():
            try:
                self.config['auto_start'] = auto_start.get()
                self.config['monitoring_interval'] = int(mon_entry.get())
                self.config['sync_interval'] = int(sync_entry.get())
                ConfigManager.save(self.config)
                settings_win.destroy()
            except ValueError:
                messagebox.showerror("Error", "Please enter valid numbers")
        
        save_btn = tk.Button(
            main,
            text="Save Settings",
            command=save_settings,
            font=('Segoe UI', 12, 'bold'),
            bg=self.COLORS['primary'],
            fg='#FFFFFF',
            activebackground=self.COLORS['primary_hover'],
            activeforeground='#FFFFFF',
            relief='flat',
            cursor='hand2',
            padx=20, pady=13,
            bd=0
        )
        save_btn.pack(fill=tk.X, pady=(0, 10))
        save_btn.bind('<Enter>', lambda e: save_btn.config(bg=self.COLORS['primary_hover']))
        save_btn.bind('<Leave>', lambda e: save_btn.config(bg=self.COLORS['primary']))
        
        # Disconnect button
        def disconnect():
            if messagebox.askyesno("Disconnect", "Remove this PC from your account?"):
                self.stop_monitoring()
                self.config['linking_code'] = ''
                self.config['user_id'] = ''
                ConfigManager.save(self.config)
                settings_win.destroy()
                self.create_setup_screen()
        
        disconnect_btn = tk.Button(
            main,
            text="Disconnect Account",
            command=disconnect,
            font=('Segoe UI', 11),
            bg=self.COLORS['bg_secondary'],
            fg=self.COLORS['error'],
            activebackground=self.COLORS['error_bg'],
            activeforeground=self.COLORS['error'],
            relief='flat',
            cursor='hand2',
            padx=20, pady=11,
            bd=0
        )
        disconnect_btn.pack(fill=tk.X)
        disconnect_btn.bind('<Enter>', lambda e: disconnect_btn.config(bg=self.COLORS['error_bg']))
        disconnect_btn.bind('<Leave>', lambda e: disconnect_btn.config(bg=self.COLORS['bg_secondary']))
    
    def on_close(self):
        """Handle window close"""
        if self.monitoring:
            if messagebox.askyesno(
                "Minimize?",
                "Monitoring is running. Minimize to background instead of closing?"
            ):
                self.root.withdraw()
                return
            self.stop_monitoring()
        self.root.destroy()
    
    def run(self):
        self.root.mainloop()


def main():
    app = PCMonitorApp()
    app.run()


if __name__ == '__main__':
    main()
