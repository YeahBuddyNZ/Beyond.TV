package nz.gobeyond.tv;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;

/**
 * Keeps Beyond TV up to date. Every few hours the main process asks GitHub for the newest "android-<versionCode>"
 * release, downloads its BeyondTV.apk and keeps it only if it is this app, newer, and signed with the same key as the
 * installed copy. Then, by default, the next time the home screen opens, Android's own install prompt is shown: one OK
 * press. With "Install updates by themselves" on (Settings > Updates, off unless the person turns it on), it installs
 * through the TV's own ADB instead, only with a key the TV already allowed, and only while nobody is looking at the
 * home screen. Android checks the signature again itself either way.
 */
final class Updater {
    private Updater() {}

    static final String RELEASES = "https://api.github.com/repos/YeahBuddyNZ/Beyond.TV/releases?per_page=20";
    /**
     * A second way to hear about updates: a small file CI keeps next to the newest APK in the "tv" release. It is a
     * plain download (no API, no rate limit, no special headers), so if one way breaks the other still gets through.
     */
    static final String LATEST = "https://github.com/YeahBuddyNZ/Beyond.TV/releases/download/tv/latest.json";
    private static final String DOWNLOADS = "https://github.com/YeahBuddyNZ/Beyond.TV/releases/download/android-";
    static final String ACTION_RESULT = "nz.gobeyond.tv.UPDATE_RESULT";
    /** How often to look: every half hour, so a new version reaches TVs the same evening. */
    static final long EVERY = 30L * 60 * 1000;
    private static final long WAIT_FOR_QUIET = 30L * 60 * 1000;
    /** Asked once, then left alone for this long: "not now" is an answer. */
    private static final long ASK_AGAIN = 12L * 60 * 60 * 1000;
    private static final long MAX_BYTES = 80L * 1024 * 1024;

    private static File dir(Context c) { return new File(c.getFilesDir(), "update"); }
    private static File apk(Context c) { return new File(dir(c), "BeyondTV.apk"); }
    private static File stamp(Context c, String name) { return new File(dir(c), name); }

    /** From the home screen: schedules a look when the last one was a while ago, and says when an update went in. */
    static void maybeCheck(Context c) {
        if (System.currentTimeMillis() - stamp(c, "checked").lastModified() > EVERY) {
            ModeJob.schedule(c, ModeJob.UPDATE, "", 30_000);
        }
        long expected = readLong(stamp(c, "installing"));
        if (expected > 0) {
            try {
                PackageInfo me = c.getPackageManager().getPackageInfo(c.getPackageName(), 0);
                if (versionCode(me) >= expected) {
                    stamp(c, "installing").delete();
                    HomeMode.notice(c, Ui.tr("Beyond™ TV foi atualizado para a versão ", "Beyond™ TV updated itself to version ")
                            + me.versionName + ".");
                }
            } catch (PackageManager.NameNotFoundException ignored) {
            }
        }
    }

    /** Settings > Updates > Check now: looks straight away. */
    static void checkSoon(Context c) {
        try {
            if (!dir(c).isDirectory()) dir(c).mkdirs();
            touch(stamp(c, "asked-check"));
        } catch (IOException ignored) {
        }
        ModeJob.schedule(c, ModeJob.UPDATE, "", 0);
    }

    // MARK: - Install by themselves (a file, so every process sees the same answer)

    static boolean auto(Context c) { return stamp(c, "auto").exists(); }

    static void setAuto(Context c, boolean on) {
        File f = stamp(c, "auto");
        try {
            if (!on) { f.delete(); return; }
            if (!dir(c).isDirectory()) dir(c).mkdirs();
            touch(f);
        } catch (IOException e) {
            AppLog.w("update: " + e.getMessage());
        }
        if (on && apk(c).isFile()) ModeJob.schedule(c, ModeJob.UPDATE, "", 5_000);
    }

    /** The home screen is on screen (so an update by itself waits rather than blink it away). */
    static void homeShowing(Context c, boolean showing) {
        File f = stamp(c, "home-front");
        try {
            if (showing) { if (!dir(c).isDirectory()) dir(c).mkdirs(); touch(f); } else f.delete();
        } catch (IOException ignored) {
        }
    }

