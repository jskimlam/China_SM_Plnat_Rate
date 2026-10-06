package com.jskimlam.chinasm;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Environment;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import android.provider.MediaStore;
import android.util.Base64;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://jskimlam.github.io/China_SM_Plnat_Rate/";
    private WebView webView;
    private ProgressBar progress;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(8, 17, 31));
        getWindow().setNavigationBarColor(Color.rgb(8, 17, 31));

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(8, 17, 31));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(8, 17, 31));
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        progress = new ProgressBar(this);
        int size = (int) (48 * getResources().getDisplayMetrics().density);
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(size, size);
        progressParams.gravity = Gravity.CENTER;
        root.addView(progress, progressParams);

        setContentView(root);
        configureWebView();

        // Do not restore a stale WebView document after a dashboard deployment.
        // Keep cookies/localStorage, but drop HTTP cache and request a fresh entry page.
        webView.clearCache(true);
        webView.loadUrl(APP_URL + "?app=android&v=6");
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        // Always prefer the latest GitHub Pages assets. The app is a thin web shell,
        // so web dashboard releases should appear without rebuilding the APK.
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setUserAgentString(settings.getUserAgentString() + " ChinaSMIntelligence/1.0");
        // Native bridge used by the A4 report exporter. This makes PNG saving reliable
        // inside Android WebView instead of depending on blob: URL download support.
        webView.addJavascriptInterface(new ReportBridge(), "AndroidReport");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progress.setVisibility(newProgress >= 90 ? ProgressBar.GONE : ProgressBar.VISIBLE);
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if (host != null && (host.equals("jskimlam.github.io") || host.equals("script.google.com"))) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                    view.loadUrl(uri.toString());
                }
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    Toast.makeText(MainActivity.this,
                            "네트워크 연결을 확인해 주세요.", Toast.LENGTH_LONG).show();
                }
            }
        });
    }

    private class ReportBridge {
        @JavascriptInterface
        public void savePng(String dataUrl, String fileName) {
            try {
                String safeName = (fileName == null || fileName.isBlank())
                        ? "China_SM_Overview_Report.png"
                        : fileName.replaceAll("[\\\\/:*?\"<>|]", "-");
                int comma = dataUrl == null ? -1 : dataUrl.indexOf(',');
                if (comma < 0) {
                    showToast("보고서 이미지 데이터가 올바르지 않습니다.");
                    return;
                }

                byte[] bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);
                String savedLocation;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Images.Media.DISPLAY_NAME, safeName);
                    values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                    values.put(MediaStore.Images.Media.RELATIVE_PATH,
                            Environment.DIRECTORY_PICTURES + "/China SM Intelligence");
                    values.put(MediaStore.Images.Media.IS_PENDING, 1);

                    Uri uri = getContentResolver().insert(
                            MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) throw new IllegalStateException("MediaStore insert failed");

                    try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                        if (out == null) throw new IllegalStateException("Output stream unavailable");
                        out.write(bytes);
                        out.flush();
                    }

                    values.clear();
                    values.put(MediaStore.Images.Media.IS_PENDING, 0);
                    getContentResolver().update(uri, values, null, null);
                    savedLocation = "사진 > China SM Intelligence";
                } else {
                    File dir = new File(getExternalFilesDir(Environment.DIRECTORY_PICTURES),
                            "China SM Intelligence");
                    if (!dir.exists() && !dir.mkdirs()) {
                        throw new IllegalStateException("Folder creation failed");
                    }
                    File outFile = new File(dir, safeName);
                    try (OutputStream out = new FileOutputStream(outFile)) {
                        out.write(bytes);
                        out.flush();
                    }
                    savedLocation = outFile.getAbsolutePath();
                }

                showToast("A4 보고서 이미지 저장 완료\n" + savedLocation);
            } catch (Exception e) {
                showToast("보고서 이미지 저장 실패: " + e.getMessage());
            }
        }
    }

    private void showToast(String message) {
        runOnUiThread(() -> Toast.makeText(
                MainActivity.this, message, Toast.LENGTH_LONG).show());
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
