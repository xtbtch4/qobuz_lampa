(function () {
    "use strict";

    // НАЗВАНИЕ ФАЙЛА: qobuz-lampa.js
    // Этот файл не делает сетевых запросов при загрузке.
    // Все запросы выполняются только по клику пользователя.

    var Q = {};
    var APP_ID = ""; // Оставь пустым пока тестируешь отображение
    var USER_TOKEN = localStorage.getItem("qobuz_token") || null;

    // Компонент, который возвращает DOM-элемент (jQuery)
    Q.component = function () {
        var html = $(
            '<div class="qobuz-plugin" style="padding:16px;">' +
                '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
                    '<div style="width:48px;height:48px;background:#444;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">Q</div>' +
                    '<div>' +
                        '<div style="font-size:18px;font-weight:600;">Qobuz</div>' +
                        '<div style="font-size:12px;color:#999;">Поиск, альбомы, плейлисты, избранное</div>' +
                    '</div>' +
                '</div>' +
                '<div class="qobuz-controls" style="margin-bottom:12px;">' +
                    '<input class="qobuz-input" type="text" placeholder="Поиск треков или альбомов" style="width:70%;padding:8px;border-radius:4px;border:1px solid #333;background:#111;color:#fff;">' +
                    '<button class="qobuz-search-btn" style="margin-left:8px;padding:8px 12px;border-radius:4px;">Искать</button>' +
                    '<button class="qobuz-login-btn" style="margin-left:8px;padding:8px 12px;border-radius:4px;">Войти</button>' +
                '</div>' +
                '<div class="qobuz-status" style="margin-bottom:8px;color:#f0f0f0;font-size:13px;"></div>' +
                '<div class="qobuz-results" style="display:block;"></div>' +
            '</div>'
        );

        var input = html.find('.qobuz-input');
        var btnSearch = html.find('.qobuz-search-btn');
        var btnLogin = html.find('.qobuz-login-btn');
        var status = html.find('.qobuz-status');
        var results = html.find('.qobuz-results');

        // Безопасная обработка клика поиска — сетевой вызов только по действию
        btnSearch.on('click', function () {
            var q = input.val().trim();
            if (!q) {
                status.text('Введите запрос для поиска.');
                return;
            }
            status.text('Выполняется поиск...');
            // Вызов функции поиска — обёрнут в try/catch
            try {
                Q.search(q).then(list => {
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
                            Q.play(id).then(url => {
                                status.text('');
                                if (url) {
                                    Lampa.Player.play({ title: item.title, url: url });
                                } else {
                                    status.text('Не удалось получить ссылку на поток.');
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
                    status.text('Ошибка поиска. Проверь консоль.');
                    console.error('Qobuz search error', e);
                });
            } catch (e) {
                status.text('Ошибка выполнения поиска.');
                console.error(e);
            }
        });

        // Кнопка входа — открывает простую форму prompt (минимум UI)
        btnLogin.on('click', function () {
            var email = prompt('Email (Qobuz):');
            if (!email) return;
            var pass = prompt('Пароль:');
            if (!pass) return;
            status.text('Вход...');
            Q.login(email, pass).then(function (token) {
                status.text('Вход выполнен.');
            }).catch(function (err) {
                status.text('Ошибка входа. Проверь консоль.');
                console.error('Qobuz login error', err);
            });
        });

        return html;
    };

    // --- Заглушки для API-функций (реализуй позже) ---
    // Все функции возвращают промисы. Пока что они безопасны и не выполняют запросов, если APP_ID пустой.
    Q.search = function (query) {
        return new Promise(function (resolve, reject) {
            if (!APP_ID) {
                // Для теста возвращаем пустой список, чтобы не ломать UI
                resolve([]);
                return;
            }
            // Реальная реализация должна быть здесь (fetch к Qobuz API)
            // Пример: fetch(...).then(r => r.json()).then(...).catch(reject)
            resolve([]);
        });
    };

    Q.play = function (trackId) {
        return new Promise(function (resolve, reject) {
            if (!APP_ID) {
                resolve(null);
                return;
            }
            // Реальная реализация должна вернуть URL потока
            resolve(null);
        });
    };

    Q.login = function (email, password) {
        return new Promise(function (resolve, reject) {
            if (!APP_ID) {
                reject(new Error('APP_ID не задан. Установи APP_ID для работы с Qob
