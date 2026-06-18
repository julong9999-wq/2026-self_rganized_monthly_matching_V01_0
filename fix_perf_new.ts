import * as fs from 'fs';
let content = fs.readFileSync('components/DailyAnalysisView.tsx', 'utf-8');

const START_MARKER = '// --- 新增：年度績效分析';
const END_MARKER = 'return {';

const idx1 = content.indexOf(START_MARKER);
const idx2 = content.indexOf(END_MARKER, idx1);

if (idx1 !== -1 && idx2 !== -1) {
    const replacement = `// --- 新增：年度績效分析 (依照使用者要求公式) ---
      const perfMonths: { label: string; perf: number; yield: number; total: number; y: number; m: number }[] = [];
      
      const monthsToProcess: {y: number, m: number, label: string}[] = [];
      monthsToProcess.push({ y: 2025, m: 11, label: '2025/12' }); // 新增 2025/12

      const START_YEAR = 2026;
      for (let y = START_YEAR; y <= currentYear; y++) {
          const mEnd = (y === currentYear) ? currentMonth : 11;
          for (let m = 0; m <= mEnd; m++) {
               monthsToProcess.push({ y, m, label: \`\${y}/\${String(m + 1).padStart(2, '0')}\` });
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
           const monthEndTs = new Date(y, m + 1, 0, 23, 59, 59).getTime();

           portfolio.forEach(item => {
                const history = item.etf.priceHistory || [];
                const sortedHistory = [...history].sort((a,b) => parseDateSimple(a.date) - parseDateSimple(b.date));
                
                // 本月淨買進金額 (直接計算這個月區間內的所有 transactions 的 totalAmount)
                let itemPurchase = 0;
                item.transactions.forEach(tx => {
                    const txTs = parseDateSimple(tx.date);
                    if (y === 2025 && m === 11) {
                         // 針對 2025/12 不列入購賣
                    } else if (txTs >= monthStartTs && txTs <= monthEndTs) {
                         itemPurchase += tx.totalAmount;
                    }
                });
                purchaseMonth += itemPurchase;

                // 本月股息
                item.etf.dividends.forEach(d => {
                    const dTs = parseDateSimple(d.date);
                    if (y === 2025 && m === 11) {
                        // 針對 2025/12 不計股息
                    } else if (dTs >= monthStartTs && dTs <= monthEndTs) {
                        const sharesAtExDiv = item.transactions.filter(tx => parseDateSimple(tx.date) <= dTs).reduce((s, tx) => s + tx.shares, 0);
                        dividendMonth += sharesAtExDiv * d.amount;
                    }
                });

                // 2025/12 月底庫存設定為 2026/01 第一個交易日的價值
                if (y === 2025 && m === 11) {
                     const firstDayPrices = getPricesInMonth(sortedHistory, 2026, 0);
                     let firstDayTs = new Date(2026, 0, 1).getTime();
                     let priceStart = item.etf.priceBase;
                     if (firstDayPrices.length > 0) {
                         firstDayTs = parseDateSimple(firstDayPrices[0].date);
                         priceStart = firstDayPrices[0].price;
                     }
                     const sharesStart = item.transactions.filter(tx => parseDateSimple(tx.date) <= firstDayTs).reduce((s, tx) => s + tx.shares, 0);
                     valEoM += sharesStart * priceStart;
                } else {
                     // 本月底庫存 (月底庫存張數 * 當月最後一個交易日股價)
                     const sharesEoM = item.transactions.filter(tx => parseDateSimple(tx.date) <= monthEndTs).reduce((s, tx) => s + tx.shares, 0);
                     let priceEoM = getLatestPriceInMonth(sortedHistory, y, m, item.etf.priceBase);
                     if (m === currentMonth && y === currentYear) {
                         priceEoM = item.etf.priceCurrent; // 當月用最新價格
                     }
                     valEoM += sharesEoM * priceEoM;
                }
           });

           endValuesMap[label] = valEoM;

           let perfMonth = 0;
           if (y === 2025 && m === 11) {
               perfMonth = 0; // 2025/12 績效為 0
           } else {
               // 2026/01 以後 績效 = 月底庫存 - 上月底庫存 - 本月購賣
               let prevM = m - 1;
               let prevY = y;
               if (prevM < 0) { prevM = 11; prevY--; }
               const prevLabel = \`\${prevY}/\${String(prevM + 1).padStart(2, '0')}\`;
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

      `;
    
    content = content.substring(0, idx1) + replacement + content.substring(idx2);
    fs.writeFileSync('components/DailyAnalysisView.tsx', content, 'utf-8');
    console.log('Replaced performance calculation block new');
} else {
    console.log('Markers not found');
}
