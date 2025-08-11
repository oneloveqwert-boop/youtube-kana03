const $ = (q) => document.querySelector(q);

const extractVideoId = (input) => {
  if (!input) return null;
  const idOnly = /^[A-Za-z0-9_-]{11}$/;
  if (idOnly.test(input.trim())) return input.trim();
  const m = input.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

const renderPlayer = (videoId) => {
  $("#player").innerHTML =
    `<iframe src="https://www.youtube.com/embed/${videoId}?cc_load_policy=1"
      allowfullscreen></iframe>`;
};

const state = {
  raw: "",
  processed: "",
  showProcessed: true
};

const renderSubs = () => {
  $("#subs").textContent = state.showProcessed ? state.processed : state.raw;
};

$("#btnLoad").addEventListener("click", async () => {
  const input = $("#url").value.trim();
  const videoId = extractVideoId(input);
  if (!videoId) {
    alert("正しいURLまたは動画IDを入力してください。");
    return;
  }
  renderPlayer(videoId);

  try {
    const r = await fetch(`/api/subtitles.js?videoId=${encodeURIComponent(videoId)}`, {
      headers: { "x-kana-mode": "phrase-underline" } // 将来拡張用
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json = await r.json();
    state.raw = json.raw || "";
    state.processed = json.text || "";
    state.showProcessed = true;
    renderSubs();
  } catch (e) {
    state.raw = "";
    state.processed = `取得エラー：${String(e)}`;
    state.showProcessed = true;
    renderSubs();
  }
});

$("#btnToggleRaw").addEventListener("click", () => {
  state.showProcessed = !state.showProcessed;
  renderSubs();
});

$("#btnCopy").addEventListener("click", async () => {
  const text = state.showProcessed ? state.processed : state.raw;
  try {
    await navigator.clipboard.writeText(text);
    alert("テキストをコピーしました。");
  } catch {
    alert("コピーに失敗しました。");
  }
});
