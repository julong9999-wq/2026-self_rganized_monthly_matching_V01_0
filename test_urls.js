const fs = require('fs');

async function testFetch() {
  const urls = [
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1Vpn2SSkcf7QLqoMoAsdyusxtydfgIQD8pyoV6XojGFnf0zGu_WWuRnI4N3U-Hu0iGRzTrR7N-OD9/pub?output=csv",
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdHAXZ0A9Uno0bztIwJbuYSmLUAXUR8SDeHn-Z6GWkuwx1PGkUppejuytX2fjB33kRO1hV35Ku31fl/pub?output=csv",
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTc6ZANKmAJQCXC9k7np_eIhAwC2hF_w9KSpseD0qogcPP0I2rPPhtesNEbHvG48b_tLh9qeu4tr21Q/pub?output=csv",
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vR5JvOGT3eB4xq9phw2dXHApJKOgQkUZcs69CsJfL0Iw3s6egADwA8HdbimrWUceQZl_73pnsSLVnQw/pub?output=csv",
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTV4TXRt6GUxvN7ZPQYMfSMzaBskjCLKUQbHOJcOcyCBMwyrDYCbHK4MghK8N-Cfp_we_LkvV-bz9zg/pub?output=csv"
  ];
  
  for (let i = 0; i < urls.length; i++) {
    const res = await fetch(urls[i]);
    const text = await res.text();
    console.log(`URL ${i + 1} header:`, text.split('\n')[0]);
  }
}

testFetch();
