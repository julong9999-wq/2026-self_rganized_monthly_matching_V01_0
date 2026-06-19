
import React, { useState, useEffect } from 'react';
import { Play, Database, Eye } from 'lucide-react';

interface Props {
  defaultUrls: string[];
  onStart: (urls: string[]) => void;
  isLoading: boolean;
}

const SheetConfigView: React.FC<Props> = ({ defaultUrls, onStart, isLoading }) => {
  const [urls, setUrls] = useState<string[]>(defaultUrls || Array(8).fill(''));
  const [visitCount, setVisitCount] = useState<number | null>(null);

  // 取得瀏覽人數
  useEffect(() => {
    const fetchCount = async () => {
        try {
            const res = await fetch('https://api.counterapi.dev/v1/2026-etf-assistant-app/visits/up');
            if (res.ok) {
                const data = await res.json();
                setVisitCount(data.count);
            } else {
                throw new Error("API Error");
            }
        } catch (e) {
            const local = parseInt(localStorage.getItem('local_visits') || '0', 10) + 1;
            localStorage.setItem('local_visits', local.toString());
            setVisitCount(local);
        }
    };
    fetchCount();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart(urls);
  };

  const handleUrlChange = (index: number, val: string) => {
    const newUrls = [...urls];
    newUrls[index] = val;
    setUrls(newUrls);
  };

  const labels = [
    { title: 'AP214 基本資料', color: 'text-blue-900', icon: <Database className="w-5 h-5 text-blue-900" /> },
    { title: 'AP215 除息資料', color: 'text-emerald-600', icon: <Database className="w-5 h-5 text-emerald-600" /> },
    { title: 'AP101 最新股價', color: 'text-indigo-600', icon: <Database className="w-5 h-5 text-indigo-600" /> },
    { title: 'AP217 歷史資料', color: 'text-purple-600', icon: <Database className="w-5 h-5 text-purple-600" /> },
    { title: 'AP213 每日股價', color: 'text-orange-600', icon: <Database className="w-5 h-5 text-orange-600" /> },
    { title: 'AP211 台股大盤', color: 'text-pink-600', icon: <Database className="w-5 h-5 text-pink-600" /> },
    { title: 'AP212 美股指數', color: 'text-cyan-600', icon: <Database className="w-5 h-5 text-cyan-600" /> },
    { title: 'AP216 規模大小', color: 'text-teal-600', icon: <Database className="w-5 h-5 text-teal-600" /> }
  ];

  return (
    <div className="min-h-full flex flex-col justify-center pb-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full overflow-hidden">
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="pb-6 border-b border-slate-100 flex flex-col gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-900 text-white font-bold py-4 rounded-xl hover:bg-blue-800 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-xl"
              >
                {isLoading ? (
                  <>處理中...</>
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-current" />
                    讀取並分析
                  </>
                )}
              </button>

              <div className="text-center space-y-2">
                  <p className="text-base text-red-500 font-bold bg-red-50 py-2 rounded-lg border border-red-100 leading-snug">
                      請每天執行 "讀取並分析" 按鈕<br/>以便更新 "即時股價"
                  </p>
                  <p className="text-sm text-slate-400">
                      系統將自動解析 CSV 格式
                  </p>
              </div>
            </div>

            {labels.map((lbl, idx) => (
                <div key={idx} className="space-y-3">
                  <label className={`text-lg font-bold text-slate-800 flex items-center gap-2`}>
                    {lbl.icon}
                    {lbl.title}
                  </label>
                  <input
                    type="text"
                    value={urls[idx] || ''}
                    onChange={(e) => handleUrlChange(idx, e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/..."
                    className="w-full px-4 py-4 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-200 transition-all text-lg text-slate-700 bg-slate-50"
                  />
                </div>
            ))}

            {/* 網站瀏覽人數紀錄 */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center justify-center text-slate-400 gap-1">
                 <div className="flex items-center gap-2 text-sm font-medium">
                     <Eye className="w-4 h-4" />
                     <span>網站瀏覽人數</span>
                 </div>
                 <div className="font-mono text-xl font-bold text-slate-600 tracking-wider">
                     {visitCount !== null ? visitCount.toLocaleString() : '---'}
                 </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default SheetConfigView;
