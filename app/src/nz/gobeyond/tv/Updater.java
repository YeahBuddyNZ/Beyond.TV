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
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;

/**
 * Keeps Beyond TV up to date with one OK press. Once a day the main process asks GitHub for the newest
 * "android-<versionCode>" release, downloads its BeyondTV.apk and keeps it only if it is this app, newer, and signed
 * with the same key as the installed copy. The next time the home screen opens, Android's own install prompt is shown.
 * Nothing installs without that press, and Android checks the signature again itself.
 */
final class Updater {
    private Updater() {}

    static final String RELEASES = "https://api.github.com/repos/YeahBuddyNZ/Beyond.TV/releases?per_page=20";
    static final String ACTION_RESULT = "nz.gobeyond.tv.UPDATE_RESULT";
    private static final long DAY = 24L * 60 * 60 * 1000;
    /** Asked once, then left alone for this long: "not now" is an answer. */
    private static final long ASK_AGAIN = 12L * 60 * 60 * 1000;
    private static final long MAX_BYTES = 80L * 1024 * 1024;

    private static File dir(Context c) { return new File(c.getFilesDir(), "update"); }
    private static File apk(Context c) { return new File(dir(c), "BeyondTV.apk"); }
    private static File stamp(Context c, String name) { return new File(dir(c), name); }

    /** From the home screen: schedules the daily look when the last one was over a day ago. */
    static void maybeCheck(Context c) {
        if (System.currentTimeMillis() - stamp(c, "checked").lastModified() > DAY) {
            ModeJob.schedule(c, ModeJob.UPDATE, "", 30_000);
        }
    }

    /** In a background job (main process). */
    static void checkNow(Context c) throws Exception {
        File d = dir(c);
        if (!d.isDirectory() && !d.mkdirs()) throw new IOException("no update folder");
        touch(stamp(c, "checked"));
        long installed = versionCode(c.getPackageManager().getPackageInfo(c.getPackageName(), 0));

        JSONArray releases = new JSONArray(get(RELEASES));
        long best = 0;
        String url = null, digest = null;
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
        if (url == null || best <= installed) {
            AppLog.w("update: up to date (" + installed + ")");
            return;
        }
        if (apk(c).isFile() && best == readLong(stamp(c, "ready"))) return;   // already downloaded

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
        stamp(c, "asked").delete();
        AppLog.w("update: " + best + " is ready to install");
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
     * shows its own "Do you want to install an update?" prompt. Off the UI thread.
     */
    static void offer(final Activity a) {
        final Context c = a.getApplicationContext();
        final File file = apk(c);
        if (!file.isFile()) return;
        if (System.currentTimeMillis() - stamp(c, "asked").lastModified() < ASK_AGAIN) return;
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

    private static HttpURLConnection open(String url) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(10_000);
        c.setReadTimeout(20_000);
        c.setRequestProperty("User-Agent", "BeyondTV");
        c.setInstanceFollowRedirects(true);   // release files live on GitHub's download host
        if (c.getResponseCode() != 200) {
            c.disconnect();
            throw new IOException("HTTP " + c.getResponseCode() + " from " + new URL(url).getHost());
        }
        return c;
    }

    private static String get(String url) throws IOException {
        HttpURLConnection c = open(url);
        c.setRequestProperty("Accept", "application/vnd.github+json");
        try (InputStream in = c.getInputStream()) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            copy(in, out, 2L * 1024 * 1024);
            return out.toString(StandardCharsets.UTF_8.name());
        } finally {
            c.disconnect();
        }
    }

    private static void download(String url, File to) throws IOException {
        HttpURLConnection c = open(url);
        try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(to)) {
            copy(in, out, MAX_BYTES);
        } finally {
            c.disconnect();
        }
    }

    private static void copy(InputStream in, OutputStream out, long max) throws IOException {
        byte[] buffer = new byte[64 * 1024];
        long total = 0;
        int n;
        while ((n = in.read(buffer)) > 0) {
            total += n;
            if (total > max) throw new IOException("too big");
            out.write(buffer, 0, n);
        }
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

    private static void writeLong(File f, long v) throws IOException {
        try (OutputStream out = new FileOutputStream(f)) {
            out.write(Long.toString(v).getBytes(StandardCharsets.UTF_8));
        }
    }
}
