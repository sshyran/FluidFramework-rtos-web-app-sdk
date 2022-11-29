import * as fs from "fs";
import * as glob from "glob";

var directory = process.argv.slice(2)[0];

const printFiles = () => {
    var files = fs.readdirSync(directory);
    console.log(files)

    files.forEach(file => {
        getDirectories(file, function (err, res) {
            if (err) {
              console.log('Error', err);
            } else {
              console.log(res);
            }
          });
    })
}


var getDirectories = function (src, callback) {
  glob(src + '/**/*', callback);
};

printFiles();
