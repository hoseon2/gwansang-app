export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mode = 'single', imageBase64, imageBase64B, imageType, items = [], birth, gender, today } = req.body;

  const infoLines = [];
  if (birth) infoLines.push('생년월일: ' + birth);
  if (gender) infoLines.push('성별: ' + gender);
  const infoStr = infoLines.join(', ');
  const age = birth ? new Date().getFullYear() - new Date(birth).getFullYear() : null;
  const avgLabel = [gender || '동성', age ? age + '세' : '동년배'].join(' ');

  const system = '당신은 조선시대 최고의 관상가입니다. 반드시 순수한 JSON만 반환하세요. 마크다운, 설명 텍스트 등 JSON 외에는 절대 포함하지 마세요.';

  let prompt = '';
  let messages = [];

  // ── 오늘의 관상 모드 ──
  if (mode === 'today') {
    prompt = '오늘 ' + today + '의 관상 일운을 분석하시오. 아래 JSON만 반환.\n\n'
      + '{\n'
      + '  "today_title": "오늘의 관상운 제목 (예: 木氣昌盛之日)",\n'
      + '  "today_score": 82,\n'
      + '  "today_element": "목(木)",\n'
      + '  "today_color": "청색",\n'
      + '  "today_direction": "동쪽",\n'
      + '  "today_summary": "오늘 하루 운세 한 줄 요약. 강렬하게.",\n'
      + '  "today_detail": "오늘의 운세 상세. 재물/인간관계/건강 각각 짧게. MZ 감성. 8줄.",\n'
      + '  "today_advice": "오늘 하면 좋은 것",\n'
      + '  "today_avoid": "오늘 피해야 할 것",\n'
      + '  "today_lucky_number": 7\n'
      + '}';
    messages = [{ role: 'user', content: prompt }];
  }

  // ── 궁합 모드 ──
  else if (mode === 'couple') {
    if (!imageBase64 || !imageBase64B) return res.status(400).json({ error: '사진 두 장이 필요합니다' });
    prompt = '두 사람의 관상 사진을 보고 궁합을 분석하시오. 아래 JSON만 반환.\n\n'
      + (infoStr ? infoStr + '\n' : '')
      + '오늘: ' + today + '\n\n'
      + '{\n'
      + '  "person_a": { "type": "첫 번째 사람 관상 유형 (한자)", "element": "오행 (水/木/火/土/金)", "trait": "성격 한 줄" },\n'
      + '  "person_b": { "type": "두 번째 사람 관상 유형 (한자)", "element": "오행 (水/木/火/土/金)", "trait": "성격 한 줄" },\n'
      + '  "score": 88,\n'
      + '  "title": "궁합 제목 (예: 水火相濟之合)",\n'
      + '  "summary": "이 두 사람의 궁합을 한 문장으로. 강렬하게. 30자 이내.",\n'
      + '  "good_points": ["잘 맞는 이유 1", "잘 맞는 이유 2", "잘 맞는 이유 3"],\n'
      + '  "bad_points": ["안 맞는 이유 1", "안 맞는 이유 2"],\n'
      + '  "love": "연애/부부 궁합 상세. 두근거리게. 8줄.",\n'
      + '  "work": "직장/사업 궁합 상세. 5줄.",\n'
      + '  "advice": "이 두 사람에게 관상가의 조언. 진지하게 시작해서 MZ 마무리. 5줄."\n'
      + '}';
    messages = [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: 'data:' + (imageType||'image/jpeg') + ';base64,' + imageBase64, detail: 'high' } },
        { type: 'image_url', image_url: { url: 'data:' + (imageType||'image/jpeg') + ';base64,' + imageBase64B, detail: 'high' } },
        { type: 'text', text: prompt }
      ]
    }];
  }

  // ── 단독 관상 모드 ──
  else {
    if (!imageBase64) return res.status(400).json({ error: '이미지가 필요합니다' });
    const hasOverall = items.includes('overall');
    const hasLove    = items.includes('love');
    const hasPast    = items.includes('past');
    const hasToday   = items.includes('today');

    prompt = '아래 지시에 따라 얼굴 사진을 분석하고 JSON만 반환하시오.\n\n'
      + (infoStr ? infoStr + '\n' : '')
      + '오늘: ' + today + '\n'
      + '살펴볼 항목: ' + items.join(', ') + '\n\n'
      + '규칙:\n'
      + '1. face_points grade → good 또는 bad\n'
      + '2. gauges my/avg → ' + avgLabel + ' 기준 0~100 정수\n'
      + '3. total_score → 0~100 정수\n'
      + '4. timeline → 나이대별(20대/30대/40대/50대/60대이후) 운세 흐름 각 한 줄\n'
      + '5. 모든 텍스트는 사진 속 인물 맞춤 분석\n\n'
      + '반환 JSON:\n'
      + '{\n'
      + '  "title": "관상 한자어 한 마디",\n'
      + '  "total_score": 78,\n'
      + '  "summary": "관상 한 줄 요약. 30자 이내.",\n'
      + '  "gauges": [\n'
      + '    {"label":"재물운","icon":"💰","my":75,"avg":62,"comment":"코멘트"},\n'
      + '    {"label":"연애운","icon":"💕","my":88,"avg":70,"comment":"코멘트"},\n'
      + '    {"label":"건강운","icon":"🌿","my":60,"avg":65,"comment":"코멘트"},\n'
      + '    {"label":"직업운","icon":"⚡","my":82,"avg":68,"comment":"코멘트"}\n'
      + '  ],\n'
      + '  "face_points": [\n'
      + '    {"part":"이마","hanja":"額","side":"left", "grade":"good","short":"지혜의 상","meaning":"의미","reading":"풀이"},\n'
      + '    {"part":"눈",  "hanja":"目","side":"right","grade":"good","short":"귀인의 눈","meaning":"의미","reading":"풀이"},\n'
      + '    {"part":"코",  "hanja":"鼻","side":"left", "grade":"good","short":"재물코",   "meaning":"의미","reading":"풀이"},\n'
      + '    {"part":"입",  "hanja":"口","side":"right","grade":"bad", "short":"말조심",   "meaning":"의미","reading":"풀이"},\n'
      + '    {"part":"귀",  "hanja":"耳","side":"left", "grade":"good","short":"장수의 귀","meaning":"의미","reading":"풀이"},\n'
      + '    {"part":"턱",  "hanja":"頤","side":"right","grade":"good","short":"말년복",   "meaning":"의미","reading":"풀이"}\n'
      + '  ],\n'
      + '  "timeline": [\n'
      + '    {"age":"20대","label":"준비기","score":65,"text":"20대 운세 한 줄"},\n'
      + '    {"age":"30대","label":"도약기","score":78,"text":"30대 운세 한 줄"},\n'
      + '    {"age":"40대","label":"전성기","score":88,"text":"40대 운세 한 줄"},\n'
      + '    {"age":"50대","label":"결실기","score":82,"text":"50대 운세 한 줄"},\n'
      + '    {"age":"60대~","label":"완성기","score":75,"text":"60대 이후 운세 한 줄"}\n'
      + '  ],\n'
      + '  "overall": ' + JSON.stringify(hasOverall ? '전체 운세. 재물/연애/건강/직업. 관상가 말투로 시작해 MZ 마무리. 12줄.' : '') + ',\n'
      + '  "love":    ' + JSON.stringify(hasLove    ? '연애운. 어떤 인연, 지금 흐름. 8줄.' : '') + ',\n'
      + '  "past":    ' + JSON.stringify(hasPast    ? '전생과 팔자. 황당하지만 그럴싸하게.' : '') + ',\n'
      + '  "today":   ' + JSON.stringify(hasToday   ? '오늘의 신탁. 짧고 강렬하게. 1~2문장.' : '') + '\n'
      + '}';

    messages = [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: 'data:' + (imageType||'image/jpeg') + ';base64,' + imageBase64, detail: 'high' } },
        { type: 'text', text: prompt }
      ]
    }];
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 3000,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, ...messages]
      })
    });

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error?.message || 'OpenAI 오류 ' + response.status);

    const text = data.choices?.[0]?.message?.content || '';
    let result;
    try { result = JSON.parse(text); }
    catch (e) {
      const match = text.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim().match(/\{[\s\S]*\}/);
      if (!match) throw new Error('JSON 파싱 실패: ' + text.substring(0,300));
      result = JSON.parse(match[0]);
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error('관상 API 오류:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
