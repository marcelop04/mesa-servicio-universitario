import { useState, type ReactNode } from "react"

type Screen = "login" | "register" | "profile" | "notifications" | "new-request" | "requests" | "request-detail" | "supervision" | "dashboard" | "technical" | "users-admin" | "configuration"
type IconName = "arrow" | "bell" | "check" | "chevron" | "clock" | "eye" | "file" | "home" | "image" | "lock" | "mail" | "map" | "menu" | "plus" | "profile" | "shield" | "user"

function Icon({ name, size = 20 }: { name: IconName size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="m9 18 6-6-6-6" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h8l4 4v16H6z" />
        <path d="M14 2v5h5M9 12h6M9 16h6" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m4 17 5-5 4 4 2-2 5 5" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    map: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    shield: (
      <>
        <path d="M12 2 20 5v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-brand">
        <Icon name="shield" size={23} />
      </span>
      {!compact && (
        <div className="leading-tight">
          <p className="text-sm font-extrabold tracking-wide text-brand">
            MESA DE SERVICIOS
          </p>
          <p className="mt-0.5 text-xs font-medium tracking-wide text-slate-500">
            UNIVERSITARIOS · UNMSM
          </p>
        </div>
      )}
    </div>
  )
}

function Button({
  children,
  className = "",
  icon,
  onClick,
  type = "button",
  variant = "primary",
}: {
  children: ReactNode
  className?: string
  icon?: IconName
  onClick?: () => void
  type?: "button" | "submit"
  variant?: "primary" | "secondary" | "quiet"
}) {
  const variants = {
    primary: "bg-brand text-white hover:bg-brand-hover shadow-button",
    secondary:
      "border border-slate-300 bg-white text-brand hover:border-brand hover:bg-slate-50",
    quiet: "text-brand hover:bg-brand-soft",
  }
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${variants[variant]} ${className}`}
      onClick={onClick}
      type={type}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  )
}

function TextLink({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      className="font-bold text-link underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-brand"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

function Field({
  autoComplete,
  helper,
  icon,
  label,
  placeholder,
  type = "text",
}: {
  autoComplete?: string
  helper?: string
  icon?: IconName
  label: string
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Icon name={icon} size={18} />
          </span>
        )}
        <input
          autoComplete={autoComplete}
          className={`h-11 w-full rounded-lg border border-slate-300 bg-white text-sm text-ink outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-brand focus:ring-3 focus:ring-brand-ring ${
            icon ? "pl-11 pr-4" : "px-4"
          }`}
          placeholder={placeholder}
          type={type}
        />
        {type === "password" && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
            <Icon name="eye" size={18} />
          </span>
        )}
      </span>
      {helper && (
        <span className="mt-1.5 block text-xs text-slate-500">{helper}</span>
      )}
    </label>
  )
}

function SelectField() {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-ink">
        Vínculo universitario
      </span>
      <span className="relative block">
        <select
          className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 pr-10 text-sm text-ink outline-none transition hover:border-slate-400 focus:border-brand focus:ring-3 focus:ring-brand-ring"
          defaultValue=""
        >
          <option disabled value="">
            Selecciona una opción
          </option>
          <option>Estudiante</option>
          <option>Docente</option>
          <option>Administrativo</option>
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex rotate-90 items-center pr-3.5 text-slate-500">
          <Icon name="chevron" size={18} />
        </span>
      </span>
    </label>
  )
}

function AuthShell({
  children,
  footerText,
  footerLink,
  onFooterClick,
  step,
  subtitle,
  title,
}: {
  children: ReactNode
  footerLink: string
  footerText: string
  onFooterClick: () => void
  step: string
  subtitle: string
  title: string
}) {
  return (
    <main className="auth-grid min-h-screen bg-canvas">
      <section className="hidden overflow-hidden bg-brand lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Brand />
        <div className="relative z-10 max-w-md">
          <p className="mb-5 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold tracking-widest text-blue-100">
            SOPORTE UNIVERSITARIO
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
            Conectamos tus consultas con las soluciones.
          </h1>
          <p className="mt-5 text-base leading-7 text-blue-100">
            Un solo lugar para registrar, seguir y resolver tus solicitudes de
            servicio en la universidad.
          </p>
        </div>
        <p className="relative z-10 text-xs text-blue-200">
          © 2025 Universidad Nacional Mayor de San Marcos
        </p>
        <span className="auth-orb auth-orb-one" />
        <span className="auth-orb auth-orb-two" />
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-16">
        <div className="w-full max-w-lg">
          <div className="mb-9 flex items-center justify-between lg:hidden">
            <Brand />
            <span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-extrabold text-brand">
              {step}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-9">
            <div className="mb-7">
              <p className="mb-2 text-xs font-extrabold tracking-widest text-link">
                {step}
              </p>
              <h2 className="text-2xl font-extrabold tracking-tight text-brand sm:text-3xl">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {subtitle}
              </p>
            </div>
            {children}
          </div>
          <p className="mt-6 text-center text-sm text-slate-600">
            {footerText}{" "}
            <TextLink onClick={onFooterClick}>{footerLink}</TextLink>
          </p>
        </div>
      </section>
    </main>
  )
}

function Login({ goTo }: { goTo: (screen: Screen) => void }) {
  return (
    <AuthShell
      footerLink="Crear una cuenta"
      footerText="¿Aún no tienes una cuenta?"
      onFooterClick={() => goTo("register")}
      step="P02 · IDENTIDAD"
      subtitle="Ingresa tus credenciales institucionales para continuar."
      title="Bienvenido de nuevo"
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          goTo("technical")
        }}
      >
        <Field
          autoComplete="email"
          icon="mail"
          label="Correo institucional"
          placeholder="nombre@unmsm.edu.pe"
          type="email"
        />
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-ink">Contraseña</span>
            <TextLink>¿Olvidaste tu contraseña?</TextLink>
          </div>
          <Field
            autoComplete="current-password"
            icon="lock"
            label=""
            placeholder="Ingresa tu contraseña"
            type="password"
          />
        </div>
        <Button className="w-full" type="submit">
          Iniciar sesión
        </Button>
        <p className="text-center text-xs text-slate-500">
          Acceso principal del prototipo:{" "}
          <strong className="text-ink">Carlos Mendoza · Técnico</strong>
        </p>
        <div className="border-t border-slate-200 pt-5">
          <p className="text-center text-xs font-extrabold tracking-widest text-slate-400">
            EXPLORAR OTRAS VARIANTES
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              {
                name: "Andrea Vargas",
                role: "Solicitante",
                screen: "requests" as Screen,
              },
              {
                name: "Lucía Mendoza",
                role: "Supervisora",
                screen: "supervision" as Screen,
              },
              {
                name: "Rafael Castillo",
                role: "Administrador",
                screen: "users-admin" as Screen,
              },
            ].map((account) => (
              <button
                className="rounded-lg border border-slate-200 px-3 py-3 text-left transition hover:border-brand hover:bg-brand-soft"
                key={account.role}
                onClick={() => goTo(account.screen)}
                type="button"
              >
                <span className="block text-xs font-extrabold text-brand">
                  {account.role}
                </span>
                <span className="mt-1 block truncate text-xs text-slate-500">
                  {account.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </form>
    </AuthShell>
  )
}

function Register({ goTo }: { goTo: (screen: Screen) => void }) {
  return (
    <AuthShell
      footerLink="Iniciar sesión"
      footerText="¿Ya tienes una cuenta?"
      onFooterClick={() => goTo("login")}
      step="P01 · IDENTIDAD"
      subtitle="Crea tu cuenta para registrar y dar seguimiento a tus solicitudes."
      title="Registro de solicitante"
    >
      <form
        className="grid gap-5 sm:grid-cols-2"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="sm:col-span-2">
          <Field
            autoComplete="name"
            helper="Entre 2 y 100 caracteres."
            icon="user"
            label="Nombre completo"
            placeholder="Nombres y apellidos"
          />
        </div>
        <div className="sm:col-span-2">
          <Field
            autoComplete="email"
            icon="mail"
            label="Correo institucional"
            placeholder="nombre@unmsm.edu.pe"
            type="email"
          />
        </div>
        <div className="sm:col-span-2">
          <SelectField />
        </div>
        <Field
          autoComplete="new-password"
          helper="Entre 10 y 64 caracteres."
          icon="lock"
          label="Contraseña"
          placeholder="Crea una contraseña"
          type="password"
        />
        <Field
          autoComplete="new-password"
          icon="lock"
          label="Confirmación"
          placeholder="Repite la contraseña"
          type="password"
        />
        <div className="sm:col-span-2">
          <Button className="w-full" type="submit">
            Crear cuenta
          </Button>
          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            Al registrarte, aceptas el uso de tus datos para la gestión de
            solicitudes universitarias.
          </p>
        </div>
      </form>
    </AuthShell>
  )
}

function Sidebar({
  active,
  goTo,
}: {
  active: Screen
  goTo: (screen: Screen) => void
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const supervisorMode = active === "supervision" || active === "dashboard"
  const technicianMode = active === "technical"
  const adminMode = active === "users-admin" || active === "configuration"
  const nav = adminMode
    ? [
        {
          icon: "user" as IconName,
          label: "Usuarios internos",
          screen: "users-admin" as Screen,
        },
        {
          icon: "shield" as IconName,
          label: "Configuración y auditoría",
          screen: "configuration" as Screen,
        },
      ]
    : technicianMode
      ? [
          {
            icon: "file" as IconName,
            label: "Atención técnica",
            screen: "technical" as Screen,
          },
        ]
      : supervisorMode
        ? [
            {
              icon: "file" as IconName,
              label: "Bandeja de supervisión",
              screen: "supervision" as Screen,
            },
            {
              icon: "home" as IconName,
              label: "Dashboard",
              screen: "dashboard" as Screen,
            },
          ]
        : [
            {
              icon: "file" as IconName,
              label: "Mis solicitudes",
              screen: "requests" as Screen,
            },
            {
              icon: "plus" as IconName,
              label: "Nueva solicitud",
              screen: "new-request" as Screen,
            },
            {
              icon: "bell" as IconName,
              label: "Notificaciones",
              screen: "notifications" as Screen,
              badge: 3,
            },
          ]
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="border-b border-slate-100 px-6 py-5">
        <Brand />
      </div>
      <nav className="flex-1 space-y-1 px-4 py-7" aria-label="Principal">
        <p className="mb-3 px-3 text-xs font-extrabold tracking-widest text-slate-400">
          {adminMode
            ? "ADMINISTRACIÓN"
            : technicianMode
              ? "ATENCIÓN TÉCNICA"
              : supervisorMode
                ? "SUPERVISIÓN"
                : "GESTIÓN"}
        </p>
        {nav.map((item) => (
          <button
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition ${
              active === item.screen
                ? "bg-brand-soft text-brand"
                : "text-slate-600 hover:bg-slate-50 hover:text-brand"
            }`}
            key={item.label}
            onClick={() => goTo(item.screen)}
            type="button"
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto grid size-6 place-items-center rounded-full bg-brand text-xs text-white">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="relative border-t border-slate-100 p-4">
        {userMenuOpen && (
          <div className="absolute inset-x-4 bottom-full mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-card">
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-danger transition hover:bg-danger-soft"
              onClick={() => goTo("login")}
              type="button"
            >
              <span className="rotate-180">
                <Icon name="arrow" size={17} />
              </span>
              Cerrar sesión
            </button>
          </div>
        )}
        <button
          aria-expanded={userMenuOpen}
          aria-haspopup="menu"
          className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate-50"
          onClick={() => setUserMenuOpen((open) => !open)}
          type="button"
        >
          <span className="grid size-10 place-items-center rounded-full bg-brand text-sm font-extrabold text-white">
            {adminMode
              ? "RC"
              : technicianMode
                ? "CM"
                : supervisorMode
                  ? "LM"
                  : "AV"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-ink">
              {adminMode
                ? "Rafael Castillo"
                : technicianMode
                  ? "Carlos Mendoza"
                  : supervisorMode
                    ? "Lucía Mendoza"
                    : "Andrea Vargas"}
            </span>
            <span className="block truncate text-xs text-slate-500">
              {adminMode
                ? "Administrador"
                : technicianMode
                  ? "Técnico · Soporte informático"
                  : supervisorMode
                    ? "Supervisora de servicios"
                    : "Estudiante"}
            </span>
          </span>
          <Icon name="chevron" size={16} />
        </button>
      </div>
    </aside>
  )
}

