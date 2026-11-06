package app.kinora.player;

import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.Format;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.TrackSelectionOverride;
import androidx.media3.common.Tracks;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.SeekParameters;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.exoplayer.source.MediaSource;
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector;
import androidx.media3.ui.AspectRatioFrameLayout;
import androidx.media3.ui.PlayerView;
import com.getcapacitor.BridgeActivity;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

@UnstableApi
public class MainActivity extends BridgeActivity {
  private static final String IDLE = "{\"s\":1,\"pw\":false,\"p\":0,\"d\":0,\"b\":0,\"e\":\"\",\"a\":[],\"t\":[]}";
  private long lastBack = 0;
  private WebView web;
  private ExoPlayer player;
  private PlayerView pv;
  private final Handler handler = new Handler(Looper.getMainLooper());
  private volatile String stateJson = IDLE;
  private volatile String err = "";
  private boolean retried = false;
  private int loadId = 0;
  private long loadAt = 0;

  // ---- crash guard ----
  // If the app dies while a video is playing, the next start remembers it.
  // 1st crash: the FFmpeg decoder (native code, the most likely cause) is switched off for good.
  // 3rd crash: the native player is switched off and the web player is used instead, so Play can never take the app down again.
  private SharedPreferences kp;
  private int crashes = 0;
  private boolean ffOff = false;
  private boolean nativeOff = false;

  private void mark(boolean playing) {
    try { if (kp != null) kp.edit().putBoolean("playing", playing).apply(); } catch (Throwable ignored) {}
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    try {
      kp = getSharedPreferences("kinora_native", MODE_PRIVATE);
      crashes = kp.getInt("crashes", 0);
      if (kp.getBoolean("playing", false)) {
        crashes++;
        kp.edit().putInt("crashes", crashes).putBoolean("playing", false).apply();
      }
      ffOff = crashes >= 1 || kp.getBoolean("ffoff", false);
      nativeOff = crashes >= 3 || kp.getBoolean("nativeoff", false);
      if (crashes >= 1) kp.edit().putBoolean("ffoff", true).apply();
      if (crashes >= 3) kp.edit().putBoolean("nativeoff", true).apply();
      final Thread.UncaughtExceptionHandler prev = Thread.getDefaultUncaughtExceptionHandler();
      Thread.setDefaultUncaughtExceptionHandler((t, e) -> {
        try { kp.edit().putString("last", String.valueOf(e)).commit(); } catch (Throwable ignored) {}
        if (prev != null) prev.uncaughtException(t, e);
      });
    } catch (Throwable ignored) {}

    super.onCreate(savedInstanceState);
    final WebView w = getBridge().getWebView();
    web = w;
    WebSettings s = w.getSettings();
    s.setCacheMode(WebSettings.LOAD_NO_CACHE);
    w.clearCache(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setBuiltInZoomControls(false);
    s.setSupportZoom(false);
    // Feel like an app: no stretch on pull, no scrollbars, no long-press selection.
    w.setOverScrollMode(View.OVER_SCROLL_NEVER);
    w.setVerticalScrollBarEnabled(false);
    w.setHorizontalScrollBarEnabled(false);
    w.setLongClickable(false);
    w.setOnLongClickListener(v -> true);
    w.setHapticFeedbackEnabled(false);

    // Rotate to landscape (and hide system bars) while a video is open. Also tells the page which version is installed.
    w.addJavascriptInterface(new Object() {
      @JavascriptInterface
      public void orient(final String mode) {
        runOnUiThread(() -> {
          try {
            boolean land = "land".equals(mode);
            setRequestedOrientation(land ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
            getWindow().getDecorView().setSystemUiVisibility(land
              ? (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN
                 | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN)
              : View.SYSTEM_UI_FLAG_VISIBLE);
          } catch (Throwable ignored) {}
        });
      }
      // The installed version, read straight from the package (always matches the release number, for example 0.3.57).
      @JavascriptInterface
      public String version() {
        try {
          PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
          return pi.versionName == null ? "" : pi.versionName;
        } catch (Throwable e) { return ""; }
      }
      @JavascriptInterface public boolean nativeOff() { return nativeOff; }
      @JavascriptInterface public int crashes() { return crashes; }
      @JavascriptInterface public String lastCrash() { try { return kp.getString("last", ""); } catch (Throwable e) { return ""; } }
      // Called by the page after a video really played, so a good run clears the crash count.
      @JavascriptInterface public void played() { try { crashes = 0; kp.edit().putInt("crashes", 0).apply(); } catch (Throwable ignored) {} }
    }, "KinoraNative");

    // ExoPlayer draws behind the (see-through) page. The page controls it through this bridge.
    // Every call is wrapped, so a problem inside the player can never take the whole app down.
    w.addJavascriptInterface(new Object() {
      @JavascriptInterface public void load(final String url, final String headers, final long startMs, final float rate) { runOnUiThread(() -> doLoad(url, headers, startMs, rate)); }
      @JavascriptInterface public void play() { runOnUiThread(() -> { try { if (player != null) { mark(true); player.setPlayWhenReady(true); } } catch (Throwable ignored) {} }); }
      @JavascriptInterface public void pause() { runOnUiThread(() -> { try { if (player != null) player.setPlayWhenReady(false); } catch (Throwable ignored) {} }); }
      @JavascriptInterface public void seek(final long ms) { runOnUiThread(() -> { try { if (player != null) player.seekTo(Math.max(0, ms)); } catch (Throwable ignored) {} }); }
      @JavascriptInterface public void rate(final float r) { runOnUiThread(() -> { try { if (player != null && r > 0) player.setPlaybackSpeed(r); } catch (Throwable ignored) {} }); }
      @JavascriptInterface public void volume(final float v) { runOnUiThread(() -> { try { if (player != null) player.setVolume(Math.max(0f, Math.min(1f, v))); } catch (Throwable ignored) {} }); }
      @JavascriptInterface public void stop() { runOnUiThread(() -> doStop()); }
      @JavascriptInterface public String state() { return stateJson; }
      @JavascriptInterface public void selectAudio(final int i) { runOnUiThread(() -> pickTrack(C.TRACK_TYPE_AUDIO, i)); }
      @JavascriptInterface public void selectText(final int i) { runOnUiThread(() -> pickTrack(C.TRACK_TYPE_TEXT, i)); }
    }, "KinoraPlayer");

    // Back button: let the web app go back one page first. Only when it is already on the first page,
    // ask to press back twice to leave.
    getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
      @Override
      public void handleOnBackPressed() {
        w.evaluateJavascript("(window.__kBack ? window.__kBack() : 0)", value -> {
          if ("1".equals(value)) return;
          long now = System.currentTimeMillis();
          if (now - lastBack < 2000) {
            finish();
          } else {
            lastBack = now;
            Toast.makeText(MainActivity.this, "Press back again to exit", Toast.LENGTH_SHORT).show();
          }
        });
      }
    });
  }

