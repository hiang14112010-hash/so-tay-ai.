# Sổ tay AI — GitHub Pages

Website học từ vựng tiếng Anh lớp 11, có intro, sách hướng dẫn theo chặng, ghép prompt, bài tập, flashcard, ôn tập và dịch thuật.

## Dữ liệu

Bản này chạy hoàn toàn trong trình duyệt. Hồ sơ, mật khẩu đã băm, từ vựng và tiến độ được lưu bằng IndexedDB trên từng trình duyệt. Không có máy chủ xác thực; mật khẩu hồ sơ chỉ giúp phân biệt người dùng trên máy, không bảo vệ dữ liệu trước người có quyền truy cập thiết bị. Xóa dữ liệu website sẽ xóa hồ sơ.

Bảng xếp hạng chỉ so sánh các hồ sơ trên cùng trình duyệt. Chấm điểm chạy ở phía trình duyệt nên chỉ phù hợp tự học. Không có tài khoản hay dữ liệu người dùng mẫu được đóng gói trong mã nguồn.

Mây AI chạy Qwen2.5 bằng WebLLM trong trình duyệt có WebGPU. Chế độ Nhẹ (1.5B) tải khoảng 870 MB, còn chế độ Mạnh hơn (3B) tải khoảng 1,74 GB và cần nhiều bộ nhớ đồ họa hơn. Mô hình được tải từ Hugging Face khi người dùng bật Mây AI, cùng thư viện từ jsDelivr. Tin nhắn được xử lý trên thiết bị và lịch sử lưu theo hồ sơ bằng IndexedDB. Khi bật Tìm trên web, chỉ câu hỏi hiện tại được gửi tới Wikimedia để tìm trích đoạn Wikipedia hoặc Wiktionary. Dịch thuật gửi câu người dùng nhập đến Google/MyMemory khi bấm Dịch.

## Xuất bản

Trong Settings → Pages, chọn Deploy from a branch, nhánh main, thư mục /(root), rồi Save. Các đường dẫn đều tương đối để chạy dưới /so-tay-ai/.

Mở website bằng HTTPS; không mở index.html trực tiếp bằng file://.

## Font

Các font đi kèm có giấy phép trong OFL.txt.
