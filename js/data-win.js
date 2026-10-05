// KernelLab Windows: mismos conceptos que data.js, con ajustes propios del kernel NT
const CATS = {
  cpu: ['Núcleo y CPU', '⚙️', 'Planificador e hilos', '#4cc9f0'],
  mem: ['Memoria', '🧠', 'Memory Manager', '#c77dff'],
  fs: ['Almacenamiento', '🗂️', 'I/O Manager y NTFS', '#ffb454'],
  net: ['Red', '🌐', 'TCP/IP y NDIS', '#7ee0b0'],
  sec: ['Seguridad', '🛡️', 'SRM, VBS y arranque seguro', '#ff7a9c'],
  drv: ['Drivers', '🔌', 'Plug and Play', '#6ea8ff'],
  dbg: ['Depuración', '🐞', 'Diagnóstico del kernel', '#9fb3c4']
};

// [id, categoría, nombre, descripción, requiere[], tristate(0), mensaje si falta (crítico), [huella MB, arranque s, RAM MB, seguridad, rendimiento]]
const O = [
  ['ALLCORES', 'cpu', 'Usar todos los núcleos', 'Sin límite de núcleos (bcdedit numproc).', [], 0, '', [.5, .3, 6, 0, 18]],
  ['HYPERTHREADING', 'cpu', 'SMT / Hyper-Threading', 'Dos hilos por núcleo: más caudal, algo más de exposición a ataques de canal lateral.', [], 0, '', [0, 0, 2, -3, 8]],
  ['GAMEMODE', 'cpu', 'Modo juego', 'Prioriza el programa en primer plano.', [], 0, '', [0, 0, 3, 0, 5]],
  ['WIN32K', 'cpu', 'Subsistema Win32 (csrss)', 'Ventanas, consola y sesiones de usuario.', [], 0, 'CRITICAL_PROCESS_DIED: csrss.exe terminó inesperadamente', [3.2, .4, 25, 0, 0]],
  ['PAGEFILE', 'mem', 'Archivo de paginación', 'Memoria virtual en disco y volcados de fallo.', [], 0, '', [0, .05, 1, 0, -1]],
  ['LARGEPAGES', 'mem', 'Páginas grandes', 'Menos fallos de TLB: más rápido, más RAM.', [], 0, '', [0, 0, 10, 0, 6]],
  ['SUPERFETCH', 'mem', 'SysMain (Superfetch)', 'Precarga las aplicaciones que más usas.', [], 0, '', [0, .1, 15, 0, 4]],
  ['NTFS', 'fs', 'NTFS', 'Sistema de archivos del volumen de Windows.', [], 0, 'INACCESSIBLE_BOOT_DEVICE: no se puede montar el volumen del sistema (NTFS)', [2.5, .2, 8, 0, 0]],
  ['BITLOCKER', 'fs', 'BitLocker', 'Cifrado de disco completo.', ['NTFS'], 0, '', [.6, .35, 3, 9, -4]],
  ['FASTSTARTUP', 'fs', 'Inicio rápido', 'Hibernación parcial del kernel al apagar.', [], 0, '', [0, -1.2, 0, -2, 3]],
  ['REGISTRY', 'fs', 'Registro (Configuration Manager)', 'Guarda la configuración del sistema y de los drivers.', [], 0, 'CRITICAL_OBJECT_TERMINATION: no se pudo cargar la colmena SYSTEM del registro', [1.2, .15, 6, 0, 0]],
  ['TCPIP', 'net', 'Pila TCP/IP', 'IPv4, TCP y UDP.', [], 0, '', [2.2, .3, 10, -2, 0]],
  ['IPV6', 'net', 'IPv6', 'Direcciones de 128 bits.', ['TCPIP'], 0, '', [.8, .1, 3, -1, 0]],
  ['FIREWALL', 'net', 'Firewall de Windows', 'Filtra el tráfico entrante y saliente.', ['TCPIP'], 0, '', [1.4, .2, 8, 7, -2]],
  ['WIFI', 'net', 'Wi-Fi (WLAN AutoConfig)', 'Redes inalámbricas.', ['TCPIP'], 0, '', [1, .15, 4, -2, 0]],
  ['SMB1', 'net', 'SMBv1 (obsoleto)', 'Compartir archivos al estilo antiguo. Muy vulnerable.', ['TCPIP'], 0, '', [.6, .05, 2, -9, 0]],
  ['SECUREBOOT', 'sec', 'Arranque seguro', 'Solo se cargan gestores de arranque firmados.', [], 0, '', [0, .1, 0, 7, 0]],
  ['VBS', 'sec', 'Seguridad basada en virtualización', 'Aísla partes del kernel con el hipervisor.', ['HYPERV'], 0, '', [1.5, .5, 30, 6, -8]],
  ['HVCI', 'sec', 'Integridad de memoria (HVCI)', 'Solo se ejecuta código firmado en modo kernel.', ['VBS'], 0, '', [.5, .2, 12, 9, -6]],
  ['CFG', 'sec', 'Control Flow Guard', 'Valida los saltos indirectos de los programas.', [], 0, '', [.2, 0, 0, 4, -1]],
  ['DEP', 'sec', 'Prevención de ejecución de datos', 'Impide ejecutar código desde zonas de datos.', [], 0, '', [0, 0, 0, 6, -1]],
  ['DEFENDER', 'sec', 'Microsoft Defender', 'Antimalware en tiempo real.', [], 0, '', [3, .6, 60, 8, -6]],
  ['STORPORT', 'drv', 'Driver de disco NVMe (stornvme)', 'Permite leer el disco del sistema.', [], 0, 'INACCESSIBLE_BOOT_DEVICE: falta el driver del disco NVMe', [.4, .1, 2, 0, 5]],
  ['DISPLAY', 'drv', 'Gráficos (WDDM)', 'Aceleración de vídeo y escritorio.', [], 0, '', [8, .5, 80, 0, 8]],
  ['USBSTACK', 'drv', 'Pila USB', 'Teclados, ratones y pendrives.', [], 0, '', [2, .35, 6, -2, 0]],
  ['HYPERV', 'drv', 'Hyper-V (hipervisor)', 'Ejecuta Windows sobre un hipervisor.', [], 0, '', [2.5, .4, 20, -3, 6]],
  ['WSL2', 'drv', 'WSL 2', 'Un kernel Linux dentro de Windows.', ['HYPERV'], 0, '', [3, .2, 25, -1, 2]],
  ['KDEBUG', 'dbg', 'Depuración del kernel', 'bcdedit /debug: conecta un depurador al arrancar.', [], 0, '', [1.5, 1, 20, -6, -8]],
  ['DRIVERVERIFIER', 'dbg', 'Driver Verifier', 'Comprobaciones extra a los drivers: lento y propenso a pantallazos.', [], 0, '', [.4, .9, 40, -1, -12]],
  ['TESTSIGN', 'dbg', 'Modo de pruebas', 'bcdedit testsigning: acepta drivers sin firmar.', [], 0, '', [0, .05, 0, -10, 0]],
  ['CRASHDUMP', 'dbg', 'Volcado de memoria', 'Guarda un volcado cuando el kernel falla.', ['PAGEFILE'], 0, '', [0, 0, 1, 0, 0]]
];

