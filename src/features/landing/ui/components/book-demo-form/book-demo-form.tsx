import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { getInfra, isFirebaseConfigured, type DemoRequestSource } from '@/core/bootstrap/infra';
import { trackEvent } from '@/features/template/use-case/commands/analytics.commands';
import './book-demo-form.scss';

const bookDemoSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
});

type BookDemoFormData = z.infer<typeof bookDemoSchema>;

interface BookDemoFormProps {
  source?: DemoRequestSource;
  variant?: 'default' | 'dark';
}

export function BookDemoForm({ source = 'landing_hero', variant = 'default' }: BookDemoFormProps) {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'already_registered' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookDemoFormData>({
    resolver: zodResolver(bookDemoSchema),
  });

  const onSubmit = handleSubmit(async ({ name, email }) => {
    if (!isFirebaseConfigured()) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      const result = await getInfra().demoRequests.request({
        name,
        email,
        locale: i18n.language.startsWith('es') ? 'es' : 'en',
        source,
      });

      if (result === 'already_registered') {
        setStatus('already_registered');
      } else {
        setStatus('success');
        trackEvent('demo_request', { source, locale: i18n.language });
      }
    } catch (error) {
      console.error('[demo-request] failed:', error);
      setStatus('error');
    }
  });

  const message =
    status === 'success'
      ? t('landing.bookDemo.success')
      : status === 'already_registered'
        ? t('landing.bookDemo.alreadyRegistered')
        : status === 'error'
          ? t('landing.bookDemo.error')
          : null;

  const isDisabled = status === 'loading' || status === 'success';

  return (
    <div className={`book-demo-form${variant === 'dark' ? ' book-demo-form--dark' : ''}`}>
      <form className="book-demo-form__form" onSubmit={(e) => void onSubmit(e)}>
        <input
          type="text"
          placeholder={t('landing.bookDemo.namePlaceholder')}
          className="book-demo-form__input"
          autoComplete="name"
          {...register('name')}
          disabled={isDisabled}
        />
        <input
          type="email"
          placeholder={t('landing.bookDemo.emailPlaceholder')}
          className="book-demo-form__input"
          autoComplete="email"
          {...register('email')}
          disabled={isDisabled}
        />
        <button
          type="submit"
          className="book-demo-form__submit"
          disabled={isDisabled}
        >
          {status === 'loading' ? t('landing.bookDemo.submitting') : t('landing.bookDemo.submit')}
        </button>
      </form>

      {(errors.name || errors.email) && (
        <p className="book-demo-form__message book-demo-form__message--error">{t('landing.bookDemo.error')}</p>
      )}
      {message && (
        <p className={`book-demo-form__message${status === 'error' ? ' book-demo-form__message--error' : ' book-demo-form__message--success'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
