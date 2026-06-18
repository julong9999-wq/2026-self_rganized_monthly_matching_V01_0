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
               // End of month timestamp (23:59:59 確保涵蓋整天)
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
                    
                    // 根據使用者要求：找每個月最後一個交易日 (扣除六日沒有資料的狀況)
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

                    // 1月1日休市，找最近後續的股價 (如: 01-02)
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

                    // 計算「月底」價值
                    const sharesEnd = item.transactions.filter(tx => parseDateSimple(tx.date) <= realEndTs).reduce((s, tx) => s + tx.shares, 0);
                    let priceEnd = getPriceBeforeOrOn(realEndTs, item.etf.priceBase);
                    if (m === currentMonth && y === currentYear) {
                         // 機動到現在最新價格
                         priceEnd = item.etf.priceCurrent;
                    }
                    valEoM += (sharesEnd * priceEnd);

                    // 計算「月初/上月底」價值
                    if (m === 0 && y === START_YEAR) { 
                        // 1月: 年初 (01-01 休市則找最近後續交易日 01-02)
                        const jan1Ts = new Date(y, 0, 1, 0, 0, 0).getTime();
                        const sharesStart = item.transactions.filter(tx => parseDateSimple(tx.date) <= jan1Ts).reduce((s, tx) => s + tx.shares, 0);
                        const priceStart = getPriceAfterOrOn(jan1Ts, item.etf.priceBase);
                        valStart += (sharesStart * priceStart);
                    } else { 
                        // 2月以上: 找上個月底的最後一個交易日 (完全銜接至上個月的 End Value)
                        const sharesStart = item.transactions.filter(tx => parseDateSimple(tx.date) <= prevMonthEndTs).reduce((s, tx) => s + tx.shares, 0);
                        const priceStart = getPriceBeforeOrOn(prevMonthEndTs, item.etf.priceBase);
                        valStart += (sharesStart * priceStart);
                    }

                    // 月配股息計算
                    item.etf.dividends.forEach(d => {
                        const dTs = parseDateSimple(d.date);
                        if (dTs > prevMonthEndTs && dTs <= monthEndTs) {
                            const sharesAtExDiv = item.transactions.filter(tx => parseDateSimple(tx.date) <= dTs).reduce((s, tx) => s + tx.shares, 0);
                            dividendMonth += sharesAtExDiv * d.amount;
                        }
                    });
               });
               
               // 用戶指示：月底價值 - 月初價值 (純粹看市值增減，不扣除成本計算以配合自製 Excel 邏輯)
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
    console.log('Replaced performance calculation block');
} else {
    console.log('Markers not found');
}
