/**
 * Ericss Furniture: nhận yêu cầu báo giá từ website và ghi vào Google Sheet.
 * Cách cài đặt xem apps-script/README.md.
 *
 * Web app phải được deploy với:  Execute as = Me,  Who has access = Anyone.
 */
const SHEET_NAME = 'Quotes';

// Thứ tự cột trong Sheet. Tên phải trùng với khóa trong js/sheet.js (toSheetRow).
const HEADERS = [
  'id', 'createdAt', 'type', 'lang',
  'name', 'email', 'phone', 'company',
  'interest', 'productSku', 'productName', 'productPrice',
  'factoryMoq', 'customerMoq', 'meetsMoq',
  'items', 'itemsJson', 'subtotal', 'volumeDiscount', 'coupon', 'couponDiscount', 'vat', 'total',
  'message', 'receivedAt',
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data.id || !data.email) return reply({ ok: false, error: 'missing id or email' });
    if (data.website) return reply({ ok: true, ignored: true }); // ô ẩn chống bot bị điền

    const sheet = getSheet();

    // Chống ghi trùng: website có thể gửi lại cùng một yêu cầu.
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
      if (ids.indexOf(data.id) !== -1) return reply({ ok: true, duplicate: true });
    }

    data.receivedAt = new Date();
    sheet.appendRow(HEADERS.map((key) => clean(data[key])));
    return reply({ ok: true });
  } catch (error) {
    return reply({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

// Mở link web app bằng trình duyệt để kiểm tra dịch vụ đang chạy.
function doGet() {
  return reply({ ok: true, service: 'Ericss quote intake' });
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

// Ngăn "công thức" (=, +, -, @) do khách nhập bị Google Sheet thực thi.
function clean(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) return value;
  const text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function reply(object) {
  return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(ContentService.MimeType.JSON);
}
