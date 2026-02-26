const fs = require('fs');
const filepath = 'c:\\Users\\aspec\\.gemini\\antigravity\\playground\\eternal-ride\\src\\pages\\dashboard\\TileCalculator.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const replacements = {
  'ðŸªŸ': '🪟',
  'âœ•': '✕',
  'ðŸ“„': '📄',
  'â€”': '—',
  'ðŸ —ï¸ ': '🏗️',
  'â ³': '⏳',
  'â€¦': '…',
  'ðŸ“­': '📭',
  'âš ï¸ ': '⚠️',
  'âž•': '➕',
  'ðŸ“ ': '📝',
  'â€¢': '•',
  'ðŸ“¸': '📸',
  'ðŸ–¨ï¸ ': '🖨️',
  'â† ': '←',
  'âœ ï¸ ': '✏️',
  'ðŸ—‘ï¸ ': '🗑️',
  'â€¢': '•',
  'Ã—': '×'
};

for (const [bad, good] of Object.entries(replacements)) {
    content = content.split(bad).join(good);
}
fs.writeFileSync(filepath, content, 'utf8');
console.log('Fixed encoding issues in TileCalculator.tsx');
