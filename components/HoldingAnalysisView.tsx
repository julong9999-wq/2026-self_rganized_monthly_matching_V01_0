import React, { useMemo, useState } from 'react';
import { PortfolioItem, StockDailyPrice } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { format } from 'date-fns';
import { X } from 'lucide-react';

interface Props {
  portfolio: PortfolioItem[];
  stockDailyPrices: StockDailyPrice[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#a4de6c', '#d0ed57', '#e17c80'];

const formatDateYMD = (dateStr: string) => {
    const cleanStr = dateStr.trim().replace(/[-.]/g, '/');
    const dt = new Date(cleanStr);
    if (!isNaN(dt.getTime())) return format(dt, 'yyyy-MM-dd');
    return dateStr;
};

const RenderCustomLegend = (props: any) => {
    const { payload, finalPerfMap, sortedNames } = props;
    if (!payload) return null;
    
    // Sort payload by sortedNames
    const sortedPayload = [...payload].sort((a, b) => {
        const idxA = sortedNames.indexOf(a.value);
        const idxB = sortedNames.indexOf(b.value);
        return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
    });

    const rows = [];
    for (let i = 0; i < sortedPayload.length; i += 3) {
        rows.push(sortedPayload.slice(i, i + 3));
    }
    
    const renderLegendItem = (item: any) => {
        if (!item) return null;
        let name = item.value;
        let perf: number | undefined = finalPerfMap ? finalPerfMap[name] : undefined;
        
        return (
            <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-slate-700 truncate font-medium flex items-center pr-1 flex-1" title={name}>
                    <span className="truncate">{name}</span>
                    {perf !== undefined && (
                        <span className={`ml-1 flex-shrink-0 ${perf >= 0 ? "text-red-500" : "text-green-500"}`}>
                            {perf > 0 ? '+' : ''}{perf.toFixed(2)}%
                        </span>
                    )}
                </span>
            </div>
        );
    };

    return (
        <div className="w-full mt-4 px-2 tracking-tighter">
            {rows.map((row: any[], rIdx: number) => (
                <div key={rIdx} className="flex justify-between items-center mb-3 w-full">
                    <div className="flex-1 flex justify-start">
                        {renderLegendItem(row[0])}
                    </div>
                    <div className="flex-1 flex justify-center">
                        {renderLegendItem(row[1])}
                    </div>
                    <div className="flex-1 flex justify-end">
                        {renderLegendItem(row[2])}
                    </div>
                </div>
            ))}
        </div>
    );
};

const HoldingAnalysisView: React.FC<Props> = ({ portfolio, stockDailyPrices }) => {
  const [activeTab, setActiveTab] = useState<'最新'|'振幅'|'反彈'|'下跌'>('最新');
  const [selectedETF, setSelectedETF] = useState<any | null>(null);

  const data = useMemo(() => {
    const holdings = portfolio.filter(p => {
        const totalShares = p.transactions.reduce((s, t) => s + t.shares, 0);
        return totalShares > 0;
    });
    const holdingCodes = holdings.map(h => h.id);
    
    const targetPrices = stockDailyPrices.filter(d => holdingCodes.includes(d.code));

    let maxTime = 0;
    targetPrices.forEach(d => {
       const dateP = new Date(d.date.replace(/[-.]/g, '/'));
       if (!isNaN(dateP.getTime()) && dateP.getTime() > maxTime) maxTime = dateP.getTime();
    });
    
    const threeMonthsAgo = new Date(maxTime);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentData = targetPrices.filter(d => {
       const dateP = new Date(d.date.replace(/[-.]/g, '/'));
       return dateP.getTime() >= threeMonthsAgo.getTime();
    });

    const stats: any[] = [];
    holdings.forEach(h => {
        const code = h.id;
        const name = h.etf.name;
        
        const idxData = recentData.filter(d => d.code === code).sort((a, b) => {
            const timeA = new Date(a.date.replace(/[-.]/g, '/')).getTime();
            const timeB = new Date(b.date.replace(/[-.]/g, '/')).getTime();
            return timeA - timeB;
        });
        if (idxData.length === 0) return;

        const latestData = idxData[idxData.length - 1];
        const prevData = idxData.length > 1 ? idxData[idxData.length - 2] : latestData;
        
        const latestPrice = latestData.priceCurrent;
        const latestDate = formatDateYMD(latestData.date);
        const prevDate = formatDateYMD(prevData.date);
        const dailyChange = latestPrice - prevData.priceCurrent;
        const dailyChangePct = prevData.priceCurrent ? (dailyChange / prevData.priceCurrent) * 100 : 0;

        let maxClose = -Infinity;
        let minClose = Infinity;
        let dateMax = '';
        let dateMin = '';

        idxData.forEach(d => {
            if (d.priceCurrent > maxClose) {
                maxClose = d.priceCurrent;
                dateMax = formatDateYMD(d.date);
            }
            if (d.priceCurrent < minClose) {
                minClose = d.priceCurrent;
                dateMin = formatDateYMD(d.date);
            }
        });
        if (minClose === Infinity) minClose = 0;
        if (maxClose === -Infinity) maxClose = 0;

        const amplitudePct = maxClose ? ((minClose / maxClose) - 1) * 100 : 0;
        const reboundPct = minClose ? ((latestPrice - minClose) / minClose) * 100 : 0;
        const drawdownPct = maxClose ? ((latestPrice - maxClose) / maxClose) * 100 : 0;

        stats.push({
            code: code,
            name: name,
            latestDate,
            prevDate,
            latestPrice,
            dailyChange,
            dailyChangePct,
            dateMax,
            maxClose,
            dateMin,
            minClose,
            amplitudePct,
            reboundPct,
            drawdownPct,
            history: idxData
        });
    });

    const comparisonMap: { [date: string]: any } = {};
    
    stats.forEach(stat => {
         const hist = stat.history;
         if (hist.length > 0) {
             const basePrice = hist[0].priceCurrent;
             hist.forEach((d: StockDailyPrice) => {
                 const dateKey = formatDateYMD(d.date);
                 if (!comparisonMap[dateKey]) {
                     comparisonMap[dateKey] = { date: dateKey };
                 }
                 comparisonMap[dateKey][stat.code] = ((d.priceCurrent - basePrice) / basePrice) * 100;
             });
         }
    });

    const comparisonData = Object.values(comparisonMap).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const finalPerformances = stats.map(s => {
        let perf = 0;
        for (let i = comparisonData.length - 1; i >= 0; i--) {
            if (comparisonData[i][s.code] !== undefined) {
                perf = comparisonData[i][s.code];
                break;
            }
        }
        return {
            name: s.code, // using code as identifier in the chart
            perf
        };
    });
    finalPerformances.sort((a, b) => b.perf - a.perf);
    const sortedNames = finalPerformances.map(f => f.name);
    const finalPerfMap = finalPerformances.reduce((acc, f) => ({ ...acc, [f.name]: f.perf }), {} as Record<string, number>);

    return { stats, comparisonData, sortedNames, finalPerfMap };
  }, [portfolio, stockDailyPrices]);

  const CandlestickChart = ({ data, title, color }: { data: any[], title: string, color: string }) => {
       const transformed = data.map(d => {
           const isUp = d.priceCurrent >= d.priceOpen;
           return {
               ...d,
               isUp,
               ocRange: [Math.min(d.priceOpen, d.priceCurrent), Math.max(d.priceOpen, d.priceCurrent)],
               hlMin: d.priceLow,
               hlMax: d.priceHigh,
               displayDate: formatDateYMD(d.date)
           };
       });

       const CustomShape = (props: any) => {
            const { x, y, width, height, isUp, payload } = props;
            const fill = isUp ? '#ef4444' : '#22c55e'; // Red for up, Green for down
            const yHigh = (props.yAxis && props.yAxis.scale) ? props.yAxis.scale(payload.hlMax) : y;
            const yLow = (props.yAxis && props.yAxis.scale) ? props.yAxis.scale(payload.hlMin) : Math.max(y, y + height);
            const lineX = x + width / 2;

            return (
                <g>
                    {(props.yAxis && props.yAxis.scale) && (
                        <line x1={lineX} y1={yHigh} x2={lineX} y2={yLow} stroke={fill} strokeWidth={1} />
                    )}
                    <rect x={x} y={y} width={width} height={Math.max(1, height)} fill={fill} />
                </g>
            );
       };

       let minVal = Infinity;
       let maxVal = -Infinity;
       data.forEach(d => {
           if (d.priceLow < minVal) minVal = d.priceLow;
           if (d.priceHigh > maxVal) maxVal = d.priceHigh;
       });

       const padding = (maxVal - minVal) * 0.1;
       minVal = Math.max(0, minVal - padding);
       maxVal = maxVal + padding;
       
       const ticks = transformed.length > 0 ? [transformed[0].displayDate, transformed[transformed.length-1].displayDate] : [];

       return (
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1.5 mb-2">
              <div className="flex items-center gap-2 mb-1 px-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <h3 className="text-sm font-bold text-slate-800">{title}</h3>
              </div>
              <div className="w-full aspect-video">
                  <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={transformed} margin={{ top: 2, right: 2, left: -20, bottom: 0 }}>
                          <XAxis dataKey="displayDate" ticks={ticks} tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                          <YAxis domain={[minVal, maxVal]} tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={35} tickFormatter={(val) => Math.round(val).toLocaleString()} />
                          <Tooltip 
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: any, name: any, props: any) => {
                                 if (name === "ocRange") return [props.payload.priceCurrent, "收盤"];
                                 return [value, name];
                              }}
                              labelFormatter={(label) => `日期: ${label}`}
                              labelStyle={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}
                              itemStyle={{ fontSize: 12, padding: 0 }}
                          />
                          <Bar dataKey="ocRange" shape={<CustomShape />} />
                      </ComposedChart>
                  </ResponsiveContainer>
              </div>
           </div>
       );
  };

