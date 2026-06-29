package com.gzy622.asmc4;

import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import java.util.Collections;

public class MainActivity extends BridgeActivity {
  private static final int DRAWER_GESTURE_EDGE_DP = 32;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    WebView webView = getBridge().getWebView();
    webView.setHapticFeedbackEnabled(false);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      View root = getWindow().getDecorView();
      int edgePx = Math.round(DRAWER_GESTURE_EDGE_DP * getResources().getDisplayMetrics().density);
      root.post(() -> root.setSystemGestureExclusionRects(Collections.singletonList(
        new Rect(0, 0, edgePx, root.getHeight())
      )));
    }
  }
}
