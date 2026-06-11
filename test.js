async function fetchCsv() {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRuulQ6E-VFeNU6otpWOOIZQOwcG8ybE0EdR_RooQLW1VYi6Xhtcl4KnADees6YIALU29jmBlODPeQQ/pub?gid=779511679&single=true&output=csv';
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const text = await res.text();
    console.log(text.substring(0, 500));
  } catch (e) {
    console.log(e.message);
  }
}
fetchCsv();
