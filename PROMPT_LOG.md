# NHẬT KÝ PROMPT ENGINEERING (VIBE CODING LOG)

- **Họ và tên:** Nguyễn Đăng Phát
- **MSSV:** 526000162
- **Tên đề tài Website:** Ericss Furniture — Website giới thiệu nhà sản xuất nội thất cao cấp phong cách Châu Âu (danh mục sản phẩm & quy trình sản xuất)
- **Công cụ AI đã sử dụng:** Claude Code (Claude Sonnet 5.5) trong terminal; trình duyệt Chrome (headless) để kiểm tra giao diện; GitHub Actions để deploy

---

## 1. Yêu cầu ban đầu (System/Initial Prompt)

> *Tôi có buổi kiểm tra giữa kỳ môn Thiết kế Web (đề nằm trong file PDF đính kèm). Hãy đọc kỹ nội dung và thang điểm để làm đáp ứng đúng 100% đề. Chủ đề: website sản xuất đồ nội thất Châu Âu cao cấp, có đầy đủ menu, danh mục và phần trình bày quy trình sản xuất. Phong cách tinh gọn, hiện đại, cao cấp; tông màu thiên về light mode, không đại trà. Bắt buộc: Semantic HTML5 (header, nav, main, section/article, footer), CSS Variables + Flexbox/Grid, Animate.css, AOS, hiệu ứng :hover/:focus tự viết. Repo đặt tên Ten_Ho_MSSV, có PROMPT_LOG.md và deploy bằng GitHub Actions lên GitHub Pages.*

---

## 2. Quá trình tinh chỉnh & Giải quyết sự cố (Iteration Iterations)

### Lần 1: Dựng khung Semantic HTML & CSS Variable
- **Prompt đã dùng:** "Dựng `index.html` + `style.css` chuẩn semantic, tối thiểu `<header>`, `<nav>`, `<main>`, `<section>`/`<article>`, `<footer>`. Hạn chế `<div>` vô nghĩa. Khai báo toàn bộ màu, font, spacing trong `:root` bằng CSS Variables. Dùng Grid/Flexbox cho layout."
- **Kết quả AI tạo ra:** Khung trang gồm header (logo + `<nav>`), `<main>` với các `<section>` Hero, About, Collections, Materials, Process, Gallery, Contact và `<footer>`. Danh mục dùng `<ul>` + `<article>`; quy trình dùng `<ol>` (các bước có thứ tự) + `<figure>`; thống kê dùng `<dl>`; thông tin liên hệ dùng `<address>` + `<aside>`. `style.css` có bộ biến `--color-*`, `--font-*`, `--space-*`.
- **Nhận xét & Tinh chỉnh của SV:** Yêu cầu AI chọn thẻ theo đúng ngữ nghĩa thay vì bọc `<div>`: tiêu đề từng khối nằm trong `<header>` của section, các đoạn trong form dùng `<p>` + `<label>` thay vì `<div>`, thêm `aria-label`/`aria-labelledby` cho các vùng điều hướng và section.

### Lần 2: Định hướng thẩm mỹ "light – cao cấp – không đại trà"
- **Prompt đã dùng:** "Tông nền sáng ấm (ivory), chữ đen than, một màu nhấn đồng/teak. Font dễ đọc, hiển thị tiếng Việt có dấu rõ ràng. Nhiều khoảng trắng, viền mảnh, không dùng gradient sặc sỡ hay bố cục template quen thuộc."
- **Kết quả AI tạo ra:** Bảng màu `--color-bg: #faf8f4`, `--color-ink: #1f1d1a`, `--color-primary: #8a6a43`; font Be Vietnam Pro (thiết kế riêng cho tiếng Việt, dấu rõ nét, dễ đọc) cho cả tiêu đề lẫn nội dung — ban đầu thử Cormorant Garamond + Inter nhưng chữ serif mảnh khó đọc, đã đổi lại; tiêu đề hero lớn với chữ nghiêng nhấn màu; khung viền mảnh lệch sau ảnh hero.
- **Nhận xét & Tinh chỉnh của SV:** Giữ chữ in hoa giãn cách cho nhãn nhỏ (eyebrow) để tạo cảm giác tạp chí nội thất; yêu cầu bỏ bớt đổ bóng nặng, chỉ dùng một biến `--shadow` mềm cho toàn site.

