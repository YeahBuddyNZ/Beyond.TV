package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.security.SecureRandom;
import java.util.Locale;

/**
 * Family photos (ADR 0059): a QR code for a phone on the same Wi-Fi. The phone opens a little page from the TV, picks
 * photos or the kids' art (and who drew it), and sends them; they go on the screensaver. The TV only listens while this
 * screen is open, for 20 minutes at most, and only to the code on it.
 */
public class PhotosActivity extends Activity {
    private static final long OPEN_FOR = 20 * 60_000L;

    private final Handler main = new Handler(Looper.getMainLooper());
    private PhotoDrop drop;
    private TextView count;
    private Button remove;
    private boolean removing;

    static void open(Context c) {
        c.startActivity(new Intent(c, PhotosActivity.class));
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        float k = getResources().getDisplayMetrics().widthPixels / 1920f;
        String code = String.format(Locale.ROOT, "%04d", new SecureRandom().nextInt(10000));
        String address = PhotoDrop.address();
        try {
            drop = new PhotoDrop(page(), code, new PhotoDrop.Sink() {
                @Override public boolean save(byte[] picture, boolean art, String by) {
                    boolean ok = FamilyPhotos.save(getApplicationContext(), picture, art, by);
                    if (ok) main.post(PhotosActivity.this::arrived);
                    return ok;
                }

                @Override public String names() {
                    org.json.JSONArray a = new org.json.JSONArray();
                    for (People.Person p : People.list(getApplicationContext())) if (p.kid && p.name != null) a.put(p.name);
                    return a.toString();
                }
            });
            drop.start();
        } catch (Exception e) {
            AppLog.w("family photos: couldn't listen: " + e.getMessage());
            drop = null;
        }

        FrameLayout root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        root.addView(row, new FrameLayout.LayoutParams(Math.round(1640 * k), -2, Gravity.CENTER));

        LinearLayout words = new LinearLayout(this);
        words.setOrientation(LinearLayout.VERTICAL);
        row.addView(words, new LinearLayout.LayoutParams(0, -2, 1));
        TextView title = left(FeedbackActivity.text(this, Ui.tr("Fotos da família", "Family photos", "Fotos de la familia"),
                Ui.displaySemibold, 72 * k, 0xFFFFFFFF));
        words.addView(title, new LinearLayout.LayoutParams(-1, -2));
        String steps = drop == null || address == null
                ? Ui.tr("A TV não está na rede de casa agora. Ligue o Wi-Fi e tente de novo.",
                        "The TV isn't on your home network right now. Check the Wi-Fi and try again.",
                        "La TV no está en la red de casa ahora. Revisa el Wi-Fi y vuelve a intentarlo.")
                : Ui.tr("1. Aponte a câmera do celular para o código.\n2. Escolha fotos ou os desenhos das crianças.\n3. Eles aparecem no protetor de tela.",
                        "1. Point your phone's camera at the code.\n2. Pick photos, or the kids' art.\n3. They show on the screensaver.",
                        "1. Apunta la cámara del móvil al código.\n2. Elige fotos o los dibujos de los niños.\n3. Salen en el salvapantallas.");
        TextView how = left(FeedbackActivity.text(this, steps, Ui.regular, 38 * k, 0xE6FFFFFF));
        how.setLineSpacing(14 * k, 1);
        how.setPadding(0, Math.round(30 * k), 0, 0);
        words.addView(how, new LinearLayout.LayoutParams(-1, -2));
        String url = address == null || drop == null ? null : "http://" + address + ":" + drop.port() + "/?c=" + code;
        if (url != null) {
            TextView typed = left(FeedbackActivity.text(this, Ui.tr("Ou abra ", "Or open ", "O abre ") + address + ":" + drop.port()
                    + Ui.tr(" e digite ", " and type ", " y escribe ") + code, Ui.regular, 30 * k, 0xA6FFFFFF));
            typed.setPadding(0, Math.round(28 * k), 0, 0);
            words.addView(typed, new LinearLayout.LayoutParams(-1, -2));
        }
        count = left(FeedbackActivity.text(this, "", Ui.medium, 32 * k, 0xFFFFFFFF));
        count.setPadding(0, Math.round(40 * k), 0, Math.round(40 * k));
        words.addView(count, new LinearLayout.LayoutParams(-1, -2));
        showCount();

        LinearLayout buttons = new LinearLayout(this);
        Button done = FeedbackActivity.button(this, "✓  " + Ui.tr("Pronto", "Done", "Listo"), k, true);
        done.setOnClickListener(v -> finish());
        remove = FeedbackActivity.button(this, Ui.tr("Remover todas as fotos", "Remove all photos", "Quitar todas las fotos"), k, false);
        remove.setOnClickListener(v -> removeAll());
        for (Button b : new Button[] {done, remove}) {
            LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(96 * k));
            bp.rightMargin = Math.round(20 * k);
            buttons.addView(b, bp);
        }
        words.addView(buttons, new LinearLayout.LayoutParams(-1, -2));

