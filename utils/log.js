const fs = require('fs');

function writeLog(filePath, newText) {
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // File does not exist. Creating new file
            fs.writeFile(filePath, '', (err) => {
                if (err) {
                    console.error('Error creating the file:', err);
                    return;
                }

                appendTextToFile(filePath, newText); 
            });
        } else {
            appendTextToFile(filePath, newText);
        }
    });
}

function appendTextToFile(filePath, newText) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading the file:', err);
            return;
        }

        const updatedData = data + '\n' + newText;

        fs.writeFile(filePath, updatedData, (err) => {
            if (err) {
                console.error('Error writing to the file:', err);
            }
        });
    });
}

module.exports = { writeLog }; 