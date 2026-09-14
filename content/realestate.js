// 부동산·공인중개사 분야. terms/calc/law/glossary/guide 파일의 전역을 하나의 분야로 묶습니다.
// 다른 분야는 content/<분야>.js 한 파일에서 같은 형태로 window.FIELDS에 push합니다.
window.FIELDS = window.FIELDS || [];
window.FIELDS.push({
  id:'re',
  name:'부동산·공인중개사',
  brand:'집공부',
  sub:'부동산 학습',
  desc:'집을 구하고 계약하고 세금을 내는 모든 과정. 공인중개사 시험 범위까지.',
  exam:'공인중개사',
  courses:[window.COURSE_TERMS, window.COURSE_CALC, ...(window.COURSES_LAW||[]), window.COURSE_EXAM].filter(Boolean),
  glossary:window.GLOSSARY || [],
  guide:window.GUIDE || [],
  guideLead:'매물을 소개하거나 직접 볼 때 참고할 실무 정보. 체크 표시는 이 기기에 저장돼요.',
});
