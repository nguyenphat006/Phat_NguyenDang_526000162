# Ericss Furniture

Website nhà sản xuất nội thất ngoài trời cao cấp: giới thiệu xưởng và quy trình, danh sách sản phẩm, ước giá và **gửi yêu cầu báo giá có MOQ** (lưu vào Google Sheet). Viết bằng HTML, CSS và JavaScript thuần, không framework, không máy chủ riêng, **mở thẳng file `index.html` là chạy**.

- **Sinh viên:** Nguyễn Đăng Phát, MSSV 526000162, Trường Đại học Lạc Hồng
- **Xem trực tiếp:** https://nguyenphat006.github.io/Phat_NguyenDang_526000162/
- **Nhật ký Prompt:** [PROMPT_LOG.md](PROMPT_LOG.md)
- **Tài liệu để thuyết trình:** [docs/HUONG-DAN-THUYET-TRINH.md](docs/HUONG-DAN-THUYET-TRINH.md)

## Các trang
| Trang | Nội dung |
|---|---|
| `index.html` | Landing page: tên thương hiệu cỡ lớn, bốn chất liệu, quy trình 8 bước, con số, ảnh trong xưởng |
| `products.html` | 26 sản phẩm: tìm theo tên / chất liệu / SKU, lọc theo chất liệu và giá, sắp xếp, "Xem thêm", yêu thích, **so sánh tối đa 3 sản phẩm**, chi tiết, **nút "Gửi báo giá"** trên từng sản phẩm |
| `estimator.html` | Ước giá theo loại, chất liệu, kích thước, lớp hoàn thiện, số lượng (có chiết khấu, VAT, thời gian sản xuất) |
| `contact.html` | **Cùng một biểu mẫu báo giá như hộp thoại**: chọn sản phẩm hoặc dự án tùy chỉnh, nhập MOQ, đính kèm giỏ báo giá; bên dưới là lịch sử yêu cầu kèm trạng thái Google Sheet |

Dùng chung mọi trang: **menu ở đầu trang chỉ gồm các trang** (Trang chủ, Sản phẩm, Ước giá, Liên hệ), giỏ báo giá (ngăn kéo bên phải), ngôn ngữ Việt / Anh (mặc định tiếng Việt), và **chân trang bốn cột** (giới thiệu, khám phá, liên hệ, pháp lý) với hộp thoại **Chính sách bảo mật**, **Điều khoản sử dụng** và hộp thoại GitHub.

Trang chủ có thêm **chấm điều hướng cố định ở mép phải** (Trang chủ, Về chúng tôi, Bộ sưu tập, Quy trình, Thư viện ảnh, Liên hệ): rê chuột hoặc Tab vào chấm sẽ hiện nhãn, chấm của mục đang xem tự sáng lên. Bấm vào ảnh ở thư viện, quy trình, bộ sưu tập hoặc phần giới thiệu sẽ mở **modal xem ảnh lớn** (nút trước / sau, phím mũi tên, vuốt trên điện thoại).

## Dữ liệu (cấu trúc JSON)
Các bảng dữ liệu nằm trong `data/*.js`: nội dung là JSON, đặt trong một tệp `.js` thường để trang chạy được cả khi mở thẳng từ ổ đĩa (trình duyệt không cho `fetch` đọc tệp `.json` ở chế độ này).

| Tệp | Nội dung |
|---|---|
| `data/products.js` | 26 sản phẩm: SKU, tên và mô tả song ngữ, giá, **MOQ xưởng**, kích thước, thời gian giao, ảnh, thẻ |
| `data/pricing.js` | VAT, bậc chiết khấu theo số lượng, mã giảm giá, bảng giá của công cụ ước giá |
| `data/ui.js` | Chuỗi giao diện Việt / Anh của các tính năng động |
| `data/config.js` | `sheetEndpoint` (link Google Apps Script) và `maxQuoteQty` |

Dữ liệu của người dùng (giỏ báo giá, yêu thích, lịch sử yêu cầu) lưu trong `localStorage` dạng JSON, có thể tải về dạng Excel (.xlsx, thư viện SheetJS).

