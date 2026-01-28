import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CATEGORIES, Article } from './types';
import { ARTICLES_DATA } from './constants';
import { GoogleGenAI } from "@google/genai";

const ACCENT_COLOR = '#0AA8A6';

const STYLE_OPTIONS = [
  { label: '실사 뉴스 (기본값)', value: 'photo', keywords: 'photojournalism, realistic lighting, news photography, documentary style' },
  { label: '카툰 / 일러스트', value: 'cartoon', keywords: 'editorial illustration, cartoon style, clean line art, newspaper illustration' },
  { label: '인포그래픽', value: 'infographic', keywords: 'infographic, flat design, data visualization, minimal icons' },
  { label: '상징적 콘셉트 이미지', value: 'concept', keywords: 'conceptual art, symbolic representation, metaphorical scene, abstract but clear meaning' }
];

// 1. 실시간 시계 컴포넌트 분리 (App 전체 리렌더링 방지 및 스크롤 위치 유지)
const TimeDisplay: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = useMemo(() => {
    const d = currentTime;
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = weekDays[d.getDay()];
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${dayOfWeek}) ${hours}:${minutes}:${seconds}`;
  }, [currentTime]);

  return (
    <div className="serif-font font-black text-gray-900 flex-shrink-0 ml-4 text-lg">
      {formattedTime}
    </div>
  );
};

// 2. 홈 화면 컴포넌트 추출 (언마운트 방지)
interface HomeViewProps {
  articles: Article[];
  setCatIdx: (idx: number) => void;
  setView: (view: 'home' | 'paper') => void;
}

const HomeView: React.FC<HomeViewProps> = ({ articles, setCatIdx, setView }) => {
  const heroArticle = articles[0];
  const gridArticles = articles.slice(1, 9);

  return (
    <div className="flex-grow overflow-y-auto bg-white custom-scroll">
      <div className="max-w-6xl mx-auto px-8 py-10">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-16">
          <div className="lg:col-span-2 cursor-pointer group" onClick={() => {
            const idx = CATEGORIES.indexOf(heroArticle.category);
            setCatIdx(idx >= 0 ? idx : 0);
            setView('paper');
          }}>
            <div className="overflow-hidden mb-4 relative aspect-[16/9] bg-gray-100 border border-gray-200">
              <img src={heroArticle.imageUrl} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105" alt="" />
              <span className="absolute top-4 left-4 text-white text-[10px] font-black px-2 py-1 uppercase tracking-widest" style={{ backgroundColor: ACCENT_COLOR }}>{heroArticle.category}</span>
            </div>
            <h2 className="text-4xl font-black serif-font mb-4 leading-tight group-hover:underline underline-offset-4">{heroArticle.title}</h2>
            <p className="text-gray-600 leading-relaxed line-clamp-3 serif-font">{heroArticle.shortBody}</p>
          </div>
          
          <aside className="border-l border-gray-200 pl-10 hidden lg:block">
            <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-black pb-2 mb-6">가장 많이 본 기사</h3>
            <div className="space-y-6">
              {articles.slice(5, 10).map((a, i) => (
                <div key={i} className="cursor-pointer group" onClick={() => {
                  const idx = CATEGORIES.indexOf(a.category);
                  setCatIdx(idx >= 0 ? idx : 0);
                  setView('paper');
                }}>
                  <span className="text-2xl font-black text-gray-200 italic mr-2 group-hover:text-black transition-colors">{i+1}</span>
                  <h4 className="inline text-sm font-bold serif-font leading-snug group-hover:underline">{a.title}</h4>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-black pb-2 mb-8">오늘의 주요 뉴스</h3>
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {gridArticles.map((a, i) => (
            <div key={i} className="cursor-pointer group" onClick={() => {
              const idx = CATEGORIES.indexOf(a.category);
              setCatIdx(idx >= 0 ? idx : 0);
              setView('paper');
            }}>
              <div className="aspect-video bg-gray-100 mb-3 overflow-hidden border border-gray-200">
                <img src={a.imageUrl} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110" alt="" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-[9px] font-black text-white px-1.5 uppercase" style={{ backgroundColor: ACCENT_COLOR }}>{a.category}</span>
              </div>
              <h4 className="text-sm font-bold serif-font leading-snug group-hover:underline">{a.title}</h4>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

// 3. 신문 지면 화면 컴포넌트 추출
interface NewspaperViewProps {
  currentSpread: Article[];
  catIdx: number;
  dragInfo: any;
  isAnimating: boolean;
  getRotation: () => number;
  onPointerDown: (e: React.PointerEvent, direction: 'next' | 'prev') => void;
  isGenerating: boolean;
}

const NewspaperView: React.FC<NewspaperViewProps> = ({ 
  currentSpread, catIdx, dragInfo, isAnimating, getRotation, onPointerDown, isGenerating 
}) => (
  <div className="flex-grow stage relative">
    <div className="newspaper-container">
      <div className="central-crease"></div>
      {dragInfo.active && (
        <div className={`flipping-sheet ${isAnimating ? 'animating' : ''} ${dragInfo.direction === 'next' ? 'from-right' : 'from-left'}`} style={{ transform: `rotateY(${getRotation()}deg)` }}>
          <div className="w-full h-full bg-[#fdfcf9] opacity-40 border-x border-gray-300"></div>
        </div>
      )}
      <div className="page page-left custom-scroll">
        <ArticleView article={currentSpread[0]} />
        {catIdx > 0 && <div className="hotzone hotzone-left" onPointerDown={(e) => onPointerDown(e, 'prev')}><div className="fold-marker"></div></div>}
      </div>
      <div className="page page-right custom-scroll">
        <ArticleView article={currentSpread[1]} />
        {catIdx < CATEGORIES.length - 1 && <div className="hotzone hotzone-right" onPointerDown={(e) => onPointerDown(e, 'next')}><div className="fold-marker"></div></div>}
      </div>
    </div>
    {isGenerating && (
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-[1000] flex items-center justify-center">
        <div className="bg-white border-4 border-black p-8 shadow-2xl flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-t-transparent animate-spin mb-4" style={{ borderColor: `${ACCENT_COLOR} transparent ${ACCENT_COLOR} ${ACCENT_COLOR}` }}></div>
          <p className="serif-font font-black text-lg">기사를 작성하고 있습니다...</p>
        </div>
      </div>
    )}
  </div>
);

const App: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>(ARTICLES_DATA);
  const [catIdx, setCatIdx] = useState(0);
  const [view, setView] = useState<'home' | 'paper'>('home');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [isMagnifierOn, setIsMagnifierOn] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const isComposing = useRef(false);

  const [dragInfo, setDragInfo] = useState<{
    active: boolean;
    startX: number;
    currentX: number;
    direction: 'next' | 'prev' | null;
  }>({ active: false, startX: 0, currentX: 0, direction: null });

  const [form, setForm] = useState({
    title: '',
    body: '',
    source: '',
    imageStyle: 'photo'
  });

  const todaysFocus = useMemo(() => {
    const mainArticle = articles[0];
    return mainArticle ? mainArticle.title : "새로운 시대를 여는 동아 일분";
  }, [articles]);

  const currentCategory = CATEGORIES[catIdx];
  const currentSpread = useMemo(() => {
    const filtered = articles.filter(a => a.category === currentCategory);
    
    // 항상 2개의 슬롯이 채워지도록 보장 (지면이 비지 않게 Fallback 적용)
    const leftArticle = filtered[0] || ARTICLES_DATA.find(a => a.category === currentCategory) || ARTICLES_DATA[0];
    const rightArticle = filtered[1] || (filtered[0] ? ARTICLES_DATA.find(a => a.category === currentCategory && a.title !== filtered[0].title) : null) || ARTICLES_DATA[1] || ARTICLES_DATA[0];
    
    return [leftArticle, rightArticle];
  }, [articles, currentCategory]);

  const cleanText = (text: string) => {
    if (typeof text !== 'string') return '';
    return text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedTitle = form.title.trim();
    const trimmedBody = form.body.trim();
    const trimmedSource = form.source.trim();

    if (!trimmedTitle || !trimmedBody) return alert("제목과 본문을 입력해주세요.");
    
    setIsGenerating(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let generatedData: any = null;
      let retries = 0;
      const MAX_RETRIES = 2;

      while (retries <= MAX_RETRIES) {
        const textResponse = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: `입력 내용을 바탕으로 전문적인 신문 기사 헤드라인과 요약 본문을 한국어로 작성하세요.
          
          제약 조건:
          1. "title": 18자~32자 사이의 강렬한 헤드라인.
          2. "shortBody": 띄어쓰기 포함 반드시 200자 이내. 줄바꿈 없이 단일 문단으로 구성.
          3. 원문을 그대로 복사하지 말고 새로운 문장으로 재구성.
          
          반드시 아래 JSON 구조로만 응답하세요:
          {
            "title": "헤드라인 문자열",
            "shortBody": "200자 이내 요약 본문 문자열",
            "image": {
              "prompt": "Detailed English prompt for a professional photo related to this topic",
              "alt": "Korean image description"
            },
            "sourceName": "출처명"
          }

          입력 제목: ${trimmedTitle}
          입력 출처: ${trimmedSource || '익명'}
          입력 내용: ${trimmedBody}`,
          config: { responseMimeType: "application/json", temperature: 0.7 }
        });

        const parsed = JSON.parse(textResponse.text || '{}');
        const processedBody = cleanText(parsed.shortBody || '');
        if (processedBody.length <= 200 && processedBody.length > 0) {
          generatedData = { ...parsed, shortBody: processedBody };
          break;
        }
        retries++;
      }

      if (!generatedData) {
        generatedData = {
          title: trimmedTitle,
          shortBody: trimmedBody.slice(0, 200),
          image: { prompt: `Professional news photo about ${trimmedTitle}`, alt: trimmedTitle },
          sourceName: trimmedSource || '익명'
        };
      }

      const selectedStyle = STYLE_OPTIONS.find(opt => opt.value === form.imageStyle);
      const enhancedImagePrompt = `${generatedData.image.prompt}. Style: ${selectedStyle?.keywords}`;

      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: enhancedImagePrompt }] }
      });

      let generatedImageUrl = '';
      if (imageResponse.candidates?.[0]?.content?.parts) {
        for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      const newArticle: Article = {
        category: currentCategory,
        title: cleanText(generatedData.title),
        lead: '', 
        shortBody: cleanText(generatedData.shortBody).slice(0, 200),
        body: '', 
        contextBox: '',
        keywords: [],
        sourceName: cleanText(generatedData.sourceName),
        sourceUrl: '#',
        imageAlt: cleanText(generatedData.image.alt),
        imageUrl: generatedImageUrl || undefined,
      };

      setArticles(prev => {
        const sameCategory = prev.filter(a => a.category === currentCategory);
        const otherCategories = prev.filter(a => a.category !== currentCategory);
        
        let updatedSameCategory = [];
        if (sameCategory.length >= 2) {
          updatedSameCategory = [newArticle, sameCategory[1], ...sameCategory.slice(2)];
        } else if (sameCategory.length === 1) {
          updatedSameCategory = [newArticle, sameCategory[0]];
        } else {
          updatedSameCategory = [newArticle];
        }

        return [...updatedSameCategory, ...otherCategories];
      });

      setForm({ title: '', body: '', source: '', imageStyle: 'photo' });
      setIsEditorOpen(false);
      setView('paper');
    } catch (error) {
      console.error(error);
      alert("기사 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const onPointerDown = (e: React.PointerEvent, direction: 'next' | 'prev') => {
    if (isAnimating || isGenerating) return;
    setDragInfo({ active: true, startX: e.clientX, currentX: e.clientX, direction });
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (isMagnifierOn) setMousePos({ x: e.clientX, y: e.clientY });
      if (!dragInfo.active) return;
      setDragInfo(prev => ({ ...prev, currentX: e.clientX }));
    };

    const onPointerUp = () => {
      if (!dragInfo.active) return;
      const deltaX = dragInfo.currentX - dragInfo.startX;
      const threshold = window.innerWidth * 0.25;
      const isSuccess = (dragInfo.direction === 'next' && deltaX < -threshold) || 
                       (dragInfo.direction === 'prev' && deltaX > threshold);

      if (isSuccess) {
        const nextDir = dragInfo.direction === 'next' ? 1 : -1;
        const canFlip = (nextDir === 1 && catIdx < CATEGORIES.length - 1) || (nextDir === -1 && catIdx > 0);
        setIsAnimating(true);
        setTimeout(() => {
          if (canFlip) setCatIdx(prev => prev + nextDir);
          setDragInfo({ active: false, startX: 0, currentX: 0, direction: null });
          setIsAnimating(false);
        }, 500);
      } else {
        setIsAnimating(true);
        setTimeout(() => {
          setDragInfo({ active: false, startX: 0, currentX: 0, direction: null });
          setIsAnimating(false);
        }, 500);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMagnifierOn(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [dragInfo, catIdx, isAnimating, isMagnifierOn]);

  const getRotation = () => {
    if (!dragInfo.active) return 0;
    const delta = dragInfo.currentX - dragInfo.startX;
    const maxRange = window.innerWidth * 0.5;
    let rotate = (delta / maxRange) * 180;
    if (dragInfo.direction === 'next') rotate = Math.max(-180, Math.min(0, rotate));
    else rotate = Math.max(0, Math.min(180, rotate));
    return rotate;
  };

  const renderSharedNav = () => (
    <>
      <div className={`panel-overlay ${isEditorOpen ? 'open' : ''}`} onClick={() => !isGenerating && setIsEditorOpen(false)}></div>
      <aside className={`slide-panel flex flex-col ${isEditorOpen ? 'open' : ''}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
            <h2 className="text-xl font-black serif-font">기사 생성</h2>
            <button onClick={() => !isGenerating && setIsEditorOpen(false)} className="text-2xl font-black" disabled={isGenerating}>&times;</button>
          </div>
          <form onSubmit={handleUpdate} className="flex flex-col flex-grow gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase mb-1">핵심 주제</label>
              <input 
                type="text" 
                value={form.title} 
                onCompositionStart={() => { isComposing.current = true; }}
                onCompositionEnd={() => { isComposing.current = false; }}
                onChange={e => setForm({...form, title: e.target.value})} 
                className="w-full border-2 border-black p-2 text-sm outline-none focus:bg-gray-50 pointer-events-auto select-text relative z-10" 
                placeholder="예: 화성 탐사의 미래" 
                disabled={isGenerating} 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase mb-1">출처</label>
              <input 
                type="text" 
                value={form.source} 
                onCompositionStart={() => { isComposing.current = true; }}
                onCompositionEnd={() => { isComposing.current = false; }}
                onChange={e => setForm({...form, source: e.target.value})} 
                className="w-full border-2 border-black p-2 text-sm outline-none focus:bg-gray-50 pointer-events-auto select-text relative z-10" 
                placeholder="예: 과학동아" 
                disabled={isGenerating} 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase mb-1">이미지 스타일 ▽</label>
              <select value={form.imageStyle} onChange={e => setForm({...form, imageStyle: e.target.value})} className="w-full border-2 border-black p-2 text-sm outline-none focus:bg-gray-50 bg-white pointer-events-auto relative z-10" disabled={isGenerating}>
                {STYLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="flex-grow flex flex-col">
              <label className="block text-[10px] font-black uppercase mb-1">기사 내용</label>
              <textarea 
                value={form.body} 
                onCompositionStart={() => { isComposing.current = true; }}
                onCompositionEnd={() => { isComposing.current = false; }}
                onChange={e => setForm({...form, body: e.target.value})} 
                className="w-full flex-grow border-2 border-black p-2 text-sm outline-none focus:bg-gray-50 resize-none custom-scroll pointer-events-auto select-text relative z-10" 
                placeholder="내용을 입력하세요." 
                disabled={isGenerating} 
              />
            </div>
            <button type="submit" className={`w-full py-3 font-bold uppercase text-xs tracking-widest transition-colors relative z-10 text-white ${isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'hover:opacity-90'}`} style={{ backgroundColor: isGenerating ? undefined : ACCENT_COLOR }} disabled={isGenerating}>
              {isGenerating ? '생성 중...' : 'AI 기사 생성'}
            </button>
          </form>
        </div>
      </aside>

      <header className="bg-white border-b-4 px-8 py-4 flex flex-col items-center shrink-0 z-50" style={{ borderBottomColor: ACCENT_COLOR }}>
        <div className="w-full max-w-6xl flex justify-between items-center mb-3 text-[9px] font-bold text-gray-500 tracking-tight border-b border-gray-100 pb-1">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-white px-1.5 py-0.5 font-black uppercase tracking-widest flex-shrink-0" style={{ backgroundColor: ACCENT_COLOR }}>TODAY'S FOCUS</span>
            <span className="serif-font italic text-gray-700 truncate">“{todaysFocus}”</span>
          </div>
          <TimeDisplay />
        </div>
        <h1 className="text-4xl font-black tracking-tighter serif-font uppercase mb-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setView('home')}>
          동아 일분
        </h1>
        <div className="w-full max-w-6xl flex justify-between items-center border-t pt-1 text-[10px] font-bold uppercase tracking-widest text-gray-700 relative" style={{ borderTopColor: ACCENT_COLOR }}>
          <div className="flex gap-4">
             <button onClick={() => setView('home')} className={`hover:opacity-70 transition-colors ${view === 'home' ? 'underline' : 'text-gray-400'}`} style={{ color: view === 'home' ? ACCENT_COLOR : undefined }}>HOME</button>
             <span>제 2025-0520호</span>
          </div>
          <span className="text-[10px] font-black tracking-normal serif-font absolute left-1/2 -translate-x-1/2 whitespace-nowrap">일분 만에 쓰고, 일분 만에 읽는 뉴스</span>
          <span>THE INTELLIGENT DAILY POST</span>
        </div>
      </header>

      <nav className="bg-white border-b border-black shrink-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-8 py-2">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMagnifierOn(!isMagnifierOn)} className={`p-1.5 transition-all border-2 ${isMagnifierOn ? 'text-white border-transparent shadow-inner scale-95' : 'bg-white text-black border-transparent hover:border-gray-300'}`} style={{ backgroundColor: isMagnifierOn ? ACCENT_COLOR : undefined }} title="돋보기 모드 (Esc로 해제)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
            <div className="flex justify-center gap-6 overflow-x-auto no-scrollbar">
              {CATEGORIES.map((cat, idx) => (
                <button key={cat} onClick={() => { if (!isGenerating) { setCatIdx(idx); setView('paper'); } }} className={`text-xs font-bold whitespace-nowrap transition-all uppercase tracking-tighter hover:opacity-70`} style={{ color: (catIdx === idx && view === 'paper') ? ACCENT_COLOR : '#9ca3af', borderBottom: (catIdx === idx && view === 'paper') ? `2px solid ${ACCENT_COLOR}` : 'none' }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setIsEditorOpen(true)} className="text-white px-4 py-1.5 text-[10px] font-black uppercase hover:opacity-90 transition-colors" style={{ backgroundColor: ACCENT_COLOR }}>새로운 기사 쓰기</button>
        </div>
      </nav>
    </>
  );

  const LENS_SIZE = 220;
  const ZOOM = 1.8;

  // MainLayout을 컴포넌트가 아닌 JSX 반환 함수로 정의하여 포커스 상실 방지
  const renderMainLayout = () => (
    <div className="flex flex-col h-screen overflow-hidden bg-[#d1d5db]">
      {renderSharedNav()}
      {view === 'home' ? (
        <HomeView articles={articles} setCatIdx={setCatIdx} setView={setView} />
      ) : (
        <NewspaperView currentSpread={currentSpread} catIdx={catIdx} dragInfo={dragInfo} isAnimating={isAnimating} getRotation={getRotation} onPointerDown={onPointerDown} isGenerating={isGenerating} />
      )}
    </div>
  );

  return (
    <div className={`relative ${isMagnifierOn ? 'cursor-none' : ''}`}>
      {renderMainLayout()}
      {isMagnifierOn && (
        <div className="fixed rounded-full pointer-events-none border-4 border-gray-500 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999]" style={{ width: `${LENS_SIZE}px`, height: `${LENS_SIZE}px`, left: `${mousePos.x - LENS_SIZE / 2}px`, top: `${mousePos.y - LENS_SIZE / 2}px` }}>
          <div className="absolute bg-[#d1d5db]" style={{ width: '100vw', height: '100vh', transformOrigin: 'top left', transform: `scale(${ZOOM}) translate(${-mousePos.x + (LENS_SIZE / 2) / ZOOM}px, ${-mousePos.y + (LENS_SIZE / 2) / ZOOM}px)`, pointerEvents: 'none', userSelect: 'none' }}>
            {renderMainLayout()}
          </div>
        </div>
      )}
    </div>
  );
};

const ArticleView: React.FC<{ article: Article }> = ({ article }) => {
  if (!article) return <div className="p-10 text-center italic text-gray-400 serif-font">지면이 비어 있습니다.</div>;
  return (
    <article className="flex flex-col h-full max-w-xl mx-auto">
      <div className="flex items-center justify-between border-b border-black mb-6 pb-1">
        <span className="text-[10px] font-black text-white px-2 py-0.5 tracking-widest uppercase" style={{ backgroundColor: ACCENT_COLOR }}>{article.category}</span>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">AI DAILY SPECIAL</span>
      </div>
      <h3 className="text-3xl font-black serif-font mb-6 leading-tight break-keep">{article.title}</h3>
      <div className="w-full aspect-[16/10] bg-gray-200 border border-gray-300 mb-6 relative group z-20">
        {article.imageUrl ? <img src={article.imageUrl} alt={article.imageAlt} className="absolute inset-0 w-full h-full object-cover grayscale-[50%] group-hover:grayscale-0 transition-all duration-500 group-hover:scale-[1.2] group-hover:shadow-2xl z-10" /> : <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400 italic text-xs">이미지 생성 대기 중</div>}
        <div className="absolute bottom-0 left-0 right-0 bg-white/90 p-2 text-[9px] italic border-t border-gray-200 z-20 pointer-events-none transition-all duration-200 group-hover:opacity-0 group-hover:invisible">[사진] {article.imageAlt}</div>
      </div>
      <div className="flex-grow">
        <div className="text-sm leading-[1.8] text-gray-800 text-justify serif-font"><p className="indent-4">{article.shortBody}</p></div>
      </div>
      <div className="mt-10 pt-4 border-t border-dotted border-gray-400">
        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">출처: {article.sourceName || '익명'}</span>
      </div>
    </article>
  );
};

export default App;