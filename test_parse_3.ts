import { parseMarketIndex } from './utils/sheetHelpers';
import * as fs from 'fs';

async function run() {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ825Haq0XnIX_UDCtnyd5t94U943OJ_sCJdLj2-6XfbWT4KkLaQ-RWBL_esd4HHaQGJTW3hOV2qtax/pub?gid=779511679&single=true&output=csv';
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  const header = text.split('\n')[0].split(',');
  console.log("Headers: ", header);
  const data = parseMarketIndex(text);
  console.log(JSON.stringify(data.slice(-1), null, 2));
}
run();
