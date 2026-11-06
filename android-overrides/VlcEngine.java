package app.kinora.player;

import android.app.Activity;
import android.net.Uri;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import java.util.ArrayList;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;
import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;

/**
 * libVLC engine. It plays what ExoPlayer cannot: DTS / TrueHD / E-AC3 sound, 10-bit HEVC, odd MKV files,
 * streams with no index (it can still seek) and many broken containers. MainActivity switches to it by itself.
 * This file is only copied into the build when the libVLC library could be downloaded.
 */
public class VlcEngine implements KEngine {
  private final Activity act;
  private final ViewGroup root;
  private LibVLC lib;
  private MediaPlayer mp;
  private SurfaceView sv;
  private volatile String err = "";
  private volatile int st = 1;
  private volatile boolean pw = false;
  private volatile long len = 0, pos = 0;

  public VlcEngine(Activity a, ViewGroup r) { act = a; root = r; }

  private void ensure() {
    if (mp != null) return;
    ArrayList<String> o = new ArrayList<>();
    o.add("--network-caching=1500");
    o.add("--file-caching=1500");
    o.add("--live-caching=1500");
    o.add("--avcodec-hw=any");
    o.add("--http-reconnect");
    lib = new LibVLC(act, o);
    mp = new MediaPlayer(lib);
    sv = new SurfaceView(act);
    root.addView(sv, 0, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    mp.getVLCVout().setVideoView(sv);
    mp.getVLCVout().attachViews();
    mp.setEventListener(new MediaPlayer.EventListener() {
      @Override
      public void onEvent(MediaPlayer.Event e) {
        try {
          switch (e.type) {
            case MediaPlayer.Event.Opening: st = 2; break;
            case MediaPlayer.Event.Buffering: if (e.getBuffering() >= 100f) { if (st != 4) st = 3; } else st = 2; break;
            case MediaPlayer.Event.Playing: st = 3; pw = true; break;
            case MediaPlayer.Event.Paused: pw = false; break;
            case MediaPlayer.Event.Stopped: break;
            case MediaPlayer.Event.EndReached: st = 4; break;
            case MediaPlayer.Event.EncounteredError: err = "VLC_ERROR: libVLC could not play this stream"; break;
            case MediaPlayer.Event.TimeChanged: pos = e.getTimeChanged(); break;
            case MediaPlayer.Event.LengthChanged: len = e.getLengthChanged(); break;
            default: break;
          }
        } catch (Throwable ignored) {}
      }
    });
  }

  @Override
  public void load(String url, Map<String, String> headers, long startMs, float rate) {
    try {
      ensure();
      err = ""; st = 2; pw = true; pos = Math.max(0, startMs); len = 0;
      sv.setVisibility(View.VISIBLE);
      Media m = new Media(lib, Uri.parse(url));
      m.setHWDecoderEnabled(true, false);
      if (headers != null) {
        for (Map.Entry<String, String> en : headers.entrySet()) {
          String k = en.getKey() == null ? "" : en.getKey().toLowerCase();
          String v = en.getValue() == null ? "" : en.getValue();
          if (v.isEmpty()) continue;
          if (k.equals("user-agent")) m.addOption(":http-user-agent=" + v);
          else if (k.equals("referer") || k.equals("referrer")) m.addOption(":http-referrer=" + v);
        }
      }
      if (startMs > 0) m.addOption(":start-time=" + (startMs / 1000.0));
      mp.setMedia(m);
      m.release();
      mp.setRate(rate > 0 ? rate : 1f);
      mp.play();
    } catch (Throwable e) {
      err = "VLC_ERROR: " + e;
    }
  }

  @Override public void play() { try { if (mp != null) { mp.play(); pw = true; } } catch (Throwable ignored) {} }
  @Override public void pause() { try { if (mp != null) { mp.pause(); pw = false; } } catch (Throwable ignored) {} }
  @Override public void seek(long ms) { try { if (mp != null) { mp.setTime(Math.max(0, ms)); pos = Math.max(0, ms); } } catch (Throwable ignored) {} }
  @Override public void rate(float r) { try { if (mp != null && r > 0) mp.setRate(r); } catch (Throwable ignored) {} }
  @Override public void volume(float v) { try { if (mp != null) mp.setVolume(Math.round(Math.max(0f, Math.min(1f, v)) * 100)); } catch (Throwable ignored) {} }

  @Override
  public void stop() {
    try { if (mp != null) mp.stop(); } catch (Throwable ignored) {}
    try { if (sv != null) sv.setVisibility(View.GONE); } catch (Throwable ignored) {}
    st = 1; pw = false;
  }

  @Override
  public void release() {
    try { if (mp != null) { mp.stop(); mp.getVLCVout().detachViews(); mp.release(); } } catch (Throwable ignored) {}
    try { if (lib != null) lib.release(); } catch (Throwable ignored) {}
    try { if (sv != null) root.removeView(sv); } catch (Throwable ignored) {}
    mp = null; lib = null; sv = null;
  }

  @Override
  public String state() {
    try {
      JSONObject o = new JSONObject();
      long t = mp != null ? mp.getTime() : 0;
      if (t < 0) t = pos;
      long d = len > 0 ? len : (mp != null ? Math.max(0, mp.getLength()) : 0);
      o.put("s", st);
      o.put("pw", pw);
      o.put("p", t);
      o.put("d", d);
      o.put("b", d > 0 ? Math.min(d, t + 20000) : t);
      o.put("e", err);
      JSONArray a = new JSONArray(), tx = new JSONArray();
      if (mp != null) {
        MediaPlayer.TrackDescription[] ta = mp.getAudioTracks();
        int cur = mp.getAudioTrack();
        if (ta != null) for (MediaPlayer.TrackDescription x : ta) {
          if (x.id < 0) continue;
          JSONObject j = new JSONObject(); j.put("n", x.name == null ? "Track" : x.name); j.put("on", x.id == cur); a.put(j);
        }
        MediaPlayer.TrackDescription[] ts = mp.getSpuTracks();
        int cs = mp.getSpuTrack();
        if (ts != null) for (MediaPlayer.TrackDescription x : ts) {
          if (x.id < 0) continue;
          JSONObject j = new JSONObject(); j.put("n", x.name == null ? "Subtitles" : x.name); j.put("on", x.id == cs); tx.put(j);
        }
      }
      o.put("a", a);
      o.put("t", tx);
      return o.toString();
    } catch (Throwable e) {
      return "{\"s\":1,\"pw\":false,\"p\":0,\"d\":0,\"b\":0,\"e\":\"\",\"a\":[],\"t\":[]}";
    }
  }

  @Override
  public void selectAudio(int i) {
    try {
      int n = 0;
      MediaPlayer.TrackDescription[] ta = mp.getAudioTracks();
      if (ta != null) for (MediaPlayer.TrackDescription x : ta) { if (x.id < 0) continue; if (n++ == i) { mp.setAudioTrack(x.id); return; } }
    } catch (Throwable ignored) {}
  }

  @Override
  public void selectText(int i) {
    try {
      if (i < 0) { mp.setSpuTrack(-1); return; }
      int n = 0;
      MediaPlayer.TrackDescription[] ts = mp.getSpuTracks();
      if (ts != null) for (MediaPlayer.TrackDescription x : ts) { if (x.id < 0) continue; if (n++ == i) { mp.setSpuTrack(x.id); return; } }
    } catch (Throwable ignored) {}
  }
}
