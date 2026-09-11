/*!
 * Qobuz for Lampa — v0.1.1
 * Compatible with Lampa 3.x
 */
(function () {
    'use strict';

    if (window.qobuz_lampa_plugin) return;
    window.qobuz_lampa_plugin = true;

    var manifest = {
        type: 'audio',
        version: '0.1.1',
        name: 'Qobuz',
        description: 'Qobuz: поиск альбомов, исполнителей и треков',
        component: 'qobuz_lampa'
    };

    var STORAGE = 'qobuz_lampa_settings';
    var defaults = {
        apiBase: 'https://www.qobuz.com/api.json/0.2',
        appId: '',
        userAuthToken: ''
    };

    function getSettings() {
        var s = Lampa.Storage.get(STORAGE, {});
        return $.extend({}, defaults, s || {});
    }

    function saveSettings(s) {
        Lampa.Storage.set(STORAGE, s);
    }

    function esc(v) {
        return $('<div>').text(v == null ? '' : String(v)).html();
    }

    function cover(v) {
        if (!v) return '';
        return String(v).replace(/\{size\}/g, '600');
    }

    function duration(sec) {
        sec = parseInt(sec || 0, 10);
        if (!sec) return '';
        return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    }

    function registerManifest() {
        try {
            Lampa.Manifest = Lampa.Manifest || {};
            Lampa.Manifest.plugins = manifest;
        } catch (e) {
            console.log('[Qobuz] manifest error', e);
        }
    }

    function style() {
        if ($('#qobuz-lampa-css').length) return;

        $('<style id="qobuz-lampa-css">' +
            '.qobuz-page{padding:2em;box-sizing:border-box;min-height:100%;}' +
            '.qobuz-search{display:flex;gap:1em;margin-bottom:2em;}' +
            '.qobuz-input{width:100%;box-sizing:border-box;padding:.8em 1em;border:0;border-radius:.5em;background:rgba(255,255,255,.1);color:inherit;font-size:1em;outline:0;}' +
            '.qobuz-search .qobuz-input{flex:1;}' +
            '.qobuz-btn{padding:.8em 1.4em;border-radius:.5em;background:rgba(255,255,255,.12);cursor:pointer;}' +
            '.qobuz-title{font-size:2em;font-weight:bold;margin-bottom:1em;}' +
            '.qobuz-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(11em,1fr));gap:1.2em;}' +
            '.qobuz-card{min-width:0;}' +
            '.qobuz-cover{width:100%;aspect-ratio:1;background:rgba(255,255,255,.08);border-radius:.5em;overflow:hidden;}' +
            '.qobuz-cover img{width:100%;height:100%;object-fit:cover;display:block;}' +
            '.qobuz-name{font-weight:bold;margin-top:.55em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
            '.qobuz-sub{opacity:.6;margin-top:.2em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
            '.qobuz-row{display:flex;align-items:center;gap:1em;padding:.9em;border-radius:.4em;}' +
            '.qobuz-row.focus,.qobuz-row:hover{background:rgba(255,255,255,.1);}' +
            '.qobuz-num{width:2em;opacity:.5;text-align:center;}' +
            '.qobuz-track{flex:1;}.qobuz-time{opacity:.5;}' +
            '.qobuz-head{display:flex;gap:2em;align-items:center;margin-bottom:2em;}' +
            '.qobuz-head img{width:12em;height:12em;object-fit:cover;border-radius:.5em;}' +
            '.qobuz-head h2{margin:0 0 .5em;font-size:2em;}' +
            '.qobuz-message{padding:3em;text-align:center;opacity:.7;}' +
        '</style>').appendTo('head');
    }

    function api(path, data, success, error) {
        var s = getSettings();
        var url = s.apiBase.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
        var params = $.extend({}, data || {});

        if (s.appId) params.app_id = s.appId;
        if (s.userAuthToken) params.user_auth_token = s.userAuthToken;

        $.ajax({
            url: url,
            data: params,
            dataType: 'json',
            timeout: 20000,
            success: success,
            error: error || function () {
                Lampa.Noty.show('Qobuz: ошибка запроса');
            }
        });
    }

    function imageOf(x) {
        return cover(
            x.image ||
            x.image_url ||
            x.cover ||
            (x.album && (x.album.image || x.album.image_url || x.album.cover)) ||
            ''
        );
    }

    function SearchComponent(object) {
        var self = this;
        var root = $('<div class="qobuz-page"></div>');
        var input = $('<input class="qobuz-input" placeholder="Поиск Qobuz...">');
        var button = $('<div class="qobuz-btn selector">Найти</div>');
        var search = $('<div class="qobuz-search"></div>').append(input, button);
        var body = $('<div></div>');

        this.create = function () {
            root.append(search, body);
            object.activity.append(root);

            button.on('hover:enter click', function () {
                self.find(input.val());
            });

            input.on('keydown', function (e) {
                if (e.keyCode === 13) self.find(input.val());
            });

            setTimeout(function () {
                try { input.focus(); } catch (e) {}
            }, 100);

            this.start();
        };

        this.start = function () {
            body.html(
                '<div class="qobuz-title">Qobuz</div>' +
                '<div class="qobuz-message">Введите название исполнителя, альбома или трека.</div>'
            );
        };

        this.find = function (q) {
            q = String(q || '').trim();
            if (!q) return;

            body.html('<div class="qobuz-message">Поиск…</div>');

            api('search', { query: q, limit: 50, offset: 0 }, function (data) {
                self.results(data);
            });
        };

        this.results = function (data) {
            body.empty();

            var sections = [
                {key:'albums', title:'Альбомы'},
                {key:'artists', title:'Исполнители'},
                {key:'tracks', title:'Треки'}
            ];

            var found = false;

            sections.forEach(function (section) {
                var block = data && data[section.key];
                var items = block && (block.items || block);
                if (!Array.isArray(items) || !items.length) return;

                found = true;
                body.append('<div class="qobuz-title">' + section.title + '</div>');

                var grid = $('<div class="qobuz-grid"></div>');

                items.forEach(function (item) {
                    var c = $('<div class="qobuz-card selector">' +
                        '<div class="qobuz-cover">' +
                        (imageOf(item) ? '<img src="' + esc(imageOf(item)) + '">' : '') +
                        '</div>' +
                        '<div class="qobuz-name">' + esc(item.title || item.name || '') + '</div>' +
                        '<div class="qobuz-sub">' +
                        esc(item.artist && item.artist.name || '') +
                        '</div></div>');

                    c.on('hover:enter click', function () {
                        if (section.key === 'albums') self.album(item);
                        else if (section.key === 'artists') self.artist(item);
                        else self.play(item);
                    });

                    grid.append(c);
                });

                body.append(grid);
            });

            if (!found) body.html('<div class="qobuz-message">Ничего не найдено.</div>');
        };

        this.album = function (item) {
            body.html('<div class="qobuz-message">Загрузка альбома…</div>');

            api('album/get', {album_id:item.id}, function (album) {
                body.empty();

                var head = $('<div class="qobuz-head">' +
                    (imageOf(album) ? '<img src="' + esc(imageOf(album)) + '">' : '') +
                    '<div><h2>' + esc(album.title || '') + '</h2>' +
                    '<div>' + esc(album.artist && album.artist.name || '') + '</div></div>' +
                    '</div>');
                body.append(head);

                var tracks = album.tracks && (album.tracks.items || album.tracks) || [];
                tracks.forEach(function (track, i) {
                    var row = $('<div class="qobuz-row selector">' +
                        '<div class="qobuz-num">' + (i + 1) + '</div>' +
                        '<div class="qobuz-track">' + esc(track.title || '') + '</div>' +
                        '<div class="qobuz-time">' + duration(track.duration) + '</div>' +
                        '</div>');

                    row.on('hover:enter click', function () {
                        self.play($.extend({}, track, {album:album}));
                    });

                    body.append(row);
                });
            });
        };

        this.artist = function (item) {
            body.html('<div class="qobuz-message">Загрузка исполнителя…</div>');

            api('artist/get', {artist_id:item.id}, function (artist) {
                body.empty();
                body.append('<div class="qobuz-title">' + esc(artist.name || item.name) + '</div>');

                var albums = artist.albums && (artist.albums.items || artist.albums) || [];
                var grid = $('<div class="qobuz-grid"></div>');

                albums.forEach(function (album) {
                    var c = $('<div class="qobuz-card selector">' +
                        '<div class="qobuz-cover">' +
                        (imageOf(album) ? '<img src="' + esc(imageOf(album)) + '">' : '') +
                        '</div>' +
                        '<div class="qobuz-name">' + esc(album.title || '') + '</div>' +
                        '</div>');

                    c.on('hover:enter click', function () {
                        self.album(album);
                    });

                    grid.append(c);
                });

                body.append(grid);
            });
        };

        this.play = function (track) {
            var s = getSettings();

            if (!s.appId || !s.userAuthToken) {
                Lampa.Modal.open({
                    title: 'Qobuz',
                    html:'<div style="padding:1.5em">' +
                        '<p><b>' + esc(track.title || '') + '</b></p>' +
                        '<p>Для получения потока Qobuz нужны App ID и User Auth Token.</p>' +
                        '</div>',
                    buttons:[
                        {title:'Закрыть'}
                    ]
                });
                return;
            }

            api('track/getFileUrl', {
                track_id:track.id,
                format_id:27
            }, function (data) {
                if (!data || !data.url) {
                    Lampa.Noty.show('Qobuz: поток не получен');
                    return;
                }

                Lampa.Player.play({
                    url:data.url,
                    title:track.title || '',
                    quality:'auto'
                });
            });
        };

        this.back = function () {
            Lampa.Activity.backward();
        };

        this.destroy = function () {
            root.remove();
        };
    }

    function addMenu() {
        if (window.qobuz_lampa_menu_added) return;
        window.qobuz_lampa_menu_added = true;

        var svg = '<svg width="24" height="24" viewBox="0 0 24 24">' +
            '<path fill="currentColor" d="M12 3v10.2a3.5 3.5 0 1 0 2 3.15V8h5V3h-7z"/>' +
            '</svg>';

        try {
            if (Lampa.Menu && Lampa.Menu.addButton) {
                var b = Lampa.Menu.addButton(svg, 'Qobuz', function () {
                    openQobuz();
                });

                if (b && b.addClass) b.addClass('qobuz-menu-button');
                console.log('[Qobuz] menu button added');
                return;
            }
        } catch (e) {
            console.log('[Qobuz] addButton error', e);
        }

        try {
            if (Lampa.Menu && Lampa.Menu.addaddElement) {
                var el = document.createElement('div');
                el.className = 'menu__item selector qobuz-menu-button';
                el.innerHTML = '<span class="menu__ico">' + svg + '</span><span class="menu__text">Qobuz</span>';
                Lampa.Menu.addaddElement(el, openQobuz);
                console.log('[Qobuz] menu element added');
            }
        } catch (e) {
            console.log('[Qobuz] addaddElement error', e);
        }
    }

    function openQobuz() {
        Lampa.Activity.push({
            url:'',
            title:'Qobuz',
            component:'qobuz_lampa',
            page:1
        });
    }

    function start() {
        if (window.qobuz_lampa_started) return;
        window.qobuz_lampa_started = true;

        try {
            style();
            registerManifest();
            Lampa.Component.add('qobuz_lampa', SearchComponent);
            addMenu();
            console.log('[Qobuz] started 0.1.1');
        } catch (e) {
            console.error('[Qobuz] start error', e);
            if (Lampa.Noty) Lampa.Noty.show('Qobuz: ошибка загрузки');
        }
    }

    function bootstrap() {
        if (typeof Lampa === 'undefined') {
            setTimeout(bootstrap, 250);
            return;
        }

        if (window.appready) {
            start();
            return;
        }

        if (Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') start();
            });

            setTimeout(function () {
                if (window.appready) start();
            }, 1500);
        } else {
            setTimeout(start, 1000);
        }
    }

    bootstrap();
})();
