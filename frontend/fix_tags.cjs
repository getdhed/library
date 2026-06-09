const fs = require('fs');
const path = require('path');
function walk(dir) {
  let files = fs.readdirSync(dir);
  for(let f of files) {
    let p = path.join(dir, f);
    if(fs.statSync(p).isDirectory() && !p.includes('node_modules')) walk(p);
    else if(p.endsWith('.tsx')) {
      let content = fs.readFileSync(p, 'utf-8');
      
      // We know which ones were manually changed or script changed and we need to make sure the tags match the import.
      // But actually, it's easier to just find the Icon imports and match the tags.
      let imports = Array.from(content.matchAll(/import\s+([A-Za-z0-9]+)Icon\s+from\s+["']@mui\/icons-material\/([A-Za-z0-9]+)["']/g));
      
      let modified = content;
      for (let m of imports) {
         let iconNameWithoutSuffix = m[1];
         let fullIconName = iconNameWithoutSuffix + 'Icon';
         // Replace <IconName /> with <IconNameIcon />
         let regex1 = new RegExp(`<${iconNameWithoutSuffix}(\\s|>)`, 'g');
         modified = modified.replace(regex1, `<${fullIconName}$1`);
         // Also handle closing tags </IconName>
         let regex2 = new RegExp(`</${iconNameWithoutSuffix}>`, 'g');
         modified = modified.replace(regex2, `</${fullIconName}>`);
      }
      
      if(modified !== content) {
        fs.writeFileSync(p, modified);
        console.log('Fixed tags in', p);
      }
    }
  }
}
walk('./src');