    /** For Settings > Updates: one line on where things stand. */
    static String status(Context c) {
        long checked = stamp(c, "checked").lastModified(), asked = stamp(c, "asked-check").lastModified();
        if (apk(c).isFile()) {
            String name = readText(stamp(c, "ready-name"));
            return Ui.tr("Versão ", "Version ") + (name.isEmpty() ? "" : name + " ") + Ui.tr("pronta: OK instala", "ready: OK installs it");
        }
        if (asked > checked && System.currentTimeMillis() - asked < 2 * 60_000) return Ui.tr("Procurando…", "Checking…");
        String error = readText(stamp(c, "error"));
        // The reason goes to the check-in, not on screen: "HTTP 403" means nothing to anybody on the couch.
        if (!error.isEmpty() && stamp(c, "error").lastModified() >= checked - 1000)
            return Ui.tr("Não deu para ver agora; tenta de novo sozinho", "Couldn't check just now. It tries again by itself");
        if (checked == 0) return Ui.tr("Ainda não procurou", "Not checked yet");
        return Ui.tr("Em dia, visto ", "Up to date, checked ") + ago(checked);
    }

    private static String ago(long at) {
        long minutes = Math.max(0, (System.currentTimeMillis() - at) / 60_000);
        if (minutes < 1) return Ui.tr("agora", "now");
        if (minutes < 60) return Ui.tr("há " + minutes + " min", minutes + " min ago");
        if (minutes < 48 * 60) return Ui.tr("há " + (minutes / 60) + " h", (minutes / 60) + " h ago");
        return Ui.tr("há " + (minutes / 1440) + " dias", (minutes / 1440) + " days ago");
    }

