import fs from 'fs';
import readline from 'readline';

async function main() {
  const fileStream = fs.createReadStream('/Users/danil/.gemini/antigravity-ide/brain/3e18aa77-a775-4cd5-8c20-4bac21c5d21a/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'BROWSER_SUBAGENT' && obj.step_index === 603) {
        console.log("FULL SUBAGENT RESULT:\n", obj.content);
        break;
      }
    } catch (e) {}
  }
}

main().catch(console.error);
