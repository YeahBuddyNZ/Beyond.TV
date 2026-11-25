package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Getting started (ADR 0077): the first time the home screen comes up on a new TV, three big-button questions with
 * the remote (where you live, who watches, the te reo word of the day), then the Drop Sky check as a code to scan
 * with a phone. Nothing technical, nothing typed, and every answer can be changed later in Home Settings.
 * Same steps as web/setup.js.
 */
public class SetupActivity extends Activity {
    /** New Zealand's main towns and cities: name, latitude, longitude. Same list as CITIES in web/setup.js. */
    static final String[][] CITIES = {
            {"Auckland", "-36.8485", "174.7633"}, {"Wellington", "-41.2865", "174.7762"},
            {"Christchurch", "-43.5321", "172.6362"}, {"Hamilton", "-37.7870", "175.2793"},
            {"Tauranga", "-37.6878", "176.1651"}, {"Dunedin", "-45.8788", "170.5028"},
            {"Palmerston North", "-40.3523", "175.6082"}, {"Napier", "-39.4928", "176.9120"},
            {"Nelson", "-41.2706", "173.2840"}, {"Rotorua", "-38.1368", "176.2497"},
            {"New Plymouth", "-39.0556", "174.0752"}, {"Whangārei", "-35.7251", "174.3237"},
            {"Invercargill", "-46.4132", "168.3538"}, {"Queenstown", "-45.0312", "168.6626"},
            {"Gisborne", "-38.6623", "178.0176"}, {"Whanganui", "-39.9301", "175.0479"}};
    static final String CHECK_URL = "https://gobeyond.nz/tv/check";

    private static final int WELCOME = 0, CITY = 1, WHO = 2, KUPU = 3, SKY = 4;
    private int step = WELCOME;
    private boolean kids;
    private FrameLayout root;
    private float k;

    // MARK: - When

    private static SharedPreferences sp(Context c) {
        return c.getApplicationContext().getSharedPreferences("setup", Context.MODE_PRIVATE);
    }

    /** A new TV that hasn't been set up yet. A TV that had Beyond TV before this screen came (an update) never sees it. */
    static boolean due(Context c) {
        if (sp(c).getBoolean("done", false)) return false;
        try {
            PackageInfo p = c.getPackageManager().getPackageInfo(c.getPackageName(), 0);
            if (p.firstInstallTime != p.lastUpdateTime) {
                done(c);
                return false;
            }
        } catch (Exception ignored) {
        }
        return true;
    }

    static void done(Context c) {
        sp(c).edit().putBoolean("done", true).apply();
    }

    static void open(Context c) {
        c.startActivity(new Intent(c, SetupActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP));
    }

