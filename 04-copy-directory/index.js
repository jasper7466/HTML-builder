const fs = require('fs/promises');
const path = require('path');

const targetPath = path.join(__dirname, 'files');
const destPath = path.join(__dirname, 'files-copy');

solution();

async function solution() {
  try {
    const isDestExists = await isExists(destPath);

    if (isDestExists) {
      await fs.rm(destPath, { recursive: true });
    }

    await copyFiles(targetPath, destPath);
  } catch (error) {
    console.error(`Something went wrong: ${error}`);
  }
}

/**
 * Makes deep copy of directory, including nested directories.
 *
 * @param {string} srcRoot Absolute path to the source directory.
 * @param {string} destRoot Absolute path to the destination directory.
 */
async function copyFiles(srcRoot, destRoot) {
  const stack = [''];

  while (stack.length) {
    const relativePath = stack.pop();
    const sourceDir = path.join(srcRoot, relativePath);
    const destDir = path.join(destRoot, relativePath);

    await fs.mkdir(destDir);

    const files = await fs.readdir(sourceDir, {
      withFileTypes: true,
    });

    for (const file of files) {
      const srcFilePath = path.join(sourceDir, file.name);
      const destFilePath = path.join(destDir, file.name);

      if (file.isDirectory()) {
        stack.push(path.relative(srcRoot, srcFilePath));
        continue;
      }

      fs.copyFile(srcFilePath, destFilePath);
    }
  }
}

/**
 * Checks if specified path is exists.
 *
 * @param {string} path Absolute path to be checked.
 * @returns {boolean} `true` if path exists, otherwise `false`.
 */
async function isExists(path) {
  try {
    await fs.access(path);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }

  return true;
}
