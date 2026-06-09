const fs = require('fs');
const path = require('path');
function walk(dir) {
  let files = fs.readdirSync(dir);
  for(let f of files) {
    let p = path.join(dir, f);
    if(fs.statSync(p).isDirectory() && !p.includes('node_modules')) walk(p);
    else if(p.endsWith('.tsx') || p.endsWith('.ts')) {
      let content = fs.readFileSync(p, 'utf-8');
      let modified = content.replace(/import\s+([A-Za-z0-9]+)(?:Icon)?\s+from\s+["']@mui\/icons-material\/([A-Za-z0-9]+)["'];/g, (match, p1, p2) => {
        return `import { ${p2} } from "@mui/icons-material";`;
      });
      if(modified !== content) {
        fs.writeFileSync(p, modified);
        console.log('Modified', p);
      }
    }
  }
}
walk('./src');
