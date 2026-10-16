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
| `products.html` | Danh mục sản phẩm đọc từ `data/products.json`: tìm kiếm, lọc theo chất liệu và giá, sắp xếp, yêu thích, xem chi tiết, thêm vào giỏ báo giá |
| `estimator.html` | Ước giá: chọn loại, chất liệu, kích thước, lớp hoàn thiện, số lượng để xem giá, chiết khấu, VAT, thời gian sản xuất |
| `contact.html` | Form yêu cầu báo giá có kiểm tra hợp lệ, đính kèm giỏ báo giá, lịch sử yêu cầu (xuất / nhập JSON) |

Giỏ báo giá (ngăn kéo bên phải) và ngôn ngữ Việt – Anh dùng chung trên mọi trang.

## Dữ liệu JSON
- `data/products.json`: 8 sản phẩm (tên, mô tả song ngữ, giá, kích thước, thời gian giao, ảnh, thẻ).
- `data/pricing.json`: VAT, bậc chiết khấu theo số lượng, mã giảm giá, bảng giá cho công cụ ước giá.
- `data/ui.json`: toàn bộ chuỗi giao diện Việt – Anh của các tính năng động.
- Dữ liệu người dùng (giỏ báo giá, yêu thích, lịch sử yêu cầu) lưu trong `localStorage` dưới dạng JSON và có thể xuất / nhập bằng tệp `.json`.

## Công thức tính tiền (`js/pricing.js`)
1. Tạm tính = Σ đơn giá × số lượng.
2. Chiết khấu số lượng: từ 5 / 10 / 20 sản phẩm giảm 3% / 5% / 8%.
3. Mã giảm giá (VD `ERICSS10`, đơn từ 20.000.000 ₫) tính trên số tiền sau chiết khấu.
4. VAT 10% tính trên số tiền còn lại. Mọi số tiền làm tròn đến đồng.

## Kiến trúc JavaScript (`js/`)
`api.js` (fetch JSON) · `store.js` (localStorage JSON) · `lang.js` (song ngữ) · `ui.js` (DOM, định dạng) · `pricing.js` và `filters.js` và `validation.js` (hàm thuần, có test) · `cart.js` · `cart-ui.js` · `catalog.js` · `estimator.js` · `quote.js` · `main.js` (khởi tạo theo từng trang). Dùng ES Modules, `map` / `filter` / `reduce` / `forEach`, event delegation, `async/await`, `try/catch`.

## Chạy thử trên máy
Vì trang đọc tệp JSON bằng `fetch`, cần mở qua máy chủ web (không mở trực tiếp `file://`):
```
python -m http.server 8000     # rồi mở http://localhost:8000
npm test                       # chạy 20 unit test (Node 18+)
```

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
data/       products.json  pricing.json  ui.json
tests/      pricing.test.mjs  filters-validation.test.mjs
assets/     (img/, favicon.svg)
PROMPT_LOG.md
.github/workflows/deploy.yml
```
