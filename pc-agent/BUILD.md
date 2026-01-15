# Building the Standalone .exe

## Build Command

```bash
pip install pyinstaller psutil requests
python -m PyInstaller --onefile --windowed --name PCMonitoringAgent --clean gui_app.py
```

## Output

`dist/PCMonitoringAgent.exe` - Standalone installer (no Python needed)

## Distribution

Just distribute the .exe file! No additional files needed.
The app uses Firebase REST API with public config - no credentials file required.

Users just run the .exe and enter their linking code from the mobile app Settings.
