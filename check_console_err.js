import fs from 'fs';
import readline from 'readline';

async function main() {
  const fileStream = fs.createReadStream('/Users/danil/.gemini/antigravity-ide/brain/3e18aa77-a775-4cd5-8c20-4bac21c5d21a/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('capture_browser_console_logs') || line.includes('console.error')) {
      console.log(line.substring(0, 800));
    }
  }
}

main().catch(console.error);