  const pctColor = (val: number) => val > 0 ? 'text-red-500' : val < 0 ? 'text-green-500' : 'text-slate-500';
  const valColor = (val: number) => val > 0 ? 'text-red-600' : val < 0 ? 'text-green-600' : 'text-slate-600';
  const prefix = (val: number) => val > 0 ? '+' : '';
  const fmtPrice = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (portfolio.length === 0 || portfolio.filter(p => p.transactions.reduce((s, t) => s + t.shares, 0) > 0).length === 0) {
      return (
         <div className="h-full p-6 overflow-y-auto scrollbar-hide bg-slate-50">
             <div className="bg-white rounded-xl p-8 text-center text-slate-400 shadow-sm text-lg">
                 目前沒有持股資料，請先至「自組月配」新增持股與交易紀錄。
             </div>
         </div>
      );
  }

  if (!data || data.stats.length === 0) return <div className="p-4 text-center text-slate-500">無持股歷史資料</div>;

  const sortedStats = useMemo(() => {
    if (!data) return [];
    return [...data.stats].sort((a, b) => {
        if (activeTab === '最新') return b.dailyChangePct - a.dailyChangePct;
        if (activeTab === '振幅') return b.amplitudePct - a.amplitudePct;
        if (activeTab === '反彈') return b.reboundPct - a.reboundPct;
        if (activeTab === '下跌') return a.drawdownPct - b.drawdownPct; // 跌多 (數值較為負的) 在上
        return 0;
    });
  }, [data, activeTab]);

