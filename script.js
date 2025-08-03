async function loadVideo() {
  const url = document.getElementById("youtubeUrl").value;
  const videoId = extractVideoId(url);
  if (!videoId) {
    alert("正しいYouTube URLを入力してください");
    return;
  }

  // 埋め込みプレーヤー表示
  document.getElementById("player").innerHTML =
    `<iframe width="560" height="315"
      src="https://www.youtube.com/embed/${videoId}?autoplay=0&cc_load_policy=1"
      frameborder="0" allowfullscreen></iframe>`;

  // サーバレス関数から字幕取得
  const res = await fetch(`/api/subtitles?videoId=${videoId}`);
  const data = await res.json();
  document.getElementById("subtitles").innerText = data.text || "字幕なし";
}

function extractVideoId(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}
