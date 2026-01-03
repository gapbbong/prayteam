const XLSX = require('xlsx');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: node inspect_all.js <path_to_xlsx>');
    process.exit(1);
}

try {
    const workbook = XLSX.readFile(filePath);
    console.log('--- ALL SHEETS ---');
    workbook.SheetNames.forEach(name => {
        console.log(`\n[Sheet: ${name}]`);
        const sheet = workbook.Sheets[name];
        const ref = sheet['!ref'];
        if (!ref) {
            console.log(' (Empty sheet)');
            return;
        }
        const range = XLSX.utils.decode_range(ref);
        const firstRow = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })];
            firstRow.push(cell ? cell.v : '');
        }
        console.log('Headers:', firstRow.join(' | '));

        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log('Rows (limit 2):');
        rows.slice(1, 3).forEach(row => {
            console.log('  ' + row.join(' | '));
        });
    });
} catch (err) {
    console.error('Error reading file:', err.message);
}
