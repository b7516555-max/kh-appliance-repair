const fs = require('fs');
const transcriptPath = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\83b8d68b-8056-4aa6-90c0-effd5583cf67\\.system_generated\\logs\\transcript_full.jsonl';
const content = fs.readFileSync(transcriptPath, 'utf8');

let best = '';
let pos = 0;
while ((pos = content.indexOf('<!DOCTYPE html>', pos)) !== -1) {
  let end = content.indexOf('</html>', pos);
  if (end !== -1) {
    let chunk = content.substring(pos, end + 7);
    if (chunk.length > best.length) {
      best = chunk;
    }
  }
  pos += 15;
}
console.log('Longest HTML found, raw length:', best.length);
if (best.length > 0) {
  let unescaped = best;
  try {
    // If it's inside a JSON string
    unescaped = JSON.parse('"' + best + '"');
  } catch(e) {
    unescaped = best.replace(/\\r\\n/g, '\r\n').replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  fs.writeFileSync('last_full_good_index.html', unescaped, 'utf8');
  console.log('Saved to last_full_good_index.html, unescaped length:', unescaped.length);
}
