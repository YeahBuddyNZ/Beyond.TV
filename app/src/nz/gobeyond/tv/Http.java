package nz.gobeyond.tv;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * The updater's downloads, in plain Java with nothing from Android, so CI runs this exact code against a local server
 * and against GitHub itself (tests/UpdaterHttpTest.java). A bug here strands every TV on the version it has: on
 * 22/10/2026 one header set after connecting did, and the TV can't be told about the fix.
 */
final class Http {
    private Http() {}

    /** Every header goes on before getResponseCode: after it the connection is made, and Android throws. */
    static HttpURLConnection open(String url, String accept) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(10_000);
        c.setReadTimeout(20_000);
        c.setRequestProperty("User-Agent", "BeyondTV");
        if (accept != null) c.setRequestProperty("Accept", accept);
        c.setInstanceFollowRedirects(true);   // release files live on GitHub's download host
        int code = c.getResponseCode();
        if (code != 200) {
            c.disconnect();
            throw new IOException("HTTP " + code + " from " + new URL(url).getHost());
        }
        return c;
    }

    static String get(String url, String accept, long max) throws IOException {
        HttpURLConnection c = open(url, accept);
        try (InputStream in = c.getInputStream()) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            copy(in, out, max);
            return out.toString(StandardCharsets.UTF_8.name());
        } finally {
            c.disconnect();
        }
    }

    static void download(String url, File to, long max) throws IOException {
        HttpURLConnection c = open(url, null);
        try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(to)) {
            copy(in, out, max);
        } finally {
            c.disconnect();
        }
    }

    static void copy(InputStream in, OutputStream out, long max) throws IOException {
        byte[] buffer = new byte[64 * 1024];
        long total = 0;
        int n;
        while ((n = in.read(buffer)) > 0) {
            total += n;
            if (total > max) throw new IOException("too big");
            out.write(buffer, 0, n);
        }
    }
}
