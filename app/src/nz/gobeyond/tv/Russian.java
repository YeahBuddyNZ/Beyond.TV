package nz.gobeyond.tv;

/** Russian copy for the custom UI. Keys are the existing English copy, as in Spanish.java. */
final class Russian {
    private Russian() {}

    static String count(long n, String one, String few, String many) {
        long last = Math.abs(n % 100);
        String word = last >= 11 && last <= 14 ? many
                : last % 10 == 1 ? one : last % 10 >= 2 && last % 10 <= 4 ? few : many;
        return n + " " + word;
    }

    static String text(String english) {
        switch (english) {
            case "Live TV": return "Телеканалы";
            case "All Apps": return "Приложения";
            case "Settings": return "Настройки";
            case "Sleep Timer": return "Таймер сна";
            case "Sleep timer off.": return "Таймер сна выключен.";
            case "The TV turns off in ": return "Телевизор выключится через ";
            case "The TV turns off in a minute. Sleep Timer in the menu stops it.": return "Телевизор выключится через минуту. Таймер сна в меню остановит его.";
            case "Art": return "Искусство";
            case "Film photos": return "Кадры из фильмов";
            case "Automatic (art)": return "Автоматически (искусство)";
            case "Automatic (photos)": return "Автоматически (кадры)";
            case "ART": return "ИСКУССТВО";
            case "Home Settings": return "Главный экран";
            case "TV Settings": return "Настройки ТВ";
            case "HDMI Inputs": return "Входы HDMI";
            case "Inputs": return "Входы";
            case "Shortcuts": return "Ярлыки";
            case "Weather": return "Погода";
            case "No weather data right now.": return "Сейчас нет данных о погоде.";
            case "Sunrise ": return "Восход ";
            case "Sunset ": return "Закат ";
            case "Crypto": return "Криптовалюты";
            case "24h change": return "изменение за 24 ч";
            case "For You": return "Для вас";
            case "← → to move · OK to drop · Back to cancel": return "← → — переместить · OK — оставить · Назад — отмена";
            case "Moving ": return "Перемещение: ";
            case ", position ": return ", место ";
            case "Couldn't open ": return "Не удалось открыть ";
            case " of ": return " из ";
            case ", tab ": return ", вкладка ";
            case " of 3": return " из 3";
            case "Dollar": return "Доллар";
            case "Series": return "Сериал";
            case "prices from ": return "котировки за ";
            case "Starting…": return "Запуск…";
            case "Original": return "Заводской";
            case "Home Screen, ": return "Главный экран, ";
            case "Screensaver, preview": return "Заставка, предпросмотр";
            case "no ads, with the new screensaver": return "без рекламы, с новой заставкой";
            case "the TV's factory home screen": return "заводской главный экран телевизора";
            case ". In use": return ". Используется";
            case " of 2": return " из 2";
            case "Your TV's home screen and screensaver": return "Главный экран и заставка телевизора";
            case "Home Screen": return "Главный экран";
            case "Screensaver": return "Заставка";
            case "Preview": return "Предпросмотр";
            case "On the TV: tick “Always allow” and press OK.": return "На телевизоре отметьте «Всегда разрешать» и нажмите OK.";
            case "RECOMMENDATIONS": return "РЕКОМЕНДАЦИИ";
            case "No TMDB key: see the README (config.properties).": return "Нет ключа TMDB: см. README (config.properties).";
            case "Error: ": return "Ошибка: ";
            case "Fetching titles…": return "Загрузка рекомендаций…";
            case "Links to the titles by Watchmode.": return "Ссылки на тайтлы: Watchmode.";
            case "This product uses the TMDB API but is not endorsed or certified by TMDB.": return "Продукт использует API TMDB, но не одобрен и не сертифицирован TMDB.";
            case "COMPARISON": return "СРАВНЕНИЕ";
            case "Home button": return "Кнопка «Домой»";
            case "Free memory": return "Свободная память";
            case "Home screen memory": return "Память главного экрана";
            case "NOTICES": return "УВЕДОМЛЕНИЯ";
            case "None yet.": return "Пока нет.";
            case "No ads, with the new screensaver": return "Без рекламы, с новой заставкой";
            case "The TV's factory home screen": return "Заводской главный экран телевизора";
            case "Switching takes a few seconds; the screen blinks while it measures.": return "Переключение занимает несколько секунд; во время замеров экран мигает.";
            case "now": return "сейчас";
            case "Measuring the original home screen…": return "Замер заводского главного экрана…";
            case "Switching the home screen and screensaver…": return "Переключение главного экрана и заставки…";
            case "Android didn't accept the new home screen": return "Android не принял новый главный экран";
            case "Turning off apps (": return "Отключение приложений (";
            case "Measuring Beyond™ TV…": return "Замер Beyond™ TV…";
            case "Couldn't turn on Beyond™ TV: ": return "Не удалось включить Beyond™ TV: ";
            case "Turning the apps back on…": return "Включение приложений…";
            case "Turning apps back on (": return "Включение приложений (";
            case "Restoring the original home screen…": return "Восстановление заводского главного экрана…";
            case "Original mode: the factory home screen, screensaver and apps are back.": return "Заводской режим: восстановлены главный экран, заставка и приложения.";
            case "the original home screen": return "заводской главный экран";
            case "Original mode, but I couldn't turn back on: ": return "Заводской режим, но не удалось включить: ";
            case "Couldn't go back to the original: ": return "Не удалось восстановить заводской режим: ";
            case "Beyond™ TV's home screen crashed 3 times in a row; I switched back to the original one.": return "Главный экран Beyond™ TV аварийно завершился 3 раза подряд; восстановлен заводской главный экран.";
            case "the home screen": return "главный экран";
            case "the screensaver": return "заставка";
            case "Couldn't check Beyond™ TV: ": return "Не удалось проверить Beyond™ TV: ";
            case "The TV update turned back on ": return "После обновления телевизора снова включены: ";
            case "Turned off what was missing: ": return "Дополнительно отключены: ";
            case "The TV was updated; Beyond™ TV is still on.": return "Телевизор обновлён; Beyond™ TV по-прежнему включён.";
            case "Connecting…": return "Подключение…";
            case "Accept “Allow USB debugging?” on the TV (tick “Always allow”).": return "На телевизоре разрешите отладку по USB и отметьте «Всегда разрешать».";
            case "Language": return "Язык";
            case "Temperature": return "Температура";
            case "Theme": return "Тема";
            case "Automatic": return "Автоматически";
            case "Light": return "Светлая";
            case "Dark": return "Тёмная";
            case "Navigation sounds": return "Звуки навигации";
            case "Weather widget": return "Виджет погоды";
            // What TalkBack reads on the drawer's weather card (#47)
            case ". High ": return ". Максимум ";
            case ", low ": return ", минимум ";
            case " Next hours: ": return " Ближайшие часы: ";
            case " Sunrise ": return " Восход ";
            case " Sunset ": return " Закат ";
            case "City": return "Город";
            case "Searching…": return "Поиск…";
            case "Type the city's name": return "Введите название города";
            case "Search": return "Найти";
            case "Cancel": return "Отмена";
            case "No city with that name.": return "Город с таким названием не найден.";
            case "Couldn't search now: ": return "Не удалось выполнить поиск: ";
            case "Quotes widget": return "Виджет котировок";
            case "Te reo word of the day": return "Слово дня на те рео маори";
            case "Help fix problems": return "Помогать исправлять ошибки";
            case "Couldn't check just now. It tries again by itself": return "Сейчас не удалось проверить. Попробует снова само";
            case "Taking a short break. They'll be back by themselves.": return "Небольшой перерыв. Скоро вернутся сами.";
            case "Updates come straight from Beyond, and only the real Beyond™ TV ever installs.": return "Обновления приходят прямо от Beyond, и устанавливается только настоящий Beyond™ TV.";
            case "Who's watching?": return "Кто смотрит?";
            case "Everyone together": return "Все вместе";
            case "Family": return "Семья";
            case "For the family": return "Для всей семьи";
            case "For ": return "Для ";
            case "Sign in with Beyond Family": return "Войти через Beyond Family";
            case "Sign in with your Beyond Family": return "Войдите через свой Beyond Family";
            case "Sign out of this TV": return "Выйти на этом телевизоре";
            case "On your phone, open Beyond Family › Family › TVs › On somebody else's TV, and type": return "На телефоне откройте Beyond Family › Семья › Телевизоры › На чужом телевизоре и введите";
            case "Your family is on this TV already. This is for somebody from another home.": return "Ваша семья уже на этом телевизоре. Это для гостей из другого дома.";
            case "Manage people": return "Управлять профилями";
            case "Bring in your family from Beyond Family": return "Добавить семью из Beyond Family";
            case "Grown-up PIN": return "PIN взрослого";
            case "People": return "Люди";
            case "Pick someone to change, or add someone.": return "Выберите, кого изменить, или добавьте кого-нибудь.";
            case "Edit": return "Изменить";
            case "Add someone": return "Добавить";
            case "Change the grown-up PIN": return "Сменить PIN взрослого";
            case "Set a grown-up PIN": return "Задать PIN взрослого";
            case "Done": return "Готово";
            case "Name": return "Имя";
            case "Kids' profile: ": return "Детский профиль: ";
            case "on": return "вкл.";
            case "off": return "выкл.";
            case "There needs to be at least one grown-up.": return "Нужен хотя бы один взрослый.";
            case "Save": return "Сохранить";
            case "Remove": return "Удалить";
            case "Back": return "Назад";
            case "Type the four numbers.": return "Введите четыре цифры.";
            case "New grown-up PIN": return "Новый PIN взрослого";
            case "Four numbers the kids don't know.": return "Четыре цифры, которых не знают дети.";
            case "Type it again": return "Введите ещё раз";
            case "Current PIN": return "Текущий PIN";
            case "That's not it. Try again.": return "Не тот. Попробуйте ещё раз.";
            case "Me": return "Я";
            case "Talk to Beyond": return "Написать в Beyond";
            case "What would make Beyond™ TV better? Say it, or type it. We read every one.": return "Что сделает Beyond™ TV лучше? Скажите или напишите. Мы читаем всё.";
            case "Or type it here": return "Или напишите здесь";
            case "Speak": return "Сказать";
            case "Say it again": return "Сказать ещё раз";
            case "Send to Beyond": return "Отправить в Beyond";
            case "What would make Beyond™ TV better?": return "Что сделает Beyond™ TV лучше?";
            case "This TV can't listen, so type it below.": return "Этот телевизор не слышит, напишите ниже.";
            case "Sending…": return "Отправляем…";
            case "Thank you! If we reply, it shows up here on your TV.": return "Спасибо! Если мы ответим, ответ появится здесь, на телевизоре.";
            case "That didn't go. Check the internet and try again.": return "Не отправилось. Проверьте интернет и попробуйте снова.";
            case "Updates": return "Обновления";
            case "Updates, ": return "Обновления, ";
            case "New version": return "Новая версия";
            case "Ready, but the TV needs your OK once: press OK to allow it": return "Готово, но телевизору нужно ваше разрешение один раз: нажмите OK";
            case "A new version is ready": return "Новая версия готова";
            case "To keep itself up to date, Beyond TV needs the TV's OK to install its own updates. On the next screen, switch Beyond TV on, then press Back.": return "Чтобы обновляться, Beyond TV нужно разрешение телевизора на установку своих обновлений. На следующем экране включите Beyond TV и нажмите «Назад».";
            case "Show me": return "Показать";
            case "Not now": return "Не сейчас";
            case "Kind of art": return "Вид искусства";
            case "Mixed": return "Разное";
            case "Landscapes": return "Пейзажи";
            case "The sea": return "Море";
            case "Gardens and flowers": return "Сады и цветы";
            case "Mountains": return "Горы";
            case "Impressionism": return "Импрессионизм";
            case "Still life": return "Натюрморт";
            case "Kia ora": return "Kia ora";
            case ", whānau": return ", whānau";
            case "Keep watching": return "Продолжить просмотр";
            case "te reo word of the day": return "слово дня на те рео";
            case "Just now": return "Только что";
            case "An hour ago": return "Час назад";
            case "Last night": return "Вчера вечером";
            case "Yesterday": return "Вчера";
            case "Tonight at home": return "Сегодня вечером дома";
            case "Today at home": return "Сегодня дома";
            case "Linked": return "Подключено";
            case "Link Beyond Family": return "Подключить Beyond Family";
            case "A remote on your phone, and messages on the TV": return "Пульт в телефоне и сообщения на телевизоре";
            case "High ": return "Макс. ";
            case "Low ": return "Мин. ";
            case "Install the new version": return "Установить новую версию";
            case "Check for updates": return "Проверить обновления";
            case "Install updates by themselves": return "Устанавливать обновления самостоятельно";
            case "No prompt, while nobody is on the home screen": return "Без вопросов, когда никто не на главном экране";
            case "The TV asks first: one OK press": return "Телевизор сначала спросит: одно нажатие OK";
            case "New versions come from github.com/YeahBuddyNZ/Beyond.TV, signed with the same key.": return "Новые версии приходят с github.com/YeahBuddyNZ/Beyond.TV и подписаны тем же ключом.";
            case "Version ": return "Версия ";
            case "ready: OK installs it": return "готова: OK установит её";
            case "Checking…": return "Проверка…";
            case "Couldn't check: ": return "Не удалось проверить: ";
            case "Not checked yet": return "Ещё не проверялось";
            case "Up to date, checked ": return "Актуально, проверено ";
            case "Beyond™ TV updated itself to version ": return "Beyond™ TV обновился до версии ";
            case "Once a day: your city, the TV's model and its errors. Never what you watch.": return "Раз в день: ваш город, модель телевизора и его ошибки. Никогда то, что вы смотрите.";
            case "On": return "Вкл.";
            case "Off": return "Выкл.";
            case "Shelf": return "Избранные приложения";
            case "on the shelf, place ": return "в избранном, позиция ";
            case "not on the shelf": return "не в избранном";
            case "Remote Buttons": return "Кнопки пульта";
            case "Netflix button": return "Кнопка Netflix";
            case "YouTube button": return "Кнопка YouTube";
            case "Prime Video button": return "Кнопка Prime Video";
            case "TCL Channel button": return "Кнопка TCL Channel";
            case "Tabii button": return "Кнопка Tabii";
            case "Nothing": return "Ничего";
            case "BRAVIA CORE button": return "Кнопка BRAVIA CORE";
            case "Disney+ button": return "Кнопка Disney+";
            case "Crunchyroll button": return "Кнопка Crunchyroll";
            case "Sony default": return "Как задано Sony";
            case "Sony default: the button opens what it always did.": return "Как задано Sony: кнопка открывает то же, что и раньше.";
            case "Not installed": return "Не установлено";
            case ", selected": return ", выбрано";
            case "OK or the arrows change the value.": return "Нажмите OK или стрелки, чтобы изменить значение.";
            case "OK picks, Back cancels.": return "OK — выбрать, «Назад» — отменить.";
            case "Disney and Globoplay: the TV itself controls those buttons.": return "Кнопками Disney и Globoplay управляет сам телевизор.";
            case "YouTube, Prime Video and Google Play: the TV itself controls those buttons.": return "Кнопками YouTube, Prime Video и Google Play управляет сам телевизор.";
            case "Netflix, YouTube and Prime Video: the TV itself controls those buttons.": return "Кнопками Netflix, YouTube и Prime Video управляет сам телевизор.";
            case "The other buttons: the TV itself controls them.": return "Остальными кнопками управляет сам телевизор.";
            case "TCL remote buttons: on this TV they work as always.": return "Кнопки пульта TCL: на этом телевизоре работают как прежде.";
            case "Explore": return "Обзор";
            case "Movies": return "Фильмы";
            case "Shows": return "Сериалы";
            case "Clear": return "Ясно";
            case "Mostly Sunny": return "Малооблачно";
            case "Mostly Clear": return "Малооблачно";
            case "Partly Cloudy": return "Переменная облачность";
            case "Cloudy": return "Облачно";
            case "Fog": return "Туман";
            case "Drizzle": return "Морось";
            case "Heavy Rain": return "Сильный дождь";
            case "Snow": return "Снег";
            case "Thunderstorms": return "Гроза";
            case "Rain": return "Дождь";
            case "On · ": return "В избранном · ";
            case "OK adds or removes · ← → change the order": return "OK — добавить или убрать · ← → — изменить порядок";
            case "Couldn't open TV Settings": return "Не удалось открыть настройки телевизора";
            case "THIS MORNING": return "ЭТИМ УТРОМ";
            case "THIS AFTERNOON": return "СЕГОДНЯ ДНЁМ";
            case "TONIGHT": return "СЕГОДНЯ ВЕЧЕРОМ";
            case "Action & Adventure": return "Боевик и приключения";
            case "Sci-Fi & Fantasy": return "Фантастика и фэнтези";
            case "War & Politics": return "Война и политика";
            case "Kids": return "Для детей";
            case "News": return "Новости";
            case "Soap": return "Мыльная опера";
            case "Talk": return "Ток-шоу";
            case "": return "";
            case "Beyond™ TV's home screen ran into a problem.\nGoing back to the TV's original home screen…": return "Ошибка главного экрана Beyond™ TV.\nВозвращаемся к заводскому главному экрану…";
            case "debugging is off on the TV (port 5555 closed)": return "отладка на телевизоре выключена (порт 5555 закрыт)";
            case "debugging permission wasn't accepted on the TV": return "на телевизоре не разрешена отладка";
            case "the TV's ADB didn't respond": return "ADB телевизора не ответил";
            case "the TV asked for TLS (wireless debugging); use USB debugging": return "телевизор запросил TLS (беспроводная отладка); используйте отладку по USB";
            case "unexpected reply from ADB": return "неожиданный ответ ADB";
            case "the TV rejected the app's key": return "телевизор отклонил ключ приложения";
            case "ADB refused the command": return "ADB отклонил команду";
            case "invalid ADB message": return "некорректное сообщение ADB";
            case "ADB message too large": return "слишком большое сообщение ADB";
            case "the TV's first setup saved the Wi-Fi, and turning it off would erase those networks. "
                    + "In Settings → Network & Internet, forget the network and connect again (networks out of range don't "
                    + "show there: Claude Code can remove them from your computer), then try once more.":
                return "Сети Wi-Fi сохранены приложением первоначальной настройки телевизора. Его отключение удалит эти сети. "
                        + "В разделе «Настройки → Сеть и Интернет» забудьте сеть и подключитесь заново, затем повторите попытку. "
                        + "Недоступные сети там не отображаются: Claude Code может удалить их с компьютера.";
            case "Link this TV to your family": return "Подключите этот телевизор к семье";
            case "On your phone, open Beyond Family › Family › TVs › Add a TV, and type": return "На телефоне откройте Beyond Family › Семья › Телевизоры › Добавить телевизор и введите";
            case "Talking to Beyond Family…": return "Связываемся с Beyond Family…";
            case "The code lasts ": return "Код действует ";
            case "Couldn't reach Beyond Family. Check the TV's internet and try again.": return "Не удалось связаться с Beyond Family. Проверьте интернет на телевизоре и попробуйте снова.";
            case "Linked to ": return "Подключён к ";
            case "This TV shows your family's people, follows the remote on your phone and shows the family's messages.": return "Этот телевизор показывает вашу семью, слушается пульта на телефоне и показывает сообщения семьи.";
            case "Unlink this TV": return "Отключить этот телевизор";
            case "Unlinked from Beyond Family": return "Отключён от Beyond Family";
            case "Beyond Family unlinked this TV": return "Beyond Family отключила этот телевизор";
            case "Link": return "Подключить";
            case "From ": return "От ";
            case "just now": return "только что";
            case "Now watching: ": return "Сейчас смотрит: ";
            case "That app isn't on this TV": return "Этого приложения нет на телевизоре";
            case "Listening for the family's remote and messages": return "Ждёт пульт и сообщения семьи";
            default:
                // Notices are saved in the language in use when they were generated.
                String[] prefixes = {"Couldn't check Beyond™ TV: ", "Couldn't turn on Beyond™ TV: ",
                        "Couldn't go back to the original: ", "Original mode, but I couldn't turn back on: "};
                for (String p : prefixes) if (english.startsWith(p)) return text(p) + text(english.substring(p.length()));
                String shelfPrefix = "OK adds or removes (up to ";
                String shelfSuffix = "). ← → change the order.";
                if (english.startsWith(shelfPrefix) && english.endsWith(shelfSuffix)) {
                    String n = english.substring(shelfPrefix.length(), english.length() - shelfSuffix.length());
                    return "OK — добавить или убрать (до " + n + "). ← → — изменить порядок.";
                }
                String prefix = "Beyond™ TV is on: new home screen and screensaver, ";
                if (english.startsWith(prefix) && english.endsWith(" apps turned off.")) {
                    String n = english.substring(prefix.length(), english.length() - " apps turned off.".length());
                    return "Beyond™ TV включён: новый главный экран и заставка; отключено приложений: " + n + ".";
                }
                if (english.startsWith("On · ") && english.endsWith(" titles from the TV's apps, 3 new ones every hour.")) {
                    String n = english.substring(5, english.length() - " titles from the TV's apps, 3 new ones every hour.".length());
                    return "Вкл. · Рекомендаций из приложений телевизора: " + n + "; 3 новых каждый час.";
                }
                if (english.endsWith(" hours ago")) return english.substring(0, english.length() - 10) + " ч назад";
                if (english.endsWith(" min ago")) return english.substring(0, english.length() - 8) + " мин назад";
                if (english.endsWith(" h ago")) return english.substring(0, english.length() - 6) + " ч назад";
                if (english.endsWith(" days ago")) {
                    try { return count(Long.parseLong(english.substring(0, english.length() - 9)), "день", "дня", "дней") + " назад"; }
                    catch (NumberFormatException ignored) { return english; }
                }
                return english;
        }
    }
}
