package nz.gobeyond.tv;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;

/**
 * One multicast DNS question, asked ourselves: "who is beyond-music.local?". Android doesn't always answer .local
 * names, and Beyond Music answers a question like this straight back to whoever asked. Plain Java, no Android, so
 * tests/MusicTest.java runs it.
 */
final class Mdns {
    private Mdns() {}

    /**
     * Asks the network who `name` is (multicast DNS, one question) and waits up to `ms` for the answer sent straight
     * back. The address only counts when it is on the home network. Null when nobody says.
     */
    static String ask(String name, int ms) {
        try (DatagramSocket s = new DatagramSocket()) {
            s.setSoTimeout(ms);
            byte[] q = question(name, 0x4254);
            s.send(new DatagramPacket(q, q.length, InetAddress.getByName("224.0.0.251"), 5353));
            long until = System.currentTimeMillis() + ms;
            byte[] buf = new byte[1500];
            while (System.currentTimeMillis() < until) {
                DatagramPacket p = new DatagramPacket(buf, buf.length);
                s.receive(p);
                String ip = address(buf, p.getLength(), name);
                if (ip != null && LocalHttp.home(InetAddress.getByName(ip))) return ip;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    /** A DNS question for the A record of `name`. Package-private for the tests. */
    static byte[] question(String name, int id) {
        byte[] n = name.getBytes(StandardCharsets.US_ASCII);
        byte[] out = new byte[12 + n.length + 2 + 4];
        out[0] = (byte) (id >> 8);
        out[1] = (byte) id;
        out[5] = 1;   // one question
        int p = 12;
        for (String label : name.split("\\.")) {
            out[p++] = (byte) label.length();
            for (int i = 0; i < label.length(); i++) out[p++] = (byte) label.charAt(i);
        }
        out[p++] = 0;
        out[p + 1] = 1;   // type A
        out[p + 3] = 1;   // class IN
        return out;
    }

    /** The IPv4 address in an answer for `name`, or null. Package-private for the tests. */
    static String address(byte[] b, int len, String name) {
        if (len < 12 || (b[2] & 0x80) == 0) return null;   // a question, not an answer
        int qd = ((b[4] & 255) << 8) | (b[5] & 255), an = ((b[6] & 255) << 8) | (b[7] & 255);
        int p = 12;
        for (int i = 0; i < qd; i++) {
            p = skipName(b, len, p);
            if (p < 0) return null;
            p += 4;
        }
        for (int i = 0; i < an && p < len; i++) {
            StringBuilder got = new StringBuilder();
            int after = readName(b, len, p, got, 0);
            if (after < 0 || after + 10 > len) return null;
            int type = ((b[after] & 255) << 8) | (b[after + 1] & 255);
            int rd = ((b[after + 8] & 255) << 8) | (b[after + 9] & 255);
            int data = after + 10;
            if (data + rd > len) return null;
            if (type == 1 && rd == 4 && got.toString().equalsIgnoreCase(name)) {
                return (b[data] & 255) + "." + (b[data + 1] & 255) + "." + (b[data + 2] & 255) + "." + (b[data + 3] & 255);
            }
            p = data + rd;
        }
        return null;
    }

    private static int skipName(byte[] b, int len, int p) {
        while (p < len) {
            int l = b[p] & 255;
            if (l == 0) return p + 1;
            if ((l & 0xC0) == 0xC0) return p + 2;
            p += 1 + l;
        }
        return -1;
    }

    private static int readName(byte[] b, int len, int p, StringBuilder out, int depth) {
        if (depth > 8) return -1;
        while (p < len) {
            int l = b[p] & 255;
            if (l == 0) return p + 1;
            if ((l & 0xC0) == 0xC0) {
                if (p + 1 >= len) return -1;
                int to = ((l & 0x3F) << 8) | (b[p + 1] & 255);
                if (readName(b, len, to, out, depth + 1) < 0) return -1;
                return p + 2;
            }
            if (p + 1 + l > len) return -1;
            if (out.length() > 0) out.append('.');
            out.append(new String(b, p + 1, l, StandardCharsets.US_ASCII));
            p += 1 + l;
        }
        return -1;
    }
}
