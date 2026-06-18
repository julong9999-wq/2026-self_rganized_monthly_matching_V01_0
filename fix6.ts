import * as fs from 'fs';
let content = fs.readFileSync('components/DailyAnalysisView.tsx', 'utf-8');

const parts = content.split('export default DailyAnalysisView;');
if (parts.length > 1) {
    fs.writeFileSync('components/DailyAnalysisView.tsx', parts[0] + 'export default DailyAnalysisView;\n', 'utf-8');
}
