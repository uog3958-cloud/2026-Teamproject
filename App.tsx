import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CATEGORIES, Article } from './types';
import { ARTICLES_DATA } from './constants';
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ACCENT_COLOR = '#0AA8A6';

// Supabase 클라이언트 설정 (제공된 URL과 키 사용)
const SUPABASE_URL = 'https://ssxfmvzrvpngrpugghfk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DmlfzVNDPajtoTe4dwd6pg_sb07tqo1';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STYLE_OPTIONS = [
  { label: '실사 뉴스 (기본값)', value: 'photo', keywords: 'photojournalism, realistic lighting, news photography, documentary style' },
  { label: '카툰 / 일러스트', value: 'cartoon', keywords: 'editorial illustration, cartoon style, clean line art, newspaper illustration' },
  { label: '인포그래픽', value: 'infographic', keywords: 'infographic, flat design, data visualization, minimal icons' },
  { label: '상징적 콘셉트 이미지', value: 'concept', keywords: 'conceptual art, symbolic representation, metaphorical scene, abstract but clear meaning' }
];

// 도시별 위경도 데이터
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  '서울': { lat: 37.5665, lng: 126.9780 },
  '부산': { lat: 35.1796, lng: 129.0756 },
  '대구': { lat: 35.8714, lng: 128.6014 },
  '인천': { lat: 37.4563, lng: 126.7052 },
  '광주': { lat: 35.1595, lng: 126.8526 },
  '대전': { lat: 36.3504, lng: 127.3845 },
  '울산': { lat: 35.5384, lng: 129.3114 },
  '세종': { lat: 36.4800, lng: 127.2890 },
  '수원': { lat: 37.2636, lng: 127.0286 },
  '춘천': { lat: 37.8813, lng: 127.7298 },
  '청주': { lat: 36.6358, lng: 127.4912 },
  '전주': { lat: 35.8242, lng: 127.1480 },
  '창원': { lat: 35.2280, lng: 128.6811 },
  '제주': { lat: 33.4996, lng: 126.5312 },
};

// 날씨 코드 매핑 (WMO)
const getWeatherStatus = (code: number) => {
  if (code === 0) return '맑음';
  if (code >= 1 && code <= 3) return '흐림';
  if (code === 45 || code === 48) return '안개';
  if (code >= 51 && code <= 55) return '가랑비';
  if (code >= 61 && code <= 65) return '비';
  if (code >= 71 && code <= 75) return '눈';
  if (code >= 80 && code <= 82) return '소나기';
  if (code >= 95) return '뇌우';
  return '정보없음';
};

// 날씨 상태에 따른 분위기 분류 매핑 (흐림은 sunny로 통합)
const mapWeatherToAtmosphere = (status: string | undefined): 'sunny' | 'rainy' | 'snowy' => {
  if (!status) return 'sunny';
  if (status === '맑음' || status === '흐림' || status === '안개' || status === '정보없음') return 'sunny';
  if (status === '눈') return 'snowy';
  if (status.includes('비') || status === '뇌우' || status === '소나기' || status === '가랑비') return 'rainy';
  return 'sunny';
};

// 날씨 아이콘 매핑
const getWeatherIcon = (status: string) => {
  switch (status) {
    case '맑음': return '☀';
    case '흐림': return '☁';
    case '안개': return '🌫';
    case '비':
    case '가랑비':
    case '소나기': return '🌧';
    case '눈': return '❄';
    case '뇌우': return '🌩';
    default: return '';
  }
};

// 날씨 상태에 따른 CSS 클래스 매핑
const getWeatherClassName = (status: string | undefined) => {
  if (!status) return '';
  if (status === '맑음') return 'sunny';
  if (status === '흐림' || status === '안개') return 'cloudy';
  if (status.includes('비') || status === '뇌우' || status === '소나기') return 'rainy';
  if (status === '눈') return 'snowy';
  return '';
};

// 빗줄기 효과 컴포넌트 (입자 기반 루프 방식)
const RainEffect: React.FC = () => {
  const raindrops = useMemo(() => {
    return Array.from({ length: 45 }).map((_, i) => {
      const width = 2 + Math.random() * 1; // 2~3px
      const height = 6 + Math.random() * 6; // 6~12px
      const left = Math.random() * 100; // 0~100%
      const duration = Math.random() * 0.4 + 0.8; // 0.8~1.2s (눈보다 빠름)
      const delay = Math.random() * 2;
      const opacity = Math.random() * 0.2 + 0.25; // 0.25~0.45
      return (
        <div
          key={i}
          className="raindrop"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            left: `${left}%`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
            opacity: opacity,
          }}
        />
      );
    });
  }, []);

  return <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">{raindrops}</div>;
};

