// Vercel Serverless Function
export default async function handler(req, res) {
  const { videoId } = req.query;
  if (!videoId) {
    return res.status(400).json({ error: "videoId required" });
  }

  // ── ここは試作：固定の英語字幕を「難しめ語だけカタカナ」化 ──
  const dummy = [
    "Welcome to this demonstration of advanced caption processing.",
    "We will highlight challenging vocabulary and annotate it in Katakana.",
    "This approach is particularly helpful for intermediate learners.",
    "Ephemeral phenomena and ubiquitous technologies often perplex audiences.",
    "Sustainability, interoperability, and authenticity matter."
  ];

  const raw = dummy.join("\n");

  // 難易度判定：6文字以上 or 辞書該当
  const hardDict = new Set([
    "advanced","highlight","vocabulary","annotate","particularly",
    "intermediate","ephemeral","phenomena","ubiquitous","technologies",
    "perplex","audiences","sustainability","interoperability","authenticity"
  ]);

  const processed = dummy
    .map(line => annotateLine(line))
    .join("\n");

  return res.status(200).json({ raw, text: processed });

  function annotateLine(line){
    const tokens = line.split(/\s+/);
    const out = [];
    for (let i = 0; i < tokens.length; i++){
      const w = tokens[i];
      const plain = w.replace(/[^\w'-]/g,""); // 単語抽出
      const isHard = plain.length >= 6 || hardDict.has(plain.toLowerCase());

      if (isHard){
        // 2語以上の短いフレーズ候補（例：二単語）
        const next = tokens[i+1]?.replace(/[^\w'-]/g,"") || "";
        const phraseTwo = next && (next.length >= 6 || hardDict.has(next.toLowerCase()));

        if (phraseTwo){
          const phrase = `${plain} ${next}`;
          out.push(`${underline(phrase)}（${toKatakana(phrase)}）`);
          i += 1; // 2語消費
        } else {
          out.push(`${plain}（${toKatakana(plain)}）`);
        }
      } else {
        out.push(w);
      }
    }
    return out.join(" ");
  }

  function underline(s){ return `<u>${s}</u>`; }

  // 超簡易のローマ字→カタカナ近似（厳密ではないが雰囲気重視）
  function toKatakana(text){
    return text
      .toLowerCase()
      // 子音+母音の粗い置換（順序が重要）
      .replace(/tion\b/g,"ション").replace(/sion\b/g,"ジョン")
      .replace(/ph/g,"フ").replace(/ch/g,"チ").replace(/sh/g,"シ").replace(/th/g,"ス")
      .replace(/qu/g,"ク").replace(/ck/g,"ク").replace(/x/g,"クス")
      .replace(/eg/g,"エグ").replace(/ic\b/g,"イック")
      // 母音
      .replace(/a/g,"ア").replace(/e/g,"エ").replace(/i/g,"イ").replace(/o/g,"オ").replace(/u/g,"ウ")
      // スペースは中黒
      .replace(/\s+/g,"・")
      .toUpperCase();
  }
}
