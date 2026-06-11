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

const PercentBar = ({ value, max, colorClass }: { value: number, max: number, colorClass: string }) => {
    const width = Math.min(100, (Math.abs(value) / max) * 100);
    const prefix = value > 0 ? '+' : '';
    return (
        <div className="flex items-center gap-1.5 w-full justify-between">
            <div className="w-12 h-1.5 bg-slate-100 rounded-sm overflow-hidden flex">
                 <div className={`h-full ${colorClass.replace('text-', 'bg-')}`} style={{ width: `${width}%` }} />
            </div>
            <span className={`text-right ${colorClass}`}>{prefix}{value.toFixed(2)}%</span>
        </div>
    );
};

const RenderCustomLegend = (props: any) => {
    const { payload } = props;
    if (!payload) return null;
    const rows = [];
    for (let i = 0; i < payload.length; i += 3) {
        rows.push(payload.slice(i, i + 3));
    }
    return (
        <div className="w-full mt-4 px-2 tracking-tighter">
            {rows.map((row: any[], rIdx: number) => (
                <div key={rIdx} className="flex justify-between items-center mb-3 w-full">
                    <div className="flex-1 flex justify-start">
                        {row[0] && (
                            <div className="flex items-center gap-1.5 w-[90px]">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: row[0].color }} />
                                <span className="text-[11px] text-slate-700 truncate font-medium" title={row[0].value}>{row[0].value}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 flex justify-center">
                        {row[1] && (
                            <div className="flex items-center gap-1.5 w-[90px]">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: row[1].color }} />
                                <span className="text-[11px] text-slate-700 truncate font-medium" title={row[1].value}>{row[1].value}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 flex justify-end">
                        {row[2] && (
                            <div className="flex items-center gap-1.5 w-[90px]">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: row[2].color }} />
                                <span className="text-[11px] text-slate-700 truncate font-medium" title={row[2].value}>{row[2].value}</span>
                            </div>
                        )}
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

        const amplitudePct = minClose ? ((maxClose - minClose) / minClose) * 100 : 0;
        const reboundPct = minClose ? ((latestPrice - minClose) / minClose) * 100 : 0;
        const drawdownPct = maxClose ? ((latestPrice - maxClose) / maxClose) * 100 : 0;

        stats.push({
            code: code,
            name: name,
            latestDate,
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
                 comparisonMap[dateKey][stat.name] = ((d.priceCurrent - basePrice) / basePrice) * 100;
             });
         }
    });

    const comparisonData = Object.values(comparisonMap).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const finalPerformances = stats.map(s => {
        const lastRec = comparisonData[comparisonData.length - 1];
        return {
            name: s.name,
            perf: lastRec ? (lastRec[s.name] || 0) : 0
        };
    });
    finalPerformances.sort((a, b) => b.perf - a.perf);
    const sortedNames = finalPerformances.map(f => f.name);

    return { stats, comparisonData, sortedNames };
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
                    {sortedStats.map(s => (
                        <React.Fragment key={s.code}>
                            <tr className="bg-slate-50/50">
                                <td 
                                    rowSpan={2} 
                                    className="px-2 py-2 font-bold text-slate-800 align-middle w-12 border-r border-slate-100 whitespace-nowrap text-center cursor-pointer hover:bg-slate-100"
                                    onClick={() => setSelectedETF(s)}
                                >
                                    <div className="flex flex-col items-center">
                                       <span className="text-[10px] text-slate-400 font-medium">{s.code}</span>
                                       <span>{s.name}</span>
                                    </div>
                                </td>
                                {activeTab === '最新' && (
                                    <>
                                        <td className="px-2 py-1.5 font-medium text-slate-800 text-center whitespace-nowrap">{fmtPrice(s.latestPrice)}</td>
                                        <td className="px-2 py-1.5 whitespace-nowrap text-center text-slate-500">{s.latestDate}</td>
                                        <td className={`px-2 py-1.5 text-center font-bold border-l border-slate-100 whitespace-nowrap ${valColor(s.dailyChange)}`}>
                                            {prefix(s.dailyChange)}{s.dailyChange.toFixed(2)}
                                        </td>
                                    </>
                                )}
                                {activeTab === '振幅' && (
                                    <>
                                        <td className="px-2 py-1.5 whitespace-nowrap text-center text-slate-500">{s.dateMax}</td>
                                        <td className="px-2 py-1.5 text-right font-medium text-slate-800 whitespace-nowrap">{fmtPrice(s.maxClose)}</td>
                                        <td className="px-2 py-1.5 font-bold border-l border-slate-100 text-center whitespace-nowrap text-blue-600">
                                            {fmtPrice(s.maxClose - s.minClose)}
                                        </td>
                                    </>
                                )}
                                {activeTab === '反彈' && (
                                    <>
                                        <td className="px-2 py-1.5 whitespace-nowrap text-center text-slate-500">{s.dateMin}</td>
                                        <td className="px-2 py-1.5 text-right font-medium text-slate-800 whitespace-nowrap">{fmtPrice(s.minClose)}</td>
                                        <td className={`px-2 py-1.5 font-bold border-l border-slate-100 text-center whitespace-nowrap ${valColor(s.latestPrice - s.minClose)}`}>
                                            {prefix(s.latestPrice - s.minClose)}{fmtPrice(s.latestPrice - s.minClose)}
                                        </td>
                                    </>
                                )}
                                {activeTab === '下跌' && (
                                    <>
                                        <td className="px-2 py-1.5 whitespace-nowrap text-center text-slate-500">{s.dateMax}</td>
                                        <td className="px-2 py-1.5 text-right font-medium text-slate-800 whitespace-nowrap">{fmtPrice(s.maxClose)}</td>
                                        <td className={`px-2 py-1.5 font-bold border-l border-slate-100 text-center whitespace-nowrap ${valColor(s.latestPrice - s.maxClose)}`}>
                                            {prefix(s.latestPrice - s.maxClose)}{fmtPrice(s.latestPrice - s.maxClose)}
                                        </td>
                                    </>
                                )}
                            </tr>
                            <tr className="bg-white">
                                {activeTab === '最新' && (
                                    <>
                                        <td className="px-2 py-1.5 whitespace-nowrap text-center text-slate-500">昨收</td>
                                        <td className="px-2 py-1.5 text-center font-medium text-slate-500 whitespace-nowrap">{fmtPrice(s.latestPrice - s.dailyChange)}</td>
                                        <td className={`px-2 py-1.5 font-bold whitespace-nowrap`}>
                                            <PercentBar value={s.dailyChangePct} max={maxDailyChangePct} colorClass={pctColor(s.dailyChangePct)} />
                                        </td>
                                    </>
                                )}
                                {activeTab === '振幅' && (
                                    <>
                                        <td className="px-2 py-1.5 whitespace-nowrap text-center text-slate-500">{s.dateMin}</td>
                                        <td className="px-2 py-1.5 text-right font-medium text-slate-800 whitespace-nowrap">{fmtPrice(s.minClose)}</td>
                                        <td className={`px-2 py-1.5 font-bold whitespace-nowrap`}>
                                            <PercentBar value={s.amplitudePct} max={maxAmplitudePct} colorClass="text-blue-600" />
                                        </td>
                                    </>
                                )}
                                {activeTab === '反彈' && (
                                    <>
                                        <td className="px-2 py-1.5 whitespace-nowrap text-center text-slate-500">{s.latestDate}</td>
                                        <td className="px-2 py-1.5 text-right font-medium text-blue-600 whitespace-nowrap">{fmtPrice(s.latestPrice)}</td>
                                        <td className={`px-2 py-1.5 font-bold whitespace-nowrap`}>
                                            <PercentBar value={s.reboundPct} max={maxReboundPct} colorClass={pctColor(s.reboundPct)} />
                                        </td>
                                    </>
                                )}
                                {activeTab === '下跌' && (
                                    <>
                                        <td className="px-2 py-1.5 whitespace-nowrap text-center text-slate-500">{s.latestDate}</td>
                                        <td className="px-2 py-1.5 text-right font-medium text-blue-600 whitespace-nowrap">{fmtPrice(s.latestPrice)}</td>
                                        <td className={`px-2 py-1.5 font-bold whitespace-nowrap`}>
                                            <PercentBar value={s.drawdownPct} max={maxDrawdownPct} colorClass={pctColor(s.drawdownPct)} />
                                        </td>
                                    </>
                                )}
                            </tr>
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Comparison Line Chart (Moved to the bottom as requested) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1.5 mb-2 mt-4">
            <div className="flex items-baseline gap-2 mb-1 px-1">
               <h3 className="text-sm font-bold text-slate-800">漲跌幅比較</h3>
               <span className="text-xs text-slate-400">同一起跑點</span>
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
                        <Tooltip 
                            itemSorter={(item) => -(item.value as number)}
                            formatter={(value: any, name: any) => [`${Number(value).toFixed(2)}%`, name]}
                            labelFormatter={(label) => `日期: ${label}`}
                            labelStyle={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}
                            itemStyle={{ fontSize: 12, padding: 0 }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend 
                            content={<RenderCustomLegend />} 
                            payload={data.sortedNames.map(name => {
                                const statIdx = data.stats.findIndex(s => s.name === name);
                                return {
                                    value: name,
                                    type: 'circle',
                                    id: name,
                                    color: COLORS[(statIdx >= 0 ? statIdx : 0) % COLORS.length]
                                };
                            })}
                        />
                        {data.sortedNames.map((name) => {
                            const statIdx = data.stats.findIndex(s => s.name === name);
                            return (
                                <Line 
                                    key={name} 
                                    type="monotone" 
                                    dataKey={name} 
                                    stroke={COLORS[(statIdx >= 0 ? statIdx : 0) % COLORS.length]} 
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
                            color={COLORS[data.stats.findIndex(s => s.code === selectedETF.code) % COLORS.length]} 
                        />
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

export default HoldingAnalysisView;
