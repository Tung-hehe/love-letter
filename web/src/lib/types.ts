// types.ts — kiểu dữ liệu dùng chung cho thư + phong cách template.

export type LetterPage = string[];

export interface Letter {
  id: string;
  templateId: string;
  title: string;
  date: string;
  greeting: string;
  label: string;
  content: LetterPage[];
  closing: string;
  sign: string;
  postscript: string;
  updatedAt: number;
}

// Nội dung mẫu riêng của từng phong cách. Dùng cho 2 việc trong app.ts:
// 1) Xem trước trực tiếp khi thư còn trống (không lưu vào thư thật).
// 2) Điền thẳng vào form soạn thư làm nội dung khởi điểm thật sự (thay cho chữ mờ
//    placeholder) khi người dùng vừa chọn phong cách cho một thư trống — họ sửa
//    trực tiếp lên đó, không phải gõ lại từ đầu.
export interface TemplateSample {
  title: string;
  greeting: string;
  content: LetterPage[];
  closing: string;
  sign: string;
}

export interface TemplateMeta {
  id: string;
  file: string;
  name: string;
  mood: string;
  gradient: string;
  ink: string;
  iconGradient: string;
  icon: string;
  sample?: TemplateSample;
}

// Context đưa vào renderTemplate() — mọi trường trừ id/templateId/updatedAt
// (những trường đó chỉ để app quản lý, template không dùng tới).
export type LetterContext = Omit<Letter, 'id' | 'templateId' | 'updatedAt'>;
