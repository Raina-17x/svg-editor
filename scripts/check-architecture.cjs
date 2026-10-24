const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

class ArchitectureCheck {
  static run() {
    const root = path.resolve('src');
    const allowed = {
      domain: new Set(['domain']),
      application: new Set(['application', 'domain']),
      infrastructure: new Set(['infrastructure', 'application', 'domain']),
      cli: new Set(['cli', 'application', 'domain']),
      'main.ts': new Set(['cli', 'application', 'domain', 'infrastructure']),
    };
    const files = this.walk(root);
    let imports = 0;
    const failures = [];
    for (const file of files) {
      const relative = path.relative(root, file);
      const module = relative.split(path.sep)[0];
      const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      const classes = source.statements.filter(ts.isClassDeclaration);
      if (classes.length > 1 || (classes.length === 1 && classes[0].name?.text !== path.basename(file, '.ts'))) {
        failures.push(`${relative}: expected one class per file with matching name`);
      }
      for (const statement of source.statements) {
        if (ts.isFunctionDeclaration(statement)) failures.push(`${relative}: top-level procedural function`);
        if (!ts.isImportDeclaration(statement)) continue;
        imports++;
        const specifier = statement.moduleSpecifier.text;
        if (specifier.startsWith('.')) {
          const destination = path.relative(root, path.resolve(path.dirname(file), specifier)).split(path.sep)[0];
          if (!allowed[module]?.has(destination)) failures.push(`${relative}: forbidden dependency on ${destination}`);
        } else if ((module === 'domain' || module === 'application') || (module === 'cli' && specifier !== 'node:readline')) {
          failures.push(`${relative}: external dependency ${specifier} is not allowed here`);
        }
      }
    }
    if (failures.length) throw new Error(failures.join('\n'));
    console.log(`Architecture check passed: ${files.length} source files, ${imports} imports, dependency rules and class filenames verified.`);
  }
  static walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? this.walk(file) : file.endsWith('.ts') ? [file] : [];
    });
  }
}

ArchitectureCheck.run();
