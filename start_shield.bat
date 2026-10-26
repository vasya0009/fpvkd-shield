@echo off
REM FPV Kamikaze Drone - anti-crash shield for the dedicated-server browser.
REM Launch the GAME first (to the main menu), THEN run this. Keep this window open while you play.
REM Requires: Python with frida  ->  pip install frida
cd /d "%~dp0"
echo [shield] waiting to attach to FPVKamikazeDrone-Win64-Shipping.exe ...
python "%~dp0shield_runner.py" 3600
echo [shield] stopped.
pause
