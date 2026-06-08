@echo off
title Space Delivery - Chrome

:: CONFIGURATION - adapte selon ton setup
:: 2 ecrans : 3840   3 ecrans : 5760
set LARGEUR=5760
set HAUTEUR=1200
set PORT=5500
set URL=http://localhost:%PORT%/index.html

set "CHROME="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if "%CHROME%"=="" (
    echo Chrome introuvable.
    pause
    exit /b 1
)

echo Lancement du serveur sur le port %PORT%...

where npx >nul 2>&1
if %errorlevel%==0 (
    echo Node.js detecte
    start "ServeurSD" cmd /c "npx http-server -p %PORT% -c-1 ."
    goto :ATTENDRE
)

where python >nul 2>&1
if %errorlevel%==0 (
    echo Python detecte
    start "ServeurSD" cmd /c "python -m http.server %PORT%"
    goto :ATTENDRE
)

where py >nul 2>&1
if %errorlevel%==0 (
    echo Python detecte
    start "ServeurSD" cmd /c "py -m http.server %PORT%"
    goto :ATTENDRE
)

echo Ni Node.js ni Python trouves. Lance Live Server puis appuie sur une touche.
pause

:ATTENDRE
echo Attente du serveur...
timeout /t 4 /nobreak >nul

echo Lancement de Chrome %LARGEUR%x%HAUTEUR%...
start "" "%CHROME%" --app="%URL%" --window-size=%LARGEUR%,%HAUTEUR% --window-position=0,0 --disable-infobars --noerrdialogs --autoplay-policy=no-user-gesture-required

echo.
echo Jeu lance ! Alt+F4 pour quitter. Fermer cette fenetre pour stopper le serveur.
pause >nul