### Lần 3: Tích hợp thư viện Animate.css & AOS
- **Prompt đã dùng:** "Thêm Animate.css cho eyebrow, tiêu đề hero, đoạn mô tả và nút CTA (xuất hiện lần lượt bằng `animate__delay-*`). Thêm AOS cho các section nội dung bên dưới. Hiệu ứng nhẹ, chạy một lần, không gây rối mắt."
- **Kết quả AI tạo ra:** Hero dùng `animate__fadeInUp` với độ trễ tăng dần, ảnh hero dùng `animate__fadeIn animate__slow`. Các section dùng `data-aos="fade-up|fade-right|fade-left|zoom-in"` với `data-aos-delay` 100–300ms. `script.js` gọi `AOS.init({ duration: 800, once: true })`.
- **Thách thức gặp phải:** Khi chụp thử trang bằng Chrome headless, nhiều khối nội dung hiện trống vì AOS mặc định đặt `opacity: 0` cho `[data-aos]` cho đến khi phần tử vào khung nhìn. Nếu CDN lỗi hoặc tắt JavaScript thì nội dung sẽ bị ẩn vĩnh viễn.
- **Cách sửa prompt (Debug prompt):** "Đảm bảo nội dung vẫn hiển thị khi AOS không tải được hoặc tắt JS; thêm `prefers-reduced-motion` để giảm hiệu ứng cho người dùng nhạy cảm chuyển động; kiểm thử bằng cách cuộn trang thật rồi chụp ảnh." → AI thêm `<noscript>` ghi đè `[data-aos]`, thêm khối `@media (prefers-reduced-motion: reduce)` và kiểm thử bằng puppeteer (cuộn từng đoạn rồi chụp), xác nhận không có lỗi console/request.

### Lần 4: Hiệu ứng :hover / :focus tự viết bằng CSS
- **Prompt đã dùng:** "Tự viết hover và focus-visible cho nút, thẻ danh mục (card), nút lọc gallery, link menu và ô nhập form. Không dùng thư viện cho phần này."
- **Kết quả AI tạo ra:** Nút `.btn` đổi màu và nhấc nhẹ; `.card` nâng lên, đổi viền, ảnh phóng nhẹ, link giãn chữ; menu có gạch chân chạy từ trái; ảnh gallery hiện caption khi hover/focus; ô form đổi màu viền dưới khi focus; `:focus-visible` có outline rõ ràng.
- **Nhận xét & Tinh chỉnh của SV:** Card ban đầu chỉ phản ứng khi hover chuột nên đã yêu cầu thêm `tabindex="0"` và `:focus-within` để điều hướng bằng bàn phím cũng thấy hiệu ứng tương đương.

### Lần 5: Chọn hình ảnh phù hợp (tránh ảnh nhận diện công ty)
- **Prompt đã dùng:** "Không dùng các ảnh đặc thù lộ ra công ty gốc (cổng, nhà xưởng, container, showroom). Chỉ dùng ảnh trên mạng hoặc ảnh trong quá trình sản xuất."
- **Kết quả AI tạo ra:** Loại bỏ ảnh cổng, mặt tiền, xe container và ảnh toàn cảnh showroom. Giữ lại ảnh công đoạn sản xuất (cưa, CNC, cắt laser, uốn, hàn robot, đan tay) và ảnh cận cảnh vật liệu.
- **Thách thức gặp phải:** Các ảnh stock tìm được trên Unsplash đều thuộc gói Unsplash+ (trả phí), không phù hợp để dùng miễn phí.
- **Cách sửa prompt (Debug prompt):** "Nếu không có ảnh miễn phí rõ nguồn thì dùng ảnh sản xuất và cận cảnh chất liệu." → Hero được cắt từ ảnh cận cảnh dây thừng + khung teak; đã nén ảnh về ≤ 1500px (JPEG ~80%) để trang tải nhanh.

