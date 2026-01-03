/**
 * ✅ 기도그룹 관리용 GAS (그룹ID = 시트이름 구조)
 * - mode=login → 관리자계정 시트에서 확인
 * - mode=signup → 새 계정 추가
 * - 그룹ID, 그룹명은 "그룹정보" 시트에서만 관리
 * - 각 그룹ID가 곧 시트 이름으로 사용됨 (예: XL8IXTvhrRoknAKgQ1Gs)
 */

function doGet(e) {
  const mode = e.parameter.mode || "";

  let output;
  try {
    switch (mode) {
      case "login": output = handleLogin(e); break;
      case "signup": output = handleSignup(e); break;
      case "findId": 
      case "findid": output = handleFindId(e); break;
      case "findPwd": 
      case "findpwd": output = handleFindPwd(e); break;
      case "getGroups": output = handleGetGroups(e); break;
      case "getGroupById": output = handleGetGroupById(e); break;
      case "getPrayers": output = handleGetPrayers(e); break;
      case "getPrayersAll": output = handleGetPrayersAll(e); break;
      case "getPrayersAllGroups": output = handleGetPrayersAllGroups(e); break;
      case "getSubs": output = handleGetSubs(e); break;
      default:
        output = ContentService.createTextOutput("Invalid request: mode=" + mode)
          .setMimeType(ContentService.MimeType.TEXT);
    }
  } catch (err) {
    return jsonOutput({ error: err.toString(), stack: err.stack });
  }

  return output;
}

// ✅ CORS preflight 요청 처리 (OPTIONS 메서드)
function doOptions(e) {
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
}


function doPost(e) {
  Logger.log("=== 📩 doPost 호출됨 ===");

  if (!e) {
    Logger.log("⚠ e 객체 없음");
    return jsonOutput({ error: "no event object" });
  }

  let mode = e.parameter.mode || "";
  let data = {};

  if (e.postData && e.postData.contents) {
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      Logger.log("❌ JSON 파싱 실패: " + err);
    }
  }

  if (!mode && data.mode) {
    mode = data.mode;
  }

  switch (mode) {
    case "renameGroup": return handleRenameGroup(e);
    case "deleteGroup": return handleDeleteGroup(e);
    case "savePrayer": return handleSavePrayer(data);
    case "addMember": return handleAddMember(data);
    case "addGroup": return handleAddGroup(e);
    case "saveNote": return handleSaveNote(e);
    case "saveSub": return handleSaveSub(e);
    case "renameMember": return handleRenameMember(data);
    case "addSharedGroup": return handleAddSharedGroup(e);
    case "addLog": return handleAddLog(e);
    case "logStay": return handleLogStay(e);

    default:
      return jsonOutput({ error: "invalid mode", received: mode });
  }
}

/* -------------------------------------------------------------------------- */
/* ✅ 그룹, 멤버, 로그인, 회원가입                                            */
/* -------------------------------------------------------------------------- */

function handleLogin(e) {
  const id = e.parameter.id || "";
  const pwd = e.parameter.pwd || "";
  const sheet = getOrCreateSheet("관리자계정");

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const idCol = headers.indexOf("관리자ID");
  const pwdCol = headers.indexOf("비밀번호");

  const found = data.find(r => r[idCol] === id && String(r[pwdCol]) === String(pwd));
  if (!found) return jsonOutput({ success: false, message: "아이디 또는 비밀번호 불일치" });

  return jsonOutput({ success: true, message: "로그인 성공" });
}

function handleSignup(e) {
  const id = e.parameter.id || "";
  const pwd = e.parameter.pwd || "";
  const email = e.parameter.email || "";
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("관리자계정");
  if (!sheet) return jsonOutput({ success: false, message: "시트를 찾을 수 없습니다." });

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const idCol = headers.indexOf("관리자ID");
  const emailCol = headers.indexOf("이메일");

  if (data.some(r => r[idCol] === id)) {
    return jsonOutput({ success: false, message: "이미 존재하는 아이디입니다." });
  }

  if (email && data.some(r => r[emailCol] === email)) {
    return jsonOutput({ success: false, message: "이미 가입된 이메일입니다." });
  }

  const joinedAt = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
  sheet.appendRow([id, pwd, joinedAt, email]);
  return jsonOutput({ success: true, message: "회원가입되었습니다." });
}

