
import React, { useState, useMemo } from 'react';
import { EtfData, CategoryKey, PortfolioItem } from '../types';
import { Megaphone, Calendar, DollarSign, Percent, Info, CalendarCheck, TrendingUp, Minus, Plus } from 'lucide-react';

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

      return {
          currentMonthDividendsList,
          dailyPerformanceList,
          totalCurrentMonthIncome,
          totalDailyChangeValue,
          totalTodayDividendIncome,
          todayDividendsList,
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
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
          
          {/* E. 本月除息試算 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
               <div onClick={() => toggleAnalysis('E')} className="p-3 flex items-center justify-between cursor-pointer bg-white hover:bg-slate-50">
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
                  <div className="px-3 pb-3 border-t border-slate-100 pt-2 space-y-2 animate-[fadeIn_0.2s_ease-out]">
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
               <div onClick={() => toggleAnalysis('F')} className="p-3 flex items-center justify-between cursor-pointer bg-white hover:bg-slate-50">
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
                  <div className="px-3 pb-3 border-t border-slate-100 pt-2 space-y-2 animate-[fadeIn_0.2s_ease-out]">
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
      </div>
    </div>
  );
};

export default DailyAnalysisView;
