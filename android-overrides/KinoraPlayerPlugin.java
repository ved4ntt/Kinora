package app.kinora.player;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor plugin "KinoraExoPlayer": the page's door to the native AndroidX Media3 (ExoPlayer) engine that MainActivity runs behind the WebView.
 *
 * The plugin is deliberately thin. The engine, its crash guard and the VLC fallback live in MainActivity; this class gives the page:
 *   - promise-based calls (load() is rejected right away when the native player is off),
 *   - a "state" event about four times a second ({s,pw,p,d,b,e,a,t,vf,af,ns}), so the page does not poll,
 *   - capabilities() (what this phone really decodes) and probe() (first bytes of a link), also as promises.
 *
 * It is optional: when this file is not in a build, MainActivity still compiles and the page falls back to the older JavaScript bridge.
 */
@CapacitorPlugin(name = "KinoraExoPlayer")
public class KinoraPlayerPlugin extends Plugin implements StateSink {

  private MainActivity act() {
    return (MainActivity) getActivity();
  }

  @PluginMethod
  public void ping(PluginCall call) {
    JSObject o = new JSObject();
    o.put("ok", true);
    o.put("engine", "media3");
    call.resolve(o);
  }

  @PluginMethod
  public void load(PluginCall call) {
    String url = call.getString("url");
    if (url == null || url.isEmpty()) {
      call.reject("No url");
      return;
    }
    Double start = call.getDouble("startMs", 0.0);
    Float rate = call.getFloat("rate", 1f);
    String err = act().pLoad(
      url,
      call.getString("headers", "{}"),
      start == null ? 0L : start.longValue(),
      rate == null ? 1f : rate.floatValue(),
      call.getString("mode", "auto"),
      call.getString("mime", "")
    );
    if (err != null) call.reject(err);
    else call.resolve();
  }

  @PluginMethod
  public void play(PluginCall call) {
    act().pPlay();
    call.resolve();
  }

  @PluginMethod
  public void pause(PluginCall call) {
    act().pPause();
    call.resolve();
  }

  @PluginMethod
  public void seek(PluginCall call) {
    Double ms = call.getDouble("ms", 0.0);
    act().pSeek(ms == null ? 0L : ms.longValue());
    call.resolve();
  }

  @PluginMethod
  public void rate(PluginCall call) {
    Float r = call.getFloat("rate", 1f);
    act().pRate(r == null ? 1f : r.floatValue());
    call.resolve();
  }

  @PluginMethod
  public void volume(PluginCall call) {
    Float v = call.getFloat("volume", 1f);
    act().pVolume(v == null ? 1f : v.floatValue());
    call.resolve();
  }

  @PluginMethod
  public void stop(PluginCall call) {
    act().pStop();
    call.resolve();
  }

  @PluginMethod
  public void selectAudio(PluginCall call) {
    Integer i = call.getInt("index", 0);
    act().pAudio(i == null ? 0 : i.intValue());
    call.resolve();
  }

  @PluginMethod
  public void selectText(PluginCall call) {
    Integer i = call.getInt("index", -1);
    act().pText(i == null ? -1 : i.intValue());
    call.resolve();
  }

  @PluginMethod
  public void switchEngine(PluginCall call) {
    act().pSwitch(call.getString("mode", "exo"));
    call.resolve();
  }

  @PluginMethod
  public void getState(PluginCall call) {
    try {
      call.resolve(new JSObject(act().pState()));
    } catch (Throwable e) {
      call.reject("No state");
    }
  }

  @PluginMethod
  public void capabilities(PluginCall call) {
    try {
      call.resolve(new JSObject(act().pCaps()));
    } catch (Throwable e) {
      call.reject("Could not read the device capabilities");
    }
  }

  /** First bytes of a link. Plugin methods run on a worker thread, so a slow host does not block the page. */
  @PluginMethod
  public void probe(PluginCall call) {
    String url = call.getString("url");
    if (url == null || url.isEmpty()) {
      call.reject("No url");
      return;
    }
    try {
      call.resolve(new JSObject(act().pProbe(url, call.getString("headers", "{}"))));
    } catch (Throwable e) {
      call.reject("Probe failed");
    }
  }

  @Override
  public void pushState(String json) {
    try {
      notifyListeners("state", new JSObject(json));
    } catch (Throwable ignored) {
    }
  }
}
