import * as fs from 'fs';
let content = fs.readFileSync('components/DailyAnalysisView.tsx', 'utf-8');

const START_MARKER = '// --- 新增：年度績效分析 (從 2026/01 起) ---';
const END_MARKER = 'return {';

const idx1 = content.indexOf(START_MARKER);
const idx2 = content.indexOf(END_MARKER, idx1);

if (idx1 !== -1 && idx2 !== -1) {
    const replacement = `${START_MARKER}
      const perfMonths: { label: string; perf: number; yield: number; total: number; y: number; m: number }[] = [];
      const START_YEAR = 2026;
      for (let y = START_YEAR; y <= currentYear; y++) {
          const mStart = (y === START_YEAR) ? 0 : 0;
          const mEnd = (y === currentYear) ? currentMonth : 11;
          
          for (let m = mStart; m <= mEnd; m++) {
               let valEoM = 0;
               let valStart = 0;
               let dividendMonth = 0;

               portfolio.forEach(item => {
                    const history = item.etf.priceHistory || [];
                    const sortedHistory = [...history].sort((a,b) => parseDateSimple(a.date) - parseDateSimple(b.date));
                    
                    const getPricesInMonth = (year: number, month: number) => {
                        return sortedHistory.filter(h => {
                            const d = new Date(parseDateSimple(h.date));
                            return d.getFullYear() === year && d.getMonth() === month;
                        });
                    };

                    const getLatestPriceInMonth = (year: number, month: number, fallback: number) => {
                        const inMonth = getPricesInMonth(year, month);
                        if (inMonth.length > 0) return inMonth[inMonth.length - 1].price;
                        return fallback;
                    };

                    const getEarliestPriceInMonth = (year: number, month: number, fallback: number) => {
                        const inMonth = getPricesInMonth(year, month);
                        if (inMonth.length > 0) return inMonth[0].price;
                        return fallback;
                    };

                    // 使用使用者「目前所有庫存張數」
                    const totalShares = item.transactions.reduce((s, tx) => s + tx.shares, 0);

                    // 取得月底股價 (如果是當月，則使用即時股價)
                    let priceEnd = 0;
                    if (m === currentMonth && y === currentYear) {
                         priceEnd = item.etf.priceCurrent;
                    } else {
                         priceEnd = getLatestPriceInMonth(y, m, item.etf.priceBase);
                    }

                    // 取得月初(或上月底)股價
                    let priceStart = 0;
                    if (m === 0 && y === START_YEAR) { 
                        // 1月為 1月底 - 1月初(1/2) 
                        priceStart = getEarliestPriceInMonth(y, m, item.etf.priceBase);
                        
                        // 若歷史資料第一點不是 1月，保險起見我們抓整個 history 的第一點
                        if (getPricesInMonth(y, m).length === 0 && sortedHistory.length > 0) {
                             priceStart = sortedHistory[0].price;
                        }
                    } else { 
                        // 2月以上: 使用前一個月底的最後一個交易日股價
                        let prevM = m - 1;
                        let prevY = y;
                        if (prevM < 0) {
                            prevM = 11;
                            prevY--;
                        }
                        
                        let searchM = prevM;
                        let searchY = prevY;
                        let foundPriceStart = getLatestPriceInMonth(searchY, searchM, 0);
                        
                        let lookback = 0;
                        while (foundPriceStart === 0 && lookback < 3) {
                            searchM--;
                            if (searchM < 0) {
                                searchM = 11;
                                searchY--;
                            }
                            foundPriceStart = getLatestPriceInMonth(searchY, searchM, 0);
                            lookback++;
                        }
                        
                        priceStart = foundPriceStart || item.etf.priceBase;
                    }

                    // 若 priceStart 與 priceEnd 皆為 priceBase (沒有抓到歷史資料)
                    // 這邊我們允許它為 0，如果使用者問起，再確認 CSV 資料是否有缺漏。
                    // 但我們嘗試拿最接近的。

                    valEoM += (totalShares * priceEnd);
                    valStart += (totalShares * priceStart);

                    // 月配股息計算 (統一用總張數)
                    item.etf.dividends.forEach(d => {
                        const dTs = parseDateSimple(d.date);
                        const monthEnd = new Date(y, m + 1, 0, 23, 59, 59).getTime();
                        const prevMonthEnd = new Date(y, m, 0, 23, 59, 59).getTime();
                        if (dTs > prevMonthEnd && dTs <= monthEnd) {
                            dividendMonth += totalShares * d.amount;
                        }
                    });
               });
               
               const perfMonth = valEoM - valStart; 
               const label = \`\${y}/\${String(m + 1).padStart(2, '0')}\`;
               perfMonths.push({
                   label,
                   perf: Math.round(perfMonth),
                   yield: Math.round(dividendMonth),
                   total: Math.round(perfMonth + dividendMonth),
                   y, m
               });
          }
      }

      `;
    
    content = content.substring(0, idx1) + replacement + content.substring(idx2);
    fs.writeFileSync('components/DailyAnalysisView.tsx', content, 'utf-8');
    console.log('Replaced performance calculation block 4');
} else {
    console.log('Markers not found');
}
