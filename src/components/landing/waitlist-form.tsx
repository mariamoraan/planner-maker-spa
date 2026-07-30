import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getInfra, isFirebaseConfigured, type WaitlistSource } from '@/infrastructure';
import { trackEvent } from '@/lib/analytics';
import { PATHS } from '@/core/routes/paths';
import './waitlist-form.scss';

const waitlistSchema = z.object({
  email: z.string().email(),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

interface WaitlistFormProps {
  source?: WaitlistSource;
  compact?: boolean;
}

export function WaitlistForm({ source = 'landing_hero', compact = false }: WaitlistFormProps) {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'already_registered' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    if (!isFirebaseConfigured()) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      const result = await getInfra().waitlist.join({
        email,
        locale: i18n.language.startsWith('es') ? 'es' : 'en',
        source,
      });

      if (result === 'already_registered') {
        setStatus('already_registered');
      } else {
        setStatus('success');
        trackEvent('waitlist_join', { source, locale: i18n.language });
      }
    } catch (error) {
      console.error('[waitlist] join failed:', error);
      setStatus('error');
    }
  });

  const message =
    status === 'success'
      ? t('landing.waitlist.success')
      : status === 'already_registered'
        ? t('landing.waitlist.alreadyRegistered')
        : status === 'error'
          ? t('landing.waitlist.error')
          : null;

  return (
    <div className={`waitlist-form${compact ? ' waitlist-form--compact' : ''}`}>
      <form className="waitlist-form__form" onSubmit={(e) => void onSubmit(e)}>
        <input
          type="email"
          placeholder={t('landing.waitlist.emailPlaceholder')}
          className="waitlist-form__input"
          {...register('email')}
          disabled={status === 'loading' || status === 'success'}
        />
        <button
          type="submit"
          className="waitlist-form__submit"
          disabled={status === 'loading' || status === 'success'}
        >
          {status === 'loading' ? t('landing.waitlist.submitting') : t('landing.waitlist.submit')}
        </button>
      </form>

      {errors.email && <p className="waitlist-form__message waitlist-form__message--error">{t('landing.waitlist.error')}</p>}
      {message && (
        <p className={`waitlist-form__message${status === 'error' ? ' waitlist-form__message--error' : ' waitlist-form__message--success'}`}>
          {message}
        </p>
      )}

      <p className="waitlist-form__sign-in">
        {t('landing.waitlist.haveAccess')}{' '}
        <Link to={PATHS.login}>{t('landing.waitlist.signIn')}</Link>
      </p>
    </div>
  );
}
