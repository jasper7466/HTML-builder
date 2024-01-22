const fs = require('fs/promises');
const path = require('path');

printFilesInfo('secret-folder');

async function printFilesInfo(targetDirName) {
  const targetPath = path.join(__dirname, targetDirName);

  try {
    const files = await fs.readdir(targetPath, { withFileTypes: true });

    for (const file of files) {
      if (!file.isFile()) {
        continue;
      }

      const filePath = path.join(targetPath, file.name);
      const fileStat = await fs.stat(filePath);

      const sizeString =
        fileStat.size < 1000
          ? `${fileStat.size} B`
          : `${(fileStat.size / 1000).toFixed(1)} kB`;

      const fileInfo = {
        name: path.parse(filePath).name,
        extension: path.extname(file.name).split('.').pop(),
        size: sizeString,
      };

      print(fileInfo);
    }
  } catch (error) {
    console.error(`Something went wrong: ${error}`);
  }
}

function print({ name, extension, size }) {
  console.log(`${name} - ${extension} - ${size}`);
}
