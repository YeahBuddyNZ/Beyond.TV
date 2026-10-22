package nz.gobeyond.tv;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Camera tiles pinned in Beyond Family: a still picture from a camera on the home network, fetched here and never
 * through Beyond Family. Beyond Family only takes addresses on the home network with no password in them; this checks
 * again that the address really is on the home network before asking. Plain http is spoken over a socket of our own,
 * because the app turns cleartext off for everything else; https goes through the usual connection. Same as camera()
 * in web/home.js.
 */
final class Cameras {
    private Cameras() {}

    private static final ExecutorService IO = Executors.newSingleThreadExecutor();
    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static final int MAX_BYTES = 4 * 1024 * 1024;
    /** Latest picture by size and address ("360|http://..."), and those being fetched now. Main thread only. */
    private static final Map<String, Bitmap> shots = new HashMap<>();
    private static final Set<String> busy = new HashSet<>();

    /** The latest picture from this camera at this width, or null while there is none. */
    static Bitmap shot(String url, int width) {
        return shots.get(width + "|" + url);
    }

    /** Asks the camera for a fresh picture (`width` pixels wide at most); `done` runs on the main thread after. */
    static void refresh(final String url, final int width, final Runnable done) {
        final String key = width + "|" + url;
        if (url == null || !busy.add(key)) return;
        IO.execute(() -> {
            Bitmap b = null;
            try {
                b = decode(fetch(url), width);
            } catch (Exception ignored) {
                // A camera that's off or asleep: keep the last picture.
            }
            final Bitmap got = b;
            MAIN.post(() -> {
                busy.remove(key);
                if (got != null) shots.put(key, got);
                if (done != null) done.run();
            });
        });
    }

    /** Forgets the pictures at this width from cameras that aren't pinned any more. */
    static void keep(Set<String> urls, int width) {
        java.util.Iterator<String> it = shots.keySet().iterator();
        while (it.hasNext()) {
            String key = it.next();
            if (key.startsWith(width + "|") && !urls.contains(key.substring(key.indexOf('|') + 1))) it.remove();
        }
    }

    /** Lets go of the pictures at this width (a full screen camera closing). */
    static void drop(int width) {
        keep(java.util.Collections.<String>emptySet(), width);
    }

    private static byte[] fetch(String address) throws Exception {
        URL u = new URL(address);
        InetAddress host = InetAddress.getByName(u.getHost());
        if (!host.isSiteLocalAddress() && !host.isLinkLocalAddress()) throw new SecurityException("not on the home network");
        if (u.getUserInfo() != null) throw new SecurityException("no passwords");
        if ("https".equals(u.getProtocol())) {
            HttpURLConnection c = (HttpURLConnection) u.openConnection();
            c.setConnectTimeout(4000);
            c.setReadTimeout(6000);
            c.setInstanceFollowRedirects(false);
            try (InputStream in = c.getInputStream()) {
                return read(in);
            } finally {
                c.disconnect();
            }
        }
        if (!"http".equals(u.getProtocol())) throw new SecurityException("http or https only");
        int port = u.getPort() < 0 ? 80 : u.getPort();
        String path = u.getFile().isEmpty() ? "/" : u.getFile();
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(host, port), 4000);
            s.setSoTimeout(6000);
            OutputStream out = s.getOutputStream();
            out.write(("GET " + path + " HTTP/1.0\r\nHost: " + u.getHost() + (u.getPort() < 0 ? "" : ":" + port)
                    + "\r\nUser-Agent: BeyondTV\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
            out.flush();
            byte[] all = read(s.getInputStream());
            int head = -1;
            for (int i = 0; i + 3 < all.length; i++) {
                if (all[i] == '\r' && all[i + 1] == '\n' && all[i + 2] == '\r' && all[i + 3] == '\n') { head = i; break; }
            }
            if (head < 0) throw new Exception("no answer");
            String status = new String(all, 0, Math.min(head, 64), StandardCharsets.US_ASCII);
            if (!status.matches("HTTP/1\\.[01] 200[\\s\\S]*")) throw new Exception(status);
            byte[] body = new byte[all.length - head - 4];
            System.arraycopy(all, head + 4, body, 0, body.length);
            return body;
        }
    }

    private static byte[] read(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        for (int n; (n = in.read(buf)) > 0; ) {
            out.write(buf, 0, n);
            if (out.size() > MAX_BYTES) throw new Exception("too big");
        }
        return out.toByteArray();
    }

    /** Decoded small enough for where it's drawn: a camera's full picture on a 1 GB TV would cost too much. */
    private static Bitmap decode(byte[] data, int width) {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(data, 0, data.length, o);
        if (o.outWidth <= 0) return null;
        int sample = 1;
        while (o.outWidth / (sample * 2) >= width) sample *= 2;
        o = new BitmapFactory.Options();
        o.inSampleSize = sample;
        return BitmapFactory.decodeByteArray(data, 0, data.length, o);
    }
}
