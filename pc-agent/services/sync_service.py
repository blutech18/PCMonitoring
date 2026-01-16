"""
Cloud Synchronization Service
Uploads unsynced records to Firebase Realtime Database
Uses batch uploads and handles retries
Supports user-based data paths for multi-user authentication

Features:
- Offline-first: Always saves locally, syncs when online
- Auto-retry: Retries failed syncs automatically
- User isolation: Each user's data is separate
"""
import logging
import os
import socket
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import config

try:
    import firebase_admin
    from firebase_admin import credentials, db
    FIREBASE_AVAILABLE = True
except ImportError:
    firebase_admin = None
    db = None
    FIREBASE_AVAILABLE = False

logger = logging.getLogger(__name__)


class SyncService:
    def __init__(self, database):
        """Initialize sync service"""
        self.database = database
        self.rtdb = None
        self.initialized = False
        self.user_id = None  # User ID this agent is linked to
        self.offline_mode = False  # True when Firebase unavailable
        self.last_sync_attempt = None
        self.sync_failures = 0
    
    def is_online(self) -> bool:
        """Check if internet connection is available"""
        try:
            socket.create_connection(("8.8.8.8", 53), timeout=3)
            return True
        except OSError:
            return False
    
    def initialize(self) -> bool:
        """Initialize Firebase Admin SDK and resolve user ID from linking code"""
        try:
            if not FIREBASE_AVAILABLE:
                logger.warning("firebase-admin not installed - running in offline mode")
                self.offline_mode = True
                return False
            
            # Check internet connectivity first
            if not self.is_online():
                logger.warning("No internet connection - running in offline mode")
                self.offline_mode = True
                return False
            
            # Check if credentials file exists
            if not os.path.exists(config.FIREBASE_CREDENTIALS_PATH):
                logger.error(f"Firebase credentials not found: {config.FIREBASE_CREDENTIALS_PATH}")
                self.offline_mode = True
                return False
            
            # Check if already initialized
            try:
                firebase_admin.get_app()
                self.rtdb = db.reference()
                self.initialized = True
                logger.info("Firebase already initialized")
            except ValueError:
                # Initialize Firebase with Realtime Database
                cred = credentials.Certificate(config.FIREBASE_CREDENTIALS_PATH)
                firebase_admin.initialize_app(cred, {
                    'databaseURL': config.FIREBASE_DATABASE_URL
                })
                
                self.rtdb = db.reference()
                self.initialized = True
                logger.info("Firebase Realtime Database initialized")
            
            # Resolve user ID from linking code or config
            if not self._resolve_user_id():
                logger.error("Failed to resolve user ID - agent not linked to any user")
                self.offline_mode = True
                return False
            
            self.offline_mode = False
            self.sync_failures = 0
            return True
            
        except Exception as e:
            logger.error(f"Firebase initialization error: {e}")
            self.database.log_error("FirebaseInitError", str(e))
            self.offline_mode = True
            return False
    
    def _resolve_user_id(self) -> bool:
        """Resolve user ID from linking code or environment variable"""
        # First check if USER_ID is directly provided
        if config.USER_ID:
            self.user_id = config.USER_ID
            logger.info(f"Using configured USER_ID: {self.user_id[:8]}...")
            return True
        
        # Try to resolve from linking code
        if config.AGENT_LINKING_CODE:
            user_id = self._lookup_user_by_code(config.AGENT_LINKING_CODE)
            if user_id:
                self.user_id = user_id
                # Save to .env for future use
                self._save_user_id(user_id)
                logger.info(f"Resolved user ID from linking code: {user_id[:8]}...")
                return True
            else:
                logger.error(f"Invalid or expired linking code: {config.AGENT_LINKING_CODE}")
                return False
        
        # Check if we have a saved user ID in local database
        saved_user_id = self.database.get_linked_user_id()
        if saved_user_id:
            self.user_id = saved_user_id
            logger.info(f"Using saved user ID: {saved_user_id[:8]}...")
            return True
        
        logger.error("No USER_ID or AGENT_LINKING_CODE configured. Please link this agent to a user account.")
        logger.error("Get your linking code from the Settings page in the web app.")
        return False
    
    def _lookup_user_by_code(self, code: str) -> Optional[str]:
        """Look up user ID by agent linking code"""
        try:
            # Search all users for matching agent code
            users_ref = self.rtdb.child('users')
            users = users_ref.get()
            
            if not users:
                return None
            
            for user_id, user_data in users.items():
                if isinstance(user_data, dict):
                    agent_code = user_data.get('agentCode', {})
                    if isinstance(agent_code, dict):
                        if agent_code.get('code') == code and agent_code.get('active', False):
                            return user_id
            
            return None
        except Exception as e:
            logger.error(f"Error looking up user by code: {e}")
            return None
    
    def _save_user_id(self, user_id: str):
        """Save user ID to local database for future use"""
        try:
            self.database.save_linked_user_id(user_id)
        except Exception as e:
            logger.warning(f"Could not save user ID locally: {e}")
    
    def _get_user_path(self, path: str) -> str:
        """Get user-specific database path"""
        if not self.user_id:
            raise ValueError("User ID not set")
        return f"users/{self.user_id}/{path}"
    
    def _get_latest_activity(self, computer_id: str) -> Optional[str]:
        """Get the latest application activity for current session"""
        try:
            # Get the most recent unsynced application
            apps = self.database.get_unsynced_applications(limit=1)
            if apps and len(apps) > 0:
                app = apps[0]
                app_name = app.get('application_name', 'Unknown')
                window_title = app.get('window_title', '')
                
                # Format a user-friendly activity message
                if window_title:
                    # Clean up common app names
                    if 'chrome.exe' in app_name.lower():
                        return f"Browsing: {window_title}"
                    elif 'excel.exe' in app_name.lower():
                        return f"Excel: {window_title}"
                    elif 'winword.exe' in app_name.lower() or 'word' in app_name.lower():
                        return f"Word: {window_title}"
                    elif 'powerpnt.exe' in app_name.lower():
                        return f"PowerPoint: {window_title}"
                    elif 'code.exe' in app_name.lower():
                        return f"Coding: {window_title}"
                    elif 'explorer.exe' in app_name.lower():
                        return f"File Explorer: {window_title}"
                    else:
                        return f"{app_name}: {window_title}"
                else:
                    return f"Using {app_name}"
            
            return None
        except Exception as e:
            logger.debug(f"Error getting latest activity: {e}")
            return None
    
    def _cleanup_stale_active_sessions(self, computer_id: str):
        """Clean up ALL active sessions for this computer from Firebase on startup"""
        try:
            # Get all active sessions from Firebase
            active_sessions_path = self._get_user_path('sessions/active')
            active_sessions_ref = self.rtdb.child(active_sessions_path)
            active_sessions = active_sessions_ref.get()
            
            if not active_sessions or not isinstance(active_sessions, dict):
                logger.info("No active sessions to clean up")
                return
            
            # Delete ALL sessions belonging to this computer
            # This ensures a fresh start when the agent restarts
            cleanup_count = 0
            for session_id, session_data in active_sessions.items():
                if isinstance(session_data, dict):
                    session_computer_id = session_data.get('computerId')
                    
                    # Check if this session belongs to our computer
                    if session_computer_id == computer_id:
                        try:
                            # Delete this session from Firebase active list
                            session_ref = self.rtdb.child(f"{active_sessions_path}/{session_id}")
                            session_ref.delete()
                            cleanup_count += 1
                            logger.info(f"Cleaned up stale active session: {session_id}")
                        except Exception as e:
                            logger.warning(f"Error deleting session {session_id}: {e}")
                            continue
            
            if cleanup_count > 0:
                logger.info(f"Cleaned up {cleanup_count} stale active session(s) for this computer")
            else:
                logger.info("No stale sessions found for this computer")
                
        except Exception as e:
            logger.warning(f"Error cleaning up stale active sessions: {e}")
            # Don't fail the whole sync process if cleanup fails
    
    def sync_computer_registration(self, computer_id: str) -> bool:
        """Sync computer registration to Realtime Database (user-specific path)"""
        try:
            if not self.initialized:
                if not self.initialize():
                    return False
            
            # Check if already synced
            if self.database.is_computer_synced():
                # Clean up any stale active sessions for this computer on startup
                self._cleanup_stale_active_sessions(computer_id)
                return True
            
            # Get computer info from local database
            import socket
            computer_name = os.environ.get('COMPUTERNAME', 'Unknown')
            username = os.environ.get('USERNAME', 'Unknown')
            
            try:
                ip_address = socket.gethostbyname(socket.gethostname())
            except:
                ip_address = '127.0.0.1'
            
            # Upload to Realtime Database - users/{userId}/computers/{computer_id}
            computer_path = self._get_user_path(f'computers/{computer_id}')
            computer_ref = self.rtdb.child(computer_path)
            computer_ref.set({
                'id': computer_id,
                'name': f'{computer_name} - {username}',
                'ipAddress': ip_address,
                'status': 'online',
                'lastSeen': datetime.now().isoformat(),
                'registeredAt': datetime.now().isoformat()
            })
            
            # Mark as synced locally
            self.database.mark_computer_synced()
            
            # Clean up any stale active sessions for this computer on first registration
            self._cleanup_stale_active_sessions(computer_id)
            
            logger.info(f"Computer registration synced to user {self.user_id[:8]}...: {computer_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error syncing computer: {e}")
            self.database.log_error("ComputerSyncError", str(e))
            return False
    
    def sync_sessions(self, current_activity: str = None) -> int:
        """Sync session logs to Realtime Database (user-specific path)"""
        try:
            if not self.initialized:
                if not self.initialize():
                    return 0
            
            computer_id = self.database.get_computer_id()
            
            # Get computer name for sessions
            computer_name = os.environ.get('COMPUTERNAME', 'Unknown')
            username = os.environ.get('USERNAME', 'Unknown')
            full_computer_name = f'{computer_name} - {username}'
            
            total_synced = 0
            
            # 1. Sync active (ongoing) sessions to sessions/active/
            active_sessions = self.database.get_active_sessions()
            for session in active_sessions:
                session_id = f"{computer_id}_{session['id']}"
                
                # Use provided activity or get from latest application log
                activity = current_activity or self._get_latest_activity(computer_id) or 'Idle'
                
                session_data = {
                    'computerId': session['computer_id'],
                    'computerName': full_computer_name,
                    'userId': session['username'],
                    'userName': session['username'],
                    'startTime': session['session_start'],
                    'currentActivity': activity,
                    'status': 'active'
                }
                
                active_path = self._get_user_path(f'sessions/active/{session_id}')
                self.rtdb.child(active_path).set(session_data)
                total_synced += 1
            
            # 2. Sync completed sessions to sessions/history/ and remove from active
            completed_sessions = self.database.get_unsynced_sessions(config.SYNC_BATCH_SIZE)
            synced_ids = []
            
            if completed_sessions:
                logger.info(f"Found {len(completed_sessions)} completed session(s) to sync to history")
            
            for session in completed_sessions:
                session_id = f"{computer_id}_{session['id']}"
                duration = session.get('duration_minutes', 0)
                
                logger.info(f"Moving session {session_id} to history (duration: {duration} min)")
                
                session_data = {
                    'computerId': session['computer_id'],
                    'computerName': full_computer_name,
                    'userId': session['username'],
                    'userName': session['username'],
                    'startTime': session['session_start'],
                    'endTime': session['session_end'],
                    'totalDuration': duration,  # in minutes (not seconds)
                    'date': session['session_start'].split('T')[0],
                    'status': 'completed'
                }
                
                # Move to history
                history_path = self._get_user_path(f'sessions/history/{session_id}')
                self.rtdb.child(history_path).set(session_data)
                logger.info(f"Session {session_id} added to history")
                
                # Remove from active sessions to prevent stale data
                active_path = self._get_user_path(f'sessions/active/{session_id}')
                try:
                    self.rtdb.child(active_path).delete()
                    logger.info(f"Session {session_id} removed from active")
                except Exception as e:
                    # Ignore if doesn't exist
                    logger.debug(f"Could not delete active session {session_id}: {e}")
                
                synced_ids.append(session['id'])
                total_synced += 1
            
            # Mark completed sessions as synced locally
            if synced_ids:
                self.database.mark_sessions_synced(synced_ids)
            
            if total_synced > 0:
                logger.info(f"Synced {len(active_sessions)} active and {len(synced_ids)} completed sessions")
            
            return total_synced
            
        except Exception as e:
            logger.error(f"Error syncing sessions: {e}")
            self.database.log_error("SessionSyncError", str(e))
            return 0
    
    def sync_applications(self) -> int:
        """Sync application logs to Realtime Database (user-specific path)"""
        try:
            if not self.initialized:
                if not self.initialize():
                    return 0
            
            # Get unsynced applications
            apps = self.database.get_unsynced_applications(config.SYNC_BATCH_SIZE)
            if not apps:
                return 0
            
            synced_ids = []
            
            # Update current activity for active sessions
            for app in apps:
                activity_data = {
                    'applicationName': app['application_name'],
                    'windowTitle': app['window_title'],
                    'startTime': app['start_time'],
                    'endTime': app.get('end_time'),
                    'durationSeconds': app.get('duration_seconds', 0)
                }
                
                # Store in activities log - users/{userId}/activities/{activity_id}
                activity_id = f"{app['computer_id']}_{app['id']}"
                activity_path = self._get_user_path(f'activities/{activity_id}')
                self.rtdb.child(activity_path).set(activity_data)
                
                synced_ids.append(app['id'])
            
            # Mark as synced locally
            self.database.mark_applications_synced(synced_ids)
            
            logger.info(f"Synced {len(synced_ids)} application logs")
            return len(synced_ids)
            
        except Exception as e:
            logger.error(f"Error syncing applications: {e}")
            self.database.log_error("ApplicationSyncError", str(e))
            return 0
    
    def sync_websites(self) -> int:
        """Sync website logs to Realtime Database (user-specific path)"""
        try:
            if not self.initialized:
                if not self.initialize():
                    return 0
            
            # Get unsynced websites
            websites = self.database.get_unsynced_websites(config.SYNC_BATCH_SIZE)
            if not websites:
                return 0
            
            synced_ids = []
            
            for site in websites:
                website_data = {
                    'computerId': site['computer_id'],
                    'username': site['username'],
                    'browser': site['browser'],
                    'url': site['url'],
                    'pageTitle': site['page_title'],
                    'visitTime': site['visit_time'],
                    'createdAt': site['created_at']
                }
                
                # Store in websites log - users/{userId}/websites/{website_id}
                website_id = f"{site['computer_id']}_{site['id']}"
                website_path = self._get_user_path(f'websites/{website_id}')
                self.rtdb.child(website_path).set(website_data)
                
                synced_ids.append(site['id'])
            
            # Mark as synced locally
            self.database.mark_websites_synced(synced_ids)
            
            logger.info(f"Synced {len(synced_ids)} website logs")
            return len(synced_ids)
            
        except Exception as e:
            logger.error(f"Error syncing websites: {e}")
            self.database.log_error("WebsiteSyncError", str(e))
            return 0
    
    def sync_all(self, current_activity: str = None) -> Dict[str, int]:
        """Sync all unsynced records with offline handling"""
        results = {
            'sessions': 0,
            'applications': 0,
            'websites': 0,
            'offline': self.offline_mode
        }
        
        self.last_sync_attempt = datetime.now()
        
        try:
            # If in offline mode, try to reconnect periodically
            if self.offline_mode:
                # Check if we should retry
                retry_interval = getattr(config, 'SYNC_RETRY_INTERVAL', 300)
                if self.sync_failures > 0:
                    # Exponential backoff: wait longer after each failure
                    wait_time = min(retry_interval * (2 ** min(self.sync_failures - 1, 4)), 3600)
                    logger.debug(f"Offline mode - will retry in {wait_time}s")
                
                # Try to reconnect
                if self.is_online():
                    logger.info("Internet connection restored - attempting to reconnect")
                    if self.initialize():
                        logger.info("Reconnected to Firebase successfully")
                    else:
                        self.sync_failures += 1
                        return results
                else:
                    return results
            
            if not self.initialized:
                if not self.initialize():
                    self.sync_failures += 1
                    return results
            
            # Sync in order
            results['sessions'] = self.sync_sessions(current_activity=current_activity)
            results['applications'] = self.sync_applications()
            results['websites'] = self.sync_websites()
            results['offline'] = False
            
            total = results['sessions'] + results['applications'] + results['websites']
            if total > 0:
                logger.info(f"Total records synced: {total}")
                self.sync_failures = 0  # Reset on success
            
        except Exception as e:
            logger.error(f"Error in sync_all: {e}")
            self.database.log_error("SyncAllError", str(e))
            self.sync_failures += 1
            self.offline_mode = True
        
        return results
    
    def update_computer_status(self, computer_id: str, status: str = 'online'):
        """Update computer status in Realtime Database (user-specific path)"""
        try:
            if not self.initialized:
                return
            
            computer_path = self._get_user_path(f'computers/{computer_id}')
            computer_ref = self.rtdb.child(computer_path)
            computer_ref.update({
                'status': status,
                'lastSeen': datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error updating computer status: {e}")
    
    def get_sync_status(self) -> Dict:
        """Get synchronization status including offline info"""
        unsynced = self.database.get_unsynced_counts()
        return {
            'initialized': self.initialized,
            'offline_mode': self.offline_mode,
            'user_id': self.user_id[:8] + '...' if self.user_id else None,
            'sync_failures': self.sync_failures,
            'last_sync_attempt': self.last_sync_attempt.isoformat() if self.last_sync_attempt else None,
            'unsynced_counts': unsynced,
            'total_unsynced': sum(unsynced.values()),
            'is_online': self.is_online()
        }