// 눈 내림 효과 컴포넌트 - 눈 결정(snowflake) 형태로 수정
const SnowEffect: React.FC = () => {
  const snowflakes = useMemo(() => {
    // 입자 개수 조정 (기존보다 줄임: 15~22개 수준)
    return Array.from({ length: 18 }).map((_, i) => {
      // 눈 결정 크기 미세 상향 (10~18px 범위)
      const size = 10 + Math.random() * 8; 
      const left = Math.random() * 100; // 0~100%
      const duration = Math.random() * 5 + 10; // 10~15s (천천히)
      const delay = Math.random() * 10;
      const opacity = Math.random() * 0.4 + 0.4; // 0.4~0.8
      return (
        <div
          key={i}
          className="snowflake"
          style={{
            fontSize: `${size}px`,
            left: `${left}%`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
            opacity: opacity,
          }}
        >
          ❄
        </div>
      );
    });
  }, []);

  return <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">{snowflakes}</div>;
};

// 1. 실시간 시계 컴포넌트 분리
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
    <div className="serif-font font-black text-gray-900 flex-shrink-0 ml-4 text-lg md:text-lg text-sm">
      {formattedTime}
    </div>
  );
};

// 분위기 수동 선택 옵션 타입
type WeatherOverride = 'auto' | 'sunny' | 'rainy' | 'snowy';