function AppHeader({
  active,
  goTo,
  title,
  subtitle,
}: {
  active: Screen
  goTo: (screen: Screen) => void
  subtitle: string
  title: string
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const supervisorMode = active === "supervision" || active === "dashboard"
  const technicianMode = active === "technical"
  const adminMode = active === "users-admin" || active === "configuration"
  const userName = adminMode
    ? "Rafael Castillo"
    : technicianMode
      ? "Carlos Mendoza"
      : supervisorMode
        ? "Lucía Mendoza"
        : "Andrea Vargas"
  const userRole = adminMode
    ? "Administrador"
    : technicianMode
      ? "Técnico · Soporte informático"
      : supervisorMode
        ? "Supervisora de servicios"
        : "Solicitante · Estudiante"
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8 lg:py-5">
        <div className="flex items-center gap-3">
          <span className="text-brand lg:hidden">
            <Icon name="menu" size={24} />
          </span>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-brand lg:text-xl">
              {title}
            </p>
            <p className="hidden text-sm text-slate-500 sm:block">{subtitle}</p>
          </div>
        </div>
        <div className="relative flex items-center gap-2">
          <button
            aria-label="Notificaciones"
            className="relative grid size-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100"
            type="button"
          >
            <Icon name="bell" size={20} />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-accent ring-2 ring-white" />
          </button>
          <button
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            aria-label={`Abrir menú de ${userName}`}
            className="grid size-9 place-items-center rounded-full bg-brand text-xs font-extrabold text-white lg:hidden"
            onClick={() => setUserMenuOpen((open) => !open)}
            type="button"
          >
            {adminMode
              ? "RC"
              : technicianMode
                ? "CM"
                : supervisorMode
                  ? "LM"
                  : "AV"}
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-card lg:hidden">
              <div className="border-b border-slate-100 px-3 py-2.5">
                <p className="text-sm font-extrabold text-ink">{userName}</p>
                <p className="mt-0.5 text-xs text-slate-500">{userRole}</p>
              </div>
              <button
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-danger hover:bg-danger-soft"
                onClick={() => goTo("login")}
                type="button"
              >
                <span className="rotate-180">
                  <Icon name="arrow" size={17} />
                </span>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function MobileNav({
  active,
  goTo,
}: {
  active: Screen
  goTo: (screen: Screen) => void
}) {
  const supervisorMode = active === "supervision" || active === "dashboard"
  const technicianMode = active === "technical"
  const adminMode = active === "users-admin" || active === "configuration"
  const items = adminMode
    ? [
        {
          icon: "user" as IconName,
          label: "Usuarios",
          screen: "users-admin" as Screen,
        },
        {
          icon: "shield" as IconName,
          label: "Configuración",
          screen: "configuration" as Screen,
        },
      ]
    : technicianMode
      ? [
          {
            icon: "file" as IconName,
            label: "Atención",
            screen: "technical" as Screen,
          },
        ]
      : supervisorMode
        ? [
            {
              icon: "file" as IconName,
              label: "Bandeja",
              screen: "supervision" as Screen,
            },
            {
              icon: "home" as IconName,
              label: "Indicadores",
              screen: "dashboard" as Screen,
            },
          ]
        : [
            {
              icon: "file" as IconName,
              label: "Solicitudes",
              screen: "requests" as Screen,
            },
            {
              icon: "plus" as IconName,
              label: "Nueva",
              screen: "new-request" as Screen,
            },
            {
              icon: "bell" as IconName,
              label: "Avisos",
              screen: "notifications" as Screen,
            },
            {
              icon: "profile" as IconName,
              label: "Perfil",
              screen: "profile" as Screen,
            },
          ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white px-2 pb-safe lg:hidden">
      {items.map((item) => (
        <button
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-bold ${
            active === item.screen ? "text-brand" : "text-slate-500"
          }`}
          key={item.label}
          onClick={() => goTo(item.screen)}
          type="button"
        >
          <Icon name={item.icon} size={20} />
          {item.label}
        </button>
      ))}
    </nav>
  )
}

function AppShell({
  active,
  children,
  goTo,
  subtitle,
  title,
}: {
  active: Screen
  children: ReactNode
  goTo: (screen: Screen) => void
  subtitle: string
  title: string
}) {
  return (
    <div className="min-h-screen bg-canvas lg:pl-64">
      <Sidebar active={active} goTo={goTo} />
      <AppHeader
        active={active}
        goTo={goTo}
        subtitle={subtitle}
        title={title}
      />
      {children}
      <MobileNav active={active} goTo={goTo} />
    </div>
  )
}

const accountData = [
  ["Nombre completo", "Andrea Vargas Salazar"],
  ["Correo institucional", "andrea.vargas@unmsm.edu.pe"],
  ["Vínculo universitario", "Estudiante"],
  ["Rol", "Solicitante"],
  ["Área técnica", "No aplica"],
]

function Profile({ goTo }: { goTo: (screen: Screen) => void }) {
  return (
    <AppShell
      active="profile"
      goTo={goTo}
      subtitle="Administra la información y seguridad de tu cuenta."
      title="Mi perfil"
    >
      <main className="mx-auto max-w-6xl px-5 py-6 pb-28 lg:px-8 lg:py-8">
        <section className="mb-6 flex flex-col gap-4 rounded-2xl bg-brand p-5 text-white shadow-brand sm:flex-row sm:items-center sm:p-7">
          <span className="grid size-16 shrink-0 place-items-center rounded-full border-2 border-white/40 bg-white/15 text-xl font-extrabold">
            AV
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold sm:text-2xl">
                Andrea Vargas Salazar
              </h1>
              <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-extrabold text-success">
                Cuenta activa
              </span>
            </div>
            <p className="mt-1 text-sm text-blue-100">
              Solicitante · Estudiante de Ingeniería de Sistemas
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-5">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-card lg:col-span-3">
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <h2 className="text-lg font-extrabold text-brand">
                Datos de la cuenta
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Información registrada en tu cuenta universitaria.
              </p>
            </div>
            <dl className="divide-y divide-slate-100 px-5 sm:px-6">
              {accountData.map(([label, value]) => (
                <div
                  className="grid gap-1 py-4 sm:grid-cols-5 sm:items-center"
                  key={label}
                >
                  <dt className="text-xs font-bold text-slate-500 sm:col-span-2 sm:text-sm">
                    {label}
                  </dt>
                  <dd className="flex items-center gap-2 text-sm font-semibold text-ink sm:col-span-3">
                    {value}
                    {label === "Rol" && (
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
                        Solo lectura
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="m-5 flex gap-3 rounded-lg bg-info-soft p-4 text-sm leading-6 text-info sm:m-6">
              <Icon name="shield" size={20} />
              <p>
                El rol y vínculo son administrados por la universidad. Si
                encuentras un error, contacta a soporte.
              </p>
            </div>
          </section>

          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6 lg:col-span-2">
            <span className="mb-4 grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon name="lock" size={20} />
            </span>
            <h2 className="text-lg font-extrabold text-brand">
              Cambiar contraseña
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Usa al menos 10 caracteres para proteger tu cuenta.
            </p>
            <form
              className="mt-6 space-y-5"
              onSubmit={(event) => event.preventDefault()}
            >
              <Field
                autoComplete="current-password"
                label="Contraseña actual"
                placeholder="Ingresa tu contraseña"
                type="password"
              />
              <Field
                autoComplete="new-password"
                label="Nueva contraseña"
                placeholder="Mínimo 10 caracteres"
                type="password"
              />
              <Field
                autoComplete="new-password"
                label="Confirmación"
                placeholder="Repite la nueva contraseña"
                type="password"
              />
              <Button className="w-full" type="submit">
                Actualizar contraseña
              </Button>
            </form>
          </section>
        </div>
      </main>
    </AppShell>
  )
}

type NotificationType = "Asignación" | "Cambio de estado" | "Comentario" | "Alerta 80% de plazo" | "Escalamiento por vencimiento"

const notices: {
  code: string
  date: string
  description: string
  read: boolean
  title: string
  type: NotificationType
}[] = [
  {
    code: "SOL-2025-01842",
    date: "18 jun 2025 · 10:32",
    description:
      "Tu solicitud fue asignada a la Mesa de Ayuda de Sistemas para su atención.",
    read: false,
    title: "Solicitud asignada a un equipo técnico",
    type: "Asignación",
  },
  {
    code: "SOL-2025-01836",
    date: "18 jun 2025 · 09:15",
    description:
      "El estado cambió de “Registrada” a “En atención”. Un especialista ya está revisando tu caso.",
    read: false,
    title: "Tu solicitud está siendo atendida",
    type: "Cambio de estado",
  },
  {
    code: "SOL-2025-01791",
    date: "17 jun 2025 · 16:48",
    description:
      "El especialista Carlos Mendoza agregó un comentario y requiere información adicional.",
    read: false,
    title: "Nuevo comentario en tu solicitud",
    type: "Comentario",
  },
  {
    code: "SOL-2025-01664",
    date: "16 jun 2025 · 14:20",
    description:
      "Se ha consumido el 80% del tiempo previsto para resolver esta solicitud.",
    read: true,
    title: "Tu solicitud se acerca al plazo límite",
    type: "Alerta 80% de plazo",
  },
  {
    code: "SOL-2025-01520",
    date: "15 jun 2025 · 11:05",
    description:
      "La solicitud superó el plazo de atención y fue escalada al responsable del área.",
    read: true,
    title: "Solicitud escalada por vencimiento",
    type: "Escalamiento por vencimiento",
  },
]

const typeStyles: Record<NotificationType, string> = {
  Asignación: "bg-purple-soft text-purple",
  "Cambio de estado": "bg-info-soft text-info",
  Comentario: "bg-teal-soft text-teal",
  "Alerta 80% de plazo": "bg-warning-soft text-warning",
  "Escalamiento por vencimiento": "bg-danger-soft text-danger",
}

function Notifications({ goTo }: { goTo: (screen: Screen) => void }) {
  const [filter, setFilter] = useState<"Todas" | "Leídas" | "No leídas">(
    "Todas",
  )
  const [readCodes, setReadCodes] = useState<string[]>(
    notices.filter((notice) => notice.read).map((notice) => notice.code),
  )
  const visible = notices.filter((notice) => {
    const isRead = readCodes.includes(notice.code)
    return filter === "Todas" || (filter === "Leídas" ? isRead : !isRead)
  })

  return (
    <AppShell
      active="notifications"
      goTo={goTo}
      subtitle="Mantente al día con la actividad de tus solicitudes."
      title="Centro de notificaciones"
    >
      <main className="mx-auto max-w-6xl px-5 py-6 pb-28 lg:px-8 lg:py-8">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-600">
              Tienes{" "}
              <strong className="text-brand">
                {notices.length - readCodes.length} notificaciones sin leer
              </strong>
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <Icon name="clock" size={14} />
              Fechas mostradas en zona horaria America/Lima
            </p>
          </div>
          <Button
            icon="check"
            onClick={() => setReadCodes(notices.map((notice) => notice.code))}
            variant="secondary"
          >
            Marcar todas como leídas
          </Button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 p-2 sm:px-5 sm:py-3">
            {(["Todas", "No leídas", "Leídas"] as const).map((tab) => (
              <button
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition ${
                  filter === tab
                    ? "bg-brand text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                key={tab}
                onClick={() => setFilter(tab)}
                type="button"
              >
                {tab}
                {tab === "No leídas" && (
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                      filter === tab
                        ? "bg-white/20 text-white"
                        : "bg-brand-soft text-brand"
                    }`}
                  >
                    {notices.length - readCodes.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="divide-y divide-slate-100">
            {visible.map((notice) => {
              const isRead = readCodes.includes(notice.code)
              return (
                <article
                  className={`relative grid gap-3 p-5 transition hover:bg-slate-50 sm:grid-cols-[auto_1fr_auto] sm:gap-4 sm:p-6 ${
                    !isRead ? "bg-unread" : ""
                  }`}
                  key={notice.code}
                >
                  {!isRead && (
                    <span className="absolute inset-y-0 left-0 w-1 bg-link" />
                  )}
                  <span
                    className={`grid size-10 place-items-center rounded-xl ${typeStyles[notice.type]}`}
                  >
                    <Icon
                      name={
                        notice.type === "Comentario"
                          ? "mail"
                          : notice.type === "Asignación"
                            ? "user"
                            : "bell"
                      }
                      size={19}
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${typeStyles[notice.type]}`}
                      >
                        {notice.type}
                      </span>
                      {!isRead && (
                        <span className="rounded-full bg-brand px-2 py-1 text-xs font-bold text-white">
                          Nueva
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-base font-extrabold text-ink">
                      {notice.title}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {notice.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                      <button
                        className="inline-flex items-center gap-1.5 text-sm font-extrabold text-link hover:underline"
                        type="button"
                      >
                        <Icon name="file" size={16} />
                        {notice.code}
                        <Icon name="arrow" size={15} />
                      </button>
                      <time className="text-xs font-medium text-slate-500">
                        {notice.date}
                      </time>
                    </div>
                  </div>
                  <div className="flex items-start sm:justify-end">
                    {!isRead ? (
                      <Button
                        onClick={() =>
                          setReadCodes((current) => [...current, notice.code])
                        }
                        variant="quiet"
                      >
                        Marcar como leída
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-400">
                        <Icon name="check" size={15} />
                        Leída
                      </span>
                    )}
                  </div>
                </article>
              )
            })}
            {visible.length === 0 && (
              <div className="px-5 py-16 text-center">
                <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
                  <Icon name="check" size={24} />
                </span>
                <p className="font-extrabold text-brand">
                  No hay notificaciones en esta vista
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Prueba seleccionando otro filtro.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Mostrando 1–{visible.length} de {notices.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="secondary">Anterior</Button>
              <button
                className="grid size-10 place-items-center rounded-lg bg-brand text-sm font-bold text-white"
                type="button"
              >
                1
              </button>
              <button
                className="grid size-10 place-items-center rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100"
                type="button"
              >
                2
              </button>
              <Button variant="secondary">Siguiente</Button>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  )
}

function FormSelect({
  error,
  label,
  options,
}: {
  error?: string
  label: string
  options: string[]
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <select
        aria-invalid={Boolean(error)}
        className={`h-11 w-full rounded-lg border bg-white px-4 text-sm outline-none focus:ring-3 focus:ring-brand-ring ${
          error ? "border-danger" : "border-slate-300 focus:border-brand"
        }`}
        defaultValue=""
      >
        <option disabled value="">
          Selecciona una opción
        </option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      {error && (
        <span className="mt-1.5 block text-xs font-semibold text-danger">
          ! {error}
        </span>
      )}
    </label>
  )
}

function StepHeading({
  number,
  subtitle,
  title,
}: {
  number: number
  subtitle: string
  title: string
}) {
  return (
    <div className="mb-5 flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold text-white">
        {number}
      </span>
      <div>
        <h2 className="font-extrabold text-brand">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}

function NewRequest({ goTo }: { goTo: (screen: Screen) => void }) {
  const [impact, setImpact] = useState("Alto")
  const [urgency, setUrgency] = useState("Alta")
  const examples: Record<string, string> = {
    Alto: "Afecta a varias personas o impide una actividad esencial.",
    Medio: "Limita una actividad o afecta a una sola persona.",
    Bajo: "Inconveniente menor; existe una alternativa temporal.",
    Alta: "Requiere atención inmediata por una actividad en curso.",
    Media: "Debe resolverse pronto, pero permite continuar parcialmente.",
    Baja: "Puede programarse sin afectar actividades inmediatas.",
  }

  return (
    <AppShell
      active="new-request"
      goTo={goTo}
      subtitle="Completa los datos para derivar correctamente tu solicitud."
      title="Nueva solicitud"
    >
      <main className="mx-auto max-w-5xl px-5 py-6 pb-28 lg:px-8 lg:py-8">
        <div
          className="mb-6 rounded-xl border border-danger-border bg-danger-soft p-4"
          role="alert"
        >
          <div className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-danger text-xs font-extrabold text-white">
              !
            </span>
            <div>
              <p className="text-sm font-extrabold text-danger">
                Revisa los campos marcados antes de enviar
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-danger">
                <li>Selecciona una categoría y un edificio.</li>
                <li>La descripción debe tener al menos 20 caracteres.</li>
              </ul>
            </div>
          </div>
        </div>

        <form
          className="space-y-5"
          onSubmit={(event) => event.preventDefault()}
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
            <StepHeading
              number={1}
              subtitle="Ayúdanos a dirigir el caso al equipo adecuado."
              title="Categoría y ubicación"
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormSelect
                  error="Debes seleccionar una categoría."
                  label="Categoría"
                  options={[
                    "Acceso y cuentas",
                    "Aulas y equipos",
                    "Conectividad",
                    "Infraestructura",
                    "Sistemas académicos",
                  ]}
                />
              </div>
              <FormSelect
                error="Selecciona el edificio."
                label="Edificio"
                options={[
                  "Biblioteca Central",
                  "Facultad de Ingeniería de Sistemas",
                  "Pabellón de Ciencias",
                  "Rectorado",
                ]}
              />
              <FormSelect
                label="Ambiente"
                options={[
                  "Aula 201",
                  "Laboratorio 3",
                  "Oficina administrativa",
                  "Zona común",
                ]}
              />
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-ink">
                  Referencia{" "}
                  <span className="font-normal text-slate-400">(opcional)</span>
                </span>
                <input
                  className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand-ring"
                  placeholder="Ej.: junto al ascensor, segundo piso"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
            <StepHeading
              number={2}
              subtitle="Explica qué sucede, desde cuándo y cómo afecta tu actividad."
              title="Descripción"
            />
            <textarea
              aria-invalid="true"
              className="min-h-36 w-full resize-y rounded-lg border border-danger p-4 text-sm leading-6 outline-none focus:ring-3 focus:ring-brand-ring"
              defaultValue="No puedo acceder"
              maxLength={2000}
            />
            <div className="mt-1.5 flex justify-between gap-3">
              <span className="text-xs font-semibold text-danger">
                ! Debe contener entre 20 y 2000 caracteres.
              </span>
              <span className="shrink-0 text-xs text-slate-400">15 / 2000</span>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
            <StepHeading
              number={3}
              subtitle="Selecciona una opción según el efecto real del problema."
              title="Impacto y urgencia"
            />
            <div className="grid gap-7 lg:grid-cols-2">
              {[
                {
                  label: "Impacto",
                  selected: impact,
                  set: setImpact,
                  values: ["Alto", "Medio", "Bajo"],
                },
                {
                  label: "Urgencia",
                  selected: urgency,
                  set: setUrgency,
                  values: ["Alta", "Media", "Baja"],
                },
              ].map((group) => (
                <fieldset key={group.label}>
                  <legend className="mb-3 text-sm font-extrabold text-ink">
                    {group.label}
                  </legend>
                  <div className="space-y-2">
                    {group.values.map((value) => (
                      <button
                        className={`w-full rounded-xl border p-3.5 text-left transition ${
                          group.selected === value
                            ? "border-brand bg-brand-soft ring-1 ring-brand"
                            : "border-slate-200 hover:border-slate-400"
                        }`}
                        key={value}
                        onClick={() => group.set(value)}
                        type="button"
                      >
                        <span className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
                              group.selected === value
                                ? "border-brand bg-brand text-white"
                                : "border-slate-300"
                            }`}
                          >
                            {group.selected === value && (
                              <Icon name="check" size={13} />
                            )}
                          </span>
                          <span>
                            <strong className="block text-sm text-ink">
                              {value}
                            </strong>
                            <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                              {examples[value]}
                            </span>
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
            <StepHeading
              number={4}
              subtitle="Calculada automáticamente a partir del impacto y la urgencia."
              title="Prioridad inicial"
            />
            <div className="flex flex-col gap-4 rounded-xl border border-danger-border bg-danger-soft p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="rounded-full bg-danger px-3 py-1 text-xs font-extrabold text-white">
                  CRÍTICA
                </span>
                <p className="mt-2 text-sm text-danger">
                  Impacto alto + urgencia alta
                </p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-slate-500">
                    Primera atención
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-brand">2h</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">Resolución</p>
                  <p className="mt-1 text-xl font-extrabold text-brand">8h</p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Plazos: Crítica 2h/8h · Alta 8h/48h · Media 16h/72h · Baja
              24h/120h.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
            <StepHeading
              number={5}
              subtitle="Hasta 3 imágenes JPEG o PNG de máximo 5 MB cada una."
              title="Adjuntar evidencias"
            />
            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 text-center hover:border-brand hover:bg-brand-soft">
              <span className="mb-3 grid size-11 place-items-center rounded-full bg-white text-brand shadow-sm">
                <Icon name="image" size={22} />
              </span>
              <strong className="text-sm text-brand">
                Selecciona imágenes o arrástralas aquí
              </strong>
              <span className="mt-1 text-xs text-slate-500">
                JPEG o PNG · 5 MB máximo · 0 de 3 archivos
              </span>
              <input
                accept=".jpg,.jpeg,.png"
                className="sr-only"
                multiple
                type="file"
              />
            </label>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button onClick={() => goTo("requests")} variant="secondary">
              Cancelar
            </Button>
            <Button>Registrar solicitud</Button>
          </div>
        </form>
      </main>
    </AppShell>
  )
}

const requestRows = [
  [
    "MSU-000123",
    "Conectividad",
    "Biblioteca Central · Piso 2",
    "Alta",
    "Resuelta",
    "18 jun 2025 · 09:42",
  ],
  [
    "MSU-000118",
    "Sistemas académicos",
    "Acceso remoto",
    "Media",
    "En atención",
    "17 jun 2025 · 14:08",
  ],
  [
    "MSU-000106",
    "Aulas y equipos",
    "FISI · Laboratorio 3",
    "Baja",
    "Asignada",
    "15 jun 2025 · 11:25",
  ],
  [
    "MSU-000094",
    "Acceso y cuentas",
    "Acceso remoto",
    "Crítica",
    "Cerrada",
    "12 jun 2025 · 08:16",
  ],
]

function StatusBadge({ children }: { children: string }) {
  const style =
    children === "Resuelta" || children === "Cerrada"
      ? "bg-success-soft text-success"
      : children === "En atención"
        ? "bg-info-soft text-info"
        : children === "Crítica"
          ? "bg-danger-soft text-danger"
          : children === "Alta"
            ? "bg-warning-soft text-warning"
            : "bg-slate-100 text-slate-600"
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${style}`}
    >
      {children}
    </span>
  )
}

function Requests({ goTo }: { goTo: (screen: Screen) => void }) {
  return (
    <AppShell
      active="requests"
      goTo={goTo}
      subtitle="Consulta y da seguimiento a los casos que registraste."
      title="Mis solicitudes"
    >
      <main className="mx-auto max-w-6xl px-5 py-6 pb-28 lg:px-8 lg:py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            <strong className="text-ink">34 solicitudes</strong> registradas
          </p>
          <Button icon="plus" onClick={() => goTo("new-request")}>
            Nueva solicitud
          </Button>
        </div>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label>
              <span className="mb-2 block text-xs font-bold text-slate-600">
                Código
              </span>
              <input
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand"
                placeholder="MSU-000123"
              />
            </label>
            {[
              [
                "Estado",
                [
                  "Todos",
                  "Registrada",
                  "Asignada",
                  "En atención",
                  "Resuelta",
                  "Cerrada",
                ],
              ],
              [
                "Categoría",
                [
                  "Todas",
                  "Conectividad",
                  "Sistemas académicos",
                  "Aulas y equipos",
                ],
              ],
              ["Prioridad", ["Todas", "Crítica", "Alta", "Media", "Baja"]],
            ].map(([label, options]) => (
              <label key={label as string}>
                <span className="mb-2 block text-xs font-bold text-slate-600">
                  {label as string}
                </span>
                <select className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand">
                  {(options as string[]).map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              <span className="mb-2 block text-xs font-bold text-slate-600">
                Fechas
              </span>
              <input
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand"
                type="date"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="quiet">Limpiar</Button>
            <Button>Aplicar filtros</Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    "Código",
                    "Categoría",
                    "Ubicación",
                    "Prioridad",
                    "Estado",
                    "Fecha de registro",
                    "",
                  ].map((heading) => (
                    <th
                      className="whitespace-nowrap px-4 py-3 font-extrabold"
                      key={heading}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requestRows.map((row) => (
                  <tr className="hover:bg-slate-50" key={row[0]}>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-extrabold text-link">
                      {row[0]}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-ink">
                      {row[1]}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {row[2]}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge>{row[3]}</StatusBadge>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge>{row[4]}</StatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                      {row[5]}
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        onClick={() => goTo("request-detail")}
                        variant="quiet"
                      >
                        Ver detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-100 lg:hidden">
            {requestRows.map((row) => (
              <article className="p-5" key={row[0]}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-link">{row[0]}</p>
                    <p className="mt-1 font-bold text-ink">{row[1]}</p>
                  </div>
                  <StatusBadge>{row[4]}</StatusBadge>
                </div>
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <Icon name="map" size={16} /> {row[2]}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <StatusBadge>{row[3]}</StatusBadge>
                    <p className="mt-2 text-xs text-slate-400">{row[5]}</p>
                  </div>
                  <Button
                    onClick={() => goTo("request-detail")}
                    variant="quiet"
                  >
                    Ver detalle
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Mostrando 1–20 de 34 · 20 por página
            </p>
            <div className="flex gap-2">
              <Button variant="secondary">Anterior</Button>
              <span className="grid size-11 place-items-center rounded-lg bg-brand text-sm font-bold text-white">
                1
              </span>
              <Button variant="secondary">Siguiente</Button>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  )
}

function RequestDetail({ goTo }: { goTo: (screen: Screen) => void }) {
  const [showReason, setShowReason] = useState(false)
  const [rating, setRating] = useState(0)
  return (
    <AppShell
      active="requests"
      goTo={goTo}
      subtitle="Consulta el avance, conversa con soporte y confirma la atención."
      title="Detalle de solicitud"
    >
      <main className="mx-auto max-w-6xl px-5 py-6 pb-28 lg:px-8 lg:py-8">
        <button
          className="mb-5 inline-flex items-center gap-1 text-sm font-bold text-link hover:underline"
          onClick={() => goTo("requests")}
          type="button"
        >
          <span className="rotate-180">
            <Icon name="arrow" size={16} />
          </span>{" "}
          Volver a mis solicitudes
        </button>
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-extrabold tracking-widest text-slate-400">
                SOLICITUD
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-brand">
                MSU-000123
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Problemas de conexión a internet en Biblioteca Central
              </p>
            </div>
            <div className="flex gap-2">
              <StatusBadge>Resuelta</StatusBadge>
              <StatusBadge>Alta</StatusBadge>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <section className="rounded-2xl border border-success/30 bg-success-soft p-5 shadow-card sm:p-6">
              <div className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success text-white">
                  <Icon name="check" size={21} />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-success">
                    Conformidad de atención
                  </h2>
                  <p className="mt-1 text-sm font-bold text-success">
                    Ventana disponible durante 72h
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-ink">
                El equipo técnico marcó tu solicitud como resuelta. Confirma si
                la solución fue satisfactoria o reabre el caso indicando el
                motivo.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-success px-5 text-sm font-extrabold text-white shadow-button"
                  type="button"
                >
                  <Icon name="check" size={18} /> Confirmar solución
                </button>
                <Button
                  onClick={() => setShowReason(!showReason)}
                  variant="secondary"
                >
                  Reabrir caso
                </Button>
              </div>
              {showReason && (
                <label className="mt-5 block rounded-xl bg-white p-4">
                  <span className="mb-2 block text-sm font-extrabold text-ink">
                    Motivo de reapertura <span className="text-danger">*</span>
                  </span>
                  <textarea
                    className="min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-brand"
                    placeholder="Explica por qué la solución no resolvió el problema..."
                    required
                  />
                  <span className="mt-1.5 block text-xs text-slate-500">
                    Campo obligatorio para reabrir el caso.
                  </span>
                  <Button className="mt-3">Enviar reapertura</Button>
                </label>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
              <span className="rounded-full bg-purple-soft px-2.5 py-1 text-xs font-extrabold text-purple">
                VISTA CUANDO EL ESTADO ES CERRADA
              </span>
              <h2 className="mt-3 text-lg font-extrabold text-brand">
                Encuesta de satisfacción
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tu opinión nos ayuda a mejorar el servicio.
              </p>
              <p className="mt-5 text-sm font-bold text-ink">
                ¿Cómo calificarías la atención recibida?
              </p>
              <div className="mt-3 flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    aria-label={`${value} puntos`}
                    className={`grid size-11 place-items-center rounded-lg border text-lg ${
                      rating >= value
                        ? "border-warning bg-warning-soft text-warning"
                        : "border-slate-200 text-slate-300"
                    }`}
                    key={value}
                    onClick={() => setRating(value)}
                    type="button"
                  >
                    ★
                  </button>
                ))}
              </div>
              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-bold text-ink">
                  Comentario{" "}
                  <span className="font-normal text-slate-400">(opcional)</span>
                </span>
                <textarea
                  className="min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-brand"
                  placeholder="Cuéntanos más sobre tu experiencia..."
                />
              </label>
              <Button className="mt-4">Enviar encuesta</Button>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
              <h2 className="text-lg font-extrabold text-brand">Comentarios</h2>
              <div className="mt-5 space-y-5">
                {[
                  [
                    "Carlos Mendoza · Soporte TI",
                    "18 jun · 15:36",
                    "Se reinició el punto de acceso del segundo piso y verificamos la estabilidad de la conexión.",
                  ],
                  [
                    "Andrea Vargas · Solicitante",
                    "18 jun · 12:10",
                    "El problema ocurre principalmente cerca de la sala de lectura grupal.",
                  ],
                ].map(([author, date, text]) => (
                  <article className="flex gap-3" key={date}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-extrabold text-brand">
                      {author.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1 rounded-xl bg-slate-50 p-4">
                      <div className="flex flex-wrap justify-between gap-2">
                        <p className="text-sm font-extrabold text-ink">
                          {author}
                        </p>
                        <time className="text-xs text-slate-400">{date}</time>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {text}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <label className="mt-5 block border-t border-slate-100 pt-5">
                <span className="mb-2 block text-sm font-bold text-ink">
                  Agregar comentario
                </span>
                <textarea
                  className="min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-brand"
                  placeholder="Escribe un mensaje para el equipo técnico..."
                />
                <Button className="mt-3">Enviar comentario</Button>
              </label>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="font-extrabold text-brand">Atención asignada</h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-brand text-sm font-extrabold text-white">
                  CM
                </span>
                <div>
                  <p className="text-sm font-extrabold text-ink">
                    Carlos Mendoza
                  </p>
                  <p className="text-xs text-slate-500">
                    Mesa de Ayuda de Sistemas
                  </p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                <div>
                  <dt className="text-xs font-bold text-slate-500">
                    Primera atención
                  </dt>
                  <dd className="mt-1 text-xl font-extrabold text-brand">8h</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-slate-500">
                    Resolución
                  </dt>
                  <dd className="mt-1 text-xl font-extrabold text-brand">
                    48h
                  </dd>
                </div>
              </dl>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-extrabold text-brand">
                  Historial de eventos
                </h2>
                <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
                  Inmutable
                </span>
              </div>
              <ol className="relative mt-5 space-y-5 border-l border-slate-200 pl-5">
                {[
                  ["Marcada como resuelta", "18 jun · 15:40"],
                  ["Comentario técnico agregado", "18 jun · 15:36"],
                  ["En atención", "18 jun · 10:18"],
                  ["Asignada a Soporte TI", "18 jun · 10:02"],
                  ["Solicitud registrada", "18 jun · 09:42"],
                ].map(([event, date]) => (
                  <li className="relative" key={event}>
                    <span className="absolute -left-7 top-1 size-3 rounded-full border-2 border-white bg-link ring-1 ring-link" />
                    <p className="text-sm font-bold text-ink">{event}</p>
                    <time className="mt-1 block text-xs text-slate-400">
                      {date}
                    </time>
                  </li>
                ))}
              </ol>
              <p className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
                <Icon name="shield" size={16} /> Los eventos no pueden
                modificarse ni eliminarse.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </AppShell>
  )
}

const supervisionRequests = [
  {
    alert: "Vencida",
    area: "Soporte informático",
    category: "Conectividad",
    code: "MSU-000241",
    date: "18 jun · 08:12",
    priority: "Crítica",
    status: "Registrada",
    subject: "Sin acceso a red en laboratorio 3",
    technician: "Sin asignar",
  },
  {
    alert: "Plazo al 80%",
    area: "Mantenimiento",
    category: "Infraestructura",
    code: "MSU-000238",
    date: "17 jun · 16:40",
    priority: "Alta",
    status: "Asignada",
    subject: "Filtración de agua en aula 201",
    technician: "Rosa Gutiérrez",
  },
  {
    alert: "En plazo",
    area: "Servicios generales",
    category: "Limpieza",
    code: "MSU-000235",
    date: "17 jun · 14:05",
    priority: "Media",
    status: "En atención",
    subject: "Limpieza extraordinaria de auditorio",
    technician: "José Ramírez",
  },
  {
    alert: "En plazo",
    area: "Soporte informático",
    category: "Sistemas académicos",
    code: "MSU-000229",
    date: "17 jun · 11:22",
    priority: "Baja",
    status: "Asignada",
    subject: "Actualización de software en oficina",
    technician: "Carlos Mendoza",
  },
]

const workload = [
  ["Carlos Mendoza", "Soporte informático", "4"],
  ["Diana Flores", "Soporte informático", "2"],
  ["Miguel Torres", "Soporte informático", "6"],
  ["Rosa Gutiérrez", "Mantenimiento", "3"],
]

function CompactSelect({
  label,
  options,
}: {
  label: string
  options: string[]
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">
        {label}
      </span>
      <select className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-3 focus:ring-brand-ring">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function SlaBadge({ value }: { value: string }) {
  const style =
    value === "Vencida"
      ? "bg-danger-soft text-danger"
      : value === "Plazo al 80%"
        ? "bg-warning-soft text-warning"
        : "bg-success-soft text-success"
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${style}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {value}
    </span>
  )
}

function Supervision({ goTo }: { goTo: (screen: Screen) => void }) {
  const [selectedCode, setSelectedCode] = useState("MSU-000241")
  const [impact, setImpact] = useState("Alto")
  const [urgency, setUrgency] = useState("Alta")
  const [showCancel, setShowCancel] = useState(false)
  const priority =
    impact === "Alto" && urgency === "Alta"
      ? "Crítica"
      : impact === "Bajo" && urgency === "Baja"
        ? "Baja"
        : impact === "Alto" || urgency === "Alta"
          ? "Alta"
          : "Media"
  const limits: Record<string, [string, string]> = {
    Crítica: ["2 h", "8 h"],
    Alta: ["8 h", "48 h"],
    Media: ["16 h", "72 h"],
    Baja: ["24 h", "120 h"],
  }
  const selectedRequest =
    supervisionRequests.find((request) => request.code === selectedCode) ??
    supervisionRequests[0]

  const exportCsv = () => {
    const header = "Código,Área,Categoría,Prioridad,Estado,Responsable,Alerta"
    const rows = supervisionRequests.map((item) =>
      [
        item.code,
        item.area,
        item.category,
        item.priority,
        item.status,
        item.technician,
        item.alert,
      ].join(","),
    )
    const url = URL.createObjectURL(
      new Blob([[header, ...rows].join("\n")], {
        type: "text/csv;charset=utf-8",
      }),
    )
    const link = document.createElement("a")
    link.href = url
    link.download = "bandeja-supervision.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell
      active="supervision"
      goTo={goTo}
      subtitle="Evalúa, prioriza y asigna las solicitudes de tu facultad."
      title="Bandeja de supervisión"
    >
      <main className="mx-auto max-w-6xl px-5 py-6 pb-28 lg:px-8 lg:py-8">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-600">
              <strong className="text-ink">42 solicitudes activas</strong> en 3
              áreas de servicio
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Actualizado hoy, 10:35 · America/Lima
            </p>
          </div>
          <Button icon="file" onClick={exportCsv} variant="secondary">
            Exportar CSV
          </Button>
        </div>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-extrabold text-brand">Filtros de búsqueda</h2>
            <button
              className="text-xs font-extrabold text-link hover:underline"
              type="button"
            >
              Limpiar filtros
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">
                Código o asunto
              </span>
              <input
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand-ring"
                placeholder="Buscar solicitud..."
              />
            </label>
            <CompactSelect
              label="Área"
              options={[
                "Todas las áreas",
                "Soporte informático",
                "Mantenimiento",
                "Servicios generales",
              ]}
            />
            <CompactSelect
              label="Categoría"
              options={[
                "Todas",
                "Conectividad",
                "Infraestructura",
                "Limpieza",
                "Sistemas académicos",
              ]}
            />
            <CompactSelect
              label="Estado"
              options={[
                "Todos",
                "Registrada",
                "Asignada",
                "En atención",
                "Resuelta",
              ]}
            />
            <CompactSelect
              label="Prioridad"
              options={["Todas", "Crítica", "Alta", "Media", "Baja"]}
            />
            <CompactSelect
              label="Nivel de plazo"
              options={["Todos", "En plazo", "Plazo al 80%", "Vencida"]}
            />
            <CompactSelect
              label="Responsable"
              options={[
                "Todos",
                "Sin asignar",
                "Carlos Mendoza",
                "Diana Flores",
                "Miguel Torres",
              ]}
            />
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">
                Fecha de registro
              </span>
              <input
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand-ring"
                type="date"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <Button>Aplicar filtros</Button>
          </div>
        </section>

        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-extrabold text-brand">
                Solicitudes de la facultad
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Selecciona un caso para evaluar y asignar
              </p>
            </div>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-extrabold text-brand">
              4 de 42
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-5xl border-collapse text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    "Solicitud",
                    "Área",
                    "Prioridad",
                    "Estado",
                    "Responsable",
                    "Plazo",
                    "Registro",
                  ].map((heading) => (
                    <th
                      className="whitespace-nowrap px-4 py-3 font-extrabold"
                      key={heading}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supervisionRequests.map((request) => (
                  <tr
                    className={`cursor-pointer transition hover:bg-brand-soft/60 ${
                      selectedCode === request.code ? "bg-brand-soft" : ""
                    }`}
                    key={request.code}
                    onClick={() => setSelectedCode(request.code)}
                  >
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-extrabold text-link">
                        {request.code}
                      </p>
                      <p className="mt-1 max-w-56 truncate text-xs text-slate-600">
                        {request.subject}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-ink">
                        {request.area}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {request.category}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge>{request.priority}</StatusBadge>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge>{request.status}</StatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-600">
                      {request.technician}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <SlaBadge value={request.alert} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">
                      {request.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-200 bg-brand px-5 py-5 text-white sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-blue-200">
                  CASO SELECCIONADO · {selectedCode}
                </p>
                <h2 className="mt-1 text-lg font-extrabold">
                  Evaluación y asignación
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge>{selectedRequest.priority}</StatusBadge>
                <SlaBadge value={selectedRequest.alert} />
              </div>
            </div>
          </div>

          <div className="grid divide-y divide-slate-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <div className="p-5 sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning-soft font-extrabold text-warning">
                  1
                </span>
                <div>
                  <h3 className="font-extrabold text-brand">Prioridad</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Revisa el impacto y la urgencia declarados.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">
                    Impacto seleccionado
                  </span>
                  <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                    {["Alto", "Medio", "Bajo"].map((value) => (
                      <button
                        className={`flex-1 rounded-md py-2 text-xs font-extrabold ${
                          impact === value
                            ? "bg-white text-brand shadow-sm"
                            : "text-slate-500"
                        }`}
                        key={value}
                        onClick={() => setImpact(value)}
                        type="button"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">
                    Urgencia seleccionada
                  </span>
                  <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                    {["Alta", "Media", "Baja"].map((value) => (
                      <button
                        className={`flex-1 rounded-md py-2 text-xs font-extrabold ${
                          urgency === value
                            ? "bg-white text-brand shadow-sm"
                            : "text-slate-500"
                        }`}
                        key={value}
                        onClick={() => setUrgency(value)}
                        type="button"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-danger-border bg-danger-soft p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-danger">
                      Prioridad resultante
                    </p>
                    <p className="mt-1 text-xl font-extrabold text-danger">
                      {priority}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-5 text-right">
                    <div>
                      <p className="text-xs text-slate-500">1.ª atención</p>
                      <p className="font-extrabold text-brand">
                        {limits[priority][0]}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Resolución</p>
                      <p className="font-extrabold text-brand">
                        {limits[priority][1]}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="mt-3 border-t border-danger-border pt-3 text-xs leading-5 text-danger">
                  Los límites se recalculan sin modificar la fecha de registro
                  original: 18 jun 2025 · 08:12.
                </p>
              </div>
              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-extrabold text-ink">
                  Motivo del cambio de prioridad{" "}
                  <span className="text-danger">*</span>
                </span>
                <textarea
                  className="min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand-ring"
                  placeholder="Sustenta la evaluación realizada..."
                  required
                />
                <span className="mt-1.5 block text-xs text-slate-500">
                  Obligatorio y visible en el historial del caso.
                </span>
              </label>
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-info-soft font-extrabold text-info">
                  2
                </span>
                <div>
                  <h3 className="font-extrabold text-brand">Responsable</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Asigna un técnico activo considerando su carga.
                  </p>
                </div>
              </div>
              <CompactSelect
                label="Técnico activo del área"
                options={[
                  "Seleccionar técnico",
                  "Diana Flores · 2 pendientes",
                  "Carlos Mendoza · 4 pendientes",
                  "Miguel Torres · 6 pendientes",
                ]}
              />
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-extrabold text-brand">
                    Tabla de carga de trabajo por técnico
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Solicitudes pendientes activas
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-xs text-slate-500">
                      <tr>
                        {["Técnico", "Área", "Pendientes"].map((item) => (
                          <th className="px-3 py-2 font-bold" key={item}>
                            {item}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {workload.map(([name, area, count]) => (
                        <tr key={name}>
                          <td className="whitespace-nowrap px-3 py-3 text-xs font-bold text-ink">
                            {name}
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-500">
                            {area}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`grid size-7 place-items-center rounded-full text-xs font-extrabold ${
                                Number(count) >= 6
                                  ? "bg-danger-soft text-danger"
                                  : "bg-brand-soft text-brand"
                              }`}
                            >
                              {count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <Button className="mt-5 w-full">Asignar / Reasignar</Button>
              <p className="mt-2 text-center text-xs text-slate-500">
                El técnico recibirá una notificación inmediata.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-extrabold text-ink">
                  ¿La solicitud no debe continuar?
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  La cancelación queda registrada y no puede deshacerse.
                </p>
              </div>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-danger-border bg-white px-5 text-sm font-extrabold text-danger hover:bg-danger-soft"
                onClick={() => setShowCancel(!showCancel)}
                type="button"
              >
                Cancelar solicitud
              </button>
            </div>
            {showCancel && (
              <div className="mt-5 grid gap-4 rounded-xl border border-danger-border bg-white p-4 sm:grid-cols-2">
                <CompactSelect
                  label="Motivo de cancelación *"
                  options={[
                    "Selecciona un motivo",
                    "Solicitud duplicada",
                    "Información insuficiente",
                    "Fuera del alcance del servicio",
                  ]}
                />
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">
                    Código original si es duplicado
                  </span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand"
                    placeholder="Ej.: MSU-000198"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">
                    Sustento de cancelación *
                  </span>
                  <textarea
                    className="min-h-20 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-brand"
                    placeholder="Describe brevemente el motivo..."
                    required
                  />
                </label>
                <div className="flex justify-end gap-3 sm:col-span-2">
                  <Button onClick={() => setShowCancel(false)} variant="quiet">
                    Volver
                  </Button>
                  <button
                    className="min-h-11 rounded-lg bg-danger px-5 text-sm font-extrabold text-white"
                    type="button"
                  >
                    Confirmar cancelación
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </AppShell>
  )
}

const kpis = [
  ["Registradas", "120", "Total del periodo", "brand"],
  ["Pendientes", "35", "29,2% del total", "warning"],
  ["Solucionadas", "80", "Resueltas + Cerradas", "success"],
  ["Canceladas", "5", "4,2% del total", "danger"],
  ["% Solucionado", "69,6%", "+4,2 pts. vs. periodo anterior", "success"],
  [
    "Tiempo medio de resolución",
    "21,4 h",
    "Promedio de casos solucionados",
    "info",
  ],
  [
    "Cumplimiento 1.ª atención",
    "91,7%",
    "110 de 120 dentro del plazo",
    "purple",
  ],
  ["Cumplimiento resolución", "86,3%", "69 de 80 dentro del plazo", "teal"],
  ["Satisfacción promedio", "4,6 / 5", "62 encuestas respondidas", "brand"],
]

const kpiStyles: Record<string, { accent: string icon: string }> = {
  brand: { accent: "bg-brand", icon: "bg-brand-soft text-brand" },
  danger: { accent: "bg-danger", icon: "bg-danger-soft text-danger" },
  info: { accent: "bg-info", icon: "bg-info-soft text-info" },
  purple: { accent: "bg-purple", icon: "bg-purple-soft text-purple" },
  success: { accent: "bg-success", icon: "bg-success-soft text-success" },
  teal: { accent: "bg-teal", icon: "bg-teal-soft text-teal" },
  warning: { accent: "bg-warning", icon: "bg-warning-soft text-warning" },
}

function Dashboard({ goTo }: { goTo: (screen: Screen) => void }) {
  return (
    <AppShell
      active="dashboard"
      goTo={goTo}
      subtitle="Monitorea el desempeño y cumplimiento de los servicios."
      title="Dashboard de indicadores"
    >
      <main className="mx-auto max-w-6xl px-5 py-6 pb-28 lg:px-8 lg:py-8">
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <CompactSelect
                label="Periodo"
                options={[
                  "01 jun – 30 jun 2025",
                  "01 may – 31 may 2025",
                  "Últimos 90 días",
                  "Año 2025",
                ]}
              />
              <CompactSelect
                label="Área"
                options={[
                  "Todas las áreas",
                  "Soporte informático",
                  "Mantenimiento",
                  "Servicios generales",
                ]}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary">Restablecer</Button>
              <Button>Actualizar informe</Button>
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <Icon name="clock" size={15} /> Datos consolidados al 30 jun 2025 ·
            23:59
          </p>
        </section>

        <section className="mb-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-brand">
                Resumen del periodo
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Indicadores clave de gestión y servicio
              </p>
            </div>
            <span className="hidden rounded-full bg-success-soft px-3 py-1 text-xs font-extrabold text-success sm:inline-flex">
              Tendencia favorable
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map(([label, value, helper, tone]) => (
              <article
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
                key={label}
              >
                <span
                  className={`absolute inset-y-0 left-0 w-1 ${kpiStyles[tone].accent}`}
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-600">{label}</p>
                    <p className="mt-2 text-3xl font-extrabold tracking-tight text-brand">
                      {value}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{helper}</p>
                  </div>
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl ${kpiStyles[tone].icon}`}
                  >
                    <Icon
                      name={
                        label.includes("Satisfacción")
                          ? "check"
                          : label.includes("Tiempo")
                            ? "clock"
                            : "file"
                      }
                      size={19}
                    />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
            <div>
              <h2 className="font-extrabold text-brand">
                Distribución por categoría
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Solicitudes registradas · total 120
              </p>
            </div>
            <div className="mt-7 space-y-5">
              {[
                ["Conectividad", "38", "category-bar-1"],
                ["Infraestructura", "31", "category-bar-2"],
                ["Sistemas académicos", "24", "category-bar-3"],
                ["Limpieza", "17", "category-bar-4"],
                ["Otros", "10", "category-bar-5"],
              ].map(([label, count, bar]) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold text-ink">{label}</span>
                    <span className="font-extrabold text-brand">{count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full bg-link ${bar}`} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
            <h2 className="font-extrabold text-brand">
              Distribución por prioridad
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Proporción de solicitudes registradas
            </p>
            <div className="mt-7 flex flex-col items-center gap-7 sm:flex-row sm:justify-center">
              <div className="priority-donut grid size-48 shrink-0 place-items-center rounded-full">
                <div className="grid size-28 place-items-center rounded-full bg-white text-center shadow-sm">
                  <div>
                    <p className="text-3xl font-extrabold text-brand">120</p>
                    <p className="text-xs font-bold text-slate-500">
                      solicitudes
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-full space-y-3">
                {[
                  ["Crítica", "12", "bg-danger"],
                  ["Alta", "34", "bg-warning"],
                  ["Media", "49", "bg-link"],
                  ["Baja", "25", "bg-success"],
                ].map(([label, count, color]) => (
                  <div className="flex items-center gap-3" key={label}>
                    <span className={`size-3 rounded-sm ${color}`} />
                    <span className="flex-1 text-sm font-semibold text-slate-600">
                      {label}
                    </span>
                    <span className="text-sm font-extrabold text-brand">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6 lg:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-extrabold text-brand">
                  Distribución por técnico
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Solicitudes asignadas y pendientes de asignación
                </p>
              </div>
              <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-extrabold text-warning">
                8 sin asignar
              </span>
            </div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [
                  "Carlos Mendoza",
                  "Soporte informático",
                  "27",
                  "technician-bar-1",
                ],
                ["Rosa Gutiérrez", "Mantenimiento", "24", "technician-bar-2"],
                [
                  "Diana Flores",
                  "Soporte informático",
                  "22",
                  "technician-bar-3",
                ],
                [
                  "José Ramírez",
                  "Servicios generales",
                  "21",
                  "technician-bar-4",
                ],
                ["Miguel Torres", "Mantenimiento", "18", "technician-bar-5"],
                ["Sin asignar", "Requiere atención", "8", "technician-bar-6"],
              ].map(([name, area, count, bar]) => (
                <div
                  className={`rounded-xl border p-4 ${
                    name === "Sin asignar"
                      ? "border-warning/40 bg-warning-soft"
                      : "border-slate-200 bg-slate-50"
                  }`}
                  key={name}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-ink">
                        {name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {area}
                      </p>
                    </div>
                    <span className="text-xl font-extrabold text-brand">
                      {count}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                    <div
                      className={`h-full rounded-full ${
                        name === "Sin asignar" ? "bg-warning" : "bg-brand"
                      } ${bar}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </AppShell>
  )
}

const technicalRequests = [
  {
    alert: "Vencida · 1 h 24 min",
    category: "Conectividad",
    code: "MSU-000241",
    location: "FISI · Laboratorio 3",
    priority: "Crítica",
    subject: "Sin acceso a red en laboratorio 3",
  },
  {
    alert: "Plazo al 80% · 3 h restantes",
    category: "Sistemas académicos",
    code: "MSU-000236",
    location: "Acceso remoto",
    priority: "Alta",
    subject: "Error al registrar notas en SUM",
  },
  {
    alert: "En plazo · 18 h restantes",
    category: "Aulas y equipos",
    code: "MSU-000231",
    location: "FISI · Aula 305",
    priority: "Alta",
    subject: "Proyector no reconoce entrada HDMI",
  },
  {
    alert: "En plazo · 54 h restantes",
    category: "Acceso y cuentas",
    code: "MSU-000225",
    location: "Acceso remoto",
    priority: "Media",
    subject: "Restablecimiento de acceso institucional",
  },
]

function TechnicalAttention({ goTo }: { goTo: (screen: Screen) => void }) {
  const [selectedCode, setSelectedCode] = useState("MSU-000241")
  const [started, setStarted] = useState(false)
  const [solution, setSolution] = useState("")
  const [resolved, setResolved] = useState(false)
  const selected =
    technicalRequests.find((request) => request.code === selectedCode) ??
    technicalRequests[0]

  return (
    <AppShell
      active="technical"
      goTo={goTo}
      subtitle="Gestiona las solicitudes asignadas y registra cada avance."
      title="Bandeja y atención técnica"
    >
      <main className="mx-auto max-w-6xl px-5 py-6 pb-28 lg:px-8 lg:py-8">
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          {[
            [
              "Asignadas",
              "4",
              "Pendientes de iniciar",
              "bg-brand-soft text-brand",
            ],
            [
              "En atención",
              started ? "3" : "2",
              "Trabajo en curso",
              "bg-info-soft text-info",
            ],
            [
              "Próximas a vencer",
              "2",
              "Requieren prioridad",
              "bg-warning-soft text-warning",
            ],
          ].map(([label, value, helper, style]) => (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
              key={label}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-600">{label}</p>
                  <p className="mt-1 text-3xl font-extrabold text-brand">
                    {value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{helper}</p>
                </div>
                <span
                  className={`grid size-11 place-items-center rounded-xl ${style}`}
                >
                  <Icon
                    name={label === "En atención" ? "clock" : "file"}
                    size={20}
                  />
                </span>
              </div>
            </article>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <section className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-brand">Mis asignaciones</h2>
                <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-extrabold text-white">
                  4
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Ordenadas por prioridad y vencimiento
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <CompactSelect
                  label="Estado"
                  options={["Todas", "Asignada", "En atención"]}
                />
                <CompactSelect
                  label="Prioridad"
                  options={["Todas", "Crítica", "Alta", "Media"]}
                />
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {technicalRequests.map((request) => (
                <button
                  className={`w-full p-4 text-left transition ${
                    selectedCode === request.code
                      ? "bg-brand-soft"
                      : "hover:bg-slate-50"
                  }`}
                  key={request.code}
                  onClick={() => {
                    setSelectedCode(request.code)
                    setStarted(false)
                    setResolved(false)
                    setSolution("")
                  }}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-link">
                      {request.code}
                    </span>
                    <StatusBadge>{request.priority}</StatusBadge>
                  </div>
                  <p className="mt-2 text-sm font-extrabold leading-5 text-ink">
                    {request.subject}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Icon name="map" size={14} /> {request.location}
                  </p>
                  <p
                    className={`mt-3 flex items-center gap-1.5 text-xs font-extrabold ${
                      request.alert.includes("Vencida")
                        ? "text-danger"
                        : request.alert.includes("80%")
                          ? "text-warning"
                          : "text-success"
                    }`}
                  >
                    <Icon name="clock" size={14} /> {request.alert}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <div className="border-b border-slate-200 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold tracking-widest text-link">
                      {selected.code} · {selected.category}
                    </p>
                    <h1 className="mt-2 text-xl font-extrabold text-brand">
                      {selected.subject}
                    </h1>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                      <Icon name="map" size={16} /> {selected.location}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge>{selected.priority}</StatusBadge>
                    <StatusBadge>
                      {resolved
                        ? "Resuelta"
                        : started
                          ? "En atención"
                          : "Asignada"}
                    </StatusBadge>
                  </div>
                </div>
              </div>
              <div className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
                <div>
                  <p className="text-xs font-bold text-slate-500">
                    Solicitante
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-ink">
                    Andrea Vargas
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">
                    Fecha de registro
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-ink">
                    18 jun · 08:12
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">
                    Límite de resolución
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-danger">
                    18 jun · 16:12
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 sm:col-span-3">
                  <p className="text-xs font-bold text-slate-500">
                    Descripción
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Ninguna de las 24 computadoras del laboratorio obtiene
                    conexión a internet. El inconveniente impide el desarrollo
                    de la práctica programada y comenzó esta mañana.
                  </p>
                </div>
              </div>
              <div className="border-t border-slate-200 bg-slate-50 p-5 sm:px-6">
                {!started && !resolved ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-extrabold text-ink">
                        El caso aún no tiene primera atención
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Esta acción registra una fecha única y no puede
                        repetirse.
                      </p>
                    </div>
                    <Button onClick={() => setStarted(true)}>
                      Iniciar atención
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 text-sm">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success text-white">
                      <Icon name="check" size={17} />
                    </span>
                    <div>
                      <p className="font-extrabold text-success">
                        {resolved ? "Solución registrada" : "Atención iniciada"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Primera atención registrada: 18 jun 2025 · 10:42. Fecha
                        inmutable.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-info-soft text-info">
                  <Icon name="image" size={20} />
                </span>
                <div>
                  <h2 className="font-extrabold text-brand">
                    Evidencias y avances
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Documenta el trabajo realizado durante la atención.
                  </p>
                </div>
              </div>
              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-bold text-ink">
                  Descripción del avance
                </span>
                <textarea
                  className="min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand-ring"
                  placeholder="Ej.: Se verificó el switch principal y se reinició el punto de acceso..."
                />
              </label>
              <label className="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center hover:border-brand">
                <Icon name="image" size={22} />
                <span className="mt-2 text-sm font-extrabold text-brand">
                  Adjuntar evidencias
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  JPEG, PNG o PDF · máximo 5 MB
                </span>
                <input className="sr-only" multiple type="file" />
              </label>
              <div className="mt-4 flex justify-end">
                <Button variant="secondary">Guardar avance</Button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
                  <Icon name="check" size={20} />
                </span>
                <div>
                  <h2 className="font-extrabold text-brand">
                    Registrar solución
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Al guardar, la solicitud pasará al estado Resuelta.
                  </p>
                </div>
              </div>
              <form
                className="mt-5"
                onSubmit={(event) => event.preventDefault()}
              >
                <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-ink">
                    Detalle de la solución{" "}
                    <span className="text-danger">*</span>
                  </span>
                  <textarea
                    aria-invalid={solution.length > 0 && solution.length < 20}
                    className={`min-h-32 w-full rounded-lg border p-3 text-sm leading-6 outline-none focus:ring-3 focus:ring-brand-ring ${
                      solution.length > 0 && solution.length < 20
                        ? "border-danger"
                        : "border-slate-300 focus:border-brand"
                    }`}
                    maxLength={2000}
                    onChange={(event) => setSolution(event.target.value)}
                    placeholder="Describe el diagnóstico, las acciones realizadas y el resultado..."
                    required
                    value={solution}
                  />
                  <span className="mt-1.5 flex justify-between gap-3 text-xs">
                    <span
                      className={
                        solution.length > 0 && solution.length < 20
                          ? "font-bold text-danger"
                          : "text-slate-500"
                      }
                    >
                      Obligatorio · entre 20 y 2000 caracteres
                    </span>
                    <span className="text-slate-400">
                      {solution.length} / 2000
                    </span>
                  </span>
                </label>
                <div className="mt-5 flex justify-end">
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-bold text-white shadow-button transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    disabled={!started || solution.length < 20}
                    onClick={() => setResolved(true)}
                    type="submit"
                  >
                    Registrar solución
                  </button>
                </div>
                {!started && (
                  <p className="mt-2 text-right text-xs font-semibold text-warning">
                    Inicia la atención antes de registrar una solución.
                  </p>
                )}
              </form>
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  )
}

const internalUsers = [
  [
    "Carlos Mendoza",
    "carlos.mendoza@unmsm.edu.pe",
    "Técnico",
    "Soporte informático",
    "Activo",
    "6",
  ],
  [
    "Rosa Gutiérrez",
    "rosa.gutierrez@unmsm.edu.pe",
    "Técnico",
    "Mantenimiento",
    "Activo",
    "3",
  ],
  [
    "Lucía Mendoza",
    "lucia.mendoza@unmsm.edu.pe",
    "Supervisor",
    "Todas las áreas",
    "Activo",
    "—",
  ],
  [
    "Rafael Castillo",
    "rafael.castillo@unmsm.edu.pe",
    "Administrador",
    "No aplica",
    "Activo",
    "—",
  ],
  [
    "Jorge Salas",
    "jorge.salas@unmsm.edu.pe",
    "Técnico",
    "Servicios generales",
    "Inactivo",
    "0",
  ],
]

function UsersAdmin({ goTo }: { goTo: (screen: Screen) => void }) {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [role, setRole] = useState("Técnico")
  const [activeUser, setActiveUser] = useState(true)
  const [showBlock, setShowBlock] = useState(false)
  const [hasPending, setHasPending] = useState(false)

  const openCreate = () => {
    setEditing(false)
    setRole("Técnico")
    setActiveUser(true)
    setShowBlock(false)
    setHasPending(false)
    setShowModal(true)
  }

  const openEdit = (userRole: string, hasPending: boolean) => {
    setEditing(true)
    setRole(userRole)
    setActiveUser(true)
    setShowBlock(false)
    setHasPending(hasPending)
    setShowModal(true)
  }

  return (
    <AppShell
      active="users-admin"
      goTo={goTo}
      subtitle="Administra accesos, roles y disponibilidad del personal interno."
      title="Administración de usuarios internos"
    >
      <main className="mx-auto max-w-6xl px-5 py-6 pb-28 lg:px-8 lg:py-8">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-600">
              <strong className="text-ink">18 usuarios internos</strong> · 16
              activos
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Los cambios de rol y estado quedan registrados en auditoría.
            </p>
          </div>
          <Button icon="plus" onClick={openCreate}>
            Crear usuario
          </Button>
        </div>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block lg:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">
                Buscar usuario
              </span>
              <input
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand-ring"
                placeholder="Nombre o correo institucional..."
              />
            </label>
            <CompactSelect
              label="Rol"
              options={["Todos", "Técnico", "Supervisor", "Administrador"]}
            />
            <CompactSelect
              label="Estado"
              options={["Todos", "Activo", "Inactivo"]}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-5xl border-collapse text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    "Usuario",
                    "Rol",
                    "Área",
                    "Estado",
                    "Pendientes",
                    "Último acceso",
                    "",
                  ].map((heading) => (
                    <th
                      className="whitespace-nowrap px-4 py-3 font-extrabold"
                      key={heading}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {internalUsers.map(
                  ([name, email, userRole, area, status, pending], index) => (
                    <tr className="hover:bg-slate-50" key={email}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-extrabold text-brand">
                            {name
                              .split(" ")
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <div>
                            <p className="whitespace-nowrap text-sm font-extrabold text-ink">
                              {name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                            userRole === "Administrador"
                              ? "bg-purple-soft text-purple"
                              : userRole === "Supervisor"
                                ? "bg-info-soft text-info"
                                : "bg-brand-soft text-brand"
                          }`}
                        >
                          {userRole}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                        {area}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${
                            status === "Activo"
                              ? "bg-success-soft text-success"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span className="size-1.5 rounded-full bg-current" />{" "}
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-extrabold text-ink">
                        {pending}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                        {status === "Activo" ? "Hoy · 09:42" : "12 may 2025"}
                      </td>
                      <td className="px-4 py-4">
                        <Button
                          onClick={() => openEdit(userRole, index === 0)}
                          variant="quiet"
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
            <p className="text-sm text-slate-500">
              Mostrando 1–5 de 18 usuarios
            </p>
            <div className="flex gap-2">
              <Button variant="secondary">Anterior</Button>
              <Button variant="secondary">Siguiente</Button>
            </div>
          </div>
        </section>
      </main>

      {showModal && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand/55 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-brand">
            <div className="flex items-start justify-between border-b border-slate-200 p-5 sm:p-6">
              <div>
                <p className="text-xs font-extrabold tracking-widest text-link">
                  {editing ? "EDITAR ACCESO" : "NUEVO ACCESO"}
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-brand">
                  {editing ? "Editar usuario interno" : "Crear usuario interno"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Define los permisos y el ámbito operativo.
                </p>
              </div>
              <button
                aria-label="Cerrar"
                className="grid size-9 place-items-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 hover:bg-slate-200"
                onClick={() => setShowModal(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <form
              className="space-y-5 p-5 sm:p-6"
              onSubmit={(event) => event.preventDefault()}
            >
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-ink">
                  Nombre completo <span className="text-danger">*</span>
                </span>
                <input
                  className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand-ring"
                  defaultValue={editing ? "Carlos Mendoza Ruiz" : ""}
                  placeholder="Nombres y apellidos"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-ink">
                  Correo institucional <span className="text-danger">*</span>
                </span>
                <input
                  className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand-ring"
                  defaultValue={editing ? "carlos.mendoza@unmsm.edu.pe" : ""}
                  placeholder="usuario@unmsm.edu.pe"
                  required
                  type="email"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-ink">
                  Rol interno <span className="text-danger">*</span>
                </span>
                <select
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand-ring"
                  onChange={(event) => {
                    setRole(event.target.value)
                    setShowBlock(false)
                  }}
                  value={role}
                >
                  <option>Técnico</option>
                  <option>Supervisor</option>
                  <option>Administrador</option>
                </select>
              </label>
              {role === "Técnico" && (
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-ink">
                    Área <span className="text-danger">*</span>
                  </span>
                  <select
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand-ring"
                    defaultValue={editing ? "Soporte informático" : ""}
                    required
                  >
                    <option disabled value="">
                      Selecciona el área del técnico
                    </option>
                    <option>Soporte informático</option>
                    <option>Mantenimiento</option>
                    <option>Servicios generales</option>
                  </select>
                  <span className="mt-1.5 block text-xs text-slate-500">
                    Define qué solicitudes pueden ser asignadas a este técnico.
                  </span>
                </label>
              )}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-extrabold text-ink">
                      Estado del usuario
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {activeUser
                        ? "Puede iniciar sesión y recibir asignaciones."
                        : "El acceso está bloqueado."}
                    </p>
                  </div>
                  <button
                    aria-checked={activeUser}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                      activeUser ? "bg-success" : "bg-slate-300"
                    }`}
                    onClick={() => {
                      if (editing && role === "Técnico" && hasPending) {
                        setShowBlock(true)
                        return
                      }
                      setActiveUser(!activeUser)
                    }}
                    role="switch"
                    type="button"
                  >
                    <span
                      className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition ${
                        activeUser ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
              {showBlock && role === "Técnico" && (
                <div
                  className="flex gap-3 rounded-xl border border-danger-border bg-danger-soft p-4"
                  role="alert"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-danger text-xs font-extrabold text-white">
                    !
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-danger">
                      No es posible desactivar este usuario
                    </p>
                    <p className="mt-1 text-sm leading-5 text-danger">
                      No se puede desactivar un técnico con solicitudes
                      pendientes; reasígnelas primero.
                    </p>
                    <button
                      className="mt-2 text-sm font-extrabold text-link hover:underline"
                      type="button"
                    >
                      Ver 6 solicitudes pendientes
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <Button onClick={() => setShowModal(false)} variant="secondary">
                  Cancelar
                </Button>
                <Button onClick={() => setShowModal(false)}>
                  {editing ? "Guardar cambios" : "Crear usuario"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AppShell>
  )
}

const catalogGroups = [
  {
    label: "Áreas",
    description: "Equipos responsables de la atención.",
    items: [
      ["Soporte informático", "12 categorías", "Activo"],
      ["Mantenimiento", "8 categorías", "Activo"],
      ["Servicios generales", "6 categorías", "Activo"],
    ],
  },
  {
    label: "Categorías",
    description: "Clasificación funcional de solicitudes.",
    items: [
      ["Conectividad", "Soporte informático", "Activo"],
      ["Infraestructura", "Mantenimiento", "Activo"],
      ["Limpieza", "Servicios generales", "Activo"],
      ["Telefonía fija", "Soporte informático", "Inactivo"],
    ],
  },
  {
    label: "Ubicaciones",
    description: "Relación jerárquica Edificio / Ambiente.",
    items: [
      ["FISI / Laboratorio 3", "Edificio / Ambiente", "Activo"],
      ["Biblioteca Central / Piso 2", "Edificio / Ambiente", "Activo"],
      ["Rectorado / Sala antigua", "Edificio / Ambiente", "Inactivo"],
    ],
  },
]

const auditEvents = [
  {
    action: "UPDATE_USER_STATUS",
    actor: "Rafael Castillo",
    entity: "Usuario interno",
    id: "USR-0048",
    lima: "30 jun 2025 · 18:42:15",
    metadata:
      '{"estado_anterior":"activo","estado_nuevo":"inactivo","motivo":"fin de contrato"}',
    utc: "30 jun 2025 · 23:42:15",
  },
  {
    action: "PUBLISH_SLA_VERSION",
    actor: "Rafael Castillo",
    entity: "Política SLA",
    id: "SLA-v1.0",
    lima: "28 jun 2025 · 09:16:04",
    metadata: '{"version":"v1.0","vigencia_desde":"2025-07-01","filas":4}',
    utc: "28 jun 2025 · 14:16:04",
  },
  {
    action: "DEACTIVATE_CATALOG_ITEM",
    actor: "María Paredes",
    entity: "Categoría",
    id: "CAT-0019",
    lima: "25 jun 2025 · 12:03:51",
    metadata: '{"nombre":"Telefonía fija","area":"Soporte informático"}',
    utc: "25 jun 2025 · 17:03:51",
  },
  {
    action: "CREATE_INTERNAL_USER",
    actor: "Rafael Castillo",
    entity: "Usuario interno",
    id: "USR-0052",
    lima: "21 jun 2025 · 10:28:33",
    metadata: '{"rol":"tecnico","area":"Mantenimiento","estado":"activo"}',
    utc: "21 jun 2025 · 15:28:33",
  },
]

function Configuration({ goTo }: { goTo: (screen: Screen) => void }) {
  const [tab, setTab] =
    useState<"Catálogos" | "Políticas de plazos" | "Auditoría administrativa">(
      "Catálogos",
    )
  const [showNewItem, setShowNewItem] = useState(false)
  const [published, setPublished] = useState(false)

  return (
    <AppShell
      active="configuration"
      goTo={goTo}
      subtitle="Gestiona datos maestros, plazos institucionales y trazabilidad."
      title="Configuración y auditoría"
    >
      <main className="mx-auto max-w-6xl px-5 py-6 pb-28 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="overflow-x-auto border-b border-slate-200 px-3 pt-3 sm:px-6">
            <div className="flex min-w-max gap-1">
              {([
                "Catálogos",
                "Políticas de plazos",
                "Auditoría administrativa",
              ] as const).map((item) => (
                <button
                  className={`border-b-2 px-4 py-3 text-sm font-extrabold transition ${
                    tab === item
                      ? "border-brand text-brand"
                      : "border-transparent text-slate-500 hover:text-brand"
                  }`}
                  key={item}
                  onClick={() => setTab(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {tab === "Catálogos" && (
            <div className="p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold tracking-widest text-link">
                    DATOS MAESTROS
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-brand">
                    Gestión de catálogos
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Mantén actualizadas las opciones disponibles al registrar
                    solicitudes.
                  </p>
                </div>
                <Button
                  icon="plus"
                  onClick={() => setShowNewItem(!showNewItem)}
                >
                  Nuevo elemento
                </Button>
              </div>

              <div className="mb-6 flex gap-3 rounded-xl border border-info/20 bg-info-soft p-4 text-sm text-info">
                <Icon name="shield" size={20} />
                <p>
                  Para preservar el historial, los elementos solo pueden
                  desactivarse. No existe borrado físico.
                </p>
              </div>

              {showNewItem && (
                <form
                  className="mb-6 grid gap-4 rounded-xl border border-brand/20 bg-brand-soft p-4 sm:grid-cols-3"
                  onSubmit={(event) => event.preventDefault()}
                >
                  <CompactSelect
                    label="Tipo de catálogo"
                    options={["Área", "Categoría", "Edificio", "Ambiente"]}
                  />
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">
                      Nombre *
                    </span>
                    <input
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand"
                      placeholder="Nombre del elemento"
                      required
                    />
                  </label>
                  <div className="flex items-end gap-2">
                    <Button
                      onClick={() => setShowNewItem(false)}
                      variant="secondary"
                    >
                      Cancelar
                    </Button>
                    <Button onClick={() => setShowNewItem(false)}>
                      Guardar
                    </Button>
                  </div>
                </form>
              )}

              <div className="grid gap-5 lg:grid-cols-3">
                {catalogGroups.map((group) => (
                  <article
                    className="overflow-hidden rounded-xl border border-slate-200"
                    key={group.label}
                  >
                    <div className="border-b border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-brand">
                          {group.label}
                        </h3>
                        <button
                          className="grid size-8 place-items-center rounded-lg bg-white text-brand shadow-sm"
                          type="button"
                        >
                          <Icon name="plus" size={17} />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {group.description}
                      </p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {group.items.map(([name, detail, status]) => (
                        <div className="p-4" key={name}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-extrabold text-ink">
                                {name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {detail}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-extrabold ${
                                status === "Activo"
                                  ? "bg-success-soft text-success"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {status}
                            </span>
                          </div>
                          <div className="mt-3 flex gap-3">
                            <button
                              className="text-xs font-extrabold text-link hover:underline"
                              type="button"
                            >
                              Editar
                            </button>
                            {status === "Activo" && (
                              <button
                                className="text-xs font-extrabold text-danger hover:underline"
                                type="button"
                              >
                                Desactivar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {tab === "Políticas de plazos" && (
            <div className="p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-extrabold tracking-widest text-link">
                      MATRIZ DE HORAS
                    </p>
                    <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-extrabold text-success">
                      Versión vigente · v1.0
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-extrabold text-brand">
                    Políticas de plazos (SLA)
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Configura los objetivos de primera atención y resolución.
                  </p>
                </div>
                <Button onClick={() => setPublished(true)}>
                  Publicar nueva versión
                </Button>
              </div>

              {published && (
                <div className="mb-5 flex gap-3 rounded-xl border border-success/20 bg-success-soft p-4 text-sm text-success">
                  <Icon name="check" size={20} />
                  <div>
                    <p className="font-extrabold">
                      Nueva versión preparada para publicación
                    </p>
                    <p className="mt-1">
                      Revisa la fecha de vigencia y confirma los cambios de la
                      matriz.
                    </p>
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-3xl text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-extrabold">Prioridad</th>
                        <th className="px-5 py-3 font-extrabold">
                          Primera atención (horas)
                        </th>
                        <th className="px-5 py-3 font-extrabold">
                          Resolución (horas)
                        </th>
                        <th className="px-5 py-3 font-extrabold">Referencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        ["Crítica", "4", "24", "bg-danger-soft text-danger"],
                        ["Alta", "8", "48", "bg-warning-soft text-warning"],
                        ["Media", "24", "120", "bg-info-soft text-info"],
                        ["Baja", "48", "240", "bg-success-soft text-success"],
                      ].map(([priority, first, resolution, style]) => (
                        <tr key={priority}>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${style}`}
                            >
                              {priority}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="relative max-w-36">
                              <input
                                className="h-10 w-full rounded-lg border border-slate-300 px-3 pr-9 text-sm font-extrabold text-ink outline-none focus:border-brand"
                                defaultValue={first}
                                type="number"
                              />
                              <span className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                                h
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="relative max-w-36">
                              <input
                                className="h-10 w-full rounded-lg border border-slate-300 px-3 pr-9 text-sm font-extrabold text-ink outline-none focus:border-brand"
                                defaultValue={resolution}
                                type="number"
                              />
                              <span className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                                h
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500">
                            {priority === "Crítica"
                              ? "Servicio interrumpido"
                              : "Horas calendario"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">
                    Nueva versión
                  </span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-extrabold text-ink"
                    defaultValue="v1.1"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">
                    Vigente desde
                  </span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink"
                    type="date"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">
                    Motivo del cambio *
                  </span>
                  <textarea
                    className="min-h-20 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-brand"
                    placeholder="Describe el fundamento de la nueva política..."
                    required
                  />
                </label>
              </div>

              <div className="mt-5 flex gap-3 rounded-xl border border-warning/20 bg-warning-soft p-4 text-sm text-warning">
                <Icon name="clock" size={20} />
                <p>
                  La nueva versión solo aplica a solicitudes registradas desde
                  su fecha de vigencia. Las solicitudes existentes conservan los
                  plazos de su versión original.
                </p>
              </div>
            </div>
          )}

          {tab === "Auditoría administrativa" && (
            <div className="p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-extrabold tracking-widest text-link">
                      TRAZABILIDAD
                    </p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-500">
                      Inmutable
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-extrabold text-brand">
                    Auditoría administrativa
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Registro cronológico de acciones sensibles de configuración.
                  </p>
                </div>
                <Button icon="file" variant="secondary">
                  Exportar auditoría
                </Button>
              </div>

              <div className="mb-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">
                    Desde
                  </span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                    type="date"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">
                    Hasta
                  </span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                    type="date"
                  />
                </label>
                <CompactSelect
                  label="Entidad"
                  options={[
                    "Todas",
                    "Usuario interno",
                    "Política SLA",
                    "Categoría",
                  ]}
                />
                <CompactSelect
                  label="Actor"
                  options={["Todos", "Rafael Castillo", "María Paredes"]}
                />
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-6xl text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        {[
                          "Fecha UTC / Lima",
                          "Actor",
                          "Acción",
                          "Entidad",
                          "ID",
                          "Metadatos JSON",
                        ].map((heading) => (
                          <th
                            className="whitespace-nowrap px-4 py-3 font-extrabold"
                            key={heading}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditEvents.map((event) => (
                        <tr
                          className="align-top hover:bg-slate-50"
                          key={`${event.action}-${event.id}`}
                        >
                          <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                            <p>
                              <span className="font-extrabold text-ink">
                                UTC
                              </span>{" "}
                              {event.utc}
                            </p>
                            <p className="mt-1">
                              <span className="font-extrabold text-ink">
                                Lima
                              </span>{" "}
                              {event.lima}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-ink">
                            {event.actor}
                          </td>
                          <td className="px-4 py-4">
                            <span className="rounded bg-purple-soft px-2 py-1 font-mono text-xs font-bold text-purple">
                              {event.action}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                            {event.entity}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-bold text-link">
                            {event.id}
                          </td>
                          <td className="px-4 py-4">
                            <code className="block max-w-md rounded-lg bg-brand p-3 text-xs leading-5 text-blue-100">
                              {event.metadata}
                            </code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-5 flex gap-3 rounded-xl border border-success/20 bg-success-soft p-4 text-sm text-success">
                <Icon name="shield" size={20} />
                <p>
                  Los metadatos son sanitizados antes de almacenarse. Nunca se
                  registran ni exponen contraseñas, secretos o tokens de acceso.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("login")

  if (screen === "login") return <Login goTo={setScreen} />
  if (screen === "register") return <Register goTo={setScreen} />
  if (screen === "profile") return <Profile goTo={setScreen} />
  if (screen === "notifications") return <Notifications goTo={setScreen} />
  if (screen === "new-request") return <NewRequest goTo={setScreen} />
  if (screen === "requests") return <Requests goTo={setScreen} />
  if (screen === "supervision") return <Supervision goTo={setScreen} />
  if (screen === "dashboard") return <Dashboard goTo={setScreen} />
  if (screen === "technical") return <TechnicalAttention goTo={setScreen} />
  if (screen === "users-admin") return <UsersAdmin goTo={setScreen} />
  if (screen === "configuration") return <Configuration goTo={setScreen} />
  return <RequestDetail goTo={setScreen} />
}
