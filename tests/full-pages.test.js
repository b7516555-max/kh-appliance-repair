const fs = require('fs');
const vm = require('vm');

const htmlFiles = [
  'Index.html', 'Locations.html', 'Status.html', 'Guide.html', 'Faq.html',
  'public/index.html', 'fb-landing/index.html', 'Netlify入口頁_直接上傳/index.html'
];

let failures = 0;
function check(ok, label) {
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) failures++;
}

for (const file of htmlFiles) {
  const source = fs.readFileSync(file, 'utf8');
  let scripts = 0;
  for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!match[2].trim()) continue;
    if (/application\/ld\+json/i.test(match[1])) JSON.parse(match[2]);
    else new vm.Script(match[2], { filename: file });
    scripts++;
  }
  check(/<html\b/i.test(source) && /<\/html>/i.test(source), file + ' document structure');
  check(scripts >= 0, file + ' inline JavaScript syntax');
}

for (const file of ['Code.gs', 'Line.gs']) {
  new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file });
  check(true, file + ' syntax');
}

const line = fs.readFileSync('Line.gs', 'utf8');
for (const view of ['locations', 'status', 'guide', 'faq']) {
  check(line.includes('view=' + view), 'LINE route ' + view);
}
check(line.includes("'source=line'"), 'LINE booking route');

const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
check(manifest.name.includes('小家電、玩具維修雲端系統'), 'PWA manifest title');
check(manifest.start_url === './index.html', 'PWA start URL');

if (failures) process.exit(1);