### Lần 6: Đổi thương hiệu & thông tin doanh nghiệp
- **Prompt đã dùng:** "Không dùng thông tin của công ty thật; đặt tên website là Ericss Furniture, thay các thông tin liên quan sang thông tin khác."
- **Kết quả AI tạo ra:** Đổi logo/tiêu đề/favicon thành Ericss, thay năm thành lập, số liệu và bỏ liên kết tới website công ty thật; rà soát lại toàn bộ file để không còn từ khóa cũ.
- **Nhận xét & Tinh chỉnh của SV:** Số liệu giới thiệu là nội dung giả lập phục vụ bài thi; sau đó cập nhật phần liên hệ sang email cá nhân `nguyendangphat1505@gmail.com` và địa điểm Biên Hòa, Đồng Nai, đồng thời bỏ số điện thoại giả.

### Lần 7: Triển khai GitHub Actions → GitHub Pages
- **Prompt đã dùng:** "Deploy bằng GitHub Actions: workflow chạy khi push lên `main`, dùng `actions/configure-pages`, `upload-pages-artifact`, `deploy-pages`, quyền tối thiểu `pages: write` và `id-token: write`."
- **Kết quả AI tạo ra:** File `.github/workflows/deploy.yml` triển khai toàn bộ thư mục gốc (site tĩnh, không cần build).
- **Thách thức gặp phải:** Pages phải được bật với nguồn là "GitHub Actions" thì workflow mới deploy được.
- **Cách sửa prompt (Debug prompt):** "Bật Pages với `build_type=workflow` qua GitHub CLI rồi chạy lại workflow và kiểm tra link live trả về HTTP 200."

### Lần 8: Song ngữ Việt – Anh (mặc định tiếng Việt)
- **Prompt đã dùng:** "Làm website song ngữ, mặc định tiếng Việt, có nút chuyển sang tiếng Anh. Giữ HTML semantic, không nhân đôi trang, nhớ lựa chọn của người dùng."
- **Kết quả AI tạo ra:** Nội dung tiếng Việt nằm trực tiếp trong `index.html` (`lang="vi"`), mỗi phần tử cần dịch có thuộc tính `data-i18n` (kèm `data-i18n-alt`/`-aria` cho `alt` và `aria-label`). File `i18n.js` chứa bản tiếng Anh; `script.js` đổi nội dung, `<title>`, `<meta description>` và thuộc tính `lang` của trang, lưu lựa chọn vào `localStorage`. Nút VI/EN dùng `aria-pressed`.
- **Thách thức gặp phải:** Lần đầu AI để tiếng Anh làm nguồn trong HTML, khiến trang nhấp nháy tiếng Anh trước khi JS đổi sang tiếng Việt; thêm vào đó vài chuỗi như số liệu, tên thương hiệu không cần dịch nhưng bị gắn khóa.
- **Cách sửa prompt (Debug prompt):** "Mặc định là tiếng Việt, nên HTML phải chứa sẵn tiếng Việt, JS chỉ đổi sang tiếng Anh khi cần; bỏ các khóa dịch cho thương hiệu, số liệu và địa chỉ email." → AI đảo nguồn nội dung sang tiếng Việt, dọn các khóa thừa và kiểm thử đổi qua lại VI ↔ EN, tải lại trang vẫn giữ đúng ngôn ngữ.

### Lần 9: GitHub ở footer + hộp thoại (dialog)
- **Prompt đã dùng:** "Thêm GitHub vào footer, bấm vào mở hộp thoại liệt kê tài khoản tác giả, repository và nhật ký prompt. Dùng thẻ `<dialog>` gốc, hỗ trợ bàn phím."
- **Kết quả AI tạo ra:** Nút GitHub (biểu tượng SVG) trong footer mở `<dialog>` bằng `showModal()`; đóng bằng nút ×, bấm nền mờ hoặc phím Esc; có animation vào nhẹ và `::backdrop` làm mờ. Nội dung hộp thoại cũng được dịch qua `data-i18n`.
- **Nhận xét & Tinh chỉnh của SV:** Yêu cầu dùng `<dialog>` thay vì tự dựng `div` modal để có sẵn focus trap và `aria-modal`. Khi kiểm thử trên mobile phát hiện các khối AOS `fade-left` khiến trang tràn ngang trước khi hiện, nên thêm `overflow-x: clip` cho `body`.

