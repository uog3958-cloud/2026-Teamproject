import React, { useState, useMemo, useEffect } from 'react';
import { CATEGORIES, Article } from './types';
import { ARTICLES_DATA } from './constants';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>(ARTICLES_DATA);
  const [catIdx, setCatIdx] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [dragInfo, setDragInfo] = useState<{
    active: boolean;
    startX: number;
    currentX: number;
    direction: 'next' | 'prev' | null;
  }>({ active: false, startX: 0, currentX: 0, direction: null });

  const [form, setForm] = useState({
    title: '',
    body: '',
    source: ''
  });

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }, []);

  const currentCategory = CATEGORIES[catIdx];
  const currentSpread = useMemo(() => {
    const filtered = articles.filter(a => a.category === currentCategory);
    return [filtered[0], filtered[1]];
  }, [articles, currentCategory]);

  const cleanText = (text: string) => {
    if (typeof text !== 'string') return '';
    return text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.body) return alert("제목과 본문을 입력해주세요.");
    
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
          4. 불필요한 공백이나 특수문자 금지.
          
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

          입력 제목: ${form.title}
          입력 출처: ${form.source || '익명'}
          입력 내용: ${form.body}`,
          config: {
            responseMimeType: "application/json",
            temperature: 0.7,
          }
        });

        const rawText = textResponse.text;
        if (!rawText) throw new Error("Empty response from AI");

        const parsed = JSON.parse(rawText);
        const processedBody = cleanText(parsed.shortBody);
        
        if (processedBody.length <= 200 && processedBody.length > 0) {
          generatedData = { ...parsed, shortBody: processedBody };
          break;
        }
        retries++;
      }

      if (!generatedData) {
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `다음 내용을 바탕으로 기사 헤드라인 1개와 150자 이내의 요약 문단 1개를 작성하세요 (줄바꿈 없이): ${form.body}`,
        });
        
        const fallbackText = cleanText(fallbackResponse.text || '');
        generatedData = {
          title: form.title,
          shortBody: fallbackText.slice(0, 200),
          image: {
            prompt: `Professional high-quality journalistic photograph about ${form.title}`,
            alt: form.title
          },
          sourceName: form.source || '익명'
        };
      }

      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: generatedData.image.prompt }]
        }
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
        // 해당 카테고리의 기존 기사를 한 칸씩 밀어냄
        const otherCategories = prev.filter(a => a.category !== currentCategory);
        const sameCategory = prev.filter(a => a.category === currentCategory);
        return [newArticle, ...sameCategory, ...otherCategories];
      });

      setForm({ title: '', body: '', source: '' });
      setIsEditorOpen(false);
    } catch (error) {
      console.error("Article Generation Failed:", error);
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

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragInfo, catIdx, isAnimating]);

  const getRotation = () => {
    if (!dragInfo.active) return 0;
    const delta = dragInfo.currentX - dragInfo.startX;
    const maxRange = window.innerWidth * 0.5;
    let rotate = (delta / maxRange) * 180;
    if (dragInfo.direction === 'next') rotate = Math.max(-180, Math.min(0, rotate));
    else rotate = Math.max(0, Math.min(180, rotate));
    return rotate;
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#d1d5db]">
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
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border-2 border-black p-2 text-sm outline-none focus:bg-gray-50" placeholder="예: 화성 탐사의 미래" disabled={isGenerating} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase mb-1">출처</label>
              <input type="text" value={form.source} onChange={e => setForm({...form, source: e.target.value})} className="w-full border-2 border-black p-2 text-sm outline-none focus:bg-gray-50" placeholder="예: 과학동아" disabled={isGenerating} />
            </div>
            <div className="flex-grow flex flex-col">
              <label className="block text-[10px] font-black uppercase mb-1">기사 내용</label>
              <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} className="w-full flex-grow border-2 border-black p-2 text-sm outline-none focus:bg-gray-50 resize-none custom-scroll" placeholder="내용을 입력하세요." disabled={isGenerating} />
            </div>
            <button 
              type="submit" 
              className={`w-full py-3 font-bold uppercase text-xs tracking-widest transition-colors ${isGenerating ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-black text-white hover:bg-gray-800'}`}
              disabled={isGenerating}
            >
              {isGenerating ? '생성 중...' : 'AI 기사 생성'}
            </button>
          </form>
        </div>
      </aside>

      <header className="bg-white border-b-4 border-black px-8 py-6 flex flex-col items-center shrink-0 z-50">
        <h1 className="text-4xl font-black tracking-tighter serif-font uppercase mb-1">AI 데일리 신문</h1>
        <div className="w-full max-w-6xl flex justify-between items-center border-t border-black pt-1 text-[10px] font-bold uppercase tracking-widest text-gray-700">
          <span>제 2025-0520호</span>
          <span className="text-sm font-black tracking-normal serif-font">{today}</span>
          <span>THE INTELLIGENT DAILY POST</span>
        </div>
      </header>

      <nav className="bg-white border-b border-black shrink-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-8 py-2">
          <div className="flex justify-center gap-6 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat, idx) => (
              <button key={cat} onClick={() => !isGenerating && setCatIdx(idx)} className={`text-xs font-bold whitespace-nowrap transition-all uppercase tracking-tighter ${catIdx === idx ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-black'}`}>{cat}</button>
            ))}
          </div>
          <button onClick={() => setIsEditorOpen(true)} className="bg-black text-white px-4 py-1.5 text-[10px] font-black uppercase hover:bg-gray-800 transition-colors">새로운 기사 쓰기</button>
        </div>
      </nav>

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
      </div>

      {isGenerating && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-[1000] flex items-center justify-center">
          <div className="bg-white border-4 border-black p-8 shadow-2xl flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-black border-t-transparent animate-spin mb-4"></div>
            <p className="serif-font font-black text-lg">기사를 작성하고 있습니다...</p>
          </div>
        </div>
      )}
    </div>
  );
};