        if (url != null) {
            QrView qr = new QrView(this, Qr.encode(url));
            LinearLayout.LayoutParams qp = new LinearLayout.LayoutParams(Math.round(520 * k), Math.round(520 * k));
            qp.leftMargin = Math.round(80 * k);
            row.addView(qr, qp);
        }
        setContentView(root);
        done.requestFocus();
        main.postDelayed(this::finish, OPEN_FOR);
    }

    private static TextView left(TextView t) {
        t.setGravity(Gravity.START);
        return t;
    }

    private void showCount() {
        int n = FamilyPhotos.count(this);
        count.setText(n == 0 ? Ui.tr("Nenhuma foto ainda.", "No photos yet.", "Aún no hay fotos.")
                : n == 1 ? Ui.tr("1 foto no protetor de tela.", "1 photo on the screensaver.", "1 foto en el salvapantallas.")
                : n + Ui.tr(" fotos no protetor de tela.", " photos on the screensaver.", " fotos en el salvapantallas."));
        if (remove != null) remove.setVisibility(n == 0 ? View.GONE : View.VISIBLE);
    }

    /** A photo came in: count it, and the first time, put the screensaver on family photos (Home Settings changes it). */
    private void arrived() {
        if (isFinishing()) return;
        showCount();
        if (!"family".equals(Prefs.screensaver())) {
            Prefs.setScreensaver("family");
            Toast.makeText(this, Ui.tr("O protetor de tela agora mostra as fotos da família.",
                    "The screensaver shows your family photos now.", "El salvapantallas ahora muestra las fotos de la familia."),
                    Toast.LENGTH_LONG).show();
        }
    }

    /** Pressed twice, so it can't happen by accident. */
    private void removeAll() {
        if (!removing) {
            removing = true;
            remove.setText(Ui.tr("Pressione de novo para remover", "Press again to remove them all", "Pulsa otra vez para quitarlas"));
            main.postDelayed(() -> {
                removing = false;
                if (remove != null) remove.setText(Ui.tr("Remover todas as fotos", "Remove all photos", "Quitar todas las fotos"));
            }, 5000);
            return;
        }
        removing = false;
        FamilyPhotos.clear(this);
        remove.setText(Ui.tr("Remover todas as fotos", "Remove all photos", "Quitar todas las fotos"));
        ((LinearLayout) remove.getParent()).getChildAt(0).requestFocus();
        showCount();
    }

    private byte[] page() throws Exception {
        try (InputStream in = getAssets().open("photos.html")) {
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
            return b.toByteArray();
        }
    }

    @Override protected void onDestroy() {
        main.removeCallbacksAndMessages(null);
        if (drop != null) drop.close();
        super.onDestroy();
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        if (code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) {
            if (e.getAction() == KeyEvent.ACTION_UP) finish();
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    /** The QR code, black on white with a quiet border, every module the same whole number of pixels. */
    static final class QrView extends View {
        private final boolean[][] modules;
        private final Paint paint = new Paint();

        QrView(Context c, boolean[][] modules) {
            super(c);
            this.modules = modules;
        }

        @Override protected void onDraw(Canvas c) {
            int n = modules.length + 8;
            int cell = Math.max(1, Math.min(getWidth(), getHeight()) / n);
            int size = cell * n, x0 = (getWidth() - size) / 2, y0 = (getHeight() - size) / 2;
            paint.setColor(0xFFFFFFFF);
            c.drawRect(x0, y0, x0 + size, y0 + size, paint);
            paint.setColor(0xFF000000);
            for (int y = 0; y < modules.length; y++) {
                for (int x = 0; x < modules.length; x++) {
                    if (modules[y][x]) c.drawRect(x0 + (x + 4) * cell, y0 + (y + 4) * cell, x0 + (x + 5) * cell, y0 + (y + 5) * cell, paint);
                }
            }
        }
    }
}
