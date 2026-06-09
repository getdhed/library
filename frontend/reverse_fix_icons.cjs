const fs = require('fs');
const path = require('path');
function walk(dir) {
  let files = fs.readdirSync(dir);
  for(let f of files) {
    let p = path.join(dir, f);
    if(fs.statSync(p).isDirectory() && !p.includes('node_modules')) walk(p);
    else if(p.endsWith('.tsx') || p.endsWith('.ts')) {
      let content = fs.readFileSync(p, 'utf-8');
      let modified = content.replace(/import\s+{\s*([A-Za-z0-9_,\s]+)\s*}\s+from\s+["']@mui\/icons-material["'];/g, (match, names) => {
        let imports = names.split(',').map(n => n.trim()).filter(Boolean);
        return imports.map(n => `import ${n}Icon from "@mui/icons-material/${n}";`).join('\n');
      });
      if(modified !== content) {
        fs.writeFileSync(p, modified);
        console.log('Modified', p);
      }
    }
  }
}
walk('./src');
