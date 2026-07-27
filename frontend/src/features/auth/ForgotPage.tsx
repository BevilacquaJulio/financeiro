import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useUi } from '../../components/UiProvider';
import { EMAIL_DOMAIN } from './rules';
import { ICON } from '../../lib/icons';

/** Porte de `forgot.html`. */
export function ForgotPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useUi();

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/auth/password/forgot', {
        method: 'POST',
        auth: false,
        body: { email },
      });
      setSent(true);
    } catch (err) {
      toast((err as ApiError).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-main">
      <div className="auth-card">
        <div className="boot__logo" style={{ margin: '0 auto 18px' }}>
          {ICON.key}
        </div>
        <h2 style={{ margin: '0 0 6px', textAlign: 'center' }}>Recuperar senha</h2>

        {sent ? (
          <>
            <p className="muted" style={{ textAlign: 'center' }}>
              Solicitação registrada. Um administrador precisa aprovar o pedido;
              depois disso você recebe o link de redefinição.
            </p>
            <Link to="/" className="btn btn-primary btn-block" style={{ marginTop: 18 }}>
              Voltar para o login
            </Link>
          </>
        ) : (
          <form className="stack" onSubmit={submit}>
            <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
              Informe seu e-mail. O pedido vai para análise do administrador.
            </p>
            <div className="field">
              <label htmlFor="forgot-email">E-mail</label>
              <div className="email-suffix">
                <input
                  id="forgot-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <span>{EMAIL_DOMAIN}</span>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Enviando…' : 'Solicitar recuperação'}
            </button>
            <div className="auth-links">
              <Link to="/">Voltar</Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
