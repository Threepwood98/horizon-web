# Cuentas de demostración de Horizon

El fixture de demostración está diseñado únicamente para desarrollo local y no debe instalarse en producción.

Se carga con:

```bash
pnpm db:seed
```

Todas las cuentas utilizan la misma contraseña:

```text
HorizonDemo2026!
```

El identificador para iniciar sesión es el correo electrónico; la aplicación no utiliza nombres de usuario independientes.

## Credenciales

| Nombre | Correo | Rol | Equipo |
| --- | --- | --- | --- |
| Ana Operadora | `user.alpha@demo.horizon.test` | `user` | Alpha |
| Mia Operadora | `member.alpha@demo.horizon.test` | `user` | Alpha |
| Bruno Operador | `user.beta@demo.horizon.test` | `user` | Beta |
| Carla Candidata | `candidate.gamma@demo.horizon.test` | `user` | Gamma |
| Usuario Sin Equipo | `unassigned@demo.horizon.test` | `user` | Sin equipo |
| Leo Lider | `leader.alpha@demo.horizon.test` | `leader` | Alpha |
| Elena Lider | `leader.beta@demo.horizon.test` | `leader` | Beta |
| Marta Manager | `manager@demo.horizon.test` | `manager` | Sin equipo |
| Ada Admin | `admin@demo.horizon.test` | `admin` | Sin equipo |
| Alex Admin | `admin.backup@demo.horizon.test` | `admin` | Sin equipo |

## Datos incluidos

- Alpha y Beta tienen líderes, miembros, cuentas de sitios activas e historial de reportes.
- Gamma tiene una integrante, pero no tiene líder ni cuentas de sitios, por lo que sirve para probar la administración.
- Orion está compartido por Alpha y Beta con saldos iniciales diferentes.
- Nova pertenece solamente a Alpha y Atlas solamente a Beta.
- Legacy está inactivo, pero conserva historial aceptado para las estadísticas.
- Unlinked está activo y no tiene ninguna cuenta de equipo.
- Los reportes cubren los estados `draft`, `sent`, `accepted` y `rejected`.
- Ana tiene dos borradores de Orion para la fecha actual: uno propio de `$9` y otro creado por Leo con el desglose `10 + 5 = 15`; permanecen separados por creador.
- El borrador creado por Leo muestra solamente su nombre como atribución delegada.
- El reporte pendiente de Ana en Orion muestra la etiqueta de envío automático.
- El historial incluye un ciclo completo de envío, rechazo, corrección, reenvío y aceptación.
- Los borradores usan la fecha civil actual para que el job diario no los envíe inmediatamente después de restaurar el fixture.
- Los reportes aceptados contienen cadenas continuas de saldo inicial y final.
- Las fechas se generan respecto al mes civil actual en `America/Havana`, con historial adicional en el mes anterior.

## Pruebas sugeridas

### Usuario

Inicia sesión como Ana para crear, editar, eliminar y enviar tanto sus borradores como el borrador creado por Leo. El formulario nuevo no muestra una fecha y el servidor utiliza el día actual. Este rol no tiene acceso a la sección Historial.

Inicia sesión como Usuario Sin Equipo para comprobar el estado vacío cuando no hay equipo ni sitios disponibles.

### Líder

Inicia sesión como Leo para registrar reportes en fechas anteriores y a nombre de cualquier integrante de Alpha. Historial muestra todos los eventos de Alpha, incluido un reporte con dos ciclos de revisión. La cola pendiente incluye reportes de Ana, Mia y Leo en Orion y Nova, lo que permite probar aceptación y rechazo por lotes.

Utiliza los filtros de estadísticas para comparar integrantes y sitios de Alpha.

### Manager

Inicia sesión como Marta para administrar equipos, sitios y cuentas. Gamma, Carla y Unlinked permiten probar la asignación de un líder y la creación de una cuenta de equipo y sitio.

La pestaña de usuarios de Administración permanece en modo de solo lectura para este rol.

Historial muestra los eventos de todos los equipos, pero Marta continúa sin acceso a Informes ni Aprobaciones.

### Administrador

Inicia sesión como Ada para probar todas las operaciones de administración, además de la asignación de roles y equipos. Alex proporciona un segundo administrador para probar las protecciones de acceso sin dejar el fixture con un solo admin.

## Comportamiento al reiniciar

Al volver a ejecutar `pnpm db:seed`:

- Se restauran nombres, roles, equipos, líderes, sitios y saldos iniciales.
- Se eliminan los reportes de las cuentas demo documentadas y se recrea el historial base.
- Se restaura una cuenta de credenciales funcional para cada usuario demo.
- Se revocan todas las sesiones demo, por lo que será necesario volver a iniciar sesión.
- Se conservan los usuarios y registros que no pertenecen al fixture demo.
