/*
 * Te reo word of the day: one kupu on the home screen and the screensaver each day, with what it means and how it
 * breaks into sounds (ka·i·a·ko). Everyday words a family uses, so it turns up in conversation at tea.
 *
 * The same word all day, and the same word on every TV in the country that day. Plain ES5.
 */
var Kupu = (function () {
  'use strict';

  // [kupu, meaning]. Everyday words only, macrons where they belong.
  var WORDS = [
    ['kia ora', 'hello, thanks'], ['mōrena', 'good morning'], ['aroha', 'love'], ['whānau', 'family'],
    ['kai', 'food'], ['wai', 'water'], ['whare', 'house'], ['kura', 'school'], ['tamariki', 'children'],
    ['pō mārie', 'good night'], ['ka pai', 'well done'], ['tino pai', 'very good'], ['haere mai', 'welcome'],
    ['ka kite anō', 'see you again'], ['moana', 'sea'], ['maunga', 'mountain'], ['awa', 'river'],
    ['ngahere', 'forest, bush'], ['rākau', 'tree'], ['manu', 'bird'], ['kererū', 'wood pigeon'],
    ['pīwakawaka', 'fantail'], ['kōtuku', 'white heron'], ['ika', 'fish'], ['kurī', 'dog'], ['ngeru', 'cat'],
    ['rā', 'sun, day'], ['marama', 'moon, month'], ['whetū', 'star'], ['ua', 'rain'], ['hau', 'wind'],
    ['rangi', 'sky'], ['whenua', 'land'], ['tangata', 'person'], ['kōrero', 'talk, story'], ['waiata', 'song'],
    ['tākaro', 'play'], ['moe', 'sleep'], ['pukapuka', 'book'], ['hoa', 'friend'], ['māmā', 'mum'],
    ['pāpā', 'dad'], ['kuia', 'grandmother, elder'], ['koro', 'grandfather, elder'], ['pēpi', 'baby'],
    ['parakuihi', 'breakfast'], ['tina', 'lunch'], ['ata', 'morning'], ['ahiahi', 'evening'], ['kaha', 'strong'],
    ['māia', 'brave'], ['harikoa', 'happy'], ['pōuri', 'sad'], ['ngenge', 'tired'], ['hiakai', 'hungry'],
    ['matewai', 'thirsty'], ['āporo', 'apple'], ['miraka', 'milk'], ['parāoa', 'bread'], ['kākahu', 'clothes'],
    ['hū', 'shoes'], ['pōtae', 'hat'], ['waka', 'canoe, car'], ['ara', 'path'], ['tatari', 'wait'],
    ['āwhina', 'help'], ['whakarongo', 'listen'], ['titiro', 'look'], ['noho', 'sit, stay'], ['tū', 'stand'],
    ['oma', 'run'], ['kanikani', 'dance'], ['kata', 'laugh'], ['ngā mihi', 'thanks, regards']
  ];

  var VOWEL = /[aeiouāēīōū]/;

  /** Into sounds: each vowel ends a syllable, and ng and wh are one sound. "whānau" → "whā·na·u". */
  function sounds(word) {
    return word.split(' ').map(function (w) {
      var out = [], cur = '';
      for (var i = 0; i < w.length; i++) {
        cur += w.charAt(i);
        if (VOWEL.test(w.charAt(i))) { out.push(cur); cur = ''; }
      }
      if (cur) out.push(cur);
      return out.join('·');
    }).join(' ');
  }

  /** Today's word, by the TV's own calendar day. */
  function today(at) {
    var d = new Date(at || Date.now());
    var day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    var w = WORDS[day % WORDS.length];
    return {word: w[0], meaning: w[1], say: sounds(w[0])};
  }

  return {today: today, sounds: sounds, count: WORDS.length};
})();