    // MARK: - Screens

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        k = getResources().getDisplayMetrics().widthPixels / 1920f;
        root = new FrameLayout(this);
        setContentView(root);
        show(WELCOME);
    }

    private void show(int s) {
        step = s;
        root.removeAllViews();
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(column, new FrameLayout.LayoutParams(Math.round(1640 * k), -2, Gravity.CENTER));
        switch (s) {
            case WELCOME: welcome(column); break;
            case CITY: city(column); break;
            case WHO: who(column); break;
            case KUPU: kupu(column); break;
            default: sky(column); break;
        }
    }

    private void welcome(LinearLayout column) {
        words(column, "👋", Ui.tr("Olá! Vamos deixar sua TV pronta.", "Kia ora! Let's get your TV ready.", "¡Hola! Preparemos tu tele."),
                Ui.tr("Três perguntas rápidas. Use as setas e o OK do controle.",
                        "Three quick questions. Just use the arrows and OK on your remote.",
                        "Tres preguntas rápidas. Usa las flechas y OK del mando."));
        LinearLayout row = row(column);
        Button go = add(row, Ui.tr("Vamos lá", "Let's go", "Vamos"), true, v -> show(CITY));
        add(row, Ui.tr("Agora não", "Not now", "Ahora no"), false, v -> later());
        go.requestFocus();
    }

    private void city(LinearLayout column) {
        words(column, "📍", Ui.tr("Onde você mora?", "Where do you live?", "¿Dónde vives?"),
                Ui.tr("Para o tempo e o céu de hoje à noite. Escolha a cidade mais perto.",
                        "For your weather and tonight's sky. Pick the closest one.",
                        "Para el tiempo y el cielo de esta noche. Elige la más cercana."));
        String now = Prefs.city();
        Button first = null;
        LinearLayout row = null;
        for (int i = 0; i < CITIES.length; i++) {
            if (i % 4 == 0) row = row(column);
            final String[] c = CITIES[i];
            boolean here = c[0].equalsIgnoreCase(now);
            Button b = add(row, (here ? "✓  " : "") + c[0], here, v -> {
                Prefs.setCity(c[0], c[1], c[2]);
                show(WHO);
            });
            b.setLayoutParams(cell(b));
            if (first == null || here) first = b;
        }
        LinearLayout last = row(column);
        add(last, Ui.tr("Outro lugar", "Somewhere else", "Otro lugar"), false, v -> {
            Toast.makeText(this, Ui.tr("Sem problema: escolha em Beyond™ TV, Configurações do Início, Cidade.",
                    "No worries: pick it later in Beyond™ TV, Home Settings, City.",
                    "Sin problema: elígela luego en Beyond™ TV, Ajustes de Inicio, Ciudad."), Toast.LENGTH_LONG).show();
            show(WHO);
        });
        if (first != null) first.requestFocus();
    }

    private LinearLayout.LayoutParams cell(Button b) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(Math.round(380 * k), Math.round(104 * k));
        p.leftMargin = p.rightMargin = Math.round(10 * k);
        p.topMargin = Math.round(8 * k);
        b.setTextSize(TypedValue.COMPLEX_UNIT_PX, 34 * k);
        return p;
    }

    private void who(LinearLayout column) {
        words(column, "🏠", Ui.tr("Quem assiste esta TV?", "Who watches this TV?", "¿Quién ve esta tele?"),
                Ui.tr("Com crianças, cada um ganha o seu próprio Início, e as crianças só veem apps para a idade delas.",
                        "With kids, everyone gets their own home screen, and kids only see apps for their age.",
                        "Con niños, cada uno tiene su propio inicio, y los niños solo ven apps para su edad."));
        LinearLayout row = row(column);
        Button grown = add(row, Ui.tr("Só adultos", "Just grown-ups", "Solo adultos"), !kids, v -> { kids = false; show(KUPU); });
        Button family = add(row, Ui.tr("Adultos e crianças", "Grown-ups and kids", "Adultos y niños"), kids, v -> { kids = true; show(KUPU); });
        (kids ? family : grown).requestFocus();
    }

    private void kupu(LinearLayout column) {
        words(column, "🌿", Ui.tr("Uma palavra em te reo Māori por dia?", "A te reo Māori word each day?", "¿Una palabra en te reo maorí al día?"),
                Ui.tr("Uma palavra nova no Início todos os dias, a mesma em todas as TVs da casa.",
                        "A new word on the home screen every day, the same on every TV in the house.",
                        "Una palabra nueva en el inicio cada día, la misma en todas las teles de la casa."));
        LinearLayout row = row(column);
        Button yes = add(row, Ui.tr("Sim, por favor", "Yes please", "Sí, por favor"), true, v -> { Prefs.setKupu(true); show(SKY); });
        Button no = add(row, Ui.tr("Não, obrigado", "No thanks", "No, gracias"), false, v -> { Prefs.setKupu(false); show(SKY); });
        (Prefs.kupu() ? yes : no).requestFocus();
    }

    private void sky(LinearLayout column) {
        LinearLayout side = new LinearLayout(this);
        side.setGravity(Gravity.CENTER_VERTICAL);
        column.addView(side, new LinearLayout.LayoutParams(-1, -2));
        LinearLayout words = new LinearLayout(this);
        words.setOrientation(LinearLayout.VERTICAL);
        side.addView(words, new LinearLayout.LayoutParams(0, -2, 1));
        TextView title = left(FeedbackActivity.text(this, Ui.tr("Tudo pronto! E dá para largar a Sky?",
                "All set! Now, could you drop Sky?", "¡Todo listo! ¿Y podrías dejar Sky?"), Ui.displaySemibold, 64 * k, 0xFFFFFFFF));
        words.addView(title, new LinearLayout.LayoutParams(-1, -2));
        TextView sub = left(FeedbackActivity.text(this, Ui.tr("Aponte a câmera do celular para o código. Em dois minutos você vê o que assiste de graça ou mais barato sem a Sky.",
                "Point your phone's camera at the code. In two minutes you'll see which of your shows are free or cheaper without Sky.",
                "Apunta la cámara del móvil al código. En dos minutos verás qué ves gratis o más barato sin Sky."), Ui.regular, 38 * k, 0xE6FFFFFF));
        sub.setLineSpacing(10 * k, 1);
        sub.setPadding(0, Math.round(28 * k), 0, 0);
        words.addView(sub, new LinearLayout.LayoutParams(-1, -2));
        TextView address = left(FeedbackActivity.text(this, Ui.tr("Ou abra ", "Or open ", "O abre ") + "gobeyond.nz/tv/check",
                Ui.medium, 32 * k, 0xA6FFFFFF));
        address.setPadding(0, Math.round(24 * k), 0, Math.round(48 * k));
        words.addView(address, new LinearLayout.LayoutParams(-1, -2));
        LinearLayout buttons = new LinearLayout(this);
        words.addView(buttons, new LinearLayout.LayoutParams(-1, -2));
        Button finish = add(buttons, "✓  " + (kids ? Ui.tr("Adicionar a família", "Add the family", "Añadir a la familia")
                : Ui.tr("Ir para o Início", "Show my home screen", "Ir al inicio")), true, v -> finishSetup());
        PhotosActivity.QrView qr = new PhotosActivity.QrView(this, Qr.encode(CHECK_URL));
        LinearLayout.LayoutParams qp = new LinearLayout.LayoutParams(Math.round(460 * k), Math.round(460 * k));
        qp.leftMargin = Math.round(80 * k);
        side.addView(qr, qp);
        finish.requestFocus();
    }

    // MARK: - Pieces

    private void words(LinearLayout column, String emoji, String title, String sub) {
        TextView icon = FeedbackActivity.text(this, Ui.emoji(emoji), Ui.regular, 110 * k, 0xFFFFFFFF);
        column.addView(icon, new LinearLayout.LayoutParams(-1, -2));
        if (step > WELCOME && step < SKY) {
            TextView of = FeedbackActivity.text(this, Ui.tr("Pergunta " + step + " de 3", "Question " + step + " of 3", "Pregunta " + step + " de 3"),
                    Ui.medium, 30 * k, 0xA6FFFFFF);
            of.setPadding(0, Math.round(16 * k), 0, 0);
            column.addView(of, new LinearLayout.LayoutParams(-1, -2));
        }
        TextView t = FeedbackActivity.text(this, title, Ui.displaySemibold, 72 * k, 0xFFFFFFFF);
        t.setPadding(0, Math.round(16 * k), 0, 0);
        column.addView(t, new LinearLayout.LayoutParams(-1, -2));
        TextView s = FeedbackActivity.text(this, sub, Ui.regular, 38 * k, 0xE6FFFFFF);
        s.setLineSpacing(8 * k, 1);
        s.setPadding(0, Math.round(22 * k), 0, Math.round(44 * k));
        column.addView(s, new LinearLayout.LayoutParams(-1, -2));
    }

    private LinearLayout row(LinearLayout column) {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_HORIZONTAL);
        column.addView(row, new LinearLayout.LayoutParams(-1, -2));
        return row;
    }

    /** A big pill: 120 px tall at 1080p, the words at 40 px, so it reads from the couch. */
    private Button add(LinearLayout row, String label, boolean primary, View.OnClickListener run) {
        Button b = FeedbackActivity.button(this, label, k, primary);
        b.setTextSize(TypedValue.COMPLEX_UNIT_PX, 40 * k);
        b.setPadding(Math.round(56 * k), 0, Math.round(56 * k), 0);
        b.setOnClickListener(run);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-2, Math.round(120 * k));
        p.leftMargin = p.rightMargin = Math.round(14 * k);
        row.addView(b, p);
        return b;
    }

    private static TextView left(TextView t) {
        t.setGravity(Gravity.START);
        return t;
    }

    // MARK: - Leaving

    /** Not now: nothing changes, and it doesn't ask again (every answer is in Home Settings). */
    private void later() {
        done(this);
        Toast.makeText(this, Ui.tr("Sem problema. Está tudo em Beyond™ TV, Configurações do Início.",
                "No worries. It's all in Beyond™ TV, Home Settings, whenever you like.",
                "Sin problema. Está todo en Beyond™ TV, Ajustes de Inicio."), Toast.LENGTH_LONG).show();
        finish();
    }

    private void finishSetup() {
        done(this);
        if (kids) WhoActivity.open(this, WhoActivity.THEN_PEOPLE);
        finish();
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        if (code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) {
            if (e.getAction() == KeyEvent.ACTION_UP) {
                if (step == WELCOME) later();
                else show(step - 1);
            }
            return true;
        }
        return super.dispatchKeyEvent(e);
    }
}
