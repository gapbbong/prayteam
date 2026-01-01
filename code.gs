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
  switch (mode) {
    case "login": output = handleLogin(e); break;
    case "signup": output = handleSignup(e); break;
    case "getGroups": output = handleGetGroups(e); break;
    case "getGroupById": output = handleGetGroupById(e); break;
    case "getPrayers": output = handleGetPrayers(e); break;
    case "getPrayersAll": output = handleGetPrayersAll(e); break;
    case "getSubs": output = handleGetSubs(e); break;
    default:
      output = ContentService.createTextOutput("Invalid request")
        .setMimeType(ContentService.MimeType.TEXT);
  }

  // 🔥 [최적화 2] 클라이언트 캐시 방지 헤더 추가
  // 카톡 인앱 브라우저 등에서 이전 데이터를 보여주는 문제 해결
  try {
    if (output && typeof output.getMimeType === 'function' && output.getMimeType() === ContentService.MimeType.JSON) {
      return output
        .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        .setHeader('Pragma', 'no-cache')
        .setHeader('Expires', '0');
    }
  } catch (e) {
    // setHeader 지원하지 않는 경우 그냥 반환
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

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getLastRow() === 0
    ? createPrayerHeaders(sheet, 6)
    : sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const maxCols = (headers.length - 4) / 3;
  const needed = Math.max(data.prayers.length, maxCols);

  // 컬럼 부족 시 확장
  if (needed > maxCols) {
    const newHeaders = [];
    for (let i = maxCols + 1; i <= needed; i++) {
      newHeaders.push(`기도제목${i}`, `R${i}`, `C${i}`);
    }
    // 한번에 헤더 추가
    sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
  }

  const now = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy.MM.dd a h:mm:ss");
  const prayerCells = [];
  for (let i = 0; i < needed; i++) prayerCells.push(data.prayers[i] || "", "", "");
  const row = [data.groupName, data.groupId, data.member, now, ...prayerCells];
  
  sheet.appendRow(row);

  // 🔥 [최적화 1] 푸시 알림 비동기 처리 (트리거 활용)
  // UrlFetchApp.fetch가 동기적이라 발생하는 2~5초 딜레이 제거
  try {
    const payload = {
      groupId: data.groupId,
      title: `${data.member}님이 새로운 기도제목을 작성했습니다.`,
      message: data.prayers[0] || "(내용 없음)"
    };
    
    // PropertiesService에 알림 데이터 임시 저장 (큐 역할)
    // 여러 건이 동시에 들어올 경우를 대비해 배열로 관리하면 좋으나, 
    // 간단하게 덮어쓰기 방지를 위해 타임스탬프 키 사용
    const key = 'NOTI_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(payload));
    
    // 1초 후 실행되는 트리거 생성 (비동기 효과)
    ScriptApp.newTrigger('asyncSendNotification')
      .timeBased()
      .after(100) // 0.1초 후 (최소 대기)
      .create();
      
  } catch (e) {
    Logger.log("알림 트리거 생성 실패: " + e);
    // 트리거 실패 시 그냥 넘어감 (사용자 경험 우선)
  }

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

function createPrayerHeaders(sheet, count) {
  const headers = ["그룹명", "그룹ID", "멤버이름", "작성시간"];
  for (let i = 1; i <= count; i++) headers.push(`기도제목${i}`, `R${i}`, `C${i}`);
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

  // 🔥 [최적화 3] 최신 행 검색 범위 제한
  // 전체 데이터를 읽지 않고 최근 100행만 읽어서 검색 속도 향상
  const CHECK_ROWS = 100;
  const startRow = Math.max(2, lastRow - CHECK_ROWS + 1);
  const numRows = lastRow - startRow + 1;
  
  // 필요한 범위만 로드
  const dataRange = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn());
  const data = dataRange.getValues();
  
  // 헤더는 별도로 읽음 (항상 1행)
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const memberCol = headers.indexOf("멤버이름");
  const timeCol = headers.indexOf("작성시간");

  const prayerCols = [];
  const rCols = [];
  const cCols = [];

  headers.forEach((h, i) => {
    if (typeof h !== "string") return;
    if (h.startsWith("기도제목")) {
      prayerCols.push(i);
    } else if (/^R\d+$/.test(h)) {
      rCols.push(i);
    } else if (/^C\d+$/.test(h)) {
      cCols.push(i);
    }
  });

  // 로드한 데이터(data) 내에서 역순 검색
  // data[0]이 startRow에 해당함
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    if (String(row[memberCol]).trim() === member) {
      const prayers = prayerCols.map(idx => row[idx] || "").filter(v => v !== "");
      const responses = rCols.map(idx => row[idx] || "");
      const comments = cCols.map(idx => row[idx] || "");

      return jsonOutput({
        groupId,
        member,
        prayers,
        responses,
        comments,
        time: row[timeCol]
      });
    }
  }

  return jsonOutput({});
}

function handleGetPrayersAll(e) {
  const groupId = e.parameter.groupId || "";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(groupId);
  if (!sheet) return jsonOutput([]);

  // 전체 목록 조회는 어쩔 수 없이 전체를 읽어야 할 수 있음
  // 하지만 여기도 캐싱을 적용하거나 페이징을 할 수 있음 (일단 유지)
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonOutput([]);

  const headers = data.shift().map(String);
  const idxGroup = headers.indexOf("그룹명");
  const idxMember = headers.indexOf("멤버이름");
  const idxTime = headers.indexOf("작성시간");
  const prayerCols = headers.map((h, i) => h.startsWith("기도제목") ? i : -1).filter(i => i !== -1);

  const latest = {};
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    const member = row[idxMember];
    if (!member || latest[member]) continue;
    
    // 🔥 수정: filter(Boolean) 대신 명시적으로 빈 문자열과 공백 제거
    const prayers = prayerCols
      .map(idx => row[idx])
      .filter(v => v !== null && v !== undefined && String(v).trim() !== "");
    
    latest[member] = {
      그룹명: row[idxGroup],
      멤버이름: member,
      prayers: prayers,
      작성시간: row[idxTime],
    };
  }
  return jsonOutput(Object.values(latest));
}

/* 나머지 코드는 동일하므로 생략... */
