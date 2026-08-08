/**
 * ========================================================
 * Backend สำหรับระบบตอบรับการประชุม สพฉ. (NIEM RSVP System)
 * Develop by Supanan V. (Engineer/Paramedic) | ACEMP NIEM
 * ========================================================
 */

// ==========================================
// ฟังก์ชัน Setup Database (รันครั้งแรก)
// ==========================================
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = [];
  
  // สร้าง Sheet Meetings
  var meetingsSheet = ss.getSheetByName('Meetings');
  if (!meetingsSheet) {
    meetingsSheet = ss.insertSheet('Meetings');
    meetingsSheet.appendRow(['id', 'topic', 'date', 'time', 'location', 'onlineLink', 'agendaUrl', 'agendaName', 'agendaFileId', 'hybridEnabled', 'uploadRoles', 'isActive', 'reportUrl', 'reportName', 'reportFileId', 'eventType', 'observerQuota']);
    meetingsSheet.getRange("A1:Q1").setFontWeight("bold").setBackground("#E8F0FE");
    result.push("✅ สร้าง Sheet 'Meetings' สำเร็จ");
  } else {
    ensureMeetingsSheetColumns_(meetingsSheet);
    result.push("ℹ️ Sheet 'Meetings' มีอยู่แล้ว");
  }
  
  // สร้าง Sheet Attendees
  var attendeesSheet = ss.getSheetByName('Attendees');
  if (!attendeesSheet) {
    attendeesSheet = ss.insertSheet('Attendees');
    attendeesSheet.appendRow(['mtgId', 'name', 'pdfUrl', 'pdfName', 'fileId', 'token', 'email']);
    attendeesSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#E8F0FE");
    result.push("✅ สร้าง Sheet 'Attendees' สำเร็จ");
  } else {
    ensureAttendeesSheetColumns_(attendeesSheet);
    result.push("ℹ️ Sheet 'Attendees' มีอยู่แล้ว");
  }
  
  // สร้าง Sheet Responses
  var responsesSheet = ss.getSheetByName('Responses');
  if (!responsesSheet) {
    responsesSheet = ss.insertSheet('Responses');
    responsesSheet.appendRow(['id', 'meetingId', 'topic', 'date', 'time', 'location', 'name', 'status', 'attendanceMode', 'reason', 'timestamp', 'email']);
    responsesSheet.getRange("A1:L1").setFontWeight("bold").setBackground("#E8F0FE");
    result.push("✅ สร้าง Sheet 'Responses' สำเร็จ");
  } else {
    ensureResponsesSheetColumns_(responsesSheet);
    result.push("ℹ️ Sheet 'Responses' มีอยู่แล้ว");
  }

  // สร้าง Sheet ObserverRegistrations
  var observerRegSheet = ss.getSheetByName('ObserverRegistrations');
  if (!observerRegSheet) {
    observerRegSheet = ss.insertSheet('ObserverRegistrations');
    observerRegSheet.appendRow(['id', 'meetingId', 'coordinatorName', 'agency', 'phone', 'email', 'lineId', 'observerNamesJson', 'observerCount', 'timestamp']);
    observerRegSheet.getRange("A1:J1").setFontWeight("bold").setBackground("#E8F0FE");
    result.push("✅ สร้าง Sheet 'ObserverRegistrations' สำเร็จ");
  } else {
    ensureObserverRegistrationsSheetColumns_(observerRegSheet);
    result.push("ℹ️ Sheet 'ObserverRegistrations' มีอยู่แล้ว");
  }

  // สร้าง Sheet Users
  var usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) {
    usersSheet = ss.insertSheet('Users');
    usersSheet.appendRow(['id', 'name', 'role', 'pinHash', 'pinPlain']);
    usersSheet.getRange("A1:E1").setFontWeight("bold").setBackground("#E8F0FE");
    var defaultUsers = [
      ['U1', 'Admin', 'admin', sha256Hex_('140433'), '140433'],
      ['U2', 'Secretary', 'secretary', sha256Hex_('1669'), '1669'],
      ['U3', 'Coordinator', 'coordinator', sha256Hex_('1990'), '1990']
    ];
    usersSheet.getRange(2, 1, defaultUsers.length, 5).setValues(defaultUsers);
    result.push("✅ สร้าง Sheet 'Users' สำเร็จ");
  } else {
    ensureUsersSheetColumns_(usersSheet);
    if (usersSheet.getLastRow() < 2) {
      var seededUsers = [
        ['U1', 'Admin', 'admin', sha256Hex_('140433'), '140433'],
        ['U2', 'Secretary', 'secretary', sha256Hex_('1669'), '1669'],
        ['U3', 'Coordinator', 'coordinator', sha256Hex_('1990'), '1990']
      ];
      usersSheet.getRange(2, 1, seededUsers.length, 5).setValues(seededUsers);
      result.push("✅ เติมข้อมูลเริ่มต้นใน Sheet 'Users' สำเร็จ");
    }
    result.push("ℹ️ Sheet 'Users' มีอยู่แล้ว");
  }
  
  // ตั้งค่าสิทธิ์ให้ทุกคนสามารถเข้าถึงได้ (สำหรับ Web App)
  var url = ss.getUrl();
  result.push("");
  result.push("📋 สรุปการตั้งค่า:");
  result.push("• Spreadsheet URL: " + url);
  result.push("• จำนวน Sheets: " + ss.getSheets().length);
  result.push("");
  result.push("🚀 ขั้นตอนถัดไป:");
  result.push("1. ไปที่เมนู Deploy > New deployment");
  result.push("2. เลือก Type: Web app");
  result.push("3. ตั้งค่า Execute as: Me");
  result.push("4. ตั้งค่า Who has access: Anyone");
  result.push("5. กด Deploy และคัดลอก Web App URL");
  
  Logger.log(result.join("\n"));
  return result.join("\n");
}

