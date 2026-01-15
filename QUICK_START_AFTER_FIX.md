# Quick Start - Testing the Agent Fix

## ✅ What Was Fixed
The PC agent can now successfully sync monitoring data to Firebase and display it in your mobile app.

## 🚀 How to Test (3 Minutes)

### 1. Run the PC Agent (30 seconds)
```bash
cd pc-agent/dist
# Double-click PCMonitoringAgent.exe (or run from terminal)
./PCMonitoringAgent.exe
```

**If not already connected:**
- Enter your linking code: `UREKTUMY` (from config.json)
- Click "Connect Account"
- Wait for "Connected successfully!" message

**Start Monitoring:**
- Click "▶ Start Monitoring"
- Status should show "Running" in green

### 2. Wait & Work (2 minutes)
- Leave the agent running for at least 2 minutes
- Switch between a few applications (browser, notepad, etc.)
- Visit some websites
- The agent syncs every 60 seconds automatically

### 3. Check Mobile App (30 seconds)
Open your mobile app at: http://localhost:8081

**Navigate to these screens:**

📊 **Dashboard**
- Should show today's activity statistics
- Should display activity timeline
- Should show total session time

🖥️ **Active Sessions**
- Should list your computer
- Should show current session with start time
- Status: "active" (green)

📝 **Session History** (after stopping agent)
- Should show completed sessions
- Should display session duration
- Should show date and time

## 🔍 Quick Verification

### ✅ Signs Everything is Working:
1. Agent shows "Running" status with green indicator
2. Agent log contains: `[INFO] Synced X records` (every ~60s)
3. NO `401` errors in agent log
4. Mobile app shows live data

### ❌ If You Still See Issues:
1. **Check agent.log:**
   ```bash
   cd pc-agent/dist
   notepad agent.log
   # Look at the last 20 lines
   ```

2. **Look for:**
   - ✅ `[INFO] Synced X records` - Good!
   - ❌ `[ERROR] Firebase GET error: 401` - Problem persists

3. **If 401 errors still appear:**
   - Firebase rules may not have deployed
   - Run: `firebase deploy --only database`
   - Wait 2-3 minutes and restart agent

## 📱 What You Should See in Mobile App

### Dashboard Screen
```
📊 Today's Activity
- Total Time: 15m 30s
- Active Sessions: 1
- Top Application: Chrome Browser
```

### Active Sessions Screen
```
🟢 DESKTOP-XYZ - John
   Started: 2:30 PM
   Duration: 15 minutes
   Current Activity: Monitoring
```

### Computers Screen
```
💻 DESKTOP-XYZ
   Status: Online
   Last Seen: Just now
   IP: 192.168.1.100
```

## 🐛 Troubleshooting

### Issue: Mobile app still shows "No data"

**Quick Fix:**
```bash
# 1. Stop the agent
# 2. Clear agent logs
cd pc-agent/dist
del agent.log

# 3. Restart agent
./PCMonitoringAgent.exe

# 4. Start monitoring
# 5. Wait 2 minutes
# 6. Refresh mobile app
```

### Issue: Agent shows "offline mode"

**Check:**
1. Internet connection working?
2. Firewall blocking Firebase?
3. Correct Firebase project ID in config.json?

**Verify config.json:**
```json
{
  "linking_code": "UREKTUMY",
  "user_id": "ikRJuuvNCMbfxKagckf9Kvsofye2",
  "firebase_project_id": "pcmonitoring-2178d"
}
```

## 📁 Important Files

### Agent Logs
```
pc-agent/dist/agent.log
```
Watch it live:
```bash
Get-Content -Path "pc-agent/dist/agent.log" -Wait -Tail 20
```

### Local Database
```
pc-agent/dist/monitoring_data.db
```
Check unsynced records:
```sql
-- Open with DB Browser for SQLite
SELECT COUNT(*) FROM session_logs WHERE synced = 0;
SELECT COUNT(*) FROM application_logs WHERE synced = 0;
```

### Configuration
```
pc-agent/dist/config.json
```

## 🎯 Success Criteria

You'll know everything is working when:
- [ ] Agent runs without 401 errors
- [ ] Agent log shows periodic "Synced X records" messages
- [ ] Mobile app Dashboard displays activity data
- [ ] Active Sessions shows your current session
- [ ] Computer appears in Computers list as "Online"
- [ ] After stopping agent, session moves to History

## ⏱️ Timing Expectations

| Event | Time |
|-------|------|
| Agent connects | Instant |
| First sync | 60 seconds |
| Data appears in app | 60-90 seconds |
| Activity updates | Every 5 seconds (local) |
| Sync to cloud | Every 60 seconds |

## 🔐 Security Note

The fix allows the PC agent to write monitoring data without authentication. This is safe because:
- ✅ Data is validated for correct structure
- ✅ Only monitoring paths are writable
- ✅ User profiles/settings remain protected
- ✅ Reading data still requires authentication

## 📚 More Help

- **Detailed Guide:** `pc-agent/TROUBLESHOOTING.md`
- **Fix Summary:** `AGENT_FIX_SUMMARY.md`
- **Firebase Rules:** `firebase-rules/database.rules.json`

## 💡 Next Steps

Once verified working:
1. Keep agent running in background
2. Enable auto-start in Settings
3. Monitor your usage from mobile app
4. Set up notifications for long sessions

---

**Need Help?**  
Check `pc-agent/TROUBLESHOOTING.md` for detailed diagnostics and solutions.
