# Kết nối website với Google Sheet

Website là trang tĩnh (GitHub Pages) nên không tự ghi vào Google Sheet được. Ta dùng **Google Apps Script** làm cầu nối: website gửi yêu cầu báo giá (`POST`) tới một đường link, Apps Script ghi thành một dòng trong sheet **Báo giá**, gửi email cảm ơn cho khách và cho website biết còn bao nhiêu lượt nhận báo giá.

## Cài đặt (khoảng 5 phút)

1. Tạo một Google Sheet mới, ví dụ tên **Ericss – Yêu cầu báo giá**.
2. Trong Sheet: menu **Tiện ích mở rộng → Apps Script**.
3. Xóa mã mặc định, dán toàn bộ nội dung file [`Code.gs`](Code.gs), bấm **Lưu**.
4. **Cấp quyền trước khi triển khai** (bước hay bị kẹt):
   - Trên thanh công cụ, ô chọn hàm chọn **`authorize`**, bấm **Chạy**.
   - Hộp thoại "Cần được cho phép" → **Xem lại quyền** → chọn tài khoản Google. Quyền xin gồm: đọc/ghi Google Sheet và **gửi email** (để gửi thư cảm ơn).
   - Nếu hiện *"Google chưa xác minh ứng dụng này"*: bấm **Nâng cao** → **Chuyển đến … (không an toàn)** → **Cho phép**. Đây là script do chính bạn viết nên an toàn.
   - Xem **Nhật ký thực thi**: có dòng `OK. Sheet "Báo giá"…` là thành công. Sheet **Báo giá** được tạo sẵn và định dạng đẹp.
5. Bấm **Triển khai → Tùy chọn triển khai mới**:
   - Loại: **Ứng dụng web**
   - **Thực thi với tư cách: Tôi**
   - **Người có quyền truy cập: Bất kỳ ai**
   - Bấm **Triển khai** và cấp quyền khi Google yêu cầu.
6. Sao chép **URL ứng dụng web** (dạng `https://script.google.com/macros/s/.../exec`).
7. Mở `data/config.js` trong repo và điền:
   ```json
   {
     "sheetEndpoint": "https://script.google.com/macros/s/XXXXXXXX/exec",
     "maxQuoteQty": 100000
   }
   ```
   `maxQuoteQty` là số lượng tối đa khách được nhập ở ô MOQ khi gửi báo giá cho một sản phẩm.
8. Commit và push. Gửi thử một yêu cầu trên website: sheet **Báo giá** sẽ có dòng dữ liệu đầu tiên và khách nhận email cảm ơn.

Mở URL ở bước 6 trên trình duyệt sẽ thấy `{"ok":true,"service":"Ericss quote intake","count":0,"limit":50,"open":true}` nếu dịch vụ đang chạy.

### Nếu bạn đã cài bản cũ rồi
1. Dán lại toàn bộ `Code.gs` mới, bấm **Lưu**.
2. Chạy lại hàm **`authorize`** và cho phép thêm quyền **gửi email**.
3. **Triển khai → Quản lý triển khai → Chỉnh sửa → Phiên bản: Phiên bản mới → Triển khai.** Link giữ nguyên, không cần đổi `data/config.js`.
4. Bảng mới nằm ở sheet **Báo giá**. Sheet **Quotes** của bản cũ không còn được dùng, bạn xóa đi cũng được.

## Bảng "Báo giá"
Chỉ gồm thông tin cần để báo giá, tên cột tiếng Việt, không có cột JSON hay mã kỹ thuật:

| Cột | Ý nghĩa |
|---|---|
| Mã yêu cầu | Mã duy nhất của yêu cầu, ví dụ `Q-20261016-AB12` |
| Thời gian | Lúc nhận (giờ Việt Nam) |
| Loại yêu cầu | Liên hệ / Giỏ báo giá / Sản phẩm |
| Họ và tên, Email, Số điện thoại, Công ty | Thông tin khách |
| Sản phẩm đặt | Mỗi sản phẩm một dòng: tên, mã SKU và số lượng |
| MOQ xưởng, MOQ khách đặt, Đạt MOQ | So sánh số lượng khách muốn đặt với MOQ của xưởng (Có / Không) |
| Tạm tính, Giảm giá, VAT, Tổng cộng | Tiền bằng số (tính tổng, lọc, sắp xếp được); Giảm giá = chiết khấu số lượng + mã giảm giá |
| Lời nhắn | Nội dung khách viết |
| Trạng thái | Danh sách chọn: Mới, Đã liên hệ, Đã báo giá, Đã chốt, Hủy (tô màu theo trạng thái) |

Bảng có hàng tiêu đề cố định, kẻ sọc xen kẽ, ô tiền định dạng `₫`, cột **Đạt MOQ** tô xanh / đỏ. Nếu lỡ sửa hỏng định dạng, chạy hàm **`formatSheet`** trong Apps Script để đưa bảng về kiểu ban đầu (dữ liệu giữ nguyên).

