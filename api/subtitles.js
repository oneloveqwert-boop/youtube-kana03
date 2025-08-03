export default async function handler(req, res) {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: "videoId required" });

  // 本来はYouTube字幕APIやスクレイピングを利用
  // ここでは試作としてサンプル変換
  const subtitles = [
    "Hello world",
    "This is an example of difficult vocabulary",
    "Ephemeral phenomenon and ubiquitous technology"
  ];

  // 簡易的に「6文字以上の単語」をカタカナ変換（超簡易版）
  const kanaText = subtitles
    .map(line =>
      line.split(" ")
        .map(word => word.length >= 6 ? toKatakana(word) : word)
        .join(" ")
    )
    .join("\n");

  res.status(200).json({ text: kanaText });
}

function toKatakana(word) {
  return word
    .toLowerCase()
    .replace(/a/g, "ア")
    .replace(/e/g, "エ")
    .replace(/i/g, "イ")
    .replace(/o/g, "オ")
    .replace(/u/g, "ウ")
    .toUpperCase();
}
