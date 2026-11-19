# Sổ tay AI — GitHub Pages

Website học từ vựng tiếng Anh lớp 11, có intro, sách hướng dẫn theo chặng, ghép prompt, bài tập, flashcard, ôn tập và dịch thuật.

## Dữ liệu

Bản này chạy hoàn toàn trong trình duyệt. Hồ sơ, mật khẩu đã băm, từ vựng và tiến độ được lưu bằng IndexedDB trên từng trình duyệt. Không có máy chủ xác thực; mật khẩu hồ sơ chỉ giúp phân biệt người dùng trên máy, không bảo vệ dữ liệu trước người có quyền truy cập thiết bị. Xóa dữ liệu website sẽ xóa hồ sơ.

Bảng xếp hạng chỉ so sánh các hồ sơ trên cùng trình duyệt. Chấm điểm chạy ở phía trình duyệt nên chỉ phù hợp tự học. Không có tài khoản hay dữ liệu người dùng mẫu được đóng gói trong mã nguồn.

Mây AI mặc định chạy Gemma 4 qua Cloudflare Workers AI. Khi gửi, trình duyệt chuyển câu hỏi và tối đa bốn lượt hỏi đáp gần nhất tới Worker. Lịch sử lưu theo hồ sơ bằng IndexedDB. Khi bật Tìm trên web, trình duyệt gửi từ khóa của câu hỏi tới Wikimedia để tìm nguồn.

Chế độ Nhẹ (Qwen 1.5B, tải khoảng 870 MB) và Mạnh hơn (Qwen 3B, khoảng 1,74 GB) chạy bằng WebLLM trên thiết bị có WebGPU. Dịch thuật gửi câu người dùng nhập đến Google/MyMemory khi bấm Dịch.

## Xuất bản

Trong Settings → Pages, chọn Deploy from a branch, nhánh main, thư mục /(root), rồi Save. Các đường dẫn đều tương đối để chạy dưới /so-tay-ai/.

Mở website bằng HTTPS; không mở index.html trực tiếp bằng file://.

## Worker Mây AI

Worker `may-ai` dùng `may-ai-cloud-worker.mjs` cùng mô-đun `may-ai-prompt.mjs`. Nó cần hai binding trên Cloudflare: `AI` (Workers AI) và `CHAT_RATE` (giới hạn 8 yêu cầu mỗi 60 giây theo địa chỉ IP). Endpoint công khai dùng Cloudflare Workers Free để giới hạn sử dụng theo hạn mức miễn phí. Khi đổi địa chỉ Worker, cập nhật endpoint trong `may-ai-cloud.mjs` và origin trong mã Worker.

## Font

Các font đi kèm có giấy phép trong OFL.txt.
