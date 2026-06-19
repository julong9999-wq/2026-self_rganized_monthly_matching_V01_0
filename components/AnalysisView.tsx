
import React, { useState, useMemo } from 'react';
import { EtfData, CategoryKey, Dividend } from '../types';
import { LineChart, ArrowLeft, BarChart3, CircleAlert, X, Plus, Calendar, DollarSign, Percent, Info, Megaphone } from 'lucide-react';
import { getDynamicBaseDateStr } from '../utils/sheetHelpers';

interface Props {
  etfs: EtfData[];
  lastUpdated: Date | null;
  filterMode: 'period' | 'category';
  onAddToPortfolio?: (etf: EtfData) => void;
}

const CATEGORY_MAPPING: Record<string, string[]> = {
  '高息': ['0056', '00713', '00731', '00878', '00915', '00918', '00919', '00932'],
  '市值': ['00888', '00905', '00912', '00690', '00850', '00894', '00938', '009802', '009803', '009808'],
  '主題': ['00904', '00927', '00947', '00891', '00728', '00896', '00903', '00921'], 
  '主動': ['00980A', '00981A', '00982A', '00983A', '00984A', '00985A', '00986A', '00988A', '00989A'], 
  '國外': ['00908', '00956', '00960', '00771', '00712', '00972'],
  '國際': ['00645', '00646', '00662', '00757', '00762', '00830', '00885', '00893', '00895', '00909', '00910', '00911', '9910'],
  '半年': ['0050', '006203', '00702', '00733', '00735', '00736', '00858', '00882', '00913', '00922', '00923', '00928', '00935'],
};

const GRAY_CODES = [
  '00645', '00646', '00662', '00757', '00762', '00830', '00885', '00893', '00895', '00909', '00910', '00911',
  '00983A', '00986A'
];

const PERIOD_FILTERS = [
  { key: 'AA', label: '季一' },
  { key: 'AB', label: '季二' },
  { key: 'AC', label: '季三' },
  { key: 'AD', label: '月配' },
  { key: '債券', label: '債券' },
  { key: '國際', label: '國際' },
  { key: '半年', label: '半年' },
  { key: '主動', label: '主動' },
];

const CAT_FILTERS = [
  { key: '高息', label: '高息' },
  { key: '市值', label: '市值' },
  { key: '主題', label: '主題' },
  { key: '主動', label: '主動' },
  { key: '國外', label: '國外' },
  { key: '月配', label: '月配' },
  { key: '債券', label: '債券' },
  { key: '國際', label: '國際' },
  { key: '半年', label: '半年' },
];

const BOND_SPECIFIC_ORDER = [
  '00937B', '00772B', '00933B', '00773B', 
  '00720B', '00725B', '00724B',           
  '00679B', '00761B', '00795B',           
  '00687B', '00751B', '00792B'            
];

const getBondType = (code: string): CategoryKey => {
    const monthlyBonds = ['00937B', '00772B', '00933B', '00773B'];
    if (monthlyBonds.some(b => code.includes(b))) return 'AD';
    const groupQ1 = ['00720B', '00725B', '00724B'];
    if (groupQ1.some(b => code.includes(b))) return 'AA';
    const groupQ2 = ['00679B', '00761B', '00795B'];
    if (groupQ2.some(b => code.includes(b))) return 'AB';
    const groupQ3 = ['00687B', '00751B', '00792B'];
    if (groupQ3.some(b => code.includes(b))) return 'AC';
    return 'AC'; 
};

// --- Helpers ---
const getDateValue = (dateStr: string): number => {
    if (!dateStr) return 0;
    const cleanStr = dateStr.trim();
    if (/^\d{6}$/.test(cleanStr)) {
        const y = parseInt(cleanStr.substring(0, 4));
        const m = parseInt(cleanStr.substring(4, 6)) - 1;
        return new Date(y, m, 1).getTime();
    }
    const standardDate = new Date(cleanStr.replace(/\./g, '/').replace(/-/g, '/'));
    if (!isNaN(standardDate.getTime())) {
        return standardDate.getTime();
    }
    return 0;
};

