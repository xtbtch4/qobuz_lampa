(function () {
    var qobuz = {};

    var APP_ID = "YOUR_QOBUZ_APP_ID";
    var USER_TOKEN = localStorage.getItem("qobuz_token") || null;

    // Основной компонент
    qobuz.component = function () {
        var html = $('<div class="qobuz-plugin">\
            <div class="qobuz-header">\
                <h2>Qobuz</h2>\
                <p>Поиск треков и альбомов</p>\
            </div>\
            <div class="qobuz-search">\
                <input type="text" placeholder="Введите запрос...">\
                <button class="qobuz-search-btn">Искать</button>\
            </div>\
            <div class="qobuz-results"></div>\
        </div>');

        var container = html.find('.qobuz-results');

        html.find('.qobuz-search-btn').on('click', function () {
            var query = html.find('input').val();
            if (!query) return;
            qobuz.search(query).then(results => {
                container.empty();
                results.forEach(item => {
                    var card = $('<div class="qobuz-item">\
                        <img src="' + item.cover + '" />\
                        <div class="title">' + item.title + '</div>\
                        <button data-id="' + item.id + '">Play</button>\
                    </div>');
                    card.find('button').on('click', function () {
                        qobuz.play(item.id).then(url => {
                            Lampa.Player.play({ title: item.title, url: url });
                        });
                    });
                    container.append(card);
                });
            });
        });

        return html;
    };

    // Поиск
    qobuz.search = function (query) {
        return fetch("https://www.qobuz.com/api.json/0.2/search?query=" + encodeURIComponent(query) + "&app_id=" + APP_ID)
            .then(r => r.json())
            .then(data => {
                var results = [];
                if (data.tracks && data.tracks.items) {
                    results = data.tracks.items.map(track => ({
                        title: track.title,
                        cover: track.album.image.large,
                        id: track.id
                    }));
                }
                return results;
            });
    };

    // Воспроизведение
    qobuz.play = function (trackId) {
        return fetch("https://www.qobuz.com/api.json/0.2/track/get?track_id=" + trackId + "&app_id=" + APP_ID + "&user_auth_token=" + USER_TOKEN)
            .then(r => r.json())
            .then(track => track.stream_url);
    };

    // Регистрация плагина в меню Lampa
    Lampa.Plugin.add({
        title: 'Qobuz',
        icon: 'music',
        component: qobuz.component,
        onStart: function () {
            console.log("Qobuz плагин загружен");
        }
    });
})();