// 날씨 및 분위기 조절 컴포넌트
const WeatherDisplay: React.FC<{ 
  onAtmosphereChange: (atmosphere: 'sunny' | 'rainy' | 'snowy') => void 
}> = ({ onAtmosphereChange }) => {
  const [location, setLocation] = useState(() => localStorage.getItem('donga_one_minute_location') || '서울');
  const [weatherData, setWeatherData] = useState<{ status: string; temp: number } | null>(null);
  const [override, setOverride] = useState<WeatherOverride>(() => (localStorage.getItem('donga_one_minute_weather_override') as WeatherOverride) || 'auto');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 날씨 데이터 기반 자동 분위기 계산
  const autoAtmosphere = useMemo(() => mapWeatherToAtmosphere(weatherData?.status), [weatherData]);

  // 최종 분위기 결정 및 적용
  useEffect(() => {
    const finalAtmosphere = override === 'auto' ? autoAtmosphere : override;
    document.documentElement.setAttribute('data-weather', finalAtmosphere);
    onAtmosphereChange(finalAtmosphere);
  }, [override, autoAtmosphere, onAtmosphereChange]);

  const fetchWeather = async (loc: string) => {
    setLoading(true);
    setError(false);
    try {
      const coords = CITY_COORDS[loc];
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current_weather=true`);
      const data = await response.json();
      if (data.current_weather) {
        const status = getWeatherStatus(data.current_weather.weathercode);
        setWeatherData({
          status: status,
          temp: Math.round(data.current_weather.temperature)
        });
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(location);
    const interval = setInterval(() => fetchWeather(location), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [location]);

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLoc = e.target.value;
    setLocation(newLoc);
    localStorage.setItem('donga_one_minute_location', newLoc);
  };

  const handleOverrideChange = (value: WeatherOverride) => {
    setOverride(value);
    localStorage.setItem('donga_one_minute_weather_override', value);
  };

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-2 mt-1">
        <select 
          value={location} 
          onChange={handleLocationChange}
          className="text-[10px] bg-transparent border-none font-bold text-gray-500 cursor-pointer focus:outline-none hover:text-gray-900 transition-colors"
        >
          {Object.keys(CITY_COORDS).map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
        <div className="serif-font font-medium text-gray-800 text-xs md:text-sm">
          {loading ? (
            "오늘의 날씨: 불러오는 중…"
          ) : error ? (
            "오늘의 날씨: 정보를 불러오지 못했습니다"
          ) : (
            <>
              오늘의 날씨: {location} · {weatherData?.status === '흐림' ? (
                <svg 
                  className={`weather-icon ${getWeatherClassName(weatherData.status)}`} 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  style={{ display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '2px' }}
                >
                  <path d="M17.5,19c3.037,0,5.5-2.463,5.5-5.5c0-2.822-2.128-5.151-4.881-5.466C17.062,5.185,14.3,3,11,3C7.54,3,4.646,5.346,3.864,8.513C2.18,9.453,1,11.23,1,13.25C1,16.425,3.575,19,6.75,19H17.5z" />
                </svg>
              ) : (
                <span 
                  className={`weather-icon ${getWeatherClassName(weatherData?.status)}`} 
                  style={{ fontSize: '1.2em', verticalAlign: 'middle' }}
                >
                  {getWeatherIcon(weatherData?.status || '')}
                </span>
              )} {weatherData?.status} · {weatherData?.temp}°C
            </>
          )}
        </div>
      </div>
      
      {/* 수동 분위기 선택 UI */}
      <div className="flex gap-1.5 mt-1.5">
        {(['auto', 'sunny', 'rainy', 'snowy'] as WeatherOverride[]).map((opt) => {
          const labelMap: Record<WeatherOverride, string> = { auto: '자동', sunny: '맑음', rainy: '비', snowy: '눈' };
          const isActive = override === opt;
          return (
            <button
              key={opt}
              onClick={() => handleOverrideChange(opt)}
              className={`text-[9px] font-bold px-1.5 py-0.5 border transition-all ${
                isActive 
                ? 'text-black border-black bg-gray-50' 
                : 'text-gray-400 border-gray-200 hover:border-gray-400'
              }`}
              style={{ 
                borderBottomWidth: isActive ? '2px' : '1px',
                borderColor: isActive ? ACCENT_COLOR : undefined 
              }}
            >
              {labelMap[opt]}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 2. 홈 화면 컴포넌트
interface HomeViewProps {
  articles: Article[];
  onNavigateToSpread: (category: string) => void;
  setView: (view: 'home' | 'paper') => void;
  isMobile: boolean;
}

const HomeView: React.FC<HomeViewProps> = ({ articles, onNavigateToSpread, setView, isMobile }) => {
  const heroArticle = articles[0];
  const gridArticles = articles.slice(1, 9);

  return (
    <div className="flex-grow overflow-y-auto bg-[#fbfbf7] custom-scroll transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 mb-10 md:mb-16">
          <div className="lg:col-span-2 cursor-pointer group" onClick={() => {
            onNavigateToSpread(heroArticle.category);
            setView('paper');
          }}>
            <div className="overflow-hidden mb-4 relative aspect-[16/9] bg-gray-100 border border-gray-200 transition-colors duration-300 article-image-container">
              <img src={heroArticle.imageUrl} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105" alt="" />
              <span className="absolute top-4 left-4 text-white text-[10px] font-black px-2 py-1 uppercase tracking-widest z-20" style={{ backgroundColor: ACCENT_COLOR }}>{heroArticle.category}</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-black serif-font mb-4 leading-tight group-hover:underline underline-offset-4">{heroArticle.title}</h2>
            <p className="text-gray-600 leading-relaxed line-clamp-3 serif-font">{heroArticle.shortBody}</p>
          </div>
          
          <aside className="border-l border-gray-200 pl-10 hidden lg:block transition-colors duration-300">
            <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-black pb-2 mb-6">가장 많이 본 기사</h3>
            <div className="space-y-6">
              {articles.slice(5, 10).map((a, i) => (
                <div key={i} className="cursor-pointer group" onClick={() => {
                  onNavigateToSpread(a.category);
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
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {gridArticles.map((a, i) => (
            <div key={i} className="cursor-pointer group" onClick={() => {
              onNavigateToSpread(a.category);
              setView('paper');
            }}>
              <div className="aspect-video bg-gray-100 mb-3 overflow-hidden border border-gray-200 transition-colors duration-300 article-image-container">
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

// 3. 신문 지면 화면 컴포넌트
interface NewspaperViewProps {
  currentSpread: Article[];
  catIdx: number;
  setCatIdx: (idx: any) => void;
  dragInfo: any;
  isAnimating: boolean;
  getRotation: () => number;
  onPointerDown: (e: React.PointerEvent, direction: 'next' | 'prev') => void;
  isGenerating: boolean;
  isMobile: boolean;
  maxIdx: number;
}

const NewspaperView: React.FC<NewspaperViewProps> = ({ 
  currentSpread, catIdx, setCatIdx, dragInfo, isAnimating, getRotation, onPointerDown, isGenerating, isMobile, maxIdx
}) => {
  const [mobileStep, setMobileStep] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const startPos = useRef({ x: 0, y: 0 });
  const isSwipingRef = useRef(false);
  const [showHint, setShowHint] = useState(() => !localStorage.getItem('swipeHintDismissed'));

  useEffect(() => {
    setMobileStep(0);
  }, [catIdx]);

  const handleNext = () => {
    if (mobileStep === 0 && currentSpread.length > 1) {
      setMobileStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (catIdx < maxIdx) {
      setCatIdx((prev: number) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (mobileStep === 1) {
      setMobileStep(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (catIdx > 0) {
      setCatIdx((prev: number) => prev - 1);
      setMobileStep(1); 
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isSwipingRef.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return;
    const dx = e.touches[0].clientX - startPos.current.x;
    const dy = e.touches[0].clientY - startPos.current.y;

    if (!isSwipingRef.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      isSwipingRef.current = true;
    }

    if (isSwipingRef.current) {
      setSwipeOffset(dx);
      if (e.cancelable) e.preventDefault();
    }
  };

  const onTouchEnd = () => {
    if (!isMobile) return;
    if (isSwipingRef.current) {
      if (swipeOffset < -60) handleNext();
      else if (swipeOffset > 60) handlePrev();
    }
    setSwipeOffset(0);
    isSwipingRef.current = false;
    if (showHint) {
      setShowHint(false);
      localStorage.setItem('swipeHintDismissed', 'true');
    }
  };

  if (isMobile) {
    return (
      <div 
        className="flex-grow stage flex-col relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="newspaper-container flex-grow" style={{ transform: `translateX(${swipeOffset}px)`, transition: swipeOffset === 0 ? 'transform 0.3s ease' : 'none' }}>
          <div className="page w-full min-h-[70vh]">
            <ArticleView article={currentSpread[mobileStep] || currentSpread[0]} />
            <div className="mt-8 text-center text-[10px] font-black opacity-50 uppercase tracking-widest serif-font">
              {mobileStep === 0 && currentSpread.length > 1 ? " 옆으로 넘겨 다음 기사" : (catIdx < maxIdx ? " 옆으로 넘겨 다음 섹션" : "마지막 기사입니다")}
            </div>
          </div>
        </div>

        {showHint && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-black/80 text-white px-5 py-2.5 rounded-full text-[11px] font-black z-[200] serif-font shadow-xl flex items-center gap-2">
            <span>← →</span> 옆으로 넘겨 기사 이동
          </div>
        )}

        {isGenerating && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1000] flex items-center justify-center">
            <div className="bg-white border-4 border-black p-8 shadow-2xl flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-t-transparent animate-spin mb-4" style={{ borderColor: `${ACCENT_COLOR} transparent ${ACCENT_COLOR} ${ACCENT_COLOR}` }}></div>
              <p className="serif-font font-black text-lg">기사를 작성하고 있습니다...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-grow stage relative">
      <div className="newspaper-container">
        <div className="central-crease"></div>
        {dragInfo.active && (
          <div className={`flipping-sheet ${isAnimating ? 'animating' : ''} ${dragInfo.direction === 'next' ? 'from-right' : 'from-left'}`} style={{ transform: `rotateY(${getRotation()}deg)` }}>
            <div className="w-full h-full opacity-40 border-x border-gray-300"></div>
          </div>
        )}
        <div className="page page-left custom-scroll">
          <ArticleView article={currentSpread[0]} />
          {catIdx > 0 && <div className="hotzone hotzone-left" onPointerDown={(e) => onPointerDown(e, 'prev')}><div className="fold-marker"></div></div>}
        </div>
        <div className="page page-right custom-scroll">
          <ArticleView article={currentSpread[1]} />
          {catIdx < maxIdx && <div className="hotzone hotzone-right" onPointerDown={(e) => onPointerDown(e, 'next')}><div className="fold-marker"></div></div>}
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
};

// 기사 본문 내 키워드 하이라이팅 컴포넌트
const HighlightedText: React.FC<{ text: string; keywords: string[] }> = ({ text, keywords }) => {
  if (!keywords || keywords.length === 0) return <>{text}</>;
  
  let parts: React.ReactNode[] = [text];
  let highlightedCount = 0;
  
  const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);

  for (const keyword of sortedKeywords) {
    if (highlightedCount >= 2) break;
    const nextParts: React.ReactNode[] = [];
    
    for (const part of parts) {
      if (typeof part !== 'string' || highlightedCount >= 2) {
        nextParts.push(part);
        continue;
      }
      
      const idx = part.indexOf(keyword);
      if (idx !== -1) {
        nextParts.push(part.substring(0, idx));
        nextParts.push(<span key={`kw-${highlightedCount}`} className="keyword-underline">{keyword}</span>);
        nextParts.push(part.substring(idx + keyword.length));
        highlightedCount++;
      } else {
        nextParts.push(part);
      }
    }
    parts = nextParts;
  }
  
  return <>{parts}</>;
};

const App: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>(ARTICLES_DATA);
  const [catIdx, setCatIdx] = useState(0);
  const [view, setView] = useState<'home' | 'paper'>('home');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [activeAtmosphere, setActiveAtmosphere] = useState<'sunny' | 'rainy' | 'snowy'>('sunny');
  
  const [isMagnifierOn, setIsMagnifierOn] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
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

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setIsMagnifierOn(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 초기 로딩 시 Supabase에서 오늘 날짜의 기사 불러오기
  useEffect(() => {
    const fetchArticlesFromDB = async () => {
      if (!supabase) return;
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('date', today);

        if (error) {
          console.error("Supabase fetch error:", error);
          return;
        }

        if (data && data.length > 0) {
          setArticles(prev => {
            const nextArticles = [...prev];
            data.forEach((row: any) => {
              const mapped: Article = {
                category: row.theme as any,
                title: row.title,
                lead: '',
                shortBody: row.content,
                body: '',
                contextBox: '',
                keywords: [],
                sourceName: row.source_text,
                sourceUrl: '#',
                imageAlt: row.title,
                imageUrl: row.image_url
              };

              // side 값에 따라 인덱스 매핑 (p1_left=0, p1_right=1, p2_left=2, p2_right=3)
              const side = row.side;
              let localIdx = -1;
              if (side === 'p1_left' || side === 'left') localIdx = 0;
              else if (side === 'p1_right' || side === 'right') localIdx = 1;
              else if (side === 'p2_left') localIdx = 2;
              else if (side === 'p2_right') localIdx = 3;

              if (localIdx === -1) return;

              const indices = nextArticles
                .map((a, i) => a.category === mapped.category ? i : -1)
                .filter(i => i !== -1);

              if (indices[localIdx] !== undefined) {
                nextArticles[indices[localIdx]] = mapped;
              } else {
                // 비어있는 곳 채우기 (데이터 순서 보정)
                const categoryArticles = nextArticles.filter(a => a.category === mapped.category);
                if (categoryArticles.length < localIdx) {
                    // 중간에 구멍이 난 경우 패딩은 하지 않음 (트리거가 보장한다고 가정)
                }
                nextArticles.push(mapped);
              }
            });
            // 카테고리별로 정렬 보장 필요 시 로직 추가 가능
            return nextArticles;
          });
        }
      } catch (err) {
        console.error("Initial load DB fetch error:", err);
      }
    };

    fetchArticlesFromDB();
  }, []);

  const allSpreads = useMemo(() => {
    const spreads: { category: string; articles: Article[] }[] = [];
    CATEGORIES.forEach(cat => {
      const filtered = articles.filter(a => a.category === cat);
      
      // Page 1 Spread
      spreads.push({
        category: cat,
        articles: [
          filtered[0] || ARTICLES_DATA.find(a => a.category === cat) || ARTICLES_DATA[0],
          filtered[1] || (filtered[0] ? ARTICLES_DATA.find(a => a.category === cat && a.title !== filtered[0].title) : null) || ARTICLES_DATA[1] || ARTICLES_DATA[0]
        ]
      });

      // Page 2 Spread (only if more than 2 articles exist)
      if (filtered.length > 2) {
        spreads.push({
          category: cat,
          articles: [
            filtered[2],
            filtered[3] // filtered[3] can be undefined
          ]
        });
      }
    });
    return spreads;
  }, [articles]);

  const currentSpreadData = useMemo(() => {
    return allSpreads[catIdx] || allSpreads[0];
  }, [allSpreads, catIdx]);

  const todaysFocus = useMemo(() => {
    const mainArticle = articles[0];
    return mainArticle ? mainArticle.title : "새로운 시대를 여는 동아 일분";
  }, [articles]);

  const cleanText = (text: string) => {
    if (typeof text !== 'string') return '';
    return text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

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

      // 단계 1: 텍스트 생성 + 카테고리 자동 분류
      while (retries <= MAX_RETRIES) {
        const textResponse = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: `입력 내용을 바탕으로 전문적인 신문 기사 헤드라인과 요약 본문을 한국어로 작성하세요. 
          또한 기사 내용을 분석하여 다음 중 가장 적절한 카테고리 하나를 자동으로 분류하세요: 국내, 해외, 경제, 스포츠, 엔터.
          
          제약 조건:
          1. "title": 18자~32자 사이의 강렬한 헤드라인.
          2. "shortBody": 띄어쓰기 포함 반드시 200자 이내. 줄바꿈 없이 단일 문단으로 구성.
          3. 원문을 그대로 복사하지 말고 새로운 문장으로 재구성.
          4. "keywords": 기사 내용을 대표하는 핵심 단어 3~5개를 배열 형태로 생성.
          5. "category": 반드시 '국내', '해외', '경제', '스포츠', '엔터' 중 하나로만 반환.
          
          반드시 아래 JSON 구조로만 응답하세요:
          {
            "title": "헤드라인 문자열",
            "shortBody": "200자 이내 요약 본문 문자열",
            "keywords": ["키워드1", "키워드2", "키워드3"],
            "image": {
              "prompt": "Detailed English prompt for a professional photo related to this topic",
              "alt": "Korean image description"
            },
            "sourceName": "출처명",
            "category": "분류된 카테고리 단어 하나"
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

      const targetCategory = (generatedData?.category as any) || CATEGORIES[0];

      // 기존 4칸 캡처
      const sameCategoryArticles = articles.filter(a => a.category === targetCategory);
      const prev1L = sameCategoryArticles[0] || null;
      const prev1R = sameCategoryArticles[1] || null;
      const prev2L = sameCategoryArticles[2] || null;

      // 텍스트 기사 객체 선행 생성 (이미지 없음)
      const textOnlyArticle: Article = {
        category: targetCategory,
        title: cleanText(generatedData.title),
        lead: '', 
        shortBody: cleanText(generatedData.shortBody).slice(0, 200),
        body: '', 
        contextBox: '',
        keywords: generatedData.keywords || [],
        sourceName: cleanText(generatedData.sourceName),
        sourceUrl: '#',
        imageAlt: cleanText(generatedData.image.alt),
        imageUrl: undefined,
      };

      // 기사 목록 즉시 업데이트 (Shift 규칙 적용)
      setArticles(prev => {
        const otherCategories = prev.filter(a => a.category !== targetCategory);
        
        // p1_left = new, p1_right = old p1_L, p2_left = old p1_R, p2_right = old p2_L
        const updatedSameCategory = [textOnlyArticle];
        if (prev1L) updatedSameCategory.push(prev1L);
        if (prev1R) updatedSameCategory.push(prev1R);
        if (prev2L) updatedSameCategory.push(prev2L);

        return [...updatedSameCategory, ...otherCategories];
      });

      // UI 즉시 전환
      setForm({ title: '', body: '', source: '', imageStyle: 'photo' });
      setIsEditorOpen(false);
      setIsGenerating(false);
      
      const firstSpreadIdx = allSpreads.findIndex(s => s.category === targetCategory);
      if (firstSpreadIdx !== -1) setCatIdx(firstSpreadIdx);
      setView('paper');

      // 단계 2: 이미지 백그라운드 생성 (비동기)
      const selectedStyle = STYLE_OPTIONS.find(opt => opt.value === form.imageStyle);
      const enhancedImagePrompt = `${generatedData.image.prompt}. Style: ${selectedStyle?.keywords}`;

      const generateAndSyncImage = async () => {
        try {
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

          if (generatedImageUrl) {
            const finalArticle = { ...textOnlyArticle, imageUrl: generatedImageUrl };
            setArticles(prev => prev.map(a => 
              (a.title === finalArticle.title && a.category === finalArticle.category) 
              ? finalArticle 
              : a
            ));

            if (supabase) {
              const today = new Date().toISOString().split('T')[0];
              const upsertData = async (article: Article, side: string) => {
                await supabase.from('articles').upsert({
                  date: today,
                  theme: targetCategory,
                  side: side,
                  title: article.title,
                  content: article.shortBody,
                  source_text: article.sourceName,
                  image_url: article.imageUrl
                }, { onConflict: 'date,theme,side' });
              };

              // 역순으로 upsert (p2_right -> p2_left -> p1_right -> p1_left)
              if (prev2L) await upsertData(prev2L, 'p2_right');
              if (prev1R) await upsertData(prev1R, 'p2_left');
              if (prev1L) await upsertData(prev1L, 'p1_right');
              await upsertData(finalArticle, 'p1_left');
            }
          }
        } catch (imgError) {
          console.error("이미지 생성 또는 저장 오류:", imgError);
        }
      };

      generateAndSyncImage();

    } catch (error) {
      console.error(error);
      alert("기사 생성 중 오류가 발생했습니다.");
      setIsGenerating(false);
    }
  };

  const onPointerDown = (e: React.PointerEvent, direction: 'next' | 'prev') => {
    if (isAnimating || isGenerating || isMobile) return;
    setDragInfo({ active: true, startX: e.clientX, currentX: e.clientX, direction });
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (isMagnifierOn) setMousePos({ x: e.clientX, y: e.clientY });
      if (!dragInfo.active || isMobile) return;
      setDragInfo(prev => ({ ...prev, currentX: e.clientX }));
    };

    const onPointerUp = () => {
      if (!dragInfo.active || isMobile) return;
      const deltaX = dragInfo.currentX - dragInfo.startX;
      const threshold = window.innerWidth * 0.25;
      const isSuccess = (dragInfo.direction === 'next' && deltaX < -threshold) || 
                       (dragInfo.direction === 'prev' && deltaX > threshold);

      if (isSuccess) {
        const nextDir = dragInfo.direction === 'next' ? 1 : -1;
        const canFlip = (nextDir === 1 && catIdx < allSpreads.length - 1) || (nextDir === -1 && catIdx > 0);
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
  }, [dragInfo, catIdx, allSpreads, isAnimating, isMagnifierOn, isMobile]);

  const getRotation = () => {
    if (!dragInfo.active || isMobile) return 0;
    const delta = dragInfo.currentX - dragInfo.startX;
    const maxRange = window.innerWidth * 0.5;
    let rotate = (delta / maxRange) * 180;
    if (dragInfo.direction === 'next') rotate = Math.max(-180, Math.min(0, rotate));
    else rotate = Math.max(0, Math.min(180, rotate));
    return rotate;
  };

  const onNavigateToSpread = (category: string) => {
    const idx = allSpreads.findIndex(s => s.category === category);
    if (idx !== -1) setCatIdx(idx);
  };

  const renderSharedNav = () => (
    <>
      <div className={`panel-overlay ${isEditorOpen ? 'open' : ''}`} onClick={() => !isGenerating && setIsEditorOpen(false)}></div>
      <aside className={`slide-panel flex flex-col ${isEditorOpen ? 'open' : ''}`} style={{ width: isMobile ? '100%' : '350px' }}>
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

      <header className="bg-[#fbfbf7] border-b-4 px-4 md:px-8 py-4 flex flex-col items-center shrink-0 z-50 transition-colors duration-300" style={{ borderBottomColor: ACCENT_COLOR }}>
        <div className="w-full max-w-6xl flex justify-between items-center mb-3 text-[9px] font-bold text-gray-500 tracking-tight border-b border-gray-100 pb-1 transition-colors duration-300">
          <div className="flex items-center gap-2 overflow-hidden">
            <button 
              onClick={toggleTheme}
              className="flex items-center gap-2 px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors duration-200 focus:outline-none"
              title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme === 'dark' ? '#F8FAFC' : '#1a1a1a' }}></div>
              <span className="text-[10px] font-bold">바탕색전환</span>
            </button>
            <span className="text-white px-1.5 py-0.5 font-black uppercase tracking-widest flex-shrink-0" style={{ backgroundColor: ACCENT_COLOR }}>TODAY'S FOCUS</span>
            <span className="serif-font italic text-gray-700 truncate hidden md:inline">“{todaysFocus}”</span>
          </div>
          <div className="flex flex-col items-end">
            <TimeDisplay />
            <WeatherDisplay onAtmosphereChange={setActiveAtmosphere} />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter serif-font uppercase mb-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setView('home')}>
          동아 일분
        </h1>
        <div className="w-full max-w-6xl flex justify-between items-center border-t pt-1 text-[10px] font-bold uppercase tracking-widest text-gray-700 relative transition-colors duration-300" style={{ borderTopColor: ACCENT_COLOR }}>
          <div className="flex gap-4">
             <button onClick={() => setView('home')} className={`hover:opacity-70 transition-colors ${view === 'home' ? 'underline' : 'text-gray-400'}`} style={{ color: view === 'home' ? ACCENT_COLOR : undefined }}>HOME</button>
             <span className="hidden md:inline">제 2025-0520호</span>
          </div>
          <span className="text-[9px] md:text-[10px] font-black tracking-normal serif-font absolute left-1/2 -translate-x-1/2 whitespace-nowrap">일분 만에 쓰고, 일분 만에 읽는 뉴스</span>
          <span className="hidden md:inline">THE INTELLIGENT DAILY POST</span>
        </div>
      </header>

      <nav className="bg-[#fbfbf7] border-b border-black shrink-0 z-40 transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-8 py-2">
          <div className="flex items-center gap-2 md:gap-4 flex-grow overflow-hidden">
            {!isMobile && (
              <button onClick={() => setIsMagnifierOn(!isMagnifierOn)} className={`p-1.5 transition-all border-2 ${isMagnifierOn ? 'text-white border-transparent shadow-inner scale-95' : 'bg-white text-black border-transparent hover:border-gray-300'}`} style={{ backgroundColor: isMagnifierOn ? ACCENT_COLOR : undefined }} title="돋보기 모드 (Esc로 해제)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </button>
            )}
            <div className="flex justify-start md:justify-center gap-4 md:gap-6 overflow-x-auto no-scrollbar scroll-smooth">
              {CATEGORIES.map((cat) => {
                const spreadIdx = allSpreads.findIndex(s => s.category === cat);
                const isActive = allSpreads[catIdx]?.category === cat;
                return (
                  <button key={cat} onClick={() => { if (!isGenerating && spreadIdx !== -1) { setCatIdx(spreadIdx); setView('paper'); } }} className={`text-[10px] md:text-xs font-bold whitespace-nowrap transition-all uppercase tracking-tighter hover:opacity-70`} style={{ color: (isActive && view === 'paper') ? ACCENT_COLOR : '#9ca3af', borderBottom: (isActive && view === 'paper') ? `2px solid ${ACCENT_COLOR}` : 'none' }}>
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={() => setIsEditorOpen(true)} className="text-white px-3 md:px-4 py-1.5 text-[9px] md:text-[10px] font-black uppercase hover:opacity-90 transition-colors whitespace-nowrap ml-2" style={{ backgroundColor: ACCENT_COLOR }}>기사 쓰기</button>
        </div>
      </nav>
    </>
  );

  const LENS_SIZE = 220;
  const ZOOM = 1.8;

  const renderMainLayout = () => (
    <div className={`flex flex-col ${isMobile ? 'min-h-screen overflow-y-auto' : 'h-screen overflow-hidden'} bg-[#d1d5db] transition-colors duration-300`}>
      {renderSharedNav()}
      {view === 'home' ? (
        <HomeView articles={articles} onNavigateToSpread={onNavigateToSpread} setView={setView} isMobile={isMobile} />
      ) : (
        <NewspaperView 
          currentSpread={currentSpreadData.articles} 
          catIdx={catIdx} 
          setCatIdx={setCatIdx} 
          dragInfo={dragInfo} 
          isAnimating={isAnimating} 
          getRotation={getRotation} 
          onPointerDown={onPointerDown} 
          isGenerating={isGenerating} 
          isMobile={isMobile} 
          maxIdx={allSpreads.length - 1}
        />
      )}
    </div>
  );

  return (
    <div className={`relative ${isMagnifierOn ? 'cursor-none' : ''}`}>
      {renderMainLayout()}
      {activeAtmosphere === 'rainy' && <RainEffect />}
      {activeAtmosphere === 'snowy' && <SnowEffect />}
      {!isMobile && isMagnifierOn && (
        <div 
          className="fixed pointer-events-none z-[9999]" 
          style={{ 
            width: `${LENS_SIZE}px`, 
            height: `${LENS_SIZE}px`, 
            left: `${mousePos.x - LENS_SIZE / 2}px`, 
            top: `${mousePos.y - LENS_SIZE / 2}px` 
          }}
        >
          <div className="magnifier-handle"></div>
          <div className="magnifier-glass">
            <div className="absolute bg-[#d1d5db]" style={{ width: '100vw', height: '100vh', transformOrigin: 'top left', transform: `scale(${ZOOM}) translate(${-mousePos.x + (LENS_SIZE / 2) / ZOOM}px, ${-mousePos.y + (LENS_SIZE / 2) / ZOOM}px)`, pointerEvents: 'none', userSelect: 'none' }}>
              {renderMainLayout()}
            </div>
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
      <div className="flex items-center justify-between border-b border-black mb-6 pb-1 transition-colors duration-300">
        <span className="text-[10px] font-black text-white px-2 py-0.5 tracking-widest uppercase" style={{ backgroundColor: ACCENT_COLOR }}>{article.category}</span>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">AI DAILY SPECIAL</span>
      </div>
      <h3 className="text-2xl md:text-3xl font-black serif-font mb-6 leading-tight break-keep">{article.title}</h3>
      <div className="w-full aspect-[16/10] bg-gray-200 border border-gray-300 mb-6 relative group z-20 transition-colors duration-300 article-image-container">
        {article.imageUrl ? <img src={article.imageUrl} alt={article.imageAlt} className="absolute inset-0 w-full h-full object-cover grayscale-[50%] group-hover:grayscale-0 transition-all duration-500 group-hover:scale-[1.2] group-hover:shadow-2xl z-10" /> : <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400 italic text-xs">이미지 생성 대기 중</div>}
        <div className="absolute bottom-0 left-0 right-0 bg-white/90 p-2 text-[9px] italic border-t border-gray-200 z-20 pointer-events-none transition-all duration-200 group-hover:opacity-0 group-hover:invisible">[사진] {article.imageAlt}</div>
      </div>
      <div className="flex-grow">
        <div className="text-base md:text-sm leading-[1.8] text-gray-800 text-justify serif-font">
          <p className="indent-4">
            <HighlightedText text={article.shortBody} keywords={article.keywords} />
          </p>
        </div>
      </div>
      <div className="mt-10 pt-4 border-t border-dotted border-gray-400 transition-colors duration-300 flex flex-wrap items-center gap-x-3">
        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest whitespace-nowrap">출처: {article.sourceName || '익명'}</span>
        {article.keywords && article.keywords.length > 0 && (
          <span className="text-sm font-medium text-gray-700 uppercase tracking-tight">
            · 핵심 키워드: {article.keywords.join(' · ')}
          </span>
        )}
      </div>
    </article>
  );
};

export default App;