(function () {
    var qobuz = {};

    var APP_ID = "YOUR_QOBUZ_APP_ID";
    var USER_TOKEN = localStorage.getItem("qobuz_token") || null;

    // Авторизация
    function qobuzLogin(username, password) {
        return fetch("https://www.qobuz.com/api.json/0.2/user/login", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "app_id=" + APP_ID + "&username=" + encodeURIComponent(username) + "&password=" + encodeURIComponent(password)
        })
        .then(r => r.json())
        .then(data => {
            if (data.user && data.user.user_auth_token) {
                USER_TOKEN = data.user.user_auth_token;
                localStorage.setItem("qobuz_token", USER_TOKEN);
                return USER_TOKEN;
            } else {
                throw new Error("Неверный логин или пароль");
            }
        });
    }

    // Поиск треков и альбомов
    qobuz.search = function (query) {
        return fetch("https://www.qobuz.com/api.json/0.2/search?query=" + encodeURIComponent(query) + "&app_id=" + APP_ID)
            .then(r => r.json())
            .then(data => {
                var results = [];

                if (data.albums && data.albums.items) {
                    results = data.albums.items.map(album => ({
                        title: album.title,
                        cover: album.image.large,
                        id: album.id,
                        type: 'album'
                    }));
                }

                if (data.tracks && data.tracks.items) {
                    results = results.concat(data.tracks.items.map(track => ({
                        title: track.title,
                        cover: track.album.image.large,
                        id: track.id,
                        type: 'track'
                    })));
                }

                return results;
            });
    };

    // Получение треков альбома
    qobuz.getAlbumTracks = function (albumId) {
        return fetch("https://www.qobuz.com/api.json/0.2/album/get?album_id=" + albumId + "&app_id=" + APP_ID)
            .then(r => r.json())
            .then(album => album.tracks.items.map(track => ({
                title: track.title,
                id: track.id,
                cover: album.image.large
            })));
    };

    // Плейлисты
    qobuz.getPlaylists = function () {
        return fetch("https://www.qobuz.com/api.json/0.2/playlist/getUserPlaylists?user_auth_token=" + USER_TOKEN + "&app_id=" + APP_ID)
            .then(r => r.json())
            .then(data => data.playlists.items.map(pl => ({
                title: pl.name,
                id: pl.id,
                cover: pl.image.large
            })));
    };

    qobuz.getPlaylistTracks = function (playlistId) {
        return fetch("https://www.qobuz.com/api.json/0.2/playlist/get?playlist_id=" + playlistId + "&app_id=" + APP_ID + "&user_auth_token=" + USER_TOKEN)
            .then(r => r.json())
            .then(pl => pl.tracks.items.map(track => ({
                title: track.title,
                id: track.id,
                cover: track.album.image.large
            })));
    };

    // Избранное
    qobuz.getFavoriteTracks = function () {
        return fetch("https://www.qobuz.com/api.json/0.2/favorite/getUserFavorites?user_auth_token=" + USER_TOKEN + "&app_id=" + APP_ID + "&type=track")
            .then(r => r.json())
            .then(data => data.tracks.items.map(track => ({
                title: track.title,
                id: track.id,
                cover: track.album.image.large
            })));
    };

    qobuz.getFavoriteAlbums = function () {
        return fetch("https://www.qobuz.com/api.json/0.2/favorite/getUserFavorites?user_auth_token=" + USER_TOKEN + "&app_id=" + APP_ID + "&type=album")
            .then(r => r.json())
            .then(data => data.albums.items.map(album => ({
                title: album.title,
                id: album.id,
                cover: album.image.large
            })));
    };

    qobuz.addFavoriteTrack = function (trackId) {
        return fetch("https://www.qobuz.com/api.json/0.2/favorite/add", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "app_id=" + APP_ID + "&user_auth_token=" + USER_TOKEN + "&track_id=" + trackId
        }).then(r => r.json());
    };

    qobuz.removeFavoriteTrack = function (trackId) {
        return fetch("https://www.qobuz.com/api.json/0.2/favorite/delete", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "app_id=" + APP_ID + "&user_auth_token=" + USER_TOKEN + "&track_id=" + trackId
        }).then(r => r.json());
    };

    qobuz.addFavoriteAlbum = function (albumId) {
        return fetch("https://www.qobuz.com/api.json/0.2/favorite/add", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "app_id=" + APP_ID + "&user_auth_token=" + USER_TOKEN + "&album_id=" + albumId
        }).then(r => r.json());
    };

    qobuz.removeFavoriteAlbum = function (albumId) {
        return fetch("https://www.qobuz.com/api.json/0.2/favorite/delete", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "app_id=" + APP_ID + "&user_auth_token=" + USER_TOKEN + "&album_id=" + albumId
        }).then(r => r.json());
    };

    // Воспроизведение
    qobuz.play = function (trackId) {
        return fetch("https://www.qobuz.com/api.json/0.2/track/get?track_id=" + trackId + "&app_id=" + APP_ID + "&user_auth_token=" + USER_TOKEN)
            .then(r => r.json())
            .then(track => track.stream_url);
    };

    // Основной UI
    qobuz.main = function () {
        var html = $('<div class="qobuz-plugin">\
            <div class="qobuz-menu">\
                <button class="qobuz-search-btn">Поиск</button>\
                <button class="qobuz-playlists-btn">Мои плейлисты</button>\
                <button class="qobuz-fav-tracks-btn">Избранные треки</button>\
                <button class="qobuz-fav-albums-btn">Избранные альбомы</button>\
            </div>\
            <div class="qobuz-content"></div>\
        </div>');

        var container = html.find('.qobuz-content');

        // Поиск
        html.find('.qobuz-search-btn').on('click', function () {
            var query = prompt("Введите запрос:");
            if (!query) return;
            qobuz.search(query).then(results => {
                container.empty();
                results.forEach(item => {
                    var card = $('<div class="qobuz-item">\
                        <img src="' + item.cover + '" />\
                        <div class="title">' + item.title + '</div>\
                        <button data-id="' + item.id + '" data-type="' + item.type + '">Открыть</button>\
                    </div>');
                    card.find('button').on('click', function () {
                        if (item.type === 'track') {
                            qobuz.play(item.id).then(url => {
                                Lampa.Player.play({ title: item.title, url: url });
                            });
                        } else if (item.type === 'album') {
                            qobuz.getAlbumTracks(item.id).then(tracks => {
                                container.empty();
                                tracks.forEach(track => {
                                    var t = $('<div class="qobuz-track">\
                                        <div>' + track.title + '</div>\
                                        <button data-id="' + track.id + '">Play</button>\
                                        <button class="fav-btn" data-id="' + track.id + '">★</button>\
                                    </div>');
                                    t.find('button:first').on('click', function () {
                                        qobuz.play(track.id).then(url => {
                                            Lampa.Player.play({ title: track.title, url: url });
                                        });
                                    });
                                    t.find('.fav-btn').on('click', function () {
                                        qobuz.addFavoriteTrack(track.id);
                                    });
                                    container.append(t);
                                });
                            });
                        }
                    });
                    container.append(card);
                });
                
