import React from 'react';
import { PortfolioItem, StockDailyPrice } from '../types';

interface Props {
  portfolio: PortfolioItem[];
  stockDailyPrices: StockDailyPrice[];
}

const HoldingAnalysisView: React.FC<Props> = ({ portfolio, stockDailyPrices }) => {
  return (
    <div className="h-full p-6 overflow-y-auto scrollbar-hide bg-slate-50">
       <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="text-blue-600">💼</span> 持股分析
       </h2>

       {portfolio.length === 0 ? (
           <div className="bg-white rounded-xl p-8 text-center text-slate-400 shadow-sm text-lg">
                目前沒有持股資料，請先至「自組月配」或「績效查詢」新增持股。
           </div>
       ) : (
           <div className="space-y-4">
              {portfolio.map(p => {
                  const currentPrice = stockDailyPrices.find(s => s.code === p.code)?.priceCurrent || 0;
                  const estimatedValue = currentPrice * p.count;

                  return (
                      <div key={p.code} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                          <div className="flex justify-between items-start mb-2">
                              <div>
                                  <h3 className="text-lg font-bold text-slate-800">{p.code} {p.name}</h3>
                                  <p className="text-sm font-medium text-slate-500">持有股數: {p.count.toLocaleString()} 股</p>
                              </div>
                              <div className="text-right">
                                  <div className="text-xl font-bold text-blue-600">${estimatedValue.toLocaleString()}</div>
                                  <div className="text-sm text-slate-400">目前市值</div>
                              </div>
                          </div>
                      </div>
                  );
              })}
           </div>
       )}
    </div>
  );
};

export default HoldingAnalysisView;