function handleFindId(e) {
  const email = e.parameter.email || "";
  const firstChar = e.parameter.firstChar || "";
  
  if (!email || !firstChar) {
    return jsonOutput({ success: false, message: "이메일과 아이디 첫 글자를 모두 입력해주세요." });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("관리자계정");
  if (!sheet) return jsonOutput({ success: false, message: "관리자 시트 없음" });

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const idCol = headers.indexOf("관리자ID");
  const emailCol = headers.indexOf("이메일");

  if (emailCol === -1) return jsonOutput({ success: false, message: "데이터베이스에 이메일 정보가 없습니다." });

  const found = data.filter(r => {
    const rId = String(r[idCol] || "");
    const rEmail = String(r[emailCol] || "");
    return rEmail === email && rId.startsWith(firstChar);
  });

  if (found.length === 0) {
    return jsonOutput({ success: false, message: "일치하는 계정을 찾을 수 없습니다." });
  }

  const ids = found.map(r => r[idCol]);
  return jsonOutput({ success: true, ids: ids });
}

function handleFindPwd(e) {
  const id = e.parameter.id || "";
  const email = e.parameter.email || "";

  if (!id || !email) {
    return jsonOutput({ success: false, message: "아이디와 이메일을 모두 입력해주세요." });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("관리자계정");
  if (!sheet) return jsonOutput({ success: false, message: "관리자 시트 없음" });

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const idCol = headers.indexOf("관리자ID");
  const pwdCol = headers.indexOf("비밀번호");
  const emailCol = headers.indexOf("이메일");

  if (idCol === -1 || pwdCol === -1 || emailCol === -1) {
    return jsonOutput({ success: false, message: "데이터베이스 구조 오류 (컬럼 누락)" });
  }

  const found = data.find(r => {
    const rId = String(r[idCol] || "");
    const rEmail = String(r[emailCol] || "");
    return rId === id && rEmail === email;
  });

  if (!found) {
    return jsonOutput({ success: false, message: "아이디와 이메일이 일치하는 계정을 찾을 수 없습니다." });
  }

  const pwd = String(found[pwdCol]);
  return jsonOutput({ success: true, password: pwd });
}

function handleSaveNote(e) {
  const body = JSON.parse(e.postData.contents);
  const { groupId, member, index, answer, comment, visibility } = body;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(groupId);
  if (!sheet) return jsonOutput({ success: false, message: "sheet 없음" });

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idxMember = headers.indexOf("멤버이름");
  
  // Check for columns (Support both Legacy & New)
  const idxR = headers.indexOf(`R${index}`);
  const idxC = headers.indexOf(`C${index}`);
  const idxV = headers.indexOf(`숨김여부${index}`);

  let target = -1;
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idxMember]).trim() === member) {
      target = i + 1;
      break;
    }
  }

  if (target === -1) {
    return jsonOutput({ success: false, message: "저장된 기도제목 없음" });
  }

  // Update R & C
  if (idxR > -1 && answer !== undefined) sheet.getRange(target, idxR + 1).setValue(answer);
  if (idxC > -1 && comment !== undefined) sheet.getRange(target, idxC + 1).setValue(comment);
  
  // Update Visibility (V)
  if (idxV > -1 && visibility !== undefined) {
    sheet.getRange(target, idxV + 1).setValue(visibility);
  } else if (idxV === -1 && visibility === 'Hidden') {
    // Legacy Fallback: If no V column, save as '보관됨' in R column
    if (idxR > -1) sheet.getRange(target, idxR + 1).setValue('보관됨');
  }

  return jsonOutput({ success: true });
}

function handleGetGroups(e) {
  const adminId = e.parameter.adminId || "";
  const sheet = getOrCreateSheet("그룹정보");
  
  // 데이터가 적을 땐 전체 로드해도 무방하지만, 많아지면 최적화 필요
  // 여기서는 기존 로직 유지하되 안전하게 처리
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 1) return jsonOutput({ groups: [] });

  const headers = rows[0];
  const idxAdmin = headers.indexOf("관리자ID");
  const idxGroupName = headers.indexOf("그룹명");
  const idxGroupId = headers.indexOf("그룹ID");
  const idxCount = headers.indexOf("구성원수");

  const memberCols = headers
    .map((h, i) => (h.startsWith("구성원") && h !== "구성원수") ? i : -1)
    .filter(i => i !== -1);

  // 정규화 미리 수행
  const targetAdminId = adminId.normalize("NFKC").replace(/\s+/g, "");

  const groups = rows.slice(1)
    .filter(r => 
      String(r[idxAdmin]).normalize("NFKC").replace(/\s+/g, "") === targetAdminId
    )
    .map(r => {
      const members = memberCols
        .map(i => String(r[i] || "").trim())
        .filter(v => v !== "");

      return {
        관리자ID: r[idxAdmin],
        그룹명: r[idxGroupName],
        그룹ID: r[idxGroupId],
        구성원수: r[idxCount],
        구성원목록: members
      };
    });

  return jsonOutput({ groups });
}

