const fs = require('fs');
const fsPromises = require('fs/promises');
const streamPromises = require('stream/promises');
const { Transform } = require('stream');
const path = require('path');

const DIST_DIR_NAME = 'project-dist';

const distPath = path.join(__dirname, DIST_DIR_NAME);
const cssSourceDirPath = path.join(__dirname, 'styles');
const cssBundleFilePath = path.join(__dirname, DIST_DIR_NAME, 'style.css');
const assetsSourceDirPath = path.join(__dirname, 'assets');
const assetsDistDirPath = path.join(__dirname, DIST_DIR_NAME, 'assets');
const templateSourceFilePath = path.join(__dirname, 'template.html');
const templateDestFilePath = path.join(__dirname, DIST_DIR_NAME, 'index.html');
const componentsDirPath = path.join(__dirname, 'components');

build();

async function build() {
  try {
    await recreateDir(distPath);

    const cssChunksPathList = await getFilesByExtension(
      cssSourceDirPath,
      '.css',
    );

    await Promise.all([
      mergeFiles(cssChunksPathList, cssBundleFilePath),
      copyFiles(assetsSourceDirPath, assetsDistDirPath),
      compileTemplate(templateSourceFilePath, templateDestFilePath),
    ]);

    console.log('Build complete.');
  } catch (error) {
    defaultErrorHandler(error);
  }
}

/**
 * Compiles template.
 *
 * @param {string} templateFilePath Template source file path.
 * @param {string} destFilePath Compiled template destination file path.
 */
async function compileTemplate(templateFilePath, destFilePath) {
  const writeStream = fs.createWriteStream(destFilePath);
  const readStream = fs.createReadStream(templateFilePath);
  const templateEngine = new TemplateEngine({ compilerFn: compiler });

  try {
    await streamPromises.pipeline(readStream, templateEngine, writeStream);
  } catch (error) {
    defaultErrorHandler(error);
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

    try {
      await fsPromises.mkdir(destDir);

      const files = await fsPromises.readdir(sourceDir, {
        withFileTypes: true,
      });

      for (const file of files) {
        const srcFilePath = path.join(sourceDir, file.name);
        const destFilePath = path.join(destDir, file.name);

        if (file.isDirectory()) {
          stack.push(path.relative(srcRoot, srcFilePath));
          continue;
        }

        fsPromises.copyFile(srcFilePath, destFilePath);
      }
    } catch (error) {
      defaultErrorHandler(error);
    }
  }
}

/**
 * Returns a list of absolute paths to the files with specified extensions from target directory.
 * Nested directories are ignored.
 *
 * @param {string} directory Absolute path to the target directory.
 * @param {string} extension Dot-prefixed files extension (for example `.css`).
 * @returns {string[]} List of absolute paths matching extension.
 */
async function getFilesByExtension(directory, extension) {
  try {
    const rawFiles = await fsPromises.readdir(directory, {
      withFileTypes: true,
    });
    const processedFiles = [];

    for (const file of rawFiles) {
      if (path.extname(file.name) !== extension) {
        continue;
      }

      processedFiles.push(path.join(directory, file.name));
    }

    return processedFiles;
  } catch (error) {
    defaultErrorHandler(error);
  }
}

/**
 * Merges files content into single file.
 *
 * @param {string[]} sourcesList List of absolute paths to files to be merged.
 * @param {string} destPath Absolute path to the destination file.
 */
async function mergeFiles(sourcesList, destPath) {
  let writeStream = fs.createWriteStream(destPath);

  try {
    for (const source of sourcesList) {
      const readStream = fs.createReadStream(source);

      await streamPromises.pipeline(readStream, writeStream, { end: false });
    }

    writeStream.close();
  } catch (error) {
    defaultErrorHandler(error);
  }
}

/**
 * Removes a directory if it exists and creates the same empty directory.
 *
 * @param {string} path Absolute path to the directory.
 */
async function recreateDir(path) {
  try {
    const isDestExists = await isExists(path);

    if (isDestExists) {
      await fsPromises.rm(path, { recursive: true });
    }

    await fsPromises.mkdir(path);
  } catch (error) {
    defaultErrorHandler(error);
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
    await fsPromises.access(path);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }

  return true;
}

/**
 * Dummy error handler.
 *
 * @param {Error} error Error instance.
 */
function defaultErrorHandler(error) {
  if (error) {
    console.error(`Something went wrong: ${error}`);
  }
}

class TemplateEngine extends Transform {
  /**
   * Template engine constructor.
   *
   * @param {Object} config
   * @param {string} config.openSequence Template start mark.
   * @param {string} config.closeSequence Template end mark.
   * @param {Function} config.compilerFn Template entries compiling function.
   */
  constructor(config) {
    super();

    const { openSequence, closeSequence } = {
      openSequence: '{{',
      closeSequence: '}}',
      ...config,
    };

    this._compiler = config.compilerFn;

    const openPattern = this._regExpEscape(openSequence);
    const closePattern = this._regExpEscape(closeSequence);

    this._openRegExp = new RegExp(openPattern, 'gim');
    this._closeRegExp = new RegExp(closePattern, 'gim');
    this._entryRegExp = new RegExp(`${openPattern}(.+?)${closePattern}`, 'gim');
    this._buffer = '';
  }

  async _transform(chunk, encoding, next) {
    this._buffer += chunk.toString();

    let entries = this._buffer.matchAll(this._entryRegExp);

    // Parses and replaces all template occurrences in current chunk

    try {
      for (const [entry, expression] of entries) {
        const replacement = await this._compiler(expression);
        this._buffer = this._buffer.replace(entry, replacement);
      }
    } catch (error) {
      defaultErrorHandler(error);
    }

    // Handles unpaired template close-mark

    const isCloseSequenceDetected = this._closeRegExp.test(this._buffer);

    if (isCloseSequenceDetected) {
      throw new Error('Invalid template format.');
    }

    // Handles incomplete piece of template at the end of current chunk

    const isUnclosedSequenceDetected = this._openRegExp.test(this._buffer);

    if (!isUnclosedSequenceDetected) {
      return next(null, this._buffer);
    }

    const index = this._buffer.search(this._openRegExp);
    const processed = this._buffer.slice(0, index);
    const incomplete = this._buffer.slice(index);

    this._buffer = incomplete;

    return next(null, processed);
  }

  _regExpEscape(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/**
 * Compiles template expression.
 *
 * @param {string} expression Template expression.
 * @returns {string} Compiled markdown.
 */
async function compiler(expression) {
  try {
    const content = await fsPromises.readFile(
      path.join(componentsDirPath, `${expression}.html`),
      {
        encoding: 'utf-8',
      },
    );

    return content;
  } catch (error) {
    defaultErrorHandler(error);
  }
}
