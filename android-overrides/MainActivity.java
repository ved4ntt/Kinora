package app.kinora.player;

import android.app.Activity;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
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
import androidx.media3.common.VideoSize;
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
import com.getcapacitor.BridgeActivity;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Kinora video, behind the page. Two engines:
 *  - ExoPlayer (Media3): fast, hardware decoding. Draws on a TextureView (safer than a SurfaceView punched behind a WebView).
 *  - libVLC (optional, loaded by name): takes over by itself when ExoPlayer cannot decode a track (HEVC 10-bit, DTS, TrueHD, odd MKV...)
 *    or when the stream cannot be seeked. The page never has to know which one is playing.
 * Everything is wrapped so a problem inside a player cannot take the app down, and a crash while playing is remembered:
 * the next start turns off the part that was playing (FFmpeg decoder, then VLC, then the native player as a last resort).
 */
@UnstableApi
public class MainActivity extends BridgeActivity {
  private static final String IDLE = "{\"s\":1,\"pw\":false,\"p\":0,\"d\":0,\"b\":0,\"e\":\"\",\"a\":[],\"t\":[]}";
  private long lastBack = 0;
  private WebView web;
  private ExoPlayer player;
  private FrameLayout box;
  private AspectRatioFrameLayout arl;
  private TextureView tv;
  private KEngine vlc;
  private boolean vlcMissing = false;
  private boolean useVlc = false;
  private boolean triedVlc = false;
  private String lastUrl = "", lastHdr = "{}";
  private float lastRate = 1f;
  private final Handler handler = new Handler(Looper.getMainLooper());
  private volatile String stateJson = IDLE;
  private volatile String err = "";
  private boolean retried = false;
  private final ConcurrentHashMap<String, String> probes = new ConcurrentHashMap<>();
  private final ExecutorService pool = Executors.newFixedThreadPool(4);

  // ---- crash guard ----
  private SharedPreferences kp;
  private int crashes = 0;
  private boolean ffOff = false, vlcOff = false, nativeOff = false;

  private void mark(boolean playing) {
    try { if (kp != null) kp.edit().putBoolean("playing", playing).putString("eng", useVlc ? "vlc" : "exo").apply(); } catch (Throwable ignored) {}
  }

  private static String errState(String e) {
    try { return new JSONObject(IDLE).put("e", e).toString(); } catch (Throwable x) { return IDLE; }
  }