function handleGetGroupById(e) {
  const groupId = e.parameter.groupId || "";
  const sheet = getOrCreateSheet("그룹정보");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];

  const idxGroupId = headers.indexOf("그룹ID");
  const idxGroupName = headers.indexOf("그룹명");

  const memberCols = headers
    .map((h, i) => (h.startsWith("구성원") && h !== "구성원수") ? i : -1)
    .filter(i => i !== -1);

  const row = rows.find(r => r[idxGroupId] === groupId);
  if (!row) return jsonOutput({ error: "group not found" });

  const members = memberCols
    .map(i => String(row[i] || "").trim())
    .filter(v => v !== "");

  return jsonOutput({
    group: {
      그룹ID: row[idxGroupId],
      그룹명: row[idxGroupName],
      구성원목록: members,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* ✅ 기도제목 저장 및 조회                                                   */
/* -------------------------------------------------------------------------- */

function handleSavePrayer(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = data.groupId;
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  // 1. 헤더 확인 및 마이그레이션 (안전모드)
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  
  let headers = [];
  if (lastRow > 0) {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  } else {
    headers = createPrayerHeaders(sheet, 6); // 초기 생성
  }

  // "작성시간1" (D1) 컬럼이 없으면 구버전으로 판단 -> 마이그레이션 실행
  const hasDateCol = headers.includes("작성시간1") || headers.some(h => h.startsWith("작성시간"));
  
  if (!hasDateCol && lastRow > 0) {
    // 마이그레이션: 기도1, R1, C1 뒤에 -> D1, V1 추가
    // 역순으로 추가해야 인덱스가 꼬이지 않음
    // 기존 구조: [공통4개] + [기도, R, C] * N
    // 목표 구조: [공통4개] + [기도, R, C, D, V] * N
    
    // 현재 몇 세트인지 계산
    const numSets = Math.floor((headers.length - 4) / 3);
    
    for (let i = numSets; i >= 1; i--) {
      const targetColIndex = 4 + (i * 3); // 1-based index of C{i}
      // Insert 2 columns after C{i}
      sheet.insertColumnsAfter(targetColIndex, 2);
      
      // 헤더 업데이트
      sheet.getRange(1, targetColIndex + 1).setValue(`작성시간${i}`);
      sheet.getRange(1, targetColIndex + 2).setValue(`숨김여부${i}`);
    }
    // 헤더 다시 읽기
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  // 2. 저장할 데이터 준비
  const maxCols = (headers.length - 4) / 5; // 이제 5개씩 (기도, R, C, D, V)
  const needed = Math.max(data.prayers.length, maxCols);

  // 컬럼 부족 시 확장 (새 구조대로)
  if (needed > maxCols) {
    const newHeaders = [];
    const currentLastCol = sheet.getLastColumn();
    for (let i = maxCols + 1; i <= needed; i++) {
      newHeaders.push(`기도제목${i}`, `R${i}`, `C${i}`, `작성시간${i}`, `숨김여부${i}`);
    }
    sheet.getRange(1, currentLastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
  }

  const now = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy.MM.dd a h:mm:ss");
  const today = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy.MM.dd"); // 날짜 배지용
  
  // 3. 이전 데이터 조회 보완 (순서 변경 시 타임스탬프 보존을 위해)
  const memberColIdx = headers.indexOf("멤버이름");
  const allData = sheet.getDataRange().getValues();
  let oldRow = null;
  
  // 이전 데이터 파싱용 맵 (Text -> {Date, Visibility})
  // 같은 텍스트가 여러 개일 경우를 대비해 배열로 저장하거나, 첫 번째 매칭 사용
  const historyMap = new Map();

  for (let i = allData.length - 1; i >= 1; i--) {
    if (String(allData[i][memberColIdx]).trim() === data.member) {
      oldRow = allData[i];
      
      // 현재 저장된 모든 기도제목을 맵에 등록
      // 예: headers loop helper needed? No, just loop slots.
      // We know the structure: [Common], [P, R, C, D, V], ...
      const oldMaxSets = Math.floor((headers.length - 4) / 5); 
      // 주의: 마이그레이션 전일 수도 있는데, 위에서 hasDateCol 로직으로 이미 헤더는 확장됨.
      // 하지만 oldRow 데이터 자체는 (헤더가 늘어나기 전 읽었으면) 짧을 수 있음?
      // -> sheet.getDataRange()는 헤더 확장 '후'에 호출되므로 괜찮으나, 
      //    insertColumnsAfter로 칼럼을 늘렸다면 값은 비어있음.
      //    따라서 D/V값은 없을 수도 있음.

      for (let k = 1; k <= oldMaxSets; k++) {
        // Find indices in headers
        const pIdx = headers.indexOf(`기도제목${k}`);
        const dIdx = headers.indexOf(`작성시간${k}`);
        const vIdx = headers.indexOf(`숨김여부${k}`);
        
        if (pIdx > -1 && pIdx < oldRow.length) {
          const pVal = String(oldRow[pIdx] || "").trim();
          if (pVal) {
            // 날짜, 숨김상태 가져오기
            const dVal = (dIdx > -1 && dIdx < oldRow.length) ? oldRow[dIdx] : "";
            const vVal = (vIdx > -1 && vIdx < oldRow.length) ? oldRow[vIdx] : "";
            
            // 맵에 저장 (키: 기도제목, 값: {date, vis})
            // 중복 시... 기존 로직상 뒤에 있는게 덮어쓰나? 일단 첫 발견(또는 루프 순서) 기준.
            if (!historyMap.has(pVal)) {
               historyMap.set(pVal, { date: dVal, visibility: vVal });
            }
          }
        }
      }
      break;
    }
  }

  const rowData = [data.groupName, data.groupId, data.member, now]; // 공통 4개

  for (let i = 0; i < needed; i++) {
    const pText = (data.prayers[i] || "").trim();
    
    // R, C는 프론트에서 온 것(순서대로) 사용
    let saveR = (data.responses && data.responses[i]) || "";
    let saveC = (data.comments && data.comments[i]) || "";
    let saveD = today; // 기본: 오늘 (신규)
    let saveV = "";    // 기본: 보임

    if (!pText) {
      // 빈 내용이면 모두 초기화
      rowData.push("", "", "", "", "");
      continue;
    }

    // 1. History Map에서 검색 (텍스트 기준)
    if (historyMap.has(pText)) {
      const history = historyMap.get(pText);
      if (history.date) saveD = history.date; // 기존 날짜 유지
      if (history.visibility) saveV = history.visibility; // 기존 숨김상태 유지
    }

    // 2. 숨김/보관 상태 처리 (프론트 요청 우선)
    // 프론트에서 'visibilities' 배열을 보내주면 그걸 쓰고, 아니면 'responses' 체크
    // 현재는 Responses='보관됨'을 보내므로 변환 로직 유지
    if (saveR === '보관됨' || saveR === '숨김') {
      saveV = "Hidden";
      saveR = "기대중"; 
    } else if (data.visibilities && data.visibilities[i]) {
       // 프론트가 visibilities를 보내주는 경우 (업데이트 후)
       saveV = data.visibilities[i];
    }
    
    // * 덮어쓰기 로직:
    // 만약 텍스트가 수정되었다면? (History에 없음) -> saveD = today.
    // 만약 순서만 바뀌었다면? (History에 있음) -> saveD = old date.
    
    rowData.push(pText, saveR, saveC, saveD, saveV);
  }
  
  sheet.appendRow(rowData);

  // 알림 트리거 (동일)
  try {
     const payload = { groupId: data.groupId, title: `${data.member} 기도 업데이트`, message: data.prayers[0] || "기도제목 업데이트" };
     const key = 'NOTI_' + Date.now() + Math.random();
     PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(payload));
     ScriptApp.newTrigger('asyncSendNotification').timeBased().after(100).create();
  } catch(e) {}

  return jsonOutput({ success: true, message: "저장 완료", time: now });
}

// 🔥 비동기로 실행될 알림 전송 함수
function asyncSendNotification() {
  const props = PropertiesService.getScriptProperties();
  const keys = props.getKeys().filter(k => k.startsWith('NOTI_'));
  
  if (keys.length === 0) return;

  // 저장된 모든 알림 처리
  keys.forEach(key => {
    const payloadJson = props.getProperty(key);
    if (!payloadJson) return;
    
    try {
      UrlFetchApp.fetch("https://prayteam.creat1324.com/.netlify/functions/notify", {
        method: "post",
        contentType: "application/json",
        payload: payloadJson,
        muteHttpExceptions: true // 에러 발생해도 스크립트 중단 안 함
      });
    } catch (e) {
      Logger.log("알림 전송 중 오류: " + e);
    }
    
    // 처리 후 삭제
    props.deleteProperty(key);
  });

  // 완료된 트리거 정리 (청소)
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'asyncSendNotification') {
      ScriptApp.deleteTrigger(t);
    }
  });
}

// ✅ 기도제목 저장 (수정됨)
// handleSavePrayer is updated above.

function createPrayerHeaders(sheet, count) {
  const headers = ["그룹명", "그룹ID", "멤버이름", "작성시간"];
  for (let i = 1; i <= count; i++) headers.push(`기도제목${i}`, `R${i}`, `C${i}`, `작성시간${i}`, `숨김여부${i}`); // 5개씩
  sheet.appendRow(headers);
  return headers;
}

function handleGetPrayers(e) {
  const groupId = e.parameter.groupId || "";
  const member = e.parameter.member || "";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(groupId);
  if (!sheet) return jsonOutput({});

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonOutput({});

  const CHECK_ROWS = 100;
  const startRow = Math.max(2, lastRow - CHECK_ROWS + 1);
  const numRows = lastRow - startRow + 1;
  const dataRange = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn());
  const data = dataRange.getValues();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const memberCol = headers.indexOf("멤버이름");
  const timeCol = headers.indexOf("작성시간");

  const prayerCols = [];
  const rCols = [];
  const cCols = [];
  const dCols = []; // Date Columns
  const vCols = []; // Visibility (Hidden) Columns

  headers.forEach((h, i) => {
    if (typeof h !== "string") return;
    if (h.startsWith("기도제목")) {
      prayerCols.push(i);
    } else if (/^R\d+$/.test(h)) {
      rCols.push(i);
    } else if (/^C\d+$/.test(h)) {
      cCols.push(i);
    } else if (/^작성시간\d+$/.test(h)) {
      dCols.push(i); // 작성시간1, 작성시간2...
    } else if (/^숨김여부\d+$/.test(h)) {
      vCols.push(i);
    }
  });

  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    if (String(row[memberCol]).trim() === member) {
      const prayers = prayerCols.map(idx => row[idx] || "").filter(v => v !== "");
      // 인덱스 매칭을 위해 map 사용 (filter후에는 인덱스 깨짐)
      // 따라서 전체 길이를 기준으로 가져오고, 프론트에서 빈값 처리하거나
      // 여기서는 prayers와 1:1 매칭되는 배열들을 리턴해야 함.
      // 하지만 기존 로직: `filter(v => v !== "")`. 즉 빈 기도는 제거됨.
      // 그럼 R, C, D, V도 같은 인덱스의 것만 남겨야 함.
      
      const resultPrayers = [];
      const resultRs = [];
      const resultCs = [];
      const resultDs = [];
      const resultVs = [];
      const resultIndices = []; // [NEW] 슬롯 번호 저장용
      
      prayerCols.forEach((pIdx, k) => {
        const pVal = row[pIdx];
        if (pVal && String(pVal).trim() !== "") {
           resultPrayers.push(pVal);
           resultRs.push(rCols[k] !== undefined ? row[rCols[k]] : "");
           resultCs.push(cCols[k] !== undefined ? row[cCols[k]] : "");
           resultDs.push(dCols[k] !== undefined ? row[dCols[k]] : "");
           resultVs.push(vCols[k] !== undefined ? row[vCols[k]] : "");
           resultIndices.push(k + 1); // [NEW] 실제 슬롯 번호(1-based)
        }
      });

      return jsonOutput({
        groupId,
        member,
        prayers: resultPrayers,
        responses: resultRs,
        comments: resultCs,
        dates: resultDs,
        visibilities: resultVs,
        indices: resultIndices, // [NEW]
        time: row[timeCol]
      });
    }
  }

  return jsonOutput({});
}

