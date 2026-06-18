
import React, { useState, useMemo } from 'react';
import { EtfData, CategoryKey, PortfolioItem } from '../types';
import { Megaphone, Calendar, DollarSign, Percent, Info, CalendarCheck, TrendingUp, Minus, Plus, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
  etfs: EtfData[];
  portfolio: PortfolioItem[];
}

type FilterType = 'quarterly' | 'monthly' | 'bond' | 'other';

// Date Parsing Helper (與 PerformanceView 保持一致)
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

const formatMoney = (val: number) => Math.round(val).toLocaleString('en-US');
const formatShare = (val: number) => Math.round(val).toLocaleString('en-US');
const formatPrice = (val: number) => val.toFixed(2);
const getColor = (val: number) => val > 0 ? 'text-red-600' : val < 0 ? 'text-green-600' : 'text-slate-600';

const DailyAnalysisView: React.FC<Props> = ({ etfs, portfolio }) => {
  const [filter, setFilter] = useState<FilterType>('quarterly');
  const [expandedAnalysis, setExpandedAnalysis] = useState<string[]>([]);

  const toggleAnalysis = (key: string) => {
      setExpandedAnalysis(prev => 
          prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      );
  };

  const analysisData = useMemo(() => {
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      
      const currentYear = todayDate.getFullYear();
      const currentMonth = todayDate.getMonth();
      const currentMonthDividendsList: any[] = [];
      let totalCurrentMonthIncome = 0;
      let totalTodayDividendIncome = 0;
      let todayDividendsList: any[] = [];
      
      const dailyPerformanceList: any[] = [];
      let totalDailyChangeValue = 0;

      const parseDateSimple = (dateStr: string): number => {
          if (!dateStr) return 0;
          const cleanStr = dateStr.trim();
          if (/^\d{8}$/.test(cleanStr)) {
               const y = parseInt(cleanStr.substring(0, 4));
               const m = parseInt(cleanStr.substring(4, 6)) - 1;
               const d = parseInt(cleanStr.substring(6, 8));
               return new Date(y, m, d).getTime();
          }
          const parts = cleanStr.split(/[\/\-]/);
          if (parts.length === 2 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))) {
               const y = currentYear;
               const m = parseInt(parts[0]) - 1;
               const d = parseInt(parts[1]);
               return new Date(y, m, d).getTime();
          }
          const standardDate = new Date(cleanStr.replace(/\./g, '/').replace(/-/g, '/'));
          return isNaN(standardDate.getTime()) ? 0 : standardDate.getTime();
      };

      portfolio.forEach(item => {
          const totalShares = item.transactions.reduce((s, tx) => s + tx.shares, 0);
          
          let prevPrice = item.etf.priceBase;
          const history = item.etf.priceHistory || [];
          if (history.length > 0) {
              const sortedHistory = [...history].sort((a,b) => parseDateSimple(a.date) - parseDateSimple(b.date));
              const lastHistoryItem = sortedHistory[sortedHistory.length - 1];

              if (lastHistoryItem.price === item.etf.priceCurrent) {
                  if (sortedHistory.length >= 2) {
                      prevPrice = sortedHistory[sortedHistory.length - 2].price;
                  } else {
                      if (item.etf.priceBase > 0 && item.etf.priceBase !== item.etf.priceCurrent) {
                          prevPrice = item.etf.priceBase;
                      } else {
                          prevPrice = item.etf.priceCurrent;
                      }
                  }
              } else {
                  prevPrice = lastHistoryItem.price;
              }
          }

          const changePrice = item.etf.priceCurrent - prevPrice;
          const changeValue = changePrice * totalShares;

          if (totalShares > 0) {
              totalDailyChangeValue += changeValue;
              dailyPerformanceList.push({
                  id: item.id,
                  name: item.etf.name,
                  shares: totalShares,
                  changePrice: changePrice,
                  changeValue: changeValue,
                  prevPrice: prevPrice
              });
          }

          if (totalShares > 0) {
              const monthlyDivs = item.etf.dividends.filter(d => {
                  const dVal = parseDateSimple(d.date);
                  if (dVal === 0) return false;
                  const dDate = new Date(dVal);
                  return dDate.getFullYear() === currentYear && dDate.getMonth() === currentMonth;
              });

              monthlyDivs.forEach(d => {
                  const income = totalShares * d.amount;
                  totalCurrentMonthIncome += income;
                  
                  const dVal = parseDateSimple(d.date);
                  const dDate = new Date(dVal);
                  if (dDate.getDate() === todayDate.getDate()) {
                      totalTodayDividendIncome += income;
                      todayDividendsList.push({
                          id: item.id,
                          name: item.etf.name,
                          shares: totalShares,
                          unitAmount: d.amount,
                          totalAmount: income,
                          date: d.date,
                          paymentDate: d.paymentDate
                      });
                  }

                  currentMonthDividendsList.push({
                      id: item.id,
                      name: item.etf.name,
                      shares: totalShares,
                      unitAmount: d.amount,
                      totalAmount: income,
                      date: d.date,
                      paymentDate: d.paymentDate
                  });
              });
          }
      });
      
      currentMonthDividendsList.sort((a,b) => parseDateSimple(a.date) - parseDateSimple(b.date));
      dailyPerformanceList.sort((a, b) => b.changeValue - a.changeValue);

      // --- 新增：年度績效分析 (依照使用者要求公式) ---
      const perfMonths: { label: string; perf: number; yield: number; total: number; y: number; m: number }[] = [];
      
      const monthsToProcess: {y: number, m: number, label: string}[] = [];
      const START_YEAR = 2026;
      for (let y = START_YEAR; y <= currentYear; y++) {
          const mEnd = (y === currentYear) ? currentMonth : 11;
          for (let m = 0; m <= mEnd; m++) {
               monthsToProcess.push({ y, m, label: `${y}/${String(m + 1).padStart(2, '0')}` });
          }
      }

      const getPricesInMonth = (history: any[], year: number, month: number) => {
          return history.filter(h => {
              const d = new Date(parseDateSimple(h.date));
              return d.getFullYear() === year && d.getMonth() === month;
          });
      };

      const getLatestPriceInMonth = (history: any[], year: number, month: number, fallback: number) => {
          const inMonth = getPricesInMonth(history, year, month);
          if (inMonth.length > 0) return inMonth[inMonth.length - 1].price;
          return fallback;
      };

      // 紀錄每個月的 月底庫存 (做為下個月的上月底庫存)
      const endValuesMap: Record<string, number> = {};

      monthsToProcess.forEach(({y, m, label}) => {
           let valStart = 0;
           let valEoM = 0;
           let purchaseMonth = 0;
           let dividendMonth = 0;

           // 當月時間範圍
           const monthStartTs = new Date(y, m, 1, 0, 0, 0).getTime();
           let monthEndTs = new Date(y, m + 1, 0, 23, 59, 59).getTime();

           portfolio.forEach(item => {
                const history = item.etf.priceHistory || [];
                const sortedHistory = [...history].sort((a,b) => parseDateSimple(a.date) - parseDateSimple(b.date));
                
                // 本月淨買進金額
                let itemPurchase = 0;
                item.transactions.forEach(tx => {
                    const txTs = parseDateSimple(tx.date);
                    if (txTs >= monthStartTs && txTs <= monthEndTs) {
                         itemPurchase += tx.totalAmount;
                    }
                });
                purchaseMonth += itemPurchase;

                // 本月股息
                item.etf.dividends.forEach(d => {
                    const dTs = parseDateSimple(d.date);
                    if (dTs >= monthStartTs && dTs <= monthEndTs) {
                        const sharesAtExDiv = item.transactions.filter(tx => parseDateSimple(tx.date) <= dTs).reduce((s, tx) => s + tx.shares, 0);
                        dividendMonth += sharesAtExDiv * d.amount;
                    }
                });

                // 本月底庫存 (月底庫存張數 * 當月最後一個交易日股價)
                // 從 sortedHistory 找 2026-01-30 左右的股價。這裡用 getLatestPriceInMonth，它會抓該月最後一筆資料。
                const sharesEoM = item.transactions.filter(tx => parseDateSimple(tx.date) <= monthEndTs).reduce((s, tx) => s + tx.shares, 0);
                let priceEoM = getLatestPriceInMonth(sortedHistory, y, m, item.etf.priceBase);
                if (m === currentMonth && y === currentYear) {
                    priceEoM = item.etf.priceCurrent; // 當月用最新價格
                }
                valEoM += sharesEoM * priceEoM;

                // 若為 2026/01，月初庫存 特殊處理
                if (y === 2026 && m === 0) {
                    const janPrices = getPricesInMonth(sortedHistory, 2026, 0);
                    // 根據使用者說明： 月初庫存=2026-01-02 庫存張數*當日股價
                    let firstDayTs = parseDateSimple("2026-01-02"); 
                    let priceStart = item.etf.priceBase;
                    
                    // 嘗試從歷史紀錄找到第一筆作為初日資料
                    if (janPrices.length > 0) {
                        if (janPrices.length > 1) {
                            priceStart = janPrices[0].price;
                            firstDayTs = parseDateSimple(janPrices[0].date);
                        } else {
                            // 如果一月只有一筆資料 (可能是 1/30)，月初價格就不要等於月底價格，可以往前找或者依賴 priceBase (發行價) 
                            // 這裡直接嘗試取前一筆，或是就用發行價
                            priceStart = item.etf.priceBase;
                            firstDayTs = parseDateSimple("2026-01-02");
                        }
                    }

                    // 強制檢查是否有指定日期的資料 "2026-01-02"
                    const preciseDay = sortedHistory.find(h => parseDateSimple(h.date) === parseDateSimple("2026-01-02"));
                    if (preciseDay) {
                        priceStart = preciseDay.price;
                        firstDayTs = parseDateSimple("2026-01-02");
                    }

                    const sharesStart = item.transactions.filter(tx => parseDateSimple(tx.date) <= firstDayTs).reduce((s, tx) => s + tx.shares, 0);
                    valStart += sharesStart * priceStart;
                }
           });

           endValuesMap[label] = valEoM;

           let perfMonth = 0;
           if (y === 2026 && m === 0) {
               // 2026/01 績效 = 月底庫存 - 月初庫存(由年初資料代替) - 本月購賣
               perfMonth = valEoM - valStart - purchaseMonth;
           } else {
               // 2026/02 以後 績效 = 本月月底庫存 - 上個月底庫存 - 本月購賣
               let prevM = m - 1;
               let prevY = y;
               if (prevM < 0) { prevM = 11; prevY--; }
               const prevLabel = `${prevY}/${String(prevM + 1).padStart(2, '0')}`;
               const prevValEoM = endValuesMap[prevLabel] || 0;
               perfMonth = valEoM - prevValEoM - purchaseMonth;
           }

           perfMonths.push({
               label,
               perf: Math.round(perfMonth),
               yield: Math.round(dividendMonth),
               total: Math.round(perfMonth + dividendMonth),
               y, m
           });
      });

      return {
          currentMonthDividendsList,
          dailyPerformanceList,
          totalCurrentMonthIncome,
          totalDailyChangeValue,
          totalTodayDividendIncome,
          todayDividendsList,
          perfMonths,
      };
  }, [portfolio]);

  // 1. 扁平化並篩選出未來的配息資料
  const upcomingDividends = useMemo(() => {
    const list: Array<{
        etfCode: string;
        etfName: string;
        category: CategoryKey;
        priceCurrent: number;
        date: string;
        amount: number;
        singleYield: string;
    }> = [];

    etfs.forEach(etf => {
        etf.dividends.forEach(div => {
            if (isFutureDate(div.date)) {
                // 計算單次殖利率
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

    // 依照日期排序 (最近的在前)
    return list.sort((a, b) => getDateValue(a.date) - getDateValue(b.date));
  }, [etfs]);

  // 2. 根據按鈕過濾顯示
  const filteredList = useMemo(() => {
      return upcomingDividends.filter(item => {
          if (filter === 'bond') {
              return item.category === 'AE';
          }
          if (filter === 'monthly') {
              // 月配股票 (AD)
              return item.category === 'AD';
          }
          if (filter === 'quarterly') {
              // 季配股票 (AA, AB, AC)
              return ['AA', 'AB', 'AC'].includes(item.category);
          }
          if (filter === 'other') {
              // 其他 (AF: 年配/半年配/其他)
              return item.category === 'AF';
          }
          return false;
      });
  }, [upcomingDividends, filter]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 scrollbar-hide">
          
          {/* E. 本月除息試算 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
               <div onClick={() => toggleAnalysis('E')} className="px-3 py-2.5 flex items-center justify-between cursor-pointer bg-white hover:bg-slate-50">
                   <div className="flex items-center gap-2 flex-1 justify-between pr-2">
                       <div className="flex items-center gap-2">
                           <div className="p-1 bg-violet-100 rounded"><CalendarCheck className="w-4 h-4 text-violet-600" /></div>
                           <h4 className="font-bold text-[18px] text-slate-800">E. 本月除息試算</h4>
                       </div>
                       <span className={`text-[16px] font-bold text-violet-600`}>
                           ${formatMoney(analysisData.totalCurrentMonthIncome)}
                       </span>
                   </div>
                   {expandedAnalysis.includes('E') ? <Minus className="w-4 h-4 text-slate-400"/> : <Plus className="w-4 h-4 text-slate-400"/>}
               </div>
               {expandedAnalysis.includes('E') && (
                  <div className="px-2 pb-2 border-t border-slate-100 pt-2 space-y-2 animate-[fadeIn_0.2s_ease-out]">
                      <div className="text-center text-[12px] text-slate-400 mb-1">
                          {new Date().getFullYear()}年 {new Date().getMonth() + 1}月 除息清單
                      </div>
                      {analysisData.currentMonthDividendsList.length > 0 ? (
                          analysisData.currentMonthDividendsList.map((row, idx) => (
                          <div key={`${row.id}-${idx}`} className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex flex-col pt-1.5 gap-0.5">
                              <div className="flex justify-between items-center">
                                  <div className="flex flex-col">
                                        <span className="text-[16px] font-light text-slate-600">{row.name} <span className="text-xs">({row.id})</span></span>
                                  </div>
                                  <div className="flex flex-col text-right">
                                        <span className="text-[16px] font-light text-slate-600">{formatShare(row.shares)} 股</span>
                                  </div>
                              </div>
                              <div className="flex justify-between items-center border-t border-slate-200/50 pt-1 mt-0">
                                  <div className="flex flex-col">
                                        <div className="flex items-baseline gap-1">
                                          <span className="text-[16px] font-bold text-slate-800">{row.unitAmount.toFixed(3)}</span>
                                          <span className="text-[10px] text-slate-400">({row.date})</span>
                                       </div>
                                  </div>
                                  <div className="flex flex-col text-right">
                                        <span className="text-[16px] font-bold text-slate-800">${formatMoney(row.totalAmount)}</span>
                                  </div>
                              </div>
                          </div>
                      ))) : (
                          <div className="text-center text-slate-400 py-4 text-sm">本月無除息資料</div>
                      )}
                  </div>
               )}
          </div>

          {/* F. 本日績效分析 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
               <div onClick={() => toggleAnalysis('F')} className="px-3 py-2.5 flex items-center justify-between cursor-pointer bg-white hover:bg-slate-50">
                   <div className="flex items-center gap-2 flex-1 justify-between pr-2">
                       <div className="flex items-center gap-2">
                           <div className="p-1 bg-rose-100 rounded"><TrendingUp className="w-4 h-4 text-rose-600" /></div>
                           <h4 className="font-bold text-[18px] text-slate-800">F. 本日績效分析</h4>
                       </div>
                       <span className={`text-[16px] font-bold ${getColor(analysisData.totalDailyChangeValue)}`}>
                           {analysisData.totalDailyChangeValue > 0 ? '+' : ''}{formatMoney(analysisData.totalDailyChangeValue)}
                       </span>
                   </div>
                   {expandedAnalysis.includes('F') ? <Minus className="w-4 h-4 text-slate-400"/> : <Plus className="w-4 h-4 text-slate-400"/>}
               </div>
               {expandedAnalysis.includes('F') && (
                  <div className="px-2 pb-2 border-t border-slate-100 pt-2 space-y-2 animate-[fadeIn_0.2s_ease-out]">
                      {analysisData.todayDividendsList.length > 0 && (
                          <div className="bg-[#fffdf0] px-3 py-2 rounded-lg border border-yellow-200 flex flex-col mb-3">
                              <div className="flex justify-between items-center text-yellow-800 border-b border-yellow-200/50 pb-1 mb-1">
                                  <span className="text-[14px] font-bold">今日除息彙整</span>
                                  <span className="text-[16px] font-bold">${formatMoney(analysisData.totalTodayDividendIncome)}</span>
                              </div>
                              <div className="flex flex-col space-y-1">
                                  <div className="flex justify-between text-[11px] font-bold text-yellow-700/70">
                                      <span className="flex-1">股名</span>
                                      <span className="w-14 text-right">除息</span>
                                      <span className="w-16 text-right">股數</span>
                                      <span className="w-20 text-right">股息</span>
                                  </div>
                                  {analysisData.todayDividendsList.map((item, idx) => (
                                      <div key={idx} className="flex justify-between text-[13px] text-yellow-900 border-t border-yellow-200/30 pt-1">
                                          <span className="flex-1 truncate">{item.name}</span>
                                          <span className="w-14 text-right">{item.unitAmount}</span>
                                          <span className="w-16 text-right">{formatShare(item.shares)}</span>
                                          <span className="w-20 text-right font-bold text-yellow-800">${formatMoney(item.totalAmount)}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                      {analysisData.dailyPerformanceList.length > 0 ? (
                          analysisData.dailyPerformanceList.map((row) => (
                              <div key={row.id} className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex flex-col pt-1.5 gap-0.5">
                                  <div className="flex justify-between items-center">
                                      <div className="flex flex-col">
                                          <span className="text-[16px] font-light text-slate-700">{row.name}</span>
                                      </div>
                                      <div className="flex flex-col text-right">
                                          <span className="text-[16px] font-light text-slate-700">{formatShare(row.shares)} 股</span>
                                      </div>
                                  </div>
                                  <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-200/50">
                                      <div className="flex flex-col">
                                          <div className="flex items-baseline gap-1">
                                              <span className={`text-[16px] font-bold ${getColor(row.changePrice)}`}>
                                                  {row.changePrice > 0 ? '+' : ''}{row.changePrice.toFixed(2)}
                                              </span>
                                              <span className="text-[10px] text-slate-400 font-light">
                                                  (昨收: {formatPrice(row.prevPrice)})
                                              </span>
                                          </div>
                                      </div>
                                      <div className="flex flex-col text-right">
                                          <span className={`text-[16px] font-bold ${getColor(row.changeValue)}`}>
                                              {row.changeValue > 0 ? '+' : ''}{formatMoney(row.changeValue)}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="text-center text-slate-400 py-4 text-sm">無持有部位</div>
                      )}
                  </div>
               )}
          </div>

          {/* G. 本月配息公告 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
               <div onClick={() => toggleAnalysis('G')} className="px-3 py-2.5 flex items-center justify-between cursor-pointer bg-white hover:bg-slate-50">
                   <div className="flex items-center gap-2 flex-1 justify-between pr-2">
                       <div className="flex items-center gap-2">
                           <div className="p-1 bg-red-100 rounded"><Megaphone className="w-4 h-4 text-red-500" /></div>
                           <h4 className="font-bold text-[18px] text-slate-800">G. 本月配息公告</h4>
                       </div>
                   </div>
                   {expandedAnalysis.includes('G') ? <Minus className="w-4 h-4 text-slate-400"/> : <Plus className="w-4 h-4 text-slate-400"/>}
               </div>
               
               {expandedAnalysis.includes('G') && (
                  <div className="px-2 pb-2 border-t border-slate-100 pt-2 animate-[fadeIn_0.2s_ease-out]">
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
                          <button
                              onClick={() => setFilter('quarterly')}
                              className={`flex-1 min-w-[70px] py-1.5 rounded-lg font-bold text-xs transition-all border whitespace-nowrap ${
                                  filter === 'quarterly' 
                                  ? 'bg-blue-900 text-white border-blue-900 shadow-md' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                          >
                              季配息
                          </button>
                          <button
                              onClick={() => setFilter('monthly')}
                              className={`flex-1 min-w-[70px] py-1.5 rounded-lg font-bold text-xs transition-all border whitespace-nowrap ${
                                  filter === 'monthly' 
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-md' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                          >
                              月配息
                          </button>
                          <button
                              onClick={() => setFilter('bond')}
                              className={`flex-1 min-w-[70px] py-1.5 rounded-lg font-bold text-xs transition-all border whitespace-nowrap ${
                                  filter === 'bond' 
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                          >
                              債券型
                          </button>
                          <button
                              onClick={() => setFilter('other')}
                              className={`flex-1 min-w-[70px] py-1.5 rounded-lg font-bold text-xs transition-all border whitespace-nowrap ${
                                  filter === 'other' 
                                  ? 'bg-slate-600 text-white border-slate-600 shadow-md' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                          >
                              其他
                          </button>
                      </div>

                      {filteredList.length > 0 ? (
                          <div className="space-y-3">
                              {filteredList.map((item, idx) => (
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
                                          <div className="mt-2 pt-1.5 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                                              <span>參考股價: {item.priceCurrent}</span>
                                              <span>* 單次殖利率為預估值</span>
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
               )}

          </div>

          {/* H. 年度績效分析 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
               <div onClick={() => toggleAnalysis('H')} className="px-3 py-2.5 flex items-center justify-between cursor-pointer bg-white hover:bg-slate-50">
                   <div className="flex items-center gap-2 flex-1 justify-between pr-2">
                       <div className="flex items-center gap-2">
                           <div className="p-1 bg-amber-100 rounded"><BarChart2 className="w-4 h-4 text-amber-600" /></div>
                           <h4 className="font-bold text-[18px] text-slate-800">H. 年度績效分析</h4>
                       </div>
                   </div>
                   {expandedAnalysis.includes('H') ? <Minus className="w-4 h-4 text-slate-400"/> : <Plus className="w-4 h-4 text-slate-400"/>}
               </div>

               {expandedAnalysis.includes('H') && (
                  <div className="px-2 pb-3 border-t border-slate-100 pt-2 animate-[fadeIn_0.2s_ease-out] flex flex-col gap-4">
                      {/* 圖表 */}
                      <pre className="text-xs bg-slate-100 p-2 overflow-auto" style={{maxHeight:'200px'}}>
                         {JSON.stringify(portfolio.map(p => ({id: p.id, history: p.etf.priceHistory})), null, 2)}
                      </pre>
                      {analysisData.perfMonths.length > 0 ? (
                          <div className="w-full h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart layout="vertical" data={analysisData.perfMonths} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                      <XAxis 
                                        type="number"
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#64748B' }} 
                                        tickFormatter={(val) => Math.round(val/1000) + 'k'}
                                      />
                                      <YAxis 
                                        dataKey="label"
                                        type="category"
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#64748B' }} 
                                      />
                                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748B' }} />
                                      <Bar dataKey="perf" name="績效" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                                      <Bar dataKey="yield" name="股息" stackId="a" fill="#22c55e" radius={[0, 4, 4, 0]} />
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      ) : (
                          <div className="text-center text-slate-400 text-sm py-6">尚無資料</div>
                      )}

                      {/* 表格 */}
                      {analysisData.perfMonths.length > 0 && (
                          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden text-[12px] flex flex-col">
                              <div className="flex justify-between bg-slate-200 text-slate-600 font-bold px-2 py-1.5 border-b border-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                                  <span className="flex-1">年月</span>
                                  <span className="flex-1 text-right">績效</span>
                                  <span className="flex-1 text-right">股息</span>
                                  <span className="flex-1 text-right text-slate-800">小計</span>
                              </div>
                              {analysisData.perfMonths.map((row, idx) => (
                                  <div key={idx} className="flex justify-between px-2 py-1.5 border-b border-slate-200/60 last:border-0 hover:bg-white transition-colors">
                                      <span className="flex-1 text-slate-500 font-medium">{row.label}</span>
                                      <span className={`flex-1 text-right ${row.perf > 0 ? 'text-red-600' : row.perf < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                          {row.perf > 0 ? '+' : ''}{formatMoney(row.perf)}
                                      </span>
                                      <span className="flex-1 text-right text-slate-600">{formatMoney(row.yield)}</span>
                                      <span className="flex-1 text-right font-bold text-slate-800">{formatMoney(row.total)}</span>
                                  </div>
                              ))}
                              <div className="flex justify-between px-2 py-2 border-t-2 border-slate-300 bg-amber-50 font-bold text-slate-800">
                                  <span className="flex-1">合計</span>
                                  <span className={`flex-1 text-right ${analysisData.perfMonths.reduce((sum, r) => sum + r.perf, 0) > 0 ? 'text-red-600' : analysisData.perfMonths.reduce((sum, r) => sum + r.perf, 0) < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                      {analysisData.perfMonths.reduce((sum, r) => sum + r.perf, 0) > 0 ? '+' : ''}{formatMoney(analysisData.perfMonths.reduce((sum, r) => sum + r.perf, 0))}
                                  </span>
                                  <span className="flex-1 text-right text-slate-700">{formatMoney(analysisData.perfMonths.reduce((sum, r) => sum + r.yield, 0))}</span>
                                  <span className="flex-1 text-right text-amber-900">{formatMoney(analysisData.perfMonths.reduce((sum, r) => sum + r.total, 0))}</span>
                              </div>
                          </div>
                      )}
                  </div>
               )}
          </div>
      </div>
    </div>
  );
};

export default DailyAnalysisView;
