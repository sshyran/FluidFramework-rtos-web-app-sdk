/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import * as fs from "fs";
import * as parser from "xml2js";

var filename = process.argv.slice(2)[0];

const parseTestReport = () => {
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

parseTestReport();
