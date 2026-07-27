import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, ApiError, Auth } from '../../lib/api';
import type { TokenOut } from '../../lib/types';
import { ICON } from '../../lib/icons';
import { useUi } from '../../components/UiProvider';
import { EMAIL_DOMAIN, PASSWORD_RULE, emailLocalSchema } from './rules';

/**
 * Login + cadastro na mesma tela, como no `index.html` atual.
 * As regras de e-mail e senha SAO AS MESMAS do backend (ver `rules.ts`) para
 * o usuario receber o erro antes do round-trip — mas o servidor continua sendo
 * a autoridade: qualquer `detail` que voltar da API vira toast.
 */
const loginSchema = z.object({
  email: emailLocalSchema,
  password: z.string().min(1, 'Informe a senha.'),
  remember_me: z.boolean().optional(),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome completo.').max(120),
  email: emailLocalSchema,
  password: z
    .string()
    .min(8, 'Mínimo de 8 caracteres.')
    .regex(PASSWORD_RULE, 'Precisa de 1 maiúscula e 1 caractere especial.'),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

function strengthLevel(pwd: string): number {
  if (!pwd) return 0;
  let level = 0;
  if (pwd.length >= 8) level += 1;
  if (/[A-Z]/.test(pwd)) level += 1;
  if (/[!@#$%^&*(),.?":{}|<>_\-+=[\]/\\;'`~]/.test(pwd)) level += 1;
  return level;
}

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();
  const { toast } = useUi();

  useEffect(() => {
    if (!Auth.token) return;
    navigate(Auth.user?.role === 'admin' ? '/admin' : '/app', { replace: true });
  }, [navigate]);

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-aside__glow" />
        <div className="brand">
          <span className="logo">{ICON.wallet}</span>
          <strong>Financeiro</strong>
        </div>

        <div className="auth-pitch">
          <h1 className="auth-headline">
            Planejar,
            <br />
            pagar,
            <br />
            <em>saber para onde foi.</em>
          </h1>

          {/* ELEMENTO-ASSINATURA — o ciclo do sistema, acontecendo.
              O produto e um item mudando de estado: entra planejado, sai pago,
              e o total desce. Em vez de descrever isso em bullets, a tela
              executa. Uma linha e marcada como paga a cada 2,6s e o saldo
              acompanha. E decorativo no sentido de que nao ha dado real, mas
              nao e enfeite: e a explicacao mais curta do que o sistema faz. */}
          <div className="ledger" aria-hidden="true">
            <div className="ledger-head">
              <span>Lista de compras</span>
              <span className="ledger-total money">R$ 940,00</span>
            </div>
            <ul className="ledger-rows">
              <li className="ledger-row" style={{ '--i': 0 } as CSSProperties}>
                <span className="ledger-dot" />
                <span className="ledger-name">Mercado do mês</span>
                <span className="ledger-value money">R$ 620,00</span>
              </li>
              <li className="ledger-row" style={{ '--i': 1 } as CSSProperties}>
                <span className="ledger-dot" />
                <span className="ledger-name">Conta de luz</span>
                <span className="ledger-value money">R$ 180,00</span>
              </li>
              <li className="ledger-row" style={{ '--i': 2 } as CSSProperties}>
                <span className="ledger-dot" />
                <span className="ledger-name">Passagem do mês</span>
                <span className="ledger-value money">R$ 140,00</span>
              </li>
            </ul>
          </div>
        </div>

        <p className="hint">Acesso restrito. Novos cadastros passam por aprovação.</p>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-tabs" role="tablist">
            <span
              className="auth-tabs-indicator"
              style={{
                transform: `translateX(${mode === 'login' ? '0' : 'calc(100% + 4px)'})`,
              }}
            />
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`auth-tab${mode === 'login' ? ' active' : ''}`}
              onClick={() => setMode('login')}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={`auth-tab${mode === 'register' ? ' active' : ''}`}
              onClick={() => setMode('register')}
            >
              Criar conta
            </button>
          </div>

          {mode === 'login' ? (
            <LoginForm onError={(m) => toast(m, 'error')} />
          ) : (
            <RegisterForm
              onDone={() => navigate('/status')}
              onError={(m) => toast(m, 'error')}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function LoginForm({ onError }: { onError: (m: string) => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const submit = handleSubmit(async (values) => {
    setBusy(true);
    try {
      const data = await api<TokenOut>('/auth/login', {
        method: 'POST',
        auth: false,
        body: {
          email: values.email,
          password: values.password,
          remember_me: values.remember_me ?? false,
        },
      });
      Auth.token = data.access_token;
      Auth.user = data.user;
      qc.setQueriesData({ queryKey: ['me'] }, data.user);
      navigate(data.user.role === 'admin' ? '/admin' : '/app', { replace: true });
    } catch (e) {
      const err = e as ApiError;
      // 403 = conta pendente ou suspensa: o texto vem do backend.
      if (err.status === 403 && err.message.toLowerCase().includes('pendente')) {
        navigate('/status');
        return;
      }
      onError(err.message);
    } finally {
      setBusy(false);
    }
  });

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="login-email">E-mail</label>
        <div className="email-suffix">
          <input id="login-email" autoComplete="username" {...register('email')} />
          <span>{EMAIL_DOMAIN}</span>
        </div>
        {errors.email && <p className="field-error">{errors.email.message}</p>}
      </div>

      <div className="field">
        <label htmlFor="login-password">Senha</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password && <p className="field-error">{errors.password.message}</p>}
      </div>

      <label className="checkbox-row">
        <input type="checkbox" {...register('remember_me')} />
        Manter conectado por 30 dias
      </label>

      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Entrando…' : 'Entrar'}
      </button>

      <div className="auth-links">
        <a href="/forgot">Esqueci minha senha</a>
      </div>
    </form>
  );
}

function RegisterForm({
  onDone,
  onError,
}: {
  onDone: () => void;
  onError: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [pwd, setPwd] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const submit = handleSubmit(async (values) => {
    setBusy(true);
    try {
      await api('/auth/register', { method: 'POST', auth: false, body: values });
      onDone();
    } catch (e) {
      onError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  });

  const level = strengthLevel(pwd);

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="reg-name">Nome</label>
        <input id="reg-name" autoComplete="name" {...register('name')} />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>

      <div className="field">
        <label htmlFor="reg-email">E-mail</label>
        <div className="email-suffix">
          <input id="reg-email" autoComplete="username" {...register('email')} />
          <span>{EMAIL_DOMAIN}</span>
        </div>
        {errors.email && <p className="field-error">{errors.email.message}</p>}
      </div>

      <div className="field">
        <label htmlFor="reg-password">Senha</label>
        <input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          {...register('password', {
            onChange: (e) => setPwd(e.target.value as string),
          })}
        />
        <div className="strength" data-level={level} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="hint">Mínimo 8 caracteres, 1 maiúscula e 1 caractere especial.</p>
        {errors.password && <p className="field-error">{errors.password.message}</p>}
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Enviando…' : 'Criar conta'}
      </button>
      <p className="hint">
        Seu cadastro fica pendente até um administrador aprovar.
      </p>
    </form>
  );
}
