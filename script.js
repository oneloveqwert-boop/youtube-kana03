const $ = (q) => document.querySelector(q);

const extractVideoId = (input) => {
  if (!input) return null;
  const idOnly = /^[A-Za-z0-9_-]{11}$/;
  if (idOnly.test(input.trim())) return input.trim();
  const m = input.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

const state = { raw:"", html:"", showProcessed:true };

const renderPlayer = (videoId) => {
  $("#player").innerHTML =
    `<iframe src="https://www.youtube.com/embed/${videoId}?cc_load_policy=1" allowfullscreen></iframe>`;
};

const renderSubs = () => {
  const el = $("#subs");
  el.innerHTML = state.showProcessed ? state.html : escapeHtml(state.raw).replace(/\n/g,"<br>");
};

$("#btnLoad").addEventListener("click", async () => {
  const input = $("#url").value.trim();
  const videoId = extractVideoId(input);
  if (!videoId) { alert("正しいURLまたは動画IDを入力してください"); return; }
  renderPlayer(videoId);

  try {
    const r = await fetch(`/api/subtitles.js?videoId=${encodeURIComponent(videoId)}&lang=en`);
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "取得失敗");
    state.raw = j.raw || "";
    state.html = j.html || "";
    state.showProcessed = true;
    renderSubs();
  } catch (e) {
    state.raw = "";
    state.html = `<span style="color:#a00">エラー: ${String(e)}</span>`;
    state.showProcessed = true;
    renderSubs();
  }
});

$("#btnToggleRaw").addEventListener("click", () => {
  state.showProcessed = !state.showProcessed;
  renderSubs();
});

$("#btnCopy").addEventListener("click", async () => {
  const text = state.showProcessed
    ? (state.html.replace(/<[^>]+>/g,"")).replace(/<br\s*\/?>/gi,"\n")
    : state.raw;
  try { await navigator.clipboard.writeText(text); alert("コピーしました"); }
  catch { alert("コピー失敗"); }
});

function escapeHtml(s){
  return (s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;'}[m]));
}
