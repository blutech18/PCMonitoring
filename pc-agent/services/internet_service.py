"""
Internet Connectivity Detection Service
Periodically checks for internet access
"""
import logging
import requests
from typing import Callable, Optional
import config

logger = logging.getLogger(__name__)


class InternetService:
    def __init__(self):
        """Initialize internet service"""
        self.is_online = False
        self.last_check_result = False
        self.on_connection_restored: Optional[Callable] = None
    
    def check_connection(self) -> bool:
        """
        Check if internet connection is available
        Returns True if online, False otherwise
        """
        try:
            response = requests.get(
                config.INTERNET_CHECK_URL,
                timeout=config.INTERNET_CHECK_TIMEOUT
            )
            is_online = response.status_code == 200
            
            # Detect connection restored
            if is_online and not self.last_check_result:
                logger.info("Internet connection restored")
                if self.on_connection_restored:
                    self.on_connection_restored()
            
            # Detect connection lost
            elif not is_online and self.last_check_result:
                logger.warning("Internet connection lost")
            
            self.last_check_result = is_online
            self.is_online = is_online
            return is_online
            
        except requests.RequestException:
            if self.last_check_result:
                logger.warning("Internet connection lost")
            
            self.last_check_result = False
            self.is_online = False
            return False
        
        except Exception as e:
            logger.error(f"Error checking internet: {e}")
            self.is_online = False
            return False
    
    def set_connection_callback(self, callback: Callable):
        """Set callback function for when connection is restored"""
        self.on_connection_restored = callback
    
    def get_status(self) -> dict:
        """Get current connection status"""
        return {
            'is_online': self.is_online,
            'check_url': config.INTERNET_CHECK_URL
        }