function handleGetPrayersAll(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const groupId = e.parameter.groupId || "";
  return jsonOutput(getGroupPrayersData(ss, groupId));
}

// [신설] 다중 그룹 벌크 로딩 핸들러
function handleGetPrayersAllGroups(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const groupIds = (e.parameter.groupIds || "").split(",");
    let allResults = [];
    groupIds.forEach(gid => {
      const trimmedId = gid.trim();
      if (trimmedId) {
        const groupData = getGroupPrayersData(ss, trimmedId);
        if (Array.isArray(groupData)) {
          allResults = allResults.concat(groupData);
        }
      }
    });
    return jsonOutput(allResults);
  } catch (err) {
    return jsonOutput({ error: "Bulk Loading Error: " + err.toString() });
  }
}

// [공통] 특정 그룹의 최신 기도 데이터 추출 함수
function getGroupPrayersData(ss, groupId) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(groupId);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data.shift().map(String);
  const idxGroup = headers.indexOf("그룹명");
  const idxMember = headers.indexOf("멤버이름");
  const updateTime = headers.indexOf("작성시간");
  
  // 컬럼 인덱스 매핑
  const pMap = []; 
  headers.forEach((h, i) => {
     if (h.startsWith("기도제목")) {
       const num = parseInt(h.replace("기도제목", ""));
       if (!isNaN(num)) {
         pMap.push({
           id: num,
           pIdx: i,
           rIdx: headers.indexOf(`R${num}`),
           cIdx: headers.indexOf(`C${num}`),
           dIdx: headers.indexOf(`작성시간${num}`),
           vIdx: headers.indexOf(`숨김여부${num}`)
         });
       }
     }
  });

  const latest = {};
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    const member = row[idxMember];
    if (!member || latest[member]) continue;
    
    const prayers = [];
    const rs = [];
    const cs = [];
    const ds = [];
    const vs = [];
    
    pMap.forEach(m => {
      const pVal = row[m.pIdx];
      if (pVal && String(pVal).trim() !== "") {
        prayers.push(pVal);
        rs.push(m.rIdx > -1 ? row[m.rIdx] : "");
        cs.push(m.cIdx > -1 ? row[m.cIdx] : "");
        ds.push(m.dIdx > -1 ? row[m.dIdx] : "");
        vs.push(m.vIdx > -1 ? row[m.vIdx] : "");
      }
    });
    
    latest[member] = {
      그룹ID: groupId, // [추가]
      그룹명: row[idxGroup],
      멤버이름: member,
      prayers: prayers,
      responses: rs,
      comments: cs,
      dates: ds,
      visibilities: vs,
      작성시간: row[updateTime],
    };
  }
  return Object.values(latest);
}

