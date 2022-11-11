import * as fs from "fs";

var directory = process.argv.slice(2)[0];

const printFiles = () => {
    var files = fs.readdirSync(directory);
    console.log(files)
}

printFiles();
