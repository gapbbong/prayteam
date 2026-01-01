import zipfile
import xml.etree.ElementTree as ET
import os

filename = "Test 기도제목 (2).xlsx"

def inspect_xlsx(fname):
    if not os.path.exists(fname):
        print(f"File not found: {fname}")
        return

    with open('structure_utf8.txt', 'w', encoding='utf-8') as f:
        def log(msg):
            print(msg)
            f.write(msg + "\n")

        try:
            with zipfile.ZipFile(fname, 'r') as z:
                # 1. Get Sheet Names from workbook.xml
                try:
                    workbook_xml = z.read('xl/workbook.xml')
                    root = ET.fromstring(workbook_xml)
                    namespaces = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                    
                    sheets = []
                    
                    for sheet in root.findall('.//ns:sheet', namespaces):
                        name = sheet.get('name')
                        sheetId = sheet.get('sheetId')
                        rId = sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                        sheets.append({'name': name, 'id': sheetId, 'rId': rId})
                    
                    log("=== Sheet Names ===")
                    for s in sheets:
                        log(f"- {s['name']}")
                    
                except Exception as e:
                    log(f"Error reading workbook.xml: {e}")
                    return

                # 2. Get Shared Strings (to decode cell values)
                shared_strings = []
                try:
                    if 'xl/sharedStrings.xml' in z.namelist():
                        ss_xml = z.read('xl/sharedStrings.xml')
                        ss_root = ET.fromstring(ss_xml)
                        for t in ss_root.findall('.//ns:t', namespaces):
                            shared_strings.append(t.text)
                    else:
                        log("\nNo sharedStrings.xml found (might be inline strings)")
                except Exception as e:
                    log(f"Error reading sharedStrings.xml: {e}")

                # 3. Inspect Headers for key sheets
                rels = {}
                try:
                    rels_xml = z.read('xl/_rels/workbook.xml.rels')
                    rels_root = ET.fromstring(rels_xml)
                    rels_ns = {'ns': 'http://schemas.openxmlformats.org/package/2006/relationships'}
                    for rel in rels_root.findall('.//ns:Relationship', rels_ns):
                        rels[rel.get('Id')] = rel.get('Target')
                except:
                    pass

                log("\n=== Sheet Headers (First Row) ===")
                for s in sheets:
                    target = rels.get(s['rId'])
                    if not target:
                        target = f"worksheets/sheet{s['id']}.xml"
                        continue
                    
                    if target.startswith('/'): target = target[1:]
                    else: target = 'xl/' + target
                    
                    if target not in z.namelist():
                        continue

                    try:
                        sheet_xml = z.read(target)
                        s_root = ET.fromstring(sheet_xml)
                        
                        rows = s_root.findall('.//ns:row', namespaces)
                        if not rows:
                            log(f"\n[Sheet: {s['name']}] - Empty")
                            continue
                            
                        first_row = rows[0]
                        headers = []
                        for cell in first_row.findall('.//ns:c', namespaces):
                            t = cell.get('t') 
                            val_tag = cell.find('ns:v', namespaces)
                            val = val_tag.text if val_tag is not None else ""
                            
                            if t == 's' and val.isdigit():
                                idx = int(val)
                                if idx < len(shared_strings):
                                    headers.append(shared_strings[idx])
                                else:
                                    headers.append(f"(StringIdx:{idx})")
                            elif t == 'inlineStr':
                                is_tag = cell.find('ns:is', namespaces)
                                if is_tag:
                                    t_tag = is_tag.find('ns:t', namespaces)
                                    if t_tag is not None:
                                        headers.append(t_tag.text)
                            else:
                                headers.append(val)
                                
                        log(f"\n[Sheet: {s['name']}]")
                        log(f"Headers: {headers}")
                        
                    except Exception as e:
                        log(f"Error reading {target}: {e}")

        except Exception as e:
            log(f"Failed to open zip: {e}")

inspect_xlsx(filename)