    /** In a background job (main process). */
    static void checkNow(Context c) throws Exception {
        try {
            look(c);
            stamp(c, "error").delete();
        } catch (Exception e) {
            writeText(stamp(c, "error"), e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
            throw e;
        }
    }

    private static void look(Context c) throws Exception {
        File d = dir(c);
        if (!d.isDirectory() && !d.mkdirs()) throw new IOException("no update folder");
        touch(stamp(c, "checked"));
        File shared = shared(c);
        if (shared != null) shared.delete();   // a copy left from installing by itself
        long installed = versionCode(c.getPackageManager().getPackageInfo(c.getPackageName(), 0));
        if (apk(c).isFile() && readLong(stamp(c, "ready")) <= installed) apk(c).delete();   // installed meanwhile

        long best = 0;
        String url = null, digest = null;
        Exception viaReleases = null;
        try {
            JSONArray releases = new JSONArray(get(RELEASES));
            for (int i = 0; i < releases.length(); i++) {
                JSONObject r = releases.getJSONObject(i);
                if (r.optBoolean("draft") || r.optBoolean("prerelease")) continue;
                String tag = r.optString("tag_name", "");
                if (!tag.startsWith("android-")) continue;
                long code;
                try { code = Long.parseLong(tag.substring(8)); } catch (NumberFormatException e) { continue; }
                if (code <= best) continue;
                JSONArray assets = r.optJSONArray("assets");
                if (assets == null) continue;
                for (int j = 0; j < assets.length(); j++) {
                    JSONObject a = assets.getJSONObject(j);
                    if (!"BeyondTV.apk".equals(a.optString("name"))) continue;
                    best = code;
                    url = a.optString("browser_download_url", null);
                    digest = a.optString("digest", null);   // "sha256:..." on newer GitHub
                }
            }
        } catch (Exception e) {
            viaReleases = e;
        }
        try {
            JSONObject l = new JSONObject(Http.get(LATEST, null, 64 * 1024));
            long code = l.optLong("code", 0);
            String u = l.optString("url", "");
            if (code > best && u.equals(DOWNLOADS + code + "/BeyondTV.apk")) {
                best = code;
                url = u;
                String sha = l.optString("sha256", "");
                digest = sha.isEmpty() ? null : "sha256:" + sha;
            }
            // One way failed and the other worked: worth knowing before both do.
            if (viaReleases != null) Checkin.error(c, "update", "releases: " + viaReleases);
        } catch (Exception e) {
            if (viaReleases != null) throw viaReleases;
            Checkin.error(c, "update", "latest.json: " + e);
        }
        if (url == null || best <= installed) {
            AppLog.w("update: up to date (" + installed + ")");
            return;
        }
        if (apk(c).isFile() && best == readLong(stamp(c, "ready"))) {   // already downloaded
            if (auto(c)) installByItself(c);
            return;
        }

        File part = new File(d, "download.part");
        download(url, part);
        if (digest != null && digest.startsWith("sha256:") && !digest.substring(7).equalsIgnoreCase(sha256(part))) {
            part.delete();
            throw new IOException("download does not match GitHub's checksum");
        }
        String problem = problem(c, part, installed);
        if (problem != null) {
            part.delete();
            AppLog.w("update: refused " + best + ": " + problem);
            return;
        }
        apk(c).delete();
        if (!part.renameTo(apk(c))) throw new IOException("could not keep the download");
        writeLong(stamp(c, "ready"), best);
        PackageInfo next = c.getPackageManager().getPackageArchiveInfo(apk(c).getPath(), 0);
        writeText(stamp(c, "ready-name"), next == null || next.versionName == null ? "" : next.versionName);
        stamp(c, "asked").delete();
        AppLog.w("update: " + best + " is ready to install");
        if (auto(c)) installByItself(c);
    }

    /**
     * Installs the ready update through the TV's own ADB, without a prompt. Only with a key the TV already allowed
     * (Adb.connect with 0 never asks), and not while the home screen is in front of somebody: then it tries again later.
     * If it can't, the update waits for the usual prompt instead. Our own process ends when the new version goes in.
     */
    private static void installByItself(Context c) {
        File file = apk(c);
        if (!file.isFile()) return;
        android.os.PowerManager power = c.getSystemService(android.os.PowerManager.class);
        boolean screenOn = power == null || power.isInteractive();
        if (screenOn && stamp(c, "home-front").exists()
                && System.currentTimeMillis() - stamp(c, "home-front").lastModified() < 6 * 60 * 60 * 1000L) {
            AppLog.w("update: the home screen is showing, installing later");
            ModeJob.schedule(c, ModeJob.UPDATE, "", WAIT_FOR_QUIET);
            return;
        }
        File copy = shared(c);
        if (copy == null) return;
        try {
            long ready = readLong(stamp(c, "ready"));
            try (InputStream in = new FileInputStream(file); OutputStream out = new FileOutputStream(copy)) {
                copy(in, out, MAX_BYTES);
            }
            // The shell can read our folder on shared storage, never our private one. Fixed path, no spaces.
            writeLong(stamp(c, "installing"), ready);
            try (Adb adb = Adb.connect(c, 0, null)) {
                String out = adb.shell("pm install -r " + copy.getAbsolutePath()).trim();
                if (!out.contains("Success")) throw new IOException(out.isEmpty() ? "no answer" : out);
            }
            file.delete();
        } catch (Exception e) {
            stamp(c, "installing").delete();
            copy.delete();
            AppLog.w("update: couldn't install by itself (" + e.getMessage() + "), the TV will ask instead");
            Checkin.error(c, "update", "install by itself: " + e.getMessage());
        }
    }

    /** Where the shell can read the update: our folder on shared storage (no permission needed for it). */
    private static File shared(Context c) {
        File d = c.getExternalFilesDir(null);
        if (d == null || (!d.isDirectory() && !d.mkdirs())) return null;
        return new File(d, "BeyondTV-update.apk");
    }

    /** Why this file must not be offered, or null when it is this app, newer, and signed with our key. */
    @SuppressWarnings("deprecation")
    static String problem(Context c, File file, long installed) {
        PackageManager pm = c.getPackageManager();
        PackageInfo next = pm.getPackageArchiveInfo(file.getPath(), PackageManager.GET_SIGNATURES);
        if (next == null) return "not an app";
        if (!c.getPackageName().equals(next.packageName)) return "another app (" + next.packageName + ")";
        if (versionCode(next) <= installed) return "not newer";
        try {
            Signature[] ours = pm.getPackageInfo(c.getPackageName(), PackageManager.GET_SIGNATURES).signatures;
            if (ours == null || next.signatures == null || next.signatures.length == 0) return "no signature";
            if (!Arrays.equals(ours, next.signatures)) return "signed with a different key";
        } catch (PackageManager.NameNotFoundException e) {
            return "can't read our own signature";
        }
        return null;
    }

    /**
     * On the home screen: when an update is ready and we haven't just asked, hands it to Android's installer, which
     * shows its own "Do you want to install an update?" prompt. Off the UI thread. now: asked for in Settings.
     */
    static void offer(final Activity a) {
        offer(a, false);
    }

    static boolean ready(Context c) { return apk(c).isFile(); }

    static void offer(final Activity a, boolean now) {
        final Context c = a.getApplicationContext();
        final File file = apk(c);
        if (!file.isFile()) return;
        if (!now && System.currentTimeMillis() - stamp(c, "asked").lastModified() < ASK_AGAIN) return;
        new Thread(() -> {
            try {
                long installed = versionCode(c.getPackageManager().getPackageInfo(c.getPackageName(), 0));
                String problem = problem(c, file, installed);
                if (problem != null) {   // installed meanwhile, or the file changed: forget it
                    file.delete();
                    return;
                }
                touch(stamp(c, "asked"));
                install(c, file);
            } catch (Throwable t) {
                AppLog.w("update: offer failed: " + t);
            }
        }, "beyond-tv-update").start();
    }

    private static void install(Context c, File file) throws IOException {
        PackageInstaller installer = c.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(
                PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setAppPackageName(c.getPackageName());
        params.setSize(file.length());
        int id = installer.createSession(params);
        try (PackageInstaller.Session session = installer.openSession(id)) {
            try (InputStream in = new FileInputStream(file);
                 OutputStream out = session.openWrite("BeyondTV.apk", 0, file.length())) {
                copy(in, out, Long.MAX_VALUE);
                session.fsync(out);
            }
            Intent result = new Intent(ACTION_RESULT).setClass(c, Result.class);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= 31) flags |= 0x02000000;   // FLAG_MUTABLE: the installer adds its answer
            session.commit(PendingIntent.getBroadcast(c, id, result, flags).getIntentSender());
        }
    }

    /** The installer's answer. "Needs the user" carries the prompt to show; anything else is logged. */
    public static class Result extends BroadcastReceiver {
        @Override public void onReceive(Context c, Intent intent) {
            int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
            if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                Intent prompt = intent.getParcelableExtra(Intent.EXTRA_INTENT);
                if (prompt != null) c.startActivity(prompt.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            } else if (status == PackageInstaller.STATUS_SUCCESS) {
                apk(c).delete();
            } else {
                AppLog.w("update: installer said " + status + " "
                        + intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE));
            }
        }
    }

