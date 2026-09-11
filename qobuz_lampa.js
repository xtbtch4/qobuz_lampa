(function () {
    "use strict";

    // qobuz-lampa.js — загружается с GitHub
    // Убедись, что extensions.json указывает на raw URL этого файла

    var Q = {};
    var APP_ID = ""; // <-- Вставь сюда свой Qobuz APP_ID
    var USER_TOKEN = localStorage.getItem("qobuz_token") || null;

    // --- UI компонент (возвращает jQuery элемент) ---
    Q.component = function () {
        var html = $(
            '<div class="qobuz-plugin" style="padding:16px;color:#fff;">' +
                '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
                    '<div style="width:44px;height:44px;background:#2b2b2b;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:700;">Q</div>' +
                    '<div>' +
                        '<div style="font-size:16px;font-weight:600;">Qobuz</div>' +
                        '<div style="font-size:12px;color:#9a9a9a;">Поиск, альбомы, плейлисты, избранное</div>' +
                    '</div>' +
                '</div>' +
                '<div style="margin-bottom:10px;">' +
                    '<input class="qobuz-input" type="text" placeholder="Поиск треков или альбомов" style="width:60%;padding:8px;border-radius:4px;border:1px solid #333;background:#111;color:#fff;">' +
                    '<button class="qobuz-search-btn" style="margin-left:8px;padding:8px 12px;border-radius:4px;">Искать</button>' +
                    '<button class="qobuz-login-btn" style="margin-left:8px;padding:8px 12px;border-radius:4px;">Войти</button>' +
                '</div>' +
                '<div class="qobuz-status" style="margin-bottom:8px;color:#f0f0f0;font-size:13px;"></div>' +
                '<div class="qobuz-results"></div>' +
            '</div>'
        );

        var input = html.find('.qobuz-input');
        var btnSearch = html.find('.qobuz-search-btn');
        var btnLogin = html.find('.qobuz-login-btn');
        var status = html.find('.qobuz-status');
        var results = html.find('.qobuz-results');

        btnSearch.on('click', function () {
            var q = input.val().trim();
            if (!q) {
                status.text('Введите запрос.');
                return;
            }
            status.text('Поиск...');
            Q.search(q).then(function (list) {
                results.empty();
                if (!list || !list.length) {
                    results.append('<div style="color:#999">Ничего не найдено</div>');
                    status.text('');
                    return;
                }
                list.forEach(function (item) {
                    var card = $(
                        '<div style="display:flex;align-items:center;gap:12px;padding:8px;border-bottom:1px solid #222;">' +
                            '<img src="' + (item.cover || '') + '" style="width:48px;height:48px;object-fit:cover;border-radius:4px;">' +
                            '<div style="flex:1;">' +
                                '<div style="font-size:14px;color:#fff;">' + (item.title || '—') + '</div>' +
                                '<div style="font-size:12px;color:#999;">' + (item.artist || '') + '</div>' +
                            '</div>' +
                            '<div>' +
                                '<button class="play" data-id="' + item.id + '" style="padding:6px 10px;border-radius:4px;">Play</button>' +
                            '</div>' +
                        '</div>'
                    );

                    card.find('.play').on('click', function () {
                        var id = $(this).data('id');
                        status.text('Подготовка трека...');
                        Q.play(id).then(function (url) {
                            status.text('');
                            if (url) {
                                Lampa.Player.play({ title: item.title, url: url });
                            } else {
                                status.text('Не удалось получить поток.');
                            }
                        }).catch(function (e) {
                            status.text('Ошибка при получении потока.');
                            console.error('Qobuz play error', e);
                        });
                    });

                    results.append(card);
                });
                status.text('');
            }).catch(function (e) {
                status.text('Ошибка поиска. Смотри консоль.');
                console.error('Qobuz search error', e);
            });
        });

        btnLogin.on('click', function () {
            var email = prompt('Email Qobuz:');
            if (!email) return;
            var pass = prompt('Пароль:');
            if (!pass) return;
            status.text('Вход...');
            Q.login(email, pass).then(function (token) {
                status.text('Вход выполнен.');
            }).catch(function (err) {
                status.text('Ошибка входа. Смотри консоль.');
                console.error('Qobuz login error', err);
            });
        });

        return html;
    };

    // --- API-обёртки (выполняются только по действию) ---
    // Пока заглушки: если APP_ID пустой — возвращают безопасные значения.
    // Реализуй Q.apiSearch / Q.apiLogin / Q.apiGetTrackStream при готовности.

    Q.search = function (query) {
        return new Promise(function (resolve, reject) {
            if (!APP_ID) {
                // тестовый режим — пустой результат
                resolve([]);
                return;
            }
            Q.apiSearch(query).then(resolve).catch(reject);
        });
    };

    Q.play = function (trackId) {
        return new Promise(function (resolve, reject) {
            if (!APP_ID) {
                resolve(null);
                return;
            }
            Q.apiGetTrackStream(trackId).then(resolve).catch(reject);
        });
    };

    Q.login = function (email, password) {
        return new Promise(function (resolve, reject) {
            if (!APP_ID) {
                reject(new Error('APP_ID не задан. Установи APP_ID для работы с Qobuz API.'));
                return;
            }
            Q.apiLogin(email, password).then(function (token) {
                USER_TOKEN = token;
                localStorage.setItem('qobuz_token', token);
                resolve(token);
            }).catch(reject);
        });
    };

    // --- Заглушки для реальных вызовов (здесь вставь fetch к Qobuz API) ---
    Q.apiSearch = function (query) {
        // Пример: реализуй fetch к Qobuz API и верни массив {id, title, artist, cover}
        return Promise.resolve([]);
    };

    Q.apiLogin = function (email, password) {
        // Пример: POST /user/login -> вернуть user_auth_token
        return Promise.reject(new Error('Не реализовано: Q.apiLogin'));
    };

    Q.apiGetTrackStream = function (trackId) {
        // Пример: GET /track/get -> вернуть stream_url
        return Promise.resolve(null);
    };

    // --- Регистрация плагина в Lampa (несколько попыток) ---
    function registerPlugin() {
        var registered = false;

        try {
            if (typeof Lampa !== 'undefined' && Lampa.Plugin && typeof Lampa.Plugin.add === 'function') {
                Lampa.Plugin.add({
                    title: 'Qobuz',
                    icon: 'music',
                    component: Q.component,
                    onStart: function () { console.log('Qobuz onStart via Plugin.add'); }
                });
                console.log('Qobuz registered via Lampa.Plugin.add');
                registered = true;
            }
        } catch (e) {
            console.error('Qobuz Plugin.add failed', e);
        }

        try {
            if (!registered && typeof Lampa !== 'undefined' && Lampa.Menu && typeof Lampa.Menu.add === 'function') {
                Lampa.Menu.add({
                    title: 'Qobuz',
                    icon: 'music',
                    component: Q.component
                });
                console.log('Qobuz registered via Lampa.Menu.add');
                registered = true;
            }
        } catch (e) {
            console.error('Qobuz Menu.add failed', e);
        }

        try {
            if (!registered && typeof Lampa !== 'undefined' && Lampa.Component && typeof Lampa.Component.add === 'function') {
                Lampa.Component.add('qobuz', Q.component);
                console.log('Qobuz registered via Lampa.Component.add');
                registered = true;
            }
        } catch (e) {
            console.error('Qobuz Component.add failed', e);
        }

        // Если ни один из API не сработал — добавим запасной пункт в DOM
        if (!registered) {
            console.warn('Qobuz: стандартная регистрация не сработала — применяю DOM-фолбек');
            addDomFallback();
        }
    }

    // --- Запасной способ: добавить пункт в боковую панель вручную и открыть компонент в основном контейнере ---
    function addDomFallback() {
        try {
            // Найти возможные контейнеры меню и контента
            var menuSelectors = ['.sidebar', '.menu', '.left', '.menu-list', '.sidebar__list'];
            var contentSelectors = ['.content', '.main', '#content', '.app', '.page'];

            var menuEl = null;
            for (var i = 0; i < menuSelectors.length; i++) {
                var el = document.querySelector(menuSelectors[i]);
                if (el) { menuEl = el; break; }
            }

            var contentEl = null;
            for (var j = 0; j < contentSelectors.length; j++) {
                var el2 = document.querySelector(contentSelectors[j]);
                if (el2) { contentEl = el2; break; }
            }

            // Если меню найдено — добавляем кнопку
            if (menuEl) {
                var btn = document.createElement('div');
                btn.className = 'qobuz-fallback-btn';
                btn.style.cssText = 'cursor:pointer;padding:10px;color:#fff;display:flex;align-items:center;gap:8px';
                btn.innerHTML = '<span style="width:28px;height:28px;background:#2b2b2b;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;">Q</span><span>Qobuz</span>';
                menuEl.appendChild(btn);

                btn.addEventListener('click', function () {
                    openFallbackComponent(contentEl);
                });

                console.log('Qobuz: добавлена кнопка в DOM меню (фолбек).');
            } else {
                console.warn('Qobuz: не найден контейнер меню для DOM-фолбека.');
            }
        } catch (e) {
            console.error('Qobuz DOM fallback error', e);
        }
    }

    function openFallbackComponent(contentEl) {
        try {
            var comp = Q.component();
            if (contentEl) {
                // Очистим и вставим
                contentEl.innerHTML = '';
                contentEl.appendChild(comp.get(0));
            } else {
                // Если не найден content, вставим в body
                document.body.appendChild(comp.get(0));
            }
        } catch (e) {
            console.error('Qobuz openFallbackComponent error', e);
        }
    }

    // Ждём, пока Lampa и DOM инициализируются — пробуем зарегистрировать несколько раз
    var attempts = 0;
    var maxAttempts = 20;
    var interval = setInterval(function () {
        attempts++;
        if (typeof Lampa !== 'undefined') {
            clearInterval(interval);
            try {
                registerPlugin();
            } catch (e) {
                console.error('Qobuz registerPlugin error', e);
                addDomFallback();
            }
            return;
        }
        if (attempts >= maxAttempts) {
            clearInterval(interval);
            // Lampa не определён — делаем DOM-фолбек
            addDomFallback();
        }
    }, 300);

    // Лог для быстрой отладки
    console.log('qobuz-lampa.js loaded; APP_ID set:', !!APP_ID, 'USER_TOKEN present:', !!USER_TOKEN);

})();