### Lần 10: Đổi tông màu & làm mới Hero Section
- **Prompt đã dùng:** "Tông màu thiên về trắng – đen, pha nâu sang trọng làm điểm nhấn; các khối nền đen đang quá đen. Làm hero hiện đại, độc lạ hơn, không theo mẫu 'chữ bên trái, ảnh bên phải' quen thuộc."
- **Kết quả AI tạo ra:** Thử 3 phương án nền (than xám, nâu cognac, be sáng) và chọn dải thống kê nâu cognac chữ trắng, footer đen dịu. Hero mới: ảnh chính cắt hình vòm (`border-radius` lớn), ảnh nhỏ chồng lệch có viền trắng và đĩa màu cát phía sau. Sau đó SV yêu cầu bỏ huy hiệu tròn xoay và dải chữ chạy ngang dưới hero cho gọn, nên AI đã gỡ cả HTML, CSS lẫn khóa dịch tương ứng. Hiệu ứng vào dùng Animate.css (`fadeIn`, `fadeInUp` có độ trễ).
- **Thách thức gặp phải:** Lần đầu tiêu đề quá lớn (5 dòng) và chú thích dọc bị cắt.
- **Cách sửa prompt (Debug prompt):** "Giảm cỡ tiêu đề để hero vừa một màn hình; bỏ chú thích dọc." → AI chỉnh lại `clamp()` cỡ chữ, và chụp kiểm tra lại ở desktop, tablet, mobile (không tràn ngang, chuyển VI/EN vẫn đúng).

### Lần 11: Thêm các hiệu ứng cơ bản, hiện đại
- **Prompt đã dùng:** "Thêm vài hiệu ứng cơ bản nhưng hiện đại: thanh tiến trình cuộn, header đổi trạng thái khi cuộn, số liệu đếm lên, ảnh hiện dần, nút về đầu trang. Dùng JavaScript thuần, tôn trọng `prefers-reduced-motion`, không lạm dụng."
- **Kết quả AI tạo ra:** Thanh tiến trình `scaleX` theo vị trí cuộn; header đổ bóng khi cuộn; các số liệu 2008 / 120 / 15.000 m² / 4 đếm lên bằng `requestAnimationFrame` khi vào khung nhìn; ảnh quy trình, thư viện, danh mục "mở" dần bằng `clip-path`; parallax nhẹ ở ảnh hero; nút về đầu trang (có `aria-label` song ngữ). Sự kiện cuộn được gom qua `requestAnimationFrame`.
- **Thách thức gặp phải:** Hiệu ứng `clip-path` không bao giờ chạy: `IntersectionObserver` coi phần tử đang bị cắt hết là không giao với khung nhìn nên không kích hoạt.
- **Cách sửa prompt (Debug prompt):** "Quan sát phần tử cha thay vì chính phần tử đang bị `clip-path` che; kiểm thử bằng cách cuộn hết trang và đếm số phần tử đã hiện." → AI đổi sang quan sát phần tử cha; kiểm tra lại cả 19 ảnh đều hiện sau khi cuộn, và khi bật `prefers-reduced-motion` thì các hiệu ứng tự tắt.

