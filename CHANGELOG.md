# Changelog

Each release on GitHub shows the section for its version. Add a new `## [version] - date` section at the top before you bump the version in `package.json`.

## [0.3.x] - 2026-11-12

### Playback lab (Windows and Android)
- New switch in Settings > Playback > Playback lab (test mode, off by default). With it on, whatever title you play is tested source by source: 30 seconds each, then it switches by itself. It records startup time, every buffering stop, real picture size, codec, bitrate, file size (and a compression grade so over-squeezed 4K files are marked), dropped frames, jump speed and why a source failed.
- Export writes a .json and a readable .txt into Downloads/Kinora-Logs (Android also opens the share sheet). Windows and Android keep separate logs.

## [0.3.x] - 2026-11-08

### Video (all platforms)
- Sources are checked before they play: the three best are asked for their first bytes at the same moment, dead links are skipped, and the best answer plays. A source that does not start is replaced by one with the same quality and language, after about 5 seconds at most (4.5 s when the source answered fast, up to 9 s when it is slow but alive).
- The seek bar shows the whole film from the first second, even when the host only reports what is buffered so far.

### Windows
- The streaming proxy was rewritten. It learns once whether a host supports byte ranges and how big the file is, answers every range request with a correct 206 and Content-Range, emulates ranges for hosts that ignore them, resumes a broken connection from the exact byte, and sends HLS playlists that need special headers through the same proxy. Seeking works across the whole film whenever the file size is known.
- Conversion fix: the stream-copy path never ran before (the codec probe read ffprobe's output in the wrong order), so every converted video was re-encoded. H.264 / HEVC are now copied as they are and only unsupported video is re-encoded, with the graphics card (NVENC, Quick Sync or AMF, each really tested) and at the original size.
- Hardware video decoding is switched on explicitly (D3D11, HEVC), and the window no longer throttles playback in the background.
- The black bar behind the seek bar is gone.

### Android
- Player crash fixed at the source: video is drawn on a TextureView (a SurfaceView behind a see-through WebView was the unstable part). If the app ever dies while playing, the next start switches off the FFmpeg decoder first, then VLC, and only as a last resort the native player.
- Second engine: libVLC takes over by itself when ExoPlayer cannot decode a track (10-bit HEVC, DTS, TrueHD, odd MKV) or cannot seek a stream. The release is built again without VLC if it ever fails to compile, so a release is never lost.
- Version: the app now shows the same number as the GitHub release (it said 1.0.x before). Update check no longer depends on the GitHub API limit, and the update downloads in the background with a notification, then opens the installer. Latest links that always work: `releases/latest/download/Kinora.apk` and `Kinora-Setup.exe`.

### Look and feel
- Streaming services (Netflix, Prime Video, Disney+, HBO Max, Hulu, Apple TV+, Paramount+ ...) are big banner buttons on Home; each opens that service's movies and series.
- All recommended add-ons are built in, plus AIOMetadata. Duplicate catalog titles are shown once.
- Explore: search field, pills (Movies, Series, Anime, Sports, Live TV), Popular / Trending / All and Genre pickers (our own, not the browser's), results below with endless scrolling. The phone dock has Home, Explore, Library and Profile; Profile opens a clean sheet.
- Avatar designer with hair, face, eyes, mouth, accessories, outfits and backgrounds (over two billion combinations), usernames, and a new "Who's watching" screen.
- Details page: soft fade instead of a hard edge, an even row of buttons; on phones Play plus a small button that opens the other options sideways, and one reaction button for love, like or dislike.
- Dock: compact when idle, expands when the mouse is over it (the setting is gone). Rating stars are real stars everywhere. Settings rows are smaller on phones.

## [0.3.x] - 2026-11-04

Kinora is a beta, so version numbers now start with 0. Every push builds a new version (0.3 and the number of commits), and every build is published as its own release with a Windows installer and an Android APK.

### New
- Player rebuilt: the long glass bar is gone, the seek bar sits above the buttons with a softer glow and always shows the full length, one jump per drag (no more frozen picture after seeking), and a spinner until the new picture is really on screen. No fullscreen, minimise or close buttons over the video (the Windows app goes full screen by itself while a video plays). Back is top left, and the top right has one normal popup for Language, Quality and Subtitles, with subtitle size, colour, background, edge, font, position and timing.
- 4KHDHub (inside CNCVerse) is always tried first. HdHub and PenguPlay are the fallbacks. Sources install instantly and refresh in the background, and the player opens before the title details arrive, so videos start much faster.
- Android: the native player is always on (the switch is gone), with a bounded buffer, quick seeking to the nearest key frame and one quiet retry when a decoder fails.
- Windows: big files are fetched in several pieces at once, which is much faster on hosts that slow down a single connection.
- New dock: two small pills, search opens in place when you click the icon, Compact and Expanded modes, and separate Profile and Settings popups (Watch together is in the Profile popup).
- The app opens on a full-screen "Who's watching?" instead of Edit profile, rating stars show again, and the Watch together panel is a small card until a party starts.
- Settings only lists what matters: the native player, main source, buffer, HDR, torrent, embed and other switches are removed.
- New player: a floating glass control island with a glowing seek bar, fewer buttons, and a small popup instead of a wide bar on phones. Subtitles, subtitle size, HDR and speed live in one small menu.
- Audio and quality bar: when a video starts, a bar lists every audio language and every quality found (4K down to 360p). Tap one and the stream switches at the same moment. A language that only exists at another quality shows that quality next to its name.
- Play now opens the player straight away. The Sources button is gone from the details page (your add-ons are still in Settings > Add-ons) and the list, watch later and watched buttons are icons.
- New built-in sources: HdHub is the main source and CNCVerse is the fallback. Every add-on now has an on/off switch in Settings > Add-ons.
- Streams are looked up while you are still on the details page, a dead source is dropped after a few seconds, and Kinora tries the next one by itself.
- Android app: video now plays in ExoPlayer, the same kind of native player Nuvio uses, with hardware decoding, MKV and HEVC support, many more sound formats, audio track and subtitle choice inside the file. It can be turned off in Settings > Playback.
- Windows app: hard files (HEVC, DTS, AC3, MKV) can play in mpv or VLC when one is installed (Settings > Playback > mpv or VLC).
- HDR switch (player menu and Settings > Playback): on prefers HDR and Dolby Vision files, off prefers normal files.
- Anime tab (MyAnimeList data) on desktop and in Explore on phones. Anime plays from the embed player.
- Embed player: the browser always uses it. In the Windows and Android apps it is a switch in Settings > Playback. The links are built in.
- New desktop dock for the Windows app and desktop browsers: one pill at the top with Home, Movies, Series, Anime, Live TV, Search, Library and Settings (your avatar). The website has a Get the app button that fetches the newest Windows and Android downloads from GitHub.
- TMDB is now the main source for titles, posters and details. Cinemeta is the fallback.
- Search no longer opens the keyboard by itself, and its clear button now takes you back to Home. Dropdowns are Kinora's own instead of the default ones.

### Fixed
- The Android build failed after the FFmpeg decoder was added (it needs core library desugaring). That is switched on now.
- The "Your data is synced" pop-up is gone.
- Ratings on the Home banner, cards and details page use a drawn star, so they show correctly on Windows.
- The new dock and the new player styles were not loaded by the page, so the dock showed as plain text at the bottom of the page and the player looked unfinished. Fixed.
- Watch party works in full screen: the party panel, chat and reactions stay on top of the video.
- The Party and Chat tabs of the watch party panel no longer leave a huge empty box over the invite code.
- Sources that played with no sound are detected after a few seconds, fixed through the built-in converter on Windows, or skipped for the next source.
- Many hosts refused to play because the video asked for cross-origin access it did not need. It no longer does.
- Video that never started now fails after a few seconds instead of 45, autoplay being blocked is handled, and HLS streams recover from network and decoding hiccups.
- Windows: the window buttons are smaller and no longer cover the player.
- App updates: Kinora was looking for updates in the wrong GitHub repository, and it ignored beta releases. Both are fixed, so new versions now show up in Settings > App updates.

## [1.2.0-beta.1] - 2026-10-31

### New
- App updates: Settings > App updates checks for new versions, with toggles to check automatically and to download automatically. Windows downloads in the background and installs when you close Kinora; Android opens the download for one-tap install.
- New Home: a rotating banner (swipe it on phones), Continue watching with progress and time left, and faster catalog rows.
- New details page: Play or Resume, My list, Watch later, Watched, reactions, episodes with watched marks, cast, trailers and similar titles.
- Left navigation rail on desktop and TV with full keyboard and remote (arrow key) navigation and strong focus rings.
- Phones get a floating bottom bar with a blue active tab, and Search drops in from the top.
- Redesigned Movies, Series, Search, Library and Settings screens.
- Redesigned source chooser and video player controls.
- Native feel: swipe in from the left edge to go back, press feedback on everything you tap, smooth screen transitions, and no zoom, text selection or overscroll bounce.

### Also new in this beta
- New dock: floating pills with a smooth sliding highlight. On desktop you get Home, Movies, Series, Live TV and Library, with search that expands in place, plus Settings and your profile. On phones there is one bottom bar with Home, Search, Explore, Library and Profile. Compact or expanded labels can be chosen in Settings > Look & feel.
- The profile button works again on desktop and phone, and the "Who's watching?" picker shows first when you have more than one profile.
- Search is one stable page: results no longer reload, fade or reshuffle while you wait.
- Every row has a See all button, arrow buttons, and mouse-drag scrolling. The Home banner is bigger and can be dragged or swiped, and the first banners are preloaded so Details open instantly.
- Movies and Series have built-in catalog and genre pickers.
- Desktop hover cards are back (small first, then large, with the page background following the title). On phones the card in the middle pops up with its details as you slide.
- Settings > Playback has preferred languages and qualities, with switches to show only those.
- Torrent streams and anything below 720p are hidden by default.
- The blue theme is gone, the original player controls are back, and a few names were changed (plugins are now Kinora add-ons).
- The app opens on the page with loading placeholders instead of a logo splash.

### Fixed
- Windows playback is much faster: direct streams now go through a built-in proxy that downloads several pieces at once, so slow hosts no longer load in 10-second bursts, and seeking jumps straight to the timestamp you click.
- Formats the player can't hear (Dolby Digital Plus, DTS, TrueHD, Atmos) now start through a quick converter that copies the video and only converts the sound, instead of re-encoding the whole movie.
- Clicking the seek bar past what the converter has made so far now waits and then jumps there, instead of snapping back.

### Changed
- Windows is now an installer only. The portable build is gone because portable apps cannot update themselves.
- Releases are marked as beta, and the Android update check includes beta builds.

### Known issues
- The player's subtitle picker, watch party and Live TV still use the older look.
- If you are on 1.1.0, install this beta by hand once. After that, updates arrive in the app.
