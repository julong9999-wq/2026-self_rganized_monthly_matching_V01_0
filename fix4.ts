import * as fs from 'fs';
let content = fs.readFileSync('components/DailyAnalysisView.tsx', 'utf-8');

// replace padding inside toggles
content = content.replace(/className="p-3 flex items-center justify-between cursor-pointer/g, 'className="px-3 py-2.5 flex items-center justify-between cursor-pointer');

// maybe replace px-3 pb-3 border-t with px-2 pb-2
content = content.replace(/className="px-3 pb-3 border-t /g, 'className="px-2 pb-2 border-t ');

fs.writeFileSync('components/DailyAnalysisView.tsx', content, 'utf-8');