  private void fail(String e) { err = e; stateJson = errState(e); }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    try {
      kp = getSharedPreferences("kinora_native", MODE_PRIVATE);
      crashes = kp.getInt("crashes", 0);
      if (kp.getBoolean("playing", false)) {
        crashes++;
        SharedPreferences.Editor ed = kp.edit().putInt("crashes", crashes).putBoolean("playing", false);
        if ("vlc".equals(kp.getString("eng", ""))) ed.putBoolean("vlcoff", true); else ed.putBoolean("ffoff", true);
        if (crashes >= 3) ed.putBoolean("nativeoff", true);
        ed.apply();
      }
      ffOff = kp.getBoolean("ffoff", false);
      vlcOff = kp.getBoolean("vlcoff", false);
      nativeOff = kp.getBoolean("nativeoff", false);
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
    w.setOverScrollMode(View.OVER_SCROLL_NEVER);
    w.setVerticalScrollBarEnabled(false);
    w.setHorizontalScrollBarEnabled(false);
    w.setLongClickable(false);
    w.setOnLongClickListener(v -> true);
    w.setHapticFeedbackEnabled(false);

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
      /** The installed version, read from the package (always the release number, for example 0.3.57). */
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
      @JavascriptInterface public void played() { try { crashes = 0; kp.edit().putInt("crashes", 0).apply(); } catch (Throwable ignored) {} }
    }, "KinoraNative");

    w.addJavascriptInterface(new Object() {
      @JavascriptInterface public void load(final String url, final String headers, final long startMs, final float rate) { runOnUiThread(() -> doLoad(url, headers, startMs, rate, "auto")); }
      /** mode: "auto" (ExoPlayer, VLC when needed), "exo" or "vlc" */
      @JavascriptInterface public void loadx(final String url, final String headers, final long startMs, final float rate, final String mode) { runOnUiThread(() -> doLoad(url, headers, startMs, rate, mode)); }
      @JavascriptInterface public void play() { runOnUiThread(() -> { try { mark(true); if (useVlc && vlc != null) vlc.play(); else if (player != null) player.setPlayWhenReady(true); } catch (Throwable ignored) {} }); }
      @JavascriptInterface public void pause() { runOnUiThread(() -> { try { if (useVlc && vlc != null) vlc.pause(); else if (player != null) player.setPlayWhenReady(false); } catch (Throwable ignored) {} }); }
      @JavascriptInterface public void seek(final long ms) { runOnUiThread(() -> { try { if (useVlc && vlc != null) vlc.seek(ms); else if (player != null) player.seekTo(Math.max(0, ms)); } catch (Throwable ignored) {} }); }
      @JavascriptInterface public void rate(final float r) { runOnUiThread(() -> { try { if (useVlc && vlc != null) vlc.rate(r); else if (player != null && r > 0) player.setPlaybackSpeed(r); } catch (Throwable ignored) {} }); }
      @JavascriptInterface public void volume(final float v) { runOnUiThread(() -> { try { if (useVlc && vlc != null) vlc.volume(v); else if (player != null) player.setVolume(Math.max(0f, Math.min(1f, v))); } catch (Throwable ignored) {} }); }
      @JavascriptInterface public void stop() { runOnUiThread(() -> doStop()); }
      @JavascriptInterface public String state() { return stateJson; }
      @JavascriptInterface public void selectAudio(final int i) { runOnUiThread(() -> { if (useVlc && vlc != null) vlc.selectAudio(i); else pickTrack(C.TRACK_TYPE_AUDIO, i); }); }
      @JavascriptInterface public void selectText(final int i) { runOnUiThread(() -> { if (useVlc && vlc != null) vlc.selectText(i); else pickTrack(C.TRACK_TYPE_TEXT, i); }); }
      @JavascriptInterface public String engine() { return useVlc ? "vlc" : "exo"; }
      @JavascriptInterface public boolean canVlc() { return ensureVlc(); }
      /** Hand the same stream to the other engine from the current position (for example when seeking is not possible in ExoPlayer). */
      @JavascriptInterface public void switchEngine(final String mode) {
        runOnUiThread(() -> {
          try {
            if (lastUrl == null || lastUrl.isEmpty()) return;
            long p = 0;
            try { p = useVlc ? new JSONObject(stateJson).optLong("p", 0) : (player != null ? player.getCurrentPosition() : 0); } catch (Throwable ignored) {}
            if ("vlc".equals(mode)) { triedVlc = true; startVlc(lastUrl, parseHeaders(lastHdr), p, lastRate); }
            else startExo(lastUrl, parseHeaders(lastHdr), p, lastRate);
          } catch (Throwable ignored) {}
        });
      }
      /** Quick reachability check of a stream (first bytes only). Result is read with probeResult(id). */
      @JavascriptInterface public void probe(final String id, final String url, final String headers) { pool.execute(() -> probes.put(id, doProbe(url, headers))); }
      @JavascriptInterface public String probeResult(final String id) { String r = probes.get(id); return r == null ? "" : r; }
    }, "KinoraPlayer");

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

  // ---------------------------------------------------------------- probe
  private String doProbe(String url, String headersJson) {
    long t0 = System.nanoTime();
    try {
      Map<String, String> h = parseHeaders(headersJson);
      String cur = url;
      HttpURLConnection c = null;
      int code = 0;
      for (int hop = 0; hop < 6; hop++) {
        c = (HttpURLConnection) new URL(cur).openConnection();
        c.setConnectTimeout(3500);
        c.setReadTimeout(3500);
        c.setInstanceFollowRedirects(false);
        c.setRequestProperty("Range", "bytes=0-2047");
        boolean ua = false;
        for (Map.Entry<String, String> e : h.entrySet()) { c.setRequestProperty(e.getKey(), e.getValue()); if ("user-agent".equalsIgnoreCase(e.getKey())) ua = true; }
        if (!ua) c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36");
        code = c.getResponseCode();
        if (code >= 300 && code < 400) {
          String loc = c.getHeaderField("Location");
          c.disconnect();
          if (loc == null) break;
          cur = new URL(new URL(cur), loc).toString();
          continue;
        }
        break;
      }
      long ttfb = (System.nanoTime() - t0) / 1000000L;
      String ct = c.getContentType() == null ? "" : c.getContentType().toLowerCase(Locale.ROOT);
      String cr = c.getHeaderField("Content-Range");
      String cl = c.getHeaderField("Content-Length");
      boolean range = code == 206 || (c.getHeaderField("Accept-Ranges") != null && c.getHeaderField("Accept-Ranges").toLowerCase(Locale.ROOT).contains("bytes"));
      long total = 0;
      try { if (cr != null && cr.contains("/")) total = Long.parseLong(cr.substring(cr.indexOf('/') + 1).trim()); else if (cl != null && code == 200) total = Long.parseLong(cl.trim()); } catch (Throwable ignored) {}
      boolean page = ct.contains("text/html") || ct.contains("application/json") || ct.contains("text/plain");
      boolean ok = code >= 200 && code < 300 && !page;
      byte[] b = new byte[2048];
      long first = ttfb;
      if (ok) {
        InputStream in = c.getInputStream();
        int n = in.read(b);
        first = (System.nanoTime() - t0) / 1000000L;
        in.close();
        if (n <= 0) ok = false;
      }
      c.disconnect();
      return new JSONObject().put("ok", ok).put("code", code).put("ms", first).put("ttfb", ttfb).put("range", range).put("size", total).put("type", ct).toString();
    } catch (Throwable e) {
      try { return new JSONObject().put("ok", false).put("code", 0).put("ms", (System.nanoTime() - t0) / 1000000L).put("err", String.valueOf(e)).toString(); } catch (Throwable x) { return "{\"ok\":false}"; }
    }
  }

  private Map<String, String> parseHeaders(String headersJson) {
    Map<String, String> hdr = new HashMap<>();
    try {
      JSONObject jo = new JSONObject(headersJson == null || headersJson.isEmpty() ? "{}" : headersJson);
      Iterator<String> it = jo.keys();
      while (it.hasNext()) {
        String k = it.next();
        String v = jo.optString(k, "");
        if (k == null || k.isEmpty() || v == null) continue;
        hdr.put(k, v);
      }
    } catch (Exception ignored) {}
    return hdr;
  }

  // ---------------------------------------------------------------- engines
  private boolean ensureVlc() {
    if (vlc != null) return true;
    if (vlcMissing || vlcOff) return false;
    try {
      Class<?> k = Class.forName("app.kinora.player.VlcEngine");
      vlc = (KEngine) k.getConstructor(Activity.class, ViewGroup.class).newInstance(this, (ViewGroup) web.getParent());
      return true;
    } catch (Throwable e) {
      vlcMissing = true;
      return false;
    }
  }

  private boolean ensurePlayer() {
    if (player != null) return true;
    try {
      DefaultRenderersFactory rf = new DefaultRenderersFactory(this)
        .setExtensionRendererMode(ffOff ? DefaultRenderersFactory.EXTENSION_RENDERER_MODE_OFF : DefaultRenderersFactory.EXTENSION_RENDERER_MODE_ON)
        .setEnableDecoderFallback(true);
      DefaultLoadControl lc = new DefaultLoadControl.Builder()
        .setBufferDurationsMs(12000, 45000, 500, 1500)
        .setTargetBufferBytes(40 * 1024 * 1024)
        .setPrioritizeTimeOverSizeThresholds(true)
        .build();
      DefaultTrackSelector ts = new DefaultTrackSelector(this);
      ts.setParameters(ts.buildUponParameters()
        .setExceedRendererCapabilitiesIfNecessary(true)
        .setAllowVideoMixedMimeTypeAdaptiveness(true)
        .setAllowVideoNonSeamlessAdaptiveness(true)
        .build());
      player = new ExoPlayer.Builder(this, rf).setLoadControl(lc).setTrackSelector(ts).build();
      player.setSeekParameters(SeekParameters.CLOSEST_SYNC);
      player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MOVIE).build(), true);
      player.setHandleAudioBecomingNoisy(true);
      // A TextureView inside an aspect-ratio frame, behind the see-through page.
      box = new FrameLayout(this);
      box.setBackgroundColor(Color.BLACK);
      box.setKeepScreenOn(true);
      arl = new AspectRatioFrameLayout(this);
      arl.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FIT);
      tv = new TextureView(this);
      arl.addView(tv, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
      box.addView(arl, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT, Gravity.CENTER));
      player.setVideoTextureView(tv);
      ViewGroup root = (ViewGroup) web.getParent();
      root.addView(box, 0, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
      box.setVisibility(View.GONE);
      player.addListener(new Player.Listener() {
        @Override
        public void onVideoSizeChanged(VideoSize v) {
          try { if (v.width > 0 && v.height > 0) arl.setAspectRatio(v.width * v.pixelWidthHeightRatio / v.height); } catch (Throwable ignored) {}
        }

        @Override
        public void onPlayerError(PlaybackException e) {
          int c = e.errorCode;
          boolean decoder = c == PlaybackException.ERROR_CODE_DECODER_INIT_FAILED || c == PlaybackException.ERROR_CODE_DECODING_FAILED
            || c == PlaybackException.ERROR_CODE_AUDIO_TRACK_INIT_FAILED || c == PlaybackException.ERROR_CODE_AUDIO_TRACK_WRITE_FAILED;
          boolean codec = decoder || c == PlaybackException.ERROR_CODE_DECODING_FORMAT_EXCEEDS_CAPABILITIES
            || c == PlaybackException.ERROR_CODE_DECODING_FORMAT_UNSUPPORTED || c == PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED
            || c == PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED || c == PlaybackException.ERROR_CODE_PARSING_MANIFEST_UNSUPPORTED;
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
            // ExoPlayer cannot decode this: VLC takes the same stream from the same spot, the page notices nothing.
            if (codec && fallbackToVlc(player.getCurrentPosition())) return;
          } catch (Throwable ignored) {}
          err = e.getErrorCodeName() + (e.getMessage() == null ? "" : ": " + e.getMessage());
        }

        @Override
        public void onTracksChanged(Tracks tracks) {
          try {
            boolean va = false, vs = false, aa = false, as = false;
            for (Tracks.Group g : tracks.getGroups()) {
              if (g.length == 0) continue;
              if (g.getType() == C.TRACK_TYPE_VIDEO) { va = true; if (g.isSupported(false)) vs = true; }
              else if (g.getType() == C.TRACK_TYPE_AUDIO) { aa = true; if (g.isSupported(false)) as = true; }
            }
            if (!err.isEmpty() || useVlc) return;
            if ((va && !vs) || (aa && !as)) {
              if (fallbackToVlc(player.getCurrentPosition())) return;
              err = va && !vs ? "DECODING_FORMAT_UNSUPPORTED: video codec not supported on this phone" : "DECODING_FORMAT_UNSUPPORTED: audio codec not supported on this phone";
            }
          } catch (Throwable ignored) {}
        }
      });
      return true;
    } catch (Throwable e) {
      fail("Could not start the player: " + e);
      try { if (player != null) player.release(); } catch (Throwable ignored) {}
      player = null; box = null; arl = null; tv = null;
      return false;
    }
  }

  private boolean fallbackToVlc(long posMs) {
    if (triedVlc || useVlc || !ensureVlc()) return false;
    triedVlc = true;
    startVlc(lastUrl, parseHeaders(lastHdr), posMs, lastRate);
    return true;
  }

  private void doLoad(String url, String headersJson, long startMs, float rate, String mode) {
    try {
      if (nativeOff) { fail("NATIVE_OFF: native player disabled after repeated crashes"); return; }
      err = "";
      stateJson = IDLE;
      retried = false;
      triedVlc = false;
      lastUrl = url; lastHdr = headersJson == null ? "{}" : headersJson; lastRate = rate > 0 ? rate : 1f;
      Map<String, String> hdr = parseHeaders(headersJson);
      if ("vlc".equals(mode) && ensureVlc()) { triedVlc = true; startVlc(url, hdr, startMs, lastRate); return; }
      startExo(url, hdr, startMs, lastRate);
    } catch (Throwable e) {
      fail("Could not start the player: " + e);
    }
  }

  private void startExo(String url, Map<String, String> hdr, long startMs, float rate) {
    try {
      if (vlc != null) { try { vlc.stop(); } catch (Throwable ignored) {} }
      useVlc = false;
      if (!ensurePlayer()) {
        // No ExoPlayer at all: try VLC before giving up
        if (!triedVlc && ensureVlc()) { triedVlc = true; startVlc(url, hdr, startMs, rate); }
        return;
      }
      err = "";
      String ua = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
      Map<String, String> h2 = new HashMap<>();
      for (Map.Entry<String, String> e : hdr.entrySet()) { if ("user-agent".equalsIgnoreCase(e.getKey())) ua = e.getValue(); else h2.put(e.getKey(), e.getValue()); }
      DefaultHttpDataSource.Factory hf = new DefaultHttpDataSource.Factory()
        .setAllowCrossProtocolRedirects(true)
        .setConnectTimeoutMs(5000)
        .setReadTimeoutMs(8000)
        .setUserAgent(ua)
        .setDefaultRequestProperties(h2);
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
      box.setVisibility(View.VISIBLE);
      web.setBackgroundColor(Color.TRANSPARENT);
      handler.removeCallbacksAndMessages(null);
      handler.post(this::poll);
    } catch (Throwable e) {
      fail("Could not start the player: " + e.getMessage());
    }
  }

  private void startVlc(String url, Map<String, String> hdr, long startMs, float rate) {
    try {
      if (!ensureVlc()) { fail("VLC_MISSING: no VLC engine in this build"); return; }
      if (player != null) { try { player.stop(); player.clearMediaItems(); } catch (Throwable ignored) {} }
      if (box != null) box.setVisibility(View.GONE);
      useVlc = true;
      err = "";
      vlc.load(url, hdr, startMs, rate);
      mark(true);
      web.setBackgroundColor(Color.TRANSPARENT);
      handler.removeCallbacksAndMessages(null);
      handler.post(this::poll);
    } catch (Throwable e) {
      useVlc = false;
      fail("VLC_ERROR: " + e.getMessage());
    }
  }

  private void doStop() {
    try {
      handler.removeCallbacksAndMessages(null);
      if (player != null) { player.stop(); player.clearMediaItems(); }
      if (vlc != null) vlc.stop();
      if (box != null) box.setVisibility(View.GONE);
      if (web != null) web.setBackgroundColor(Color.parseColor("#07080b"));
    } catch (Throwable ignored) {}
    useVlc = false;
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
    try {
      if (useVlc && vlc != null) {
        stateJson = vlc.state();
        handler.postDelayed(this::poll, 250);
        return;
      }
      if (player == null) return;
      JSONObject o = new JSONObject();
      o.put("s", player.getPlaybackState());
      o.put("pw", player.getPlayWhenReady());
      o.put("p", player.getCurrentPosition());
      long d = player.getDuration();
      o.put("d", d == C.TIME_UNSET ? 0 : d);
      o.put("b", player.getBufferedPosition());
      o.put("e", err);
      // A stream that cannot be seeked (no index, no range support): the page switches it to VLC when you try to seek.
      o.put("ns", player.getPlaybackState() == Player.STATE_READY && !player.isCurrentMediaItemSeekable());
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
    try { if (useVlc && vlc != null) vlc.pause(); else if (player != null) player.setPlayWhenReady(false); } catch (Throwable ignored) {}
    mark(false);
  }

  @Override
  public void onDestroy() {
    handler.removeCallbacksAndMessages(null);
    mark(false);
    try { pool.shutdownNow(); } catch (Throwable ignored) {}
    try { if (player != null) { player.release(); player = null; } } catch (Throwable ignored) {}
    try { if (vlc != null) { vlc.release(); vlc = null; } } catch (Throwable ignored) {}
    super.onDestroy();
  }
}
