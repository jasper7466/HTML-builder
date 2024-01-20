const fs = require('fs');
const asyncFs = require('fs/promises');
const path = require('path');

const sourcesPath = path.join(__dirname, 'styles');
const bundlePath = path.join(__dirname, 'project-dist', 'bundle.css');
const writeStream = fs.createWriteStream(bundlePath);

solution();

async function solution() {
  const files = await asyncFs.readdir(sourcesPath, { withFileTypes: true });

  for (const file of files) {
    if (path.extname(file.name) !== '.css') {
      continue;
    }

    const readStream = fs.createReadStream(path.join(sourcesPath, file.name));

    readStream.on('error', (error) =>
      console.error(`Something went wrong: ${error}`),
    );

    readStream.pipe(writeStream);
  }
}
