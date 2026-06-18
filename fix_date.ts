import * as fs from 'fs';
let content = fs.readFileSync('components/DailyAnalysisView.tsx', 'utf-8');

const target = `                    const getPriceAtOrBefore = (ts: number, fallback: number) => {
                        let p = fallback;
                        for (let i = 0; i < sortedHistory.length; i++) {
                            if (parseDateSimple(sortedHistory[i].date) <= ts) {
                                 p = sortedHistory[i].price;
                            } else {
                                 break;
                            }
                        }
                        return p;
                    };

                    let priceEoM = getPriceAtOrBefore(monthEndTs, item.etf.priceBase);
                    let pricePrevEoM = getPriceAtOrBefore(prevMonthEndTs, item.etf.priceBase);`;

const replacement = `                    const getPriceClosestTo = (ts: number, fallback: number) => {
                        if (sortedHistory.length === 0) return fallback;
                        let closestP = fallback;
                        let minDiff = Infinity;
                        for (let i = 0; i < sortedHistory.length; i++) {
                            const dTs = parseDateSimple(sortedHistory[i].date);
                            const diff = Math.abs(dTs - ts);
                            if (diff < minDiff) {
                                minDiff = diff;
                                closestP = sortedHistory[i].price;
                            }
                        }
                        // 如果最近的日期差超過 20 天，代表可能沒有這月的資料，退回 fallback
                        if (minDiff > 20 * 24 * 60 * 60 * 1000) return fallback;
                        return closestP;
                    };

                    let priceEoM = getPriceClosestTo(monthEndTs, item.etf.priceBase);
                    let pricePrevEoM = getPriceClosestTo(prevMonthEndTs, item.etf.priceBase);`;

if(content.includes('getPriceAtOrBefore')) {
   content = content.replace(target, replacement);
   fs.writeFileSync('components/DailyAnalysisView.tsx', content, 'utf-8');
   console.log('Replaced date finder');
} else {
   console.log('Target not found');
}
