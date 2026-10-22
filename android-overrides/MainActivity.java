package app.kinora.player;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private long lastBack = 0;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    final WebView w = getBridge().getWebView();
    WebSettings s = w.getSettings();
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

    // Rotate to landscape (and hide system bars) while a video is open.
    w.addJavascriptInterface(new Object() {
      @JavascriptInterface
      public void orient(final String mode) {
        runOnUiThread(() -> {
          boolean land = "land".equals(mode);
          setRequestedOrientation(land ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
          getWindow().getDecorView().setSystemUiVisibility(land
            ? (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN
               | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN)
            : View.SYSTEM_UI_FLAG_VISIBLE);
        });
      }
    }, "KinoraNative");

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
}
