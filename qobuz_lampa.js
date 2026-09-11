(function () {
    'use strict';

    /**
     * Lampa Plugin: Qobuz Player (Based on QobuzDownloaderX Architecture)
     * Reverses Qobuz Web Player API v0.2 to stream high-quality audio directly in Lampa
     */
    Lampa.Component.add('qobuz_component', function (object) {
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true
        });
        var html = $('<div></div>');
        var _this = this;

        // Official Qobuz Web Player API v0.2 Credentials used in QBDLX
        var api_url = 'https://www.qobuz.com/api.json/0.2/';
        var app_id = '798273057';
        var app_secret = '684cb3a778c187e10887dfdf9fdf83f2';

        // User Auth Token placeholder (Will be populated or requested on login)
        var user_auth_token = window.localStorage.getItem('qobuz_user_token') || '';

        /**
         * Helper to request signed endpoints from Qobuz API v0.2
         */
        function qobuzRequest(method, params, success, error) {
            params['app_id'] = app_id;
            if (user_auth_token) {
                params['user_auth_token'] = user_auth_token;
            }

            // Generate request signature (request_sig) based on QBDLX MD5 algorithm
            // Signature = md5(method + sorted_params_keys_values + timestamp + app_secret)
            var ts = Math.floor(Date.now() / 1000);
            params['request_ts'] = ts;

            var cleanKeys = [];
            for (var k in params) {
                if (k !== 'app_id' && k !== 'user_auth_token') {
                    cleanKeys.push(k);
                }
            }
            cleanKeys.sort();

            var sigString = method.replace(/\//g, '');
            for (var i = 0; i < cleanKeys.length; i++) {
                sigString += cleanKeys[i] + params[cleanKeys[i]];
            }
            sigString += ts + app_secret;

            var request_sig = md5(sigString);
            params['request_sig'] = request_sig;

            var queryParts = [];
            for (var key in params) {
                queryParts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
            }
            var full_url = api_url + method + '?' + queryParts.join('&');

            Lampa.Network.native(full_url, success, error, false, { dataType: 'json' });
        }

        // Lightweight MD5 hash generator inline implementation for signature calculations
        function md5(string) {
            function RotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); }
            function AddUnsigned(lX, lY) {
                var lX4, lY4, lX8, lY8, lXResult, lYResult;
                lX8 = (lX & 0x80000000); lY8 = (lY & 0x80000000);
                lX4 = (lX & 0x40000000); lY4 = (lY & 0x40000000);
                lXResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
                if (lX4 & lY4) return (lXResult ^ 0x80000000 ^ lX8 ^ lY8);
                if (lX4 | lY4) {
                    if (lXResult & 0x40000000) return (lXResult ^ 0xC0000000 ^ lX8 ^ lY8);
                    else return (lXResult ^ 0x40000000 ^ lX8 ^ lY8);
                } else return (lXResult ^ lX8 ^ lY8);
            }
            function F(x, y, z) { return (x & y) | ((~x) & z); }
            function G(x, y, z) { return (x & z) | (y & (~z)); }
            function H(x, y, z) { return (x ^ y ^ z); }
            function I(x, y, z) { return (y ^ (x | (~z))); }
            function FF(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); };
            function GG(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); };
            function HH(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); };
            function II(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); };
            
            var x = Array(); var k, AA, BB, CC, DD, a, b, c, d;
            var S11 = 7, S12 = 12, S13 = 17, S14 = 22; var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
            var S31 = 4, S32 = 11, S33 = 16, S34 = 23; var S41 = 6, S42 = 10, S43 = 15, S44 = 21;
            
            string = unescape(encodeURIComponent(string));
            var nLen = string.length; var nWordsCount = ((nLen + 8) >> 6) + 1; var x = Array(nWordsCount * 16);
            for ( k = 0; k < nWordsCount * 16; k++) x[k] = 0;
            for ( k = 0; k < nLen; k++) x[k >> 2] |= string.charCodeAt(k) << ((k % 4) * 8);
            x[k >> 2] |= 0x80 << ((k % 4) * 8); x[nWordsCount * 16 - 2] = nLen * 8;
            
            AA = 0x67452301; BB = 0xEFCDAB89; CC = 0x98BADCFE; DD = 0x10325476;
            a = AA; b = BB; c = CC; d = DD;
            
            for (k = 0; k < x.length; k += 16) {
                AA = a; BB = b; CC = c; DD = d;
                a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478); d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756); c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB); b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
                a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF); d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A); c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613); b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
                a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8); d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF); c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1); b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
                a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122); d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193); c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E); b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
                a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562); d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340); c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51); b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
                a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D); d = GG(d, a, b, c, x[k + 10], S22, 0x2441453); c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681); b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
                a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6); d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6); c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87); b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
                a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905); d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8); c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9); b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
                a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942); d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681); c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122); b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
                a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44); d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9); c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60); b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
                a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6); d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA); c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085); b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
                a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039); d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5); c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8); b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
                a = II(a, b, c, d, x[k + 0], S41, 0xF4292244); d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97); c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7); b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
                a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3); d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92); c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D); b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
                a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F); d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0); c = II(c, d, a, b, x[k + 6], S43, 0xA3014314); b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
                a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82); d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235); c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB); b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
                a = AddUnsigned(a, AA); b = AddUnsigned(b, BB); c = AddUnsigned(c, CC); d = AddUnsigned(d, DD);
            }
            var temp = Array(a, b, c, d); var sOutput = '';
            for (var m = 0; m < temp.length; m++) {
                for (var n = 0; n < 4; n++) {
                    var byteVal = (temp[m] >>> (n * 8)) & 255;
                    sOutput += (byteVal < 16 ? '0' : '') + byteVal.toString(16);
                }
            }
            return sOutput;
        }

        /**
         * Resolves the actual playable direct music audio link using track/getFileUrl endpoint
         */
        function fetchAndPlay(item) {
            Lampa.Loading.show();
            var params = {
                'track_id': item.id,
                'format_id': '27'
            };

            qobuzRequest('track/getFileUrl', params, function (res) {
                Lampa.Loading.hide();
                if (res && res.url) {
                    Lampa.Player.play({
                        url: res.url,
                        title: item.name,
                        description: item.artist || 'Qobuz Audio Premium'
                    });
                } else {
                    Lampa.Noty.show('Qobuz: Ссылка не найдена (Требуется подписка)');
                }
            }, function () {
                Lampa.Loading.hide();
                Lampa.Noty.show('Qobuz: Ошибка авторизации потока');
            });
        }

        this.create = function () {
            var _activity = this.activity;
            _activity.loader(true);

            this.render().append(scroll.render());
            scroll.append(html);

            // Add Search row
            var searchRow = Lampa.Component.create('line', { title: 'QobuzDownloaderX — Поиск музыки' });
            var searchCard = Lampa.Component.create('card', { id: 'qobuz_search', name: 'Искать на Qobuz...', img: '', type: 'movie' });
            
            searchCard.onEnter = function () {
                Lampa.Input.edit({ title: 'Поиск треков и альбомов', value: '', free: true, nosave: true }, function (query) {
                    if (query) {
                        Lampa.Activity.push({
                            component: 'qobuz_component',
                            title: 'Qobuz: ' + query,
                            search_query: query
                        });
                    }
                });
            };
            searchRow.append(searchCard.render());
            html.append(searchRow.render());

            var searchQuery = object.search_query || '';

            if (searchQuery) {
                qobuzRequest('catalog/search', { 'query': searchQuery, 'limit': '20' }, function (res) {
                    if (res && res.tracks && res.tracks.items && res.tracks.items.length > 0) {
                        var line = Lampa.Component.create('line', { title: 'Результаты поиска: ' + searchQuery });

                        res.tracks.items.forEach(function (track) {
                            var cardData = {
                                id: track.id,
                                name: track.title,
                                artist: track.artist ? track.artist.name : 'Unknown Artist',
                                img: track.album && track.album.image ? track.album.image.thumbnail : ''
                            };

                            var card = Lampa.Component.create('card', {
                                id: cardData.id,
                                name: cardData.name + ' - ' + cardData.artist,
                                img: cardData.img,
                                type: 'movie'
                            });

                            card.onEnter = function () {
                                fetchAndPlay(cardData);
                            };
                            line.append(card.render());
                        });

                        html.append(line.render());
                    } else {
                        Lampa.Noty.show('Qobuz: Ничего не найдено');
                    }
                    _activity.loader(false);
                    if (_this.start) _this.start();
                }, function () {
                    Lampa.Noty.show('Qobuz: Ошибка соединения с API');
                    _activity.loader(false);
                    if (_this.start) _this.start();
                });
            } else {
                qobuzRequest('album/getFeatured', { 'type': 'new-releases', 'limit': '15' }, function (res) {
                    if (res && res.albums && res.albums.items) {
                        var line = Lampa.Component.create('line', { title: 'Qobuz: Новые Релизы (Hi-Res)' });

                        res.albums.items.forEach(function (album) {
                            var card = Lampa.Component.create('card', {
                                id: album.id,
                                name: album.title + ' - ' + (album.artist ? album.artist.name : ''),
                                img: album.image ? album.image.thumbnail : '',
                                type: 'movie'
                            });

                            card.onEnter = function () {
                                Lampa.Noty.show('Загрузка треков альбома...');
                                qobuzRequest('album/get', { 'album_id': album.id }, function (albumRes) {
                                    if (albumRes && albumRes.tracks && albumRes.tracks.items) {
                                        var items = albumRes.tracks.items.map(function(t) {
                                            return {
                                                title: t.title,
                                                id: t.id,
                                                artist: t.artist ? t.artist.name : ''
                                            };
                                        });

                                        Lampa.Select.show({
                                            title: album.title,
                                            items: items,
                                            onSelect: function(selectedTrack) {
                                                fetchAndPlay({ id: selectedTrack.id, name: selectedTrack.title, artist: selectedTrack.artist });
                                            },
                                            onBack: function() {
                                                Lampa.Controller.toggle('qobuz_content');
                                            }
                                        });
                                    }
                                });
                            };
                            line.append(card.render());
                        });
                        html.append(line.render());
                    }
                    _activity.loader(false);
                    if (_this.start) _this.start();
                }, function () {
                    _activity.loader(false);
                    if (_this.start) _this.start();
                });
            }
        };

        this.start = function () {
            Lampa.Controller.add('qobuz_content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                left: function () {
                    if (window.Navigator && window.Navigator.canmove && window.Navigator.canmove('left')) {
                        window.Navigator.move('left');
                    } else {
                        Lampa.Controller.toggle('menu');
                    }
                },
                right: function () { if (window.Navigator && window.Navigator.move) window.Navigator.move('right'); },
                up: function () { if (window.Navigator && window.Navigator.move) window.Navigator.move('up'); },
                down: function () { if (window.Navigator && window.Navigator.move) window.Navigator.move('down'); },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('qobuz_content');
        };

        this.render = function () { return scroll.render(); };
        this.destroy = function () { scroll.destroy(); html.remove(); };
    });

    function startPlugin() {
        if (typeof Lampa.Menu !== 'undefined' && Lampa.Menu.add) {
            Lampa.Menu.add({
                id: 'qobuz',
                title: 'Qobuz Premium',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-music"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>',
                section: 'main',
                onSelect: function () {
                    Lampa.Activity.push({
                        title: 'Qobuz Premium',
                        component: 'qobuz_component',
                        page: 1
                    });
                }
            });
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
