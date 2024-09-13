const fs = require('fs');

function writeLog(filePath, newText) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading the file:', err);
            return;
        }

        const updatedData = data + '\n' + newText;

        fs.writeFile(filePath, updatedData, (err) => {
            if (err) {
                console.error('Error writing to the file:', err);
            } else {
                console.log('File successfully updated.');
            }
        });
    });
}

module.exports = { writeLog }; 