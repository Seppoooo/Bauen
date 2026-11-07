@echo off
cd /d "%~dp0"
where py >nul 2>nul && (set PY=py) || (set PY=python)
%PY% -m pip install --quiet --disable-pip-version-check -r requirements.txt
%PY% -m race_engineer %*
pause