const PRE = {
  desktop: { n: 'Escritorio', on: ['ALLCORES', 'HYPERTHREADING', 'GAMEMODE', 'WIN32K', 'PAGEFILE', 'LARGEPAGES', 'SUPERFETCH', 'NTFS', 'BITLOCKER', 'FASTSTARTUP', 'REGISTRY', 'TCPIP', 'IPV6', 'FIREWALL', 'WIFI', 'SECUREBOOT', 'VBS', 'HVCI', 'CFG', 'DEP', 'DEFENDER', 'STORPORT', 'DISPLAY', 'USBSTACK', 'HYPERV', 'WSL2', 'CRASHDUMP'], m: [] },
  gaming: { n: 'Gaming', on: ['ALLCORES', 'HYPERTHREADING', 'GAMEMODE', 'WIN32K', 'PAGEFILE', 'LARGEPAGES', 'SUPERFETCH', 'NTFS', 'FASTSTARTUP', 'REGISTRY', 'TCPIP', 'IPV6', 'WIFI', 'SECUREBOOT', 'CFG', 'DEP', 'STORPORT', 'DISPLAY', 'USBSTACK'], m: [] },
  hard: { n: 'Blindado', on: ['ALLCORES', 'WIN32K', 'PAGEFILE', 'NTFS', 'BITLOCKER', 'REGISTRY', 'TCPIP', 'IPV6', 'FIREWALL', 'SECUREBOOT', 'VBS', 'HVCI', 'CFG', 'DEP', 'DEFENDER', 'STORPORT', 'DISPLAY', 'HYPERV', 'CRASHDUMP'], m: [] },
  min: { n: 'Mínimo', on: ['ALLCORES', 'WIN32K', 'NTFS', 'REGISTRY', 'STORPORT', 'TCPIP', 'DISPLAY'], m: [] }
};

