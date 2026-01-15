"""
Website Monitor Module
Tracks active browser tab for Chrome and Edge
Records website URL and timestamp
"""
import logging
import re
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

# Supported browsers
SUPPORTED_BROWSERS = {
    'chrome.exe': 'Google Chrome',
    'msedge.exe': 'Microsoft Edge'
}


class WebsiteMonitor:
    def __init__(self, database, computer_id: str):
        """Initialize website monitor"""
        self.database = database
        self.computer_id = computer_id
        self.current_username: Optional[str] = None
        
        # Current website tracking
        self.last_url: Optional[str] = None
        self.last_browser: Optional[str] = None
    
    def set_username(self, username: str):
        """Set current username for logging"""
        self.current_username = username
    
    def _is_browser_window(self, process_name: str) -> bool:
        """Check if process is a supported browser"""
        return process_name.lower() in SUPPORTED_BROWSERS
    
    def _get_browser_name(self, process_name: str) -> str:
        """Get friendly browser name"""
        return SUPPORTED_BROWSERS.get(process_name.lower(), process_name)
    
    def _extract_url_from_title(self, window_title: str, browser: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Extract URL and page title from browser window title
        Browser window titles typically show: "Page Title - Browser Name"
        For some pages with URL visible: "Page Title - URL - Browser Name"
        """
        try:
            if not window_title:
                return None, None
            
            # Remove browser name suffix
            title = window_title
            for browser_suffix in ['- Google Chrome', '- Microsoft Edge', '— Mozilla Firefox']:
                if title.endswith(browser_suffix):
                    title = title[:-len(browser_suffix)].strip()
                    break
            
            # The remaining text is the page title
            # We can't get the actual URL from window title alone
            # But we can detect if it looks like a URL pattern
            page_title = title
            
            # Try to detect URL patterns in title (some pages show URL)
            url_pattern = r'https?://[^\s]+'
            url_match = re.search(url_pattern, title)
            
            if url_match:
                url = url_match.group()
                page_title = title.replace(url, '').strip(' -')
            else:
                # Use page title as identifier (actual URL requires browser extension)
                url = f"page://{self._sanitize_title(page_title)}"
            
            return url, page_title
            
        except Exception as e:
            logger.error(f"Error extracting URL: {e}")
            return None, None
    
    def _sanitize_title(self, title: str) -> str:
        """Sanitize title for use as URL-like identifier"""
        # Remove special characters and limit length
        sanitized = re.sub(r'[^\w\s-]', '', title)
        sanitized = re.sub(r'\s+', '-', sanitized)
        return sanitized[:100].lower()
    
    def check_and_log(self) -> bool:
        """Check current browser tab and log if changed"""
        try:
            if not self.current_username:
                return False
            
            if not win32gui:
                return False
            
            # Get foreground window
            hwnd = win32gui.GetForegroundWindow()
            if not hwnd:
                return False
            
            # Get process info
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            
            try:
                process = psutil.Process(pid)
                process_name = process.name()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                return False
            
            # Check if it's a browser
            if not self._is_browser_window(process_name):
                return False
            
            # Get window title
            window_title = win32gui.GetWindowText(hwnd)
            if not window_title:
                return False
            
            browser_name = self._get_browser_name(process_name)
            url, page_title = self._extract_url_from_title(window_title, browser_name)
            
            if not url:
                return False
            
            # Check if URL changed
            if url == self.last_url and browser_name == self.last_browser:
                return False
            
            # Log new website visit
            self.last_url = url
            self.last_browser = browser_name
            
            self.database.log_website(
                self.computer_id,
                self.current_username,
                browser_name,
                url,
                page_title
            )
            
            logger.debug(f"Website logged: {page_title} ({browser_name})")
            return True
            
        except Exception as e:
            logger.error(f"Error in website check: {e}")
            self.database.log_error("WebsiteCheckError", str(e))
            return False
    
    def stop(self):
        """Stop monitoring"""
        self.last_url = None
        self.last_browser = None
    
    def get_current_website_info(self) -> dict:
        """Get current website information"""
        return {
            'browser': self.last_browser,
            'url': self.last_url
        }
