"""
SQLite Database Module for Local Data Storage
Handles offline data recording with sync flags
"""
import sqlite3
import uuid
import os
from datetime import datetime
from typing import List, Dict, Optional, Any
import config
import logging

logger = logging.getLogger(__name__)


class Database:
    def __init__(self, db_path: str = None):
        """Initialize database connection"""
        self.db_path = db_path or config.DATABASE_PATH
        self.connection = None
        self._initialize_database()
    
    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection"""
        if self.connection is None:
            self.connection = sqlite3.connect(self.db_path, check_same_thread=False)
            self.connection.row_factory = sqlite3.Row
        return self.connection
    
    def _initialize_database(self):
        """Create database tables if they don't exist"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Computer registration table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS computer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                computer_id TEXT UNIQUE NOT NULL,
                computer_name TEXT,
                registered_at TEXT,
                synced INTEGER DEFAULT 0
            )
        ''')
        
        # Session logs table (login/logout)
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
        
        # Application usage table
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
        
        # Website usage table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS website_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                computer_id TEXT NOT NULL,
                username TEXT NOT NULL,
                browser TEXT NOT NULL,
                url TEXT NOT NULL,
                page_title TEXT,
                visit_time TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                synced INTEGER DEFAULT 0
            )
        ''')
        
        # Error logs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS error_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                error_type TEXT,
                error_message TEXT,
                stack_trace TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # User linking table (stores the linked user ID for this agent)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_link (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                linked_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        logger.info("Database initialized successfully")
    
    # ==================== Computer Registration ====================
    
    def get_computer_id(self) -> Optional[str]:
        """Get stored computer ID or None if not registered"""
        cursor = self._get_connection().cursor()
        cursor.execute('SELECT computer_id FROM computer LIMIT 1')
        row = cursor.fetchone()
        return row['computer_id'] if row else None
    
    def register_computer(self, computer_name: str = None) -> str:
        """Register computer with unique UUID"""
        existing_id = self.get_computer_id()
        if existing_id:
            return existing_id
        
        computer_id = str(uuid.uuid4())
        computer_name = computer_name or os.environ.get('COMPUTERNAME', 'Unknown')
        
        cursor = self._get_connection().cursor()
        cursor.execute('''
            INSERT INTO computer (computer_id, computer_name, registered_at, synced)
            VALUES (?, ?, ?, 0)
        ''', (computer_id, computer_name, datetime.now().isoformat()))
        self._get_connection().commit()
        
        logger.info(f"Computer registered with ID: {computer_id}")
        return computer_id
    
    def mark_computer_synced(self):
        """Mark computer registration as synced"""
        cursor = self._get_connection().cursor()
        cursor.execute('UPDATE computer SET synced = 1')
        self._get_connection().commit()
    
    def is_computer_synced(self) -> bool:
        """Check if computer registration is synced"""
        cursor = self._get_connection().cursor()
        cursor.execute('SELECT synced FROM computer LIMIT 1')
        row = cursor.fetchone()
        return row['synced'] == 1 if row else False
    
    # ==================== Session Logs ====================
    
    def start_session(self, computer_id: str, username: str) -> int:
        """Record session start"""
        cursor = self._get_connection().cursor()
        cursor.execute('''
            INSERT INTO session_logs (computer_id, username, session_start, synced)
            VALUES (?, ?, ?, 0)
        ''', (computer_id, username, datetime.now().isoformat()))
        self._get_connection().commit()
        return cursor.lastrowid
    
    def end_session(self, session_id: int):
        """Record session end and calculate duration"""
        cursor = self._get_connection().cursor()
        
        # Get session start time
        cursor.execute('SELECT session_start FROM session_logs WHERE id = ?', (session_id,))
        row = cursor.fetchone()
        if not row:
            return
        
        start_time = datetime.fromisoformat(row['session_start'])
        end_time = datetime.now()
        # Use max() to ensure at least 1 minute is recorded for any completed session
        duration = max(1, round((end_time - start_time).total_seconds() / 60))
        
        cursor.execute('''
            UPDATE session_logs 
            SET session_end = ?, duration_minutes = ?
            WHERE id = ?
        ''', (end_time.isoformat(), duration, session_id))
        self._get_connection().commit()
    
    def get_unsynced_sessions(self, limit: int = 100) -> List[Dict]:
        """Get unsynced session logs (completed sessions only)"""
        cursor = self._get_connection().cursor()
        cursor.execute('''
            SELECT * FROM session_logs 
            WHERE synced = 0 AND session_end IS NOT NULL
            LIMIT ?
        ''', (limit,))
        return [dict(row) for row in cursor.fetchall()]
    
    def get_active_sessions(self) -> List[Dict]:
        """Get active (ongoing) sessions"""
        cursor = self._get_connection().cursor()
        cursor.execute('''
            SELECT * FROM session_logs 
            WHERE session_end IS NULL
        ''')
        return [dict(row) for row in cursor.fetchall()]
    
    def mark_sessions_synced(self, ids: List[int]):
        """Mark sessions as synced"""
        if not ids:
            return
        cursor = self._get_connection().cursor()
        placeholders = ','.join('?' * len(ids))
        cursor.execute(f'UPDATE session_logs SET synced = 1 WHERE id IN ({placeholders})', ids)
        self._get_connection().commit()
    
    # ==================== Application Logs ====================
    
    def log_application(self, computer_id: str, username: str, app_name: str, 
                       window_title: str, start_time: str) -> int:
        """Log application usage start"""
        cursor = self._get_connection().cursor()
        cursor.execute('''
            INSERT INTO application_logs 
            (computer_id, username, application_name, window_title, start_time, synced)
            VALUES (?, ?, ?, ?, ?, 0)
        ''', (computer_id, username, app_name, window_title, start_time))
        self._get_connection().commit()
        return cursor.lastrowid
    
    def update_application_end(self, log_id: int, end_time: str, duration_seconds: int):
        """Update application log with end time and duration"""
        cursor = self._get_connection().cursor()
        cursor.execute('''
            UPDATE application_logs 
            SET end_time = ?, duration_seconds = ?
            WHERE id = ?
        ''', (end_time, duration_seconds, log_id))
        self._get_connection().commit()
    
    def get_unsynced_applications(self, limit: int = 100) -> List[Dict]:
        """Get unsynced application logs"""
        cursor = self._get_connection().cursor()
        cursor.execute('''
            SELECT * FROM application_logs 
            WHERE synced = 0 AND end_time IS NOT NULL
            LIMIT ?
        ''', (limit,))
        return [dict(row) for row in cursor.fetchall()]
    
    def mark_applications_synced(self, ids: List[int]):
        """Mark application logs as synced"""
        if not ids:
            return
        cursor = self._get_connection().cursor()
        placeholders = ','.join('?' * len(ids))
        cursor.execute(f'UPDATE application_logs SET synced = 1 WHERE id IN ({placeholders})', ids)
        self._get_connection().commit()
    
    # ==================== Website Logs ====================
    
    def log_website(self, computer_id: str, username: str, browser: str, 
                   url: str, page_title: str):
        """Log website visit"""
        cursor = self._get_connection().cursor()
        cursor.execute('''
            INSERT INTO website_logs 
            (computer_id, username, browser, url, page_title, visit_time, synced)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        ''', (computer_id, username, browser, url, page_title, datetime.now().isoformat()))
        self._get_connection().commit()
    
    def get_unsynced_websites(self, limit: int = 100) -> List[Dict]:
        """Get unsynced website logs"""
        cursor = self._get_connection().cursor()
        cursor.execute('''
            SELECT * FROM website_logs 
            WHERE synced = 0
            LIMIT ?
        ''', (limit,))
        return [dict(row) for row in cursor.fetchall()]
    
    def mark_websites_synced(self, ids: List[int]):
        """Mark website logs as synced"""
        if not ids:
            return
        cursor = self._get_connection().cursor()
        placeholders = ','.join('?' * len(ids))
        cursor.execute(f'UPDATE website_logs SET synced = 1 WHERE id IN ({placeholders})', ids)
        self._get_connection().commit()
    
    # ==================== Error Logs ====================
    
    def log_error(self, error_type: str, error_message: str, stack_trace: str = None):
        """Log error locally"""
        cursor = self._get_connection().cursor()
        cursor.execute('''
            INSERT INTO error_logs (error_type, error_message, stack_trace)
            VALUES (?, ?, ?)
        ''', (error_type, error_message, stack_trace))
        self._get_connection().commit()
    
    # ==================== Utility ====================
    
    def get_unsynced_counts(self) -> Dict[str, int]:
        """Get count of unsynced records by type"""
        cursor = self._get_connection().cursor()
        
        counts = {}
        
        cursor.execute('SELECT COUNT(*) as count FROM session_logs WHERE synced = 0 AND session_end IS NOT NULL')
        counts['sessions'] = cursor.fetchone()['count']
        
        cursor.execute('SELECT COUNT(*) as count FROM application_logs WHERE synced = 0 AND end_time IS NOT NULL')
        counts['applications'] = cursor.fetchone()['count']
        
        cursor.execute('SELECT COUNT(*) as count FROM website_logs WHERE synced = 0')
        counts['websites'] = cursor.fetchone()['count']
        
        return counts
    
    # ==================== User Linking ====================
    
    def get_linked_user_id(self) -> Optional[str]:
        """Get the linked user ID for this agent"""
        cursor = self._get_connection().cursor()
        cursor.execute('SELECT user_id FROM user_link ORDER BY id DESC LIMIT 1')
        row = cursor.fetchone()
        return row['user_id'] if row else None
    
    def save_linked_user_id(self, user_id: str):
        """Save the linked user ID"""
        cursor = self._get_connection().cursor()
        # Clear any existing links
        cursor.execute('DELETE FROM user_link')
        # Insert new link
        cursor.execute('''
            INSERT INTO user_link (user_id, linked_at)
            VALUES (?, ?)
        ''', (user_id, datetime.now().isoformat()))
        self._get_connection().commit()
        logger.info(f"User link saved: {user_id[:8]}...")
    
    def clear_user_link(self):
        """Clear the user link (for unlinking agent)"""
        cursor = self._get_connection().cursor()
        cursor.execute('DELETE FROM user_link')
        self._get_connection().commit()
        logger.info("User link cleared")
    
    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            self.connection = None
