import { describe, expect, it } from "bun:test";
import {
  ayudaPara,
  detectarComando,
  esCodigoValido,
  parsearPermitir,
  parsearQuitar,
  permisoFaltante,
  puedeUsar,
  resumenPermisos,
  PERMISOS_POR_DEFECTO,
  type PermisosTelegram,
} from "../supabase/functions/_shared/telegramAccesos";

const TODO: PermisosTelegram = {
  puede_notas: true,
  puede_fichero: true,
  puede_vacaciones: true,
  puede_agenda: true,
  puede_administrar: true,
};

const SOLO_NOTAS: PermisosTelegram = {
  puede_notas: true,
  puede_fichero: false,
  puede_vacaciones: false,
  puede_agenda: false,
  puede_administrar: false,
};

describe("detectarComando", () => {
  it("separa el comando del resto del mensaje", () => {
    expect(detectarComando("/nota Conforti Se retiró antes #llamado")).toEqual({
      comando: "nota",
      resto: "Conforti Se retiró antes #llamado",
    });
  });

  it("ignora la mención al bot en el comando", () => {
    expect(detectarComando("/fichero@SotoRRHBot Conforti 3/11")).toEqual({
      comando: "fichero",
      resto: "Conforti 3/11",
    });
  });

  it("trata el texto sin barra como pedido de agenda", () => {
    expect(detectarComando("mañana a las 10 llamar a Conforti")).toEqual({
      comando: "texto_libre",
      resto: "mañana a las 10 llamar a Conforti",
    });
  });

  it("un comando desconocido no se vuelve nota", () => {
    expect(detectarComando("/hola que tal").comando).toBe("texto_libre");
  });
});

describe("puedeUsar", () => {
  it("los permisos por defecto no incluyen administrar", () => {
    expect(PERMISOS_POR_DEFECTO.puede_administrar).toBe(false);
    expect(puedeUsar(PERMISOS_POR_DEFECTO, "permitir")).toBe(false);
    expect(puedeUsar(PERMISOS_POR_DEFECTO, "nota")).toBe(true);
  });

  it("quien solo tiene notas no puede ver fichajes ni vacaciones", () => {
    expect(puedeUsar(SOLO_NOTAS, "nota")).toBe(true);
    expect(puedeUsar(SOLO_NOTAS, "fichero")).toBe(false);
    expect(puedeUsar(SOLO_NOTAS, "noficharon")).toBe(false);
    expect(puedeUsar(SOLO_NOTAS, "vacaciones")).toBe(false);
    expect(puedeUsar(SOLO_NOTAS, "agenda")).toBe(false);
  });

  it("escribir texto libre necesita permiso de agenda", () => {
    expect(puedeUsar(SOLO_NOTAS, "texto_libre")).toBe(false);
    expect(puedeUsar(TODO, "texto_libre")).toBe(true);
  });

  it("la ayuda no necesita ningún permiso", () => {
    expect(puedeUsar(SOLO_NOTAS, "ayuda")).toBe(true);
    expect(permisoFaltante("ayuda")).toBeNull();
  });

  it("dice qué permiso falta para cada comando", () => {
    expect(permisoFaltante("nota")).toBe("puede_notas");
    expect(permisoFaltante("noficharon")).toBe("puede_fichero");
    expect(permisoFaltante("autorizados")).toBe("puede_administrar");
  });
});

describe("códigos y comandos de administración", () => {
  it("acepta un código de Telegram (solo dígitos)", () => {
    expect(esCodigoValido("123456789")).toBe(true);
    expect(esCodigoValido("abc12345")).toBe(false);
    expect(esCodigoValido("123")).toBe(false);
  });

  it("lee /permitir con código y empleado", () => {
    expect(parsearPermitir("123456789 Conforti")).toEqual({ codigo: "123456789", busqueda: "Conforti" });
    expect(parsearPermitir("123456789 108")).toEqual({ codigo: "123456789", busqueda: "108" });
  });

  it("rechaza /permitir sin empleado o con código inválido", () => {
    expect(parsearPermitir("123456789")).toBeNull();
    expect(parsearPermitir("abc Conforti")).toBeNull();
    expect(parsearPermitir("")).toBeNull();
  });

  it("lee /quitar y rechaza códigos inválidos", () => {
    expect(parsearQuitar("123456789")).toBe("123456789");
    expect(parsearQuitar("Conforti")).toBeNull();
  });
});

describe("resumen y ayuda", () => {
  it("resume los permisos activos", () => {
    expect(resumenPermisos(SOLO_NOTAS)).toBe("cargar notas");
    expect(resumenPermisos({ ...PERMISOS_POR_DEFECTO, puede_administrar: true })).toBe(
      "cargar notas · ver fichajes · ver vacaciones · su agenda · administrar accesos",
    );
  });

  it("dice 'sin permisos' cuando no tiene ninguno", () => {
    expect(
      resumenPermisos({
        puede_notas: false,
        puede_fichero: false,
        puede_vacaciones: false,
        puede_agenda: false,
        puede_administrar: false,
      }),
    ).toBe("sin permisos");
  });

  it("la ayuda solo muestra lo que esa persona puede hacer", () => {
    const texto = ayudaPara(SOLO_NOTAS).join("\n");
    expect(texto).toContain("/nota");
    expect(texto).not.toContain("/fichero");
    expect(texto).not.toContain("/permitir");
  });

  it("la ayuda completa incluye accesos y agenda", () => {
    const texto = ayudaPara(TODO).join("\n");
    expect(texto).toContain("/permitir");
    expect(texto).toContain("/agenda");
    expect(texto).toContain("/vacaciones");
  });
});
