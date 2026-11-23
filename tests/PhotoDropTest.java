package nz.gobeyond.tv;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Family photos (ADR 0059) without a TV: the phone's page, the code, a photo arriving, the size limit, the door
 * closing after too many wrong codes, the screensaver's mix of photos and art, and the QR code for the address.
 */
public class PhotoDropTest {
    private static int failed, passed;

    private static void check(String name, boolean ok) {
        if (ok) passed++;
        else {
            failed++;
            System.out.println("FAIL " + name);
        }
    }

    private static final List<String> saved = new ArrayList<>();

    private static int call(String method, String address, byte[] body, StringBuilder text) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(address).openConnection();
        c.setRequestMethod(method);
        c.setConnectTimeout(3000);
        c.setReadTimeout(5000);
        if (body != null) {
            c.setDoOutput(true);
            c.setFixedLengthStreamingMode(body.length);
            try (OutputStream o = c.getOutputStream()) { o.write(body); }
        }
        int code = c.getResponseCode();
        InputStream in = code < 400 ? c.getInputStream() : c.getErrorStream();
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        if (in != null) {
            byte[] buf = new byte[4096];
            for (int n; (n = in.read(buf)) > 0; ) b.write(buf, 0, n);
        }
        if (text != null) text.append(b.toString("UTF-8"));
        return code;
    }

    public static void main(String[] args) throws Exception {
        PhotoDrop drop = new PhotoDrop("<html>phone page</html>".getBytes(StandardCharsets.UTF_8), "4821", new PhotoDrop.Sink() {
            @Override public boolean save(byte[] picture, boolean art, String by) {
                if (picture.length < 3) return false;
                saved.add((art ? "art:" : "photo:") + by + ":" + picture.length);
                return true;
            }
            @Override public String names() { return "[\"Aroha\",\"Nikau\"]"; }
        });
        drop.start();
        String base = "http://127.0.0.1:" + drop.port();
        StringBuilder t = new StringBuilder();
        check("serves the phone's page", call("GET", base + "/", null, t) == 200 && t.toString().contains("phone page"));
        t.setLength(0);
        check("hello needs the code", call("GET", base + "/hello?c=1111", null, t) == 403);
        t.setLength(0);
        check("hello with the code names the kids", call("GET", base + "/hello?c=4821", null, t) == 200 && t.toString().contains("Aroha"));
        check("a photo arrives", call("POST", base + "/photo?c=4821&kind=photo", new byte[5000], null) == 200 && saved.contains("photo::5000"));
        check("art says who drew it", call("POST", base + "/photo?c=4821&kind=art&by=Aroha%20M", new byte[10], null) == 200
                && saved.contains("art:Aroha M:10"));
        check("something that isn't a picture is turned away", call("POST", base + "/photo?c=4821", new byte[2], null) == 400);
        check("a photo needs the code", call("POST", base + "/photo?c=0000", new byte[10], null) == 403);
        check("too big is turned away", call("POST", base + "/photo?c=4821", new byte[PhotoDrop.MOST_BYTES + 1], null) == 413);
        for (int i = 0; i < 25 && drop.open(); i++) call("GET", base + "/hello?c=9999", null, null);
        check("too many wrong codes closes the door", !drop.open());
        drop.close();

        check("param decodes", PhotoDrop.param("a=1&by=Nikau%20%26%20Aroha", "by").equals("Nikau & Aroha") && PhotoDrop.param("a=1", "by").isEmpty());

        List<String> photos = Arrays.asList("p1", "p2", "p3", "p4", "p5"), art = Arrays.asList("a1", "a2");
        check("art after every two photos", PhotoDrop.mix(photos, art, 2).equals(Arrays.asList("p1", "p2", "a1", "p3", "p4", "a2", "p5")));
        check("art goes round again", PhotoDrop.mix(photos, Arrays.asList("a1"), 2).equals(Arrays.asList("p1", "p2", "a1", "p3", "p4", "a1", "p5")));
        check("leftover art at the end", PhotoDrop.mix(Arrays.asList("p1"), art, 2).equals(Arrays.asList("p1", "a1", "a2")));
        check("only art", PhotoDrop.mix(new ArrayList<String>(), art, 2).equals(art));
        check("only photos", PhotoDrop.mix(photos, new ArrayList<String>(), 2).equals(photos));

        // The QR code for the address on the screen (decoded with a phone's reader when this was written).
        boolean[][] qr = Qr.encode("http://192.168.1.130:8096/?c=4821");
        long h = 1125899906842597L;
        for (boolean[] row : qr) for (boolean b : row) h = 31 * h + (b ? 1 : 0);
        check("QR code is version 3", qr.length == 29);
        check("QR code is the one a phone read", h == 4526195348204232170L);
        check("finder patterns in three corners", qr[0][0] && qr[0][6] && qr[6][0] && !qr[1][1] && qr[2][2] && qr[0][28] && qr[28][0] && !qr[7][7]);
        check("too long for a QR code here", Qr.encode(new String(new char[300]).replace('\0', 'x')) == null);

        System.out.println(passed + " passed, " + failed + " failed");
        if (failed > 0) System.exit(1);
    }
}
