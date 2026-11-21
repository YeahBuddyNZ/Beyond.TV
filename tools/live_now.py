#!/usr/bin/env python3
"""Finds what each Live TV channel is streaming right now, for docs/live/now.json.

YouTube's "embed/live_stream?channel=" link shows "Video not found" when a channel runs more
than one live stream, or none. So the website build (pages.yml, hourly) asks each channel's
own /streams page which video is live and writes its id (and the channel's picture) here.
The TVs play that video; a channel missing from now.json falls back to live_stream.

It also keeps each channel's own picture in docs/live/logos/<id>.jpg for the Live TV tiles.

Usage: python3 tools/live_now.py docs/live
"""
import json, os, re, sys, time, urllib.request

UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en', 'Cookie': 'CONSENT=YES+1'})
    return urllib.request.urlopen(req, timeout=25).read().decode('utf8', 'ignore')


def initial_data(html):
    i = html.find('var ytInitialData = ')
    if i < 0:
        return None
    try:
        return json.JSONDecoder().raw_decode(html, i + len('var ytInitialData = '))[0]
    except ValueError:
        return None


def walk(o, found):
    if isinstance(o, dict):
        vid = o.get('contentId') if 'lockupViewModel' not in o else None
        if 'lockupViewModel' in o:
            walk(o['lockupViewModel'], found)
            return
        if 'videoRenderer' in o:
            v = o['videoRenderer']
            s = json.dumps(v)
            found.append((v.get('videoId'), 'LIVE' in s and ('BADGE_STYLE_TYPE_LIVE_NOW' in s or '"style": "LIVE"' in s), viewers(s)))
            return
        if vid and o.get('contentType') in ('LOCKUP_CONTENT_TYPE_VIDEO', None):
            s = json.dumps(o)
            found.append((vid, 'THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE' in s, viewers(s)))
            return
        for x in o.values():
            walk(x, found)
    elif isinstance(o, list):
        for x in o:
            walk(x, found)


def viewers(s):
    m = re.search(r'"([\d,.]+K?) (?:watching|viewers)', s)
    if not m:
        return 0
    t = m.group(1).replace(',', '')
    return int(float(t[:-1]) * 1000) if t.endswith('K') else int(float(t))


def channel(cid):
    html = get('https://www.youtube.com/channel/%s/streams' % cid)
    data = initial_data(html)
    if data is None:   # a consent or "are you a robot" page: not an answer about this channel
        raise ValueError('no channel data on the page')
    found = []
    walk(data, found)
    live = [f for f in found if f[0] and f[1]]
    # The busiest live stream is the channel's main one (the others are often events or replays).
    live.sort(key=lambda f: -f[2])
    logo = None
    m = re.search(r'<meta property="og:image" content="([^"]+)"', html)
    if m:
        logo = re.sub(r'=s\d+-', '=s176-', m.group(1))
    return (live[0][0] if live else None), logo


def save_logo(url, path):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    data = urllib.request.urlopen(req, timeout=25).read(300 * 1024)
    if data[:3] != b'\xff\xd8\xff':   # only a JPEG, as YouTube serves them
        raise ValueError('not a JPEG')
    with open(path, 'wb') as f:
        f.write(data)


def main(folder):
    channels = json.load(open(os.path.join(folder, 'channels.json')))['channels']
    os.makedirs(os.path.join(folder, 'logos'), exist_ok=True)
    try:
        before = json.load(open(os.path.join(folder, 'now.json'))).get('channels', {})
    except (OSError, ValueError):
        before = {}
    now, read = {}, 0
    for c in channels:
        try:
            video, logo = channel(c['youtube'])
        except Exception as e:  # one channel failing never stops the rest; it keeps what it had
            print('%s: %s' % (c['id'], e), file=sys.stderr)
            if c['youtube'] in before:
                now[c['youtube']] = before[c['youtube']]
            continue
        read += 1
        entry = {}
        if video:
            entry['video'] = video
        if logo and logo.startswith('https://yt3.'):
            try:
                save_logo(logo, os.path.join(folder, 'logos', c['id'] + '.jpg'))
            except Exception as e:
                print('%s logo: %s' % (c['id'], e), file=sys.stderr)
        if entry:
            now[c['youtube']] = entry
        print('%-14s %-12s %s' % (c['id'], video or 'not live', 'logo' if logo else ''))
        time.sleep(0.5)
    # TVs leave out a channel now.json doesn't list, so a file from a run YouTube turned away would empty Live TV.
    if read < len(channels) / 2 or not now:
        print('Only %d of %d channels read: keeping the old now.json' % (read, len(channels)), file=sys.stderr)
        return
    out = {'about': 'Written by tools/live_now.py when the website builds: the live video each channel is streaming now.',
           'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'channels': now}
    with open(os.path.join(folder, 'now.json'), 'w') as f:
        json.dump(out, f, indent=1)
        f.write('\n')


if __name__ == '__main__':
    main(sys.argv[1])
