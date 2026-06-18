import * as fs from 'fs';
let content = fs.readFileSync('components/DailyAnalysisView.tsx', 'utf-8');

content = content.replace(
    'p-3 space-y-3',
    'px-2 py-2 space-y-2'
);

const hBlock = `
          {/* H. 年度績效分析 */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
               <div onClick={() => toggleAnalysis('H')} className="p-3 flex items-center justify-between cursor-pointer bg-white hover:bg-slate-50">
                   <div className="flex items-center gap-2 flex-1 justify-between pr-2">
                       <div className="flex items-center gap-2">
                           <div className="p-1 bg-amber-100 rounded"><BarChart2 className="w-4 h-4 text-amber-600" /></div>
                           <h4 className="font-bold text-[18px] text-slate-800">H. 年度績效分析</h4>
                       </div>
                   </div>
                   {expandedAnalysis.includes('H') ? <Minus className="w-4 h-4 text-slate-400"/> : <Plus className="w-4 h-4 text-slate-400"/>}
               </div>

               {expandedAnalysis.includes('H') && (
                  <div className="px-2 pb-3 border-t border-slate-100 pt-2 animate-[fadeIn_0.2s_ease-out] flex flex-col gap-4">
                      {/* 圖表 */}
                      {analysisData.perfMonths.length > 0 ? (
                          <div className="w-full h-[220px]">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={analysisData.perfMonths} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                      <XAxis 
                                        dataKey="label" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#64748B' }} 
                                        dy={10} 
                                      />
                                      <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fill: '#64748B' }} 
                                        tickFormatter={(val) => Math.round(val/1000) + 'k'}
                                      />
                                      <Tooltip
                                        cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                        formatter={(value: number) => ['$' + formatMoney(value), '']}
                                        labelStyle={{ fontWeight: 'bold', color: '#1E293B', marginBottom: '4px' }}
                                      />
                                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748B' }} />
                                      <Bar dataKey="perf" name="績效" stackId="a" fill="#ef4444" radius={[0, 0, 4, 4]} />
                                      <Bar dataKey="yield" name="股息" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      ) : (
                          <div className="text-center text-slate-400 text-sm py-6">尚無資料</div>
                      )}

                      {/* 表格 */}
                      {analysisData.perfMonths.length > 0 && (
                          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden text-[12px] flex flex-col">
                              <div className="flex justify-between bg-slate-200 text-slate-600 font-bold px-2 py-1.5 border-b border-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                                  <span className="flex-1">年月</span>
                                  <span className="flex-1 text-right">績效</span>
                                  <span className="flex-1 text-right">股息</span>
                                  <span className="flex-1 text-right text-slate-800">小計</span>
                              </div>
                              {analysisData.perfMonths.map((row, idx) => (
                                  <div key={idx} className="flex justify-between px-2 py-1.5 border-b border-slate-200/60 last:border-0 hover:bg-white transition-colors">
                                      <span className="flex-1 text-slate-500 font-medium">{row.label}</span>
                                      <span className={\`flex-1 text-right \${row.perf > 0 ? 'text-red-600' : row.perf < 0 ? 'text-green-600' : 'text-slate-600'}\`}>
                                          {row.perf > 0 ? '+' : ''}{formatMoney(row.perf)}
                                      </span>
                                      <span className="flex-1 text-right text-slate-600">{formatMoney(row.yield)}</span>
                                      <span className="flex-1 text-right font-bold text-slate-800">{formatMoney(row.total)}</span>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
               )}
          </div>
      </div>
    </div>
  );
};`;

content = content.replace(
    '          </div>\n      </div>\n    </div>\n  );\n};',
    hBlock
);

fs.writeFileSync('components/DailyAnalysisView.tsx', content, 'utf-8');
