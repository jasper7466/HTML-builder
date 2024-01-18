const fs = require('fs');
const path = require('path');
const { stdout } = require('node:process');

const targetPath = path.join(__dirname, 'text.txt');
const readStream = fs.createReadStream(targetPath);

readStream.on('error', (error) =>
  console.error(`Something went wrong: ${error}`),
);

solution1();

// Solution 1 - pipes
function solution1() {
  readStream.pipe(stdout);
}

// Solution 2 - data-event + stdout-write
// eslint-disable-next-line no-unused-vars
function solution2() {
  readStream.on('data', (chunk) => stdout.write(chunk));
}

// Solution 3 - data-event + console.log
// eslint-disable-next-line no-unused-vars
function solution3() {
  readStream.setEncoding('utf8');
  readStream.on('data', (chunk) => console.log(chunk));
}
