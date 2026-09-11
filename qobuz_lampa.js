(function () {
    "use strict";

    // qobuz-lampa.js — адаптация под структуру tpb-adult-lampa.js
    // Залей raw URL в extensions.json Lampa.
    // Перед использованием с API вставь YOUR_QOBUZ_APP_ID.

    var Q = {};
    var APP_ID = ""; // <-- вставь сюда app_id когда будешь готов
    var USER_TOKEN = localStorage.getItem("qobuz_token") || null;

    function _log() {
        try { console.log.apply(console, arguments); } catch (e) {}
    }

    // Компонент — возвращает jQuery элемент (как в рабочем примере)
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
                '<div style="margin-bottom:12px;">' +
                    '<input class="qobuz-input" type="text" placeholder="Поиск треков или альбомов" style="width:60%;padding:8px;border-radius:4px;border:1px solid #333;background:#111;color:#fff;">' +
                    '<button class="qobuz-search-btn" style="margin-left:8px;padding:8px 12px;border-radius:4px;">Искать</button>' +
                    '<button class="qobuz-login-btn" style="margin-left:8px;padding:8px 12px;border-radius:4px;">Войти</button>' +
                    '<button class="qobuz-logout-btn" style="margin-left:8px;padding:8px 12px;border-radius:4px;display:none;">Выйти</button>' +
                '</div>' +
                '<div class="qobuz-status" style="margin-bottom:8px;color:#f0f0f0;font-size:13px;"></div>' +
                '<div class="qobuz-results"></div>' +
            '</div>'
        );

        var input = html.find('.qobuz-input');
        var btnSearch = html.find('.qobuz-search-btn');
        var btnLogin = html.find('.qobuz-login-btn');
        var btnLogout = html.find('.qobuz-logout-btn');
        var status = html.find('.qobuz-status');
        var results = html.find('.qobuz-results');

        if (USER_TOKEN) {
            btnLogin.hide();
            btnLogout.show();
            status.text('Вход выполнен.');
        }

        btnSearch.on('click', function () {
            var q = input.val().trim();
            if (!q) { status.text('Введите запрос.'); return; }
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
                                '<button class="qobuz-play-btn" data-id="' + item.id + '" style="padding:6px 10px;border-radius:4px;">Play</button>' +
                            '</div>' +
                        '</div>'
                    );
                    card.find('.qobuz-play-btn').on('click', function () {
                        var id = $(this).data('id');
                        status.text('Подготовка трека...');
                        Q.play(id).then(function (url) {
                            status.text('');
                            if (url) Lampa.Player.play({ title: item.title, url: url });
                            else status.text('Не удалось получить поток.');
                        }).catch(function (e) {
                            status.text('Ошибка при получении потока.');
                            console.error(e);
                        });
                    });
                    results.append(card);
                });
                status.text('');
            }).catch(function (e) {
                status.text('Ошибка поиска. Смотри консоль.');
                console.error(e);
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
                btnLogin.hide();
                btnLogout.show();
            }).catch(function (err) {
                status.text('Ошибка входа. Смотри консоль.');
                console.error(err);
            });
        });

        btnLogout.on('click', function () {
            USER_TOKEN = null;
            localStorage.removeItem('qobuz_token');
            btnLogout.hide();
            btnLogin.show();
            status.text('Вы вышли.');
        });

        return html;
    };

    // API-обёртки (безопасные заглушки)
    Q.search = function (query) {
        return new Promise(function (resolve, reject) {
            if (!APP_ID) { resolve([]); return; }
            Q.apiSearch(query).then(resolve).catch(reject);
        });
    };

    Q.play = function (trackId) {
        return new Promise(function (resolve, reject) {
            if (!APP_ID) { resolve(null); return; }
            Q.apiGetTrackStream(trackId).then(resolve).catch(reject);
        });
    };

    Q.login = function (email, password) {
        return new Promise(function (resolve, reject) {
            if (!APP_ID) { reject(new Error('APP_ID не задан')); return; }
            Q.apiLogin(email, password).then(function (token) {
                USER_TOKEN = token;
                localStorage.setItem('qobuz_token', token);
                resolve(token);
            }).catch(reject);
        });
    };

    // Заглушки для реальных вызовов — реализуй при готовности
    Q.apiSearch = function (query) { return Promise.resolve([]); };
    Q.apiLogin = function (email, password) { return Promise.reject(new Error('Не реализовано')); };
    Q.apiGetTrackStream = function (trackId) { return Promise.resolve(null); };

    // Регистрация плагина (как в tpb-adult-lampa.js)
    function registerPlugin() {
        try {
            if (typeof Lampa !== 'undefined' && Lampa.Plugin && typeof Lampa.Plugin.add === 'function') {
                Lampa.Plugin.add({
                    title: 'Qobuz',
                    icon: 'music',
                    component: Q.component,
                    onStart: function () { _log('Qobuz onStart'); }
                });
                _log('Qobuz plugin loaded');
                return true;
            }
        } catch (e) { console.error('Plugin.add failed', e); }
        return false;
    }

    // DOM-фолбек
    function domFallback() {
        try {
            var menu = document.querySelector('.sidebar, .menu, .left, .menu-list, .sidebar__list');
            var content = document.querySelector('.content, .main, #content, .app, .page');
            if (!menu) { _log('Qobuz fallback: menu not found'); return; }
            var btn = document.createElement('div');
            btn.style.cssText = 'cursor:pointer;padding:10px;color:#fff;display:flex;align-items:center;gap:8px';
            btn.innerHTML = '<span style="width:28px;height:28px;background:#2b2b2b;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;">Q</span><span>Qobuz</span>';
            menu.appendChild(btn);
            btn.addEventListener('click', function () {
                var comp = Q.component();
                if (content) { content.innerHTML = ''; content.appendChild(comp.get(0)); }
                else document.body.appendChild(comp.get(0));
            });
            _log('Qobuz fallback button added');
        } catch (e) { console.error(e); }
    }

    // Попытка регистрации с ожиданием Lampa
    var attempts = 0, maxAttempts = 20;
    var interval = setInterval(function () {
        attempts++;
        if (typeof Lampa !== 'undefined') {
            clearInterval(interval);
            if (!registerPlugin()) domFallback();
            return;
        }
        if (attempts >= maxAttempts) {
            clearInterval(interval);
            domFallback();
        }
    }, 250);

    _log('Qobuz plugin initialized; APP_ID set:', !!APP_ID, 'USER_TOKEN:', !!USER_TOKEN);

})();
