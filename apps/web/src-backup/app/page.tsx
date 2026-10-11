import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl md:text-6xl font-black mb-4 bg-gradient-to-br from-[#6a8dff] via-[#b46eff] to-[#39d7e7] bg-clip-text text-transparent">
          پلتفرم ربات‌های هوشمند
        </h1>
        <p className="text-white/60 text-lg mb-8">
          ساخت، مدیریت و اجرای ربات‌های هوشمند در چند دقیقه
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/register">
            <Button size="lg">شروع رایگان</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              ورود
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
