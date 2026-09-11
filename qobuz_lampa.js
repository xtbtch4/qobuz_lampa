/*!
 * Qobuz for Lampa — v0.1.0
 * Catalog/search/player shell for Lampa 3.x.
 *
 * IMPORTANT:
 * Qobuz stream URLs require valid Qobuz authentication/API access.
 * This plugin deliberately does not embed private Qobuz credentials or bypass DRM.
 */
(function () {
    'use strict';

    if (window.__qobuz_lampa_loaded) return;
    window.__qobuz_lampa_loaded = true;

    var VERSION = '0.1.0';
    var STORE = 'qobuz_lampa_settings';

    var settings = {
        apiBase: Lampa.Storage.get(STORE, {
            apiBase: 'https://www.qobuz.com/api.json/0.2',
            appId: '',
            userAuthToken: ''
        })
    };

    function save() {
        Lampa.Storage.set(STORE, settings.apiBase);
    }

    function esc(s) {
        return $('<div>').text(s == null ? '' : String(s)).html();
    }

    function request(path, data, done, fail) {
        var url = settings.apiBase.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
        var params = $.extend({}, data || {});
        if (settings.apiBase.appId) params.app_id = settings.apiBase.appId;
        if (settings.apiBase.userAuthToken) params.user_auth_token = settings.apiBase.userAuthToken;

        $.ajax({
            url: url,
            data: params,
            dataType: 'json',
            timeout: 15000,
            success: done,
            error: function (xhr) {
                if (fail) fail(xhr);
                else Lampa.Noty.show('Qobuz: ошибка запроса');
            }
        });
    }

    function img(url) {
        return url || '';
    }

    function cardTemplate(item) {
        var title = item.title || item.name || '';
        var sub = item.artist && item.artist.name ? item.artist.name : (item.subtitle || '');
        var cover = item.image || item.cover || item.image_url || '';

        return $('<div class="qobuz-card selector">' +
            '<div class="qobuz-card__cover">' +
                (cover ? '<img src="' + esc(cover) + '">' : '<div class="qobuz-card__empty">♫</div>') +
            '</div>' +
            '<div class="qobuz-card__title">' + esc(title) + '</div>' +
            '<div class="qobuz-card__sub">' + esc(sub) + '</div>' +
        '</div>');
    }

    function normalizeImage(item) {
        var u = item.image || item.cover || item.image_url;
        if (!u && item.album) u = item.album.image || item.album.cover;
        if (typeof u === 'string') return u.replace(/\{size\}/g, '600');
        return '';
    }

    function normalizeSearch(data) {
        var out = [];
        ['tracks', 'albums', 'artists'].forEach(function (key) {
            var block = data && data[key];
            var list = block && (block.items || block);
            if (!Array.isArray(list)) return;
            list.forEach(function (x) {
                x.image = normalizeImage(x);
                x.__type = key.slice(0, -1);
                out.push(x);
            });
        });
        return out;
    }

    function QobuzHome(object) {
        var self = this;
        var activity = $('<div class="qobuz-page qobuz-home"></div>');
        var search = $('<div class="qobuz-search"><input class="qobuz-input" placeholder="Поиск Qobuz..."><button class="qobuz-button selector">Найти</button></div>');
        var content = $('<div class="qobuz-content"></div>');
        var input = search.find('input');

        this.create = function () {
            activity.append(search, content);
            object.activity.append(activity);

            search.find('button').on('click', function () {
                self.search(input.val());
            });

            input.on('keydown', function (e) {
                if (e.keyCode === 13) self.search(input.val());
            });

            self.render();
        };

        this.render = function () {
            content.html(
                '<div class="qobuz-title">Qobuz</div>' +
                '<div class="qobuz-hint">Поиск альбомов, исполнителей и треков</div>'
            );
        };

        this.search = function (query) {
            query = String(query || '').trim();
            if (!query) return;

            content.html('<div class="qobuz-loading">Поиск…</div>');

            request('search', {
                query: query,
                limit: 50,
                offset: 0
            }, function (data) {
                self.showResults(normalizeSearch(data));
            }, function () {
                content.html('<div class="qobuz-error">Не удалось выполнить поиск.</div>');
            });
        };

        this.showResults = function (items) {
            content.empty();

            if (!items.length) {
                content.html('<div class="qobuz-error">Ничего не найдено.</div>');
                return;
            }

            var grid = $('<div class="qobuz-grid"></div>');
            items.forEach(function (item) {
                var card = cardTemplate(item);
                card.on('click', function () {
                    if (item.__type === 'album') self.album(item);
                    else if (item.__type === 'artist') self.artist(item);
                    else self.track(item);
                });
                grid.append(card);
            });
            content.append(grid);
        };

        this.album = function (item) {
            var id = item.id;
            content.html('<div class="qobuz-loading">Загрузка альбома…</div>');

            request('album/get', { album_id: id }, function (data) {
                var album = data;
                var tracks = album.tracks && (album.tracks.items || album.tracks) || [];

                var html = '<div class="qobuz-detail">' +
                    '<div class="qobuz-detail__head">' +
                    '<img src="' + esc(normalizeImage(album)) + '">' +
                    '<div><h2>' + esc(album.title) + '</h2>' +
                    '<div>' + esc(album.artist && album.artist.name || '') + '</div></div>' +
                    '</div><div class="qobuz-tracks"></div></div>';

                content.html(html);
                var list = content.find('.qobuz-tracks');

                tracks.forEach(function (track, i) {
                    var row = $('<div class="qobuz-track selector">' +
                        '<span class="qobuz-track__num">' + (i + 1) + '</span>' +
                        '<span class="qobuz-track__title">' + esc(track.title) + '</span>' +
                        '<span class="qobuz-track__duration">' + formatDuration(track.duration) + '</span>' +
                    '</div>');

                    row.on('click', function () {
                        self.track($.extend({}, track, {
                            album: album,
                            image: normalizeImage(album)
                        }));
                    });

                    list.append(row);
                });
            });
        };

        this.artist = function (item) {
            content.html('<div class="qobuz-loading">Загрузка исполнителя…</div>');
            request('artist/get', { artist_id: item.id }, function (data) {
                var albums = data.albums && (data.albums.items || data.albums) || [];
                var grid = $('<div class="qobuz-grid"></div>');
                content.html('<div class="qobuz-title">' + esc(data.name || item.name) + '</div>').append(grid);
                albums.forEach(function (album) {
                    album.image = normalizeImage(album);
                    var card = cardTemplate(album);
                    card.on('click', function () { self.album(album); });
                    grid.append(card);
                });
            });
        };

        this.track = function (track) {
            var title = track.title || '';
            var artist = track.artist && track.artist.name || '';
            var album = track.album && track.album.title || '';

            // Qobuz does not expose a universally usable public stream endpoint
            // without valid account/app authentication. Try track/getFileUrl only
            // when the user has configured app_id + user_auth_token.
            if (!settings.apiBase.appId || !settings.apiBase.userAuthToken) {
                Lampa.Modal.open({
                    title: 'Qobuz',
                    html: '<div style="padding:1em">' +
                        '<p><b>' + esc(title) + '</b></p>' +
                        '<p>Для воспроизведения настройте Qobuz App ID и User Auth Token в настройках плагина.</p>' +
                        '<p>Каталог и поиск могут работать без этих параметров только если используемый API endpoint разрешает это.</p>' +
                        '</div>',
                    buttons: [
                        { title: 'Настройки', onSelect: function () { self.settings(); } },
                        { title: 'Закрыть' }
                    ]
                });
                return;
            }

            request('track/getFileUrl', {
                track_id: track.id,
                format_id: 27
            }, function (data) {
                if (!data || !data.url) {
                    Lampa.Noty.show('Qobuz: URL потока не получен');
                    return;
                }

                Lampa.Player.play({
                    url: data.url,
                    title: title,
                    quality: 'auto',
                    playlist: [{
                        url: data.url,
                        title: title,
                        artist: artist,
                        album: album
                    }]
                });
            });
        };

        this.settings = function () {
            Lampa.Modal.open({
                title: 'Qobuz — настройки',
                html: '<div class="qobuz-settings">' +
                    '<input class="qobuz-input qobuz-appid" placeholder="Qobuz App ID" value="' + esc(settings.apiBase.appId || '') + '">' +
                    '<input class="qobuz-input qobuz-token" placeholder="User Auth Token" value="' + esc(settings.apiBase.userAuthToken || '') + '">' +
                    '</div>',
                buttons: [{
                    title: 'Сохранить',
                    onSelect: function (modal) {
                        var root = $(modal);
                        settings.apiBase.appId = root.find('.qobuz-appid').val().trim();
                        settings.apiBase.userAuthToken = root.find('.qobuz-token').val().trim();
                        save();
                        Lampa.Noty.show('Qobuz: сохранено');
                    }
                }, { title: 'Отмена' }]
            });
        };

        this.back = function () {
            Lampa.Activity.backward();
        };

        this.destroy = function () {
            activity.remove();
        };

        this.start = this.create;
    }

    function formatDuration(sec) {
        sec = parseInt(sec || 0, 10);
        if (!sec) return '';
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function addStyles() {
        if ($('#qobuz-lampa-style').length) return;

        $('<style id="qobuz-lampa-style">' +
            '.qobuz-page{padding:2em;box-sizing:border-box;min-height:100%;font-family:inherit}' +
            '.qobuz-search{display:flex;gap:1em;margin-bottom:2em}' +
            '.qobuz-input{background:#292b2c;color:#fff;border:1px solid #555;border-radius:.4em;padding:.8em 1em;font-size:1.1em;outline:none;box-sizing:border-box}' +
            '.qobuz-search .qobuz-input{flex:1}' +
            '.qobuz-button{border:0;border-radius:.4em;padding:.8em 1.5em;background:#fff;color:#111;font-weight:bold}' +
            '.qobuz-title{font-size:2em;font-weight:bold;margin-bottom:.4em}' +
            '.qobuz-hint{opacity:.6;margin-bottom:2em}' +
            '.qobuz-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(10em,1fr));gap:1.2em}' +
            '.qobuz-card{min-width:0;cursor:pointer}' +
            '.qobuz-card__cover{aspect-ratio:1/1;background:#292b2c;border-radius:.5em;overflow:hidden}' +
            '.qobuz-card__cover img{width:100%;height:100%;object-fit:cover}' +
            '.qobuz-card__empty{height:100%;display:flex;align-items:center;justify-content:center;font-size:3em;opacity:.4}' +
            '.qobuz-card__title{font-weight:bold;margin-top:.6em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
            '.qobuz-card__sub{opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:.25em}' +
            '.qobuz-detail__head{display:flex;gap:2em;align-items:center;margin-bottom:2em}' +
            '.qobuz-detail__head img{width:12em;height:12em;object-fit:cover;border-radius:.5em}' +
            '.qobuz-detail__head h2{font-size:2em;margin:0 0 .5em}' +
            '.qobuz-track{display:flex;gap:1em;padding:1em;border-radius:.4em;cursor:pointer}' +
            '.qobuz-track:hover,.qobuz-track.focus{background:#292b2c}' +
            '.qobuz-track__num{width:2em;opacity:.5}.qobuz-track__title{flex:1}.qobuz-track__duration{opacity:.5}' +
            '.qobuz-loading,.qobuz-error{padding:3em;text-align:center;opacity:.7}' +
            '.qobuz-settings{display:flex;flex-direction:column;gap:1em;padding:1em}' +
        '</style>').appendTo('head');
    }

    function register() {
        if (!window.Lampa) return;

        addStyles();

        if (Lampa.Component && Lampa.Component.add) {
            Lampa.Component.add('qobuz_lampa', QobuzHome);
        }

        // Lampa 3.x menu API.
        if (Lampa.Menu && Lampa.Menu.addButton) {
            Lampa.Menu.addButton(
                '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3v10.2a3.5 3.5 0 1 0 2 3.15V8h5V3h-7z"/></svg>',
                'Qobuz',
                function () {
                    Lampa.Activity.push({
                        url: '',
                        title: 'Qobuz',
                        component: 'qobuz_lampa'
                    });
                }
            );
        }

        console.log('[Qobuz Lampa] loaded v' + VERSION);
    }

    if (window.Lampa) register();
    else {
        var timer = setInterval(function () {
            if (window.Lampa) {
                clearInterval(timer);
                register();
            }
        }, 100);
    }
})();
