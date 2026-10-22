package nz.gobeyond.tv;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.StateListDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.speech.RecognizerIntent;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.ArrayList;

/**
 * Talk to Beyond: the home screen's four-dots button. Somebody says (or types) what would make Beyond™ TV better and
 * it goes to the Engine Room against this TV's made-up id (Checkin). If Beyond answers, the answer shows on this
 * TV's home screen. Speech goes through the TV's own voice search (the remote's microphone), so the app never
 * listens itself and needs no microphone permission; a TV without it gets the keyboard.
 */
public class FeedbackActivity extends Activity {
    private static final int SPEAK = 1;
    private static final int VIOLET = Glow.VIOLET, LILAC = Glow.LILAC;

    private TextView prompt;
    private EditText words;
    private Button speak, send, again;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean sending;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        float k = getResources().getDisplayMetrics().widthPixels / 1920f;

        FrameLayout root = new FrameLayout(this);
        root.addView(new Backdrop(this), new FrameLayout.LayoutParams(-1, -1));

        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.round(1100 * k), -2, Gravity.CENTER);
        lp.topMargin = Math.round(120 * k);
        root.addView(column, lp);

        TextView title = text(this, Ui.tr("Fale com a Beyond", "Talk to Beyond"), Ui.displaySemibold, 56 * k, 0xFFFFFFFF);
        column.addView(title);
        prompt = text(this, Ui.tr("O que deixaria o Beyond™ TV melhor? Fale ou escreva. A gente lê tudo.",
                "What would make Beyond™ TV better? Say it, or type it. We read every one."), Ui.regular, 30 * k, 0xCCFFFFFF);
        prompt.setPadding(0, Math.round(18 * k), 0, Math.round(36 * k));
        column.addView(prompt);

        words = new EditText(this);
        words.setTypeface(Ui.regular);
        words.setTextSize(TypedValue.COMPLEX_UNIT_PX, 32 * k);
        words.setTextColor(0xFFFFFFFF);
        words.setHintTextColor(0x80FFFFFF);
        words.setHint(Ui.tr("Ou escreva aqui", "Or type it here"));
        words.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        words.setImeOptions(EditorInfo.IME_ACTION_DONE);
        words.setMaxLines(4);
        words.setFilters(new android.text.InputFilter[] {new android.text.InputFilter.LengthFilter(1000)});
        int pad = Math.round(24 * k);
        words.setPadding(pad, pad, pad, pad);
        words.setBackground(pill(0x33FFFFFF, 0x5CFFFFFF, 20 * k, 2 * k, LILAC));
        words.addTextChangedListener(new android.text.TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int b, int c) {}
            @Override public void onTextChanged(CharSequence s, int a, int b, int c) {}
            @Override public void afterTextChanged(android.text.Editable s) { refresh(); }
        });
        column.addView(words, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout buttons = new LinearLayout(this);
        buttons.setGravity(Gravity.CENTER);
        buttons.setPadding(0, Math.round(40 * k), 0, 0);
        speak = button(this, Ui.tr("Falar", "Speak"), k, true);
        again = button(this, Ui.tr("Falar de novo", "Say it again"), k, false);
        send = button(this, Ui.tr("Enviar para a Beyond", "Send to Beyond"), k, true);
        speak.setOnClickListener(v -> listen());
        again.setOnClickListener(v -> listen());
        send.setOnClickListener(v -> send());
        for (Button b : new Button[] {speak, again, send}) {
            LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
            bp.leftMargin = bp.rightMargin = Math.round(12 * k);
            buttons.addView(b, bp);
        }
        column.addView(buttons);

        setContentView(root);
        refresh();
        speak.requestFocus();
    }

    private void refresh() {
        boolean said = words.getText().toString().trim().length() > 0;
        speak.setVisibility(said ? View.GONE : View.VISIBLE);
        again.setVisibility(said ? View.VISIBLE : View.GONE);
        send.setVisibility(said ? View.VISIBLE : View.GONE);
        send.setEnabled(!sending);
    }

    private void listen() {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_PROMPT, Ui.tr("O que deixaria o Beyond™ TV melhor?", "What would make Beyond™ TV better?"));
        try {
            startActivityForResult(i, SPEAK);
        } catch (ActivityNotFoundException | SecurityException e) {
            // No voice search on this TV: the keyboard it is.
            prompt.setText(Ui.tr("Esta TV não tem busca por voz. Escreva aqui embaixo.", "This TV can't listen, so type it below."));
            words.requestFocus();
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != SPEAK || resultCode != RESULT_OK || data == null) return;
        ArrayList<String> heard = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        if (heard == null || heard.isEmpty()) return;
        String line = heard.get(0).trim();
        if (line.isEmpty()) return;
        line = Character.toUpperCase(line.charAt(0)) + line.substring(1);
        words.setText(line);
        words.setSelection(line.length());
        refresh();
        send.requestFocus();
    }

    private void send() {
        final String line = words.getText().toString().trim();
        if (line.isEmpty() || sending) return;
        sending = true;
        refresh();
        prompt.setText(Ui.tr("Enviando…", "Sending…"));
        final Context app = getApplicationContext();
        new Thread(() -> {
            final boolean ok = Checkin.feedback(app, line);
            handler.post(() -> {
                sending = false;
                if (isFinishing()) return;
                if (ok) {
                    prompt.setText(Ui.tr("Obrigado! Se a gente responder, aparece aqui na sua TV.",
                            "Thank you! If we reply, it shows up here on your TV."));
                    words.setVisibility(View.GONE);
                    speak.setVisibility(View.GONE);
                    again.setVisibility(View.GONE);
                    send.setVisibility(View.GONE);
                    handler.postDelayed(this::finish, 3500);
                } else {
                    prompt.setText(Ui.tr("Não foi agora. Confira a internet e tente de novo.",
                            "That didn't go. Check the internet and try again."));
                    refresh();
                }
            });
        }, "beyond-tv-feedback").start();
    }

    @Override protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }

    // MARK: - Pieces

    static TextView text(Context c, String s, android.graphics.Typeface face, float px, int color) {
        TextView t = new TextView(c);
        t.setText(s);
        t.setTypeface(face);
        t.setTextSize(TypedValue.COMPLEX_UNIT_PX, px);
        t.setTextColor(color);
        t.setGravity(Gravity.CENTER);
        return t;
    }

    /** A pill: violet (or glass) at rest, white with violet words when focused, like the rest of the TV. */
    static Button button(Context c, String label, float k, boolean primary) {
        Button b = new Button(c);
        b.setText(label);
        b.setAllCaps(false);
        b.setTypeface(Ui.semibold);
        b.setTextSize(TypedValue.COMPLEX_UNIT_PX, 30 * k);
        b.setPadding(Math.round(44 * k), 0, Math.round(44 * k), 0);
        b.setTextColor(new android.content.res.ColorStateList(
                new int[][] {{android.R.attr.state_focused}, {}}, new int[] {Glow.VIOLET_TEXT, 0xFFFFFFFF}));
        StateListDrawable bg = new StateListDrawable();
        bg.addState(new int[] {android.R.attr.state_focused}, pill(0xFFFFFFFF, 0, 42 * k, 0, 0));
        bg.addState(new int[] {}, pill(primary ? VIOLET : 0x33FFFFFF, 0, 42 * k, 0, 0));
        b.setBackground(bg);
        b.setStateListAnimator(null);
        return b;
    }

    static android.graphics.drawable.Drawable pill(int fill, int stroke, float radius, float width, int focusStroke) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(fill);
        d.setCornerRadius(radius);
        if (width > 0) d.setStroke(Math.round(width), stroke);
        if (focusStroke == 0) return d;
        GradientDrawable f = new GradientDrawable();
        f.setColor(fill);
        f.setCornerRadius(radius);
        f.setStroke(Math.round(width * 1.5f), focusStroke);
        StateListDrawable s = new StateListDrawable();
        s.addState(new int[] {android.R.attr.state_focused}, f);
        s.addState(new int[] {}, d);
        return s;
    }

    /** The breathing violet sky and the four dots, above the words. */
    static final class Backdrop extends View {
        private final Glow glow = new Glow();
        private final Breath.Clock clock = new Breath.Clock();
        private final Paint mark = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final long born = SystemClock.uptimeMillis();
        private long last;

        Backdrop(Context c) {
            super(c);
        }

        @Override protected void onSizeChanged(int w, int h, int ow, int oh) {
            glow.setSize(w, h);
        }

        @Override protected void onDraw(Canvas c) {
            float k = getWidth() / 1920f, seconds = (SystemClock.uptimeMillis() - born) / 1000f;
            float period = Breath.period(0, false);
            glow.draw(c, seconds, clock.at(seconds, period), 1, 1);
            Breath.mark(c, mark, getWidth() / 2f, 150 * k, 110 * k, seconds, period, 1);
            long now = SystemClock.uptimeMillis();
            postInvalidateDelayed(Math.max(16, 66 - (now - last)));
            last = now;
        }
    }

    static void open(Context c) {
        c.startActivity(new Intent(c, FeedbackActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

}
