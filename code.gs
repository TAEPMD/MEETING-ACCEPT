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
    meetingsSheet.appendRow(['id', 'topic', 'date', 'time', 'location', 'onlineLink', 'agendaUrl', 'agendaName', 'agendaFileId', 'hybridEnabled', 'uploadRoles', 'isActive']);
    meetingsSheet.getRange("A1:L1").setFontWeight("bold").setBackground("#E8F0FE");
    result.push("✅ สร้าง Sheet 'Meetings' สำเร็จ");
  } else {
    ensureMeetingsSheetColumns_(meetingsSheet);
    result.push("ℹ️ Sheet 'Meetings' มีอยู่แล้ว");
  }
  
  // สร้าง Sheet Attendees
  var attendeesSheet = ss.getSheetByName('Attendees');
  if (!attendeesSheet) {
    attendeesSheet = ss.insertSheet('Attendees');
    attendeesSheet.appendRow(['mtgId', 'name', 'pdfUrl', 'pdfName', 'fileId']);
    attendeesSheet.getRange("A1:E1").setFontWeight("bold").setBackground("#E8F0FE");
    result.push("✅ สร้าง Sheet 'Attendees' สำเร็จ");
  } else {
    result.push("ℹ️ Sheet 'Attendees' มีอยู่แล้ว");
  }
  
  // สร้าง Sheet Responses
  var responsesSheet = ss.getSheetByName('Responses');
  if (!responsesSheet) {
    responsesSheet = ss.insertSheet('Responses');
    responsesSheet.appendRow(['id', 'meetingId', 'topic', 'date', 'time', 'location', 'name', 'status', 'attendanceMode', 'reason', 'timestamp']);
    responsesSheet.getRange("A1:K1").setFontWeight("bold").setBackground("#E8F0FE");
    result.push("✅ สร้าง Sheet 'Responses' สำเร็จ");
  } else {
    ensureResponsesSheetColumns_(responsesSheet);
    result.push("ℹ️ Sheet 'Responses' มีอยู่แล้ว");
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
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ระบบตอบรับการประชุม - สพฉ.')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ==========================================
// ส่วนจัดการฐานข้อมูล (Google Sheets)
// ==========================================

// ฟังก์ชันช่วยเหลือ: ดึงแผ่นงาน หรือ สร้างใหม่ถ้ายังไม่มี
function getOrCreateSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // ตั้งค่า Header สำหรับแผ่นงานที่สร้างใหม่
    if (sheetName === 'Meetings') {
      sheet.appendRow(['id', 'topic', 'date', 'time', 'location', 'onlineLink', 'agendaUrl', 'agendaName', 'agendaFileId', 'hybridEnabled', 'uploadRoles', 'isActive']);
      sheet.getRange("A1:L1").setFontWeight("bold").setBackground("#E8F0FE");
    } else if (sheetName === 'Attendees') {
      sheet.appendRow(['mtgId', 'name', 'pdfUrl', 'pdfName', 'fileId']);
      sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#E8F0FE");
    } else if (sheetName === 'Responses') {
      sheet.appendRow(['id', 'meetingId', 'topic', 'date', 'time', 'location', 'name', 'status', 'attendanceMode', 'reason', 'timestamp']);
      sheet.getRange("A1:K1").setFontWeight("bold").setBackground("#E8F0FE");
    }
  }

  if (sheetName === 'Meetings') ensureMeetingsSheetColumns_(sheet);
  if (sheetName === 'Responses') ensureResponsesSheetColumns_(sheet);

  return sheet;
}

function ensureMeetingsSheetColumns_(sheet) {
  var headers = sheet.getRange(1, 1, 1, Math.max(12, sheet.getLastColumn())).getValues()[0];
  var required = ['id', 'topic', 'date', 'time', 'location', 'onlineLink', 'agendaUrl', 'agendaName', 'agendaFileId', 'hybridEnabled', 'uploadRoles', 'isActive'];

  for (var i = 0; i < required.length; i++) {
    if (String(headers[i] || '').trim() !== required[i]) {
      sheet.getRange(1, i + 1).setValue(required[i]);
    }
  }
  sheet.getRange("A1:L1").setFontWeight("bold").setBackground("#E8F0FE");
}