## Công thức tính tiền (`js/pricing.js`)
1. Tạm tính = Σ đơn giá × số lượng.
2. Chiết khấu số lượng: từ 5 / 10 / 20 sản phẩm giảm 3% / 5% / 8%.
3. Mã giảm giá (ví dụ `ERICSS10`, đơn từ 20.000.000 ₫) tính trên số tiền sau chiết khấu.
4. VAT 10% tính trên số tiền còn lại. Mọi số tiền làm tròn đến đồng.

Ví dụ: 50 ghế × 6.800.000 ₫ = 340.000.000 ₫, trừ 8% còn 312.800.000 ₫, cộng VAT 10% được **344.080.000 ₫**.

## Lưu yêu cầu báo giá lên Google Sheet
Website gửi `POST` tới một Google Apps Script (`apps-script/Code.gs`), script ghi mỗi yêu cầu thành một dòng trong Sheet. Cài đặt từng bước: [`apps-script/README.md`](apps-script/README.md).
- Yêu cầu luôn được **lưu trên thiết bị trước**, rồi mới gửi. Mất mạng hoặc chưa cấu hình thì ở trạng thái "chờ đồng bộ", tự gửi lại khi tải trang hoặc bấm "Gửi lại".
- Mỗi yêu cầu có `id` duy nhất; Apps Script bỏ qua `id` đã có nên không bị ghi trùng.
- Bảng **"Báo giá"** chỉ có thông tin chính, **tên cột tiếng Việt**, không có cột JSON: Mã yêu cầu, Thời gian, Loại yêu cầu, Họ và tên, Email, Số điện thoại, Công ty, Sản phẩm đặt, MOQ xưởng, MOQ khách đặt, Đạt MOQ, Tạm tính, Giảm giá, VAT, Tổng cộng, Lời nhắn, Trạng thái (danh sách chọn để theo dõi xử lý). Bảng có hàng tiêu đề cố định, kẻ sọc, định dạng tiền `₫`, tô màu cột Đạt MOQ và Trạng thái.
- Chống bot bằng ô ẩn (honeypot); Apps Script chặn ô bắt đầu bằng `=`, `+`, `-`, `@`.

### Ba tính năng của biểu mẫu báo giá
1. **Email cảm ơn tự động:** ngay sau khi ghi vào Sheet, Apps Script gửi email cảm ơn đến địa chỉ khách vừa nhập (song ngữ, có mã yêu cầu, sản phẩm, MOQ, tạm tính, mã QR). Có chống lạm dụng: mỗi địa chỉ 1 email/giờ, dừng khi sắp hết hạn mức thư trong ngày.
2. **Mã QR (QuickChart):** sau khi gửi xong, trang hiện mã QR chứa **họ tên và mã yêu cầu** để khách giữ lại đối chiếu.
3. **Chống spam:** Chống spam ở hai lớp. **Trên trình duyệt:** ô ẩn (honeypot), thời gian điền form được gửi kèm (`fillMs`), mỗi thiết bị phải chờ 30 giây giữa hai yêu cầu và tối đa 5 yêu cầu mỗi giờ. **Trong Apps Script** (lớp quyết định, vì khách có thể bỏ qua trình duyệt): từ chối form điền dưới 3 giây, tên quá ngắn, email sai định dạng, nội dung quá dài hoặc có hơn 2 đường link; mỗi email tối đa 3 yêu cầu mỗi giờ, toàn hệ thống tối đa 6 yêu cầu mỗi phút và 60 mỗi giờ. Yêu cầu bị từ chối không ghi dòng nào, không gửi email.

## Kiến trúc JavaScript (`js/`)
Dùng **script thường** (không `import` / `export`): mỗi tệp là một module kiểu IIFE, gắn các hàm của nó vào một đối tượng chung `Ericss` (ví dụ `Ericss.pricing.calcQuote`). Mỗi trang nạp các tệp theo thứ tự phụ thuộc (xem cuối `index.html`).

| Nhóm | Tệp |
|---|---|
| Hạ tầng | `api.js` (lấy bảng dữ liệu), `store.js` (localStorage), `lang.js` (song ngữ), `ui.js` (DOM và định dạng) |
| Hàm thuần (không đụng giao diện) | `pricing.js`, `filters.js`, `validation.js` |
| Nghiệp vụ | `cart.js`, `quotes.js`, `sheet.js`, `quote-form.js` (biểu mẫu báo giá duy nhất) |
| Giao diện từng trang | `catalog.js`, `estimator.js`, `history.js`, `cart-ui.js`, `success.js` |
| Khởi động | `main.js` (nạp sau cùng, mỗi trang chỉ chạy phần có markup tương ứng), `site.js` + `site-i18n.js` (menu, song ngữ chung, hiệu ứng) |