// ฟังก์ชันหลักเมื่อมีการเรียกใช้งาน Web App
function doGet(e) {
  var action = String((e && e.parameter && e.parameter.action) || '').trim();
  if (action) {
    try {
      var payloadRaw = (e && e.parameter && e.parameter.payload) || '[]';
      var args = [];

      try {
        args = JSON.parse(payloadRaw);
        if (!Array.isArray(args)) args = [args];
      } catch (parseErr) {
        return createJsonResponse_({ success: false, error: 'Invalid payload JSON' });
      }

      var result = dispatchApiAction_(action, args);
      return createJsonResponse_({ success: true, data: result });
    } catch (err) {
      return createJsonResponse_({ success: false, error: err.toString() });
    }
  }

  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ระบบตอบรับการประชุม - สพฉ.')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// API endpoint สำหรับเรียกจากเว็บที่ host ภายนอก (เช่น Vercel)
function doPost(e) {
  try {
    var action = String((e && e.parameter && e.parameter.action) || '').trim();
    var payloadRaw = (e && e.parameter && e.parameter.payload) || '[]';
    var args = [];

    try {
      args = JSON.parse(payloadRaw);
      if (!Array.isArray(args)) args = [args];
    } catch (parseErr) {
      return createJsonResponse_({ success: false, error: 'Invalid payload JSON' });
    }

    if (!action) {
      return createJsonResponse_({ success: false, error: 'Missing action' });
    }

    var result = dispatchApiAction_(action, args);
    return createJsonResponse_({ success: true, data: result });
  } catch (err) {
    return createJsonResponse_({ success: false, error: err.toString() });
  }
}

// ==========================================
// ฟังก์ชันช่วยเหลือ: SHA-256 Hex (สำหรับ seed Users)
// ==========================================
function sha256Hex_(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes.map(function(b) {
    var hex = (b < 0 ? b + 256 : b).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function createJsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function dispatchApiAction_(action, args) {
  var allowed = {
    ping: ping,
    getInitialData: getInitialData,
    saveMeetingToServer: saveMeetingToServer,
    deleteMeetingFromServer: deleteMeetingFromServer,
    saveAttendeesToServer: saveAttendeesToServer,
    saveResponseToServer: saveResponseToServer,
    deleteResponseFromServer: deleteResponseFromServer,
    uploadPdfToDrive: uploadPdfToDrive,
    uploadMeetingAgendaToDrive: uploadMeetingAgendaToDrive,
    saveMeetingAgendaToServer: saveMeetingAgendaToServer,
    uploadMeetingReportToDrive: uploadMeetingReportToDrive,
    saveMeetingReportToServer: saveMeetingReportToServer,
    setMeetingActiveStatus: setMeetingActiveStatus,
    saveUserToServer: saveUserToServer,
    deleteUserFromServer: deleteUserFromServer,
    saveObserverRegistrationToServer: saveObserverRegistrationToServer,
    deleteObserverRegistrationFromServer: deleteObserverRegistrationFromServer
  };

  // action ที่เขียนข้อมูลลง Sheet ต้องล็อกกันเขียนชนกัน (เช่น saveAttendeesToServer ที่ clear ทั้ง sheet แล้วเขียนใหม่)
  var mutating = {
    saveMeetingToServer: true,
    deleteMeetingFromServer: true,
    saveAttendeesToServer: true,
    saveResponseToServer: true,
    deleteResponseFromServer: true,
    saveMeetingAgendaToServer: true,
    saveMeetingReportToServer: true,
    setMeetingActiveStatus: true,
    saveUserToServer: true,
    deleteUserFromServer: true,
    saveObserverRegistrationToServer: true,
    deleteObserverRegistrationFromServer: true
  };

  var fn = allowed[action];
  if (!fn) {
    throw new Error('Unsupported action: ' + action);
  }

  if (mutating[action]) {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      return fn.apply(null, args || []);
    } finally {
      lock.releaseLock();
    }
  }

  return fn.apply(null, args || []);
}

function ping() {
  return {
    ok: true,
    app: 'NIEM RSVP System',
    timestamp: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss')
  };
}

// ==========================================
// ส่วนจัดการฐานข้อมูล (Google Sheets)
// ==========================================

// Memoize spreadsheet ต่อ 1 execution — SpreadsheetApp.getActiveSpreadsheet() มีค่าใช้จ่ายสูงถ้าเรียกซ้ำ
var cachedSpreadsheet_ = null;
function getSpreadsheet_() {
  if (!cachedSpreadsheet_) {
    cachedSpreadsheet_ = SpreadsheetApp.getActiveSpreadsheet();
  }
  return cachedSpreadsheet_;
}

// ฟังก์ชันช่วยเหลือ: ดึงแผ่นงาน หรือ สร้างใหม่ถ้ายังไม่มี
function getOrCreateSheet(sheetName) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  var justCreated = false;

  if (!sheet) {
    justCreated = true;
    sheet = ss.insertSheet(sheetName);
    // ตั้งค่า Header สำหรับแผ่นงานที่สร้างใหม่
    if (sheetName === 'Meetings') {
      sheet.appendRow(['id', 'topic', 'date', 'time', 'location', 'onlineLink', 'agendaUrl', 'agendaName', 'agendaFileId', 'hybridEnabled', 'uploadRoles', 'isActive', 'reportUrl', 'reportName', 'reportFileId', 'eventType', 'observerQuota']);
      sheet.getRange("A1:Q1").setFontWeight("bold").setBackground("#E8F0FE");
    } else if (sheetName === 'Attendees') {
      sheet.appendRow(['mtgId', 'name', 'pdfUrl', 'pdfName', 'fileId', 'token', 'email']);
      sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#E8F0FE");
    } else if (sheetName === 'Users') {
      sheet.appendRow(['id', 'name', 'role', 'pinHash', 'pinPlain']);
      sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#E8F0FE");
      var defaultUsers = [
        ['U1', 'Admin', 'admin', sha256Hex_('140433'), '140433'],
        ['U2', 'Secretary', 'secretary', sha256Hex_('1669'), '1669'],
        ['U3', 'Coordinator', 'coordinator', sha256Hex_('1990'), '1990']
      ];
      sheet.getRange(2, 1, defaultUsers.length, 5).setValues(defaultUsers);
    } else if (sheetName === 'Responses') {
      sheet.appendRow(['id', 'meetingId', 'topic', 'date', 'time', 'location', 'name', 'status', 'attendanceMode', 'reason', 'timestamp', 'email']);
      sheet.getRange("A1:L1").setFontWeight("bold").setBackground("#E8F0FE");
    } else if (sheetName === 'ObserverRegistrations') {
      sheet.appendRow(['id', 'meetingId', 'coordinatorName', 'agency', 'phone', 'email', 'lineId', 'observerNamesJson', 'observerCount', 'timestamp']);
      sheet.getRange("A1:J1").setFontWeight("bold").setBackground("#E8F0FE");
    }
  }

  // ตรวจ/ซ่อมโครงสร้างคอลัมน์เฉพาะตอนสร้างชีตใหม่ หรือทุกๆ 6 ชั่วโมง
  // (เดิมเขียนจัดรูปแบบหัวตารางใหม่ทุก request ทำให้โหลดข้อมูลช้ามาก)
  var schemaCacheKey = 'schema_ok_' + sheetName;
  var scriptCache = CacheService.getScriptCache();
  if (justCreated || !scriptCache.get(schemaCacheKey)) {
    if (sheetName === 'Meetings') ensureMeetingsSheetColumns_(sheet);
    if (sheetName === 'Attendees') ensureAttendeesSheetColumns_(sheet);
    if (sheetName === 'Responses') ensureResponsesSheetColumns_(sheet);
    if (sheetName === 'Users') ensureUsersSheetColumns_(sheet);
    if (sheetName === 'ObserverRegistrations') ensureObserverRegistrationsSheetColumns_(sheet);
    try { scriptCache.put(schemaCacheKey, '1', 21600); } catch (e) {}
  }

  return sheet;
}

function ensureUsersSheetColumns_(sheet) {
  var headers = sheet.getRange(1, 1, 1, Math.max(5, sheet.getLastColumn())).getValues()[0];
  var required = ['id', 'name', 'role', 'pinHash', 'pinPlain'];
  for (var i = 0; i < required.length; i++) {
    if (String(headers[i] || '').trim() !== required[i]) {
      sheet.getRange(1, i + 1).setValue(required[i]);
    }
  }
  sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#E8F0FE");
}

function ensureAttendeesSheetColumns_(sheet) {
  var headers = sheet.getRange(1, 1, 1, Math.max(7, sheet.getLastColumn())).getValues()[0];
  var required = ['mtgId', 'name', 'pdfUrl', 'pdfName', 'fileId', 'token', 'email'];
  for (var i = 0; i < required.length; i++) {
    if (String(headers[i] || '').trim() !== required[i]) {
      sheet.getRange(1, i + 1).setValue(required[i]);
    }
  }
  sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#E8F0FE");
}

function ensureMeetingsSheetColumns_(sheet) {
  var headers = sheet.getRange(1, 1, 1, Math.max(17, sheet.getLastColumn())).getValues()[0];
  var required = ['id', 'topic', 'date', 'time', 'location', 'onlineLink', 'agendaUrl', 'agendaName', 'agendaFileId', 'hybridEnabled', 'uploadRoles', 'isActive', 'reportUrl', 'reportName', 'reportFileId', 'eventType', 'observerQuota'];

  for (var i = 0; i < required.length; i++) {
    if (String(headers[i] || '').trim() !== required[i]) {
      sheet.getRange(1, i + 1).setValue(required[i]);
    }
  }
  sheet.getRange("A1:Q1").setFontWeight("bold").setBackground("#E8F0FE");
}

function ensureObserverRegistrationsSheetColumns_(sheet) {
  var headers = sheet.getRange(1, 1, 1, Math.max(10, sheet.getLastColumn())).getValues()[0];
  var required = ['id', 'meetingId', 'coordinatorName', 'agency', 'phone', 'email', 'lineId', 'observerNamesJson', 'observerCount', 'timestamp'];

  for (var i = 0; i < required.length; i++) {
    if (String(headers[i] || '').trim() !== required[i]) {
      sheet.getRange(1, i + 1).setValue(required[i]);
    }
  }
  sheet.getRange("A1:J1").setFontWeight("bold").setBackground("#E8F0FE");
}

// ประเภทงาน: 'meeting' (ประชุม/อบรม), 'speaker' (เชิญเป็นวิทยากร) หรือ 'observer' (เชิญเป็นผู้สังเกตการณ์)
function normalizeEventType_(value) {
  var v = String(value || '').trim().toLowerCase();
  if (v === 'speaker') return 'speaker';
  if (v === 'observer') return 'observer';
  return 'meeting';
}

function ensureResponsesSheetColumns_(sheet) {
  var headers = sheet.getRange(1, 1, 1, Math.max(12, sheet.getLastColumn())).getValues()[0];
  var required = ['id', 'meetingId', 'topic', 'date', 'time', 'location', 'name', 'status', 'attendanceMode', 'reason', 'timestamp', 'email'];

  for (var i = 0; i < required.length; i++) {
    if (String(headers[i] || '').trim() !== required[i]) {
      sheet.getRange(1, i + 1).setValue(required[i]);
    }
  }
  sheet.getRange("A1:L1").setFontWeight("bold").setBackground("#E8F0FE");
  // บังคับคอลัมน์ date (D), time (E), timestamp (K) เป็น Plain text
  // กัน Sheets แปลง "08:00" เป็นชนิดเวลา (Date ฐานปี 1899) เวลาบันทึกการตอบรับใหม่
  sheet.getRange("D:E").setNumberFormat("@");
  sheet.getRange("K:K").setNumberFormat("@");
}

function formatDateCell_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'Asia/Bangkok', 'yyyy-MM-dd');
  }
  var txt = String(value).trim();
  if (!txt) return '';
  var parsed = new Date(txt);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, 'Asia/Bangkok', 'yyyy-MM-dd');
  }
  return txt;
}

