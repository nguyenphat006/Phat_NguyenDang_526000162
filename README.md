# Ericss Furniture — Web Design Midterm

Website giới thiệu nhà sản xuất nội thất cao cấp phong cách Châu Âu (danh mục, vật liệu, quy trình sản xuất).

- **Sinh viên:** Nguyễn Đăng Phát — MSSV 526000162
- **Học phần:** Thiết kế Web — Trường Đại học Lạc Hồng
- **Live preview:** https://nguyenphat006.github.io/Phat_NguyenDang_526000162/
- **Nhật ký Prompt:** [PROMPT_LOG.md](PROMPT_LOG.md)

## Tính năng
- Song ngữ Việt – Anh (mặc định tiếng Việt), nhớ lựa chọn người dùng.
- Footer có nút GitHub mở hộp thoại `<dialog>` (tài khoản tác giả, repository, nhật ký prompt).
- Gallery có bộ lọc theo chất liệu, menu mobile, tôn trọng `prefers-reduced-motion`.

## Công nghệ
HTML5 semantic · CSS Variables · Flexbox/Grid · [Animate.css](https://animate.style/) · [AOS](https://michalsnik.github.io/aos/) · [GSAP + ScrollTrigger](https://gsap.com/) · [vanilla-tilt](https://micku7zu.github.io/vanilla-tilt.js/) · JavaScript thuần · Deploy bằng GitHub Actions → GitHub Pages.

## Cấu trúc
```
index.html   style.css   script.js   i18n.js
assets/      (img/, favicon.svg)
PROMPT_LOG.md
.github/workflows/deploy.yml
```