const ArticleView: React.FC<{ article: Article }> = ({ article }) => {
  if (!article) return <div className="p-10 text-center italic text-gray-400 serif-font">지면이 비어 있습니다.</div>;

  const renderTitle = article.title || '제목 없음';
  const renderShortBody = article.shortBody || article.body || '';
  const renderImageAlt = article.imageAlt || '기사 이미지';

  return (
    <article className="flex flex-col h-full max-w-xl mx-auto">
      <div className="flex items-center justify-between border-b border-black mb-6 pb-1">
        <span className="text-[10px] font-black text-white bg-black px-2 py-0.5 tracking-widest uppercase">{article.category}</span>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">AI DAILY SPECIAL</span>
      </div>

      <h3 className="text-3xl font-black serif-font mb-6 leading-tight break-keep">{renderTitle}</h3>

      <div className="w-full bg-gray-200 border border-gray-300 mb-6 relative overflow-hidden grayscale-[50%] hover:grayscale-0 transition-all duration-700">
        {article.imageUrl ? (
          <img src={article.imageUrl} alt={renderImageAlt} className="w-full aspect-[16/10] object-cover" />
        ) : (
          <div className="aspect-[16/10] bg-gray-100 flex items-center justify-center text-gray-400 italic text-xs">이미지 생성 대기 중</div>
        )}
        <div className="bg-white/90 p-2 text-[9px] italic border-t border-gray-200">[사진] {renderImageAlt}</div>
      </div>

      <div className="flex-grow">
        <div className="text-sm leading-[1.8] text-gray-800 text-justify serif-font">
          <p className="indent-4">{renderShortBody}</p>
        </div>
      </div>

      <div className="mt-10 pt-4 border-t border-dotted border-gray-400">
        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">출처: {article.sourceName || '익명'}</span>
      </div>
    </article>
  );
};

export default App;