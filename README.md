# Ericss Furniture — Web Design Midterm

Website giới thiệu nhà sản xuất nội thất cao cấp phong cách Châu Âu (danh mục, vật liệu, quy trình sản xuất).

- **Sinh viên:** Nguyễn Đăng Phát — MSSV 526000162
- **Học phần:** Thiết kế Web — Trường Đại học Lạc Hồng
- **Live preview:** https://nguyenphat006.github.io/Phat_NguyenDang_526000162/
- **Nhật ký Prompt:** [PROMPT_LOG.md](PROMPT_LOG.md)

## Các trang
| Trang | Nội dung |
|---|---|
| `index.html` | Landing page: giới thiệu, bộ sưu tập, vật liệu, quy trình sản xuất, thư viện ảnh |
| `products.html` | Danh sách 26 sản phẩm đọc từ `data/products.json`: tìm kiếm (tên, chất liệu, SKU), lọc theo chất liệu và giá, sắp xếp, phân trang "Xem thêm", yêu thích, xem chi tiết. **Mỗi sản phẩm có nút "Gửi báo giá"**: khách nhập số lượng đặt (MOQ của khách), thấy ngay MOQ của xưởng, tạm tính và gửi yêu cầu |
| `estimator.html` | Ước giá: chọn loại, chất liệu, kích thước, lớp hoàn thiện, số lượng để xem giá, chiết khấu, VAT, thời gian sản xuất |
| `contact.html` | **Cùng một biểu mẫu báo giá như hộp thoại** nhưng đặt sẵn trên trang: chọn sản phẩm (hoặc dự án tùy chỉnh), nhập MOQ, xem tạm tính, đính kèm giỏ báo giá; bên dưới là lịch sử yêu cầu kèm trạng thái đồng bộ Google Sheet (gửi lại, xuất / nhập JSON) |

Giỏ báo giá (ngăn kéo bên phải) và ngôn ngữ Việt – Anh dùng chung trên mọi trang.

## Dữ liệu JSON
- `data/products.json`: 26 sản phẩm mẫu (SKU, tên và mô tả song ngữ, giá, **MOQ của xưởng**, kích thước, thời gian giao, ảnh, thẻ). Ảnh dùng lại nhiều lần; thay đường dẫn `image` bằng ảnh thật khi có.
- `data/config.json`: `sheetEndpoint` (link Google Apps Script) và `maxQuoteQty`.
- `data/pricing.json`: VAT, bậc chiết khấu theo số lượng, mã giảm giá, bảng giá cho công cụ ước giá.
- `data/ui.json`: toàn bộ chuỗi giao diện Việt – Anh của các tính năng động.
- Dữ liệu người dùng (giỏ báo giá, yêu thích, lịch sử yêu cầu) lưu trong `localStorage` dưới dạng JSON và có thể xuất / nhập bằng tệp `.json`.

## Lưu yêu cầu báo giá lên Google Sheet
Website tĩnh gửi `POST` tới một Google Apps Script (`apps-script/Code.gs`), script ghi mỗi yêu cầu thành một dòng trong Sheet. Hướng dẫn cài đặt từng bước: [`apps-script/README.md`](apps-script/README.md).
- Yêu cầu luôn được **lưu trên thiết bị trước**, sau đó mới gửi; mất mạng hoặc chưa cấu hình thì ở trạng thái "chờ đồng bộ" / "chưa kết nối Sheet" và tự gửi lại khi tải trang, hoặc bấm "Gửi lại".
- Mỗi yêu cầu có `id` duy nhất; Apps Script bỏ qua `id` đã có nên gửi lại không bị trùng dòng.
- Các cột gồm loại yêu cầu, thông tin khách, sản phẩm, **MOQ xưởng**, **MOQ khách nhập**, `meetsMoq` (đạt MOQ hay không), danh sách sản phẩm, tổng tiền, lời nhắn.
- Chống bot bằng ô ẩn (honeypot); Apps Script chặn ô văn bản bắt đầu bằng `=`, `+`, `-`, `@`.

## Công thức tính tiền (`js/pricing.js`)
1. Tạm tính = Σ đơn giá × số lượng.
2. Chiết khấu số lượng: từ 5 / 10 / 20 sản phẩm giảm 3% / 5% / 8%.
3. Mã giảm giá (VD `ERICSS10`, đơn từ 20.000.000 ₫) tính trên số tiền sau chiết khấu.
4. VAT 10% tính trên số tiền còn lại. Mọi số tiền làm tròn đến đồng.

## Kiến trúc JavaScript (`js/`)
`api.js` (fetch JSON) · `store.js` (localStorage JSON) · `lang.js` (song ngữ) · `ui.js` (DOM, định dạng) · `pricing.js`, `filters.js`, `validation.js` (hàm thuần, có test) · `sheet.js` (gửi lên Google Sheet) · `quotes.js` (tạo, lưu, đồng bộ yêu cầu) · `cart.js` · `cart-ui.js` · `catalog.js` · `quote-form.js` (biểu mẫu báo giá duy nhất: chọn sản phẩm, MOQ, tạm tính; dùng trong hộp thoại và trang Liên hệ) · `success.js` · `history.js` (lịch sử, xuất/nhập JSON) · `estimator.js` · `main.js` (khởi tạo theo từng trang). Dùng ES Modules, `map` / `filter` / `reduce` / `forEach`, event delegation, `async/await`, `try/catch`.

## Chạy thử trên máy
Vì trang đọc tệp JSON bằng `fetch`, **không mở trực tiếp file `.html` (địa chỉ `file://`)** vì trình duyệt sẽ chặn và danh sách sản phẩm không hiện ra. Hãy chạy một máy chủ web:
```
Windows: bấm đúp  chay-website.bat      (tự mở http://localhost:8000)
hoặc:    npm start                      (Node.js)
hoặc:    python -m http.server 8000     (Python)
npm test                                (28 unit test, Node 18+)
```
Trên GitHub Pages thì không cần làm gì thêm.

## Tính năng chung
- Song ngữ Việt – Anh (mặc định tiếng Việt), nhớ lựa chọn người dùng.
- Footer có nút GitHub mở hộp thoại `<dialog>` (tài khoản tác giả, repository, nhật ký prompt).
- Tôn trọng `prefers-reduced-motion`; responsive từ điện thoại đến máy tính.

## Công nghệ
HTML5 semantic · CSS Variables · Flexbox/Grid · [Animate.css](https://animate.style/) · [AOS](https://michalsnik.github.io/aos/) · [GSAP + ScrollTrigger](https://gsap.com/) · [vanilla-tilt](https://micku7zu.github.io/vanilla-tilt.js/) · JavaScript thuần (ES Modules) · Deploy bằng GitHub Actions → GitHub Pages (chạy test trước khi deploy).

## Cấu trúc
```
index.html  products.html  estimator.html  contact.html
style.css   features.css   script.js (hiệu ứng, song ngữ chung)   i18n.js
js/         (module các tính năng)
serve.mjs  chay-website.bat (chạy thử trên máy)
apps-script/ Code.gs (nhận yêu cầu, ghi Google Sheet) + hướng dẫn cài đặt
data/       products.json  pricing.json  ui.json
tests/      pricing.test.mjs  filters-validation.test.mjs  quotes-sheet.test.mjs
assets/     (img/, favicon.svg)
PROMPT_LOG.md
.github/workflows/deploy.yml
```
