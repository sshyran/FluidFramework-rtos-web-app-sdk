import * as fs from "fs";
import * as path from "path";
import * as parser from "xml2js";

var directory = process.argv.slice(2)[0];

let files  = [];

const getFilesRecursively = (directory) => {
    const filesInDirectory = fs.readdirSync(directory);
    for (const file of filesInDirectory) {
      const absolute = path.join(directory, file);
      if (fs.statSync(absolute).isDirectory()) {
          getFilesRecursively(absolute);
      } else if (/junit-report.xml$/.test(absolute)) {
          files.push(absolute);
      }
    }
  }

getFilesRecursively(directory);

console.log(files)

const parseTestReport = (filename) => {
    fs.readFile(filename,  'utf8', (err, data) => {
        let failedTests;
        parser.parseString(data, { mergeAttrs: true }, (err, res) => {
            failedTests = findFailedTests(res);
        })

        failedTests?.forEach((test) => {
            console.log(test.name[0])
            console.log(test.failure[0]);
        });

        return failedTests;
    });
}

const findFailedTests = (obj) => {
    const arr = obj.testsuite.testcase;

    if (arr.length !== 0) {
        const result = arr.filter((el) => {
            return el.failure !== undefined;
        });
        return (result.length !== 0) ? result : undefined;
    }
};

files.forEach((filename) => {
    parseTestReport(filename);
})
