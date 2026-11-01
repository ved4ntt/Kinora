# Changelog

Each release on GitHub shows the section for its version. Add a new `## [version] - date` section at the top before you bump the version in `package.json`.

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
