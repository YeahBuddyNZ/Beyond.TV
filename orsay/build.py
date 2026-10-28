#!/usr/bin/env python3
"""Builds Beyond TV for Samsung's older smart TVs (Orsay, 2011 to 2015, like a 2014 H6300): BeyondTV-orsay.zip.

    python3 orsay/build.py            # → BeyondTV-orsay.zip
    python3 orsay/build.py --preview  # also leaves the files in out/orsay/ to open index.html in a browser
    python3 orsay/build.py --config other.properties
    python3 orsay/build.py --generic  # without config.properties

The same home screen as on LG and newer Samsungs (web/), with orsay/config.xml and Smart Hub's four icon sizes, in a
plain zip. index.html also loads Samsung's Common API from the TV ($MANAGER_WIDGET), which tells Smart Hub the app
has loaded and gives Return back to Smart Hub. Orsay TVs install it with User App Sync: see orsay/serve.py.
"""
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import webapp  # noqa: E402

OUT = os.path.join(ROOT, 'out', 'orsay')
ZIP = os.path.join(ROOT, 'BeyondTV-orsay.zip')
ICONS = ('icon_thumb.png', 'icon_bigthumb.png', 'icon_list.png', 'icon_biglist.png')

# Samsung's own scripts, on the TV. They load before ours; in a browser they are missing and nothing minds.
COMMON = ('<script src="$MANAGER_WIDGET/Common/API/Widget.js"></script>\n'
          '<script src="$MANAGER_WIDGET/Common/API/TVKeyValue.js"></script>\n'
          '<script src="$MANAGER_WIDGET/Common/API/Plugin.js"></script>\n')


def build(preview, config):
    with open(os.path.join(ROOT, 'orsay', 'config.xml'), encoding='utf-8') as f:
        manifest = f.read()
    version = re.search(r'<ver>([^<]+)</ver>', manifest).group(1)
    config = dict(config, version=version)
    app = webapp.files(config, 'orsay/build.py')
    page = app['index.html'].decode('utf-8')
    if '<script src="config.js"></script>' not in page:
        sys.exit('index.html no longer loads config.js where orsay/build.py expects it.')
    app['index.html'] = page.replace('<script src="config.js"></script>',
                                     COMMON + '<script src="config.js"></script>', 1).encode('utf-8')
    for name in ('config.xml',) + ICONS:
        with open(os.path.join(ROOT, 'orsay', name), 'rb') as f:
            app[name] = f.read()

    with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in sorted(app):
            z.writestr(path, app[path])
    if preview:
        webapp.preview(app, OUT)
        print('Preview: open out/orsay/index.html in a browser.')
    print('Built %s (%s, %d KB)' % (os.path.basename(ZIP), version, os.path.getsize(ZIP) // 1024))
    if not config['tmdbKey']:
        print('No TMDB key: the picks stay off (everything else works).')


if __name__ == '__main__':
    build('--preview' in sys.argv[1:], webapp.config_from_args(sys.argv[1:]))
