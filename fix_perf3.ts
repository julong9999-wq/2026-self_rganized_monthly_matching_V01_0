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
               // End of month timestamp
               const monthEnd = new Date(y, m + 1, 0, 23, 59, 59);
               const monthEndTs = monthEnd.getTime();
               
               // Prev month end timestamp
               const prevMonthEnd = new Date(y, m, 0, 23, 59, 59);
               const prevMonthEndTs = prevMonthEnd.getTime();

               let realEndTs = monthEndTs;
               if (m === currentMonth && y === currentYear) {
                   realEndTs = todayDate.getTime();
               }

               let valEoM = 0;
               let valStart = 0;
               let dividendMonth = 0;

               portfolio.forEach(item => {
                    const history = item.etf.priceHistory || [];
                    const sortedHistory = [...history].sort((a,b) => parseDateSimple(a.date) - parseDateSimple(b.date));
                    
                    const getPriceBeforeOrOn = (ts: number, fallback: number) => {
                        let p = fallback;
                        let maxT = -1;
                        for (const h of sortedHistory) {
                            const ht = parseDateSimple(h.date);
                            if (ht <= ts && ht > maxT) {
                                maxT = ht;
                                p = h.price;
                            }
                        }
                        return p;
                    };

                    const getPriceAfterOrOn = (ts: number, fallback: number) => {
                        let p = fallback;
                        let minT = Infinity;
                        for (const h of sortedHistory) {
                            const ht = parseDateSimple(h.date);
                            if (ht >= ts && ht < minT) {
                                minT = ht;
                                p = h.price;
                            }
                        }
                        if (minT === Infinity) return getPriceBeforeOrOn(ts, fallback);
                        return p;
                    };

                    // 使用使用者「目前所有庫存張數」
                    const totalShares = item.transactions.reduce((s, tx) => s + tx.shares, 0);

                    // 取得「月底」股價
                    let priceEnd = getPriceBeforeOrOn(realEndTs, item.etf.priceBase);
                    if (m === currentMonth && y === currentYear) {
                         // 機動到現在最新價格
                         priceEnd = item.etf.priceCurrent;
                    }
                    valEoM += (totalShares * priceEnd);

                    // 取得「月初/上月底」股價
                    if (m === 0 && y === START_YEAR) { 
                        // 1月: 年初 (01-01 休市則找最近後續交易日 01-02)
                        const jan1Ts = new Date(y, 0, 1, 0, 0, 0).getTime();
                        const priceStart = getPriceAfterOrOn(jan1Ts, item.etf.priceBase);
                        valStart += (totalShares * priceStart);
                    } else { 
                        // 2月以上: 找上個月底的最後一個交易日
                        const priceStart = getPriceBeforeOrOn(prevMonthEndTs, item.etf.priceBase);
                        valStart += (totalShares * priceStart);
                    }

                    // 月配股息計算
                    item.etf.dividends.forEach(d => {
                        const dTs = parseDateSimple(d.date);
                        if (dTs > prevMonthEndTs && dTs <= monthEndTs) {
                            // 統一使用總張數計算股息，以對齊使用者單一庫存量假設
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
    console.log('Replaced performance calculation block 3');
} else {
    console.log('Markers not found');
}
