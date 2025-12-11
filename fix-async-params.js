const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all route files with dynamic params
const routeFiles = execSync('find app/api -name "route.ts" -path "*/\\[*\\]/*"', { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(`Found ${routeFiles.length} route files with dynamic params`);

let fixedCount = 0;

routeFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf-8');
    let modified = false;

    // Fix function signatures: { params }: { params: { ... } } -> { params }: { params: Promise<{ ... }> }
    const paramPattern = /(\{ params \}: \{ params: \{ [^}]+\} \})/g;
    const matches = content.match(paramPattern);
    
    if (matches) {
      matches.forEach(match => {
        // Extract the params type
        const typeMatch = match.match(/\{ params: \{ ([^}]+) \} \}/);
        if (typeMatch) {
          const paramsType = typeMatch[1];
          const newMatch = `{ params }: { params: Promise<{ ${paramsType} }> }`;
          content = content.replace(match, newMatch);
          modified = true;
        }
      });

      // Add await params destructuring at the start of each function
      const functionPattern = /export async function (GET|POST|PUT|DELETE|PATCH)\([\s\S]*?\{ params \}: \{ params: Promise<\{ ([^}]+) \}> \}\) \{[\s\S]*?try \{/g;
      content = content.replace(functionPattern, (match, method, paramsType) => {
        // Extract param names from paramsType (e.g., "id: string" -> ["id"])
        const paramNames = paramsType.split(',').map(p => p.trim().split(':')[0].trim());
        const destructure = paramNames.map(name => name).join(', ');
        return match.replace(/try \{/, `try {\n    const { ${destructure} } = await params;`);
      });

      // Replace all params.XXX with just XXX
      const paramNamePattern = /params\.(\w+)/g;
      content = content.replace(paramNamePattern, (match, paramName) => {
        // Only replace if it's a valid param name (id, courseId, etc.)
        if (['id', 'courseId', 'testId', 'userId', 'contentItemId', 'learningPlanId', 'categoryId', 'fileId'].includes(paramName)) {
          return paramName;
        }
        return match;
      });

      if (modified) {
        fs.writeFileSync(file, content, 'utf-8');
        fixedCount++;
        console.log(`Fixed: ${file}`);
      }
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log(`\nFixed ${fixedCount} files`);

