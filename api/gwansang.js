export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, imageType, items = [], birth, gender, today } = req.body;
  if (!imageBase64) return res.status(400).json({ error: '이미지가 필요합니다' });

  const infoLines = [];
  if (birth) infoLines.push('생년월일: ' + birth);
  if (gender) infoLines.push('성별: ' + gender);
  const infoStr = infoLines.length ? '의뢰인 정보: ' + infoLines.join(', ') : '';
  const age = birth ? new Date().getFullYear() - new Date(birth).getFullYear() : null;
  const avgLabel = [gender || '동성', age ? age + '세' : '동년배'].join(' ');

  const hasOverall = items.includes('overall');
  const hasLove    = items.includes('love');
  const hasPast    = items.includes('past');
  const hasToday   = items.includes('today');

  const systemPrompt = '당신은 조선시대 최고의 관상가입니다. 반드시 순수한 JSON만 반환하세요. 마크다운, 설명 텍스트 등 JSON 외에는 어떤 것도 포함하지 마세요.';

  const userPrompt = '아래 지시에 따라 얼굴 사진을 분석하고 JSON만 반환하시오.\n\n'
    + (infoStr ? infoStr + '\n' : '')
    + '오늘: ' + today + '\n'
    + '살펴볼 항목: ' + items.join(', ') + '\n\n'
    + '규칙:\n'
    + '1. face_points y_pct 고정값 → 이마=14, 눈=37, 코=52, 귀=40, 입=67, 턱=82\n'
    + '2. face_points grade → good 또는 bad 중 하나만 사용\n'
    + '3. gauges avg → ' + avgLabel + ' 평균 수치로 설정\n'
    + '4. short, meaning, reading, comment는 사진 속 인물을 직접 보고 맞춤 분석\n'
    + '5. overall, love, past, today 중 해당 항목만 실제 내용 작성, 나머지는 빈 문자열\n\n'
    + '반환 JSON:\n'
    + '{\n'
    + '  "title": "관상을 한자어로 한 마디",\n'
    + '  "gauges": [\n'
    + '    {"label":"재물운","my":75,"avg":62,"comment":"' + avgLabel + ' 대비 재물운 코멘트"},\n'
    + '    {"label":"연애운","my":88,"avg":70,"comment":"' + avgLabel + ' 대비 연애운 코멘트"},\n'
    + '    {"label":"건강운","my":60,"avg":65,"comment":"' + avgLabel + ' 대비 건강운 코멘트"},\n'
    + '    {"label":"직업운","my":82,"avg":68,"comment":"' + avgLabel + ' 대비 직업운 코멘트"}\n'
    + '  ],\n'
    + '  "face_points": [\n'
    + '    {"part":"이마","hanja":"額","side":"left", "y_pct":14,"grade":"good","short":"지혜의 상","meaning":"이마가 넓은 사람은 생각이 깊고 앞날이 트인다","reading":"이마가 넓어 지혜와 복이 가득하오"},\n'
    + '    {"part":"눈",  "hanja":"目","side":"right","y_pct":37,"grade":"good","short":"귀인의 눈","meaning":"눈빛이 맑은 자는 귀인을 만나 도움을 받는다","reading":"눈빛이 총명하여 귀인의 상이오"},\n'
    + '    {"part":"코",  "hanja":"鼻","side":"left", "y_pct":52,"grade":"good","short":"재물코",   "meaning":"코가 높고 살집이 있으면 재물이 모인다","reading":"코가 우뚝하여 재물이 따르리오"},\n'
    + '    {"part":"입",  "hanja":"口","side":"right","y_pct":67,"grade":"bad", "short":"말조심",   "meaning":"입매가 얇으면 말로 인한 구설이 따른다","reading":"입이 가벼우니 말을 아끼시오"},\n'
    + '    {"part":"귀",  "hanja":"耳","side":"left", "y_pct":40,"grade":"good","short":"장수의 귀","meaning":"귓불이 두툼하면 수명이 길고 복록이 따른다","reading":"귀가 두툼하여 장수할 상이오"},\n'
    + '    {"part":"턱",  "hanja":"頤","side":"right","y_pct":82,"grade":"good","short":"말년복",   "meaning":"턱이 든든하면 말년에 안정과 풍요가 온다","reading":"턱이 든든하여 말년복이 들어오리오"}\n'
    + '  ],\n'
    + '  "overall": ' + JSON.stringify(hasOverall ? '전체 운세 분석 (재물/연애/건강/직업 각각, 관상가 말투로 시작해 MZ 감성 마무리, 이모지 활용, 12줄 이내)' : '') + ',\n'
    + '  "love":    ' + JSON.stringify(hasLove    ? '연애운 집중 분석. 어떤 인연, 지금 흐름. 공감 가게. 8줄 이내.' : '') + ',\n'
    + '  "past":    ' + JSON.stringify(hasPast    ? '전생과 팔자. 황당하지만 그럴싸하게.' : '') + ',\n'
    + '  "today":   ' + JSON.stringify(hasToday   ? '오늘의 신탁 한마디. 짧고 강렬하게. 1~2문장.' : '') + '\n'
    + '}';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: 'data:' + (imageType || 'image/jpeg') + ';base64,' + imageBase64,
                  detail: 'high'
                }
              },
              { type: 'text', text: userPrompt }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || 'OpenAI 오류 ' + response.status);
    }

    const text = data.choices?.[0]?.message?.content || '';

    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      const match = text.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim().match(/\{[\s\S]*\}/);
      if (!match) throw new Error('JSON 파싱 실패: ' + text.substring(0, 300));
      result = JSON.parse(match[0]);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('관상 API 오류:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