function formatTimeCell_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'Asia/Bangkok', 'HH:mm');
  }
  var txt = String(value).trim();
  if (!txt) return '';

  var match = txt.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    var hh = ('0' + parseInt(match[1], 10)).slice(-2);
    return hh + ':' + match[2];
  }

  var parsed = new Date(txt);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, 'Asia/Bangkok', 'HH:mm');
  }
  return txt;
}

// สำหรับคอลัมน์ timestamp ของ Responses — ถ้า Sheets แปลงเป็น Date ให้คืนรูปแบบ dd/MM/yyyy HH:mm:ss เหมือนตอนบันทึก
function formatTimestampCell_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
  }
  return String(value).trim();
}

// สำหรับคอลัมน์ date ของ Responses ที่เก็บเป็นข้อความแสดงผล (เช่น "23 ก.ค. 2569")
// ถ้า Sheets แปลงเป็น Date ให้คืนรูปแบบ dd/MM/yyyy แทนข้อความ Date ยาวๆ ภาษาอังกฤษ
function formatResponseDateCell_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'Asia/Bangkok', 'dd/MM/yyyy');
  }
  return String(value).trim();
}

function toBoolean_(value) {
  if (value === true || value === 'true' || value === 'TRUE' || value === 1 || value === '1') return true;
  return false;
}

function toBooleanDefaultTrue_(value) {
  if (value === '' || value === null || typeof value === 'undefined') return true;
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;

  var txt = String(value).trim().toLowerCase();
  if (txt === '') return true;
  if (txt === 'true' || txt === '1' || txt === 'yes' || txt === 'active') return true;
  if (txt === 'false' || txt === '0' || txt === 'no' || txt === 'inactive') return false;
  return true;
}

// Cache ข้อมูลทั้งหมดของ getInitialData เพื่อให้เปิดหน้าเว็บ/refresh เร็วขึ้น
// ถูกล้างทันทีทุกครั้งที่มีการเขียนข้อมูล (invalidateDbCache_) จึงไม่เห็นข้อมูลเก่าหลังบันทึก
var DB_CACHE_KEY = 'initial_data_v1';
var DB_CACHE_TTL_SECONDS = 120;

function invalidateDbCache_() {
  try {
    CacheService.getScriptCache().remove(DB_CACHE_KEY);
  } catch (e) {}
}