/* -------------------------------------------------------------------------- */
/* ✅ 멤버 추가                                                               */
/* -------------------------------------------------------------------------- */
function handleAddMember(data) {
  const { groupId, newMember } = data;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("그룹정보");

  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];

  const idxID = headers.indexOf("그룹ID");
  const idxCount = headers.indexOf("구성원수");

  const memberCols = headers
    .map((h, i) => (h.startsWith("구성원") && h !== "구성원수") ? i : -1)
    .filter((i) => i !== -1);

  let rowIndex = rows.findIndex((r, i) => i > 0 && r[idxID] === groupId);
  if (rowIndex === -1) {
    return jsonOutput({ success: false, message: "그룹을 찾을 수 없습니다." });
  }

  const row = rows[rowIndex];

  const current = memberCols
    .map(i => String(row[i] || "").trim())
    .filter(v => v !== "");

  let finalName = newMember;
  let cnt = 2;
  while (current.includes(finalName)) {
    finalName = newMember + cnt;
    cnt++;
  }

  let targetCol = -1;
  for (const col of memberCols) {
    if (!row[col]) {
      targetCol = col;
      break;
    }
  }

  if (targetCol === -1) {
    targetCol = sheet.getLastColumn();
    const newHeader = `구성원${memberCols.length + 1}`;
    sheet.getRange(1, targetCol + 1).setValue(newHeader);
  }

  sheet.getRange(rowIndex + 1, targetCol + 1).setValue(finalName);
  sheet.getRange(rowIndex + 1, idxCount + 1).setValue(current.length + 1);

  return jsonOutput({
    success: true,
    message: `${finalName} 추가 완료`,
    count: current.length + 1,
  });
}

