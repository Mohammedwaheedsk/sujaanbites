const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf-8');
const script = fs.readFileSync('app.js', 'utf-8');

const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/" });

try {
  dom.window.eval(script);
  console.log("SUCCESS: No errors during app.js execution!");
} catch (e) {
  console.error("ERROR during app.js execution:");
  console.error(e.message);
  console.error(e.stack);
}
