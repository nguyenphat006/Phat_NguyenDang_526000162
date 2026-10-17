# Ericss Furniture

Website nhà sản xuất nội thất ngoài trời cao cấp: giới thiệu xưởng và quy trình, danh sách sản phẩm, ước giá và **gửi yêu cầu báo giá có MOQ** (lưu vào Google Sheet). Viết bằng HTML, CSS và JavaScript thuần, không dùng framework hay máy chủ riêng.

- **Sinh viên:** Nguyễn Đăng Phát, MSSV 526000162, Trường Đại học Lạc Hồng
- **Xem trực tiếp:** https://nguyenphat006.github.io/Phat_NguyenDang_526000162/
- **Nhật ký Prompt:** [PROMPT_LOG.md](PROMPT_LOG.md)
- **Tài liệu để thuyết trình:** [docs/HUONG-DAN-THUYET-TRINH.md](docs/HUONG-DAN-THUYET-TRINH.md)

## Các trang
| Trang | Nội dung |
|---|---|
| `index.html` | Landing page: tên thương hiệu cỡ lớn, bốn chất liệu, quy trình 8 bước, con số, ảnh trong xưởng |
| `products.html` | 26 sản phẩm từ `data/products.json`: tìm theo tên / chất liệu / SKU, lọc theo chất liệu và giá, sắp xếp, "Xem thêm", yêu thích, chi tiết, **nút "Gửi báo giá"** trên từng sản phẩm |
| `estimator.html` | Ước giá theo loại, chất liệu, kích thước, lớp hoàn thiện, số lượng (có chiết khấu, VAT, thời gian sản xuất) |
| `contact.html` | **Cùng một biểu mẫu báo giá như hộp thoại**: chọn sản phẩm hoặc dự án tùy chỉnh, nhập MOQ, đính kèm giỏ báo giá; bên dưới là lịch sử yêu cầu kèm trạng thái Google Sheet |

Giỏ báo giá (ngăn kéo bên phải), ngôn ngữ Việt / Anh (mặc định tiếng Việt) và hộp thoại GitHub ở chân trang dùng chung mọi trang.

## Dữ liệu JSON
| Tệp | Nội dung |
|---|---|
| `data/products.json` | 26 sản phẩm: SKU, tên và mô tả song ngữ, giá, **MOQ xưởng**, kích thước, thời gian giao, ảnh, thẻ |
| `data/pricing.json` | VAT, bậc chiết khấu theo số lượng, mã giảm giá, bảng giá của công cụ ước giá |
| `data/ui.json` | Chuỗi giao diện Việt / Anh của các tính năng động |
| `data/config.json` | `sheetEndpoint` (link Google Apps Script) và `maxQuoteQty` |

Dữ liệu của người dùng (giỏ báo giá, yêu thích, lịch sử yêu cầu) lưu trong `localStorage` dạng JSON, có thể xuất / nhập bằng tệp `.json`.

## Công thức tính tiền (`js/pricing.js`)
1. Tạm tính = Σ đơn giá × số lượng.
2. Chiết khấu số lượng: từ 5 / 10 / 20 sản phẩm giảm 3% / 5% / 8%.
3. Mã giảm giá (ví dụ `ERICSS10`, đơn từ 20.000.000 ₫) tính trên số tiền sau chiết khấu.
4. VAT 10% tính trên số tiền còn lại. Mọi số tiền làm tròn đến đồng.

Ví dụ: 50 ghế × 6.800.000 ₫ = 340.000.000 ₫, trừ 8% còn 312.800.000 ₫, cộng VAT 10% được **344.080.000 ₫** (có trong unit test).

## Lưu yêu cầu báo giá lên Google Sheet
Website gửi `POST` tới một Google Apps Script (`apps-script/Code.gs`), script ghi mỗi yêu cầu thành một dòng trong Sheet. Cài đặt từng bước: [`apps-script/README.md`](apps-script/README.md).
- Yêu cầu luôn được **lưu trên thiết bị trước**, rồi mới gửi. Mất mạng hoặc chưa cấu hình thì ở trạng thái "chờ đồng bộ", tự gửi lại khi tải trang hoặc bấm "Gửi lại".
- Mỗi yêu cầu có `id` duy nhất; Apps Script bỏ qua `id` đã có nên không bị ghi trùng.
- Cột trong Sheet gồm loại yêu cầu, thông tin khách, sản phẩm, **MOQ xưởng**, **MOQ khách nhập**, `meetsMoq`, danh sách sản phẩm, tổng tiền, lời nhắn.
- Chống bot bằng ô ẩn (honeypot); Apps Script chặn ô bắt đầu bằng `=`, `+`, `-`, `@`.

