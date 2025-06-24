const fs = require('fs');
const path = require('path');

class HtmlIncludePlugin {
  constructor(options) {
    this.options = options || {};
    this.placeholderRegex = /{{\s*([^{}]+)\s*}}/g;
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tap('HtmlIncludePlugin', (compilation) => {
      const outputPath = compilation.outputOptions.path;
      
      fs.readdirSync(outputPath).forEach(file => {
        if (path.extname(file) === '.html') {          
          const filePath = path.join(outputPath, file);
          let html = fs.readFileSync(filePath, 'utf8');

          console.info('Applying HTML includes to', filePath);
          html = this.processIncludes(html, process.cwd());
          
          fs.writeFileSync(filePath, html);
        }
      });
    });
  }

  processIncludes(html, basePath) {
    let oldHtml;
    let newHtml = html;

    let counter = 0;
    while(counter == 0 || oldHtml !== newHtml) {
      if(counter++ > 1000) {
        throw new Error('Infinite loop encountered!');
      }

      oldHtml = newHtml + '';
      newHtml = newHtml.replaceAll(this.placeholderRegex, (_, includePath) => {
        try {
          const fullPath = path.resolve(basePath, includePath.trim());

          console.log(`Including HTML template "${fullPath}"...`);

          return fs.readFileSync(fullPath, 'utf8');
        } catch (error) {
          throw new Error(`❌ Error including file: ${includePath}: ${error}`);
        }
      });

      this.placeholderRegex.lastIndex = 0;
    }

    return newHtml;
  }
}

module.exports = HtmlIncludePlugin;