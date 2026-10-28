#!/usr/bin/env python3
"""Hands BeyondTV-orsay.zip to an older Samsung TV (Orsay, 2011 to 2015) over your Wi-Fi, with User App Sync.

    python3 orsay/serve.py                 # serves on port 80, the only one the TV asks
    python3 orsay/serve.py --ip 192.168.1.20   # when this computer has more than one address

Build first (python3 orsay/build.py). Then, on the TV, once:
  1. Menu > Smart Features > Samsung Account > Log In. Email: develop (some firmware also wants the password
     sso1029dev!). Log in.
  2. Open Smart Hub, go to Apps, pick any app and hold OK on the remote until a menu opens.
  3. IP Setting: type this computer's address (printed below).
  4. Same menu again: Start User App Sync. Beyond TV appears among the apps (a restart of the TV may be needed).
Run it again with the new zip to update. On Linux, port 80 needs sudo; macOS and Windows allow it.
"""
import http.server
import os
import socket
import sys
from xml.sax.saxutils import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP = os.path.join(ROOT, 'BeyondTV-orsay.zip')
NAME = 'BeyondTV'


def my_ip():
    """This computer's address on the home network (the one it would use to reach the internet)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('192.0.2.1', 9))   # nothing is sent: it only picks the way out
        return s.getsockname()[0]
    finally:
        s.close()


def widget_list(ip, size):
    """The list User App Sync asks for: one widget, and where to fetch its zip."""
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<rsp stat="ok">\n<list>\n'
            '<widget id="%s">\n<title>Beyond TV</title>\n<compression size="%d" type="zip"/>\n'
            '<description>A fast, ad-free home screen.</description>\n'
            '<download>http://%s/Widget/%s.zip</download>\n</widget>\n</list>\n</rsp>\n'
            % (NAME, size, escape(ip), NAME)).encode('utf-8')


def main(args):
    if not os.path.exists(ZIP):
        sys.exit('No BeyondTV-orsay.zip yet: run python3 orsay/build.py first.')
    ip = args[args.index('--ip') + 1] if '--ip' in args else my_ip()
    with open(ZIP, 'rb') as f:
        package = f.read()
    listing = widget_list(ip, len(package))

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            path = self.path.split('?')[0]
            if path == '/widgetlist.xml':
                body, kind = listing, 'text/xml'
            elif path == '/Widget/%s.zip' % NAME:
                body, kind = package, 'application/zip'
            else:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header('Content-Type', kind)
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            print('The TV fetched %s' % path)

        def log_message(self, *a):
            pass

    try:
        server = http.server.HTTPServer(('', 80), Handler)
    except PermissionError:
        sys.exit('Port 80 needs admin here: run it with sudo.')
    except OSError as e:
        sys.exit('Port 80 is busy (%s). Stop whatever is using it, then try again.' % e)
    print('Serving Beyond TV for User App Sync. On the TV, IP Setting: %s' % ip)
    print('Then Start User App Sync. Ctrl+C here when it has installed.')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main(sys.argv[1:])