### Lần 12: Tích hợp thêm thư viện animation ngoài & làm hover mượt hơn
- **Prompt đã dùng:** "Tích hợp thêm vài thư viện animation bên ngoài (CDN), và làm các hiệu ứng hover/chuyển động mượt mà hơn. Vẫn phải giữ Animate.css và AOS, không lạm dụng, tôn trọng `prefers-reduced-motion`."
- **Kết quả AI tạo ra:** Thêm **GSAP + ScrollTrigger** (parallax nhiều lớp ở hero, ảnh phần giới thiệu trượt trong khung, nút "từ tính" bám theo con trỏ); **vanilla-tilt** (thẻ danh mục nghiêng 3D nhẹ kèm ánh phản chiếu). CSS: nút có lớp màu quét từ trái sang, thời gian transition kéo dài và dùng chung một đường cong easing, ảnh phóng chậm hơn, bộ lọc gallery có hiệu ứng ảnh hiện lần lượt.
- **Thách thức gặp phải:** Hover cũ của nút và thẻ dùng `transform` trong CSS xung đột với `transform` mà GSAP/vanilla-tilt gán trực tiếp; nút từ tính kéo quá mạnh làm chạm nút bên cạnh.
- **Cách sửa prompt (Debug prompt):** "Thư viện nào giữ `transform` của phần tử thì CSS hover không được dùng `transform` nữa; giảm hệ số từ tính." → AI chuyển hover của nút sang hiệu ứng `::before` + `box-shadow`, của thẻ sang `box-shadow` + viền, và kiểm thử bằng trình duyệt thật (điều hướng neo, nghiêng thẻ, nút từ tính, lọc gallery, mở/đóng dialog, không lỗi console). Khi bật `prefers-reduced-motion` thì GSAP và vanilla-tilt không khởi chạy.
- **Điều chỉnh sau đó của SV:** Đọc lại đề thấy yêu cầu "không lạm dụng gây rối mắt" nên SV yêu cầu bỏ Lenis (cuộn quán tính) vì làm thay đổi cảm giác cuộn trang; cuộn mượt khi bấm menu được giữ bằng `scroll-behavior: smooth` trong CSS.

### Lần 13: Nâng landing page thành website nhiều trang có dữ liệu JSON
- **Prompt đã dùng:** "Đọc rubric chấm điểm (UI/UX, Kỹ thuật JS/DOM, Logic dữ liệu JSON, Agile/Git, Vibe Coding). Đề xuất và làm thêm tính năng cho landing page chỉ bằng HTML/CSS/JS: lưu dữ liệu bằng JSON, dùng `map`/`filter`/`reduce`, xử lý sự kiện chuẩn, code chia module. Chia thành các trang riêng, đừng nhồi tất cả vào `index.html`."
- **Kết quả AI tạo ra:** 3 trang mới (`products.html`, `estimator.html`, `contact.html`) dùng chung header/footer/giỏ báo giá. Dữ liệu nằm trong `data/*.json` (sản phẩm, bảng giá, chuỗi giao diện song ngữ). Mã JS chia module trong `js/`: `api`, `store`, `lang`, `ui`, `cart`, `catalog`, `estimator`, `quote`; các hàm tính toán (`pricing.js`), lọc (`filters.js`), kiểm tra form (`validation.js`) là hàm thuần để viết unit test. Có giỏ báo giá với chiết khấu số lượng, mã giảm giá, VAT; lịch sử yêu cầu lưu `localStorage` và xuất/nhập JSON.
- **Thách thức gặp phải:** (1) Làm tròn tiền sai ở biên .5 vì sai số số thực (ví dụ 14.662.499,999… thay vì 14.662.500) khiến giá ước tính lệch 1.000 ₫; (2) Ô tìm kiếm không khớp khi gõ chữ "Đ" hoa vì `.replace(/đ/g)` chạy trước `.toLowerCase()`; (3) `script.js` cũ giả định mọi phần tử đều có mặt nên sẽ báo lỗi khi dùng ở trang khác; (4) Nút lọc gallery cũ dùng class `.filter` trùng với bộ lọc sản phẩm mới.
- **Cách sửa prompt (Debug prompt):** "Viết unit test bằng `node:test` cho các hàm tính tiền với giá trị tính tay, rồi sửa hàm cho đến khi đúng" → test bắt được lỗi (1) và (2); sửa bằng `toPrecision(12)` trước khi làm tròn và đưa `toLowerCase()` lên trước. "Mọi tính năng phải tự kiểm tra phần tử tồn tại trước khi chạy và dùng class riêng" → bổ sung kiểm tra trong `script.js` / `main.js`, đổi sang class `.chip`. Sau cùng kiểm thử toàn bộ luồng bằng trình duyệt thật (tìm kiếm → thêm giỏ → mã giảm giá → ước giá → gửi yêu cầu → xuất/nhập JSON → đổi ngôn ngữ → mobile): 37/37 kiểm tra đạt, không lỗi console.

