# PC Monitoring Agent

Windows PC monitoring agent with offline-first architecture.

## Features

- **Computer Registration**: Generates unique UUID for each computer
- **Session Monitoring**: Detects Windows user login/logout, records session duration
- **Application Monitoring**: Tracks foreground applications and usage duration
- **Website Monitoring**: Tracks browser tabs (Chrome & Edge)
- **Offline Recording**: Stores all data locally in SQLite
- **Auto-Sync**: Automatically syncs to Firebase Firestore when online

## Requirements

- Windows 10/11
- Python 3.10+
- Firebase project with Firestore enabled

## Installation

### 1. Install Python

Download Python 3.10+ from [python.org](https://www.python.org/downloads/)

**Important**: Check "Add Python to PATH" during installation.

### 2. Install Dependencies

```bash
cd pc-agent
pip install -r requirements.txt
```

### 3. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **"Generate new private key"**
5. Save as `firebase-credentials.json` in the `pc-agent` folder

### 4. Enable Firestore

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** for development
4. Select your region

### 5. Configure Agent

```bash
copy .env.example .env
```

Edit `.env` if needed (defaults work for most cases).

## Usage

### Run Manually

```bash
python agent.py
```

### Run as Background Service

See "Auto-Start Setup" section below.

## Project Structure

```
pc-agent/
├── agent.py              # Main entry point
├── config.py             # Configuration settings
├── database.py           # SQLite database module
├── requirements.txt      # Python dependencies
├── .env.example          # Environment template
├── monitors/
│   ├── __init__.py
│   ├── session_monitor.py    # Login/logout detection
│   ├── application_monitor.py # Foreground app tracking
│   └── website_monitor.py    # Browser tab tracking
└── services/
    ├── __init__.py
    ├── internet_service.py   # Connectivity detection
    └── sync_service.py       # Firebase sync
```

## SQLite Schema

### computer
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| computer_id | TEXT | Unique UUID |
| computer_name | TEXT | Windows computer name |
| registered_at | TEXT | Registration timestamp |
| synced | INTEGER | Sync flag (0/1) |

### session_logs
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| computer_id | TEXT | Computer UUID |
| username | TEXT | Windows username |
| session_start | TEXT | Login timestamp |
| session_end | TEXT | Logout timestamp |
| duration_minutes | INTEGER | Session duration |
| synced | INTEGER | Sync flag (0/1) |

### application_logs
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| computer_id | TEXT | Computer UUID |
| username | TEXT | Windows username |
| application_name | TEXT | Process name |
| window_title | TEXT | Window title |
| start_time | TEXT | Start timestamp |
| end_time | TEXT | End timestamp |
| duration_seconds | INTEGER | Usage duration |
| synced | INTEGER | Sync flag (0/1) |

### website_logs
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| computer_id | TEXT | Computer UUID |
| username | TEXT | Windows username |
| browser | TEXT | Browser name |
| url | TEXT | Page URL/identifier |
| page_title | TEXT | Page title |
| visit_time | TEXT | Visit timestamp |
| synced | INTEGER | Sync flag (0/1) |

## Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| MONITORING_INTERVAL | 5 | Seconds between checks |
| SYNC_INTERVAL | 60 | Seconds between sync attempts |
| SYNC_BATCH_SIZE | 100 | Records per batch upload |
| LOG_LEVEL | INFO | Logging verbosity |

## Auto-Start Setup

### Using Task Scheduler

1. Open **Task Scheduler** (`taskschd.msc`)
2. Click **"Create Task"**
3. **General** tab:
   - Name: `PC Monitoring Agent`
   - Check "Run with highest privileges"
   - Check "Run whether user is logged on or not"
4. **Triggers** tab:
   - New → "At startup"
5. **Actions** tab:
   - Program: `C:\Python310\python.exe`
   - Arguments: `agent.py`
   - Start in: `C:\path\to\pc-agent`
6. **Settings** tab:
   - Uncheck "Stop the task if it runs longer than"

## Firestore Collections

The agent syncs data to these Firestore collections:

- `computers` - Registered computers
- `session_logs` - Login/logout sessions
- `application_logs` - Application usage
- `website_logs` - Website visits

## Error Handling

- All errors are logged to `agent.log`
- Errors are also stored in local SQLite `error_logs` table
- Agent continues running even if individual operations fail
- Failed syncs are automatically retried

## Privacy & Ethics

This agent is designed for **ethical monitoring** in educational environments:

**What it monitors:**
- Foreground application names
- Browser page titles
- Session times

**What it does NOT monitor:**
- Screenshots or screen capture
- Keystrokes
- Printing activity
- Photos or camera
- Idle time
- Remote access

## Troubleshooting

### Agent won't start
- Ensure Python 3.10+ is installed
- Run `pip install -r requirements.txt`
- Check `agent.log` for errors

### No data syncing
- Verify `firebase-credentials.json` exists
- Check internet connection
- Ensure Firestore is enabled in Firebase
- Check `agent.log` for sync errors

### High CPU usage
- Increase `MONITORING_INTERVAL` in `.env`

## License

For educational use only.
