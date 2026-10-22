package nz.gobeyond.tv;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Plain http to things on the home network (a camera, the Beyond Home box), over a socket of our own: the app turns
 * cleartext off for everything else, so nothing on the internet is ever asked over plain http. Every address is
 * checked to be on the home network before anything is sent. Blocking: call it off the main thread.
 */
final class LocalHttp {
    private LocalHttp() {}

    static final int MAX_BYTES = 4 * 1024 * 1024;

    static final class Answer {
        final int status;
        final byte[] body;
        Answer(int status, byte[] body) { this.status = status; this.body = body; }
        String text() { return new String(body, StandardCharsets.UTF_8); }
    }

    /** True for an address on the home network: 10.x, 172.16-31.x, 192.168.x and link-local. */
    static boolean home(InetAddress a) {
        return a.isSiteLocalAddress() || a.isLinkLocalAddress();
    }

    /** One request: method, an http address on the home network, an Authorization header (or null) and a body (or null). */
    static Answer request(String method, String address, String auth, String body, int readMs) throws Exception {
        URL u = new URL(address);
        if (!"http".equals(u.getProtocol())) throw new SecurityException("http only");
        if (u.getUserInfo() != null) throw new SecurityException("no passwords");
        InetAddress host = InetAddress.getByName(u.getHost());
        if (!home(host)) throw new SecurityException("not on the home network");
        int port = u.getPort() < 0 ? 80 : u.getPort();
        String path = u.getFile().isEmpty() ? "/" : u.getFile();
        byte[] data = body == null ? new byte[0] : body.getBytes(StandardCharsets.UTF_8);
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(host, port), 4000);
            s.setSoTimeout(readMs);
            OutputStream out = s.getOutputStream();
            StringBuilder head = new StringBuilder();
            head.append(method).append(' ').append(path).append(" HTTP/1.0\r\nHost: ").append(u.getHost())
                    .append(u.getPort() < 0 ? "" : ":" + port).append("\r\nUser-Agent: BeyondTV\r\nConnection: close\r\n");
            if (auth != null) head.append("Authorization: ").append(auth).append("\r\n");
            if (body != null) head.append("Content-Length: ").append(data.length).append("\r\n");
            head.append("\r\n");
            out.write(head.toString().getBytes(StandardCharsets.US_ASCII));
            if (data.length > 0) out.write(data);
            out.flush();
            byte[] all = read(s.getInputStream());
            int end = -1;
            for (int i = 0; i + 3 < all.length; i++) {
                if (all[i] == '\r' && all[i + 1] == '\n' && all[i + 2] == '\r' && all[i + 3] == '\n') { end = i; break; }
            }
            if (end < 0) throw new Exception("no answer");
            String status = new String(all, 0, Math.min(end, 64), StandardCharsets.US_ASCII);
            if (!status.matches("HTTP/1\\.[01] \\d{3}[\\s\\S]*")) throw new Exception("not http");
            int code = Integer.parseInt(status.substring(9, 12));
            byte[] rest = new byte[all.length - end - 4];
            System.arraycopy(all, end + 4, rest, 0, rest.length);
            return new Answer(code, rest);
        }
    }

    static byte[] read(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        for (int n; (n = in.read(buf)) > 0; ) {
            out.write(buf, 0, n);
            if (out.size() > MAX_BYTES) throw new Exception("too big");
        }
        return out.toByteArray();
    }
}
