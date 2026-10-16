# Kết nối website với Google Sheet

Website là trang tĩnh (GitHub Pages) nên không tự ghi vào Google Sheet được. Ta dùng **Google Apps Script** làm cầu nối: website gửi yêu cầu báo giá (`POST`) tới một đường link, Apps Script ghi thành một dòng trong Sheet.

## Cài đặt (khoảng 5 phút)

1. Tạo một Google Sheet mới, ví dụ tên **Ericss – Yêu cầu báo giá**.
2. Trong Sheet: menu **Tiện ích mở rộng → Apps Script**.
3. Xóa mã mặc định, dán toàn bộ nội dung file [`Code.gs`](Code.gs), bấm **Lưu**.
4. **Cấp quyền trước khi triển khai** (bước hay bị kẹt):
   - Trên thanh công cụ, ô chọn hàm chọn **`authorize`**, bấm **Chạy**.
   - Hộp thoại "Cần được cho phép" → **Xem lại quyền** → chọn tài khoản Google.
   - Nếu hiện *"Google chưa xác minh ứng dụng này"*: bấm **Nâng cao** → **Chuyển đến … (không an toàn)** → **Cho phép**. Đây là script do chính bạn viết nên an toàn.
   - Xem **Nhật ký thực thi**: có dòng `OK. Sheet "Quotes"…` là thành công.
5. Bấm **Triển khai → Tùy chọn triển khai mới**:
   - Loại: **Ứng dụng web**
   - **Thực thi với tư cách: Tôi**
   - **Người có quyền truy cập: Bất kỳ ai**
   - Bấm **Triển khai** và cấp quyền khi Google yêu cầu.
6. Sao chép **URL ứng dụng web** (dạng `https://script.google.com/macros/s/.../exec`).
7. Mở `data/config.json` trong repo và điền:
   ```json
   {
     "sheetEndpoint": "https://script.google.com/macros/s/XXXXXXXX/exec",
     "maxQuoteQty": 100000
   }
   ```
   `maxQuoteQty` là số lượng tối đa khách được nhập ở ô MOQ khi gửi báo giá cho một sản phẩm.
8. Commit và push. Gửi thử một yêu cầu trên website: sheet `Quotes` sẽ tự có hàng tiêu đề và dòng dữ liệu đầu tiên.

Mở URL ở bước 6 trên trình duyệt sẽ thấy `{"ok":true,"service":"Ericss quote intake"}` nếu dịch vụ đang chạy.

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

## Khi sửa `Code.gs`
Mỗi lần sửa phải **Triển khai → Quản lý triển khai → Chỉnh sửa → Phiên bản mới** thì link cũ mới dùng mã mới.

## Cách hoạt động
- Mỗi yêu cầu có một `id` duy nhất (ví dụ `Q-20261016-AB12`). Apps Script bỏ qua nếu `id` đã có trong Sheet, nên gửi lại nhiều lần cũng không trùng dòng.
- Nếu mất mạng hoặc chưa cấu hình, yêu cầu vẫn được lưu trên thiết bị với trạng thái "chờ đồng bộ" và tự gửi lại lần sau; trong trang **Liên hệ** có nút "Gửi lại".
- Ô văn bản bắt đầu bằng `=`, `+`, `-`, `@` được thêm dấu `'` phía trước để Google Sheet không coi là công thức.
- Form có một ô ẩn (honeypot) để chặn bot; bot điền ô này sẽ bị bỏ qua.

## Lưu ý bảo mật
Đường link web app nằm trong mã nguồn công khai, nên ai có link đều gửi được dữ liệu vào Sheet. Đây là mức bảo vệ phù hợp cho bài tập; với hệ thống thật nên thêm xác thực hoặc dùng máy chủ riêng.
