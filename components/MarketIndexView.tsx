import React, { useMemo } from 'react';
import { MarketIndex } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar, Cell } from 'recharts';
import { format, subMonths, parse } from 'date-fns';

interface Props {
  twIndices: MarketIndex[];
  usIndices: MarketIndex[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];
const INDEX_ORDER = ['加權大盤', '道瓊工業', '那斯達克', '費城半導體', '標普500'];

const formatXAxis = (tickItem: string) => {
    // try to just show mm-dd if possible
    const parts = tickItem.split('/');
    if (parts.length >= 2) {
        return `${parts[parts.length - 2].padStart(2, '0')}-${parts[parts.length - 1].padStart(2, '0')}`;
    }
    return tickItem;
};

const MarketIndexView: React.FC<Props> = ({ twIndices, usIndices }) => {

  const data = useMemo(() => {
    // 1. Combine data
    const allData = [...twIndices, ...usIndices];
    
    // 2. Filter target index names
    const targetIndices = allData.filter(d => {
        const n = d.name.replace(/\s+/g, '');
        return n.includes('加權') || n.includes('道瓊') || n.includes('那斯達克') || n.includes('費城') || n.includes('標普500');
    });

    // Normalize names to the standard names
    targetIndices.forEach(d => {
        const n = d.name.replace(/\s+/g, '');
        if (n.includes('加權')) d.name = '加權大盤';
        else if (n.includes('道瓊')) d.name = '道瓊工業';
        else if (n.includes('那斯達克')) d.name = '那斯達克';
        else if (n.includes('費城') || n.includes('半導體')) d.name = '費城半導體';
        else if (n.includes('標普500')) d.name = '標普500';
    });

    // 3. Filter last 3 months
    // Let's assume data has "date" string like "2026/06/10" or "2026/6/10"
    // Find the latest date
    let maxTime = 0;
    targetIndices.forEach(d => {
       const dateP = new Date(d.date.replace(/[-.]/g, '/'));
       if (!isNaN(dateP.getTime()) && dateP.getTime() > maxTime) maxTime = dateP.getTime();
    });
    
    const threeMonthsAgo = new Date(maxTime);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentData = targetIndices.filter(d => {
       const dateP = new Date(d.date.replace(/[-.]/g, '/'));
       return dateP.getTime() >= threeMonthsAgo.getTime();
    });

    // 4. Calculate stats for each index
    const stats: any[] = [];
    INDEX_ORDER.forEach(idxName => {
        const idxData = recentData.filter(d => d.name === idxName).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (idxData.length === 0) return;

        let maxClose = 0;
        let maxIntraday = 0;
        let dateMax = '';
        let dateMaxIntraday = '';

        idxData.forEach(d => {
            if (d.priceCurrent && d.priceCurrent > maxClose) {
                maxClose = d.priceCurrent;
                dateMax = d.date;
            }
            if (d.priceHigh && d.priceHigh > maxIntraday) {
                maxIntraday = d.priceHigh;
            }
        });

        const latestData = idxData[idxData.length - 1];
        const latestPrice = latestData.priceCurrent;

        const dropPointClose = latestPrice - maxClose;
        const dropPointIntraday = latestPrice - maxIntraday;
        const dropPctClose = maxClose ? (dropPointClose / maxClose) * 100 : 0;
        const dropPctIntraday = maxIntraday ? (dropPointIntraday / maxIntraday) * 100 : 0;

        stats.push({
            name: idxName,
            maxClose,
            maxIntraday,
            dateMax,
            latestPrice,
            dropPointClose,
            dropPointIntraday,
            dropPctClose,
            dropPctIntraday,
            history: idxData // save history for charts
        });
    });

    // 5. Prepare comparison line chart data
    // Map dates to percent change from baseline
    const comparisonMap: { [date: string]: any } = {};
    
    stats.forEach(stat => {
         const hist = stat.history;
         if (hist.length > 0) {
             const basePrice = hist[0].priceCurrent;
             hist.forEach((d: MarketIndex) => {
                 let dateKey = d.date;
                 // normalize date key
                 const cleanStr = d.date.trim().replace(/[-.]/g, '/');
                 let dt = new Date(cleanStr);
                 if (!isNaN(dt.getTime())) {
                     dateKey = format(dt, 'yyyy/MM/dd');
                 }

                 if (!comparisonMap[dateKey]) {
                     comparisonMap[dateKey] = { date: dateKey, displayDate: formatXAxis(d.date) };
                 }
                 comparisonMap[dateKey][stat.name] = ((d.priceCurrent - basePrice) / basePrice) * 100;
             });
         }
    });

    const comparisonData = Object.values(comparisonMap).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { stats, comparisonData };
  }, [twIndices, usIndices]);

  const renderPercentBar = (val: number, maxAbsVal: number) => {
      const isNegative = val < 0;
      const width = maxAbsVal > 0 ? (Math.abs(val) / maxAbsVal) * 100 : 0;
      return (
          <div className="flex items-center gap-2">
             <span className={`w-12 text-right text-sm font-medium ${isNegative ? 'text-green-600' : 'text-slate-600'}`}>
                 {val.toFixed(2)}%
             </span>
             <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                 <div 
                     className={`h-full ${isNegative ? 'bg-green-500' : 'bg-red-500'}`} 
                     style={{ width: `${width}%` }}
                 />
             </div>
          </div>
      );
  };

  const CandlestickChart = ({ data, title, color }: { data: any[], title: string, color: string }) => {
       // Since recharts doesn't have a native candlestick, we can simulate it with ComposedChart + ErrorBars or high/low, or just use a Line chart with min/max area.
       // Given the prompt images, it looks like standard candlestick/bar charts.
       // Using a simplified composed chart with bars for open-close and lines for high-low.
       
       // Transform data for composed chart
       const transformed = data.map(d => {
           const isUp = d.priceCurrent >= d.priceOpen;
           return {
               ...d,
               isUp,
               ocRange: [Math.min(d.priceOpen, d.priceCurrent), Math.max(d.priceOpen, d.priceCurrent)],
               // For High Low
               hlMin: d.priceLow,
               hlMax: d.priceHigh,
               displayDate: formatXAxis(d.date)
           };
       });

       const CustomShape = (props: any) => {
            const { x, y, width, height, isUp, payload } = props;
            const fill = isUp ? '#ef4444' : '#22c55e'; // Red for up (Taiwan style), Green for down
            
            // Calculate pixel positions for high/low lines safely
            const yHigh = (props.yAxis && props.yAxis.scale) ? props.yAxis.scale(payload.hlMax) : y;
            const yLow = (props.yAxis && props.yAxis.scale) ? props.yAxis.scale(payload.hlMin) : Math.max(y, y + height);

            const lineX = x + width / 2;

            return (
                <g>
                    {/* Wick */}
                    {(props.yAxis && props.yAxis.scale) && (
                        <line x1={lineX} y1={yHigh} x2={lineX} y2={yLow} stroke={fill} strokeWidth={1} />
                    )}
                    {/* Body */}
                    <rect x={x} y={y} width={width} height={Math.max(1, height)} fill={fill} />
                </g>
            );
       };

       // find y-axis domain
       let minVal = Infinity;
       let maxVal = -Infinity;
       data.forEach(d => {
           if (d.priceLow < minVal) minVal = d.priceLow;
           if (d.priceHigh > maxVal) maxVal = d.priceHigh;
       });

       // Adding padding
       const padding = (maxVal - minVal) * 0.1;
       minVal = Math.max(0, minVal - padding);
       maxVal = maxVal + padding;

       return (
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
              <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                  <span className="text-sm text-slate-400">近三個月</span>
              </div>
              <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={transformed} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                          <XAxis dataKey="displayDate" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={20} />
                          <YAxis domain={[minVal, maxVal]} tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} dx={-10} tickFormatter={(val) => Math.round(val).toLocaleString()} />
                          <Tooltip 
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: any, name: any, props: any) => {
                                 if (name === "ocRange") return [props.payload.priceCurrent, "收盤"];
                                 return [value, name];
                              }}
                              labelFormatter={(label) => `日期: ${label}`}
                          />
                          <Bar dataKey="ocRange" shape={<CustomShape />} />
                      </ComposedChart>
                  </ResponsiveContainer>
              </div>
           </div>
       );
  };

  if (!data || data.stats.length === 0) return <div className="p-4 text-center text-slate-500">無大盤資料</div>;

  return (
    <div className="h-full p-4 overflow-y-auto scrollbar-hide bg-slate-50">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="text-blue-600">📊</span> 大盤指數分析
        </h2>

        {/* Stats Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">指數</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 whitespace-nowrap">收盤最高點</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 whitespace-nowrap">盤中最高點</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 whitespace-nowrap">高點日期</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 whitespace-nowrap">最新股價</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 whitespace-nowrap">跌點(收盤)</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 whitespace-nowrap">跌點(盤中)</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 min-w-[140px]">跌幅(收盤)</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 min-w-[140px]">跌幅(盤中)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {data.stats.map(s => {
                            // find max abs value for bar chart scale
                            const maxDropClose = Math.max(...data.stats.map(x => Math.abs(x.dropPctClose)));
                            const maxDropIntraday = Math.max(...data.stats.map(x => Math.abs(x.dropPctIntraday)));

                            return (
                                <tr key={s.name} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-800 whitespace-nowrap">{s.name}</td>
                                    <td className="px-4 py-3 text-sm text-right text-slate-600">{s.maxClose.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 text-sm text-right text-slate-600">{s.maxIntraday.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 text-sm text-center text-slate-500">{s.dateMax}</td>
                                    <td className="px-4 py-3 text-sm text-right text-blue-600 font-bold">{s.latestPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    <td className={`px-4 py-3 text-sm text-right font-medium ${s.dropPointClose < 0 ? 'text-green-600' : 'text-slate-600'}`}>{s.dropPointClose.toFixed(2)}</td>
                                    <td className={`px-4 py-3 text-sm text-right font-medium ${s.dropPointIntraday < 0 ? 'text-green-600' : 'text-slate-600'}`}>{s.dropPointIntraday.toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                        {renderPercentBar(s.dropPctClose, maxDropClose || 10)}
                                    </td>
                                    <td className="px-4 py-3">
                                        {renderPercentBar(s.dropPctIntraday, maxDropIntraday || 10)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Chart 1: Comparison Line Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
            <div className="flex items-baseline gap-3 mb-4">
               <h3 className="text-lg font-bold text-slate-800">漲跌幅比較</h3>
               <span className="text-sm text-slate-400">同一起跑點</span>
            </div>
            
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.comparisonData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="displayDate" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={30} />
                        <YAxis tickFormatter={(val) => `${val}%`} tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} dx={-5} />
                        <Tooltip 
                            formatter={(value: any, name: any) => [`${Number(value).toFixed(2)}%`, name]}
                            labelFormatter={(label) => `日期: ${label}`}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
                        {data.stats.map((s, idx) => (
                            <Line 
                                key={s.name} 
                                type="monotone" 
                                dataKey={s.name} 
                                stroke={COLORS[idx % COLORS.length]} 
                                strokeWidth={2} 
                                dot={false} 
                                activeDot={{ r: 6 }} 
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Charts 2-6: Individual Candlestick/Line Charts */}
        <div className="space-y-4">
            {data.stats.map((s, idx) => (
                <CandlestickChart key={s.name} data={s.history} title={s.name} color={COLORS[idx % COLORS.length]} />
            ))}
        </div>
        
    </div>
  );
};

export default MarketIndexView;