// 1. โหลดข้อมูลทั้งหมดเมื่อเปิดหน้าเว็บ (Initialization)
function getInitialData() {
  var scriptCache = CacheService.getScriptCache();
  try {
    var cachedDb = scriptCache.get(DB_CACHE_KEY);
    if (cachedDb) return JSON.parse(cachedDb);
  } catch (e) {}

  var meetingsSheet = getOrCreateSheet('Meetings');
  var attendeesSheet = getOrCreateSheet('Attendees');
  var responsesSheet = getOrCreateSheet('Responses');
  var usersSheet = getOrCreateSheet('Users');
  var observerRegSheet = getOrCreateSheet('ObserverRegistrations');

  var db = { meetings: [], attendees: {}, responses: [], users: [], observerRegistrations: [] };
  
  // โหลด Meetings
  var mData = meetingsSheet.getDataRange().getValues();
  for (var i = 1; i < mData.length; i++) {
    if (!mData[i][0]) continue;
    db.meetings.push({
      id: String(mData[i][0] || ""),
      topic: String(mData[i][1] || ""),
      date: formatDateCell_(mData[i][2]),
      time: formatTimeCell_(mData[i][3]),
      location: String(mData[i][4] || ""),
      onlineLink: String(mData[i][5] || ""),
      agendaUrl: String(mData[i][6] || ""),
      agendaName: String(mData[i][7] || ""),
      agendaFileId: String(mData[i][8] || ""),
      hybridEnabled: toBoolean_(mData[i][9]),
      uploadRoles: String(mData[i][10] || "admin"),
      isActive: mData[i].length < 12 ? true : toBooleanDefaultTrue_(mData[i][11]),
      reportUrl: String(mData[i][12] || ""),
      reportName: String(mData[i][13] || ""),
      reportFileId: String(mData[i][14] || ""),
      eventType: normalizeEventType_(mData[i][15]),
      observerQuota: parseInt(mData[i][16], 10) || 0
    });
  }
  
  // โหลด Attendees
  var aData = attendeesSheet.getDataRange().getValues();
  for (var i = 1; i < aData.length; i++) {
    if (!aData[i][0]) continue;
    var mtgId = String(aData[i][0]);
    if (!db.attendees[mtgId]) db.attendees[mtgId] = [];
    db.attendees[mtgId].push({
      name: String(aData[i][1] || ""),
      pdfUrl: String(aData[i][2] || ""),
      pdfName: String(aData[i][3] || ""),
      fileId: String(aData[i][4] || ""),
      token: String(aData[i][5] || ""),
      email: String(aData[i][6] || "")
    });
  }
  
  // โหลด Responses (ประวัติ)
  var rData = responsesSheet.getDataRange().getValues();
  for (var i = 1; i < rData.length; i++) {
    if (!rData[i][0]) continue;
    db.responses.push({
      id: String(rData[i][0] || ""),
      meetingId: String(rData[i][1] || ""),
      topic: String(rData[i][2] || ""),
      date: formatResponseDateCell_(rData[i][3]),
      time: formatTimeCell_(rData[i][4]),
      location: String(rData[i][5] || ""),
      name: String(rData[i][6] || ""),
      status: String(rData[i][7] || ""),
      attendanceMode: String(rData[i][8] || ""),
      reason: String(rData[i][9] || ""),
      timestamp: formatTimestampCell_(rData[i][10]),
      email: String(rData[i][11] || "")
    });
  }

  // โหลด Users
  var uData = usersSheet.getDataRange().getValues();
  for (var i = 1; i < uData.length; i++) {
    if (!uData[i][0]) continue;
    db.users.push({
      id: String(uData[i][0] || ""),
      name: String(uData[i][1] || ""),
      role: String(uData[i][2] || ""),
      pinHash: String(uData[i][3] || ""),
      pinPlain: String(uData[i][4] || "")
    });
  }

  // โหลด ObserverRegistrations (ลงทะเบียนผู้สังเกตการณ์แบบกรอกเอง)
  var oData = observerRegSheet.getDataRange().getValues();
  for (var i = 1; i < oData.length; i++) {
    if (!oData[i][0]) continue;
    var observerNames = [];
    try {
      observerNames = JSON.parse(oData[i][7] || '[]');
      if (!Array.isArray(observerNames)) observerNames = [];
    } catch (e) {
      observerNames = [];
    }
    db.observerRegistrations.push({
      id: String(oData[i][0] || ""),
      meetingId: String(oData[i][1] || ""),
      coordinatorName: String(oData[i][2] || ""),
      agency: String(oData[i][3] || ""),
      phone: String(oData[i][4] || ""),
      email: String(oData[i][5] || ""),
      lineId: String(oData[i][6] || ""),
      observerNames: observerNames,
      observerCount: parseInt(oData[i][8], 10) || observerNames.length,
      timestamp: formatTimestampCell_(oData[i][9])
    });
  }

  // CacheService จำกัด 100KB ต่อ key — ถ้าข้อมูลใหญ่เกินให้ข้าม cache ไป (ระบบยังทำงานปกติ)
  try {
    scriptCache.put(DB_CACHE_KEY, JSON.stringify(db), DB_CACHE_TTL_SECONDS);
  } catch (e) {}

  return db;
}

// 2. บันทึก / แก้ไข การประชุม

// 6. Save / Update User
function saveUserToServer(user) {
  var allowedRoles = ['admin', 'secretary', 'coordinator'];
  user.id = String(user.id || "").trim();
  user.name = String(user.name || "").trim();
  user.role = String(user.role || "").trim().toLowerCase();
  user.pinHash = String(user.pinHash || "").trim();
  user.pinPlain = String(user.pinPlain || "").trim();

  if (!user.id) throw new Error('User id is required');
  if (!user.name) throw new Error('User name is required');
  if (allowedRoles.indexOf(user.role) < 0) throw new Error('Invalid role: ' + user.role);
  if (!user.pinHash || user.pinHash.length !== 64) throw new Error('Invalid pinHash');
  if (user.pinPlain && !/^[0-9]{4,10}$/.test(user.pinPlain)) throw new Error('Invalid pinPlain');

  var sheet = getOrCreateSheet('Users');
  var data = sheet.getDataRange().getValues();
  var updated = false;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === user.id) {
      sheet.getRange(i + 1, 2, 1, 4).setValues([[user.name, user.role, user.pinHash, user.pinPlain]]);
      updated = true;
      break;
    }
  }

  if (!updated) {
    sheet.appendRow([user.id, user.name, user.role, user.pinHash, user.pinPlain]);
  }
  invalidateDbCache_();
  return true;
}

// 7. Delete User
function deleteUserFromServer(id) {
  var targetId = String(id || '').trim();
  if (!targetId) return false;

  var sheet = getOrCreateSheet('Users');
  var data = sheet.getDataRange().getValues();

  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0] || '').trim() === targetId) {
      sheet.deleteRow(i + 1);
      invalidateDbCache_();
      return true;
    }
  }
  return false;
}

function saveMeetingToServer(meeting) {
  //  sanitize inputs
  meeting.topic = String(meeting.topic || "").trim();
  meeting.date = String(meeting.date || "").trim();
  meeting.time = String(meeting.time || "").trim();
  meeting.location = String(meeting.location || "").trim();
  meeting.onlineLink = String(meeting.onlineLink || "").trim();
  meeting.agendaUrl = String(meeting.agendaUrl || "").trim();
  meeting.agendaName = String(meeting.agendaName || "").trim();
  meeting.agendaFileId = String(meeting.agendaFileId || "").trim();
  meeting.hybridEnabled = !!meeting.hybridEnabled;
  meeting.uploadRoles = String(meeting.uploadRoles || "admin").trim();
  meeting.isActive = meeting.isActive !== false;
  meeting.eventType = normalizeEventType_(meeting.eventType);
  meeting.observerQuota = parseInt(meeting.observerQuota, 10) || 0;

  var sheet = getOrCreateSheet('Meetings');
  var data = sheet.getDataRange().getValues();
  var updated = false;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString() === meeting.id) {
      sheet.getRange(i + 1, 2, 1, 11).setValues([[meeting.topic, meeting.date, meeting.time, meeting.location, meeting.onlineLink, meeting.agendaUrl, meeting.agendaName, meeting.agendaFileId, meeting.hybridEnabled, meeting.uploadRoles, meeting.isActive]]);
      sheet.getRange(i + 1, 16, 1, 2).setValues([[meeting.eventType, meeting.observerQuota]]);
      updated = true;
      break;
    }
  }

  if (!updated) {
    sheet.appendRow([meeting.id, meeting.topic, meeting.date, meeting.time, meeting.location, meeting.onlineLink, meeting.agendaUrl, meeting.agendaName, meeting.agendaFileId, meeting.hybridEnabled, meeting.uploadRoles, meeting.isActive, '', '', '', meeting.eventType, meeting.observerQuota]);
  }
  invalidateDbCache_();
  return true;
}

