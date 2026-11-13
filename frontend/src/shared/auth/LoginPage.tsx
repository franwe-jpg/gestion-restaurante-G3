import { ChefHat } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';

import { origenDeLogin } from './origen';
import { useSesion } from './useSesion';

interface ErroresLogin {
  correo?: string;
  contrasena?: string;
}

function validar(correo: string, contrasena: string): ErroresLogin {
  const errores: ErroresLogin = {};
  if (correo === '') errores.correo = 'El correo es obligatorio.';
  if (contrasena === '') errores.contrasena = 'La contraseña es obligatoria.';
  return errores;
}

function PanelDeMarca() {
  return (
    <section className="flex flex-1 basis-[420px] flex-col justify-between gap-8 bg-slate-900 p-12 text-slate-50">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-700 text-white">
          <ChefHat className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className="text-xl font-bold">GastroAdmin</span>
      </div>
      <div className="max-w-md">
        <h1 className="text-4xl font-extrabold leading-tight">Gestión del restaurante</h1>
        <p className="mt-4 text-base text-slate-300">
          Carta, salón, comandas, reservas y pagos en un solo lugar.
        </p>
      </div>
      <span aria-hidden="true" />
    </section>
  );
}

export function LoginPage() {
  const { usuario, cargando, iniciarSesion } = useSesion();
  const navigate = useNavigate();
  const location = useLocation();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState<ErroresLogin>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const origen = origenDeLogin(location.state);

  if (cargando) return null;
  if (usuario !== null) return <Navigate to={origen} replace />;

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (enviando) return;
    const locales = validar(correo.trim(), contrasena);
    setErrores(locales);
    setErrorGeneral(null);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    const resultado = await iniciarSesion(correo.trim(), contrasena);
    setEnviando(false);
    if (resultado.exito) {
      navigate(origen, { replace: true });
      return;
    }
    setContrasena('');
    setErrorGeneral(resultado.error ?? 'No se pudo iniciar sesión');
  };

  return (
    <div className="flex min-h-screen flex-wrap bg-slate-50">
      <PanelDeMarca />
      <section className="flex flex-[999_1_480px] items-center justify-center px-6 py-12">
        <form
          noValidate
          onSubmit={(evento) => void enviar(evento)}
          className="flex w-full max-w-sm flex-col gap-5"
        >
          <h2 className="text-3xl font-extrabold text-slate-900">Ingresá al sistema</h2>
          {errorGeneral && <Alert variant="danger">{errorGeneral}</Alert>}
          <FormField id="login-correo" label="Correo" error={errores.correo}>
            <Input
              id="login-correo"
              type="email"
              autoComplete="username"
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
            />
          </FormField>
          <FormField id="login-contrasena" label="Contraseña" error={errores.contrasena}>
            <Input
              id="login-contrasena"
              type="password"
              autoComplete="current-password"
              value={contrasena}
              onChange={(evento) => setContrasena(evento.target.value)}
            />
          </FormField>
          <Button type="submit" size="lg" disabled={enviando}>
            Ingresar
          </Button>
        </form>
      </section>
    </div>
  );
}
