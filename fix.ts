import * as fs from 'fs';
let content = fs.readFileSync('components/DailyAnalysisView.tsx', 'utf-8');

// replace label headers in E
content = content.replace(/<span className="text-\[12px\] font-light text-slate-500">名稱<\/span>[\s]*\n/g, '');
content = content.replace(/<span className="text-\[12px\] font-light text-slate-500">股數<\/span>[\s]*\n/g, '');
content = content.replace(/<span className="text-\[12px\] font-light text-slate-500">除息<\/span>[\s]*\n/g, '');
content = content.replace(/<span className="text-\[12px\] font-light text-slate-500">股息<\/span>[\s]*\n/g, '');

// replace empty line leftovers just in case
content = content.replace(/<div className="flex flex-col">\s*<span className="text-\[16px/g, '<div className="flex flex-col">\n                                        <span className="text-[16px');
content = content.replace(/<div className="flex flex-col text-right">\s*<span className="text-\[16px/g, '<div className="flex flex-col text-right">\n                                        <span className="text-[16px');
content = content.replace(/<div className="flex flex-col">\s*<div className="flex items-baseline gap-1">/g, '<div className="flex flex-col">\n                                        <div className="flex items-baseline gap-1">');


// replace label headers in F
content = content.replace(/<span className="text-\[12px\] font-light text-slate-500 mb-0\.5">名稱<\/span>[\s]*\n/g, '');
content = content.replace(/<span className="text-\[12px\] font-light text-slate-500 mb-0\.5">股數<\/span>[\s]*\n/g, '');
content = content.replace(/<span className="text-\[12px\] font-light text-slate-500 mb-0\.5">漲跌<\/span>[\s]*\n/g, '');
content = content.replace(/<span className="text-\[12px\] font-light text-slate-500 mb-0\.5">金額<\/span>[\s]*\n/g, '');

const origDiv = `{analysisData.todayDividendsList.length > 0 && (
                          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 flex flex-col gap-1 mb-3">
                              <div className="flex justify-between items-center text-yellow-800">
                                  <span className="text-[14px] font-bold">今日除息彙整</span>
                                  <span className="text-[16px] font-bold">\${formatMoney(analysisData.totalTodayDividendIncome)}</span>
                              </div>
                              <div className="text-[12px] text-yellow-700 mt-1">
                                  {analysisData.todayDividendsList.map(item => \`\${item.name} ($\${formatMoney(item.totalAmount)})\`).join(', ')}
                              </div>
                          </div>
                      )}`;

const newDiv = `{analysisData.todayDividendsList.length > 0 && (
                          <div className="bg-[#fffdf0] px-3 py-2 rounded-lg border border-yellow-200 flex flex-col mb-3">
                              <div className="flex justify-between items-center text-yellow-800 border-b border-yellow-200/50 pb-1 mb-1">
                                  <span className="text-[14px] font-bold">今日除息彙整</span>
                                  <span className="text-[16px] font-bold">\${formatMoney(analysisData.totalTodayDividendIncome)}</span>
                              </div>
                              <div className="flex flex-col space-y-1">
                                  <div className="flex justify-between text-[11px] font-bold text-yellow-700/70">
                                      <span className="flex-1">股名</span>
                                      <span className="w-14 text-right">除息</span>
                                      <span className="w-16 text-right">股數</span>
                                      <span className="w-20 text-right">股息</span>
                                  </div>
                                  {analysisData.todayDividendsList.map((item, idx) => (
                                      <div key={idx} className="flex justify-between text-[13px] text-yellow-900 border-t border-yellow-200/30 pt-1">
                                          <span className="flex-1 truncate">{item.name}</span>
                                          <span className="w-14 text-right">{item.unitAmount}</span>
                                          <span className="w-16 text-right">{formatShare(item.shares)}</span>
                                          <span className="w-20 text-right font-bold text-yellow-800">\${formatMoney(item.totalAmount)}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}`;

content = content.replace(origDiv, newDiv);

// padding adjustments
content = content.replace(/className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col gap-1"/g, 'className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex flex-col pt-1.5 gap-0.5"');
content = content.replace(/mt-2 pt-2/g, 'mt-1 pt-1');
content = content.replace(/mt-0.5/g, 'mt-0');

fs.writeFileSync('components/DailyAnalysisView.tsx', content, 'utf-8');
