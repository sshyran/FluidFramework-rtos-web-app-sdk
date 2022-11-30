import * as fs from "fs";
import * as path from "path";

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

// const printFiles = () => {
//     var files = fs.readdirSync(directory);
//     console.log(files)

//     files.forEach(file => {
//         const filePath = "C:/Users/michaelzhen/Documents/GitHub/microsoftFluidFramework/tools/" + file;
//         if(fs.statSync(filePath).isDirectory()){
//             getFilesRecursively(filePath);
//         }
//     })
// }

getFilesRecursively(directory);

console.log(files)
