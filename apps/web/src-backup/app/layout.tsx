import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'پلتفرم ربات‌های هوشمند',
  description: 'پلتفرم مدیریت و اجرای ربات‌های هوشمند',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <AuthProvider>
          {children}
          <Toaster position="bottom-center" theme="dark" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
