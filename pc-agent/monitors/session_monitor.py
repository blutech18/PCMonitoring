"""
Session Monitor Module
Detects Windows user login and logout events
Records session start time, end time, and duration
"""
import getpass
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


class SessionMonitor:
    def __init__(self, database, computer_id: str):
        """Initialize session monitor"""
        self.database = database
        self.computer_id = computer_id
        self.current_session_id: Optional[int] = None
        self.current_username: Optional[str] = None
        self.session_start_time: Optional[datetime] = None
    
    def get_current_username(self) -> str:
        """Get the currently logged-in Windows username"""
        try:
            return getpass.getuser()
        except Exception as e:
            logger.error(f"Error getting username: {e}")
            return "Unknown"
    
    def start_session(self) -> bool:
        """Start a new monitoring session for current user"""
        try:
            username = self.get_current_username()
            
            # Don't start duplicate session
            if self.current_session_id and self.current_username == username:
                return False
            
            # End previous session if exists
            if self.current_session_id:
                self.end_session()
            
            # Start new session
            self.current_username = username
            self.session_start_time = datetime.now()
            self.current_session_id = self.database.start_session(
                self.computer_id, 
                username
            )
            
            logger.info(f"Session started for user: {username}")
            return True
            
        except Exception as e:
            logger.error(f"Error starting session: {e}")
            self.database.log_error("SessionStartError", str(e))
            return False
    
    def end_session(self) -> bool:
        """End the current monitoring session"""
        try:
            if not self.current_session_id:
                return False
            
            self.database.end_session(self.current_session_id)
            
            logger.info(f"Session ended for user: {self.current_username}")
            
            self.current_session_id = None
            self.current_username = None
            self.session_start_time = None
            
            return True
            
        except Exception as e:
            logger.error(f"Error ending session: {e}")
            self.database.log_error("SessionEndError", str(e))
            return False
    
    def check_user_change(self) -> bool:
        """Check if user has changed (for multi-user scenarios)"""
        try:
            current_user = self.get_current_username()
            
            if self.current_username and current_user != self.current_username:
                logger.info(f"User changed from {self.current_username} to {current_user}")
                self.end_session()
                self.start_session()
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking user change: {e}")
            return False
    
    def get_session_info(self) -> dict:
        """Get current session information"""
        return {
            'session_id': self.current_session_id,
            'username': self.current_username,
            'start_time': self.session_start_time.isoformat() if self.session_start_time else None,
            'duration_minutes': int((datetime.now() - self.session_start_time).total_seconds() / 60) 
                               if self.session_start_time else 0
        }
