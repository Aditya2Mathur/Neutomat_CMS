const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'NeuroMat Data.xlsx');
try {
  const workbook = xlsx.readFile(filePath);
  const tables = {};
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    if (data.length > 0) {
      tables[sheetName] = data[0]; // Just the headers
    } else {
      tables[sheetName] = [];
    }
  }
  console.log(JSON.stringify(tables, null, 2));
} catch (e) {
  console.error("Error reading file:", e);
}