Kỹ thuật: `map` / `filter` / `reduce` / `forEach`, event delegation, `async/await`, `try/catch`, debounce, `IntersectionObserver`.

## Chạy và triển khai
- **Chạy:** mở thẳng `index.html` bằng Chrome hoặc Edge (hoặc dùng link GitHub Pages). Không cần máy chủ.
- **Triển khai:** mỗi lần push lên `main`, GitHub Actions tự đưa website lên GitHub Pages.

## Công nghệ
HTML5 semantic · CSS Variables · Flexbox / Grid · [Animate.css](https://animate.style/) · [AOS](https://michalsnik.github.io/aos/) · [GSAP + ScrollTrigger](https://gsap.com/) · JavaScript thuần · GitHub Actions → GitHub Pages · font Be Vietnam Pro.

## Cấu trúc thư mục
```
index.html  products.html  estimator.html  contact.html
css/        style.css (nền tảng)  features.css (trang dữ liệu)  landing.css (trang chủ)
js/         các module (xem bảng trên)
data/       products.js  pricing.js  ui.js  config.js
assets/     img/ (ảnh)  favicon.svg
apps-script/  Code.gs (nhận yêu cầu, ghi Google Sheet) + hướng dẫn
docs/       HUONG-DAN-THUYET-TRINH.md
.github/workflows/deploy.yml
PROMPT_LOG.md
```

## Các prompt tiêu biểu (Vibe Coding với AI)
Nhật ký đầy đủ nằm trong [PROMPT_LOG.md](PROMPT_LOG.md). Dưới đây là những prompt giải quyết vấn đề logic khó, kèm cách sửa:

| Prompt | Vấn đề | Cách điều khiển AI |
|---|---|---|
| "Dựng khung semantic, hạn chế `<div>` vô nghĩa, màu / font / spacing trong CSS Variables" | AI hay bọc mọi thứ bằng `div` | Yêu cầu chọn thẻ theo ngữ nghĩa (`header`, `nav`, `main`, `section`, `article`, `dl`, `ol`, `dialog`) |
| "Hiệu ứng ảnh mở dần bằng `clip-path`" | `IntersectionObserver` không bao giờ kích hoạt vì phần tử bị cắt hết | Đổi sang quan sát phần tử cha |
| "Kiểm tra hàm tính tiền bằng số tính tay" | Làm tròn sai ở biên .5 do số thực (14.662.499,999… thay vì 14.662.500) | Làm tròn bằng `toPrecision(12)` trước, kiểm lại bằng số tính tay |
| "Ô tìm kiếm không phân biệt dấu tiếng Việt" | Chữ "Đ" hoa không khớp vì thay `đ` chạy trước khi hạ chữ thường | Đưa `toLowerCase()` lên trước |
| "Lưu báo giá lên Google Sheet từ web tĩnh" | Apps Script không trả lời CORS preflight, gửi lại có thể ghi trùng | Gửi `text/plain`, dự phòng `no-cors`, `id` duy nhất và script kiểm tra trùng |
| "Gộp form liên hệ và hộp thoại báo giá thành một biểu mẫu" | Hai biểu mẫu khác nhau, form riêng không chọn được sản phẩm | Một module `quote-form.js` dùng chung, sản phẩm chọn bằng ô chọn hoặc tham số `?product=` |
| "Thiết kế lại landing theo skill `design-taste-frontend`" | Bố cục "chữ trái, ảnh phải" quen thuộc | Chạy `draw.mjs` chọn hướng "tên là kiến trúc", giữ bảng màu và font của thương hiệu, sửa đến khi `inspect.mjs` không còn FAIL | (đã hoàn nguyên về landing cũ theo yêu cầu)
| "Dùng script thường để mở thẳng file là chạy" | `fetch` đọc JSON và `import` bị chặn khi mở bằng `file://` | Chuyển mỗi module thành IIFE gắn vào `Ericss`, dữ liệu thành `data/*.js` |
