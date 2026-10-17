/**
 * Ericss Furniture: nhận yêu cầu báo giá từ website và ghi vào Google Sheet.
 * Cách cài đặt xem apps-script/README.md.
 *
 * Tính năng:
 *  1. Ghi mỗi yêu cầu thành một dòng trong sheet "Báo giá" (cột tiếng Việt, không ghi trùng theo mã yêu cầu).
 *  2. Giới hạn số lượt nhận báo giá (SEAT_LIMIT). Đủ số dòng thì từ chối và trả {error: 'full'}.
 *  3. Gửi email cảm ơn đến địa chỉ khách vừa nhập (có chống lạm dụng, xem sendThankYou).
 *
 * Web app phải được deploy với:  Execute as = Me,  Who has access = Anyone.
 */
const SHEET_NAME = 'Báo giá';
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

// Nếu script được mở từ Sheet (Tiện ích mở rộng -> Apps Script) thì để trống.
// Nếu script là dự án độc lập (tạo từ script.google.com) thì dán ID của Google Sheet vào đây.
// ID là đoạn giữa /d/ và /edit trong link Sheet:  https://docs.google.com/spreadsheets/d/<ID>/edit
const SPREADSHEET_ID = '';

// Số lượt nhận báo giá tối đa. Khi sheet đã có đủ ngần ấy dòng dữ liệu, form trên website tự đóng và báo "Hết chỗ".
const SEAT_LIMIT = 50;

// Email cảm ơn
const SEND_EMAIL = true;
const SENDER_NAME = 'Ericss Furniture';
const EMAIL_COOLDOWN_SECONDS = 3600;   // một địa chỉ chỉ nhận tối đa 1 email mỗi giờ (chống người lạ dùng link để gửi thư rác)
const MIN_DAILY_QUOTA_LEFT = 5;        // chừa lại một ít hạn mức gửi thư trong ngày của tài khoản Google

// Màu của bảng
const BRAND = '#7d4f25';
const STATUS_OPTIONS = ['Mới', 'Đã liên hệ', 'Đã báo giá', 'Đã chốt', 'Hủy'];
const TYPE_LABELS = { contact: 'Liên hệ', cart: 'Giỏ báo giá', product: 'Sản phẩm' };
const VND = '#,##0" ₫"';

const money = (n) => (Number(n) ? Math.round(Number(n)) : '');
const moq = (n) => (Number(n) ? Number(n) : '');

/**
 * Các cột của bảng, từ trái sang phải. Chỉ có thông tin cần cho việc báo giá.
 * value(d): giá trị ghi vào ô, d là dữ liệu website gửi lên.
 */
