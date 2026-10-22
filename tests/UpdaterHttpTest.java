package nz.gobeyond.tv;

import com.sun.net.httpserver.HttpServer;

import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Runs the updater's own download code (Http.java) the way a TV does, so a bug in it fails CI instead of quietly
 * stranding every TV on the version it has. First against a local server (a redirect, the Accept header, a 404,
 * the size cap), then against GitHub itself: the releases list and latest.json, the two ways a TV hears of updates.
 * Plain Java, no Android: CI compiles it with javac next to Http.java. Run: see .github/workflows/android.yml.
 */
public final class UpdaterHttpTest {
    private static int failures = 0;

    public static void main(String[] args) throws Exception {
        local();
        live();
        if (failures > 0) {
            System.out.println(failures + " failed");
            System.exit(1);
        }
        System.out.println("Updater downloads: all good");
    }

    private static void local() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicReference<String> accept = new AtomicReference<>();
        server.createContext("/moved", x -> {
            x.getResponseHeaders().add("Location", "/releases");
            x.sendResponseHeaders(302, -1);
            x.close();
        });
        server.createContext("/releases", x -> {
            accept.set(x.getRequestHeaders().getFirst("Accept"));
            byte[] b = "[{\"tag_name\":\"android-163\"}]".getBytes(StandardCharsets.UTF_8);
            x.sendResponseHeaders(200, b.length);
            try (OutputStream o = x.getResponseBody()) { o.write(b); }
        });
        server.createContext("/big", x -> {
            byte[] b = new byte[200_000];
            x.sendResponseHeaders(200, b.length);
            try (OutputStream o = x.getResponseBody()) { o.write(b); }
        });
        server.createContext("/gone", x -> {
            x.sendResponseHeaders(404, -1);
            x.close();
        });
        server.start();
        String base = "http://127.0.0.1:" + server.getAddress().getPort();
        try {
            String body = Http.get(base + "/moved", "application/vnd.github+json", 64 * 1024);
            check(body.contains("android-163"), "get follows a redirect and reads the body");
            check("application/vnd.github+json".equals(accept.get()), "the Accept header reaches the server");

            File f = File.createTempFile("btv", ".apk");
            Http.download(base + "/releases", f, 64 * 1024);
            check(new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8).contains("android-163"), "download writes the file");
            try {
                Http.download(base + "/big", f, 100_000);
                check(false, "download stops past its size cap");
            } catch (IOException e) {
                check(true, "download stops past its size cap");
            }
            f.delete();

            try {
                Http.get(base + "/gone", null, 1024);
                check(false, "a 404 is an IOException");
            } catch (IOException e) {
                check(e.getMessage().contains("404"), "a 404 is an IOException");
            }
        } finally {
            server.stop(0);
        }
    }

    /**
     * The real addresses. GitHub saying no (a rate limit, an outage) only warns, because that isn't our bug; anything
     * else thrown, like the IllegalStateException that stranded the TVs, fails.
     */
    private static void live() {
        try {
            String r = Http.get("https://api.github.com/repos/YeahBuddyNZ/Beyond.TV/releases?per_page=20", "application/vnd.github+json", 2L * 1024 * 1024);
            check(r.contains("\"tag_name\": \"android-") || r.contains("\"tag_name\":\"android-"), "the releases list has android releases");
        } catch (IOException e) {
            System.out.println("warning: releases list: " + e.getMessage());
        } catch (RuntimeException e) {
            check(false, "the releases list: " + e);
        }
        try {
            String l = Http.get("https://github.com/YeahBuddyNZ/Beyond.TV/releases/download/tv/latest.json", null, 64 * 1024);
            check(l.contains("\"code\"") && l.contains("/releases/download/android-"), "latest.json names the newest APK");
        } catch (IOException e) {
            System.out.println("warning: latest.json: " + e.getMessage() + " (CI uploads it with each release on main)");
        } catch (RuntimeException e) {
            check(false, "latest.json: " + e);
        }
    }

    private static void check(boolean ok, String what) {
        System.out.println((ok ? "ok    " : "FAIL  ") + what);
        if (!ok) failures++;
    }
}
