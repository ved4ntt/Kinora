package app.kinora.player;

import java.util.Map;

/** A video engine behind the page. ExoPlayer is built into MainActivity; VlcEngine (libVLC) is optional and loaded by name. */
public interface KEngine {
  void load(String url, Map<String, String> headers, long startMs, float rate);
  void play();
  void pause();
  void seek(long ms);
  void rate(float r);
  void volume(float v);
  void stop();
  void release();
  /** JSON in the same shape the page already reads: {s,pw,p,d,b,e,a,t} */
  String state();
  void selectAudio(int i);
  void selectText(int i);
}