function setMeetingActiveStatus(meetingId, isActive) {
  var sheet = getOrCreateSheet('Meetings');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '') === String(meetingId)) {
      sheet.getRange(i + 1, 12).setValue(!!isActive);
      invalidateDbCache_();
      return true;
    }
  }

  return false;
}

// 2.1 บันทึกเฉพาะไฟล์วาระประชุม (กันข้อมูลวาระหายจากการ overwrite ทั้งแถว)
function saveMeetingAgendaToServer(meetingId, agendaUrl, agendaName, agendaFileId) {
  var sheet = getOrCreateSheet('Meetings');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString() === String(meetingId)) {
      sheet.getRange(i + 1, 7, 1, 3).setValues([[
        String(agendaUrl || '').trim(),
        String(agendaName || '').trim(),
        String(agendaFileId || '').trim()
      ]]);
      invalidateDbCache_();
      return true;
    }
  }

  return false;
}

// 2.2 บันทึกเฉพาะไฟล์รายงานการประชุม (กันข้อมูลรายงานหายจากการ overwrite ทั้งแถว)
function saveMeetingReportToServer(meetingId, reportUrl, reportName, reportFileId) {
  var sheet = getOrCreateSheet('Meetings');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString() === String(meetingId)) {
      sheet.getRange(i + 1, 13, 1, 3).setValues([[
        String(reportUrl || '').trim(),
        String(reportName || '').trim(),
        String(reportFileId || '').trim()
      ]]);
      invalidateDbCache_();
      return true;
    }
  }

  return false;
}

// ย้ายไฟล์ใน Drive ลงถังขยะแบบไม่ให้ error ขัดจังหวะการลบข้อมูล
function trashDriveFileQuietly_(fileId) {
  var id = String(fileId || '').trim();
  if (!id) return;
  try {
    DriveApp.getFileById(id).setTrashed(true);
  } catch (e) {
    // ไฟล์อาจถูกลบไปแล้ว หรือไม่มีสิทธิ์ — ไม่ต้องแจ้ง error
  }
}

// 3. ลบการประชุม (รวมถึงรายชื่อ ประวัติการตอบรับ และไฟล์ใน Drive ที่เกี่ยวข้อง)
function deleteMeetingFromServer(id) {
  var mSheet = getOrCreateSheet('Meetings');
  var mData = mSheet.getDataRange().getValues();
  for (var i = mData.length - 1; i >= 1; i--) {
    if (mData[i][0] && mData[i][0].toString() === id) {
      // ลบไฟล์วาระ (คอลัมน์ 9) และรายงาน (คอลัมน์ 15) ที่แนบกับการประชุมนี้
      trashDriveFileQuietly_(mData[i][8]);
      trashDriveFileQuietly_(mData[i][14]);
      mSheet.deleteRow(i + 1);
      break;
    }
  }

  var aSheet = getOrCreateSheet('Attendees');
  var aData = aSheet.getDataRange().getValues();
  for (var i = aData.length - 1; i >= 1; i--) {
    if (aData[i][0] && aData[i][0].toString() === id) {
      // ลบไฟล์หนังสือเชิญรายบุคคล (คอลัมน์ 5) ก่อนลบแถว
      trashDriveFileQuietly_(aData[i][4]);
      aSheet.deleteRow(i + 1);
    }
  }

  // ลบประวัติการตอบรับที่เกี่ยวข้องด้วย
  var rSheet = getOrCreateSheet('Responses');
  var rData = rSheet.getDataRange().getValues();
  for (var i = rData.length - 1; i >= 1; i--) {
    if (rData[i][1] && rData[i][1].toString() === id) { rSheet.deleteRow(i + 1); }
  }

  // ลบการลงทะเบียนผู้สังเกตการณ์ที่เกี่ยวข้องด้วย
  var oSheet = getOrCreateSheet('ObserverRegistrations');
  var oData = oSheet.getDataRange().getValues();
  for (var i = oData.length - 1; i >= 1; i--) {
    if (oData[i][1] && oData[i][1].toString() === id) { oSheet.deleteRow(i + 1); }
  }

  invalidateDbCache_();
  return true;
}

// 4. บันทึกรายชื่อผู้เข้าร่วมทั้งหมดของการประชุมนั้นๆ แบบ Replace
function saveAttendeesToServer(mtgId, attendeesArray) {
  var targetMeetingId = String(mtgId || '').trim();
  if (!targetMeetingId) {
    throw new Error('Meeting id is required');
  }

  var safeAttendees = Array.isArray(attendeesArray) ? attendeesArray : [];
  var sheet = getOrCreateSheet('Attendees');
  var data = sheet.getDataRange().getValues();
  var rowsToKeep = [];

  for (var i = 1; i < data.length; i++) {
    var rowMeetingId = String(data[i][0] || '').trim();
    if (!rowMeetingId || rowMeetingId === targetMeetingId) {
      continue;
    }

    rowsToKeep.push([
      rowMeetingId,
      String(data[i][1] || '').trim(),
      String(data[i][2] || ''),
      String(data[i][3] || ''),
      String(data[i][4] || ''),
      String(data[i][5] || ''),
      String(data[i][6] || '')
    ]);
  }

  var rowsForTargetMeeting = [];
  safeAttendees.forEach(function(user) {
    if (!user) return;

    var attendeeName = String(user.name || '').trim();
    if (!attendeeName) return;

    rowsForTargetMeeting.push([
      targetMeetingId,
      attendeeName,
      String(user.pdfUrl || ''),
      String(user.pdfName || ''),
      String(user.fileId || ''),
      String(user.token || ''),
      String(user.email || '').trim()
    ]);
  });

  var finalRows = [['mtgId', 'name', 'pdfUrl', 'pdfName', 'fileId', 'token', 'email']].concat(rowsToKeep, rowsForTargetMeeting);
  sheet.clearContents();
  sheet.getRange(1, 1, finalRows.length, 7).setValues(finalRows);
  sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#E8F0FE");
  invalidateDbCache_();
  return true;
}

// 4.1 นับจำนวนผู้สังเกตการณ์ที่ลงทะเบียนแล้วทั้งหมดของการประชุมหนึ่งๆ (รวมทุกผู้ประสานงาน)
function getObserverRegisteredCount_(meetingId, sheet) {
  var targetMeetingId = String(meetingId || '').trim();
  var oSheet = sheet || getOrCreateSheet('ObserverRegistrations');
  var data = oSheet.getDataRange().getValues();
  var total = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1] || '').trim() === targetMeetingId) {
      total += parseInt(data[i][8], 10) || 0;
    }
  }
  return total;
}

