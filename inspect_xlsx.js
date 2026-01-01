const XLSX = require('xlsx');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: node inspect_xlsx.js <path_to_xlsx>');
    process.exit(1);
}

try {
    const workbook = XLSX.readFile(filePath);
    console.log('--- SHEETS ---');
    workbook.SheetNames.forEach(name => {
        if (name !== '관리자계정') return;
        console.log(`\n[Sheet: ${name}]`);
        const sheet = workbook.Sheets[name];
        const range = XLSX.utils.decode_range(sheet['!ref']);
        const firstRow = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })];
            firstRow.push(cell ? cell.v : '');
        }
        console.log('Headers:', firstRow.join(' | '));

        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log('Rows (limit 5):');
        rows.slice(1, 6).forEach(row => {
            console.log('  ' + row.join(' | '));
        });
    });
} catch (err) {
    console.error('Error reading file:', err.message);
}
