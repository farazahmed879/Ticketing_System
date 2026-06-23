import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '../frontend/src');
const CUSTOM_IMAGE_DIR = path.resolve(SRC_DIR, 'components/CustomImage');

function getRelativePath(fromPath, toPath) {
  let relPath = path.relative(path.dirname(fromPath), toPath).replace(/\\/g, '/');
  if (!relPath.startsWith('.')) {
    relPath = './' + relPath;
  }
  return relPath;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') && !fullPath.includes('CustomImage.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      
      // Match <img (with space or newline) and </img>
      const imgRegex = /<img([\s>])/g;
      const imgCloseRegex = /<\/img>/g;
      
      if (imgRegex.test(content) || imgCloseRegex.test(content)) {
        console.log(`Processing: ${fullPath}`);
        
        // Add import if not present
        if (!content.includes('CustomImage') && !content.includes('import CustomImage')) {
          const importPath = getRelativePath(fullPath, CUSTOM_IMAGE_DIR);
          const importStmt = `import CustomImage from "${importPath}";\n`;
          
          // Insert after the last import statement or at the top
          const lastImportIndex = content.lastIndexOf('import ');
          if (lastImportIndex !== -1) {
            const endOfLastImport = content.indexOf('\n', lastImportIndex);
            content = content.slice(0, endOfLastImport + 1) + importStmt + content.slice(endOfLastImport + 1);
          } else {
            content = importStmt + content;
          }
        }
        
        // Replace tags
        content = content.replace(/<img([\s>])/g, '<CustomImage$1');
        content = content.replace(/<\/img>/g, '</CustomImage>');
        
        fs.writeFileSync(fullPath, content, 'utf-8');
      }
    }
  }
}

processDirectory(SRC_DIR);
console.log('Done!');