  const maxDailyChangePct = Math.max(1, ...data.stats.map(s => Math.abs(s.dailyChangePct)));
  const maxAmplitudePct = Math.max(1, ...data.stats.map(s => Math.abs(s.amplitudePct)));
  const maxReboundPct = Math.max(1, ...data.stats.map(s => Math.abs(s.reboundPct)));
  const maxDrawdownPct = Math.max(1, ...data.stats.map(s => Math.abs(s.drawdownPct)));

  return (
    <div className="h-full p-2 overflow-y-auto scrollbar-hide bg-slate-50">
        
        {/* Tab Controls for Tables */}
        <div className="flex gap-2 mb-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-10 w-full overflow-x-auto scrollbar-hide">
            {['最新', '振幅', '反彈', '下跌'].map(tab => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 flex justify-center py-1.5 text-xs font-bold rounded-lg transition-colors ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                 >
                     {tab}
                 </button>
            ))}
        </div>

        {/* Stats Table Area */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-2">
            <table className="w-full text-xs text-slate-700">
                <tbody className="divide-y divide-slate-100">
                    {sortedStats.map(s => {
                        let val = 0;
                        let pct = 0;
                        let colorClass = 'text-slate-500';
                        let date1 = '';
                        let price1 = 0;
                        let date2 = '';
                        let price2 = 0;

                        if (activeTab === '最新') {
                            date1 = s.latestDate;
                            price1 = s.latestPrice;
                            date2 = s.prevDate;
                            price2 = s.latestPrice - s.dailyChange;

                            val = s.dailyChange;
                            pct = s.dailyChangePct;
                            colorClass = valColor(s.dailyChange);
                        } else if (activeTab === '振幅') {
                            date1 = s.dateMax;
                            price1 = s.maxClose;
                            date2 = s.dateMin;
                            price2 = s.minClose;

                            val = Math.abs(s.maxClose - s.minClose);
                            pct = s.amplitudePct;
                            colorClass = 'text-blue-600';
                        } else if (activeTab === '反彈') {
                            date1 = s.dateMin;
                            price1 = s.minClose;
                            date2 = s.latestDate;
                            price2 = s.latestPrice;

                            val = s.latestPrice - s.minClose;
                            pct = s.reboundPct;
                            colorClass = valColor(val);
                        } else if (activeTab === '下跌') {
                            date1 = s.dateMax;
                            price1 = s.maxClose;
                            date2 = s.latestDate;
                            price2 = s.latestPrice;

                            val = s.latestPrice - s.maxClose;
                            pct = s.drawdownPct;
                            colorClass = valColor(val);
                        }

                        return (
                            <React.Fragment key={s.code}>
                                <tr className="bg-slate-50/50 hover:bg-slate-100 cursor-pointer" onClick={() => setSelectedETF(s)}>
                                    <td className="px-2 py-1.5 font-bold text-black text-[14px] align-middle w-[90px] border-r border-slate-100 whitespace-nowrap text-left">
                                        {s.code}
                                    </td>
                                    <td className="px-1 py-1.5 whitespace-nowrap text-left text-slate-500 w-[70px]">{date1}</td>
                                    <td className="px-1 py-1.5 font-medium text-slate-500 text-right whitespace-nowrap w-[45px]">{fmtPrice(price1)}</td>
                                    <td className={`px-2 py-1.5 text-left font-bold border-l border-slate-100 whitespace-nowrap w-[85px] text-slate-500`}>
                                        {activeTab === '振幅' ? '' : prefix(val)}{fmtPrice(val)}
                                    </td>
                                </tr>
                                <tr className="bg-white hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedETF(s)}>
                                    <td className="px-2 py-1.5 font-normal text-slate-500 text-[12px] align-middle w-[90px] border-r border-slate-100 whitespace-nowrap text-left truncate max-w-[90px]">
                                        {s.name}
                                    </td>
                                    <td className="px-1 py-1.5 whitespace-nowrap text-left text-slate-500 w-[70px]">{date2}</td>
                                    <td className="px-1 py-1.5 text-right font-medium text-slate-500 whitespace-nowrap w-[45px]">{fmtPrice(price2)}</td>
                                    <td className={`px-2 py-1.5 font-bold text-right whitespace-nowrap ${colorClass} w-[85px]`}>
                                        {activeTab === '振幅' ? '' : prefix(pct)}{pct.toFixed(2)}%
                                    </td>
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {/* Comparison Line Chart (Moved to the bottom as requested) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1.5 mb-2 mt-4">
            <div className="flex items-baseline gap-2 mb-1 px-1">
               <h3 className="text-sm font-bold text-slate-800">漲跌幅比較</h3>
               <span className="text-xs text-slate-400">
                   {data.comparisonData.length > 0 ? `${data.comparisonData[0].date} 至 ${data.comparisonData[data.comparisonData.length-1].date} 日期區間` : '日期區間'}
               </span>
            </div>
            
            <div className="w-full h-[600px] flex flex-col pb-10">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.comparisonData} margin={{ top: 2, right: 2, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="date" 
                            ticks={data.comparisonData.length > 0 ? [data.comparisonData[0].date, data.comparisonData[data.comparisonData.length-1].date] : []} 
                            tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} 
                        />
                        <YAxis width={30} tickFormatter={(val) => `${Math.round(val)}%`} tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <Legend 
                            content={<RenderCustomLegend finalPerfMap={data.finalPerfMap} sortedNames={data.sortedNames} />} 
                        />
                        {data.sortedNames.slice().reverse().map((name) => {
                            const idx = data.sortedNames.indexOf(name);
                            return (
                                <Line 
                                    key={name} 
                                    type="monotone" 
                                    dataKey={name} 
                                    stroke={COLORS[idx % COLORS.length]} 
                                    strokeWidth={1.5} 
                                    dot={false} 
                                    activeDot={{ r: 4 }} 
                                    connectNulls={true}
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Technical Chart Modal */}
        {selectedETF && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedETF(null)}>
                <div 
                    className="bg-slate-50 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col border border-slate-100"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
                        <h2 className="text-lg font-bold text-slate-800 tracking-wide">{selectedETF.name} ({selectedETF.code})</h2>
                        <button 
                            onClick={() => setSelectedETF(null)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto">
                        <CandlestickChart 
                            data={selectedETF.history} 
                            title={`${selectedETF.code} ${selectedETF.name} 技術線圖`} 
                            color={COLORS[(data.sortedNames.indexOf(selectedETF.code) >= 0 ? data.sortedNames.indexOf(selectedETF.code) : 0) % COLORS.length]} 
                        />
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

export default HoldingAnalysisView;
