"""
Application Monitor Module
Detects the active foreground application
Records application name and usage duration
Tracks only foreground applications
"""
import logging
from datetime import datetime
from typing import Optional, Tuple

try:
    import win32gui
    import win32process
    import psutil
except ImportError:
    win32gui = None
    win32process = None
    psutil = None

logger = logging.getLogger(__name__)


class ApplicationMonitor:
    def __init__(self, database, computer_id: str):
        """Initialize application monitor"""
        self.database = database
        self.computer_id = computer_id
        self.current_username: Optional[str] = None
        
        # Current application tracking
        self.current_app_name: Optional[str] = None
        self.current_window_title: Optional[str] = None
        self.current_log_id: Optional[int] = None
        self.app_start_time: Optional[datetime] = None
    
    def set_username(self, username: str):
        """Set current username for logging"""
        self.current_username = username
    
    def get_active_window(self) -> Tuple[Optional[str], Optional[str]]:
        """Get the currently active foreground window"""
        try:
            if not win32gui:
                return None, None
            
            # Get foreground window handle
            hwnd = win32gui.GetForegroundWindow()
            if not hwnd:
                return None, None
            
            # Get window title
            window_title = win32gui.GetWindowText(hwnd)
            
            # Get process ID
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            
            # Get process name
            try:
                process = psutil.Process(pid)
                app_name = process.name()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                app_name = "Unknown"
            
            return app_name, window_title
            
        except Exception as e:
            logger.error(f"Error getting active window: {e}")
            return None, None
    
    def check_and_log(self) -> bool:
        """Check current application and log if changed"""
        try:
            if not self.current_username:
                return False
            
            app_name, window_title = self.get_active_window()
            
            if not app_name:
                return False
            
            # Check if application changed
            if app_name != self.current_app_name:
                # End previous application log
                self._end_current_app()
                
                # Start new application log
                self._start_new_app(app_name, window_title)
                return True
            
            # Same app, but window title might have changed
            elif window_title != self.current_window_title:
                self.current_window_title = window_title
            
            return False
            
        except Exception as e:
            logger.error(f"Error in application check: {e}")
            self.database.log_error("ApplicationCheckError", str(e))
            return False
    
    def _start_new_app(self, app_name: str, window_title: str):
        """Start logging a new application"""
        try:
            self.current_app_name = app_name
            self.current_window_title = window_title
            self.app_start_time = datetime.now()
            
            self.current_log_id = self.database.log_application(
                self.computer_id,
                self.current_username,
                app_name,
                window_title,
                self.app_start_time.isoformat()
            )
            
            logger.debug(f"Started tracking: {app_name}")
            
        except Exception as e:
            logger.error(f"Error starting app log: {e}")
    
    def _end_current_app(self):
        """End logging for current application"""
        try:
            if not self.current_log_id or not self.app_start_time:
                return
            
            end_time = datetime.now()
            duration = int((end_time - self.app_start_time).total_seconds())
            
            # Only log if duration is at least 1 second
            if duration >= 1:
                self.database.update_application_end(
                    self.current_log_id,
                    end_time.isoformat(),
                    duration
                )
                logger.debug(f"Ended tracking: {self.current_app_name} ({duration}s)")
            
            self.current_log_id = None
            self.app_start_time = None
            
        except Exception as e:
            logger.error(f"Error ending app log: {e}")
    
    def stop(self):
        """Stop monitoring and finalize current application"""
        self._end_current_app()
        self.current_app_name = None
        self.current_window_title = None
    
    def get_current_app_info(self) -> dict:
        """Get current application information"""
        return {
            'app_name': self.current_app_name,
            'window_title': self.current_window_title,
            'duration_seconds': int((datetime.now() - self.app_start_time).total_seconds()) 
                               if self.app_start_time else 0
        }