## Ba tính năng của biểu mẫu báo giá
1. **Email cảm ơn tự động:** ngay sau khi ghi vào Sheet, script gửi email cảm ơn đến địa chỉ khách vừa nhập (tiếng Việt hoặc tiếng Anh theo ngôn ngữ khách dùng), có mã yêu cầu, sản phẩm, MOQ, tạm tính và mã QR.
   - Email gửi từ chính tài khoản Google của bạn nên bị giới hạn hạn mức của Google (khoảng 100 thư mỗi ngày với Gmail thường).
   - Vì link web app là công khai, script **chống lạm dụng**: một địa chỉ chỉ nhận 1 email mỗi giờ, dừng gửi khi hạn mức ngày sắp hết, nội dung chỉ gồm điều khách đã nhập kèm câu "nếu không phải bạn, hãy bỏ qua". Muốn tắt hẳn, đặt `SEND_EMAIL = false`.
2. **Mã QR:** sau khi gửi xong, website hiện mã QR (API [QuickChart](https://quickchart.io/)) chứa **họ tên và mã yêu cầu** của khách để đối chiếu. Lưu ý: họ tên và mã được gửi tới quickchart.io để vẽ ảnh QR.
3. **Giới hạn lượt nhận báo giá:** `SEAT_LIMIT = 50` trong `Code.gs`. Website hiển thị "Còn X/50 lượt". Khi sheet đã đủ 50 dòng, script từ chối yêu cầu mới và form trên website tự đóng với thông báo **"Hết chỗ"**. Muốn đổi giới hạn, sửa `SEAT_LIMIT` rồi triển khai phiên bản mới.

## Script độc lập (không mở từ Sheet)
Nếu bạn tạo script trực tiếp ở `script.google.com` (không qua Sheet), hãy dán **ID của Sheet** vào dòng `const SPREADSHEET_ID = '';` ở đầu `Code.gs` (ID là đoạn giữa `/d/` và `/edit` trong link Sheet). Bỏ qua bước này sẽ báo lỗi *"Script chưa gắn với Google Sheet"*.

## Xử lý sự cố
| Hiện tượng | Cách xử lý |
|---|---|
| Bấm cấp quyền / Triển khai chỉ mở **mail** (`mailto:`) hoặc báo *"liên hệ quản trị viên"* | Tài khoản đang đăng nhập là tài khoản **Google Workspace do một quản trị viên quản lý** (cơ quan, trường học…), bị chặn script hoặc web app công khai. Hãy làm toàn bộ bằng **tài khoản Gmail cá nhân** (mở cửa sổ ẩn danh, chỉ đăng nhập Gmail đó). Link có `/u/0/` nghĩa là tài khoản đầu tiên đang đăng nhập, hãy chắc đó là tài khoản cá nhân. |
| Ô **"Người có quyền truy cập: Bất kỳ ai"** bị mờ / không chọn được | Cùng nguyên nhân (chính sách Workspace). Dùng Gmail cá nhân. |
| Nút **Triển khai** không bấm được | Bấm **Lưu** (Ctrl+S) trước; kiểm tra không có dòng đỏ báo lỗi cú pháp. |
| Màn hình *"Google chưa xác minh ứng dụng này"* | Bấm **Nâng cao → Chuyển đến … (không an toàn) → Cho phép**. |
| Gửi thử không thấy dòng nào trong Sheet | Mở URL web app trên trình duyệt, phải thấy `{"ok":true,...}`; xem **Thực thi** trong Apps Script để biết lỗi; nhớ tạo **phiên bản mới** sau mỗi lần sửa mã. |
| Có dòng trong Sheet nhưng khách không nhận email | Chưa cấp quyền gửi email (chạy lại `authorize`, triển khai phiên bản mới); hoặc địa chỉ đó vừa nhận email trong vòng 1 giờ; hoặc đã hết hạn mức thư trong ngày; kiểm tra cả thư mục Spam. |
| Website không hiện "Còn X/50 lượt" | Bản triển khai chưa phải phiên bản mới nhất (trả lời `GET` không có `count` và `limit`). Triển khai phiên bản mới. |

## Cách hoạt động
- Mỗi yêu cầu có một mã duy nhất. Apps Script bỏ qua nếu mã đã có trong Sheet, nên gửi lại nhiều lần không bị trùng dòng, không gửi lại email và không mất thêm lượt.
- Nếu mất mạng hoặc chưa cấu hình, yêu cầu vẫn được lưu trên thiết bị với trạng thái "chờ đồng bộ" và tự gửi lại lần sau; trong trang **Liên hệ** có nút "Gửi lại". Yêu cầu bị từ chối vì hết chỗ được đánh dấu "Hết chỗ" và không gửi lại nữa.
- Việc đếm và từ chối khi đủ 50 diễn ra trong script (có khóa `LockService`), nên hai người gửi cùng lúc cũng không vượt giới hạn.
- Ô văn bản bắt đầu bằng `=`, `+`, `-`, `@` được thêm dấu `'` phía trước để Google Sheet không coi là công thức.
- Form có một ô ẩn (honeypot) để chặn bot; bot điền ô này sẽ bị bỏ qua.

## Lưu ý bảo mật
Đường link web app nằm trong mã nguồn công khai, nên ai có link đều gửi được dữ liệu vào Sheet. Đây là mức bảo vệ phù hợp cho bài tập; với hệ thống thật nên thêm xác thực hoặc dùng máy chủ riêng.
