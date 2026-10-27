package nz.gobeyond.tv;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * MusicActivity's relay on 127.0.0.1 (ADR 0027): passes the WebView's requests on to the one music server, one
 * connection each, both ways as they come (songs in pieces too). Only a plain path goes through, with the server's
 * own Host and no Origin or Referer. Plain Java, no Android, so tests/MusicTest.java runs it.
 */
final class MusicRelay implements Runnable {
    private final InetAddress host;
    private final int port;
    private final String hostHeader;
    private final ServerSocket server;
    private volatile boolean open = true;

    MusicRelay(URL base) throws Exception {
        host = InetAddress.getByName(base.getHost());
        if (!LocalHttp.home(host) && !host.isLoopbackAddress()) throw new SecurityException("not on the home network");
        port = base.getPort() < 0 ? 80 : base.getPort();
        hostHeader = base.getHost() + ":" + port;
        server = new ServerSocket();
        server.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), 0));
    }

    int port() { return server.getLocalPort(); }

    void start() {
        Thread t = new Thread(this, "music-relay");
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
                Thread t = new Thread(() -> serve(in), "music-relay-one");
                t.setDaemon(true);
                t.start();
            } catch (Exception e) {
                if (!open) return;
            }
        }
    }

    private void serve(Socket in) {
        try (Socket client = in; Socket out = new Socket()) {
            InputStream cin = client.getInputStream();
            byte[] head = readHead(cin);
            if (head == null) return;
            String text = new String(head, StandardCharsets.ISO_8859_1);
            String rewritten = rewrite(text, hostHeader);
            if (rewritten == null) return;
            out.connect(new InetSocketAddress(host, port), 4000);
            OutputStream sout = out.getOutputStream();
            sout.write(rewritten.getBytes(StandardCharsets.ISO_8859_1));
            sout.flush();
            // A body (a POST) goes on as it comes; the answer comes back as it comes, songs in pieces too.
            Thread up = new Thread(() -> pipe(cin, sout), "music-relay-up");
            up.setDaemon(true);
            up.start();
            pipe(out.getInputStream(), client.getOutputStream());
        } catch (Exception ignored) {
        }
    }

    private static void pipe(InputStream from, OutputStream to) {
        byte[] buf = new byte[32768];
        try {
            for (int n; (n = from.read(buf)) > 0; ) {
                to.write(buf, 0, n);
                to.flush();
            }
        } catch (Exception ignored) {
        }
    }

    /** The request line and headers, up to the blank line (16 KB at most), or null. */
    private static byte[] readHead(InputStream in) throws Exception {
        byte[] buf = new byte[16384];
        int n = 0;
        while (n < buf.length) {
            int b = in.read();
            if (b < 0) return null;
            buf[n++] = (byte) b;
            if (n >= 4 && buf[n - 4] == '\r' && buf[n - 3] == '\n' && buf[n - 2] == '\r' && buf[n - 1] == '\n') {
                byte[] out = new byte[n];
                System.arraycopy(buf, 0, out, 0, n);
                return out;
            }
        }
        return null;
    }

    /**
     * The request as the music server should see it: a path only (never another address), its own Host, no Origin
     * or Referer from 127.0.0.1, one request per connection. Null for anything that isn't a plain request.
     * Package-private for the tests.
     */
    static String rewrite(String head, String hostHeader) {
        String[] lines = head.split("\r\n");
        if (lines.length == 0) return null;
        String[] first = lines[0].split(" ");
        if (first.length != 3 || !first[1].startsWith("/") || first[1].startsWith("//")) return null;
        if (!first[0].matches("GET|HEAD|POST|PUT|DELETE|OPTIONS") || !first[2].matches("HTTP/1\\.[01]")) return null;
        StringBuilder out = new StringBuilder(lines[0]).append("\r\nHost: ").append(hostHeader).append("\r\n");
        for (int i = 1; i < lines.length; i++) {
            String l = lines[i];
            if (l.isEmpty()) continue;
            String name = l.contains(":") ? l.substring(0, l.indexOf(':')).trim().toLowerCase(java.util.Locale.ROOT) : "";
            if (name.equals("host") || name.equals("origin") || name.equals("referer") || name.equals("connection")
                    || name.equals("keep-alive") || name.equals("proxy-connection")) continue;
            out.append(l).append("\r\n");
        }
        return out.append("Connection: close\r\n\r\n").toString();
    }
}
