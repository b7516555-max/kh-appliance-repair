const fs = require('fs');
const path = require('path');

const fullLog = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\83b8d68b-8056-4aa6-90c0-effd5583cf67\\.system_generated\\logs\\transcript_full.jsonl';
const content = fs.readFileSync(fullLog, 'utf8');

const funcsToFind = ['startPublicModeWithEvent', 'goToConfirmPage', 'submitPublicForm', 'saveToSheet', 'openVolunteerSection', 'promptCheckout'];

funcsToFind.forEach(fn => {
  const matches = [...content.matchAll(new RegExp('function\\s+' + fn, 'g'))];
  console.log(`=== Function ${fn}: ${matches.length} matches ===`);
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    console.log(content.substring(lastMatch.index, lastMatch.index + 1200));
  }
});
