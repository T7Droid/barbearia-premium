const { Project } = require("ts-morph");
const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const pageFiles = [];
walkDir('./src', function(filePath) {
  if (path.basename(filePath) === 'page.tsx') {
    pageFiles.push(filePath);
  }
});

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
  skipAddingFilesFromTsConfig: true
});

project.addSourceFilesAtPaths(pageFiles);

console.log(`Processando ${pageFiles.length} arquivos page.tsx...`);

pageFiles.forEach(filePath => {
  const sourceFile = project.getSourceFile(filePath);
  if (sourceFile) {
    try {
      sourceFile.organizeImports();
      console.log(`Organizado: ${filePath}`);
    } catch (e) {
      console.error(`Erro ao organizar: ${filePath}`, e.message);
    }
  }
});

project.saveSync();
console.log("Processo concluído.");