    // MARK: - Helpers

    @SuppressWarnings("deprecation")
    static long versionCode(PackageInfo p) {
        return Build.VERSION.SDK_INT >= 28 ? p.getLongVersionCode() : p.versionCode;
    }

    private static String get(String url) throws IOException {
        return Http.get(url, "application/vnd.github+json", 2L * 1024 * 1024);
    }

    private static void download(String url, File to) throws IOException {
        Http.download(url, to, MAX_BYTES);
    }

    private static void copy(InputStream in, OutputStream out, long max) throws IOException {
        Http.copy(in, out, max);
    }

    private static String sha256(File f) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        try (InputStream in = new FileInputStream(f)) {
            byte[] buffer = new byte[64 * 1024];
            int n;
            while ((n = in.read(buffer)) > 0) md.update(buffer, 0, n);
        }
        StringBuilder s = new StringBuilder();
        for (byte b : md.digest()) s.append(String.format("%02x", b));
        return s.toString();
    }

    private static void touch(File f) throws IOException {
        if (!f.exists()) new FileOutputStream(f).close();
        f.setLastModified(System.currentTimeMillis());
    }

    private static long readLong(File f) {
        try (InputStream in = new FileInputStream(f)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            copy(in, out, 64);
            return Long.parseLong(out.toString("UTF-8").trim());
        } catch (Exception e) {
            return -1;
        }
    }

    private static String readText(File f) {
        if (!f.isFile()) return "";
        try (InputStream in = new FileInputStream(f)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            copy(in, out, 400);
            return out.toString("UTF-8").trim();
        } catch (Exception e) {
            return "";
        }
    }

    private static void writeText(File f, String v) {
        try (OutputStream out = new FileOutputStream(f)) {
            out.write(v.getBytes(StandardCharsets.UTF_8));
        } catch (IOException ignored) {
        }
    }

    private static void writeLong(File f, long v) throws IOException {
        try (OutputStream out = new FileOutputStream(f)) {
            out.write(Long.toString(v).getBytes(StandardCharsets.UTF_8));
        }
    }
}
