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

face_points의 y_pct는 반드시 아래 해부학적 위치를 정확히 따르시오:
- 이마(額): y_pct = 14
- 눈(目):   y_pct = 37
- 코(鼻):   y_pct = 52
- 귀(耳):   y_pct = 40
- 입(口):   y_pct = 67
- 턱(頤):   y_pct = 82

{
  "title": "관상을 사자성어나 한자어로 한 마디 (예: 貴骨福相, 風雲兒相)",
  "gauges": [
    {"label": "재물운", "my": 75, "avg": 62, "comment": "동년배 대비 재물운 한 줄 코멘트"},
    {"label": "연애운", "my": 88, "avg": 70, "comment": "동년배 대비 연애운 한 줄 코멘트"},
    {"label": "건강운", "my": 60, "avg": 65, "comment": "동년배 대비 건강운 한 줄 코멘트"},
    {"label": "직업운", "my": 82, "avg": 68, "comment": "동년배 대비 직업운 한 줄 코멘트"}
  ],
  "face_points": [
    {
      "part": "이마", "hanja": "額", "side": "left", "y_pct": 14,
      "grade": "good",
      "short": "지혜의 상",
      "meaning": "이마가 넓고 밝은 사람은 생각이 깊고 앞날이 트인다는 의미",
      "reading": "이마가 넓어 지혜와 복이 가득하오"
    },
    {
      "part": "눈", "hanja": "目", "side": "right", "y_pct": 37,
      "grade": "good",
      "short": "귀인의 눈",
      "meaning": "눈빛이 맑고 총기 있는 자는 귀인을 만나 도움을 받는다는 뜻",
      "reading": "눈빛이 깊고 총명하여 귀인의 상이오"
    },
    {
      "part": "코", "hanja": "鼻", "side": "left", "y_pct": 52,
      "grade": "good",
      "short": "재물코",
      "meaning": "코가 높고 살집이 있으면 재물이 모이고 사업이 번창한다는 상",
      "reading": "코가 높고 우뚝하여 재물이 따르리오"
    },
    {
      "part": "입", "hanja": "口", "side": "right", "y_pct": 67,
      "grade": "bad",
      "short": "말조심 필요",
      "meaning": "입매가 얇으면 말로 인한 구설이 따를 수 있으니 신중해야 하오",
      "reading": "입이 가벼우니 말을 아끼시오"
    },
    {
      "part": "귀", "hanja": "耳", "side": "left", "y_pct": 40,
      "grade": "good",
      "short": "장수의 귀",
      "meaning": "귓불이 두툼하고 귀가 크면 수명이 길고 복록이 따른다는 상",
      "reading": "귀가 두툼하여 수명장수할 상이오"
    },
    {
      "part": "턱", "hanja": "頤", "side": "right", "y_pct": 82,
      "grade": "good",
      "short": "말년복",
      "meaning": "턱이 넓고 든든하면 말년에 안정과 풍요가 찾아온다는 의미",
      "reading": "턱이 든든하여 말년에 복록이 들어오리오"
    }
  ],
  "overall": "${(items||[]).includes('overall') ? '전체 운세. 재물/연애/건강/직업 각각. 관상가 말투로 시작해서 MZ 감성으로 마무리. 이모지 활용. 12~15줄.' : ''}",
  "love":    "${(items||[]).includes('love')    ? '연애운 집중 분석. 어떤 인연이 오는지, 지금 연애 흐름. 두근거리고 공감 가게. 8~10줄.' : ''}",
  "past":    "${(items||[]).includes('past')    ? '전생과 팔자. 전생 직업과 현생 팔자. 황당하지만 그럴싸하게.' : ''}",
  "today":   "${(items||[]).includes('today')   ? '오늘의 신탁 한마디. 짧고 강렬하고 시적으로. 1~2문장.' : ''}"
}

위 face_points의 grade는 반드시 "good" 또는 "bad" 중 하나로만 표기하시오.
gauges의 my/avg 수치와 comment, face_points의 short/meaning/reading은 사진 속 실제 인물을 보고 맞춤 분석한 내용으로 교체하시오.
gauges avg는 ${gender||'동성'} ${birth ? `${new Date().getFullYear() - new Date(birth).getFullYear()}세` : '동년배'} 평균 수치로 설정하시오.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${imageType||'image/jpeg'};base64,${imageBase64}`, detail: 'high' } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error?.message || `OpenAI 오류 ${response.status}`);
    const text = data.choices?.[0]?.message?.content || '';
    const match = text.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim().match(/\{[\s\S]*\}/);
    if (!match) throw new Error('결과 파싱 실패');
    return res.status(200).json(JSON.parse(match[0]));
  } catch (err) {
    console.error('관상 API 오류:', err);
    return res.status(500).json({ error: err.message });
  }
}