  private boolean ensurePlayer() {
    if (player != null) return true;
    try {
      // Hardware decoders first. The FFmpeg decoder only takes over for sound the phone cannot play (DTS, TrueHD...)
      // and it is switched off for good if the app ever died while playing.
      DefaultRenderersFactory rf = new DefaultRenderersFactory(this)
        .setExtensionRendererMode(ffOff ? DefaultRenderersFactory.EXTENSION_RENDERER_MODE_OFF : DefaultRenderersFactory.EXTENSION_RENDERER_MODE_ON)
        .setEnableDecoderFallback(true);
      // Small start buffer so the picture appears fast (about half a second of data), a bounded total so 4K files cannot fill the memory.
      DefaultLoadControl lc = new DefaultLoadControl.Builder()
        .setBufferDurationsMs(12000, 45000, 500, 1500)
        .setTargetBufferBytes(40 * 1024 * 1024)
        .setPrioritizeTimeOverSizeThresholds(true)
        .build();
      // If the phone cannot decode a track, say so at once (the page then tries the next source) instead of freezing.
      DefaultTrackSelector ts = new DefaultTrackSelector(this);
      ts.setParameters(ts.buildUponParameters()
        .setExceedRendererCapabilitiesIfNecessary(true)
        .setAllowVideoMixedMimeTypeAdaptiveness(true)
        .setAllowVideoNonSeamlessAdaptiveness(true)
        .build());
      player = new ExoPlayer.Builder(this, rf).setLoadControl(lc).setTrackSelector(ts).build();
      // Jump to the nearest key frame when you seek: the picture is back at once instead of freezing while it catches up.
      player.setSeekParameters(SeekParameters.CLOSEST_SYNC);
      player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MOVIE).build(), true);
      player.setHandleAudioBecomingNoisy(true);
      pv = new PlayerView(this);
      pv.setUseController(false);
      pv.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FIT);
      pv.setKeepScreenOn(true);
      pv.setShutterBackgroundColor(Color.TRANSPARENT);
      pv.setKeepContentOnPlayerReset(false);
      pv.setPlayer(player);
      ViewGroup root = (ViewGroup) web.getParent();
      root.addView(pv, 0, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
      player.addListener(new Player.Listener() {
        @Override
        public void onPlayerError(PlaybackException e) {
          int c = e.errorCode;
          // One quiet retry for a decoder that failed to start or died; the next try picks another decoder.
          boolean decoder = c == PlaybackException.ERROR_CODE_DECODER_INIT_FAILED || c == PlaybackException.ERROR_CODE_DECODING_FAILED
            || c == PlaybackException.ERROR_CODE_AUDIO_TRACK_INIT_FAILED || c == PlaybackException.ERROR_CODE_AUDIO_TRACK_WRITE_FAILED;
          try {
            if (c == PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW) { player.seekToDefaultPosition(); player.prepare(); return; }
            if (decoder && !retried) {
              retried = true;
              long p = player.getCurrentPosition();
              player.prepare();
              if (p > 0) player.seekTo(p);
              player.setPlayWhenReady(true);
              return;
            }
          } catch (Throwable ignored) {}
          err = e.getErrorCodeName() + (e.getMessage() == null ? "" : ": " + e.getMessage());
        }

        // A track the phone has no decoder for (for example HEVC 10-bit, Dolby Vision, DTS or TrueHD with no FFmpeg):
        // report it straight away so the page switches to another source of the same quality and language.
        @Override
        public void onTracksChanged(Tracks tracks) {
          try {
            boolean va = false, vs = false, aa = false, as = false;
            for (Tracks.Group g : tracks.getGroups()) {
              if (g.length == 0) continue;
              if (g.getType() == C.TRACK_TYPE_VIDEO) { va = true; if (g.isSupported(false)) vs = true; }
              else if (g.getType() == C.TRACK_TYPE_AUDIO) { aa = true; if (g.isSupported(false)) as = true; }
            }
            if (err.isEmpty() && va && !vs) err = "DECODING_FORMAT_UNSUPPORTED: video codec not supported on this phone";
            else if (err.isEmpty() && aa && !as) err = "DECODING_FORMAT_UNSUPPORTED: audio codec not supported on this phone";
          } catch (Throwable ignored) {}
        }
      });
      return true;
    } catch (Throwable e) {
      err = "Could not start the player: " + e;
      try { if (player != null) player.release(); } catch (Throwable ignored) {}
      player = null;
      pv = null;
      return false;
    }
  }

  private void doLoad(String url, String headersJson, long startMs, float rate) {
    try {
      if (nativeOff) { err = "NATIVE_OFF: native player disabled after a crash"; return; }
      if (!ensurePlayer()) return;
      err = "";
      retried = false;
      loadId++;
      loadAt = System.currentTimeMillis();
      Map<String, String> hdr = new HashMap<>();
      String ua = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
      try {
        JSONObject jo = new JSONObject(headersJson == null || headersJson.isEmpty() ? "{}" : headersJson);
        Iterator<String> it = jo.keys();
        while (it.hasNext()) {
          String k = it.next();
          String v = jo.optString(k, "");
          if (k == null || k.isEmpty() || v == null) continue;
          if ("user-agent".equalsIgnoreCase(k)) ua = v; else hdr.put(k, v);
        }
      } catch (Exception ignored) {}
      // Short timeouts: a host that does not answer is given up on quickly so the next source can start.
      DefaultHttpDataSource.Factory hf = new DefaultHttpDataSource.Factory()
        .setAllowCrossProtocolRedirects(true)
        .setConnectTimeoutMs(5000)
        .setReadTimeoutMs(8000)
        .setUserAgent(ua)
        .setDefaultRequestProperties(hdr);
      MediaItem.Builder mi = new MediaItem.Builder().setUri(url);
      if (url.toLowerCase(Locale.ROOT).contains(".m3u8")) mi.setMimeType(MimeTypes.APPLICATION_M3U8);
      MediaSource ms = new DefaultMediaSourceFactory(hf).createMediaSource(mi.build());
      player.stop();
      player.setTrackSelectionParameters(player.getTrackSelectionParameters().buildUpon()
        .clearOverrides().setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true).setTrackTypeDisabled(C.TRACK_TYPE_AUDIO, false).build());
      player.setMediaSource(ms, startMs > 0 ? startMs : C.TIME_UNSET);
      player.setPlaybackSpeed(rate > 0 ? rate : 1f);
      player.prepare();
      player.setPlayWhenReady(true);
      mark(true);
      pv.setVisibility(View.VISIBLE);
      web.setBackgroundColor(Color.TRANSPARENT);
      handler.removeCallbacksAndMessages(null);
      handler.post(this::poll);
    } catch (Throwable e) {
      err = "Could not start the player: " + e.getMessage();
    }
  }

  private void doStop() {
    try {
      handler.removeCallbacksAndMessages(null);
      if (player != null) {
        player.stop();
        player.clearMediaItems();
      }
      if (pv != null) pv.setVisibility(View.GONE);
      if (web != null) web.setBackgroundColor(Color.parseColor("#07080b"));
    } catch (Throwable ignored) {}
    mark(false);
    stateJson = IDLE;
  }

  private String audioName(Format f, int n) {
    String lang = "";
    if (f.label != null && !f.label.isEmpty()) lang = f.label;
    else if (f.language != null && !"und".equals(f.language)) lang = new Locale(f.language).getDisplayLanguage(Locale.ENGLISH);
    else lang = "Track " + (n + 1);
    String m = f.sampleMimeType == null ? "" : f.sampleMimeType;
    String c = m.contains("eac3") ? "E-AC3" : m.contains("ac3") ? "AC3" : m.contains("true-hd") ? "TrueHD" : m.contains("dts") || m.contains("vnd.dts") ? "DTS" : m.contains("mp4a") ? "AAC" : m.contains("opus") ? "Opus" : "";
    String ch = f.channelCount > 2 ? (f.channelCount == 6 ? " 5.1" : f.channelCount == 8 ? " 7.1" : "") : "";
    return lang + (c.isEmpty() ? "" : " \u00b7 " + c + ch);
  }

  private void poll() {
    if (player == null) return;
    try {
      JSONObject o = new JSONObject();
      o.put("s", player.getPlaybackState());
      o.put("pw", player.getPlayWhenReady());
      o.put("p", player.getCurrentPosition());
      long d = player.getDuration();
      o.put("d", d == C.TIME_UNSET ? 0 : d);
      o.put("b", player.getBufferedPosition());
      o.put("e", err);
      JSONArray a = new JSONArray(), t = new JSONArray();
      int ai = 0, ti = 0;
      for (Tracks.Group g : player.getCurrentTracks().getGroups()) {
        int type = g.getType();
        if (type != C.TRACK_TYPE_AUDIO && type != C.TRACK_TYPE_TEXT) continue;
        if (g.length == 0) continue;
        Format f = g.getTrackFormat(0);
        JSONObject j = new JSONObject();
        if (type == C.TRACK_TYPE_AUDIO) { j.put("n", audioName(f, ai++)); j.put("on", g.isSelected()); a.put(j); }
        else {
          String n = f.label != null && !f.label.isEmpty() ? f.label : (f.language != null && !"und".equals(f.language) ? new Locale(f.language).getDisplayLanguage(Locale.ENGLISH) : "Subtitles " + (ti + 1));
          ti++;
          j.put("n", n); j.put("on", g.isSelected()); t.put(j);
        }
      }
      o.put("a", a);
      o.put("t", t);
      stateJson = o.toString();
    } catch (Throwable ignored) {}
    handler.postDelayed(this::poll, 250);
  }

  private void pickTrack(int type, int index) {
    try {
      if (player == null) return;
      if (type == C.TRACK_TYPE_TEXT && index < 0) {
        player.setTrackSelectionParameters(player.getTrackSelectionParameters().buildUpon().setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true).build());
        return;
      }
      int n = 0;
      for (Tracks.Group g : player.getCurrentTracks().getGroups()) {
        if (g.getType() != type) continue;
        if (n++ == index) {
          player.setTrackSelectionParameters(player.getTrackSelectionParameters().buildUpon()
            .setTrackTypeDisabled(type, false)
            .setOverrideForType(new TrackSelectionOverride(g.getMediaTrackGroup(), 0)).build());
          return;
        }
      }
    } catch (Throwable ignored) {}
  }

  @Override
  public void onPause() {
    super.onPause();
    try { if (player != null) player.setPlayWhenReady(false); } catch (Throwable ignored) {}
    mark(false);
  }

  @Override
  public void onDestroy() {
    handler.removeCallbacksAndMessages(null);
    mark(false);
    try { if (player != null) { player.release(); player = null; } } catch (Throwable ignored) {}
    super.onDestroy();
  }
}
