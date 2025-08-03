function loadVideo() {
  const url = document.getElementById('youtubeUrl').value;
  const playerDiv = document.getElementById('player');
  const subtitlesDiv = document.getElementById('subtitles');

  const videoId = extractVideoId(url);
  if (!videoId) {
    alert('有効なYouTube URLを入力してください');
    return;
  }

  // 動画埋め込み
  playerDiv.innerHTML = `
    <iframe width="560" height="315"
      src="https://www.youtube.com/embed/${videoId}"
      frameborder="0" allowfullscreen>
    </iframe>
  `;

  // ダミー字幕表示
  subtitlesDiv.innerHTML = `
    This is a sample subtitle.<br>
    More subtitles will appear here.
  `;
}

function extractVideoId(url) {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
