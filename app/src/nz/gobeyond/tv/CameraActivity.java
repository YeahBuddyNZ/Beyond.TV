package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;

/**
 * A camera tile full screen: a fresh picture every two seconds from the camera on the home network, until Back. Same
 * as openCamera() in web/home.js.
 */
public class CameraActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private ImageView picture;
    private String url;
    private int width;

    static void open(Context c, String name, String url) {
        c.startActivity(new Intent(c, CameraActivity.class).putExtra("name", name).putExtra("url", url));
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        url = getIntent().getStringExtra("url");
        width = getResources().getDisplayMetrics().widthPixels;
        float k = width / 1920f;

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFF000000);
        picture = new ImageView(this);
        picture.setScaleType(ImageView.ScaleType.FIT_CENTER);
        root.addView(picture, new FrameLayout.LayoutParams(-1, -1));
        TextView name = FeedbackActivity.text(this, getIntent().getStringExtra("name"), Ui.semibold, 30 * k, 0xFFFFFFFF);
        name.setGravity(Gravity.CENTER_VERTICAL);
        name.setPadding(Math.round(26 * k), 0, Math.round(26 * k), 0);
        name.setBackground(FeedbackActivity.pill(0xB80D0C18, 0, 30 * k, 0, 0));
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(-2, Math.round(60 * k));
        lp.leftMargin = Math.round(60 * k);
        lp.topMargin = Math.round(50 * k);
        root.addView(name, lp);
        setContentView(root);
    }

    @Override protected void onResume() {
        super.onResume();
        handler.post(fresh);
    }

    @Override protected void onPause() {
        handler.removeCallbacks(fresh);
        super.onPause();
    }

    @Override protected void onDestroy() {
        Cameras.drop(width);
        super.onDestroy();
    }

    private final Runnable fresh = new Runnable() {
        @Override public void run() {
            Cameras.refresh(url, width, () -> {
                Bitmap b = Cameras.shot(url, width);
                if (b != null) picture.setImageBitmap(b);
            });
            handler.postDelayed(this, 2000);
        }
    };
}
