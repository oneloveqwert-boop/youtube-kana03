function loadVideo() {
  const url = document.getElementById('youtubeUrl').value;
  const player = document.getElementById('player');
  const videoId = extractVideoId(url);

  if (videoId) {
    player.innerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    document.getElementById('subtitles').innerText = "字幕の読み込みは今後追加予定です";
  } else {
    alert('正しいYouTubeのURLを入力してください');
  }
}

function extractVideoId(url) {
  const regex = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
