package app.kinora.player;

/** Receives the player state from MainActivity. Implemented by KinoraPlayerPlugin when that file is part of the build. */
public interface StateSink {
  void pushState(String json);
}
