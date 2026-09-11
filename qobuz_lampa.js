(function () {
    'use strict';

    /**
     * Lampa Plugin: Qobuz
     * A music and album discovery plugin for Lampa, integrating high-res music streaming concepts
     */
    Lampa.Component.add('qobuz_component', function (object) {
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true
        });
        var html = $('<div></div>');
        var _this = this;

        // Custom function to play chosen audio stream via Lampa audio framework
        function playAudio(item) {
            Lampa.Noty.show('Воспроизведение трека: ' + item.name);

            // Standard audio layout push into Lampa.Player core
            Lampa.Player.play({
                url: item.stream_url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Sample fallback stream if preview is active
                title: item.name,
                description: item.artist || 'Qobuz Audio'
            });
        }

        this.create = function () {
            var _activity = this.activity;
            _activity.loader(true);

            this.render().append(scroll.render());
            scroll.append(html);

            // Add Search row
            var searchRow = Lampa.Component.create('line', {
                title: 'Поиск музыки на Qobuz / Qobuz Music Search'
            });

            var searchCard = Lampa.Component.create('card', {
                id: 'qobuz_search_trigger',
                name: 'Искать трек, альбом, исполнителя...',
                img: '',
                type: 'movie'
            });

            searchCard.onEnter = function () {
                Lampa.Input.edit({
                    title: 'Qobuz Поиск',
                    value: object.search_query || '',
                    free: true,
                    nosave: true
                }, function (queryValue) {
                    if (queryValue) {
                        Lampa.Activity.push({
                            component: 'qobuz_component',
                            title: 'Qobuz: ' + queryValue,
                            search_query: queryValue
                        });
                    }
                });
            };

            searchRow.append(searchCard.render());
            html.append(searchRow.render());

            // Render popular mock discovery catalog rows or actual query items
            var query = object.search_query || '';

            if (query) {
                // Simulating Qobuz Search Results
                var resultsLine = Lampa.Component.create('line', {
                    title: 'Результаты поиска для: ' + query
                });

                var mockTracks = [
                    { id: 'q1', name: query + ' - Трек 1 (Hi-Res)', artist: 'Исполнитель A', poster: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300' },
                    { id: 'q2', name: query + ' - Трек 2 (FLAC)', artist: 'Исполнитель B', poster: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300' },
                    { id: 'q3', name: query + ' - Альбом Альтернатива', artist: 'Исполнитель C', poster: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' }
                ];

                mockTracks.forEach(function (track) {
                    var card = Lampa.Component.create('card', {
                        id: track.id,
                        name: track.name,
                        img: track.poster,
                        type: 'movie'
                    });

                    card.onEnter = function () {
                        playAudio({ name: track.name, artist: track.artist });
                    };
                    resultsLine.append(card.render());
                });

                html.append(resultsLine.render());
                _activity.loader(false);
                if (_this.start) _this.start();
            } else {
                // Default Home Screen Catalogs (New Releases / Top Playlists)
                var genres = ['Новинки (Hi-Res)', 'Популярные Альбомы', 'Джаз и Блюз', 'Классическая музыка'];

                genres.forEach(function (genreName, idx) {
                    var line = Lampa.Component.create('line', {
                        title: genreName
                    });

                    for (var i = 1; i <= 5; i++) {
                        var itemData = {
                            id: 'qobuz_home_' + idx + '_' + i,
                            name: 'Релиз #' + i + ' - Альбом ' + (idx + 1),
                            img: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300',
                            type: 'movie'
                        };

                        var card = Lampa.Component.create('card', itemData);
                        card.onEnter = function () {
                            playAudio({ name: itemData.name, artist: genreName });
                        };
                        line.append(card.render());
                    }

                    html.append(line.render());
                });

                _activity.loader(false);
                if (_this.start) _this.start();
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
                right: function () {
                    if (window.Navigator && window.Navigator.move) window.Navigator.move('right');
                },
                up: function () {
                    if (window.Navigator && window.Navigator.move) window.Navigator.move('up');
                },
                down: function () {
                    if (window.Navigator && window.Navigator.move) window.Navigator.move('down');
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('qobuz_content');
        };

        this.render = function () {
            return scroll.render();
        };

        this.destroy = function () {
            scroll.destroy();
            html.remove();
        };
    });

    function startPlugin() {
        if (typeof Lampa.Menu !== 'undefined' && Lampa.Menu.add) {
            Lampa.Menu.add({
                id: 'qobuz',
                title: 'Qobuz Музыка',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-music"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>',
                section: 'main',
                onSelect: function () {
                    Lampa.Activity.push({
                        title: 'Qobuz Музыка',
                        component: 'qobuz_component',
                        page: 1
                    });
                }
            });
        }
    }

    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') startPlugin();
        });
    }
})();