// 4.2 ลงทะเบียนผู้สังเกตการณ์แบบกรอกเอง (ผู้ประสานงาน + รายชื่อผู้เข้าร่วมหลายคน)
function saveObserverRegistrationToServer(payload) {
  payload = payload || {};

  var meetingId = String(payload.meetingId || '').trim();
  if (!meetingId) throw new Error('กรุณาเลือกหลักสูตร/กิจกรรมที่ต้องการเข้าร่วมสังเกตการณ์');

  var mSheet = getOrCreateSheet('Meetings');
  var mData = mSheet.getDataRange().getValues();
  var meetingRow = null;
  for (var i = 1; i < mData.length; i++) {
    if (String(mData[i][0] || '').trim() === meetingId) { meetingRow = mData[i]; break; }
  }
  if (!meetingRow) throw new Error('ไม่พบหลักสูตร/กิจกรรมที่เลือก');
  if (normalizeEventType_(meetingRow[15]) !== 'observer') throw new Error('รายการนี้ไม่ได้เปิดรับผู้สังเกตการณ์');
  if (!toBooleanDefaultTrue_(meetingRow[11])) throw new Error('หลักสูตร/กิจกรรมนี้ปิดรับลงทะเบียนแล้ว');

  var coordinatorName = String(payload.coordinatorName || '').trim();
  var agency = String(payload.agency || '').trim();
  var phone = String(payload.phone || '').trim();
  var email = String(payload.email || '').trim();
  var lineId = String(payload.lineId || '').trim();

  if (!coordinatorName) throw new Error('กรุณากรอกชื่อ-นามสกุลผู้ประสานงาน');
  if (!agency) throw new Error('กรุณากรอกหน่วยงาน');
  if (!phone) throw new Error('กรุณากรอกเบอร์โทรศัพท์ผู้ประสานงาน');

  var rawNames = Array.isArray(payload.observerNames) ? payload.observerNames : [];
  var observerNames = [];
  rawNames.forEach(function(entry) {
    var name = String((entry && entry.name) || '').trim();
    if (!name) return;
    observerNames.push({
      name: name,
      position: String((entry && entry.position) || '').trim()
    });
  });
  if (observerNames.length === 0) throw new Error('กรุณาเพิ่มรายชื่อผู้ที่จะเข้าร่วมสังเกตการณ์อย่างน้อย 1 คน');

  var oSheet = getOrCreateSheet('ObserverRegistrations');
  var quota = parseInt(meetingRow[16], 10) || 0;
  if (quota > 0) {
    var registered = getObserverRegisteredCount_(meetingId, oSheet);
    var remaining = quota - registered;
    if (observerNames.length > remaining) {
      if (remaining <= 0) throw new Error('ขออภัย จำนวนผู้สังเกตการณ์เต็มแล้ว');
      throw new Error('เกินจำนวนที่รับได้ เหลือที่ว่างอีก ' + remaining + ' ที่');
    }
  }

  var id = String(payload.id || '').trim() || ('OBS' + Date.now().toString() + Math.floor(Math.random() * 9000 + 1000));
  var timestamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');

  oSheet.appendRow([
    id,
    meetingId,
    coordinatorName,
    agency,
    phone,
    email,
    lineId,
    JSON.stringify(observerNames),
    observerNames.length,
    timestamp
  ]);
  invalidateDbCache_();

  var emailSent = false;
  if (isValidEmail_(email)) {
    emailSent = sendObserverRegistrationConfirmationEmail_({
      id: id,
      coordinatorName: coordinatorName,
      agency: agency,
      phone: phone,
      email: email,
      observerNames: observerNames,
      timestamp: timestamp,
      topic: String(meetingRow[1] || ''),
      date: String(meetingRow[2] || ''),
      time: String(meetingRow[3] || ''),
      location: String(meetingRow[4] || '')
    });
  }

  return {
    id: id,
    meetingId: meetingId,
    coordinatorName: coordinatorName,
    agency: agency,
    phone: phone,
    email: email,
    lineId: lineId,
    observerNames: observerNames,
    observerCount: observerNames.length,
    timestamp: timestamp,
    emailSent: emailSent
  };
}

// ส่งอีเมลยืนยันการลงทะเบียนผู้สังเกตการณ์ (ล้มเหลวได้โดยไม่กระทบการบันทึกข้อมูล)
function sendObserverRegistrationConfirmationEmail_(reg) {
  try {
    if (!isValidEmail_(reg.email)) return false;

    var namesRows = reg.observerNames.map(function(o, idx) {
      var posText = o.position ? ' (' + escapeHtml_(o.position) + ')' : '';
      return '<li>' + escapeHtml_(o.name) + posText + '</li>';
    }).join('');

    var subject = '[สพฉ.] ยืนยันการลงทะเบียนผู้สังเกตการณ์: ' + reg.topic;

    var detailRows = ''
      + emailDetailRow_('เรื่อง / หัวข้อ', escapeHtml_(reg.topic))
      + emailDetailRow_('วันที่', escapeHtml_(reg.date))
      + emailDetailRow_('เวลา', reg.time ? escapeHtml_(reg.time) + ' น.' : '-')
      + emailDetailRow_('สถานที่', escapeHtml_(reg.location || '-'))
      + emailDetailRow_('ผู้ประสานงาน', escapeHtml_(reg.coordinatorName))
      + emailDetailRow_('หน่วยงาน', escapeHtml_(reg.agency))
      + emailDetailRow_('เบอร์โทร', escapeHtml_(reg.phone))
      + emailDetailRow_('เลขที่อ้างอิง', escapeHtml_(reg.id))
      + emailDetailRow_('บันทึกเมื่อ', escapeHtml_(reg.timestamp));

    var htmlBody = ''
      + '<div style="font-family: Tahoma, Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #E5E5EA; border-radius: 12px; overflow: hidden;">'
      + '  <div style="background: #1D1D1F; color: #EDFF21; padding: 18px 24px;">'
      + '    <p style="margin: 0; font-size: 16px; font-weight: bold;">สถาบันการแพทย์ฉุกเฉินแห่งชาติ (สพฉ.)</p>'
      + '    <p style="margin: 4px 0 0; font-size: 12px; color: #FFFFFF;">ระบบตอบรับผู้สังเกตการณ์</p>'
      + '  </div>'
      + '  <div style="padding: 24px;">'
      + '    <p style="font-size: 14px; margin: 0 0 8px;">เรียน คุณ' + escapeHtml_(reg.coordinatorName) + '</p>'
      + '    <p style="font-size: 14px; margin: 0 0 16px;">ระบบได้รับการลงทะเบียนผู้สังเกตการณ์ของท่านเรียบร้อยแล้ว จำนวน '
      + '      <b style="color: #0B7A2F;">' + reg.observerNames.length + ' คน</b></p>'
      + '    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">' + detailRows + '</table>'
      + '    <p style="font-size: 13px; font-weight: bold; margin: 16px 0 4px;">รายชื่อผู้เข้าร่วมสังเกตการณ์</p>'
      + '    <ul style="font-size: 13px; margin: 0; padding-left: 20px;">' + namesRows + '</ul>'
      + '    <p style="font-size: 12px; color: #666; margin: 16px 0 0;">หากข้อมูลไม่ถูกต้อง หรือต้องการแก้ไขการลงทะเบียน กรุณาติดต่อผู้จัดการประชุม</p>'
      + '  </div>'
      + '  <div style="background: #F5F5F7; padding: 12px 24px; font-size: 11px; color: #86868B;">'
      + '    อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ | National Institute for Emergency Medicine'
      + '  </div>'
      + '</div>';

    MailApp.sendEmail({
      to: reg.email,
      subject: subject,
      htmlBody: htmlBody,
      name: 'ระบบตอบรับการประชุม สพฉ.'
    });
    return true;
  } catch (e) {
    Logger.log('sendObserverRegistrationConfirmationEmail_ failed: ' + e);
    return false;
  }
}

