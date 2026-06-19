
import { EtfData, CategoryKey, Dividend, MarketIndex, StockDailyPrice } from '../types';

/**
 * Returns dynamic base date: first day of the same month in the previous year.
 * Example: if today is 2026/04/24, returns "2025/04/01"
 */
export const getDynamicBaseDateStr = (): string => {
    const today = new Date();
    const prevYear = today.getFullYear() - 1;
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    return `${prevYear}/${month}/01`;
};

/**
 * Robust CSV Row Parser
 * Handles quoted fields containing commas correctly.
 * Example: '2024/01/01,"1,200",0056' -> ['2024/01/01', '1,200', '0056']
 */
const parseCSVRow = (text: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '"') {
      if (inQuote && text[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuote = !inQuote;
      }
    } else if (char === ',' && !inQuote) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(col => col.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
};

/**
 * Converts a Google Sheet URL to a CSV export URL.
 */
export const convertToCsvUrl = (url: string, gid?: string): string => {
  if (!url) return '';
  
  if (url.includes('output=csv') && !gid) return url;
  
  let baseUrl = url;
  if (url.includes('/pubhtml')) {
    baseUrl = url.replace('/pubhtml', '/pub');
    const separator = baseUrl.includes('?') ? '&' : '?';
    let csvUrl = `${baseUrl}${separator}output=csv`;
    if (gid) csvUrl += `&gid=${gid}`;
    return csvUrl;
  }

  if (url.includes('/edit')) {
      const parts = url.split('/edit');
      baseUrl = parts[0]; 
      
      let targetGid = gid || '0'; 
      const gidMatch = url.match(/[#&]gid=(\d+)/);
      if (gidMatch) {
          targetGid = gidMatch[1];
      }
      
      return `${baseUrl}/export?format=csv&gid=${targetGid}`;
  }

  if (url.includes('docs.google.com/spreadsheets/d/')) {
      baseUrl = url.replace(/\/+$/, '');
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}export?format=csv`;
  }

  return url;
};

export const isValidGoogleSheetUrl = (url: string): boolean => {
  return url.includes('docs.google.com/spreadsheets');
};

export const extractTabsFromHtml = (html: string): { name: string; gid: string }[] => {
  const tabs: { name: string; gid: string }[] = [];
  const regex = /name:"([^"]+)",gid:"(\d+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (!tabs.find(t => t.gid === match![2])) {
      tabs.push({ name: match![1], gid: match![2] });
    }
  }
  return tabs;
};

// --- Strict Parsing Logic ---

const CATEGORY_MAP: Record<string, CategoryKey> = {
  // AA. 季一 (共 11 檔)
  '0056': 'AA', '00888': 'AA', '00904': 'AA', '00905': 'AA', '00908': 'AA', '00912': 'AA',
  '00927': 'AA', '00947': 'AA', '00956': 'AA', '00960': 'AA', '00984A': 'AA',
  
  // AB. 季二 (共 12 檔)
  '00690': 'AB', '00731': 'AB', '00771': 'AB', '00850': 'AB', '00878': 'AB', '00891': 'AB',
  '00894': 'AB', '00932': 'AB', '00938': 'AB', '009808': 'AB', '00980A': 'AB', '00982A': 'AB',
  
  // AC. 季三 (共 14 檔, 00989A, 00981A 新增)
  '00712': 'AC', '00713': 'AC', '00728': 'AC', '00896': 'AC', '00903': 'AC', '00915': 'AC',
  '00918': 'AC', '00919': 'AC', '00921': 'AC', '00972': 'AC', '009802': 'AC', '009803': 'AC', '00989A': 'AC', '00981A': 'AC',

  // AF. 其他 (國際/主動/無配息/半年配/年配) 
  // 1. 國際 (共 12 檔)
  '00645': 'AF', '00646': 'AF', '00662': 'AF', '00757': 'AF', '00762': 'AF', 
  '00830': 'AF', '00885': 'AF', '00893': 'AF', '00895': 'AF', '00909': 'AF', '00910': 'AF', '00911': 'AF', '9910': 'AF', // 9910 likely 00910 typo but keep just in case

  // 2. 主動 (純主動非季配, 或歸類於主動按鈕顯示)
  '00983A': 'AF', '00985A': 'AF', '00986A': 'AF', '00988A': 'AF',

  // 3. 半年配 (共 13 檔)
  '0050': 'AF', '006203': 'AF', '00702': 'AF', '00733': 'AF', '00735': 'AF', '00736': 'AF',
  '00858': 'AF', '00882': 'AF', '00913': 'AF', '00922': 'AF', '00923': 'AF', '00928': 'AF', '00935': 'AF',

  // AD. 月配
  '00730': 'AD', '00900': 'AD', '00929': 'AD', '00934': 'AD', '00936': 'AD', '00939': 'AD',
  '00940': 'AD', '00943': 'AD', '00944': 'AD', '00946': 'AD', '00952': 'AD', '00961': 'AD',
  '00962': 'AD', '00963': 'AD', '00964': 'AD',
  
  // AE. 債券
  '00937B': 'AE', '00772B': 'AE', '00933B': 'AE', '00773B': 'AE', '00720B': 'AE', '00725B': 'AE',
  '00724B': 'AE', '00679B': 'AE', '00761B': 'AE', '00795B': 'AE', '00687B': 'AE', '00751B': 'AE', '00792B': 'AE'
};

/**
 * Parses the Dividend CSV content.
 */
export const parseDividendData = (csvContent: string): Record<string, Dividend[]> => {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return {};

  const dividendMap: Record<string, Dividend[]> = {};
  
  // 1. Header Detection
  let headerRowIndex = 0;
  // Use parseCSVRow for header as well
  let header = parseCSVRow(lines[0]).map(c => c.trim().toLowerCase());

  // Scan for header if first row isn't it
  if (!header.some(h => h.includes('代號') || h.includes('code') || h.includes('etf 代碼') || h.includes('symbol'))) {
      for(let i=0; i<Math.min(lines.length, 5); i++) {
          const rowValues = parseCSVRow(lines[i]);
          const rowLower = rowValues.map(c => c.toLowerCase());
          
          if (rowLower.some(c => c.includes('代號') || c.includes('code') || c.includes('etf 代碼') || c.includes('symbol'))) {
              headerRowIndex = i;
              header = rowLower;
              break;
          }
      }
  }

  const findCol = (keywords: string[]) => header.findIndex(h => keywords.some(k => h.includes(k)));

  const idxCode = findCol(['etf 代碼', '股號', '代號', 'code', '股票代號', 'symbol', '代碼']);
  // 移除 '發放日' 以避免混淆，專注於除息相關關鍵字
  const idxDate = findCol(['除息日期', '除息日', 'date', '配息日', '日期', '除息交易日', '除息']);
  const idxAmount = findCol(['除息金額', '配息', '金額', 'amount', '現金股利', '分配金額', '現金', '股利', 'distribution']);
  // 明確指定發放日關鍵字
  const idxPayDate = findCol(['發放日', '現金股利發放日', '入帳日', '領息日', 'payment', 'pay', '發放']);

  if (idxCode === -1 || idxAmount === -1) {
      console.warn("Parse Dividend Failed: Missing required columns (Code or Amount). Header:", header);
      return {};
  }

  for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const row = parseCSVRow(lines[i]);
      if (row.length <= idxCode) continue;

      const rawCode = row[idxCode];
      const code = rawCode ? rawCode.replace(/['"]/g, '').trim() : '';
      
      if (code) {
          const amountStr = row[idxAmount]?.replace(/[^0-9.]/g, '') || '0';
          const amount = parseFloat(amountStr);
          let date = idxDate !== -1 ? row[idxDate] : '';
          
          if (date) date = date.replace(/['"]/g, '').trim();

          // 解析發放日
          let paymentDate = '';
          if (idxPayDate !== -1 && row[idxPayDate]) {
              paymentDate = row[idxPayDate].replace(/['"]/g, '').trim();
          }

          if (amount > 0) {
              if (!dividendMap[code]) {
                  dividendMap[code] = [];
              }
              dividendMap[code].push({
                  date: date,
                  amount: amount,
                  period: '',
                  paymentDate: paymentDate 
              });
          }
      }
  }
  return dividendMap;
};

/**
 * Parses the CSV content strictly with robust header detection.
 */
export const parseEtfData = (
    txtBase: string,
    txtLatestPrice: string,
    txtHistPrice2025: string,
    txtDailyPrice: string,
    txtScale: string
  ): EtfData[] => {
    const etfMap: Record<string, EtfData> = {};
  
    // 1. 基本資料 (txtBase)
    const baseLines = txtBase.split(/\r?\n/).filter(line => line.trim() !== '');
    if (baseLines.length >= 2) {
      let header = parseCSVRow(baseLines[0]).map(c => c.toLowerCase());
      const findCol = (keywords: string[]) => header.findIndex(h => keywords.some(k => h.includes(k)));
      const idxCode = findCol(['etf 代碼', '代號', 'code']);
      const idxName = findCol(['etf 名稱', '股名', 'name']);
      const idxMarket = findCol(['上市/ 上櫃', '市場', 'market', '上市', '上櫃']);
      
      for (let i = 1; i < baseLines.length; i++) {
        const row = parseCSVRow(baseLines[i]);
        if (row.length <= idxCode) continue;
        const code = row[idxCode]?.replace(/['"]/g, '').trim();
        if (!code) continue;
  
        let name = row[idxName] || '';
        let marketLabel = '上市';
        if (idxMarket !== -1 && row[idxMarket]) {
          const m = row[idxMarket].trim();
          if (m.includes('上櫃') || m.toLowerCase().includes('otc')) marketLabel = '上櫃';
        } else if (code.includes('B') || name.includes('債')) {
          marketLabel = '上櫃';
        }
  
        const category = CATEGORY_MAP[code] || 'AF';
  
        etfMap[code] = {
          code,
          name,
          category,
          marketLabel,
          priceBase: 0,
          priceCurrent: 0,
          dividendYield: 0,
          estYield: 0,
          returnRate: 0,
          totalReturn: 0,
          dividends: [],
          priceHistory: []
        };
      }
    }
  
    const parseNum = (val: string) => {
      if (!val) return 0;
      const clean = val.replace(/[%$,]/g, '').trim();
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };
  
    // 2. 歷史資料 2025 (txtHistPrice2025) - Horizontal
    const histLines = txtHistPrice2025.split(/\r?\n/).filter(line => line.trim() !== '');
    if (histLines.length >= 2) {
      let header = parseCSVRow(histLines[0]).map(c => c.toLowerCase());
      const findCol = (keywords: string[]) => header.findIndex(h => keywords.some(k => h.includes(k)));
      const idxCode = findCol(['etf 代碼', '代號', 'code']);
      
      const dateColIndices = header.map((h, index) => {
        const isDate = /(\d{1,4}[-./]\d{1,2}[-./]\d{1,2})|(\d{1,2}[-./]\d{1,2})|(\d{4}[-./]\d{1,2})/.test(h);
        return isDate ? { index, text: parseCSVRow(histLines[0])[index].trim() } : null;
      }).filter((item): item is { index: number, text: string } => item !== null);
  
      for (let i = 1; i < histLines.length; i++) {
        const row = parseCSVRow(histLines[i]);
        if (idxCode === -1 || !row[idxCode]) continue;
        const code = row[idxCode].replace(/['"]/g, '').trim();
        if (!etfMap[code]) continue;
  
        dateColIndices.forEach(col => {
          if (row[col.index]) {
            const p = parseNum(row[col.index]);
            if (p > 0) {
              etfMap[code].priceHistory.push({ date: col.text, price: p });
            }
          }
        });
      }
    }
  
    // 3. 每日股價 (txtDailyPrice) - Vertical
    const dailyLines = txtDailyPrice.split(/\r?\n/).filter(line => line.trim() !== '');
    if (dailyLines.length >= 2) {
      // txtDailyPrice has format: 日期, ETF 代碼, ETF 名稱, 昨日收盤價, 開盤, 最高, 最低, 股價
      let header = parseCSVRow(dailyLines[0]).map(c => c.toLowerCase());
      const findCol = (keywords: string[]) => header.findIndex(h => keywords.some(k => h.includes(k)));
      const idxDate = findCol(['日期', 'date']);
      const idxCode = findCol(['etf 代碼', '代號', 'code']);
      const idxPrice = findCol(['股價', 'price', '收盤價']);
  
      if (idxDate !== -1 && idxCode !== -1 && idxPrice !== -1) {
        for (let i = 1; i < dailyLines.length; i++) {
          const row = parseCSVRow(dailyLines[i]);
          if (row.length <= Math.max(idxDate, idxCode, idxPrice)) continue;
          
          const date = row[idxDate]?.replace(/['"]/g, '').trim();
          const code = row[idxCode]?.replace(/['"]/g, '').trim();
          const price = parseNum(row[idxPrice]);
          
          if (code && etfMap[code] && date && price > 0) {
            etfMap[code].priceHistory.push({ date, price });
          }
        }
      }
    }
  
    // 4. 最新股價 (txtLatestPrice) - AP101
    const latestLines = txtLatestPrice.split(/\r?\n/).filter(line => line.trim() !== '');
    if (latestLines.length >= 2) {
      let header = parseCSVRow(latestLines[0]).map(c => c.toLowerCase());
      const findCol = (keywords: string[]) => header.findIndex(h => keywords.some(k => h.includes(k)));
      const idxCode = findCol(['etf 代碼', '代號', 'code']);
      
      const dateColIndices = header.map((h, index) => {
        const isDate = /(\d{1,4}[-./]\d{1,2}[-./]\d{1,2})|(\d{1,2}[-./]\d{1,2})|(\d{4}[-./]\d{1,2})/.test(h) || /^\d{6}$/.test(h) || h.includes('now');
        return isDate ? { index, text: parseCSVRow(latestLines[0])[index].trim() } : null;
      }).filter((item): item is { index: number, text: string } => item !== null);
  
      if (dateColIndices.length > 0) {
        // take the right-most valid date column as latest price
        const lastDateCol = dateColIndices[dateColIndices.length - 1];
        for (let i = 1; i < latestLines.length; i++) {
          const row = parseCSVRow(latestLines[i]);
          if (idxCode === -1 || !row[idxCode]) continue;
          const code = row[idxCode].replace(/['"]/g, '').trim();
          if (!etfMap[code]) continue;
  
          if (row[lastDateCol.index]) {
            const p = parseNum(row[lastDateCol.index]);
            if (p > 0) {
              etfMap[code].priceCurrent = p;
            }
          }
        }
      }
    }
  
    // 5. Compute priceBase etc logic (deduplicate and sort priceHistory)
    const baseDateStr = getDynamicBaseDateStr();
    const baseYear = new Date(baseDateStr).getFullYear();
    const baseMonth = new Date(baseDateStr).getMonth();
  
    Object.values(etfMap).forEach(etf => {
       // Deduplicate and sort history
       const histMap = new Map<string, number>();
       etf.priceHistory.forEach(ph => {
          // Normalize date format (e.g. YYYY/MM/DD)
          let cleanStr = ph.date.replace(/[-.]/g, '/');
          let d = new Date(cleanStr);
          if (isNaN(d.getTime())) {
              const parts = cleanStr.split('/');
              if (parts.length === 2 && baseYear) {
                  d = new Date(baseYear, parseInt(parts[0])-1, parseInt(parts[1]));
              }
          }
          if (!isNaN(d.getTime())) {
              histMap.set(`${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`, ph.price);
          }
       });
       
       const sortedHist = Array.from(histMap.entries())
         .map(([date, price]) => ({ date, price }))
         .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
       etf.priceHistory = sortedHist;
  
       // Find priceBase for BaseDate (usually start of the year or `getDynamicBaseDateStr()`)
       // we look for the earliest recorded price in the baseMonth & baseYear
       if (sortedHist.length > 0) {
           const candidates = sortedHist.filter(h => {
              const d = new Date(h.date);
              return d.getFullYear() === baseYear && d.getMonth() === baseMonth;
           });
           if (candidates.length > 0) {
               etf.priceBase = candidates[0].price; // Earliest in that month
           } else {
               // Fallback: the earliest price in history?
               etf.priceBase = sortedHist[0].price; 
           }
       }
  
       // If priceCurrent was not found in latestPrice, use the last element of priceHistory
       if (etf.priceCurrent === 0 && etf.priceHistory.length > 0) {
           etf.priceCurrent = etf.priceHistory[etf.priceHistory.length - 1].price;
       }
    });
  
    return Object.values(etfMap);
  };


const parseNum = (val: string) => {
    if (!val) return 0;
    const clean = val.replace(/[%$,]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
};

export const parseMarketIndex = (csvContent: string): MarketIndex[] => {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const results: MarketIndex[] = [];
  
  let headerRowIndex = 0;
  let header = parseCSVRow(lines[0]).map(c => c.trim().toLowerCase());

  if (!header.some(h => h.includes('指數名稱') || h.includes('name') || h.includes('代碼') || h.includes('code'))) {
      for(let i=0; i<Math.min(lines.length, 5); i++) {
          const rowValues = parseCSVRow(lines[i]);
          const rowLower = rowValues.map(c => c.toLowerCase());
          
          if (rowLower.some(c => c.includes('指數名稱') || c.includes('name') || c.includes('代碼') || c.includes('code'))) {
              headerRowIndex = i;
              header = rowLower;
              break;
          }
      }
  }

  const findCol = (keywords: string[], excludeIdx: number = -1) => header.findIndex((h, i) => i !== excludeIdx && keywords.some(k => h === k));
  const findColLoose = (keywords: string[], excludeIdx: number = -1) => {
      let idx = findCol(keywords, excludeIdx);
      if (idx !== -1) return idx;
      return header.findIndex((h, i) => i !== excludeIdx && keywords.some(k => h.includes(k)));
  };

  const idxName = findColLoose(['指數名稱', 'name', '名稱', '指數']);
  const idxCode = findColLoose(['代碼', 'code', 'symbol']);
  const idxDate = findColLoose(['日期', 'date', 'tradetime', '時間']);
  const idxYest = findColLoose(['昨日收盤價', '昨日收盤', 'closeyest', '昨日', '昨收']);
  const idxOpen = findColLoose(['開盤', 'priceopen', 'open']);
  const idxHigh = findColLoose(['最高', '高價', 'high']);
  const idxLow = findColLoose(['最低', '低價', 'low']);
  const idxPrice = findColLoose(['最新股價', '股價', '現價', '收盤價', '收盤', 'price_c', 'priceCurrent'], idxYest);
  const idxVol = findColLoose(['成交量', 'volume', '成交']);
  const idxChange = findColLoose(['漲跌點數', 'change', '漲跌']);
  const idxChangePct = findColLoose(['漲跌幅度', '幅度', 'percent', '漲跌幅']);

  for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const row = parseCSVRow(lines[i]);
      // Relax condition to allow missing columns at the end, just check if we have enough
      if (row.length < 2) continue;

      results.push({
          name: idxName !== -1 ? row[idxName] || '' : '',
          code: idxCode !== -1 ? row[idxCode] || '' : '',
          date: idxDate !== -1 ? row[idxDate] || '' : '',
          priceYest: idxYest !== -1 ? parseNum(row[idxYest]) : 0,
          priceOpen: idxOpen !== -1 ? parseNum(row[idxOpen]) : 0,
          priceHigh: idxHigh !== -1 ? parseNum(row[idxHigh]) : 0,
          priceLow: idxLow !== -1 ? parseNum(row[idxLow]) : 0,
          priceCurrent: idxPrice !== -1 ? parseNum(row[idxPrice]) : 0,
          volume: idxVol !== -1 ? parseNum(row[idxVol]) : 0,
          changePoint: idxChange !== -1 ? parseNum(row[idxChange]) : 0,
          changePercent: idxChangePct !== -1 ? parseNum(row[idxChangePct]) : 0,
      });
  }

  return results;
};

export const parseStockDailyPrice = (csvContent: string): StockDailyPrice[] => {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const results: StockDailyPrice[] = [];
  
  let headerRowIndex = 0;
  let header = parseCSVRow(lines[0]).map(c => c.trim().toLowerCase());

  if (!header.some(h => h.includes('名稱') || h.includes('name') || h.includes('代碼') || h.includes('code'))) {
      for(let i=0; i<Math.min(lines.length, 5); i++) {
          const rowValues = parseCSVRow(lines[i]);
          const rowLower = rowValues.map(c => c.toLowerCase());
          
          if (rowLower.some(c => c.includes('名稱') || c.includes('name') || c.includes('代碼') || c.includes('code'))) {
              headerRowIndex = i;
              header = rowLower;
              break;
          }
      }
  }

  const findCol = (keywords: string[], excludeIdx: number = -1) => header.findIndex((h, i) => i !== excludeIdx && keywords.some(k => h === k));
  const findColLoose = (keywords: string[], excludeIdx: number = -1) => {
      let idx = findCol(keywords, excludeIdx);
      if (idx !== -1) return idx;
      return header.findIndex((h, i) => i !== excludeIdx && keywords.some(k => h.includes(k)));
  };

  const idxCode = findColLoose(['etf 代碼', '代碼', 'code', 'symbol', '股票代號']);
  const idxName = findColLoose(['etf 名稱', '名稱', 'name']);
  const idxDate = findColLoose(['日期', 'date']);
  const idxYest = findColLoose(['昨日收盤價', '昨日收盤', '昨收', '昨日']);
  const idxOpen = findColLoose(['開盤', 'open']);
  const idxHigh = findColLoose(['最高', 'high', '高價']);
  const idxLow = findColLoose(['最低', 'low', '低價']);
  const idxPrice = findColLoose(['最新股價', '股價', '現價', '收盤價', '收盤', 'priceCurrent', 'price'], idxYest);

  for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const row = parseCSVRow(lines[i]);
      if (row.length < 2) continue;

      results.push({
          code: idxCode !== -1 ? row[idxCode] || '' : '',
          name: idxName !== -1 ? row[idxName] || '' : '',
          date: idxDate !== -1 ? row[idxDate] || '' : '',
          priceYest: idxYest !== -1 ? parseNum(row[idxYest]) : 0,
          priceOpen: idxOpen !== -1 ? parseNum(row[idxOpen]) : 0,
          priceHigh: idxHigh !== -1 ? parseNum(row[idxHigh]) : 0,
          priceLow: idxLow !== -1 ? parseNum(row[idxLow]) : 0,
          priceCurrent: idxPrice !== -1 ? parseNum(row[idxPrice]) : 0,
      });
  }

  return results;
};