## Kiến trúc JavaScript (`js/`)
Dùng ES Modules, mỗi tệp một việc:

| Nhóm | Tệp |
|---|---|
| Hạ tầng | `api.js` (fetch JSON), `store.js` (localStorage), `lang.js` (song ngữ), `ui.js` (DOM và định dạng) |
| Hàm thuần có test | `pricing.js`, `filters.js`, `validation.js` |
| Nghiệp vụ | `cart.js`, `quotes.js`, `sheet.js`, `quote-form.js` (biểu mẫu báo giá duy nhất) |
| Giao diện từng trang | `catalog.js`, `estimator.js`, `history.js`, `landing.js`, `cart-ui.js`, `success.js` |
| Khởi động | `main.js` (mỗi trang chỉ chạy phần có markup tương ứng), `site.js` + `site-i18n.js` (menu, song ngữ chung, hiệu ứng) |

Kỹ thuật: `map` / `filter` / `reduce` / `forEach`, event delegation, `async/await`, `try/catch`, debounce, `IntersectionObserver`.

## Chạy thử trên máy
Trang đọc JSON bằng `fetch` nên **không mở trực tiếp file `.html` (địa chỉ `file://`)**, trình duyệt sẽ chặn. Hãy chạy máy chủ web:
```
Windows:  bấm đúp  chay-website.bat       (tự mở http://localhost:8000)
Node.js:  node tools/serve.mjs
Python:   python -m http.server 8000
Test:     node --test "tests/*.test.mjs"   (28 unit test, Node 22 trở lên)
```
Trên GitHub Pages thì không cần làm gì thêm. Mỗi lần push, GitHub Actions chạy test rồi mới deploy.

## Công nghệ
HTML5 semantic · CSS Variables · Flexbox / Grid · [Animate.css](https://animate.style/) · [AOS](https://michalsnik.github.io/aos/) · [GSAP + ScrollTrigger](https://gsap.com/) · JavaScript thuần (ES Modules) · GitHub Actions → GitHub Pages · font Be Vietnam Pro.

## Cấu trúc thư mục
```
index.html  products.html  estimator.html  contact.html
css/        style.css (nền tảng)  features.css (trang dữ liệu)  landing.css (trang chủ)
js/         các module (xem bảng trên)
data/       products.json  pricing.json  ui.json  config.json
assets/     img/ (ảnh)  favicon.svg
apps-script/  Code.gs (nhận yêu cầu, ghi Google Sheet) + hướng dẫn
tests/      3 tệp unit test
tools/      serve.mjs (máy chủ chạy thử)    chay-website.bat
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
| "Viết unit test cho hàm tính tiền với số tính tay" | Làm tròn sai ở biên .5 do số thực (14.662.499,999… thay vì 14.662.500) | Làm tròn bằng `toPrecision(12)` trước, test giữ kết quả đúng |
| "Ô tìm kiếm không phân biệt dấu tiếng Việt" | Chữ "Đ" hoa không khớp vì thay `đ` chạy trước khi hạ chữ thường | Đưa `toLowerCase()` lên trước |
| "Lưu báo giá lên Google Sheet từ web tĩnh" | Apps Script không trả lời CORS preflight, gửi lại có thể ghi trùng | Gửi `text/plain`, dự phòng `no-cors`, `id` duy nhất và script kiểm tra trùng |
| "Gộp form liên hệ và hộp thoại báo giá thành một biểu mẫu" | Hai biểu mẫu khác nhau, form riêng không chọn được sản phẩm | Một module `quote-form.js` dùng chung, sản phẩm chọn bằng ô chọn hoặc tham số `?product=` |
| "Thiết kế lại landing theo skill `design-taste-frontend`" | Bố cục "chữ trái, ảnh phải" quen thuộc | Chạy `draw.mjs` chọn hướng "tên là kiến trúc", giữ bảng màu và font của thương hiệu, sửa đến khi `inspect.mjs` không còn FAIL |
