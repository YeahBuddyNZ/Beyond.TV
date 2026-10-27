package nz.gobeyond.tv;

import com.sun.net.httpserver.HttpServer;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

/**
 * The music on Google TV (ADR 0027): the multicast DNS question that finds beyond-music.local, and the relay that
 * passes the music screen's requests on to the music server, songs in pieces included. Plain Java, no Android: CI
 * compiles it with javac next to Mdns.java, MusicRelay.java and LocalHttp.java. Run: see .github/workflows/android.yml.
 */
public final class MusicTest {
    private static int failures = 0;

    public static void main(String[] args) throws Exception {
        dns();
        rewrite();
        relay();
        if (failures > 0) {
            System.out.println(failures + " failed");
            System.exit(1);
        }
        System.out.println("Music: all good");
    }

    private static void check(boolean ok, String what) {
        if (!ok) failures++;
        System.out.println((ok ? "ok   " : "FAIL ") + what);
    }

    /** The answer Beyond Music sends (beyond_music/server/mdns.mjs, answer()), with the asker's id. */
    private static byte[] answer(String name, String ip, int id) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(id >> 8);
        out.write(id & 255);
        out.write(new byte[] {(byte) 0x84, 0, 0, 0, 0, 1, 0, 0, 0, 0}, 0, 10);
        for (String l : name.split("\\.")) {
            out.write(l.length());
            out.write(l.getBytes(StandardCharsets.US_ASCII), 0, l.length());
        }
        out.write(new byte[] {0, 0, 1, (byte) 0x80, 1, 0, 0, 0, 120, 0, 4}, 0, 11);
        for (String n : ip.split("\\.")) out.write(Integer.parseInt(n));
        return out.toByteArray();
    }

    private static void dns() {
        byte[] q = Mdns.question("beyond-music.local", 0x1234);
        check(q.length == 12 + 20 + 4 && q[12] == 12 && q[25] == 5 && q[q.length - 3] == 1 && q[q.length - 1] == 1,
                "the question asks for beyond-music.local's address");
        byte[] a = answer("beyond-music.local", "192.168.1.20", 0x1234);
        check("192.168.1.20".equals(Mdns.address(a, a.length, "beyond-music.local")), "the answer gives its address");
        check(Mdns.address(a, a.length, "other.local") == null, "an answer for another name doesn't count");
        check(Mdns.address(q, q.length, "beyond-music.local") == null, "somebody else's question isn't an answer");
        check(Mdns.address(a, 20, "beyond-music.local") == null, "a cut-off answer is nothing");
    }

    private static void rewrite() {
        String r = MusicRelay.rewrite("GET /api/library HTTP/1.1\r\nHost: 127.0.0.1:5000\r\nOrigin: http://127.0.0.1:5000\r\n"
                + "Referer: http://127.0.0.1:5000/\r\nRange: bytes=0-\r\nConnection: keep-alive\r\n\r\n", "192.168.1.20:8097");
        check(r != null && r.startsWith("GET /api/library HTTP/1.1\r\nHost: 192.168.1.20:8097\r\n"), "the music server sees its own Host");
        check(r != null && !r.contains("Origin") && !r.contains("Referer") && !r.contains("keep-alive"), "no Origin or Referer from 127.0.0.1");
        check(r != null && r.contains("Range: bytes=0-\r\n") && r.endsWith("Connection: close\r\n\r\n"), "Range goes on, one request per connection");
        check(MusicRelay.rewrite("GET http://example.com/ HTTP/1.1\r\n\r\n", "x") == null, "never another address");
        check(MusicRelay.rewrite("GET //example.com/ HTTP/1.1\r\n\r\n", "x") == null, "not even one without http:");
        check(MusicRelay.rewrite("CONNECT example.com:443 HTTP/1.1\r\n\r\n", "x") == null, "no tunnels");
    }

    private static void relay() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicReference<String> host = new AtomicReference<>(), origin = new AtomicReference<>(), posted = new AtomicReference<>();
        byte[] song = new byte[200_000];
        for (int i = 0; i < song.length; i++) song[i] = (byte) i;
        server.createContext("/api/play/0123456789ab", x -> {
            host.set(x.getRequestHeaders().getFirst("Host"));
            origin.set(x.getRequestHeaders().getFirst("Origin"));
            x.getResponseHeaders().add("Content-Range", "bytes 100-199/" + song.length);
            x.getResponseHeaders().add("Content-Type", "audio/flac");
            x.sendResponseHeaders(206, 100);
            x.getResponseBody().write(song, 100, 100);
            x.close();
        });
        server.createContext("/api/played", x -> {
            posted.set(new String(read(x.getRequestBody()), StandardCharsets.UTF_8));
            x.sendResponseHeaders(200, 2);
            x.getResponseBody().write("{}".getBytes(StandardCharsets.UTF_8));
            x.close();
        });
        server.start();
        int port = server.getAddress().getPort();
        MusicRelay relay = new MusicRelay(new URL("http://127.0.0.1:" + port));
        relay.start();
        try {
            HttpURLConnection c = (HttpURLConnection) new URL("http://127.0.0.1:" + relay.port() + "/api/play/0123456789ab").openConnection();
            c.setRequestProperty("Range", "bytes=100-199");
            c.setRequestProperty("Origin", "http://127.0.0.1:" + relay.port());
            int status = c.getResponseCode();
            byte[] got = read(c.getInputStream());
            check(status == 206 && got.length == 100 && got[0] == song[100] && got[99] == song[199], "a piece of a song comes back as it is");
            check(("bytes 100-199/" + song.length).equals(c.getHeaderField("Content-Range")), "with its Content-Range");
            check(("127.0.0.1:" + port).equals(host.get()) && origin.get() == null, "the server saw its own Host and no Origin");

            HttpURLConnection p = (HttpURLConnection) new URL("http://127.0.0.1:" + relay.port() + "/api/played").openConnection();
            p.setRequestMethod("POST");
            p.setDoOutput(true);
            p.setRequestProperty("Content-Type", "application/json");
            try (OutputStream o = p.getOutputStream()) { o.write("{\"id\":\"0123456789ab\"}".getBytes(StandardCharsets.UTF_8)); }
            check(p.getResponseCode() == 200 && "{\"id\":\"0123456789ab\"}".equals(posted.get()), "a POST goes on with its body");
        } finally {
            relay.close();
            server.stop(0);
        }
        boolean refused = false;
        try { new MusicRelay(new URL("http://8.8.8.8:8097")); } catch (SecurityException e) { refused = true; }
        check(refused, "the relay only talks to the home network");
    }

    private static byte[] read(InputStream in) throws java.io.IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
        return out.toByteArray();
    }
}