### Lần 14: Gửi báo giá theo từng sản phẩm (có MOQ), lưu lên Google Sheet, thêm 26 sản phẩm mẫu
- **Prompt đã dùng:** "Lưu dữ liệu lên Google Sheet, truyền yêu cầu báo giá qua đó. Làm một trang danh sách sản phẩm, gửi báo giá ngay ở từng sản phẩm và cho khách nhập MOQ của họ. Tạo 20–30 sản phẩm mẫu."
- **Kết quả AI tạo ra:** `data/products.json` 26 sản phẩm (SKU, giá, MOQ xưởng, kích thước, thời gian giao, tên và mô tả song ngữ); trang sản phẩm có phân trang "Xem thêm", tìm theo SKU và nút "Gửi báo giá" trên từng thẻ. Hộp thoại báo giá (`<dialog>`) cho khách nhập số lượng đặt, báo ngay đạt hay chưa đạt MOQ của xưởng và tạm tính (chiết khấu, VAT). Việc gửi lên Google Sheet dùng Google Apps Script (`apps-script/Code.gs`): web app nhận `POST`, ghi một dòng cho mỗi yêu cầu, bỏ qua `id` đã có, chặn công thức độc hại. Phía website: `sheet.js` (gửi), `quotes.js` (tạo bản ghi, lưu JSON, đồng bộ lại), trạng thái "đã ghi Sheet / chờ / chưa gửi được" trong lịch sử.
- **Thách thức gặp phải:** (1) Apps Script không trả lời được yêu cầu kiểm tra CORS (preflight) và trình duyệt có thể chặn đọc phản hồi chuyển hướng; (2) gửi lại có nguy cơ ghi trùng dòng; (3) mất mạng làm mất yêu cầu; (4) bot có thể gửi rác; (5) tôi (AI) không thể tự tạo Google Sheet hay triển khai Apps Script thay SV.
- **Cách sửa prompt (Debug prompt):** "Gửi `POST` dạng `text/plain` để không bị preflight; nếu đọc phản hồi bị chặn thì gửi lại kiểu `no-cors`, và để không ghi trùng thì mỗi yêu cầu có `id` duy nhất, script kiểm tra `id` trước khi ghi" → AI thêm cơ chế gửi dự phòng và chống trùng. "Luôn lưu cục bộ trước rồi mới gửi, thất bại thì giữ trạng thái chờ và tự gửi lại" → thêm `syncPending()` khi tải trang và nút "Gửi lại". "Thêm ô ẩn chống bot và chặn ô bắt đầu bằng = + - @" → honeypot ở client, `clean()` ở Apps Script. Với (5), AI viết sẵn `Code.gs` và hướng dẫn 7 bước trong `apps-script/README.md` để SV tự triển khai bằng tài khoản Google của mình. Kiểm thử bằng một máy chủ giả lập Apps Script (cả kiểu có CORS, bị chặn CORS, mất kết nối rồi gửi lại) cùng unit test cho cấu trúc dòng gửi lên Sheet.

---

## 3. Đánh giá cá nhân về quá trình Vibe Coding

- **AI đã giúp bạn tiết kiệm thời gian ở phần nào nhất?**
  Dựng nhanh khung semantic HTML, bộ CSS Variables nhất quán, tối ưu và đặt tên ảnh, cấu hình workflow deploy và kiểm tra trang trên nhiều kích thước màn hình (desktop/mobile, không bị tràn ngang).
- **Bài học rút ra khi đặt câu hỏi (Prompt) cho AI trong thiết kế web?**
  1. Nêu rõ ràng ràng buộc kỹ thuật ngay từ prompt đầu (thẻ semantic, CSS Variables, thư viện bắt buộc) để AI không lạm dụng `<div>`.
  2. Mô tả phong cách bằng đặc điểm cụ thể (màu, font, khoảng trắng, cái cần tránh) thay vì chỉ nói "đẹp, cao cấp".
  3. Luôn yêu cầu AI tự kiểm thử (chụp ảnh, kiểm tra console) và nêu rõ tình huống lỗi (AOS ẩn nội dung, CDN lỗi) để được sửa đúng gốc.
  4. Chia nhỏ yêu cầu theo từng vòng lặp (khung → thẩm mỹ → hiệu ứng → nội dung → deploy) giúp kiểm soát kết quả tốt hơn một prompt quá dài.