const INFO = {
  cpu: 'El planificador del kernel (ntoskrnl) reparte los hilos entre núcleos. SMT, los núcleos usados y el subsistema Win32 cambian el rendimiento y la estabilidad.',
  mem: 'El Memory Manager gestiona la memoria virtual, la paginación y la precarga. Las páginas grandes y SysMain ganan velocidad a costa de RAM.',
  fs: 'El I/O Manager y NTFS montan el volumen del sistema y el registro guarda la configuración. Sin ellos, Windows no arranca.',
  net: 'Pila TCP/IP, firewall y protocolos como SMB. Cada componente añade superficie de ataque; SMBv1 es el ejemplo clásico.',
  sec: 'Arranque seguro, VBS y HVCI aíslan el kernel con el hipervisor. Suben la protección a cambio de memoria y rendimiento.',
  drv: 'El Plug and Play carga los drivers de disco, gráficos y USB. Hyper-V y WSL 2 añaden un hipervisor bajo el sistema.',
  dbg: 'La depuración del kernel, Driver Verifier y el modo de pruebas sirven para desarrollar drivers, pero debilitan la seguridad y el rendimiento.'
};

const EDGES = [['cpu', 'mem'], ['cpu', 'sec'], ['cpu', 'drv'], ['cpu', 'dbg'], ['mem', 'fs'], ['mem', 'net'], ['mem', 'dbg'], ['fs', 'drv'], ['fs', 'sec'], ['net', 'drv'], ['net', 'sec']];

