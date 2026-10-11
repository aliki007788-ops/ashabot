'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { extractError } from '@/lib/api';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('رمز عبور حداقل ۸ کاراکتر');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('حساب ساخته شد');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-black mb-2 text-center">ثبت‌نام</h1>
        <p className="text-sm text-white/50 text-center mb-6">یک حساب رایگان بسازید</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            id="name"
            label="نام و نام خانوادگی"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
            label="رمز عبور (حداقل ۸ کاراکتر)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" loading={loading} size="lg" className="mt-2">
            ایجاد حساب
          </Button>
        </form>
        <p className="text-center text-sm text-white/50 mt-6">
          حساب دارید؟{' '}
          <Link href="/login" className="text-[#6a8dff] font-bold">
            ورود
          </Link>
        </p>
      </Card>
    </main>
  );
}
