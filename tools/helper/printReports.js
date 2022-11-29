import * as fs from "fs";
import * as path from "path";

var __dirname = process.argv.slice(2)[0];

// const printFiles = () => {
//     var files = fs.readdirSync(directory);
//     console.log(files)
// }


var directories = fs.readdirSync(__dirname).filter(function (file) {
    return fs.statSync(path.join(__dirname, file)).isDirectory();
});

var model_files = [];
directories.forEach(function (value, index, array) {
    var current_model_files = fs.readdirSync(path.join(__dirname, value)).filter(function (file) {
        return file.endsWith('junit-report.xml');
    }).map(function (file) {
        return path.join(__dirname, value, file);
    });

    model_files = model_files.concat(current_model_files);
});

// Do something with model_files here ...
console.log(model_files);

// printFiles();