function ensureResponsesSheetColumns_(sheet) {
  var headers = sheet.getRange(1, 1, 1, Math.max(11, sheet.getLastColumn())).getValues()[0];
  var required = ['id', 'meetingId', 'topic', 'date', 'time', 'location', 'name', 'status', 'attendanceMode', 'reason', 'timestamp'];

  for (var i = 0; i < required.length; i++) {
    if (String(headers[i] || '').trim() !== required[i]) {
      sheet.getRange(1, i + 1).setValue(required[i]);
    }
  }
  sheet.getRange("A1:K1").setFontWeight("bold").setBackground("#E8F0FE");
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

function toBoolean_(value) {
  if (value === true || value === 'true' || value === 'TRUE' || value === 1 || value === '1') return true;
  return false;
}

// 1. โหลดข้อมูลทั้งหมดเมื่อเปิดหน้าเว็บ (Initialization)
function getInitialData() {
  var meetingsSheet = getOrCreateSheet('Meetings');
  var attendeesSheet = getOrCreateSheet('Attendees');
  var responsesSheet = getOrCreateSheet('Responses');
  
  var db = { meetings: [], attendees: {}, responses: [] };
  
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
      isActive: mData[i].length < 12 ? true : toBoolean_(mData[i][11]) || String(mData[i][11] || '').trim() === ''
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
      fileId: String(aData[i][4] || "")  // เก็บ File ID สำหรับการลบไฟล์เก่า
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
      date: String(rData[i][3] || ""),
      time: String(rData[i][4] || ""),
      location: String(rData[i][5] || ""),
      name: String(rData[i][6] || ""),
      status: String(rData[i][7] || ""),
      attendanceMode: String(rData[i][8] || ""),
      reason: String(rData[i][9] || ""),
      timestamp: String(rData[i][10] || "")
    });
  }
  
  return db;
}

// 2. บันทึก / แก้ไข การประชุม
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
  
  var sheet = getOrCreateSheet('Meetings');
  var data = sheet.getDataRange().getValues();
  var updated = false;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString() === meeting.id) {
      sheet.getRange(i + 1, 2, 1, 11).setValues([[meeting.topic, meeting.date, meeting.time, meeting.location, meeting.onlineLink, meeting.agendaUrl, meeting.agendaName, meeting.agendaFileId, meeting.hybridEnabled, meeting.uploadRoles, meeting.isActive]]);
      updated = true;
      break;
    }
  }
  
  if (!updated) {
    sheet.appendRow([meeting.id, meeting.topic, meeting.date, meeting.time, meeting.location, meeting.onlineLink, meeting.agendaUrl, meeting.agendaName, meeting.agendaFileId, meeting.hybridEnabled, meeting.uploadRoles, meeting.isActive]);
  }
  return true;
}

function setMeetingActiveStatus(meetingId, isActive) {
  var sheet = getOrCreateSheet('Meetings');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '') === String(meetingId)) {
      sheet.getRange(i + 1, 12).setValue(!!isActive);
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
      return true;
    }
  }

  return false;
}

// 3. ลบการประชุม (รวมถึงรายชื่อและประวัติการตอบรับที่เกี่ยวข้อง)
function deleteMeetingFromServer(id) {
  var mSheet = getOrCreateSheet('Meetings');
  var mData = mSheet.getDataRange().getValues();
  for (var i = mData.length - 1; i >= 1; i--) {
    if (mData[i][0] && mData[i][0].toString() === id) { mSheet.deleteRow(i + 1); break; }
  }
  
  var aSheet = getOrCreateSheet('Attendees');
  var aData = aSheet.getDataRange().getValues();
  for (var i = aData.length - 1; i >= 1; i--) {
    if (aData[i][0] && aData[i][0].toString() === id) { aSheet.deleteRow(i + 1); }
  }
  
  // ลบประวัติการตอบรับที่เกี่ยวข้องด้วย
  var rSheet = getOrCreateSheet('Responses');
  var rData = rSheet.getDataRange().getValues();
  for (var i = rData.length - 1; i >= 1; i--) {
    if (rData[i][1] && rData[i][1].toString() === id) { rSheet.deleteRow(i + 1); }
  }
  return true;
}

// 4. บันทึกรายชื่อผู้เข้าร่วมทั้งหมดของการประชุมนั้นๆ แบบ Replace
function saveAttendeesToServer(mtgId, attendeesArray) {
  var sheet = getOrCreateSheet('Attendees');
  var data = sheet.getDataRange().getValues();
  
  // ลบรายชื่อเก่าของการประชุมนี้ออกก่อน
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][0].toString() === mtgId) {
      sheet.deleteRow(i + 1);
    }
  }
  
  // เขียนรายชื่อใหม่ลงไป พร้อม File ID
  if (attendeesArray && attendeesArray.length > 0) {
    var rowsToAppend = [];
    attendeesArray.forEach(function(user) {
      rowsToAppend.push([mtgId, String(user.name || "").trim(), user.pdfUrl || "", user.pdfName || "", user.fileId || ""]);
    });
    
    // Append bulk data
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, 5).setValues(rowsToAppend);
  }
  return true;
}

// 5. บันทึกการตอบรับ
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
    timestamp: String(data.timestamp || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'))
  };
  
  var sheet = getOrCreateSheet('Responses');
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() === sanitizedData.id) {
      sheet.getRange(i + 1, 1, 1, 11).setValues([[
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
        sanitizedData.timestamp
      ]]);
      return true;
    }
  }

  sheet.appendRow([
    sanitizedData.id, sanitizedData.meetingId, sanitizedData.topic, sanitizedData.date, sanitizedData.time,
    sanitizedData.location, sanitizedData.name, sanitizedData.status, sanitizedData.attendanceMode, sanitizedData.reason, sanitizedData.timestamp
  ]);
  return true;
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