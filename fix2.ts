import * as fs from 'fs';
let content = fs.readFileSync('components/DailyAnalysisView.tsx', 'utf-8');

content = content.replace(/                                                                                    <span/g, '                                          <span');
content = content.replace(/                                                                                    <div/g, '                                          <div');
content = content.replace(/{formatShare\(row\.shares\)}<\/span>/g, '{formatShare(row.shares)} 股</span>');
fs.writeFileSync('components/DailyAnalysisView.tsx', content, 'utf-8');
