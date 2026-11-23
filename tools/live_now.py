#!/usr/bin/env python3
"""Finds what each Live TV channel is streaming right now, for docs/live/now.json.

YouTube's "embed/live_stream?channel=" link shows "Video not found" when a channel runs more
than one live stream, or none. So the website build (pages.yml, hourly) asks each channel's
own /streams page which video is live and writes its id (and the channel's picture) here.
The TVs play that video; a channel missing from now.json falls back to live_stream.

It also keeps each channel's own picture in docs/live/logos/<id>.jpg for the Live TV tiles.

Now and next (ADR 0057): it also keeps the live video's title (what is on now) and, when the channel has
scheduled one, the next stream's title and start time, read from that video's own page.

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


def lockup_title(o):
    try:
        return o['metadata']['lockupMetadataViewModel']['title']['content']
    except (KeyError, TypeError):
        return ''


def walk(o, found):
    """Each video on the page: (id, live now, viewers, title, upcoming)."""
    if isinstance(o, dict):
        vid = o.get('contentId') if 'lockupViewModel' not in o else None
        if 'lockupViewModel' in o:
            walk(o['lockupViewModel'], found)
            return
        if 'videoRenderer' in o:
            v = o['videoRenderer']
            s = json.dumps(v)
            runs = (v.get('title') or {}).get('runs') or [{}]
            found.append((v.get('videoId'), 'LIVE' in s and ('BADGE_STYLE_TYPE_LIVE_NOW' in s or '"style": "LIVE"' in s), viewers(s),
                          runs[0].get('text', ''), 'upcomingEventData' in v))
            return
        if vid and o.get('contentType') in ('LOCKUP_CONTENT_TYPE_VIDEO', None):
            s = json.dumps(o)
            found.append((vid, 'THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE' in s, viewers(s), lockup_title(o),
                          '"text": "Upcoming"' in s or 'Scheduled for' in s))
            return
        for x in o.values():
            walk(x, found)
    elif isinstance(o, list):
        for x in o:
            walk(x, found)


def clean_title(t):
    """A title as a tile can show it: no "LIVE:" in front (the tile already says it is live), dashes as commas, one line."""
    t = re.sub(r'\s+', ' ', t or '').strip()
    t = re.sub(r'\s*[\u2013\u2014]\s*', ', ', t)
    t = re.sub(r'^[^\w(]+', '', t)
    t = re.sub(r'^(?:live(?: news| now)?|24/7)\s*[:|\-,]\s*', '', t, flags=re.I)
    return t[:90].rstrip() if len(t) > 90 else t


def starts_at(video):
    """When a scheduled stream starts, from its own page, as an ISO time in UTC; None when it doesn't say."""
    html = get('https://www.youtube.com/watch?v=%s' % video)
    m = re.search(r'"scheduledStartTime":"(\d{9,11})"', html)
    return int(m.group(1)) if m else None


def viewers(s):
    m = re.search(r'"([\d,.]+K?) (?:watching|viewers)', s)
    if not m:
        return 0
    t = m.group(1).replace(',', '')
    return int(float(t[:-1]) * 1000) if t.endswith('K') else int(float(t))


def channel(cid):
    """What the channel is streaming: {'video', 'title', 'next': {'title', 'at'}} (only what is known), and its logo."""
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
    now = {}
    if live:
        now['video'] = live[0][0]
        title = clean_title(live[0][3])
        if title:
            now['title'] = title
        nxt = next_up([f for f in found if f[0] and f[4] and not f[1]])
        if nxt:
            now['next'] = nxt
    return now, logo


def next_up(upcoming, ahead=24 * 3600):
    """The soonest scheduled stream in the next day: its title and start. Only the first few are asked about."""
    soonest = None
    for f in upcoming[:3]:
        try:
            at = starts_at(f[0])
        except Exception:
            continue
        if not at or at < time.time() or at > time.time() + ahead:
            continue
        if soonest is None or at < soonest[0]:
            soonest = (at, clean_title(f[3]))
        time.sleep(0.3)
    if not soonest or not soonest[1]:
        return None
    return {'title': soonest[1], 'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(soonest[0]))}


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
            entry, logo = channel(c['youtube'])
        except Exception as e:  # one channel failing never stops the rest; it keeps what it had
            print('%s: %s' % (c['id'], e), file=sys.stderr)
            if c['youtube'] in before:
                now[c['youtube']] = before[c['youtube']]
            continue
        read += 1
        if logo and logo.startswith('https://yt3.'):
            try:
                save_logo(logo, os.path.join(folder, 'logos', c['id'] + '.jpg'))
            except Exception as e:
                print('%s logo: %s' % (c['id'], e), file=sys.stderr)
        if entry.get('video'):
            now[c['youtube']] = entry
        nxt = entry.get('next')
        print('%-14s %-12s %-4s %s%s' % (c['id'], entry.get('video') or 'not live', 'logo' if logo else '',
                                        entry.get('title', ''), '  next %s %s' % (nxt['at'], nxt['title']) if nxt else ''))
        time.sleep(0.5)
    # TVs leave out a channel now.json doesn't list, so a file from a run YouTube turned away would empty Live TV.
    if read < len(channels) / 2 or not now:
        print('Only %d of %d channels read: keeping the old now.json' % (read, len(channels)), file=sys.stderr)
        return
    out = {'about': 'Written by tools/live_now.py when the website builds: the live video each channel is streaming now, '
                    'its title, and the next scheduled stream when there is one (ADR 0057).',
           'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'channels': now}
    with open(os.path.join(folder, 'now.json'), 'w') as f:
        json.dump(out, f, indent=1)
        f.write('\n')


if __name__ == '__main__':
    main(sys.argv[1])
