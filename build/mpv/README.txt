The Windows build downloads mpv.exe (and d3dcompiler_43.dll) into this folder before packaging (see .github/workflows/build-windows.yml).
It is copied next to the app as resources/mpv and used by the optional mpv video engine (Settings > Playback > Video engine).
For local testing, drop mpv.exe here, or install mpv on the PC: electron/mpv.js also looks in Program Files, scoop, chocolatey and PATH.