const isFutureDate = (dateStr: string) => {
    const dateVal = getDateValue(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dateVal > today.getTime();
};

const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const cleanStr = dateStr.trim();
    let y = '', m = '', d = '';
    if (/^\d{8}$/.test(cleanStr)) {
         y = cleanStr.substring(0, 4);
         m = cleanStr.substring(4, 6);
         d = cleanStr.substring(6, 8);
         return `${y}/${m}/${d}`;
    }
    if (/^\d{6}$/.test(cleanStr)) {
        y = cleanStr.substring(0, 4);
        m = cleanStr.substring(4, 6);
        d = '01';
        return `${y}/${m}/${d}`;
    } 
    const parts = cleanStr.split(/[\/\.\-]/);
    if (parts.length >= 2) {
        y = parts[0];
        m = parts[1].padStart(2, '0');
        d = parts[2] ? parts[2].padStart(2, '0') : '01';
        return `${y}/${m}/${d}`;
    }
    return cleanStr;
};

const getCardStyle = (etf: EtfData) => {
    if (GRAY_CODES.includes(etf.code)) {
        return 'bg-slate-100 border-slate-300';
    }
    let type = etf.category;
    if (etf.category === 'AE') {
        type = getBondType(etf.code);
    }
    switch (type) {
        case 'AA': return 'bg-blue-50 border-blue-200';
        case 'AB': return 'bg-emerald-50 border-emerald-200';
        case 'AC': return 'bg-orange-50 border-orange-200';
        case 'AD': return 'bg-amber-50 border-amber-200';
        default: return 'bg-slate-100 border-slate-300';
    }
};

