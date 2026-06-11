async function fetchCsv() {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ825Haq0XnIX_UDCtnyd5t94U943OJ_sCJdLj2-6XfbWT4KkLaQ-RWBL_esd4HHaQGJTW3hOV2qtax/pub?gid=779511679&single=true&output=csv';
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const text = await res.text();
    const lines = text.split('\n');
    console.log(lines.slice(lines.length - 10).join('\n'));
  } catch (e) {
    console.log(e.message);
  }
}
fetchCsv();
