import { Link } from 'react-router-dom';
import { ICON } from '../../lib/icons';

/** Porte de `status.html` — tela de "aguardando aprovacao". */
export function StatusPage() {
  return (
    <main className="auth-main">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="boot__logo" style={{ margin: '0 auto 20px' }}>
          {ICON.clock}
        </div>
        <h2 style={{ margin: '0 0 10px' }}>Cadastro em análise</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Seu acesso foi registrado e está aguardando aprovação do administrador.
          Você poderá entrar assim que a conta for liberada.
        </p>
        <Link to="/" className="btn btn-primary btn-block" style={{ marginTop: 22 }}>
          Voltar para o login
        </Link>
      </div>
    </main>
  );
}