// 4.3 ลบการลงทะเบียนผู้สังเกตการณ์ 1 รายการ (คืนที่ว่างให้โควตา)
function deleteObserverRegistrationFromServer(id) {
  var targetId = String(id || '').trim();
  if (!targetId) return false;

  var sheet = getOrCreateSheet('ObserverRegistrations');
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0] || '').trim() === targetId) {
      sheet.deleteRow(i + 1);
      invalidateDbCache_();
      return true;
    }
  }
  return false;
}

// 5. บันทึกการตอบรับ (พร้อมส่งอีเมลยืนยันอัตโนมัติหากมีอีเมล)
function saveResponseToServer(data) {
  // Sanitize inputs
  var sanitizedData = {
    id: String(data.id || "").trim(),
    meetingId: String(data.meetingId || "").trim(),
    topic: String(data.topic || "").trim(),
    date: String(data.date || "").trim(),
    time: String(data.time || "").trim(),
    location: String(data.location || "").trim(),
    name: String(data.name || "").trim(),
    status: String(data.status || "").trim(),
    attendanceMode: String(data.attendanceMode || "").trim(),
    reason: String(data.reason || "").trim(),
    timestamp: String(data.timestamp || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss')),
    email: String(data.email || "").trim(),
    onlineLink: String(data.onlineLink || "").trim(),
    eventType: normalizeEventType_(data.eventType)
  };

  // ถ้าฟอร์มไม่ได้ส่งอีเมลมา ให้ลองดึงจากทะเบียนรายชื่อ
  if (!isValidEmail_(sanitizedData.email)) {
    sanitizedData.email = getAttendeeEmail_(sanitizedData.meetingId, sanitizedData.name);
  }

  var sheet = getOrCreateSheet('Responses');
  var rows = sheet.getDataRange().getValues();
  var saved = false;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() === sanitizedData.id) {
      sheet.getRange(i + 1, 1, 1, 12).setValues([[
        sanitizedData.id,
        sanitizedData.meetingId,
        sanitizedData.topic,
        sanitizedData.date,
        sanitizedData.time,
        sanitizedData.location,
        sanitizedData.name,
        sanitizedData.status,
        sanitizedData.attendanceMode,
        sanitizedData.reason,
        sanitizedData.timestamp,
        sanitizedData.email
      ]]);
      saved = true;
      break;
    }
  }

  if (!saved) {
    sheet.appendRow([
      sanitizedData.id, sanitizedData.meetingId, sanitizedData.topic, sanitizedData.date, sanitizedData.time,
      sanitizedData.location, sanitizedData.name, sanitizedData.status, sanitizedData.attendanceMode, sanitizedData.reason,
      sanitizedData.timestamp, sanitizedData.email
    ]);
  }
  invalidateDbCache_();

  // อัปเดตอีเมลกลับไปยังทะเบียนรายชื่อ เพื่อใช้ prefill ครั้งถัดไป
  var emailSent = false;
  if (isValidEmail_(sanitizedData.email)) {
    updateAttendeeEmail_(sanitizedData.meetingId, sanitizedData.name, sanitizedData.email);
    emailSent = sendResponseConfirmationEmail_(sanitizedData);
  }

  return { saved: true, emailSent: emailSent };
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
}

// Escape ข้อความก่อนฝังลง HTML ของอีเมล กัน HTML injection จากข้อมูลที่ผู้ใช้กรอก
function escapeHtml_(value) {
  return String(value === null || typeof value === 'undefined' ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeHttpUrl_(url) {
  return /^https?:\/\//i.test(String(url || '').trim());
}

function getAttendeeEmail_(meetingId, name) {
  var sheet = getOrCreateSheet('Attendees');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === String(meetingId || '').trim()
      && String(data[i][1] || '').trim() === String(name || '').trim()) {
      var email = String(data[i][6] || '').trim();
      return isValidEmail_(email) ? email : '';
    }
  }
  return '';
}

function updateAttendeeEmail_(meetingId, name, email) {
  try {
    var sheet = getOrCreateSheet('Attendees');
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === String(meetingId || '').trim()
        && String(data[i][1] || '').trim() === String(name || '').trim()) {
        sheet.getRange(i + 1, 7).setValue(String(email || '').trim());
        invalidateDbCache_();
        return true;
      }
    }
  } catch (e) {
    Logger.log('updateAttendeeEmail_ failed: ' + e);
  }
  return false;
}

