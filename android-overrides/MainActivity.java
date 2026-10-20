package app.kinora.player;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Allow videos to start without an extra tap.
    getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
  }
}
