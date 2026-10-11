'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  channelsApi,
  ChannelInfo,
  ChannelType,
  CHANNEL_COLORS,
} from '@/lib/api-channels';
import { cn } from '@/lib/utils';

// ==================== TYPES ====================

interface ConnectModalProps {
  botId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'select' | 'credentials' | 'success';

// ==================== COMPONENT ====================

export function ConnectModal({
  botId,
  isOpen,
  onClose,
  onSuccess,
}: ConnectModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelInfo | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ==================== EFFECTS ====================

  useEffect(() => {
    if (isOpen && step === 'select' && channels.length === 0) {
      loadChannels();
    }
  }, [isOpen, step, channels.length]);

  useEffect(() => {
    if (!isOpen) {
      // Reset when modal closes
      setTimeout(() => {
        setStep('select');
        setSelectedChannel(null);
        setCredentials({});
        setError('');
        setSuccessMessage('');
      }, 200);
    }
  }, [isOpen]);

  // ==================== HANDLERS ====================

  const loadChannels = async () => {
    try {
      const { channels: list } = await channelsApi.getTypes();
      setChannels(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری کانال‌ها');
    }
  };

  const handleSelectChannel = (channel: ChannelInfo) => {
    setSelectedChannel(channel);
    setCredentials({});
    setError('');
    setStep('credentials');
  };

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const validateCredentials = (): boolean => {
    if (!selectedChannel) return false;

    for (const field of selectedChannel.fields) {
      if (field.required && !credentials[field.key]?.trim()) {
        setError(`فیلد "${field.label}" الزامی است`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!selectedChannel) return;
    if (!validateCredentials()) return;

    setLoading(true);
    setError('');

    try {
      await channelsApi.createConnection({
        channelType: selectedChannel.type,
        botId,
        channelName: selectedChannel.name,
        credentials,
      });

      setSuccessMessage(`کانال ${selectedChannel.name} با موفقیت متصل شد`);
      setStep('success');

      // Callback بعد از ۱.۵ ثانیه
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در اتصال کانال');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'credentials') {
      setStep('select');
      setSelectedChannel(null);
      setCredentials({});
      setError('');
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  // ==================== RENDER ====================

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="p-6 relative">
          {/* دکمه بستن */}
          <button
            onClick={handleClose}
            disabled={loading}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition flex items-center justify-center disabled:opacity-50"
            aria-label="بستن"
          >
            ✕
          </button>

          {/* محتوا */}
          {step === 'select' && (
            <SelectStep
              channels={channels}
              onSelect={handleSelectChannel}
            />
          )}

          {step === 'credentials' && selectedChannel && (
            <CredentialsStep
              channel={selectedChannel}
              credentials={credentials}
              loading={loading}
              error={error}
              onChange={handleCredentialChange}
              onSubmit={handleSubmit}
              onBack={handleBack}
            />
          )}

          {step === 'success' && (
            <SuccessStep
              message={successMessage}
              channelIcon={selectedChannel?.icon || '✓'}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

interface SelectStepProps {
  channels: ChannelInfo[];
  onSelect: (channel: ChannelInfo) => void;
}

function SelectStep({ channels, onSelect }: SelectStepProps) {
  return (
    <div>
      <h2 className="text-xl font-black text-white mb-1 text-center">
        اتصال کانال جدید
      </h2>
      <p className="text-sm text-white/50 text-center mb-6">
        کانال مورد نظر را انتخاب کنید
      </p>

      <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {channels.map((channel) => (
          <button
            key={channel.type}
            onClick={() => onSelect(channel)}
            className={cn(
              'group p-4 rounded-xl bg-white/[0.03] border border-white/10',
              'hover:border-[#6a8dff]/60 hover:bg-white/[0.06] transition-all text-right',
              'flex flex-col items-center gap-3'
            )}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
              style={{
                backgroundColor: `${CHANNEL_COLORS[channel.type]}20`,
                border: `1px solid ${CHANNEL_COLORS[channel.type]}40`,
              }}
            >
              {channel.icon}
            </div>
            <div className="text-center">
              <div className="font-bold text-white text-sm mb-0.5">
                {channel.name}
              </div>
              <div className="text-[10px] text-white/40 line-clamp-2">
                {channel.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

interface CredentialsStepProps {
  channel: ChannelInfo;
  credentials: Record<string, string>;
  loading: boolean;
  error: string;
  onChange: (key: string, value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

function CredentialsStep({
  channel,
  credentials,
  loading,
  error,
  onChange,
  onSubmit,
  onBack,
}: CredentialsStepProps) {
  return (
    <div>
      <button
        onClick={onBack}
        disabled={loading}
        className="text-xs text-white/60 hover:text-white transition mb-4 flex items-center gap-1 disabled:opacity-50"
      >
        → بازگشت
      </button>

      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{
            backgroundColor: `${CHANNEL_COLORS[channel.type]}20`,
            border: `1px solid ${CHANNEL_COLORS[channel.type]}40`,
          }}
        >
          {channel.icon}
        </div>
        <div>
          <div className="font-bold text-white">اتصال {channel.name}</div>
          <div className="text-xs text-white/50">{channel.description}</div>
        </div>
      </div>

      {channel.fields.length === 0 ? (
        <div className="text-center py-6 text-white/60 text-sm">
          این کانال نیازی به اعتبارنامه ندارد
        </div>
      ) : (
        <div className="space-y-4">
          {channel.fields.map((field) => (
            <div key={field.key}>
              <Input
                id={`field-${field.key}`}
                label={field.label}
                type={field.type}
                placeholder={field.placeholder}
                value={credentials[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                disabled={loading}
                required={field.required}
              />
              {field.help && (
                <p className="mt-1.5 text-[11px] text-white/40">
                  💡 {field.help}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Button
          onClick={onSubmit}
          loading={loading}
          disabled={loading}
          className="flex-1"
          size="lg"
        >
          {loading ? 'در حال اتصال...' : '🔗 اتصال'}
        </Button>
      </div>

      {channel.docs && channel.docs !== '#' && (
        <div className="mt-4 text-center">
          <a
            href={channel.docs}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#6a8dff] hover:underline"
          >
            📖 مستندات {channel.name}
          </a>
        </div>
      )}
    </div>
  );
}

interface SuccessStepProps {
  message: string;
  channelIcon: string;
}

function SuccessStep({ message, channelIcon }: SuccessStepProps) {
  return (
    <div className="text-center py-6">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/40 flex items-center justify-center text-4xl mx-auto mb-4 animate-in zoom-in">
        ✓
      </div>
      <h3 className="text-lg font-black text-white mb-2">
        اتصال موفق!
      </h3>
      <p className="text-sm text-white/60">
        {message}
      </p>
    </div>
  );
}

export default ConnectModal;