function handleRenameMember(data) {
  const { groupId, oldName, newName } = data;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const groupSheet = ss.getSheetByName("그룹정보");
  if (!groupSheet) return jsonOutput({ success: false, message: "그룹정보 시트를 찾을 수 없습니다." });

  const rows = groupSheet.getDataRange().getValues();
  const headers = rows[0];

  const idxID = headers.indexOf("그룹ID");

  const memberCols = headers
    .map((h, i) => (h.startsWith("구성원") && h !== "구성원수") ? i : -1)
    .filter(i => i !== -1);

  const rowIndex = rows.findIndex((r, i) => i > 0 && r[idxID] === groupId);
  if (rowIndex === -1) {
    return jsonOutput({ success: false, message: "해당 그룹을 찾을 수 없습니다." });
  }

  const row = rows[rowIndex];

  let replaced = false;
  memberCols.forEach(col => {
    if (String(row[col]).trim() === oldName) {
      groupSheet.getRange(rowIndex + 1, col + 1).setValue(newName);
      replaced = true;
    }
  });

  if (!replaced) {
    return jsonOutput({ success: false, message: "기존 이름을 찾지 못했습니다." });
  }

  const prayerSheet = ss.getSheetByName(groupId);
  if (prayerSheet) {
    const dataRows = prayerSheet.getDataRange().getValues();
    const headers2 = dataRows[0];
    const idxMember = headers2.indexOf("멤버이름");

    for (let i = 1; i < dataRows.length; i++) {
      if (String(dataRows[i][idxMember]).trim() === oldName) {
        prayerSheet.getRange(i + 1, idxMember + 1).setValue(newName);
      }
    }
  }

  return jsonOutput({
    success: true,
    message: `'${oldName}' → '${newName}' 이름 수정 완료`
  });
}

function handleRenameGroup(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput({ success: false, message: "JSON 파싱 실패" });
  }

  const groupId = body.groupId;
  const newName = body.newName;

  if (!groupId || !newName) {
    return jsonOutput({ success: false, message: "groupId 또는 newName 누락" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("그룹정보");

  if (!sheet) {
    return jsonOutput({ success: false, message: "그룹정보 시트를 찾을 수 없습니다." });
  }

  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];

  const idxID = headers.indexOf("그룹ID");
  const idxName = headers.indexOf("그룹명");

  const rowIndex = rows.findIndex((r, i) => i > 0 && r[idxID] === groupId);

  if (rowIndex === -1) {
    return jsonOutput({ success: false, message: "그룹을 찾을 수 없습니다." });
  }

  sheet.getRange(rowIndex + 1, idxName + 1).setValue(newName);

  return jsonOutput({
    success: true,
    message: "그룹명이 정상적으로 수정되었습니다."
  });
}

function handleDeleteGroup(e) {
  let data = {};
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    Logger.log("❌ JSON 파싱 실패: " + err);
  }

  const groupId = data.groupId;

  if (!groupId) {
    return jsonOutput({ success: false, message: "groupId가 없습니다." });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const infoSheet = ss.getSheetByName("그룹정보");
  if (!infoSheet) {
    return jsonOutput({ success: false, message: "그룹정보 시트를 찾을 수 없습니다." });
  }

  const rows = infoSheet.getDataRange().getValues();
  const headers = rows[0];
  const idxID = headers.indexOf("그룹ID");

  const rowIndex = rows.findIndex((r, i) => i > 0 && r[idxID] === groupId);

  if (rowIndex !== -1) infoSheet.deleteRow(rowIndex + 1);

  const prayerSheet = ss.getSheetByName(groupId);
  if (prayerSheet) {
    ss.deleteSheet(prayerSheet);
  }

  return jsonOutput({
    success: true,
    message: "그룹이 정상적으로 삭제되었습니다."
  });
}

function handleAddGroup(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput({ success: false, message: "JSON 파싱 실패" });
  }

  const { adminId, groupName, members } = body;

  if (!adminId || !groupName || !members || members.length === 0) {
    return jsonOutput({ success: false, message: "필수 항목 누락" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("그룹정보") || ss.insertSheet("그룹정보");

  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];

  const idxAdmin     = headers.indexOf("관리자ID");
  const idxGroupName = headers.indexOf("그룹명");
  const idxGroupId   = headers.indexOf("그룹ID");
  const idxCreated   = headers.indexOf("생성일");
  const idxCount     = headers.indexOf("구성원수");

  const memberCols = headers
    .map((h, i) => (h.startsWith("구성원") && h !== "구성원수" ? i : -1))
    .filter(i => i !== -1);

  const newGroupId = "G" + Math.random().toString(36).substring(2, 14);
  const createdAt = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");

  while (members.length > memberCols.length) {
    const nextIndex = memberCols.length + 1;
    sheet.getRange(1, sheet.getLastColumn() + 1).setValue("구성원" + nextIndex);
    memberCols.push(sheet.getLastColumn() - 1);
  }

  const newRow = new Array(headers.length).fill("");

  newRow[idxAdmin]     = adminId;
  newRow[idxGroupName] = groupName;
  newRow[idxGroupId]   = newGroupId;
  newRow[idxCreated]   = createdAt;
  newRow[idxCount]     = members.length;

  members.forEach((m, i) => {
    const col = memberCols[i];
    newRow[col] = m;
  });

  sheet.appendRow(newRow);

  return jsonOutput({
    success: true,
    message: "그룹 추가 완료",
    groupId: newGroupId,
    createdAt
  });
}

function handleAddSharedGroup(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput({ success: false, message: "JSON 파싱 실패" });
  }

  const { adminId, groupId } = body;

  if (!adminId || !groupId) {
    return jsonOutput({ success: false, message: "필수 값 누락" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const infoSheet = ss.getSheetByName("그룹정보");
  if (!infoSheet) {
    return jsonOutput({ success: false, message: "그룹정보 시트 없음" });
  }

  const rows = infoSheet.getDataRange().getValues();
  const headers = rows[0];
  const idxGroupId = headers.indexOf("그룹ID");
  const idxGroupName = headers.indexOf("그룹명");

  const memberCols = headers
    .map((h, i) => (h.startsWith("구성원") && h !== "구성원수") ? i : -1)
    .filter(i => i !== -1);

  const source = rows.find(r => r[idxGroupId] === groupId);
  if (!source) {
    return jsonOutput({ success: false, message: "원본 그룹을 찾을 수 없습니다." });
  }

  const groupName = source[idxGroupName];

  const members = memberCols
    .map(i => String(source[i] || "").trim())
    .filter(v => v !== "");

  const newGroupId = "G" + Math.random().toString(36).substring(2, 14);
  const createdAt = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");

  const idxAdmin  = headers.indexOf("관리자ID");
  const idxCreated = headers.indexOf("생성일");
  const idxCount = headers.indexOf("구성원수");

  const newRow = new Array(headers.length).fill("");

  newRow[idxAdmin] = adminId;
  newRow[idxGroupName] = groupName + " (공유)";
  newRow[idxGroupId] = newGroupId;
  newRow[idxCreated] = createdAt;
  newRow[idxCount] = members.length;

  members.forEach((m, i) => {
    const col = memberCols[i];
    newRow[col] = m;
  });

  infoSheet.appendRow(newRow);

  return jsonOutput({
    success: true,
    message: "공유 그룹이 내 그룹으로 복제 완료",
    groupId: newGroupId
  });
}

function handleAddLog(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput({ success: false, message: "JSON 파싱 실패" });
  }

  const { page, adminId, groupId, member, from, device, browser } = body;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("방문로그") || ss.insertSheet("방문로그");

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "날짜","시간","페이지","adminId","groupId","member",
      "from","device","browser","체류초"
    ]);
  }

  const now = new Date();
  const dateStr = Utilities.formatDate(now, "Asia/Seoul", "yyyy-MM-dd");
  const timeStr = Utilities.formatDate(now, "Asia/Seoul", "HH:mm:ss");

  sheet.appendRow([
    dateStr, timeStr, page || "", adminId || "", groupId || "",
    member || "", from || "", device || "", browser || "", ""
  ]);

  return jsonOutput({ success: true });
}