const COLUMNS = [
  { title: 'Mã yêu cầu', width: 150, value: (d) => d.id },
  { title: 'Thời gian', width: 130, format: 'dd/mm/yyyy hh:mm', center: true, value: (d) => d.receivedAt },
  { title: 'Loại yêu cầu', width: 110, center: true, value: (d) => TYPE_LABELS[d.type] || 'Liên hệ' },
  { title: 'Họ và tên', width: 170, value: (d) => d.name },
  { title: 'Email', width: 220, value: (d) => d.email },
  { title: 'Số điện thoại', width: 120, value: (d) => d.phone },
  { title: 'Công ty', width: 150, value: (d) => d.company },
  { title: 'Sản phẩm đặt', width: 300, wrap: true, value: (d) => String(d.items || '').split('; ').join('\n') },
  { title: 'MOQ xưởng', width: 90, center: true, format: '#,##0', value: (d) => moq(d.factoryMoq) },
  { title: 'MOQ khách đặt', width: 105, center: true, format: '#,##0', value: (d) => moq(d.customerMoq) },
  { title: 'Đạt MOQ', width: 80, center: true, value: (d) => (d.meetsMoq === 'yes' ? 'Có' : d.meetsMoq === 'no' ? 'Không' : '') },
  { title: 'Tạm tính', width: 130, format: VND, value: (d) => money(d.subtotal) },
  { title: 'Giảm giá', width: 120, format: VND, value: (d) => money(Number(d.volumeDiscount || 0) + Number(d.couponDiscount || 0)) },
  { title: 'VAT', width: 115, format: VND, value: (d) => money(d.vat) },
  { title: 'Tổng cộng', width: 140, format: VND, bold: true, value: (d) => money(d.total) },
  { title: 'Lời nhắn', width: 280, wrap: true, value: (d) => d.message },
  { title: 'Trạng thái', width: 115, center: true, value: () => STATUS_OPTIONS[0] },
];
const COL = { MOQ_OK: 11, STATUS: COLUMNS.length };   // số thứ tự cột (bắt đầu từ 1)

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data.id || !data.email) return reply({ ok: false, error: 'missing id or email' });
    if (data.website) return reply({ ok: true, ignored: true }); // ô ẩn chống bot bị điền

    const sheet = getSheet();
    const lastRow = sheet.getLastRow();

    // Chống ghi trùng: website có thể gửi lại cùng một yêu cầu (không gửi lại email, không tính thêm chỗ).
    if (lastRow > 1) {
      const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
      if (ids.indexOf(data.id) !== -1) return reply({ ok: true, duplicate: true, count: countRows(sheet), limit: SEAT_LIMIT });
    }

    // Hết chỗ: không ghi thêm. Khóa (lock) ở trên đảm bảo hai người gửi cùng lúc không vượt giới hạn.
    if (countRows(sheet) >= SEAT_LIMIT) {
      return reply({ ok: false, error: 'full', count: countRows(sheet), limit: SEAT_LIMIT });
    }

    data.receivedAt = new Date();
    sheet.appendRow(COLUMNS.map((column) => clean(column.value(data))));

    let emailed = false;
    if (SEND_EMAIL) {
      try {
        emailed = sendThankYou(data);
      } catch (mailError) {
        console.error('Không gửi được email: ' + mailError); // yêu cầu vẫn đã được ghi, không báo lỗi cho khách
      }
    }
    return reply({ ok: true, emailed: emailed, count: countRows(sheet), limit: SEAT_LIMIT });
  } catch (error) {
    return reply({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

// Website hỏi "còn chỗ không" bằng cách mở link này; mở bằng trình duyệt cũng thấy dịch vụ đang chạy.
function doGet() {
  const count = countRows(getSheet());
  return reply({ ok: true, service: 'Ericss quote intake', count: count, limit: SEAT_LIMIT, open: count < SEAT_LIMIT });
}

// Số dòng dữ liệu (không tính hàng tiêu đề).
function countRows(sheet) {
  return Math.max(sheet.getLastRow() - 1, 0);
}

/**
 * Email cảm ơn gửi đến địa chỉ khách nhập. Trả về true nếu đã gửi.
 * Vì link web app là công khai, ai cũng có thể điền email của người khác, nên:
 *  - chỉ nhận địa chỉ đúng định dạng;
 *  - một địa chỉ chỉ được gửi 1 email mỗi EMAIL_COOLDOWN_SECONDS;
 *  - dừng gửi khi hạn mức thư trong ngày sắp hết;
 *  - nội dung chỉ gồm điều chính khách đã nhập, kèm câu "nếu không phải bạn, hãy bỏ qua".
 */
function sendThankYou(data) {
  const email = String(data.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if (MailApp.getRemainingDailyQuota() <= MIN_DAILY_QUOTA_LEFT) return false;

  const cache = CacheService.getScriptCache();
  const cacheKey = 'mail:' + email.toLowerCase();
  if (cache.get(cacheKey)) return false;
  cache.put(cacheKey, '1', EMAIL_COOLDOWN_SECONDS);

  const vi = data.lang !== 'en';
  const qr = 'https://quickchart.io/qr?size=220&margin=2&text=' + encodeURIComponent(data.name + ' · ' + data.id);
  const total = Number(data.total) ? String(Math.round(Number(data.total))).replace(/\B(?=(\d{3})+(?!\d))/g, vi ? '.' : ',') + ' VND' : '';

  const lines = vi
    ? ['Xin chào ' + data.name + ',', '',
       'Cảm ơn bạn đã gửi yêu cầu báo giá cho Ericss Furniture. Chúng tôi đã nhận được yêu cầu của bạn.', '',
       'Mã yêu cầu: ' + data.id]
    : ['Hello ' + data.name + ',', '',
       'Thank you for your quote request to Ericss Furniture. We have received it.', '',
       'Request code: ' + data.id];
  if (data.productName) lines.push((vi ? 'Sản phẩm: ' : 'Product: ') + data.productName + (data.productSku ? ' (' + data.productSku + ')' : ''));
  if (data.customerMoq) lines.push((vi ? 'Số lượng bạn muốn đặt: ' : 'Quantity you want to order: ') + data.customerMoq);
  if (total) lines.push((vi ? 'Tạm tính (chưa phải báo giá chính thức): ' : 'Indicative total (not an official quote): ') + total);
  lines.push('', vi ? 'Chúng tôi sẽ liên hệ với báo giá chi tiết qua email này.' : 'We will get back to you with a detailed quote at this address.',
    '', vi ? 'Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email.' : 'If you did not make this request, please ignore this email.',
    '', 'Ericss Furniture');

  const htmlBody = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1b1b1b">'
    + lines.map((line) => (line === '' ? '<br>' : '<div>' + escapeHtml(line) + '</div>')).join('')
    + '<p style="margin-top:18px"><img src="' + qr + '" width="160" height="160" alt="QR"></p></div>';

  MailApp.sendEmail({
    to: email,
    name: SENDER_NAME,
    subject: vi ? 'Ericss Furniture: đã nhận yêu cầu báo giá ' + data.id : 'Ericss Furniture: we received your quote request ' + data.id,
    body: lines.join('\n'),
    htmlBody: htmlBody,
  });
  return true;
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getSpreadsheet() {
  const spreadsheet = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Script chưa gắn với Google Sheet: hãy điền SPREADSHEET_ID ở đầu file Code.gs.');
  return spreadsheet;
}

/**
 * Chạy hàm này MỘT LẦN từ trình soạn thảo (chọn "authorize" -> Chạy) để Google hiện màn hình cấp quyền
 * (đọc/ghi Sheet và gửi email). Xong rồi mới Triển khai. Hàm cũng tạo sẵn sheet "Báo giá" đã định dạng.
 */
function authorize() {
  const sheet = getSheet();
  const quota = MailApp.getRemainingDailyQuota(); // chạm vào MailApp để Google xin quyền gửi email
  Logger.log('OK. Sheet "' + sheet.getName() + '" của "' + sheet.getParent().getName() + '" đã sẵn sàng. Hạn mức gửi email còn lại hôm nay: ' + quota);
}

function getSheet() {
  const spreadsheet = getSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) formatSheet(sheet);
  return sheet;
}

/**
 * Tạo hàng tiêu đề tiếng Việt và định dạng bảng. Chạy lại hàm này (menu Chạy -> formatSheet)
 * bất cứ lúc nào để đưa bảng về đúng kiểu, dữ liệu đã có không bị mất.
 */
function formatSheet(sheet) {
  sheet = sheet || getSheet();
  const spreadsheet = sheet.getParent();
  const rows = 1000;
  spreadsheet.setSpreadsheetTimeZone(TIME_ZONE);

  // bỏ các cột thừa phía bên phải (nếu có)
  if (sheet.getMaxColumns() > COLUMNS.length) sheet.deleteColumns(COLUMNS.length + 1, sheet.getMaxColumns() - COLUMNS.length);

  // hàng tiêu đề
  const header = sheet.getRange(1, 1, 1, COLUMNS.length);
  header.setValues([COLUMNS.map((column) => column.title)])
    .setBackground(BRAND).setFontColor('#ffffff').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);

  // từng cột: độ rộng, căn lề, định dạng số / ngày
  COLUMNS.forEach((column, index) => {
    const position = index + 1;
    sheet.setColumnWidth(position, column.width);
    const body = sheet.getRange(2, position, rows, 1);
    body.setVerticalAlignment('top').setWrap(Boolean(column.wrap));
    if (column.center) body.setHorizontalAlignment('center');
    if (column.format) body.setNumberFormat(column.format);
    if (column.bold) body.setFontWeight('bold');
  });

  // kẻ sọc xen kẽ, bỏ đường lưới cho gọn
  if (sheet.getBandings().length === 0) {
    sheet.getRange(1, 1, rows + 1, COLUMNS.length)
      .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
      .setHeaderRowColor(BRAND).setFirstRowColor('#ffffff').setSecondRowColor('#f7f3ee');
  }
  sheet.setHiddenGridlines(true);
  sheet.setTabColor(BRAND);

  // cột Trạng thái: danh sách chọn để theo dõi xử lý
  const statusRange = sheet.getRange(2, COL.STATUS, rows, 1);
  statusRange.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUS_OPTIONS, true).setAllowInvalid(false).build());

  // tô màu: Đạt MOQ và Trạng thái
  const moqRange = sheet.getRange(2, COL.MOQ_OK, rows, 1);
  const paint = (range, text, background, color) => SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(text).setBackground(background).setFontColor(color).setRanges([range]).build();
  sheet.setConditionalFormatRules([
    paint(moqRange, 'Có', '#e7f3ea', '#2f6b3a'),
    paint(moqRange, 'Không', '#fbe9e5', '#b3402f'),
    paint(statusRange, 'Mới', '#fdf3df', '#8a5a10'),
    paint(statusRange, 'Đã liên hệ', '#e8eefb', '#2a4a8a'),
    paint(statusRange, 'Đã báo giá', '#e8eefb', '#2a4a8a'),
    paint(statusRange, 'Đã chốt', '#e7f3ea', '#2f6b3a'),
    paint(statusRange, 'Hủy', '#eeeeee', '#777777'),
  ]);
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
