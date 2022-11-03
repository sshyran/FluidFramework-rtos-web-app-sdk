/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

var textInput = process.argv.slice(2)[0];

const testConsoleFunction = () => {

    let testText = textInput;

    console.log(testText);

    return testText;
}


testConsoleFunction();
