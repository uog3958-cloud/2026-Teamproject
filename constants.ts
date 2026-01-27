
import { Article, Category } from './types';

export const ARTICLES_DATA: Article[] = ([
  {
    category: '국내',
    title: '정부, 국가 AI 전략 발표... "2030년 세계 3대 강국 도약"',
    lead: '정부가 인공지능(AI)을 국가 핵심 성장 동력으로 삼고 파격적인 지원책을 내놓았다.',
    // Added missing shortBody property
    shortBody: '정부는 국가 인공지능 전략을 발표하며 5년간 인재 10만 명 양성과 LLM 인프라 구축을 통해 2030년 세계 3대 AI 강국 도약을 목표로 제시했습니다.',
    body: '정부는 오늘 광화문 청사에서 국가 인공지능 전략 회의를 열고, 향후 5년간의 AI 산업 육성 방안을 발표했습니다. 이번 전략은 AI 핵심 인재 10만 명 양성과 거대 언어 모델 인프라 구축을 골자로 하고 있습니다.\n\n특히 민간 기업과의 협력을 통해 세계 수준의 컴퓨팅 자원을 확보하고, 공공 분야에서의 AI 도입을 가속화하여 사회 전반의 디지털 전환을 이끈다는 계획입니다.',
    contextBox: '거대 언어 모델(LLM): 방대한 데이터를 학습하여 문장을 생성하는 기술.',
    keywords: ['AI전략', '디지털전환', '기술패권', '인재양성', '미래성장'],
    sourceName: 'AI 데일리 경제',
    sourceUrl: 'https://example.com/ai-strategy',
    imageAlt: '정부 청사 회의 모습',
    imageUrl: 'https://picsum.photos/seed/domestic1/800/500'
  },
  {
    category: '국내',
    title: '서울시, 지능형 교통 시스템 전면 도입... 정체 20% 감소 기대',
    lead: '서울시가 AI 기술을 활용한 지능형 교통 신호 체계를 시 전역에 도입하기로 결정했다.',
    // Added missing shortBody property
    shortBody: '서울시가 실시간 교통 흐름 분석을 통한 지능형 교통 신호 체계를 전면 도입하여 상습 정체 해소와 자율주행 인프라 구축에 나섭니다.',
    body: '서울시는 24시간 교통 흐름을 분석하여 실시간으로 신호 주기를 조절하는 시스템을 구축했습니다. 이를 통해 상습 정체 구간의 통행 속도가 크게 개선될 것으로 기대됩니다.\n\n시는 내년까지 주요 간선도로의 모든 신호등을 연동하고, 자율주행 차량과의 통신 인프라도 병행 구축할 예정입니다.',
    contextBox: '지능형 교통 시스템(ITS): 교통수단과 시설에 첨단 기술을 접목한 체계.',
    keywords: ['서울시', '교통체증', 'ITS', '스마트시티', '자율주행'],
    sourceName: '연합뉴스',
    sourceUrl: 'https://example.com/seoul-its',
    imageAlt: '서울 도심 도로 전경',
    imageUrl: 'https://picsum.photos/seed/domestic2/800/500'
  }
] as Article[]).concat(
  (['해외', '스포츠', '엔터', '경제', '가장 인기 있는'] as Category[]).flatMap(cat => [
    {
      category: cat,
      title: `${cat} 분야 제1보: 글로벌 AI 트렌드 리포트`,
      lead: `${cat} 분야의 대변혁이 시작되었습니다.`,
      // Added missing shortBody property
      shortBody: `글로벌 기업들이 ${cat} 산업에 AI 기술을 대거 도입하면서 대대적인 변화가 시작되었습니다. 이는 향후 10년의 비즈니스 패러다임을 바꿀 것으로 보입니다.`,
      body: '인공지능 기술의 급격한 발전이 해당 산업의 지형도를 완전히 바꾸고 있습니다. 전문가들은 이번 변화가 향후 10년의 패러다임을 결정지을 것으로 보고 있습니다. 글로벌 기업들은 이미 대규모 투자에 착수했으며, 초기 시장 점유율 확보를 위한 경쟁이 치열하게 전개되고 있습니다.',
      contextBox: '관련 핵심 용어 요약 설명이 포함됩니다.',
      keywords: [cat, '인공지능', '트렌드', '글로벌', '혁신'],
      sourceName: 'BBC',
      sourceUrl: '#',
      imageAlt: `${cat} 관련 이미지 1`,
      imageUrl: `https://picsum.photos/seed/${cat}1/800/500`
    },
    {
      category: cat,
      title: `${cat} 분야 제2보: 시장 반응과 전문가 진단`,
      lead: '업계 관계자들은 이번 변화에 대해 신중하면서도 낙관적인 전망을 내놓고 있습니다.',
      // Added missing shortBody property
      shortBody: `현장에서 체감하는 AI 효율성 증대와 더불어 윤리적 가이드라인 마련의 필요성이 동시에 강조되고 있는 상황입니다.`,
      body: '현장에서는 새로운 기술 도입에 따른 효율성 증대를 직접 체감하고 있다는 보고가 잇따르고 있습니다. 다만 급격한 변화에 따른 규제와 윤리적 가이드라인 마련이 병행되어야 한다는 지적도 함께 제기되고 있는 상황입니다.',
      contextBox: '시장 지표 및 전망 분석 데이터입니다.',
      keywords: [cat, '전망', '분석', '전문가', '시장'],
      sourceName: '네이버 뉴스',
      sourceUrl: '#',
      imageAlt: `${cat} 관련 이미지 2`,
      imageUrl: `https://picsum.photos/seed/${cat}2/800/500`
    }
  ])
);
