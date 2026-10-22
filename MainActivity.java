package app.kinora.player;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    WebView w = getBridge().getWebView();
    WebSettings s = w.getSettings();
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setBuiltInZoomControls(false);
    s.setSupportZoom(false);
    w.setOverScrollMode(View.OVER_SCROLL_NEVER);
    w.setVerticalScrollBarEnabled(false);
    w.setHorizontalScrollBarEnabled(false);
    w.setLongClickable(false);
    w.setOnLongClickListener(v -> true);
    w.setHapticFeedbackEnabled(false);
    // Lets the web player rotate the phone to landscape (and hide system bars) while a video is open.
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
  }
}
