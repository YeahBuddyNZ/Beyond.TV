/*
 * Keep watching: what each person last opened from Beyond TV, newest first. Streaming apps don't share where you're up
 * to, so this is what was opened from here and when (and the show, when it was opened from a pick). Kept on the TV
 * only, per person, never sent anywhere. Plain ES5.
 */
var Watched = (function () {
  'use strict';

  var KEY = 'beyondtv.watched', KEEP = 30, SHOW_DAYS = 14;
  var all = load();

  function load() {
    try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return a instanceof Array ? a : []; } catch (e) { return []; }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {}
  }

  function who() { return window.Profiles ? Profiles.current().id : ''; }

  /** Something opened: {app, name} for an app, plus {title, image, kind} when it came from a pick. */
  function add(item) {
    if (!item || !item.app) return;
    var me = who(), title = item.title || '';
    all = all.filter(function (x) { return !(x.who === me && x.app === item.app && (x.title || '') === title); });
    all.unshift({who: me, app: item.app, name: item.name || '', title: title, image: item.image || '', kind: item.kind || '', at: Date.now()});
    if (all.length > KEEP) all.length = KEEP;
    save();
  }

  /** The current person's last few, from the last fortnight. An app opened plainly is shown once, under its newest. */
  function list(max) {
    var me = who(), since = Date.now() - SHOW_DAYS * 86400000, out = [], apps = {};
    for (var i = 0; i < all.length && out.length < (max || 3); i++) {
      var x = all[i];
      if (x.who !== me || x.at < since) continue;
      if (!x.title) { if (apps[x.app]) continue; apps[x.app] = true; }
      out.push(x);
    }
    return out;
  }

  /** "Just now", "2 hours ago", "Last night", "Yesterday", "Tuesday", then the date. */
  function when(at) {
    var now = new Date(), then = new Date(at), mins = Math.round((now - then) / 60000);
    var startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (mins < 45) return tr('Agora há pouco', 'Just now', 'Hace un momento');
    if (at >= startToday) {
      var h = Math.max(1, Math.round(mins / 60));
      return h === 1 ? tr('Há 1 hora', 'An hour ago', 'Hace 1 hora') : tr('Há ' + h + ' horas', h + ' hours ago', 'Hace ' + h + ' horas');
    }
    if (at >= startToday - 86400000) {
      return then.getHours() >= 17 ? tr('Ontem à noite', 'Last night', 'Anoche') : tr('Ontem', 'Yesterday', 'Ayer');
    }
    if (at >= startToday - 6 * 86400000) {
      try { return then.toLocaleDateString(I18N.locale(), {weekday: 'long'}); } catch (e) {}
    }
    var dd = then.getDate(), mm = then.getMonth() + 1;
    return (dd < 10 ? '0' : '') + dd + '/' + (mm < 10 ? '0' : '') + mm;
  }

  return {add: add, list: list, when: when};
})();
