import * as fs from 'fs';
let content = fs.readFileSync('components/DailyAnalysisView.tsx', 'utf-8');

content = content.replace(
`                                        formatter={(value: number) => ['

export default DailyAnalysisView;
 + formatMoney(value), '']}`,
`                                        formatter={(value: number) => ['$' + formatMoney(value), '']}`
);

fs.writeFileSync('components/DailyAnalysisView.tsx', content, 'utf-8');
