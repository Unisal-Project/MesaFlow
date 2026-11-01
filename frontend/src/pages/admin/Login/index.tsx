import { useDocumentClass } from "@/hooks/useDocumentClass";
import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LayoutDashboard,
  NotebookPen,
  Utensils,
} from "lucide-react";
import { Button, TextField } from "@/components";
import logoAlternativo from "@/assets/logotipo/logo_alternativo-2.png";
import "./styles.scss";

type LoginProps = { onEnter: () => void };

export default function Login({ onEnter }: LoginProps) {
  useDocumentClass("login-active");

  const [isRegistering, setIsRegistering] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isRegistering && password !== confirmPassword) {
      const confirmation = event.currentTarget.elements.namedItem(
        "confirmPassword",
      ) as HTMLInputElement;
      confirmation.setCustomValidity("As senhas precisam ser iguais.");
      confirmation.reportValidity();
      return;
    }
    onEnter();
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    // A confirmação deve poder ser validada novamente após editar qualquer senha.
    const confirmation =
      event.target.form?.elements.namedItem("confirmPassword");
    if (confirmation instanceof HTMLInputElement)
      confirmation.setCustomValidity("");
  };

  const handleConfirmPasswordChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    event.target.setCustomValidity("");
    setConfirmPassword(event.target.value);
  };

  const switchMode = () => {
    setIsRegistering((current) => !current);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  return (
    <main className="login-page">
      <section className="login-intro" aria-labelledby="login-intro-title">
        <div className="login-brand">
          <img src={logoAlternativo} alt="" />
          <div>
            <strong>MesaFlow</strong>
            <span>GESTÃO DO RESTAURANTE</span>
          </div>
        </div>
        <div className="login-intro-content">
          <span className="login-eyebrow">MAIS FLUIDEZ PARA SUA OPERAÇÃO</span>
          <h1 id="login-intro-title">
            Tudo à mesa.
            <br />
            Tudo sob controle.
          </h1>
          <p>
            Pedidos, mesas e cardápio em um só lugar. Mais tempo para cuidar de
            quem importa: seus clientes.
          </p>
          <ul className="login-features">
            <li>
              <LayoutDashboard aria-hidden="true" />
              <span>Acompanhe sua operação</span>
            </li>
            <li>
              <Utensils aria-hidden="true" />
              <span>Organize os atendimentos</span>
            </li>
            <li>
              <NotebookPen aria-hidden="true" />
              <span>Gerencie seu cardápio</span>
            </li>
          </ul>
        </div>
        <p className="login-intro-footer">Feito para quem recebe bem.</p>
      </section>
      <section className="login-access" aria-labelledby="login-title">
        <div className="login-card">
          <span className="login-access-label">ÁREA ADMINISTRATIVA</span>
          <h2 id="login-title">
            {isRegistering ? "Comece com o MesaFlow" : "Bem-vindo de volta!"}
          </h2>
          <p className="login-description">
            {isRegistering
              ? "Cadastre seu estabelecimento e conheça uma gestão mais simples."
              : "Acesse o MesaFlow e acompanhe seu estabelecimento."}
          </p>
          <form
            key={isRegistering ? "register" : "login"}
            className="login-form"
            onSubmit={handleSubmit}
          >
            {isRegistering && (
              <>
                <TextField
                  id="register-name"
                  name="name"
                  label="Seu nome"
                  autoComplete="name"
                  placeholder="Como podemos chamar você?"
                  required
                />
                <TextField
                  id="register-restaurant"
                  name="restaurant"
                  label="Nome do estabelecimento"
                  autoComplete="organization"
                  placeholder="Nome do seu restaurante"
                  required
                />
              </>
            )}
            <TextField
              id="login-email"
              label="E-mail"
              type="email"
              autoComplete="username"
              placeholder="seuemail@exemplo.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <div className="login-password">
              <TextField
                id="login-password"
                label="Senha"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  isRegistering ? "new-password" : "current-password"
                }
                placeholder={
                  isRegistering
                    ? "Crie uma senha com pelo menos 8 caracteres"
                    : "Digite sua senha"
                }
                minLength={isRegistering ? 8 : undefined}
                required
                value={password}
                onChange={handlePasswordChange}
              />
              <button
                type="button"
                className="login-password-toggle"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" />
                ) : (
                  <Eye aria-hidden="true" />
                )}
              </button>
            </div>
            {isRegistering && (
              <TextField
                id="register-confirm-password"
                name="confirmPassword"
                label="Confirmar senha"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Digite a senha novamente"
                required
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
              />
            )}
            <Button type="submit">
              {isRegistering ? "Experimentar o MesaFlow" : "Entrar no painel"}
              <ArrowRight aria-hidden="true" />
            </Button>
          </form>
          <p className="login-switch">
            {isRegistering ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
            <button type="button" onClick={switchMode}>
              {isRegistering ? "Entrar" : "Criar conta"}
            </button>
          </p>
          <p className="login-demo" role="note">
            <strong>
              {isRegistering
                ? "Cadastro demonstrativo"
                : "Acesso demonstrativo"}
            </strong>
            {isRegistering
              ? "Este formulário permite explorar o painel. Nenhuma conta é criada e os dados não são enviados nem armazenados."
              : "Preencha os campos para explorar o painel. As credenciais não são verificadas nem armazenadas."}
          </p>
        </div>
        <footer className="login-footer">
          MesaFlow · Gestão que acompanha o seu ritmo.
        </footer>
      </section>
    </main>
  );
}
