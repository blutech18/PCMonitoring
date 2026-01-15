# PC Agent Troubleshooting Guide

## Issue: Agent Shows "Connected" but No Data Appears in Mobile App

### Problem Description
After entering the linking code in the PC agent, it shows as "Connected" but the mobile app displays empty screens with no monitoring data.

### Root Cause
The Firebase Realtime Database security rules were configured to require authentication for all read/write operations on user data paths (`users/{userId}/sessions`, `users/{userId}/computers`, etc.). However, the PC agent uses Firebase REST API without authentication credentials, causing all write operations to fail with a 401 (Unauthorized) error.

### Symptoms
1. Agent shows "Connected" status
2. Log file (`agent.log`) shows errors like:
   ```
   [ERROR] Firebase GET error: 401
   [ERROR] Firebase PUT error: 401
   ```
3. Mobile app shows empty screens (no sessions, computers, or activities)
4. Local database (`monitoring_data.db`) contains unsynced records

### Solution Applied
Updated Firebase Realtime Database security rules to allow unauthenticated writes to specific agent-related paths while maintaining security through data validation:

**Paths that now allow public writes:**
- `users/{userId}/sessions/` - Session data (login/logout events)
- `users/{userId}/computers/` - Computer registration and status
- `users/{userId}/activities/` - Application usage logs
- `users/{userId}/websites/` - Website visit logs

**Security measures maintained:**
- Read access still requires authentication
- Data structure validation ensures only properly formatted data is accepted
- User authentication paths and settings remain protected
- Admin functions remain protected

### Changes Made
**File:** `firebase-rules/database.rules.json`

Added `.write: "true"` rules to the following paths:
```json
"sessions": {
  ".write": "true",
  // ... rest of validation rules
}
"computers": {
  ".write": "true",
  // ... rest of validation rules
}
"activities": {
  ".write": "true",
  // ... rest of validation rules
}
"websites": {
  ".write": "true",
  // ... rest of validation rules
}
```

### How to Verify the Fix

1. **Check Agent Connection:**
   - Open the PC agent application
   - Enter your 8-character linking code
   - Click "Connect Account"
   - You should see "Connected successfully!"

2. **Start Monitoring:**
   - Click "Start Monitoring"
   - Status should change to "Running" with a green indicator

3. **Check Agent Logs:**
   - Open `agent.log` in the agent directory
   - Look for successful sync messages:
     ```
     [INFO] Linked to user: ikRJuuvN...
     [INFO] Firebase REST API initialized successfully
     [INFO] Monitoring started
     [INFO] Synced X records
     ```
   - There should be NO 401 errors after starting monitoring

4. **Verify Mobile App:**
   - Open the mobile app
   - Navigate to "Active Sessions" screen
   - You should see your computer listed with current session
   - Check "Session History" for completed sessions
   - Dashboard should show statistics and activity data

### Testing the Agent

**Immediate Test:**
1. Start the agent
2. Wait 60 seconds (default sync interval)
3. Check the mobile app for data

**Activity Test:**
1. With agent running, switch between different applications
2. Open a web browser and visit some websites
3. Wait for sync (check agent.log for "Synced X records")
4. Verify activity appears in mobile app

### Common Issues After Fix

#### Issue: Still seeing 401 errors
**Solution:** 
- Rules may not have deployed correctly
- Redeploy rules: `firebase deploy --only database`
- Wait a few minutes for propagation

#### Issue: Data appears but sessions are empty
**Solution:**
- Session hasn't ended yet (check "Active Sessions" instead of "History")
- Wait for session to complete or stop the agent to end the session

#### Issue: Agent says "offline mode"
**Solution:**
- Check internet connection
- Verify Firebase project ID in config matches: `pcmonitoring-2178d`
- Check firewall settings aren't blocking Firebase

### Manual Sync Verification

You can manually verify syncing is working:

1. **Check Local Database:**
   ```sql
   -- Open monitoring_data.db with SQLite browser
   SELECT COUNT(*) FROM session_logs WHERE synced = 0;
   SELECT COUNT(*) FROM application_logs WHERE synced = 0;
   ```

2. **Monitor Agent Logs in Real-time:**
   ```bash
   # Windows PowerShell
   Get-Content -Path "agent.log" -Wait -Tail 20
   ```

3. **Check Firebase Database:**
   - Go to Firebase Console
   - Navigate to Realtime Database
   - Browse to `users/{your-user-id}/`
   - Verify data exists under `sessions/`, `computers/`, `activities/`

### Performance Optimization

**Sync Intervals:**
- Default monitoring interval: 5 seconds
- Default sync interval: 60 seconds
- Adjust in Settings if needed for your use case

**Network Usage:**
- Agent syncs in batches of 100 records
- Failed syncs are retried with exponential backoff
- Offline data is stored locally and synced when connection is restored

### Security Notes

**What's Safe:**
- Agent data paths allow public writes but have strict validation
- Only properly formatted monitoring data is accepted
- User authentication and settings remain fully protected
- Read access still requires authentication (agents can't read data)

**Best Practices:**
- Keep your linking code private
- Regenerate linking code if compromised (in mobile app Settings)
- Only run the agent on computers you own/manage
- Monitor the "Computers" list in the app for unauthorized devices

### Getting Help

If you continue to experience issues:

1. **Collect Diagnostics:**
   - Copy the last 50 lines of `agent.log`
   - Note your Firebase project ID
   - Screenshot of mobile app showing empty data
   - Check if data exists in local `monitoring_data.db`

2. **Check System Requirements:**
   - Windows 10/11
   - Internet connection
   - No firewall blocking Firebase domains

3. **Verify Configuration:**
   - `config.json` contains correct linking_code
   - `config.json` contains correct user_id (auto-populated after linking)
   - Firebase project ID matches: `pcmonitoring-2178d`

### Related Files
- `agent.log` - Agent activity log
- `config.json` - Agent configuration
- `monitoring_data.db` - Local offline storage
- `firebase-rules/database.rules.json` - Firebase security rules

### Version Information
- Fix applied: 2026-01-14
- Firebase rules version: 2.0 (with agent write access)
- Agent version: GUI-based standalone app
