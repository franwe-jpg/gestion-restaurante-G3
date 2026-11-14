import { ChefHat } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { BotonTema } from '../components/layout/BotonTema';

import { CredencialesPrueba } from './CredencialesPrueba';
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
    <section className="flex flex-1 basis-[420px] flex-col justify-between gap-8 bg-slate-900 p-12 text-slate-50 dark:bg-[#0b1220] dark:text-[#e2e8f0]">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-700 text-[#fff]">
          <ChefHat className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className="text-xl font-bold">GastroAdmin</span>
      </div>
      <div className="max-w-md">
        <h1 className="text-4xl font-extrabold leading-tight">Gestión del restaurante</h1>
        <p className="mt-4 text-base text-slate-300 dark:text-[#94a3b8]">
          Carta, salón, comandas, reservas y pagos en un solo lugar.
        </p>
      </div>
      <span aria-hidden="true" />
    </section>
  );
}

function mostrarCredenciales(): boolean {
  return import.meta.env.VITE_MOSTRAR_CREDENCIALES === 'true';
}

function useFormularioLogin(origen: string) {
  const { iniciarSesion } = useSesion();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState<ErroresLogin>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

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

  const elegirCredencial = (correoElegido: string, contrasenaElegida: string) => {
    setCorreo(correoElegido);
    setContrasena(contrasenaElegida);
    setErrores({});
    setErrorGeneral(null);
  };

  return {
    correo,
    setCorreo,
    contrasena,
    setContrasena,
    errores,
    errorGeneral,
    enviando,
    enviar,
    elegirCredencial,
  };
}

type FormularioLoginEstado = ReturnType<typeof useFormularioLogin>;

function FormularioLogin({ formulario }: { formulario: FormularioLoginEstado }) {
  const { correo, contrasena, errores, errorGeneral, enviando } = formulario;
  return (
    <form
      noValidate
      onSubmit={(evento) => void formulario.enviar(evento)}
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
          onChange={(evento) => formulario.setCorreo(evento.target.value)}
        />
      </FormField>
      <FormField id="login-contrasena" label="Contraseña" error={errores.contrasena}>
        <Input
          id="login-contrasena"
          type="password"
          autoComplete="current-password"
          value={contrasena}
          onChange={(evento) => formulario.setContrasena(evento.target.value)}
        />
      </FormField>
      <Button type="submit" size="lg" disabled={enviando}>
        Ingresar
      </Button>
    </form>
  );
}

export function LoginPage() {
  const { usuario, cargando } = useSesion();
  const location = useLocation();
  const origen = origenDeLogin(location.state);
  const formulario = useFormularioLogin(origen);

  if (cargando) return null;
  if (usuario !== null) return <Navigate to={origen} replace />;

  return (
    <div className="relative flex min-h-screen flex-wrap bg-slate-50">
      <div className="absolute right-4 top-4 z-10">
        <BotonTema />
      </div>
      <PanelDeMarca />
      <section className="flex flex-[999_1_480px] items-center justify-center px-6 py-12">
        <div className="flex w-full flex-wrap items-start justify-center gap-12">
          <FormularioLogin formulario={formulario} />
          {mostrarCredenciales() && (
            <CredencialesPrueba onElegir={formulario.elegirCredencial} correo={formulario.correo} />
          )}
        </div>
      </section>
    </div>
  );
}