function handleLogStay(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput({ success: false, message: "JSON 파싱 실패" });
  }

  const { page, groupId, stay, time } = body;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("방문로그") || ss.insertSheet("방문로그");

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "날짜","시간","페이지","adminId","groupId","member",
      "from","device","browser","체류초"
    ]);
  }

  const dateObj = new Date(time);
  const dateStr = Utilities.formatDate(dateObj, "Asia/Seoul", "yyyy-MM-dd");
  const timeStr = Utilities.formatDate(dateObj, "Asia/Seoul", "HH:mm:ss");

  sheet.appendRow([
    dateStr, timeStr, page || "", "", groupId || "",
    "", "", "", "", stay || 0
  ]);

  return jsonOutput({ success: true });
}

/* -------------------------------------------------------------------------- */
/* ✅ 푸시 알림 구독 관리 (pushSubs)                                           */
/* -------------------------------------------------------------------------- */

function handleSaveSub(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput({ success: false, message: "JSON 파싱 실패" });
  }

  const { groupId, subscription } = body;
  if (!groupId || !subscription) {
    return jsonOutput({ success: false, message: "필수 값 누락" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("pushSubs");
  if (!sheet) {
    sheet = ss.insertSheet("pushSubs");
    sheet.appendRow(["시간", "그룹ID", "엔드포인트", "구독JSON"]);
  }

  const now = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
  const endpoint = subscription.endpoint;
  const subJson = JSON.stringify(subscription);

  // 중복 체크 (엔드포인트 + 그룹ID)
  // 데이터가 많아지면 성능 이슈가 있을 수 있으므로, 최근 데이터만 체크하거나 별도 로직 필요
  // 여기서는 전체 스캔 대신 append만 하고, 발송 시 중복 제거하는 방식도 가능하지만
  // 시트 크기 관리를 위해 중복 갱신으로 처리
  
  const lastRow = sheet.getLastRow();
  let foundRow = -1;
  
  if (lastRow > 1) {
    // 최신 1000개만 체크 (성능 타협)
    const checkCount = Math.min(lastRow - 1, 1000);
    const startRow = lastRow - checkCount + 1;
    const data = sheet.getRange(startRow, 1, checkCount, 4).getValues();
    
    // 역순 검색 (최신 데이터 우선)
    for (let i = data.length - 1; i >= 0; i--) {
      // data[i][1] = 그룹ID, data[i][2] = 엔드포인트
      if (data[i][2] === endpoint && data[i][1] === groupId) {
        foundRow = startRow + i;
        break;
      }
    }
  }

  if (foundRow !== -1) {
    // 업데이트
    sheet.getRange(foundRow, 1).setValue(now);
    sheet.getRange(foundRow, 4).setValue(subJson);
    return jsonOutput({ success: true, message: "구독 갱신 완료" });
  } else {
    // 추가
    sheet.appendRow([now, groupId, endpoint, subJson]);
    return jsonOutput({ success: true, message: "구독 저장 완료" });
  }
}

function handleGetSubs(e) {
  const groupId = e.parameter.groupId;
  if (!groupId) return jsonOutput([]);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("pushSubs");
  if (!sheet) return jsonOutput([]);

  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return jsonOutput([]);

  const idxGroupId = 1; // B열
  const idxJson = 3;    // D열

  const subs = rows.slice(1)
    .filter(r => r[idxGroupId] === groupId)
    .map(r => {
      try {
        return JSON.parse(r[idxJson]);
      } catch (err) {
        return null;
      }
    })
    .filter(s => s !== null);

  return jsonOutput(subs);
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  return s;
}

function jsonOutput(obj) {
  // 기본 JSON 출력 (헤더는 doGet에서 추가됨)
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* -------------------------------------------------------------------------- */
/* ✅ (관리자용) 전체 그룹 시트 일괄 마이그레이션 도구                                 */
/* -------------------------------------------------------------------------- */
function runBatchMigration() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const infoSheet = ss.getSheetByName("그룹정보");
  if (!infoSheet) {
    Logger.log("❌ 그룹정보 시트가 없습니다.");
    return;
  }

  const rows = infoSheet.getDataRange().getValues();
  const headers = rows[0];
  const idxGroupId = headers.indexOf("그룹ID");
  const idxGroupName = headers.indexOf("그룹명");

  // 헤더 체크
  if (idxGroupId === -1) {
    Logger.log("❌ 그룹정보 시트에 '그룹ID' 열이 없습니다.");
    return;
  }

  Logger.log(`🚀 총 ${rows.length - 1}개의 그룹을 확인합니다...`);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // 1행부터 끝까지 순회 (헤더 제외)
  for (let r = 1; r < rows.length; r++) {
    const groupId = rows[r][idxGroupId];
    const groupName = rows[r][idxGroupName];
    
    if (!groupId) continue;

    const sheet = ss.getSheetByName(groupId);
    if (!sheet) {
      Logger.log(`⚠️ 시트 없음: [${groupName}] (${groupId})`);
      continue;
    }

    try {
      const result = migrateSheetStructure(sheet);
      if (result) {
        Logger.log(`✅ 업데이트 완료: [${groupName}] (${groupId})`);
        successCount++;
      } else {
        Logger.log(`⏭️ 이미 최신 상태: [${groupName}] (${groupId})`);
        skipCount++;
      }
    } catch (e) {
      Logger.log(`❌ 오류 발생: [${groupName}] (${groupId}) - ${e}`);
      errorCount++;
    }
  }

  Logger.log(`\n🎉 작업 종료! 성공: ${successCount}, 건너뜀: ${skipCount}, 오류: ${errorCount}`);
}

// 개별 시트 구조 개선 함수 (P, R, C -> P, R, C, D, V)
function migrateSheetStructure(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return false;

  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // 이미 업데이트된 시트인지 확인 (작성시간1 or 작성시간 존재 여부)
  const isUpToDate = headers.includes("작성시간1") || headers.some(h => h && String(h).startsWith("작성시간") && h !== "작성시간");
  if (isUpToDate) return false;

  // 기존 구조: [공통4개] + [기도, R, C] * N
  // 3개 단위로 되어 있는지 확인
  const prayerColsCount = headers.length - 4;
  const numSets = Math.floor(prayerColsCount / 3);

  if (numSets < 1) return false;

  // 역순으로 추가해야 인덱스가 밀리지 않음
  for (let i = numSets; i >= 1; i--) {
    // C{i}의 위치 (1-based)
    // 인덱스 0~3 (4개), 1세트(4,5,6), 2세트(7,8,9)...
    // C{i} index = 3 + (i * 3)  (0-based) -> 7, 10, ...
    // 1-based = 4 + (i * 3) -> 7, 10, ...
    
    // 검증: i=1 -> 4+3=7 (C1). Insert after 7 -> 8(D1), 9(V1).
    const targetColIndex = 4 + (i * 3);
    
    // 컬럼 2개 삽입
    sheet.insertColumnsAfter(targetColIndex, 2);
    
    // 헤더 이름 설정
    sheet.getRange(1, targetColIndex + 1).setValue(`작성시간${i}`);
    sheet.getRange(1, targetColIndex + 2).setValue(`숨김여부${i}`);
  }
  
  return true;
}