const HOOKS = {
  os: 'windows',
  pfx: '',
  panic: 'Pantalla azul (BSOD)',
  lbl: { n: 'off', y: 'on' },
  labels: { size: 'Huella del núcleo', ram: 'RAM residente' },
  B: { size: 14, boot: 3, ram: 60, sec: 35, perf: 40 },
  warn: on => {
    const w = [];
    if (on('DRIVERVERIFIER')) w.push('Driver Verifier activo: puede provocar pantallas azules y pierdes unos 12 puntos de rendimiento.');
    if (!on('PAGEFILE')) w.push('Sin archivo de paginación pueden aparecer errores de memoria insuficiente y no habrá volcados.');
    if (!on('FIREWALL')) w.push('ℹ Sin firewall, el equipo queda expuesto en la red.');
    if (on('SMB1')) w.push('ℹ SMBv1 activo: protocolo obsoleto vulnerable (WannaCry).');
    if (!on('DEFENDER')) w.push('ℹ Sin antimalware activo.');
    if (!on('SECUREBOOT')) w.push('ℹ Sin arranque seguro, un bootkit podría cargarse antes del kernel.');
    if (on('TESTSIGN')) w.push('ℹ Modo de pruebas activo: Windows acepta drivers sin firmar.');
    if (on('KDEBUG')) w.push('ℹ Depuración del kernel activa: arranque más lento y menos seguro.');
    if (!on('DISPLAY')) w.push('ℹ Sin driver WDDM la pantalla usa solo el modo básico.');
    if (!on('USBSTACK')) w.push('ℹ Sin pila USB, teclados, ratones y pendrives USB no funcionarán.');
    if (!on('TCPIP')) w.push('ℹ Sin pila TCP/IP no hay red.');
    return w;
  },
  arch: on => ({
    user: ['👤 Modo usuario', 'Win32, servicios y tus aplicaciones'],
    sys: ['Interfaz nativa (ntdll y syscalls)', on('CFG') ? 'Con Control Flow Guard' : 'Sin Control Flow Guard'],
    hw: ['🖥️ HAL y hardware', (on('ALLCORES') ? 'Todos los núcleos en uso' : 'Solo 1 núcleo en uso') + (on('STORPORT') ? ', disco NVMe detectado' : ', disco sin driver')]
  }),
  boot: ({ on, get, t, p, L, err, warn }) => {
    p('Windows Boot Manager: cargando winload.efi');
    p(on('SECUREBOOT') ? 'Secure Boot: firmas verificadas' : 'Secure Boot desactivado', on('SECUREBOOT') ? '' : 'warn');
    if (on('TESTSIGN')) p('Modo de pruebas activo (testsigning)', 'warn');
    if (on('KDEBUG')) p('KD: esperando al depurador del kernel', 'warn');
    p('ntoskrnl.exe: HAL y kernel inicializados, ' + (on('ALLCORES') ? 'todos los núcleos' : '1 núcleo'));
    if (on('HYPERV')) p('hvix64: hipervisor iniciado');
    if (on('VBS')) p('VBS: modo seguro (VTL1) activo');
    if (on('HVCI')) p('HVCI: integridad de código protegida por el hipervisor');
    p(`Memory Manager: ${Math.round(t.ram)} MB reservados`);
    if (on('SUPERFETCH')) p('SysMain: precarga de aplicaciones');
    if (on('TCPIP')) p('tcpip.sys: pila de red cargada'); else p('Sin pila de red', 'warn');
    if (on('DISPLAY')) p('dxgkrnl.sys: WDDM inicializado');
    [['STORPORT', 'stornvme.sys: disco NVMe detectado'], ['NTFS', 'ntfs.sys: volumen del sistema montado'], ['REGISTRY', 'CM: colmena SYSTEM cargada'], ['WIN32K', 'smss.exe y csrss.exe iniciados']]
      .forEach(([id, m]) => p(on(id) ? m : get(id).k, on(id) ? '' : 'bad'));
    if (err.length) L.push([`*** STOP: ${err[0]}`, 'bad'], [':( Tu equipo ha tenido un problema y debe reiniciarse.', 'bad']);
    else L.push(['winlogon.exe: pantalla de inicio de sesión', ''], warn.length ? [`⚠ Windows listo con avisos en ${t.boot.toFixed(2)} s`, 'warn'] : [`✔ Windows listo en ${t.boot.toFixed(2)} s`, 'ok']);
  },
  ok: () => 'Windows iniciado sin problemas',
  exp: (OPT, st, on) => {
    const C = { KDEBUG: ['bcdedit /debug on', 'bcdedit /debug off'], TESTSIGN: ['bcdedit /set testsigning on', 'bcdedit /set testsigning off'], HYPERV: ['bcdedit /set hypervisorlaunchtype auto', 'bcdedit /set hypervisorlaunchtype off'], FASTSTARTUP: ['powercfg /hibernate on', 'powercfg /hibernate off'] };
    return { name: 'kernellab-windows.bat', text: '@echo off\r\nREM Generado por KernelLab. Es solo una simulación educativa.\r\nREM Quita la siguiente línea únicamente si entiendes cada comando.\r\nexit /b\r\n' + OPT.map(o => C[o.id] ? C[o.id][on(o.id) ? 0 : 1] : `REM ${o.id}: ${on(o.id) ? 'activado' : 'desactivado'}`).join('\r\n') + '\r\n' };
  }
};