const AnalysisView: React.FC<Props> = ({ etfs, lastUpdated, filterMode, onAddToPortfolio }) => {
  const [activeFilterCat, setActiveFilterCat] = useState('高息');
  const [activeFilterPeriod, setActiveFilterPeriod] = useState('AA');

  const activeFilter = filterMode === 'period' ? activeFilterPeriod : activeFilterCat;
  
  const [selectedEtf, setSelectedEtf] = useState<EtfData | null>(null);
  const [chartEtf, setChartEtf] = useState<EtfData | null>(null);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [announcementFilter, setAnnouncementFilter] = useState<'quarterly' | 'monthly' | 'bond' | 'other'>('quarterly');

  // --- Filtering Logic ---
  const filteredEtfs = useMemo(() => {
      let result: EtfData[] = [];
      if (filterMode === 'period') {
          if (['AA', 'AB', 'AC', 'AD'].includes(activeFilter)) {
              result = etfs.filter(e => e.category === activeFilter);
          } else if (activeFilter === '債券') {
              result = etfs.filter(e => e.category === 'AE');
          } else {
              const targetCodes = CATEGORY_MAPPING[activeFilter] || [];
              result = etfs.filter(e => targetCodes.some(code => e.code.includes(code)));
          }
      } else {
          if (activeFilter === '月配') {
              result = etfs.filter(e => e.category === 'AD');
          } else if (activeFilter === '債券') {
              result = etfs.filter(e => e.category === 'AE');
          } else {
              const targetCodes = CATEGORY_MAPPING[activeFilter] || [];
              result = etfs.filter(e => targetCodes.some(code => e.code.includes(code)));
          }
      }

      // Sort
      if (activeFilter === '債券') {
          result.sort((a, b) => {
              const indexA = BOND_SPECIFIC_ORDER.indexOf(a.code);
              const indexB = BOND_SPECIFIC_ORDER.indexOf(b.code);
              if (indexA !== -1 && indexB !== -1) return indexA - indexB;
              if (indexA !== -1) return -1;
              if (indexB !== -1) return 1;
              return a.code.localeCompare(b.code);
          });
      } else {
          result.sort((a,b) => a.code.localeCompare(b.code));
      }
      return result;
  }, [etfs, activeFilter, filterMode]);

  const displayDate = etfs.length > 0 && etfs[0].dataDate ? etfs[0].dataDate : '最新股價';

  // --- Announcement Logic ---
  const upcomingDividends = useMemo(() => {
    const list: any[] = [];
    etfs.forEach(etf => {
        etf.dividends.forEach(div => {
            if (isFutureDate(div.date)) {
                const yieldVal = etf.priceCurrent > 0 
                    ? ((div.amount / etf.priceCurrent) * 100).toFixed(2) 
                    : "0.00";
                list.push({
                    etfCode: etf.code,
                    etfName: etf.name,
                    category: etf.category,
                    priceCurrent: etf.priceCurrent,
                    date: div.date,
                    amount: div.amount,
                    singleYield: yieldVal
                });
            }
        });
    });
    return list.sort((a, b) => getDateValue(a.date) - getDateValue(b.date));
  }, [etfs]);

  const filteredAnnouncements = useMemo(() => {
      return upcomingDividends.filter(item => {
          if (announcementFilter === 'bond') return item.category === 'AE';
          if (announcementFilter === 'monthly') return item.category === 'AD';
          if (announcementFilter === 'quarterly') return ['AA', 'AB', 'AC'].includes(item.category);
          if (announcementFilter === 'other') return item.category === 'AF';
          return false;
      });
  }, [upcomingDividends, announcementFilter]);

  const renderAnnouncementsModal = () => {
      if (!showAnnouncements) return null;
      return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 animate-[slideIn_0.2s_ease-out]">
            <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-black/5 bg-white/60 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowAnnouncements(false)} className="p-2 hover:bg-black/5 rounded-full">
                        <ArrowLeft className="w-6 h-6 text-slate-700" />
                    </button>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-red-500" />
                        配息公告
                    </h2>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto w-full">
                <div className="px-3 pb-3 pt-3">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
                        {[{id: 'quarterly', label: '季配息'}, {id: 'monthly', label: '月配息'}, {id: 'bond', label: '債券型'}, {id: 'other', label: '其他'}].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setAnnouncementFilter(opt.id as any)}
                                className={`flex-1 min-w-[70px] py-1.5 rounded-lg font-bold text-xs transition-all border whitespace-nowrap ${
                                    announcementFilter === opt.id 
                                    ? 'bg-blue-900 text-white border-blue-900 shadow-md' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {filteredAnnouncements.length > 0 ? (
                        <div className="space-y-3 pb-8">
                            {filteredAnnouncements.map((item, idx) => (
                                <div key={`${item.etfCode}-${idx}`} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex justify-between items-center">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-[16px] font-bold text-blue-900">{item.etfCode}</span>
                                            <span className="text-[12px] text-slate-600 truncate max-w-[150px]">{item.etfName}</span>
                                        </div>
                                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                                            即將除息
                                        </span>
                                    </div>
                                    <div className="p-3">
                                        <div className="grid grid-cols-4 gap-1 text-center items-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-light text-slate-400 mb-1 flex items-center gap-0.5"><Calendar className="w-3 h-3" /> 日期</span>
                                                <span className="text-[14px] font-bold text-slate-800 bg-slate-100 px-1 py-0.5 rounded">{item.date}</span>
                                            </div>
                                            <div className="flex flex-col items-center border-l border-slate-100">
                                                <span className="text-[10px] font-light text-slate-400 mb-1 flex items-center gap-0.5"><DollarSign className="w-3 h-3" /> 金額</span>
                                                <span className="text-[14px] font-bold text-slate-900">{item.amount}</span>
                                            </div>
                                            <div className="flex flex-col items-center border-l border-slate-100">
                                                <span className="text-[10px] font-light text-slate-400 mb-1 flex items-center gap-0.5"><Percent className="w-3 h-3" /> 殖利率</span>
                                                <span className="text-[14px] font-bold text-red-600">{item.singleYield}%</span>
                                            </div>
                                            <div className="flex flex-col items-center border-l border-slate-100">
                                                <span className="text-[10px] font-light text-slate-400 mb-1 flex items-center gap-0.5"><Info className="w-3 h-3" /> 狀態</span>
                                                <span className="text-[12px] font-bold text-white bg-red-400 px-1 py-0.5 rounded shadow-sm">預估</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <div className="bg-slate-100 p-4 rounded-full">
                                <Calendar className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-sm">目前此分類無即將配息資料</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      );
  };


  // --- Chart Modal ---
  const renderChartModal = () => {
    if (!chartEtf) return null;
    const historyAsc = [...(chartEtf.priceHistory || [])].sort((a, b) => getDateValue(a.date) - getDateValue(b.date));
    const dataPoints = historyAsc.length > 0 
        ? historyAsc 
        : [ { date: getDynamicBaseDateStr(), price: chartEtf.priceBase }, { date: 'Latest', price: chartEtf.priceCurrent } ];

    const startDateVal = getDateValue(dataPoints[0].date);
    const chartData = dataPoints.map(pt => {
        const ptDateVal = getDateValue(pt.date);
        const accumulatedDivs = chartEtf.dividends
            .filter(d => {
                const dVal = getDateValue(d.date);
                return dVal >= startDateVal && dVal <= ptDateVal;
            })
            .reduce((sum, d) => sum + d.amount, 0);
        return {
            ...pt,
            totalPrice: pt.price + accumulatedDivs
        };
    });

    const allPrices = chartData.flatMap(d => [d.price, d.totalPrice]);
    const maxY = Math.max(...allPrices) * 1.02;
    const minY = Math.min(...allPrices) * 0.98;
    const rangeY = maxY - minY || 1;
    const count = chartData.length;

    const getX = (index: number) => count <= 1 ? 50 : (index / (count - 1)) * 100;
    const getY = (val: number) => 100 - ((val - minY) / rangeY) * 100;

    const pointsPrice = chartData.map((d, i) => `${getX(i)},${getY(d.price)}`).join(' ');
    const pointsTotal = chartData.map((d, i) => `${getX(i)},${getY(d.totalPrice)}`).join(' ');

    const tableData = [...chartData].reverse().map((curr, idx, arr) => {
        const prev = arr[idx + 1];
        let rate = 0;
        if (prev && prev.price > 0) rate = ((curr.price - prev.price) / prev.price) * 100;
        return { date: curr.date, price: curr.price, rate: rate };
    });

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-[fadeIn_0.2s_ease-out]">
            <div className="h-12 bg-white flex items-center justify-between px-4 border-b border-slate-100">
                 <h3 className="font-bold text-slate-800 text-lg">{chartEtf.code} 股價趨勢分析</h3>
                 <button onClick={() => setChartEtf(null)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                    <X className="w-5 h-5" />
                 </button>
            </div>
            <div className="w-full bg-white border-b border-slate-100 relative" style={{ aspectRatio: '2/1' }}>
                <div className="absolute top-2 right-4 flex flex-col items-end text-[10px] text-slate-500 gap-1 z-10">
                    <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-red-500"></div>含息股價</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-blue-500"></div>股價</div>
                </div>
                <div className="w-full h-full p-4 relative">
                     <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <line x1="0" y1="0" x2="100" y2="0" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="0" y1="25" x2="100" y2="25" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="0" y1="75" x2="100" y2="75" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="0" y1="100" x2="100" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                        <polyline fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pointsTotal} />
                        <polyline fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pointsPrice} />
                     </svg>
                     <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                         <span>{formatDate(chartData[0]?.date)}</span>
                         <span>{formatDate(chartData[chartData.length-1]?.date)}</span>
                     </div>
                </div>
            </div>
            <div className="flex-1 bg-slate-50 p-4 overflow-y-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[12px] font-light text-slate-500 border-b border-slate-200">
                            <th className="py-2 text-left font-light">日期</th>
                            <th className="py-2 text-right font-light">股價</th>
                            <th className="py-2 text-right font-light">報酬率(不含息)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row, idx) => (
                            <tr key={idx} className="border-b border-slate-200/50">
                                <td className="py-3 text-[18px] text-slate-800 font-light">{formatDate(row.date)}</td>
                                <td className="py-3 text-[18px] text-slate-800 font-light text-right">{row.price.toFixed(2)}</td>
                                <td className={`py-3 text-[18px] font-light text-right ${row.rate > 0 ? 'text-red-600' : row.rate < 0 ? 'text-green-600' : 'text-slate-800'}`}>
                                    {row.rate !== 0 ? `${row.rate.toFixed(2)}%` : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  // --- Detail Modal ---
  const renderDetailModal = () => {
      if (!selectedEtf) return null;
      const cardColorClass = getCardStyle(selectedEtf).split(' ')[0];
      
      const allSortedDividends = [...selectedEtf.dividends].sort((a, b) => getDateValue(b.date) - getDateValue(a.date));
      const oneYearAgoTime = new Date().getTime() - (365 * 24 * 60 * 60 * 1000);

      return (
        <div className={`fixed inset-0 z-50 flex flex-col ${cardColorClass} animate-[slideIn_0.2s_ease-out]`}>
            <div className="h-16 shrink-0 flex items-center px-4 border-b border-black/5 gap-3 bg-white/60 backdrop-blur-sm">
                  <button onClick={() => setSelectedEtf(null)} className="p-2 hover:bg-black/5 rounded-full">
                      <ArrowLeft className="w-6 h-6 text-slate-700" />
                  </button>
                  <div className="flex-1">
                      <h2 className="text-lg font-bold text-slate-800">{selectedEtf.code} {selectedEtf.name}</h2>
                      <span className="text-xs text-slate-500">所有股息資料</span>
                  </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                 <div className="bg-white/80 rounded-xl shadow-sm border border-black/5 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-slate-500 text-xs border-b border-slate-200/50 bg-white">
                                <th className="py-3 px-3 text-left font-medium">配息日期</th>
                                <th className="py-3 px-3 text-right font-medium">配息金額</th>
                                <th className="py-3 px-3 text-right font-medium">單次殖利率</th>
                                <th className="py-3 px-3 text-right font-medium">股利發放</th>
                            </tr>
                        </thead>
                        <tbody>
                             {allSortedDividends.length > 0 ? (
                                allSortedDividends.map((div, idx) => {
                                    const isFuture = isFutureDate(div.date);
                                    const divTime = getDateValue(div.date);
                                    const isWithinYear = divTime >= oneYearAgoTime && !isFuture;
                                    
                                    let rowBgClass = "bg-white";
                                    if (isFuture) rowBgClass = "bg-red-50";
                                    else if (isWithinYear) rowBgClass = "bg-emerald-50";

                                    const yieldVal = selectedEtf.priceCurrent > 0 
                                        ? ((div.amount / selectedEtf.priceCurrent) * 100).toFixed(2) 
                                        : "0.00";

                                    return (
                                        <tr key={idx} className={`border-b border-slate-100/50 ${rowBgClass}`}>
                                            <td className="py-3 px-3 text-slate-800 font-medium text-sm">{div.date}</td>
                                            <td className="py-3 px-3 text-right text-slate-800 font-bold text-sm">
                                                {div.amount.toFixed(3)}
                                            </td>
                                            <td className="py-3 px-3 text-right text-blue-600 font-medium text-sm">{yieldVal}%</td>
                                            <td className="py-3 px-3 text-right text-xs">
                                                {div.paymentDate ? (
                                                    <span className={`font-medium ${isFuture ? 'text-red-600' : 'text-slate-600'}`}>
                                                        {div.paymentDate}
                                                    </span>
                                                ) : (
                                                    isFuture ? <span className="text-red-600 font-bold">預估</span> : <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                             ) : (
                                <tr><td colSpan={4} className="py-8 text-center text-slate-400 bg-white">無配息資料</td></tr>
                             )}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
      );
  };

  const currentTabs = filterMode === 'period' ? PERIOD_FILTERS : CAT_FILTERS;
  const currentActive = filterMode === 'period' ? activeFilterPeriod : activeFilterCat;

  const handleTabClick = (key: string) => {
      if (filterMode === 'period') setActiveFilterPeriod(key);
      else setActiveFilterCat(key);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* A1 + A2 Fixed Header */}
      <div className="shrink-0 z-10 bg-slate-50 shadow-sm border-b border-slate-200">
         {/* A1: Base Date & Data Date */}
         <div className="h-16 bg-white px-4 flex justify-between items-center">
             <div className="flex items-center gap-5">
                 <div className="flex items-baseline gap-2 flex-shrink-0">
                    <span className="text-[13px] text-slate-400 font-bold">基準</span>
                    <span className="text-[14px] text-slate-600 font-bold">{getDynamicBaseDateStr()}</span>
                 </div>
                 <div className="flex items-baseline gap-2 flex-shrink-0">
                    <span className="text-[13px] text-slate-400 font-bold">最新</span>
                    <span className="text-[14px] text-blue-900 font-bold">{displayDate}</span>
                 </div>
             </div>
             <div>
                <button 
                  onClick={() => setShowAnnouncements(true)}
                  className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-red-100 transition-colors flex items-center gap-1.5 flex-shrink-0"
                >
                    <Megaphone className="w-4 h-4" />
                    配息公告
                </button>
             </div>
         </div>

         {/* A2: Filter Buttons */}
         <div className="bg-white pb-2 px-2 pt-0 flex gap-2 overflow-x-auto scrollbar-hide">
            {currentTabs.map((f) => (
                <button
                    key={f.key}
                    onClick={() => handleTabClick(f.key)}
                    className={`
                      flex-shrink-0 px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap border
                      ${currentActive === f.key 
                        ? 'bg-blue-900 text-white border-blue-900 shadow-sm' 
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}
                `}
                >
                    {f.label}
                </button>
            ))}
         </div>
      </div>

      {/* A3: List Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-hide">
         {filteredEtfs.length > 0 ? (
             filteredEtfs.map(etf => {
                 const cardStyle = getCardStyle(etf);
                 const estYieldDisplay = etf.estYield > 0 
                    ? `${etf.estYield}%` 
                    : <span className="text-slate-300">-</span>;
                 
                 return (
                     <div key={etf.code} className={`rounded-lg p-2 shadow-sm border flex flex-col gap-0.5 ${cardStyle}`}>
                         {/* Row 1: Stock Code / Name / Chart Button */}
                         <div className="flex justify-between items-center border-b border-black/5 pb-1 mb-0.5">
                            <div className="flex items-baseline gap-2 overflow-hidden">
                                <span className="text-[20px] font-bold text-blue-700 whitespace-nowrap">{etf.code}</span>
                                <span className="text-[18px] font-light text-slate-500 truncate">{etf.name}</span>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setChartEtf(etf); }}
                                className="w-9 h-9 flex items-center justify-center bg-white/80 border border-slate-300 rounded-lg hover:bg-slate-50 shrink-0 ml-2 shadow-sm"
                                title="股價趨勢分析"
                            >
                                <BarChart3 className="w-5 h-5 text-slate-600" />
                            </button>
                         </div>

                         {/* Row 2: Price / Yield / Return / Add Button */}
                         <div className="grid grid-cols-[32%_22%_30%_16%] items-center gap-0 leading-tight py-1 divide-x divide-slate-200/60">
                            <div className="text-left flex flex-col px-1">
                                <span className="text-[10px] font-light text-slate-500 mb-0.5">最近股價</span>
                                <span className="text-[18px] font-bold text-slate-900 leading-none">{etf.priceCurrent}</span>
                            </div>
                            <div className="text-center flex flex-col px-1">
                                <span className="text-[10px] font-light text-slate-500 mb-0.5">殖利率</span>
                                <span className="text-[18px] font-bold text-slate-900 leading-none">{etf.dividendYield}%</span>
                            </div>
                            <div className="text-right flex flex-col px-1 pr-2">
                                <span className="text-[10px] font-light text-slate-500 mb-0.5">報酬率</span>
                                <span className={`text-[18px] font-bold leading-none ${etf.returnRate >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {etf.returnRate}%
                                </span>
                            </div>
                            <div className="text-right flex justify-end px-1">
                                {/* Button: Add to Watchlist (Plus) */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAddToPortfolio?.(etf); }}
                                    className="w-10 h-9 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors border border-emerald-200 shadow-sm"
                                    title="加入自組月配"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                         </div>

                         {/* Row 3: Base Price / Est Yield / Total Return / Detail Button */}
                         <div className="grid grid-cols-[32%_22%_30%_16%] items-center gap-0 bg-white/40 -mx-2 px-2 py-1.5 rounded-b-lg mt-0.5 leading-tight divide-x divide-slate-200/60">
                            <div className="text-left flex flex-col px-1">
                                <span className="text-[10px] font-light text-slate-500 mb-0.5">基準股價</span>
                                <span className="text-[16px] font-light text-slate-700 leading-none">{etf.priceBase}</span>
                            </div>
                            <div className="text-center flex flex-col px-1">
                                <span className="text-[10px] font-light text-slate-500 mb-0.5">預估殖利率</span>
                                <span className="text-[16px] font-light text-slate-700 leading-none">{estYieldDisplay}</span>
                            </div>
                            <div className="text-right flex flex-col px-1 pr-2">
                                <span className="text-[10px] font-light text-slate-500 mb-0.5">含息報酬</span>
                                <span className={`text-[16px] font-light leading-none ${etf.totalReturn >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {etf.totalReturn}%
                                </span>
                            </div>
                            <div className="text-right flex justify-end px-1">
                                {/* Button: Detail (CircleAlert) */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setSelectedEtf(etf); }}
                                    className="w-10 h-9 flex items-center justify-center bg-white/60 text-slate-700 rounded-lg hover:bg-white hover:text-black transition-colors border border-black/10 shadow-sm"
                                    title="股息資料"
                                >
                                     <CircleAlert className="w-5 h-5" />
                                </button>
                            </div>
                         </div>
                     </div>
                 );
             })
         ) : (
            <div className="py-12 text-center text-slate-400 text-sm">
                目前分類無資料
            </div>
         )}
      </div>

      {/* Modals */}
      {renderDetailModal()}
      {renderChartModal()}
      {renderAnnouncementsModal()}

    </div>
  );
};

export default AnalysisView;

