(function () {
    "use strict";

    // ФАЙЛ: qobuz-lampa.js
    // Поместить в папку plugins и добавить в extensions.json
    // Этот плагин безопасен при загрузке: сетевые вызовы выполняются только по клику.

    var Q = {};
    var APP_ID = ""; // Установи позже, пока можно оставить пустым
    var USER_TOKEN = localStorage.getItem("qobuz_token") || null;

    // Компонент возвращает jQuery элемент
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

    // Заглушки и безопасные реализации
    Q.search = function (query) {
        return new Promise(function (resolve, reject) {
            if (!APP_ID) {
                // Для теста возвращаем пустой массив, чтобы UI работал
                resolve([]);
                return;
            }
            // Реальная реализация должна быть здесь
            resolve([]);
        });
    };

    Q.play = function (trackId) {
        return new Promise(function (resolve, reject) {
            if (!APP_ID) {
                resolve(null);
                return;
            }
            resolve(null);
        });
    };

    Q.login = function (email, password) {
        return new Promise(function (resolve, reject) {
            if (!APP_ID) {
                reject(new Error('APP_ID не задан. Установи APP_ID для работы с Qobuz API.'));
                return;
            }
            reject(new Error('Не реализовано: логин в Qobuz.'));
        });
    };

    // Попытка регистрации плагина несколькими способами
    function tryRegister() {
        var registered = false;

        try {
            if (typeof Lampa !== 'undefined' && Lampa.Plugin && typeof Lampa.Plugin.add === 'function') {
                Lampa.Plugin.add({
                    title: 'Qobuz',
                    icon: 'music',
                    component: Q.component,
                    onStart: function () { console.log('Qobuz onStart via Plugin.add'); }
                });
                console.log('Qobuz plugin registered via Lampa.Plugin.add');
                registered = true;
            }
        } catch (e) {
            console.error('Plugin.add failed', e);
        }

        try {
            if (!registered && typeof Lampa !== 'undefined' && Lampa.Menu && typeof Lampa.Menu.add === 'function') {
                Lampa.Menu.add({
                    title: 'Qobuz',
                    icon: 'music',
                    component: Q.component
                });
                console.log('Qobuz plugin registered via Lampa.Menu.add');
                registered = true;
            }
        } catch (e) {
            console.error('Menu.add failed', e);
        }

        try {
            if (!registered && typeof Lampa !== 'undefined' && typeof Lampa.Component === 'object' && typeof Lampa.Component.add === 'function') {
                Lampa.Component.add('qobuz', Q.component);
                console.log('Qobuz plugin registered via Lampa.Component.add');
                registered = true;
            }
        } catch (e) {
            console.error('Component.add failed', e);
        }

        if (!registered) {
            console.warn('Qobuz plugin registration did not match known Lampa APIs. Check Lampa version and example plugin structure.');
        } else {
            console.log('Qobuz plugin load attempt finished');
        }
    }

    // Выполнить регистрацию после небольшой задержки, чтобы Lampa успела инициализироваться
    setTimeout(tryRegister, 200);

})();
                    
