import fs from 'fs';
import readline from 'readline';

async function main() {
  const fileStream = fs.createReadStream('/Users/danil/.gemini/antigravity-ide/brain/3e18aa77-a775-4cd5-8c20-4bac21c5d21a/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const lines = [];
  for await (const line of rl) {
    lines.push(line);
  }

  // Print the last 15 lines
  console.log("LAST 15 LINES:");
  lines.slice(-15).forEach(l => {
    try {
      const obj = JSON.parse(l);
      console.log(`STEP: ${obj.step_index} | TYPE: ${obj.type} | SOURCE: ${obj.source}`);
      if (obj.content) console.log("CONTENT:", obj.content.substring(0, 500));
      if (obj.tool_calls) console.log("TOOL CALLS:", JSON.stringify(obj.tool_calls, null, 2));
    } catch (e) {
      console.log(l);
    }
  });
}

main().catch(console.error);
