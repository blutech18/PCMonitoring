@echo off
echo ========================================
echo PC Monitoring Agent - Build Script
echo ========================================
echo.

REM Check if PyInstaller is installed
python -c "import PyInstaller" 2>nul
if errorlevel 1 (
    echo PyInstaller not found. Installing...
    pip install pyinstaller
    echo.
)

echo Building PCMonitoringAgent.exe...
echo.

REM Build the executable
REM Build the executable
python -m PyInstaller --onefile ^
    --name=PCMonitoringAgent ^
    --windowed ^
    --icon=NONE ^
    --add-data "config.py;." ^
    --hidden-import=win32timezone ^
    --hidden-import=pywintypes ^
    --hidden-import=win32api ^
    --hidden-import=win32con ^
    --hidden-import=win32process ^
    gui_app.py

if errorlevel 1 (
    echo.
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo Executable location: dist\PCMonitoringAgent.exe
echo.
pause
