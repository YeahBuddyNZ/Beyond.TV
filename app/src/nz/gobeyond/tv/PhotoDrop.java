package nz.gobeyond.tv;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Family photos from a phone, straight to the TV over the house network (ADR 0061). Listens only while the Family
 * photos screen is open (PhotosActivity), only answers phones on the home network, and only with the screen's
 * four-number code; twenty wrong codes and it stops listening. Three things: the phone's page (GET /), who can be
 * named as an artist (GET /hello), and one photo at a time (POST /photo, the picture itself as the body, already made
 * smaller on the phone). Nothing leaves the house. Plain Java, no Android: tests/PhotoDropTest.java runs it.
 */
final class PhotoDrop implements Runnable {
    /** Where a photo goes: false if it isn't a picture the TV can read. names: the kids, as a JSON array of strings. */
    interface Sink {
        boolean save(byte[] picture, boolean art, String by);
        String names();
    }

    static final int PORT = 8096;
    static final int MOST_BYTES = 8 * 1024 * 1024;
    private static final int MOST_WRONG = 20;

    private final ServerSocket server;
    private final byte[] page;
    private final String code;
    private final Sink sink;
    private volatile boolean open = true;
    private int wrong;

    PhotoDrop(byte[] page, String code, Sink sink) throws Exception {
        this.page = page;
        this.code = code;
        this.sink = sink;
        ServerSocket s = new ServerSocket();
        s.setReuseAddress(true);
        try {
            s.bind(new InetSocketAddress(PORT));
        } catch (Exception busy) {
            s.close();
            s = new ServerSocket();
            s.bind(new InetSocketAddress(0));
        }
        server = s;
    }

    int port() { return server.getLocalPort(); }

    boolean open() { return open; }

    void start() {
        Thread t = new Thread(this, "photo-drop");
        t.setDaemon(true);
        t.start();
    }

    void close() {
        open = false;
        try { server.close(); } catch (Exception ignored) {}
    }

    @Override public void run() {
        while (open) {
            try {
                final Socket in = server.accept();
                Thread t = new Thread(() -> serve(in), "photo-drop-one");
                t.setDaemon(true);
                t.start();
            } catch (Exception e) {
                if (!open) return;
            }
        }
    }

    /** The TV's address on the home network (Wi-Fi or cable), for the phone to open; null when it has none. */
    static String address() {
        try {
            List<String> found = new ArrayList<>();
            for (java.net.NetworkInterface ni : java.util.Collections.list(java.net.NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback() || ni.isVirtual()) continue;
                for (InetAddress a : java.util.Collections.list(ni.getInetAddresses())) {
                    if (a instanceof java.net.Inet4Address && a.isSiteLocalAddress()) found.add(a.getHostAddress());
                }
            }
            return found.isEmpty() ? null : found.get(0);
        } catch (Exception e) {
            return null;
        }
    }

    private void serve(Socket s) {
        try (Socket client = s) {
            client.setSoTimeout(20_000);
            InetAddress from = client.getInetAddress();
            if (!LocalHttp.home(from) && !from.isLoopbackAddress()) return;
            InputStream in = client.getInputStream();
            OutputStream out = client.getOutputStream();
            String head = readHead(in);
            if (head == null) return;
            String[] lines = head.split("\r\n");
            String[] first = lines[0].split(" ");
            if (first.length < 2) return;
            String method = first[0], target = first[1];
            long length = 0;
            for (int i = 1; i < lines.length; i++) {
                String l = lines[i].toLowerCase(java.util.Locale.ROOT);
                if (l.startsWith("content-length:")) length = Long.parseLong(l.substring(15).trim());
            }
            String path = target.contains("?") ? target.substring(0, target.indexOf('?')) : target;
            String query = target.contains("?") ? target.substring(target.indexOf('?') + 1) : "";

            if ("GET".equals(method) && ("/".equals(path) || "/index.html".equals(path))) {
                answer(out, 200, "text/html; charset=utf-8", page);
                return;
            }
            if (!checked(param(query, "c"))) {
                answer(out, 403, "application/json", "{\"ok\":false,\"why\":\"code\"}".getBytes(StandardCharsets.UTF_8));
                return;
            }
            if ("GET".equals(method) && "/hello".equals(path)) {
                answer(out, 200, "application/json", ("{\"ok\":true,\"names\":" + sink.names() + "}").getBytes(StandardCharsets.UTF_8));
                return;
            }
            if ("POST".equals(method) && "/photo".equals(path)) {
                if (length <= 0 || length > MOST_BYTES) {
                    answer(out, 413, "application/json", "{\"ok\":false,\"why\":\"size\"}".getBytes(StandardCharsets.UTF_8));
                    return;
                }
                byte[] body = readBody(in, (int) length);
                String by = param(query, "by");
                boolean ok = body != null && sink.save(body, "art".equals(param(query, "kind")), by.length() > 24 ? by.substring(0, 24) : by);
                answer(out, ok ? 200 : 400, "application/json", ("{\"ok\":" + ok + "}").getBytes(StandardCharsets.UTF_8));
                return;
            }
            answer(out, 404, "application/json", "{\"ok\":false}".getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) {
        }
    }

    /** The code on the screen; too many wrong ones and the door closes. */
    private synchronized boolean checked(String typed) {
        if (code.equals(typed)) return true;
        if (++wrong >= MOST_WRONG) close();
        return false;
    }

    static String param(String query, String name) {
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0 && pair.substring(0, eq).equals(name)) {
                try {
                    return URLDecoder.decode(pair.substring(eq + 1), "UTF-8").trim();
                } catch (Exception e) {
                    return "";
                }
            }
        }
        return "";
    }

    private static String readHead(InputStream in) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        int c, last = 0;
        while ((c = in.read()) >= 0) {
            b.write(c);
            if (b.size() > 8192) return null;
            last = (last << 8) | c;
            if (last == 0x0D0A0D0A) return b.toString("ISO-8859-1");
        }
        return null;
    }

    private static byte[] readBody(InputStream in, int length) throws Exception {
        byte[] body = new byte[length];
        int n = 0;
        while (n < length) {
            int r = in.read(body, n, length - n);
            if (r < 0) return null;
            n += r;
        }
        return body;
    }

    private static void answer(OutputStream out, int status, String type, byte[] body) throws Exception {
        String reason = status == 200 ? "OK" : status == 403 ? "Forbidden" : status == 404 ? "Not Found" : status == 413 ? "Too Large" : "Bad Request";
        String head = "HTTP/1.1 " + status + " " + reason + "\r\nContent-Type: " + type + "\r\nContent-Length: " + body.length
                + "\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n";
        out.write(head.getBytes(StandardCharsets.ISO_8859_1));
        out.write(body);
        out.flush();
    }

    // MARK: - The screensaver's order

    /**
     * Photos with the kids' art mixed in: a drawing after every `every` photos (going round the art again when there's
     * less of it), then any drawings not shown yet. Every photo and every drawing is in it.
     */
    static <T> List<T> mix(List<T> photos, List<T> art, int every) {
        List<T> out = new ArrayList<>();
        if (photos.isEmpty()) {
            out.addAll(art);
            return out;
        }
        int a = 0;
        for (int i = 0; i < photos.size(); i++) {
            out.add(photos.get(i));
            if (!art.isEmpty() && (i + 1) % every == 0) {
                out.add(art.get(a % art.size()));
                a++;
            }
        }
        for (; a < art.size(); a++) out.add(art.get(a));
        return out;
    }
}
