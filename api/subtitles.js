// api/subtitles.js
const ORIGIN = process.env.CORS_ORIGIN || "*"; // 本番は自ドメインを推奨
const PREFERRED_LANGS = ["en", "en-US", "en-GB"];

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  const videoId = (req.query.videoId || "").trim();
  const userLang = (req.query.lang || "en").trim();
  const mode = (req.query.mode || "experimental").trim(); // experimental/manual/autoなど拡張用

  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: "Invalid videoId" });
  }

  try {
    // 1) トラック一覧を取得（実験的：未公開エンドポイント）
    // 利用は自己責任。商用・公開時は法務確認のうえ、ユーザー自身の動画/OAuthや手動アップロードへ誘導してください。
    const listUrl = `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(videoId)}`;
    const listRes = await fetch(listUrl, { headers: yHeaders() });
    const listXml = await listRes.text();
    const tracks = parseTrackListXML(listXml);
    if (!tracks.length) {
      return res.status(404).json({ error: "No caption tracks available", raw: "", text: "", html: "" });
    }

    // 言語選択：userLang優先→既知英語候補→先頭
    const picked =
      pickTrack(tracks, userLang, /*preferManual=*/true) ||
      pickTrack(tracks, pickFirst(PREFERRED_LANGS, tracks), true) ||
      tracks[0];

    // 2) 本文フェッチ：JSON3優先→XMLフォールバック
    let entries = [];
    // JSON3
    const json3Url = `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(picked.lang)}&fmt=json3`;
    const json3Res = await fetch(json3Url, { headers: yHeaders() });
    if (json3Res.ok) {
      const j = await json3Res.json();
      entries = fromJson3(j);
    }
    // XML fallback
    if (!entries.length) {
      const xmlUrl = `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(picked.lang)}`;
      const xmlRes = await fetch(xmlUrl, { headers: yHeaders() });
      const xml = await xmlRes.text();
      entries = fromXml(xml);
    }

    if (!entries.length) {
      return res.status(404).json({ error: "No captions content", raw: "", text: "", html: "" });
    }

    const raw = entries.map(e => e.text).join("\n");

    // 3) 難語マーキング（2語フレーズに<u>下線</u>＋（カナ）、単語は（カナ））
    const hardDict = new Set([
      "advanced","highlight","vocabulary","annotate","particularly",
      "intermediate","ephemeral","phenomena","ubiquitous","technologies",
      "perplex","audiences","sustainability","interoperability","authenticity"
    ]);

    const processedLines = entries.map(e => annotateLine(e.text, hardDict));
    const text = processedLines.join("\n");     // 括弧内カナ込み（プレーン）
    const html = processedLines.join("<br>");   // <u>を含むHTML

    // 4) CDNキャッシュ（24h）
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({
      raw, text, html,
      meta: { lang: picked.lang, kind: picked.kind, source: "timedtext", experimental: true }
    });

  } catch (err) {
    return res.status(500).json({ error: "Server error", detail: String(err) });
  }
}

// ─────────── Helpers ───────────
function yHeaders(){
  // 追加ヘッダが必要ならここで。User-Agent固定などは状況に応じて。
  return { "Accept": "*/*" };
}

function parseTrackListXML(xml){
  const tracks = [];
  // <track id="0" name="" lang_code="en" lang_original="English" lang_translated="英語" lang_default="true" kind="asr"/>
  const re = /<track\b[^>]*>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const tag = m[0];
    const lang = attr(tag, "lang_code") || "en";
    const kind = attr(tag, "kind") || ""; // "asr" が自動生成
    const name = attr(tag, "name") || "";
    tracks.push({ lang, kind, name });
  }
  return tracks;
}
function attr(tag, key){
  const m = tag.match(new RegExp(`${key}="([^"]*)"`, "i"));
  return m ? m[1] : "";
}
function pickTrack(tracks, lang, preferManual){
  if (!lang) return null;
  const cands = tracks.filter(t => t.lang.toLowerCase() === lang.toLowerCase());
  if (!cands.length) return null;
  if (preferManual){
    const manual = cands.find(t => t.kind !== "asr");
    if (manual) return { lang: manual.lang, kind: manual.kind };
  }
  return { lang: cands[0].lang, kind: cands[0].kind };
}
function pickFirst(prefList, tracks){
  const have = new Set(tracks.map(t => t.lang.toLowerCase()));
  return (prefList || []).find(l => have.has(l.toLowerCase()));
}

function fromJson3(j){
  // j.events[].segs[].utf8 / tStartMs / dDurationMs
  if (!j || !Array.isArray(j.events)) return [];
  const out = [];
  for (const ev of j.events){
    if (!ev.segs) continue;
    const text = ev.segs.map(s => s.utf8).join("").replace(/\n/g, " ").trim();
    if (!text) continue;
    out.push({ text, start: ev.tStartMs|0, dur: ev.dDurationMs|0 });
  }
  return out;
}
function fromXml(xml){
  const out = [];
  // <text start="0.1" dur="4.2">Hello &amp; world</text>
  const re = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1];
    const body = decodeEntities(m[2] || "").replace(/\n/g, " ").trim();
    if (!body) continue;
    const start = parseFloat(attr(attrs, "start") || "0") * 1000 | 0;
    const dur = parseFloat(attr(attrs, "dur") || "0") * 1000 | 0;
    out.push({ text: body, start, dur });
  }
  return out;
}
function decodeEntities(s){
  return s
    .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/&#39;/g,"'").replace(/&quot;/g,'"');
}

function annotateLine(line, hardDict){
  const tokens = line.split(/\s+/);
  const out = [];
  for (let i = 0; i < tokens.length; i++){
    const w = cleanWord(tokens[i]);
    if (!w) { out.push(tokens[i]); continue; }

    const hard = isHard(w, hardDict);
    if (hard){
      const next = cleanWord(tokens[i+1]);
      const hard2 = next && isHard(next, hardDict);
      if (hard2){
        const phrase = `${w} ${next}`;
        out.push(`${underline(phrase)}（${toKatakana(phrase)}）`);
        i += 1;
      } else {
        out.push(`${w}（${toKatakana(w)}）`);
      }
    } else {
      out.push(tokens[i]);
    }
  }
  return out.join(" ");
}
function cleanWord(t){ return (t||"").replace(/[^\w'-]/g,""); }
function isHard(w, dict){ return w.length >= 6 || dict.has(w.toLowerCase()); }
function underline(s){ return `<u>${s}</u>`; }
function toKatakana(text){
  return (text||"").toLowerCase()
    .replace(/tion\b/g,"ション").replace(/sion\b/g,"ジョン")
    .replace(/ph/g,"フ").replace(/ch/g,"チ").replace(/sh/g,"シ").replace(/th/g,"ス")
    .replace(/qu/g,"ク").replace(/ck/g,"ク").replace(/x/g,"クス")
    .replace(/eg/g,"エグ").replace(/ic\b/g,"イック")
    .replace(/a/g,"ア").replace(/e/g,"エ").replace(/i/g,"イ").replace(/o/g,"オ").replace(/u/g,"ウ")
    .replace(/\s+/g,"・")
    .toUpperCase();
}
