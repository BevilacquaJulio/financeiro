import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useUi } from '../../components/UiProvider';
import { PASSWORD_RULE } from './rules';
import { ICON } from '../../lib/icons';

/**
 * Porte de `reset.html`.
 *
 * ATENCAO: o link enviado por e-mail aponta para `/reset.html?token=...`
 * (montado pelo backend). Mantemos essa rota funcionando no SPA para nao
 * invalidar links ja enviados — ver App.tsx.
 */
export function ResetPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useUi();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!PASSWORD_RULE.test(password)) {
      toast(
        'A senha deve ter ao menos 8 caracteres, 1 maiúscula e 1 caractere especial.',
        'warning',
      );
      return;
    }
    setBusy(true);
    try {
      await api('/auth/password/reset', {
        method: 'POST',
        auth: false,
        body: { token, password },
      });
      toast('Senha redefinida. Faça login novamente.', 'success');
      navigate('/');
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
        <h2 style={{ margin: '0 0 6px', textAlign: 'center' }}>Definir nova senha</h2>

        {!token ? (
          <>
            <p className="muted" style={{ textAlign: 'center' }}>
              Link inválido: o token não veio na URL.
            </p>
            <Link to="/forgot" className="btn btn-primary btn-block">
              Solicitar novo link
            </Link>
          </>
        ) : (
          <form className="stack" onSubmit={submit}>
            <div className="field">
              <label htmlFor="reset-pwd">Nova senha</label>
              <input
                id="reset-pwd"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="hint">
                Mínimo 8 caracteres, 1 maiúscula e 1 caractere especial.
              </p>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Salvando…' : 'Redefinir senha'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