// ส่งอีเมลยืนยันการตอบรับ (ล้มเหลวได้โดยไม่กระทบการบันทึกข้อมูล)
function sendResponseConfirmationEmail_(resp) {
  try {
    if (!isValidEmail_(resp.email)) return false;

    var isAttend = resp.status === 'attend';
    var respEventType = normalizeEventType_(resp.eventType);
    var isSpeaker = respEventType === 'speaker';
    var isObserver = respEventType === 'observer';
    var statusText = isAttend
      ? (isSpeaker ? 'ยินดีรับเป็นวิทยากร' : (isObserver ? 'ยินดีเข้าร่วมเป็นผู้สังเกตการณ์' : 'ยินดีเข้าร่วม'))
      : (isSpeaker ? 'ไม่สามารถรับเป็นวิทยากรได้' : (isObserver ? 'ไม่สามารถเข้าร่วมเป็นผู้สังเกตการณ์ได้' : 'ไม่สามารถเข้าร่วมได้'));
    var statusColor = isAttend ? '#0B7A2F' : '#B00020';
    var modeText = resp.attendanceMode
      ? (String(resp.attendanceMode).toLowerCase() === 'online' ? 'Online' : 'Onsite')
      : '';

    var subject = isSpeaker
      ? '[สพฉ.] ยืนยันการตอบรับการเป็นวิทยากร: ' + resp.topic
      : (isObserver
        ? '[สพฉ.] ยืนยันการตอบรับการเข้าร่วมเป็นผู้สังเกตการณ์: ' + resp.topic
        : '[สพฉ.] ยืนยันการตอบรับการประชุม: ' + resp.topic);

    var detailRows = ''
      + emailDetailRow_('เรื่อง / หัวข้อ', escapeHtml_(resp.topic))
      + emailDetailRow_('วันที่', escapeHtml_(resp.date))
      + emailDetailRow_('เวลา', resp.time ? escapeHtml_(resp.time) + ' น.' : '-')
      + emailDetailRow_('สถานที่', escapeHtml_(resp.location || '-'));

    if (isAttend && modeText) {
      detailRows += emailDetailRow_('รูปแบบการเข้าร่วม', modeText);
    }
    if (isAttend && modeText === 'Online' && isSafeHttpUrl_(resp.onlineLink)) {
      detailRows += emailDetailRow_('ลิงก์เข้าร่วมออนไลน์', '<a href="' + escapeHtml_(resp.onlineLink) + '">' + escapeHtml_(resp.onlineLink) + '</a>');
    }
    if (!isAttend && resp.reason) {
      detailRows += emailDetailRow_('เหตุผล', escapeHtml_(resp.reason));
    }
    detailRows += emailDetailRow_('เลขที่อ้างอิง', escapeHtml_(resp.id));
    detailRows += emailDetailRow_('บันทึกเมื่อ', escapeHtml_(resp.timestamp));

    var htmlBody = ''
      + '<div style="font-family: Tahoma, Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #E5E5EA; border-radius: 12px; overflow: hidden;">'
      + '  <div style="background: #1D1D1F; color: #EDFF21; padding: 18px 24px;">'
      + '    <p style="margin: 0; font-size: 16px; font-weight: bold;">สถาบันการแพทย์ฉุกเฉินแห่งชาติ (สพฉ.)</p>'
      + '    <p style="margin: 4px 0 0; font-size: 12px; color: #FFFFFF;">' + (isSpeaker ? 'ระบบตอบรับการเป็นวิทยากร' : (isObserver ? 'ระบบตอบรับผู้สังเกตการณ์' : 'ระบบตอบรับการเข้าร่วมประชุม')) + '</p>'
      + '  </div>'
      + '  <div style="padding: 24px;">'
      + '    <p style="font-size: 14px; margin: 0 0 8px;">เรียน คุณ' + escapeHtml_(resp.name) + '</p>'
      + '    <p style="font-size: 14px; margin: 0 0 16px;">ระบบได้รับการตอบรับของท่านเรียบร้อยแล้ว สถานะ: '
      + '      <b style="color: ' + statusColor + ';">' + statusText + '</b></p>'
      + '    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">' + detailRows + '</table>'
      + '    <p style="font-size: 12px; color: #666; margin: 16px 0 0;">หากข้อมูลไม่ถูกต้อง หรือต้องการแก้ไขการตอบรับ กรุณาเข้าระบบอีกครั้ง หรือติดต่อผู้จัดการประชุม</p>'
      + '  </div>'
      + '  <div style="background: #F5F5F7; padding: 12px 24px; font-size: 11px; color: #86868B;">'
      + '    อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ | National Institute for Emergency Medicine'
      + '  </div>'
      + '</div>';

    MailApp.sendEmail({
      to: resp.email,
      subject: subject,
      htmlBody: htmlBody,
      name: 'ระบบตอบรับการประชุม สพฉ.'
    });
    return true;
  } catch (e) {
    Logger.log('sendResponseConfirmationEmail_ failed: ' + e);
    return false;
  }
}

function emailDetailRow_(label, valueHtml) {
  return '<tr>'
    + '<td style="border: 1px solid #E5E5EA; background: #FAFAFA; padding: 6px 10px; width: 38%; font-weight: bold;">' + label + '</td>'
    + '<td style="border: 1px solid #E5E5EA; padding: 6px 10px;">' + valueHtml + '</td>'
    + '</tr>';
}

// 5.1 ลบประวัติการตอบรับรายรายการ
function deleteResponseFromServer(responseId) {
  var targetId = String(responseId || '').trim();
  if (!targetId) return false;

  var sheet = getOrCreateSheet('Responses');
  var rows = sheet.getDataRange().getValues();

  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0] || '').trim() === targetId) {
      sheet.deleteRow(i + 1);
      invalidateDbCache_();
      return true;
    }
  }

  return false;
}

function normalizeRoles_(rolesCsv) {
  return String(rolesCsv || '')
    .split(',')
    .map(function (r) { return String(r || '').trim().toLowerCase(); })
    .filter(function (r) { return r; });
}

function isRoleAllowed_(requesterRole, allowedRolesCsv) {
  var requester = String(requesterRole || '').trim().toLowerCase();
  if (!requester) return false;

  if (requester === 'admin') return true;

  var allowed = normalizeRoles_(allowedRolesCsv);
  return allowed.indexOf(requester) > -1;
}

function uploadMeetingAgendaToDrive(base64Data, fileName, meetingId, oldFileId, requesterRole, allowedRolesCsv) {
  try {
    if (!isRoleAllowed_(requesterRole, allowedRolesCsv)) {
      return { success: false, error: 'ไม่มีสิทธิ์อัปโหลดไฟล์วาระประชุม' };
    }

    if (oldFileId) {
      try {
        var oldFile = DriveApp.getFileById(oldFileId);
        oldFile.setTrashed(true);
      } catch (e) {}
    }

    var decodedData = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decodedData, null, fileName);
    var file = DriveApp.createFile(blob);
    file.setDescription('Meeting agenda for meetingId=' + meetingId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      url: file.getUrl(),
      name: fileName,
      fileId: file.getId()
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function uploadMeetingReportToDrive(base64Data, fileName, meetingId, oldFileId, requesterRole, allowedRolesCsv) {
  try {
    if (!isRoleAllowed_(requesterRole, allowedRolesCsv)) {
      return { success: false, error: 'ไม่มีสิทธิ์อัปโหลดไฟล์รายงานการประชุม' };
    }

    if (oldFileId) {
      try {
        var oldFile = DriveApp.getFileById(oldFileId);
        oldFile.setTrashed(true);
      } catch (e) {}
    }

    var decodedData = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decodedData, null, fileName);
    var file = DriveApp.createFile(blob);
    file.setDescription('Meeting report for meetingId=' + meetingId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      url: file.getUrl(),
      name: fileName,
      fileId: file.getId()
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ==========================================
// ส่วนจัดการ Google Drive (อัปโหลด PDF)
// ==========================================

function uploadPdfToDrive(base64Data, fileName, mtgId, userName, oldFileId, requesterRole, allowedRolesCsv) {
  try {
    if (!isRoleAllowed_(requesterRole, allowedRolesCsv)) {
      return { success: false, error: 'ไม่มีสิทธิ์อัปโหลดไฟล์สำหรับรายการนี้' };
    }

    // ลบไฟล์เก่าถ้ามี (เพื่อป้องกันไฟล์สะสมใน Drive)
    if (oldFileId) {
      try {
        var oldFile = DriveApp.getFileById(oldFileId);
        oldFile.setTrashed(true);
      } catch (e) {
        // ไฟล์เก่าอาจถูกลบไปแล้ว ไม่ต้องแจ้ง error
      }
    }
    
    // กำหนดโฟลเดอร์สำหรับเก็บไฟล์ (ถ้าระบุ Folder ID ให้ใช้ DriveApp.getFolderById("...").createFile(...))
    // ค่าเริ่มต้นจะบันทึกลง Root Drive ของผู้รัน Script
    var decodedData = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decodedData, 'application/pdf', fileName);
    
    var file = DriveApp.createFile(blob);
    
    // ตั้งสิทธิ์ให้ดูได้ทุกคนที่มีลิงก์ (สำคัญมาก เพื่อให้ผู้ใช้กดดาวน์โหลดได้)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileUrl = file.getUrl();
    var fileId = file.getId();
    
    return { success: true, url: fileUrl, name: fileName, fileId: fileId };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
