export default async function handler(req, res) {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: "videoId is required" });

  // 本来は YouTube API を叩く。ここではデモとして固定テキスト
  const subtitles = "This is a DEMO subtitle with Difficult WORDS like Philosophy and Psychology.";

  // 簡単な英単語判定＋カタカナ化
  const words = subtitles.split(" ").map(word => {
    const lower = word.toLowerCase();
    if (lower.length > 7) { // 難単語っぽいものだけ変換
      return toKatakana(word);
    }
    return word;
  });

  res.status(200).json({ subtitles: words.join(" ") });
}

// 英語 → 簡易カタカナ変換
function toKatakana(word) {
  return word
    .replace(/a/gi, "ア")
    .replace(/e/gi, "エ")
    .replace(/i/gi, "イ")
    .replace(/o/gi, "オ")
    .replace(/u/gi, "ウ");
}
