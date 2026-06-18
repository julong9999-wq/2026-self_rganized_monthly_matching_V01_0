import * as fs from 'fs';
let content = fs.readFileSync('components/DailyAnalysisView.tsx', 'utf-8');

const START_MARKER = '// --- 新增：年度績效分析';
const END_MARKER = 'return {';

const idx1 = content.indexOf(START_MARKER);
const idx2 = content.indexOf(END_MARKER, idx1);

if (idx1 !== -1 && idx2 !== -1) {
    const replacement = `// --- 新增：年度績效分析 (自訂 2025/12 開始) ---
      const perfMonths: { label: string; perf: number; yield: number; total: number; y: number; m: number }[] = [];
      const START_YEAR = 2025;
      
      // 依序產生 Y/M 列表，從 2025/12 到 本月
      const monthsToProcess: {y: number, m: number, label: string}[] = [];
      monthsToProcess.push({ y: 2025, m: 11, label: '2025/12' }); // 2025/12
      
      for (let y = 2026; y <= currentYear; y++) {
          const mEnd = (y === currentYear) ? currentMonth : 11;
          for (let m = 0; m <= mEnd; m++) {
               monthsToProcess.push({ y, m, label: \`\${y}/\${String(m + 1).padStart(2, '0')}\` });
          }
      }

      // 預先準備好每個月的起點與終點價值
      const monthValues: Record<string, { valEoM: number, valStart: number, dividendMonth: number }> = {};

      monthsToProcess.forEach(({y, m, label}) => {
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

                const totalShares = item.transactions.reduce((s, tx) => s + tx.shares, 0);

                let priceStart = 0;
                let priceEnd = 0;

                if (y === 2025 && m === 11) {
                     // 根據使用者條件：2025/12 的值預設等同於 2026-01 的第一筆（如 2026-01-02）
                     const janPrices = getPricesInMonth(2026, 0);
                     if (janPrices.length > 0) {
                          priceStart = janPrices[0].price;
                          priceEnd = priceStart; // 讓 valEoM 等於 valStart，因此績效為 0
                     } else if (sortedHistory.length > 0) {
                          priceStart = sortedHistory[0].price;
                          priceEnd = priceStart;
                     } else {
                          priceStart = item.etf.priceBase;
                          priceEnd = item.etf.priceBase;
                     }
                } else if (y === 2026 && m === 0) {
                     // 1月: 開始值來自上月(2025/12)的值 (即 2026-01 的第一筆)，結束值即 1月底價格
                     const janPrices = getPricesInMonth(2026, 0);
                     if (janPrices.length > 0) {
                         priceStart = janPrices[0].price; // 2026-01 第一個交易日 (例如 01-02)
                         priceEnd = janPrices[janPrices.length - 1].price; // 1月底 (例如 01-30)
                     } else {
                         priceStart = item.etf.priceBase;
                         priceEnd = item.etf.priceBase;
                     }
                } else {
                     // 其他月份: 開始值為前一個月的月底最後價格，結束值為本月月底
                     let prevM = m - 1;
                     let prevY = y;
                     if (prevM < 0) {
                         prevM = 11;
                         prevY--;
                     }
                     const prevPrices = getPricesInMonth(prevY, prevM);
                     if (prevPrices.length > 0) {
                         priceStart = prevPrices[prevPrices.length - 1].price;
                     } else {
                         priceStart = sortedHistory.length > 0 ? sortedHistory[0].price : item.etf.priceBase;
                     }
                     
                     if (m === currentMonth && y === currentYear) {
                         priceEnd = item.etf.priceCurrent;
                     } else {
                         const currPrices = getPricesInMonth(y, m);
                         if (currPrices.length > 0) {
                             priceEnd = currPrices[currPrices.length - 1].price;
                         } else {
                             priceEnd = priceStart;
                         }
                     }
                }

                valEoM += (totalShares * priceEnd);
                valStart += (totalShares * priceStart);

                // 月配股息計算
                if (y >= 2026) {
                    item.etf.dividends.forEach(d => {
                        const dTs = parseDateSimple(d.date);
                        const monthEnd = new Date(y, m + 1, 0, 23, 59, 59).getTime();
                        const prevMonthEnd = new Date(y, m, 0, 23, 59, 59).getTime();
                        if (dTs > prevMonthEnd && dTs <= monthEnd) {
                            dividendMonth += totalShares * d.amount;
                        }
                    });
                }
           });

           monthValues[label] = { valEoM, valStart, dividendMonth };
      });

      monthsToProcess.forEach(({ y, m, label }) => {
           const { valEoM, valStart, dividendMonth } = monthValues[label];
           // 對於 2025/12，valEoM === valStart，perf === 0
           const perfMonth = valEoM - valStart; 
           perfMonths.push({
               label,
               perf: Math.round(perfMonth),
               yield: Math.round(dividendMonth),
               total: Math.round(perfMonth + dividendMonth),
               y, m
           });
      });

      `;
    
    content = content.substring(0, idx1) + replacement + content.substring(idx2);
    fs.writeFileSync('components/DailyAnalysisView.tsx', content, 'utf-8');
    console.log('Replaced performance calculation block 5');
} else {
    console.log('Markers not found');
}
