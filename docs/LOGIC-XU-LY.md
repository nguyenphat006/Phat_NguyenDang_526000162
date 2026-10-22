# Logic xử lý các tính năng và nghiệp vụ

Tài liệu này giải thích **website xử lý từng việc như thế nào**: luồng đi của dữ liệu, các quy tắc, con số cụ thể, nằm ở tệp nào, và giới hạn của từng cách làm. Mục tiêu là để bạn tự giải thích được khi bị hỏi "tại sao làm vậy" và "nếu người dùng làm X thì sao".

Mọi con số trong tài liệu được lấy từ mã nguồn hiện tại. Khi đổi mã, hãy đối chiếu lại các tệp được nêu ở từng mục.

## Mục lục
1. [Bức tranh chung: dữ liệu đi đâu](#1-bức-tranh-chung-dữ-liệu-đi-đâu)
2. [Gửi yêu cầu báo giá (luồng chính)](#2-gửi-yêu-cầu-báo-giá-luồng-chính)
3. [Chặn spam (chi tiết)](#3-chặn-spam-chi-tiết)
4. [Email cảm ơn và mã QR](#4-email-cảm-ơn-và-mã-qr)
5. [Tính giá: chiết khấu, mã giảm giá, VAT, MOQ](#5-tính-giá-chiết-khấu-mã-giảm-giá-vat-moq)
6. [Ước giá theo cấu hình](#6-ước-giá-theo-cấu-hình)
7. [Giỏ báo giá, yêu thích, lịch sử, xuất Excel](#7-giỏ-báo-giá-yêu-thích-lịch-sử-xuất-excel)
8. [Tìm kiếm, lọc, sắp xếp sản phẩm](#8-tìm-kiếm-lọc-sắp-xếp-sản-phẩm)
9. [So sánh sản phẩm](#9-so-sánh-sản-phẩm)
10. [Song ngữ Việt · Anh](#10-song-ngữ-việt--anh)
11. [Modal xem ảnh, chấm điều hướng, hiệu ứng](#11-modal-xem-ảnh-chấm-điều-hướng-hiệu-ứng)
12. [Bảng tra nhanh: tham số nằm ở đâu](#12-bảng-tra-nhanh-tham-số-nằm-ở-đâu)

---

## 1. Bức tranh chung: dữ liệu đi đâu

Website là trang tĩnh (HTML, CSS, JavaScript thuần), không có máy chủ riêng. Có ba nơi chứa dữ liệu:

| Nơi | Chứa gì | Ai đọc được |
|---|---|---|
| `data/*.js` (trong mã nguồn) | Sản phẩm, bảng giá, chuỗi giao diện, cấu hình | Mọi người (công khai) |
| `localStorage` của trình duyệt khách | Giỏ, yêu thích, so sánh, lịch sử yêu cầu, ngôn ngữ, nhịp gửi | Chỉ trình duyệt đó |
| Google Sheet của chủ website (qua Apps Script) | Các yêu cầu báo giá đã gửi | Chủ Sheet |

Các khóa `localStorage` (tiền tố `ericss:`): `cart`, `coupon`, `wishlist`, `compare`, `quotes`, `submits`. Riêng ngôn ngữ lưu ở khóa `ericss-lang`. Mọi thao tác đọc/ghi đi qua `js/store.js`, bọc `try/catch` nên trình duyệt chặn lưu trữ hoặc dữ liệu hỏng cũng không làm sập trang (trả về giá trị mặc định).

**Cách các mô-đun gọi nhau.** Mỗi tệp `js/*.js` là một hàm tự gọi (IIFE) gắn vào `window.Ericss` (ví dụ `Ericss.pricing`). Các trang nạp bằng thẻ `<script>` thường theo đúng thứ tự (xem cuối mỗi trang HTML), nên mở thẳng file cũng chạy. `js/main.js` nạp sau cùng và khởi động từng phần: ngôn ngữ, giỏ, biểu mẫu báo giá, danh mục, ước giá, lịch sử, rồi gửi lại các yêu cầu chưa đồng bộ. Mỗi phần tự kiểm tra trang hiện tại có phần tử của nó không, nếu không thì bỏ qua.

**Nguyên tắc thiết kế:** các hàm tính toán (giá, lọc, kiểm tra biểu mẫu) là **hàm thuần**, không đụng DOM hay lưu trữ. Cùng đầu vào luôn cho cùng kết quả, nên dễ kiểm tra bằng cách gọi hàm với số.

---

## 2. Gửi yêu cầu báo giá (luồng chính)

Có **một biểu mẫu duy nhất** (`js/quote-form.js`), dùng ở hai nơi: hộp thoại trên trang Sản phẩm và biểu mẫu trên trang Liên hệ. Nhờ vậy dữ liệu gửi đi luôn cùng một dạng.

### 2.1 Ba loại yêu cầu

| Loại (`type`) | Khi nào | Bắt buộc gì |
|---|---|---|
| `product` | Khách chọn một sản phẩm | Họ tên, email, số lượng muốn đặt (MOQ của khách) từ 1 đến `maxQuoteQty` (100.000) |
| `cart` | Khách tích "đính kèm giỏ báo giá" (và không chọn sản phẩm) | Họ tên, email |
| `contact` | Dự án tùy chỉnh, không có sản phẩm | Họ tên, email, lời nhắn ít nhất 10 ký tự |

Loại được quyết định trong `quote-form.js`: có tích giỏ thì `cart`, nếu không mà có chọn sản phẩm thì `product`, còn lại là `contact`. Một yêu cầu có thể vừa có sản phẩm vừa kèm giỏ: các dòng được gộp, cùng sản phẩm thì cộng dồn số lượng (hàm `collectLines`).

### 2.2 Quy tắc kiểm tra dữ liệu (`js/validation.js`)

- Họ tên: ít nhất 2 ký tự (sau khi cắt khoảng trắng).
- Email: khớp `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
- Số điện thoại: không bắt buộc; nếu có thì khớp `^\+?[\d\s().-]{8,18}$`.
- Số lượng (khi có sản phẩm): số nguyên từ 1 đến `maxQuoteQty`.
- Lỗi hiển thị ngay dưới ô, ô được đánh dấu `aria-invalid`; lỗi tự mất khi người dùng sửa đúng.

### 2.3 Luồng gửi (`js/quotes.js` + `js/sheet.js`)

```
Bấm "Gửi"
  → kiểm tra dữ liệu (validation)           không hợp lệ: báo lỗi, dừng
  → kiểm tra nhịp gửi trên thiết bị         quá nhanh / quá nhiều: báo, dừng   (xem mục 3.1)
  → tạo bản ghi yêu cầu (có id, fillMs)
  → LƯU VÀO localStorage TRƯỚC             sync = 'pending'
  → gửi lên Apps Script (POST)
        thành công            → sync = 'sent'
        server từ chối spam   → sync = 'limited'  (không gửi lại)
        lỗi mạng / lỗi khác   → sync = 'failed'   (gửi lại sau)
        chưa cấu hình link    → sync = 'disabled'
  → hiện màn hình xác nhận + mã QR
```

**Lưu cục bộ trước rồi mới gửi** là quyết định quan trọng: mất mạng hay Apps Script lỗi thì khách không mất yêu cầu. Mỗi lần mở trang, `syncPending()` gửi lại tất cả yêu cầu chưa ở trạng thái `sent` hoặc `limited`, từng cái một (để khóa của Apps Script giữ ngắn). Ở trang Liên hệ còn có nút "Gửi lại" cho từng dòng.

**Mã yêu cầu** có dạng `Q-YYYYMMDD-XXXX` (ngày hôm nay + 4 ký tự ngẫu nhiên hệ 36). Apps Script dùng mã này để **không ghi trùng**: gửi lại cùng mã thì trả `duplicate: true`, không thêm dòng, không gửi lại email, không tính vào giới hạn spam. Lưu ý: hai yêu cầu khác nhau trùng mã ngẫu nhiên (xác suất rất nhỏ) thì yêu cầu sau bị coi là trùng và không được ghi.

**Cách gửi.** `POST` với `Content-Type: text/plain` (một "yêu cầu đơn giản", trình duyệt không gửi bước hỏi CORS trước, mà Apps Script không trả lời được bước đó). Nếu `fetch` ném lỗi (một số trình duyệt không đọc được phản hồi chuyển hướng của Apps Script), website gửi lại lần nữa ở chế độ `no-cors` và coi là `sent`. Hệ quả cần biết: ở nhánh dự phòng này website **không đọc được** phản hồi, nên nếu server từ chối vì spam thì khách vẫn thấy "đã nhận". Đây là giới hạn của cách tích hợp, không phải lỗi logic.

**Dữ liệu gửi đi** (hàm `toSheetRow` trong `sheet.js`) chỉ gồm các trường chính: mã, loại, ngôn ngữ, họ tên, email, điện thoại, công ty, sản phẩm, MOQ xưởng, MOQ khách đặt, đạt MOQ, danh sách sản phẩm (dạng chữ, không phải JSON), tạm tính, giảm giá, VAT, tổng, lời nhắn, và `fillMs`.

### 2.4 Phía Apps Script (`apps-script/Code.gs`, hàm `doPost`)

```
nhận dữ liệu → kiểm tra có id và email
  → ô ẩn (website) có chữ?        có: bỏ qua, báo ok (bot)
  → mã đã có trong Sheet?          có: báo duplicate (không ghi, không gửi email)
  → checkSpam(dữ liệu)             có lý do: trả {ok:false, error:'limited'} (xem mục 3.2)
  → ghi một dòng vào sheet "Báo giá"
  → gửi email cảm ơn (nếu bật)
  → trả {ok:true, emailed:...}
```

Toàn bộ chạy trong `LockService.getScriptLock()` (chờ tối đa 10 giây) nên hai người gửi cùng lúc không làm lệch bộ đếm hay ghi chồng dòng. Giá trị bắt đầu bằng `=`, `+`, `-`, `@` được thêm dấu `'` phía trước (hàm `clean`) để Google Sheet không coi là công thức (chống "formula injection").

Sheet "Báo giá" có 17 cột tiếng Việt, hàng tiêu đề cố định, kẻ sọc, định dạng tiền `₫`, cột "Đạt MOQ" tô xanh/đỏ, cột "Trạng thái" là danh sách chọn (Mới, Đã liên hệ, Đã báo giá, Đã chốt, Hủy). Chạy hàm `formatSheet` để đưa bảng về đúng kiểu mà không mất dữ liệu.

---

## 3. Chặn spam (chi tiết)

Link Apps Script nằm trong mã nguồn công khai, nên **ai cũng có thể gọi thẳng vào đó** mà không cần qua trang web. Vì vậy việc chặn spam được làm ở **hai lớp**, và lớp quyết định là Apps Script.

### 3.1 Lớp 1: trên trình duyệt (giúp khách thật, không ngăn được kẻ cố ý)

| Cơ chế | Cách hoạt động | Tệp |
|---|---|---|
| Ô ẩn (honeypot) | Ô `website` bị ẩn bằng CSS, người thật không thấy nên không điền; bot điền hết mọi ô sẽ bị lộ. Bị điền thì đóng hộp thoại, không lưu, không gửi | `quote-form.js`, form trong HTML |
| Thời gian điền (`fillMs`) | Ghi thời điểm biểu mẫu được mở; khi gửi, tính `Date.now() - lúc mở` và gửi kèm | `quote-form.js` |
| Nghỉ giữa hai lần gửi | Mỗi thiết bị phải cách nhau **30 giây** | `quotes.js`, hàm `checkSubmitRate` |
| Trần theo giờ | Tối đa **5 yêu cầu mỗi giờ** trên một thiết bị | `quotes.js` |

Nhịp gửi được lưu trong `localStorage` khóa `ericss:submits` (danh sách mốc thời gian, tự bỏ các mốc quá 1 giờ). `checkSubmitRate` là hàm thuần: nhận danh sách mốc và giờ hiện tại, trả `{ok:true}` hoặc `{ok:false, reason:'wait', seconds}` hoặc `{ok:false, reason:'hour'}`. Khách bị chặn thấy thông báo rõ ràng ("đợi N giây" hoặc "quá nhiều trong một giờ") và form giữ nguyên dữ liệu đã nhập.

**Giới hạn của lớp này:** xóa dữ liệu trình duyệt, dùng cửa sổ ẩn danh hoặc gọi thẳng link Apps Script là vượt qua hết. Nó chỉ có ý nghĩa với người dùng bình thường (tránh bấm nhầm hai lần, tránh trẻ con nghịch).

### 3.2 Lớp 2: trong Apps Script (lớp quyết định, hàm `checkSpam`)

Chạy **sau** bước kiểm tra trùng mã và **trong** khóa. Trả về lý do (chuỗi) nếu phải từ chối, hoặc chuỗi rỗng nếu hợp lệ. Bị từ chối thì **không ghi dòng nào và không gửi email**, phản hồi là `{ok:false, error:'limited', reason:...}`.

Các kiểm tra, theo thứ tự:

| # | Kiểm tra | Giá trị | Lý do trả về |
|---|---|---|---|
| 1 | Điền quá nhanh | `fillMs` nhỏ hơn `MIN_FILL_MS` = **3000 ms** (chỉ kiểm tra khi có gửi `fillMs`) | `too fast` |
| 2 | Email sai định dạng | cùng biểu thức như phía trình duyệt | `bad email` |
| 3 | Tên quá ngắn | dưới 2 ký tự | `bad name` |
| 4 | Quá dài | tên 100, email 120, điện thoại 30, công ty 120, lời nhắn 2000, danh sách sản phẩm 1500 ký tự (`LIMITS`) | `too long: <trường>` |
| 5 | Nhiều đường link | hơn `MAX_LINKS` = **2** lần xuất hiện `http://` hoặc `https://` trong tên, công ty, lời nhắn | `links` |
| 6 | Quá giới hạn theo email | quá **3** yêu cầu / giờ / một email (`MAX_PER_EMAIL_PER_HOUR`) | `rate limit` |
| 7 | Quá giới hạn theo phút | quá **6** yêu cầu / phút cho cả hệ thống (`MAX_PER_MINUTE`) | `rate limit` |
| 8 | Quá giới hạn theo giờ | quá **60** yêu cầu / giờ cho cả hệ thống (`MAX_PER_HOUR`) | `rate limit` |

**Cách đếm (mục 6 đến 8).** Dùng `CacheService.getScriptCache()` của Google, mỗi bộ đếm là một khóa:

- `rate:email:<email viết thường>`, hết hạn sau 3600 giây.
- `rate:min:<số phút kể từ 1970>`, hết hạn sau 120 giây.
- `rate:hour:<số giờ kể từ 1970>`, hết hạn sau 7200 giây.

Với mỗi khóa, nếu giá trị hiện tại đã bằng hoặc vượt mức tối đa thì từ chối. Chỉ khi **tất cả** các kiểm tra qua thì mới tăng cả ba bộ đếm lên 1. Hệ quả:

- Yêu cầu bị từ chối **không** làm tăng bộ đếm, nên kẻ spam không thể "kéo dài" thời gian khóa chỉ bằng cách cứ gửi tiếp.
- Bộ đếm theo email dùng cửa sổ trượt: mỗi lần chấp nhận một yêu cầu thì thời hạn của khóa được đặt lại 1 giờ.
- Bộ đếm theo phút/giờ gắn với số phút/giờ hiện tại, nên sang phút/giờ mới thì tự về 0.

**Ví dụ.** Một người gửi 5 yêu cầu liên tiếp bằng cùng một email, mỗi lần cách nhau 40 giây:
- Lần 1, 2, 3: được ghi (bộ đếm email = 1, 2, 3).
- Lần 4, 5: bị từ chối `rate limit`, không ghi dòng, không gửi email. Website hiện "Chưa gửi được yêu cầu" với trạng thái "Bị giới hạn", và **không gửi lại** yêu cầu này nữa (`syncPending` bỏ qua trạng thái `limited`).
- Sau khi khóa email hết hạn (1 giờ kể từ yêu cầu được chấp nhận gần nhất), gửi lại được.

**Thứ tự quan trọng:** kiểm tra trùng mã nằm **trước** `checkSpam`. Nhờ vậy việc website gửi lại cùng một yêu cầu (do mạng chập chờn) không bị tính là spam và không tiêu hạn mức.

### 3.3 Chặn được gì, không chặn được gì (nói thật)

| Kiểu tấn công | Kết quả |
|---|---|
| Bot điền mọi ô của form | Bị ô ẩn bắt |
| Gửi liên tục cùng một email | Chặn sau 3 lần mỗi giờ |
| Bơm hàng loạt với nhiều email khác nhau | Không chặn theo email, nhưng bị **trần toàn hệ thống** (6 mỗi phút, 60 mỗi giờ) |
| Gửi form trong dưới 3 giây | Bị từ chối nếu có `fillMs`; **kẻ gọi thẳng link có thể bỏ trường này** để né (yêu cầu cũ không có `fillMs` vẫn được chấp nhận để tương thích) |
| Nhồi link quảng cáo | Bị chặn nếu có hơn 2 đường link |
| Dữ liệu quá dài, email/tên sai | Bị chặn |
| Dùng email của người khác để gửi | Server chỉ gửi **một email cảm ơn cho mỗi yêu cầu được chấp nhận** và mỗi email tối đa 3 yêu cầu mỗi giờ, nên không thể dùng để gửi thư rác hàng loạt; nội dung email có câu "nếu không phải bạn, hãy bỏ qua" |

**Hạn chế còn lại, cần nói khi thuyết trình:**
- Apps Script không biết địa chỉ IP của người gửi, nên không thể chặn theo IP. Giới hạn theo email có thể bị né bằng nhiều email, và ngược lại một người xấu có thể cố ý "dùng hết" hạn mức một email của người khác trong 1 giờ.
- Trần toàn hệ thống bảo vệ Sheet và hạn mức email, nhưng đổi lại một kẻ spam có thể làm khách thật bị từ chối tạm thời trong lúc trần đã đầy. Với hệ thống thật nên dùng xác thực, CAPTCHA, hoặc một máy chủ riêng có chặn theo IP.
- `CacheService` là bộ nhớ đệm của Google, có thể bị xóa sớm; đây là cách chặn "đủ dùng", không phải bảo đảm tuyệt đối.

### 3.4 Chỉnh tham số và kiểm tra

- Các hằng số nằm ở đầu `apps-script/Code.gs`: `MIN_FILL_MS`, `MAX_PER_EMAIL_PER_HOUR`, `MAX_PER_MINUTE`, `MAX_PER_HOUR`, `MAX_LINKS`, `LIMITS`. Sửa xong phải **Triển khai → Quản lý triển khai → Chỉnh sửa → Phiên bản mới** thì mới có hiệu lực.
- Phía trình duyệt: `MIN_GAP_MS` (30 giây) và `MAX_PER_HOUR` (5) ở đầu phần chống spam trong `js/quotes.js`.
- Khi tự thử nhiều lần mà bị "Bị giới hạn" thì đó là cơ chế đang chạy, không phải lỗi: dùng email khác nhau hoặc đợi 1 giờ; để quên nhịp trên thiết bị, xóa khóa `ericss:submits` trong `localStorage`.

---

## 4. Email cảm ơn và mã QR

**Email** (`sendThankYou` trong `Code.gs`), gửi ngay sau khi ghi dòng vào Sheet:
- Chỉ gửi nếu email đúng định dạng và hạn mức email trong ngày của tài khoản Google còn hơn `MIN_DAILY_QUOTA_LEFT` = 5 thư.
- Ngôn ngữ theo `lang` của yêu cầu (Việt hoặc Anh). Nội dung có tên, mã yêu cầu, sản phẩm, số lượng khách muốn đặt, tạm tính, câu "nếu không phải bạn, hãy bỏ qua", và mã QR. Dữ liệu khách nhập được thoát ký tự HTML trước khi đưa vào thư.
- Không có chặn riêng "1 email mỗi giờ" nữa: giới hạn 3 yêu cầu mỗi email mỗi giờ ở `checkSpam` đã bao phủ.
- Muốn tắt hẳn: đặt `SEND_EMAIL = false`. Email gửi từ tài khoản Google của chủ website nên bị giới hạn hạn mức của Google (khoảng 100 thư mỗi ngày với Gmail thường). Nếu gửi email lỗi thì yêu cầu vẫn đã được ghi, khách không bị báo lỗi.

**Mã QR:** website (và email) gọi dịch vụ QuickChart: `https://quickchart.io/qr?...&text=<họ tên · mã yêu cầu>`. Ảnh QR chứa họ tên và mã yêu cầu để khách giữ lại đối chiếu. Cần nói thật: **họ tên và mã yêu cầu được gửi tới quickchart.io** để vẽ ảnh (đã nêu trong Chính sách bảo mật).

---

## 5. Tính giá: chiết khấu, mã giảm giá, VAT, MOQ

Toàn bộ nằm trong hàm thuần `calcQuote(items, config, couponCode)` (`js/pricing.js`), dữ liệu cấu hình ở `data/pricing.js`. Tiền là **số nguyên đồng**, làm tròn bằng `roundVnd` (dùng `toPrecision(12)` để loại sai số số thực, ví dụ 14662499,999999998 thành 14662500).

### 5.1 Thứ tự tính

```
tạm tính     = tổng (đơn giá × số lượng) của mọi dòng
giảm theo SL = tạm tính × tỉ lệ bậc cao nhất đạt được
sau giảm     = tạm tính − giảm theo SL
giảm mã      = sau giảm × tỉ lệ mã        (nếu mã hợp lệ và đủ điều kiện)
chịu thuế    = sau giảm − giảm mã
VAT          = chịu thuế × 10%
tổng cộng    = chịu thuế + VAT
```

### 5.2 Chiết khấu theo số lượng

Tính theo **tổng số lượng của tất cả các dòng** (không theo từng sản phẩm). Lấy bậc cao nhất đã đạt:

| Tổng số lượng | Giảm |
|---|---|
| từ 5 | 3% |
| từ 10 | 5% |
| từ 20 | 8% |

### 5.3 Mã giảm giá

Mã không phân biệt hoa thường, cắt khoảng trắng. Mã giảm tính **trên số tiền đã trừ chiết khấu số lượng**, nhưng điều kiện tối thiểu (`minSubtotal`) so với **tạm tính trước khi giảm**:

| Mã | Giảm | Điều kiện tạm tính tối thiểu |
|---|---|---|
| `ERICSS10` | 10% | 20.000.000 ₫ |
| `WELCOME5` | 5% | không có |

Trạng thái trả về: `none` (không nhập), `invalid` (mã không tồn tại), `minimum` (mã đúng nhưng chưa đủ điều kiện), `applied` (đã áp dụng). Giao diện dùng trạng thái này để báo đúng lý do.

### 5.4 Ví dụ tính tay

50 ghế dây thừng Cordé, đơn giá 6.800.000 ₫:
- Tạm tính: 50 × 6.800.000 = **340.000.000 ₫**
- Tổng số lượng 50 (từ 20) nên giảm 8%: 27.200.000 → còn **312.800.000 ₫**
- Không dùng mã. Chịu thuế = 312.800.000.
- VAT 10% = 31.280.000.
- Tổng cộng = **344.080.000 ₫**.

Nếu thêm mã `ERICSS10` (tạm tính 340 triệu, đủ điều kiện): giảm mã = 312.800.000 × 10% = 31.280.000; chịu thuế = 281.520.000; VAT = 28.152.000; tổng = 309.672.000 ₫.

### 5.5 MOQ

`meetsMoq(qty, factoryMoq)` trả `true` khi `qty >= factoryMoq`. MOQ là số lượng đặt tối thiểu của xưởng cho từng sản phẩm (cột `moq` trong dữ liệu). Khi khách nhập số lượng, biểu mẫu báo ngay "đạt MOQ" hoặc "dưới MOQ của xưởng" (chỉ là gợi ý, **không chặn** việc gửi) và gợi ý nhanh 1×, 2×, 5× MOQ. Sheet lưu cả MOQ xưởng, MOQ khách đặt và cột "Đạt MOQ" (Có/Không) để nhân viên lọc.

---

## 6. Ước giá theo cấu hình

Trang Ước giá (`js/estimator.js`, hàm thuần `estimateUnit` trong `pricing.js`). Khách chọn loại, chất liệu, kích thước, lớp hoàn thiện, số lượng.

```
giá thô   = giá nền của loại × hệ số chất liệu × hệ số kích thước + phí lớp hoàn thiện
đơn giá   = làm tròn giá thô đến hàng nghìn đồng
số ngày   = ngày của loại + ngày chất liệu + ngày kích thước + ngày lớp hoàn thiện
```

| Tham số | Giá trị |
|---|---|
| Giá nền (ngày làm) | Bàn ăn 9.000.000 (20 ngày), Ghế 2.500.000 (15), Sofa 15.000.000 (28) |
| Hệ số chất liệu (ngày thêm) | Teak ×1,4 (+6), Nhôm ×1,0 (+0), Dây thừng ×1,15 (+7), Mây nhựa ×1,1 (+7) |
| Hệ số kích thước (ngày thêm) | Nhỏ ×0,85 (+0), Vừa ×1,0 (+0), Lớn ×1,3 (+5) |
| Lớp hoàn thiện (phí, ngày thêm) | Tự nhiên 0 (+0), Mờ 350.000 (+2), Cao cấp 900.000 (+4) |

Sau đó dùng chính `calcQuote` để ra chiết khấu số lượng và VAT, nên con số khớp với biểu mẫu báo giá. Số lượng giới hạn 1 đến 99 (`MAX_QTY`). Bấm "Thêm vào giỏ" tạo một dòng tùy chỉnh có mã dạng `custom-<loại>-<chất liệu>-<kích thước>-<hoàn thiện>`, nên cùng cấu hình thêm hai lần thì **cộng dồn số lượng** thay vì tạo dòng mới.

**Ví dụ:** bàn ăn teak cỡ vừa, hoàn thiện mờ: 9.000.000 × 1,4 × 1,0 + 350.000 = 12.950.000 ₫; ngày giao = 20 + 6 + 0 + 2 = 28 ngày.

---

## 7. Giỏ báo giá, yêu thích, lịch sử, xuất Excel

**Giỏ** (`js/cart.js`, giao diện `cart-ui.js`): mỗi dòng có `id`, tên hai ngôn ngữ, giá, ảnh, số lượng. Thêm cùng một `id` thì cộng dồn. Số lượng mỗi dòng bị kẹp trong khoảng 1 đến 99 (`clampQty`). Khi đọc lại từ `localStorage`, dòng nào sai cấu trúc (`isValidItem`) bị loại bỏ. Mã giảm giá lưu cùng giỏ. Mọi thay đổi gọi `commit()`: ghi `localStorage` rồi báo cho các nơi đang đăng ký (huy hiệu số lượng trên biểu tượng giỏ, ngăn kéo giỏ, ước tính trong biểu mẫu).

**Yêu thích:** tập các `id` sản phẩm, khóa `wishlist`. Có bộ lọc "chỉ hiện mục yêu thích".

**Lịch sử yêu cầu** (`js/history.js`, trang Liên hệ): liệt kê các yêu cầu đã lưu cục bộ cùng trạng thái đồng bộ (Chờ đồng bộ, Đã gửi, Chưa gửi được, Chưa kết nối Sheet, Bị giới hạn). Dòng chưa `sent` và chưa `limited` có nút "Gửi lại". Khi đọc từ `localStorage`, bản ghi sai cấu trúc bị bỏ qua (`isQuoteRecord`).

**Xuất Excel:** nút "Tải Excel" biến mỗi yêu cầu thành một dòng với đúng các cột tiếng Việt của Google Sheet (hàm `toExcelRow`: Mã yêu cầu, Thời gian, Loại yêu cầu, Họ và tên, ..., Tổng cộng, Lời nhắn), rồi dùng thư viện SheetJS (tải từ CDN) để tạo tệp `.xlsx` có độ rộng cột hợp lý. Nếu không tải được thư viện thì tự chuyển sang CSV có dấu BOM UTF-8 (Excel mở đúng tiếng Việt). Không còn chức năng nhập JSON.

---

## 8. Tìm kiếm, lọc, sắp xếp sản phẩm

Hàm thuần `filterProducts` (`js/filters.js`), áp dụng lần lượt: chất liệu, giá tối đa, chỉ yêu thích, từ khóa, rồi sắp xếp.

- **Tìm không dấu và không phân biệt hoa thường:** chuỗi được chuyển về chữ thường, tách dấu (`NFD`) rồi bỏ dấu, chữ `đ` đổi thành `d`. Gõ "ghe" ra "ghế", gõ "ERC-AL-003" ra đúng SKU.
- Từ khóa được tìm trong: SKU, tên (cả Việt và Anh), mô tả (cả hai ngôn ngữ), chất liệu và thẻ.
- Sắp xếp: mặc định, giá tăng, giá giảm, tên (theo ngôn ngữ đang chọn, dùng `localeCompare`).
- Phân trang bằng nút "Xem thêm": mỗi lần 12 sản phẩm (`PAGE_SIZE`). Đổi bất kỳ bộ lọc nào thì quay về trang đầu. Ô tìm kiếm có `debounce` 150 ms để không lọc lại sau mỗi phím.
- Địa chỉ `products.html?cat=teak` (từ các thẻ chất liệu ở trang chủ) và `?q=...` được đọc để đặt sẵn bộ lọc.

---

## 9. So sánh sản phẩm

Nằm trong `js/catalog.js`, giao diện ở `products.html` (thanh so sánh + hộp thoại `compare-dialog`).

- Chọn tối đa **3** sản phẩm (`MAX_COMPARE`). Chọn thêm mẫu thứ 4 thì không thêm, hiện thông báo yêu cầu bỏ bớt. Lựa chọn lưu ở khóa `compare`, và khi đọc lại sẽ loại các `id` không còn tồn tại.
- Thanh so sánh cố định ở cuối màn hình hiện các mẫu đã chọn (ảnh nhỏ + nút bỏ). Nút "So sánh (n)" chỉ bấm được khi có từ 2 mẫu.
- Bảng so sánh gồm 6 hàng: chất liệu, giá, kích thước, MOQ xưởng, thời gian giao, mô tả.
- **Tô giá trị tốt nhất** cho ba hàng có thể xếp hạng: giá thấp nhất, MOQ thấp nhất, giao nhanh nhất. Chỉ tô khi các giá trị **thật sự khác nhau** (nếu bằng nhau thì không có "tốt nhất").
- Công tắc "Chỉ hiện điểm khác nhau": ẩn các hàng mà mọi sản phẩm cùng giá trị (so sánh bằng giá trị gốc, không phải chữ hiển thị).
- Trong bảng: gửi báo giá (mở biểu mẫu cho đúng sản phẩm đó, đóng bảng so sánh), thêm vào giỏ, hoặc bỏ khỏi so sánh. Còn dưới 2 mẫu thì bảng tự đóng.

---

## 10. Song ngữ Việt · Anh

Có **hai lớp dịch** vì có hai loại nội dung:

1. **Phần dùng chung (menu, chân trang, hộp thoại, trang chủ):** tiếng Việt viết thẳng trong HTML, mỗi phần tử có thuộc tính `data-i18n="khóa"`; bản tiếng Anh nằm trong `js/site-i18n.js`. `js/site.js` lưu lại bản tiếng Việt gốc của từng phần tử lần đầu chạy, nên đổi qua lại không mất chữ. Có các thuộc tính `data-i18n-alt` (mô tả ảnh), `data-i18n-aria` (nhãn trợ năng), `data-i18n-content`.
2. **Phần sinh bằng JavaScript (sản phẩm, giỏ, biểu mẫu, thông báo):** chuỗi nằm trong `data/ui.js`, lấy bằng hàm `t('khóa', {biến})` (thay `{n}`, `{name}`...) và `pick({vi, en})` cho dữ liệu hai ngôn ngữ như tên sản phẩm. Khi đổi ngôn ngữ, `site.js` phát sự kiện `ericss:lang` và `lang.js` vẽ lại các phần đang hiển thị.

Ngôn ngữ mặc định là tiếng Việt; lựa chọn lưu ở `ericss-lang` và đọc lại khi mở trang. Ngôn ngữ hiện tại là thuộc tính `lang` của thẻ `<html>`, mọi hàm đều đọc từ đó. Chuỗi thiếu bản dịch sẽ lùi về tiếng Việt, rồi về chính khóa.

---

## 11. Modal xem ảnh, chấm điều hướng, hiệu ứng

**Modal xem ảnh lớn** (`js/lightbox.js`, chỉ trang chủ): dựng một `<dialog>` bằng JavaScript. Bốn nhóm ảnh được nhận diện: thư viện ảnh, 8 bước quy trình, 4 thẻ chất liệu, ảnh giới thiệu. Khi mở, danh sách được **đọc lại ngay lúc đó**, nên thư viện đang lọc "Mây nhựa" chỉ lật qua các ảnh đang hiện. Nút trước/sau lật vòng tròn, phím mũi tên, Esc đóng, bấm nền đóng, vuốt ngang trên màn hình cảm ứng (quá 50 px). Ảnh được thêm `tabindex`, `role="button"` để vào được bằng bàn phím; đóng xong focus quay về đúng ảnh vừa mở. Ảnh kế bên được nạp trước để lật không bị chờ.

**Chấm điều hướng bên phải** (trang chủ): sáu chấm cố định, mỗi chấm là liên kết `#phần`. Mã theo dõi vị trí cuộn (`IntersectionObserver` trong `site.js`, vùng quan sát hẹp quanh giữa màn hình) đánh dấu phần đang xem bằng lớp `is-current` và `aria-current="location"`. Nhãn hiện khi rê chuột hoặc Tab vào chấm. Menu đầu trang chỉ chứa các trang, không chứa các phần.

**Hiệu ứng:** Animate.css (tiêu đề, nút hero), AOS (khối hiện dần khi cuộn), GSAP + ScrollTrigger (nút "từ tính", parallax hero và ảnh giới thiệu), vanilla-tilt (thẻ chất liệu nghiêng nhẹ). Tất cả tắt khi trình duyệt đặt `prefers-reduced-motion: reduce`; hiệu ứng chỉ được thêm bằng JavaScript nên khi JavaScript tắt thì nội dung vẫn hiện đầy đủ.

---

## 12. Bảng tra nhanh: tham số nằm ở đâu

| Muốn đổi | Sửa ở đâu |
|---|---|
| Giá, MOQ, ảnh, mô tả sản phẩm | `data/products.js` |
| Bậc chiết khấu, mã giảm giá, VAT, hệ số ước giá | `data/pricing.js` |
| Chuỗi giao diện (phần sinh bằng JS) | `data/ui.js` |
| Chuỗi tiếng Anh của menu, chân trang, hộp thoại | `js/site-i18n.js` |
| Link Apps Script, số lượng tối đa của biểu mẫu (`maxQuoteQty`) | `data/config.js` |
| Nghỉ 30 giây, trần 5 yêu cầu mỗi giờ trên thiết bị | `js/quotes.js` (`MIN_GAP_MS`, `MAX_PER_HOUR`) |
| Giới hạn spam phía máy chủ (3 giây, 3 email/giờ, 6/phút, 60/giờ, 2 link, độ dài) | `apps-script/Code.gs` (đầu tệp) rồi triển khai phiên bản mới |
| Bật/tắt email cảm ơn, hạn mức thư chừa lại | `apps-script/Code.gs` (`SEND_EMAIL`, `MIN_DAILY_QUOTA_LEFT`) |
| Số sản phẩm được so sánh | `js/catalog.js` (`MAX_COMPARE`) |
| Số sản phẩm mỗi lần "Xem thêm" | `js/catalog.js` (`PAGE_SIZE`) |
| Số lượng tối đa mỗi dòng trong giỏ | `js/cart.js` (`MAX_QTY`) |
| Nội dung Chính sách bảo mật, Điều khoản | HTML của bốn trang (khóa `f10` đến `f45`) và `js/site-i18n.js` |
