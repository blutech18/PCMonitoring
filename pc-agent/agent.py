"""
PC Monitoring Agent
Main entry point for the Windows PC monitoring application
Runs in background and records computer usage data
"""
import sys
import time
import signal
import logging
import threading
from datetime import datetime

import config
from database import Database
from monitors import SessionMonitor, ApplicationMonitor, WebsiteMonitor
from services import InternetService, SyncService

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(config.LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class PCMonitoringAgent:
    """Main PC Monitoring Agent class"""
    
    def __init__(self):
        self.running = False
        self.computer_id = None
        
        # Components
        self.database = None
        self.session_monitor = None
        self.application_monitor = None
        self.website_monitor = None
        self.internet_service = None
        self.sync_service = None
        
        # Sync thread
        self.sync_thread = None
        self.last_sync_time = None
    
    def initialize(self) -> bool:
        """Initialize all components"""
        logger.info("=" * 60)
        logger.info("PC Monitoring Agent - Initializing")
        logger.info("=" * 60)
        
        try:
            # Initialize database
            logger.info("Initializing local database...")
            self.database = Database()
            
            # Register computer (get or create UUID)
            logger.info("Registering computer...")
            self.computer_id = self.database.register_computer()
            logger.info(f"Computer ID: {self.computer_id}")
            
            # Initialize monitors
            logger.info("Initializing monitors...")
            self.session_monitor = SessionMonitor(self.database, self.computer_id)
            self.application_monitor = ApplicationMonitor(self.database, self.computer_id)
            self.website_monitor = WebsiteMonitor(self.database, self.computer_id)
            
            # Initialize services
            logger.info("Initializing services...")
            self.internet_service = InternetService()
            self.sync_service = SyncService(self.database)
            
            # Set callback for when internet is restored
            self.internet_service.set_connection_callback(self._on_connection_restored)
            
            logger.info("=" * 60)
            logger.info("Initialization complete")
            logger.info("=" * 60)
            
            return True
            
        except Exception as e:
            logger.error(f"Initialization failed: {e}")
            if self.database:
                self.database.log_error("InitializationError", str(e))
            return False
    
    def _on_connection_restored(self):
        """Callback when internet connection is restored"""
        logger.info("Connection restored - triggering sync")
        self._perform_sync()
    
    def _perform_sync(self):
        """Perform data synchronization"""
        try:
            if not self.internet_service.is_online:
                return
            
            # Sync computer registration first
            self.sync_service.sync_computer_registration(self.computer_id)
            
            # Get current activity from application monitor
            current_activity = None
            if self.application_monitor and self.application_monitor.current_app_name:
                app_info = self.application_monitor.get_current_app_info()
                app_name = app_info.get('app_name', '')
                window_title = app_info.get('window_title', '')
                
                # Format activity message
                if window_title:
                    if 'chrome.exe' in app_name.lower():
                        current_activity = f"Browsing: {window_title}"
                    elif 'excel.exe' in app_name.lower():
                        current_activity = f"Excel: {window_title}"
                    elif 'winword.exe' in app_name.lower() or 'word' in app_name.lower():
                        current_activity = f"Word: {window_title}"
                    elif 'powerpnt.exe' in app_name.lower():
                        current_activity = f"PowerPoint: {window_title}"
                    elif 'code.exe' in app_name.lower():
                        current_activity = f"Coding: {window_title}"
                    elif 'explorer.exe' in app_name.lower():
                        current_activity = f"File Explorer: {window_title}"
                    else:
                        current_activity = f"{app_name}: {window_title}"
                else:
                    current_activity = f"Using {app_name}"
            
            # Sync all data with current activity
            results = self.sync_service.sync_all(current_activity=current_activity)
            
            # Update computer status
            self.sync_service.update_computer_status(self.computer_id, 'online')
            
            self.last_sync_time = datetime.now()
            
        except Exception as e:
            logger.error(f"Sync error: {e}")
            self.database.log_error("SyncError", str(e))
    
    def _sync_loop(self):
        """Background thread for periodic sync"""
        while self.running:
            try:
                # Check internet connection
                is_online = self.internet_service.check_connection()
                
                if is_online:
                    # Check if it's time to sync
                    should_sync = (
                        self.last_sync_time is None or
                        (datetime.now() - self.last_sync_time).total_seconds() >= config.SYNC_INTERVAL
                    )
                    
                    if should_sync:
                        self._perform_sync()
                
                # Wait before next check
                time.sleep(config.SYNC_INTERVAL)
                
            except Exception as e:
                logger.error(f"Sync loop error: {e}")
                time.sleep(config.SYNC_INTERVAL)
    
    def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.running:
            try:
                # Check for user changes
                self.session_monitor.check_user_change()
                
                # Update username for other monitors
                username = self.session_monitor.current_username
                self.application_monitor.set_username(username)
                self.website_monitor.set_username(username)
                
                # Check and log application usage
                self.application_monitor.check_and_log()
                
                # Check and log website usage
                self.website_monitor.check_and_log()
                
                # Wait before next check
                time.sleep(config.MONITORING_INTERVAL)
                
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                self.database.log_error("MonitoringLoopError", str(e))
                time.sleep(config.MONITORING_INTERVAL)
    
    def start(self):
        """Start the monitoring agent"""
        if not self.initialize():
            logger.error("Failed to initialize agent")
            return False
        
        self.running = True
        
        # Start session
        logger.info("Starting monitoring session...")
        self.session_monitor.start_session()
        
        # Start sync thread
        logger.info("Starting sync service...")
        self.sync_thread = threading.Thread(target=self._sync_loop, daemon=True)
        self.sync_thread.start()
        
        # Initial sync attempt
        if self.internet_service.check_connection():
            self._perform_sync()
        
        logger.info("Agent started - monitoring active")
        logger.info(f"Monitoring interval: {config.MONITORING_INTERVAL}s")
        logger.info(f"Sync interval: {config.SYNC_INTERVAL}s")
        
        # Run main monitoring loop
        self._monitoring_loop()
        
        return True
    
    def stop(self):
        """Stop the monitoring agent"""
        logger.info("Stopping agent...")
        self.running = False
        
        try:
            # Stop monitors
            if self.application_monitor:
                self.application_monitor.stop()
            
            if self.website_monitor:
                self.website_monitor.stop()
            
            # End session
            if self.session_monitor:
                self.session_monitor.end_session()
            
            # Final sync attempt - critical to move session to history
            if self.internet_service and self.internet_service.check_connection():
                logger.info("Performing final sync to move session to history...")
                self._perform_sync()
                # Give sync a moment to complete
                time.sleep(1)
                logger.info("Final sync completed")
                self.sync_service.update_computer_status(self.computer_id, 'offline')
            else:
                logger.warning("No internet connection - session will sync on next startup")
            
            # Close database
            if self.database:
                self.database.close()
            
            logger.info("Agent stopped - session moved to history")
            
        except Exception as e:
            logger.error(f"Error stopping agent: {e}")
    
    def get_status(self) -> dict:
        """Get current agent status"""
        return {
            'running': self.running,
            'computer_id': self.computer_id,
            'session': self.session_monitor.get_session_info() if self.session_monitor else None,
            'current_app': self.application_monitor.get_current_app_info() if self.application_monitor else None,
            'current_website': self.website_monitor.get_current_website_info() if self.website_monitor else None,
            'internet': self.internet_service.get_status() if self.internet_service else None,
            'sync': self.sync_service.get_sync_status() if self.sync_service else None,
            'last_sync': self.last_sync_time.isoformat() if self.last_sync_time else None
        }


def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info("Shutdown signal received")
    if agent:
        agent.stop()
    sys.exit(0)


# Global agent instance
agent = None


def main():
    """Main entry point"""
    global agent
    
    print("\n" + "=" * 60)
    print("PC Monitoring Agent")
    print("Automated Computer Usage Monitoring System")
    print("=" * 60 + "\n")
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Create and start agent
    agent = PCMonitoringAgent()
    
    try:
        agent.start()
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    finally:
        if agent:
            agent.stop()


if __name__ == "__main__":
    main()
