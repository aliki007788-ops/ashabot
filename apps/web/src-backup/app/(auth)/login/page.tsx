'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { extractError } from '@/lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('خوش آمدید');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-black mb-2 text-center">ورود</h1>
        <p className="text-sm text-white/50 text-center mb-6">به حساب کاربری خود وارد شوید</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="ایمیل"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="password"
            type="password"
            label="رمز عبور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" loading={loading} size="lg" className="mt-2">
            ورود
          </Button>
        </form>
        <p className="text-center text-sm text-white/50 mt-6">
          حساب ندارید؟{' '}
          <Link href="/register" className="text-[#6a8dff] font-bold">
            ثبت‌نام
          </Link>
        </p>
      </Card>
    </main>
  );
}
