export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, imageType, items, birth, gender, today } = req.body;
  if (!imageBase64) return res.status(400).json({ error: '이미지가 필요합니다' });

  const info = [birth ? `생년월일: ${birth}` : '', gender ? `성별: ${gender}` : ''].filter(Boolean).join(', ');

  const prompt = `당신은 조선시대 최고의 관상가입니다. 사진 속 얼굴을 분석하여 아래 JSON 형식으로만 응답하시오. 다른 텍스트는 절대 포함하지 마시오.

${info ? `의뢰인 정보: ${info}` : ''}
오늘: ${today}
살펴볼 항목: ${(items || []).join(', ')}

{
  "title": "관상을 사자성어나 한자어로 한 마디 (예: 貴骨福相, 風雲兒相)",
  "gauges": {"재물운": 75, "연애운": 88, "건강운": 60, "직업운": 82},
  "face_points": [
    {"part": "이마", "hanja": "額", "side": "left",  "y_pct": 18, "reading": "이마가 넓어 지혜와 복이 가득하오", "short": "지혜의 상"},
    {"part": "눈",   "hanja": "目", "side": "right", "y_pct": 35, "reading": "눈빛이 깊고 총명하여 귀인의 상이오", "short": "귀인의 눈"},
    {"part": "코",   "hanja": "鼻", "side": "left",  "y_pct": 52, "reading": "코가 높고 우뚝하여 재물이 따르리오", "short": "재물코"},
    {"part": "입",   "hanja": "口", "side": "right", "y_pct": 68, "reading": "입매가 단정하여 말복이 두텁소이다", "short": "말복의 상"},
    {"part": "귀",   "hanja": "耳", "side": "left",  "y_pct": 42, "reading": "귀가 두툼하여 수명장수할 상이오", "short": "장수의 귀"},
    {"part": "턱",   "hanja": "頤", "side": "right", "y_pct": 84, "reading": "턱이 각져 말년에 복록이 들어오리오", "short": "말년복"}
  ],
  "overall": "${(items || []).includes('overall') ? '전체 운세. 재물/연애/건강/직업 각각. 관상가 말투로 시작해서 MZ 감성으로 마무리. 이모지 활용. 12~15줄.' : ''}",
  "love":    "${(items || []).includes('love')    ? '연애운 집중 분석. 어떤 인연이 오는지, 지금 연애 흐름. 두근거리고 공감 가게. 8~10줄.' : ''}",
  "past":    "${(items || []).includes('past')    ? '전생과 팔자. 전생 직업과 현생 팔자. 황당하지만 그럴싸하게. 어딘가 찔리는 내용으로.' : ''}",
  "today":   "${(items || []).includes('today')   ? '오늘의 신탁 한마디. 짧고 강렬하고 시적으로. 1~2문장.' : ''}"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: imageType || 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error?.message || `API 오류 ${response.status}`);

    const text = data.content?.map(c => c.text || '').join('') || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('결과 파싱 실패: ' + text.substring(0, 200));

    const result = JSON.parse(match[0]);
    return res.status(200).json(result);
  } catch (err) {
    console.error('관상 API 오류:', err);
    return res.status(500).json({ error: err.message });
  }
}
