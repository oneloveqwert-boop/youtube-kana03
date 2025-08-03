let player;

// YouTube iframe API をロード
function loadVideo() {
  const url = document.getElementById('youtubeUrl').value;
  const videoId = extractVideoID(url);
  if (!videoId) {
    alert("正しい YouTube URL を入力してください");
    return;
  }

  if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => createPlayer(videoId);
  } else {
    createPlayer(videoId);
  }

  fetch(`/api/subtitles?videoId=${videoId}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById("subtitles").textContent = data.subtitles || "字幕が取得できませんでした。";
    });
}

function createPlayer(videoId) {
  if (player) player.destroy();
  player = new YT.Player('player', {
    height: '315',
    width: '560',
    videoId: videoId
  });
}

function extractVideoID(url) {
  const reg = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(reg);
  return match ? match[1] : null;
}
