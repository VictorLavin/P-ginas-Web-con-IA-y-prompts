// Categorías: id -> [nombre, icono, subsistema, color]
const CATS = {
  cpu: ['Núcleo y CPU', '⚙️', 'Planificador', '#4cc9f0'],
  mem: ['Memoria', '🧠', 'Gestión de memoria', '#c77dff'],
  fs: ['Archivos', '🗂️', 'VFS', '#ffb454'],
  net: ['Red', '🌐', 'Pila de red', '#7ee0b0'],
  sec: ['Seguridad', '🛡️', 'LSM y mitigaciones', '#ff7a9c'],
  drv: ['Drivers', '🔌', 'Controladores', '#6ea8ff'],
  dbg: ['Depuración', '🐞', 'Trazas y logs', '#9fb3c4']
};

// [id, categoría, nombre, descripción, requiere[], tristate(1/0), mensaje si falta (crítico), [tamaño MB, arranque s, RAM MB, seguridad, rendimiento]]
const O = [
  ['SMP', 'cpu', 'Multiprocesamiento (SMP)', 'Usa todos los núcleos de la CPU.', [], 0, '', [.4, .2, 4, 0, 18]],
  ['PREEMPT', 'cpu', 'Kernel expulsivo', 'Mejor latencia en escritorio, algo menos de caudal.', [], 0, '', [.1, 0, 0, 0, 3]],
  ['NUMA', 'cpu', 'Soporte NUMA', 'Para servidores con varios sockets.', ['SMP'], 0, '', [.3, .1, 6, 0, 4]],
  ['CPU_FREQ', 'cpu', 'Escalado de frecuencia', 'Ahorra energía ajustando los GHz.', [], 0, '', [.2, .05, 1, 0, 2]],
  ['MODULES', 'cpu', 'Módulos cargables', 'Permite drivers en caliente (opción m).', [], 0, '', [.3, .1, 2, -3, 0]],
  ['SWAP', 'mem', 'Swap', 'Usa disco cuando se acaba la RAM.', [], 0, '', [.1, 0, 0, 0, 0]],
  ['THP', 'mem', 'Transparent Huge Pages', 'Páginas grandes automáticas: más rápido, más RAM.', [], 0, '', [.2, 0, 8, 0, 6]],
  ['CGROUPS', 'mem', 'Cgroups', 'Límites de recursos: base de Docker y systemd.', [], 0, '', [.4, .1, 3, 0, 0]],
  ['EXT4', 'fs', 'Ext4', 'Sistema de archivos del disco raíz.', [], 0, 'VFS: Unable to mount root fs on unknown-block(259,2)', [.9, .1, 2, 0, 0]],
  ['BTRFS', 'fs', 'Btrfs', 'Snapshots y compresión.', [], 1, '', [1.1, .05, 3, 0, 1]],
  ['NTFS3', 'fs', 'NTFS (lectura/escritura)', 'Para leer discos de Windows.', [], 1, '', [.5, 0, 1, 0, 0]],
  ['FUSE', 'fs', 'FUSE', 'Sistemas de archivos en espacio de usuario.', [], 1, '', [.2, 0, 1, -2, 0]],
  ['DEVTMPFS', 'fs', 'devtmpfs', 'Crea los nodos de /dev automáticamente.', [], 0, 'devtmpfs: no montado, /dev está vacío', [.05, 0, 1, 0, 0]],
  ['PROC_FS', 'fs', '/proc', 'Información de procesos y del kernel.', [], 0, 'systemd[1]: Failed to mount /proc', [.1, 0, 1, 0, 0]],
  ['NET', 'net', 'Redes', 'Base de toda la pila de red.', [], 0, '', [1.2, .3, 6, -2, 0]],
  ['INET', 'net', 'TCP/IP', 'IPv4, TCP y UDP.', ['NET'], 0, '', [.8, .2, 4, -1, 0]],
  ['IPV6', 'net', 'IPv6', 'Direcciones de 128 bits.', ['INET'], 1, '', [.7, .15, 3, -1, 0]],
  ['NETFILTER', 'net', 'Netfilter', 'Cortafuegos (iptables, nftables).', ['NET'], 0, '', [.9, .1, 3, 6, -2]],
  ['WIRELESS', 'net', 'Wi-Fi', 'Redes inalámbricas 802.11.', ['NET'], 0, '', [.8, .15, 2, -2, 0]],
  ['BT', 'net', 'Bluetooth', 'Auriculares, ratones, móviles.', ['NET'], 1, '', [.6, .05, 1, -3, 0]],
  ['SECCOMP', 'sec', 'Seccomp', 'Filtra syscalls: sandbox de Chrome y Docker.', [], 0, '', [.1, 0, 0, 5, -1]],
  ['STACKPROTECTOR', 'sec', 'Protección de pila', 'Detecta desbordamientos de buffer.', [], 0, '', [.05, 0, 0, 5, -1]],
  ['RANDOMIZE_BASE', 'sec', 'KASLR', 'Direcciones del kernel aleatorias.', [], 0, '', [.02, .05, 0, 6, 0]],
  ['SELINUX', 'sec', 'SELinux', 'Control de acceso obligatorio muy estricto.', [], 0, '', [.9, .2, 5, 9, -3]],
  ['APPARMOR', 'sec', 'AppArmor', 'Perfiles de acceso por aplicación.', [], 0, '', [.5, .1, 3, 7, -2]],
  ['BLK_DEV_NVME', 'drv', 'Disco NVMe', 'Driver del SSD donde está el sistema.', [], 0, 'nvme: no se encuentra el disco raíz', [.3, .1, 1, 0, 5]],
  ['DRM', 'drv', 'Gráficos (DRM)', 'Aceleración de vídeo y entorno gráfico.', [], 1, '', [3.5, .4, 20, 0, 8]],
  ['SND', 'drv', 'Sonido (ALSA)', 'Audio.', [], 1, '', [1.8, .1, 4, 0, 0]],
  ['USB', 'drv', 'USB', 'Teclados, ratones, pendrives.', [], 0, '', [1.6, .35, 5, -2, 0]],
  ['USB_STORAGE', 'drv', 'Almacenamiento USB', 'Pendrives y discos externos.', ['USB'], 1, '', [.3, .05, 1, -2, 0]],
  ['KVM', 'drv', 'KVM', 'Máquinas virtuales aceleradas por hardware.', ['SMP'], 1, '', [1.4, .1, 3, -4, 10]],
  ['DEBUG_KERNEL', 'dbg', 'Depuración del kernel', 'Comprobaciones extra: lentas y pesadas.', [], 0, '', [8, 1.2, 25, -5, -12]],
  ['KPROBES', 'dbg', 'Kprobes', 'Sondas dinámicas para depurar.', ['DEBUG_KERNEL'], 0, '', [.4, 0, 2, -3, -1]],
  ['FTRACE', 'dbg', 'Ftrace', 'Trazado de funciones del kernel.', [], 0, '', [1.5, .1, 6, -1, -2]],
  ['PRINTK', 'dbg', 'printk', 'Mensajes del kernel (dmesg).', [], 0, '', [.4, .05, 1, 0, 0]]
];

// Presets: y = integrado, m = módulo
const PRE = {
  desktop: { n: 'Escritorio', on: ['SMP', 'PREEMPT', 'CPU_FREQ', 'MODULES', 'SWAP', 'THP', 'CGROUPS', 'EXT4', 'DEVTMPFS', 'PROC_FS', 'NET', 'INET', 'IPV6', 'NETFILTER', 'WIRELESS', 'SECCOMP', 'STACKPROTECTOR', 'RANDOMIZE_BASE', 'APPARMOR', 'BLK_DEV_NVME', 'DRM', 'USB', 'FTRACE', 'PRINTK'], m: ['BTRFS', 'NTFS3', 'FUSE', 'BT', 'SND', 'USB_STORAGE', 'KVM'] },
  server: { n: 'Servidor', on: ['SMP', 'NUMA', 'CPU_FREQ', 'MODULES', 'SWAP', 'THP', 'CGROUPS', 'EXT4', 'DEVTMPFS', 'PROC_FS', 'NET', 'INET', 'IPV6', 'NETFILTER', 'SECCOMP', 'STACKPROTECTOR', 'RANDOMIZE_BASE', 'SELINUX', 'BLK_DEV_NVME', 'FTRACE', 'PRINTK'], m: ['BTRFS', 'KVM'] },
  hard: { n: 'Blindado', on: ['SMP', 'MODULES', 'CGROUPS', 'EXT4', 'DEVTMPFS', 'PROC_FS', 'NET', 'INET', 'IPV6', 'NETFILTER', 'SECCOMP', 'STACKPROTECTOR', 'RANDOMIZE_BASE', 'SELINUX', 'APPARMOR', 'BLK_DEV_NVME', 'PRINTK'], m: [] },
  min: { n: 'Mínimo', on: ['EXT4', 'DEVTMPFS', 'PROC_FS', 'BLK_DEV_NVME', 'PRINTK', 'NET', 'INET'], m: [] }
};

// Qué hace cada subsistema (panel de información y sección de conceptos)
const INFO = {
  cpu: 'El planificador reparte el tiempo de CPU entre procesos. SMP, PREEMPT o NUMA cambian la latencia, el rendimiento y cuántos núcleos se aprovechan.',
  mem: 'Gestiona la memoria virtual, el swap y los límites por grupo (cgroups). Una mala configuración provoca más reclaim, más swap o procesos eliminados.',
  fs: 'El VFS ofrece una interfaz común a todos los sistemas de archivos. Sin el del disco raíz, devtmpfs o /proc, el sistema ni siquiera arranca.',
  net: 'Sockets, TCP/IP y cortafuegos. Cada protocolo añade código, memoria y superficie de ataque.',
  sec: 'Módulos de seguridad y mitigaciones. Suben la protección a cambio de algo de rendimiento.',
  drv: 'Traducen las operaciones del kernel a dispositivos. Un driver que falta deja sin disco, sonido o gráficos.',
  dbg: 'Trazas y comprobaciones internas. Sirven para diagnosticar, pero pesan y frenan el kernel.'
};

// Relaciones entre subsistemas (aristas del grafo)
const EDGES = [['cpu', 'mem'], ['cpu', 'sec'], ['cpu', 'drv'], ['cpu', 'dbg'], ['mem', 'fs'], ['mem', 'net'], ['mem', 'dbg'], ['fs', 'drv'], ['fs', 'sec'], ['net', 'drv'], ['net', 'sec']];

// Particularidades de Linux que usa app.js (el motor es común a Linux y Windows)
const HOOKS = {
  os: 'linux',
  pfx: 'CONFIG_',
  warn: (on, d) => {
    const w = [];
    if (!on('SECCOMP')) w.push('Sin seccomp, Docker y Chrome pierden su sandbox y pueden fallar.');
    if (!on('CGROUPS')) w.push('Sin cgroups, systemd y los contenedores no funcionan bien.');
    if (d && d.lsm && !on(d.lsm.toUpperCase())) w.push(`${d.n} suele usar ${d.lsm}, que está desactivado.`);
    if (on('SELINUX') && on('APPARMOR')) w.push('ℹ SELinux y AppArmor a la vez: redundante y más pesado.');
    if (!on('PRINTK')) w.push('ℹ Sin printk no habrá mensajes del kernel (dmesg vacío).');
    if (!on('NET')) w.push('ℹ Sin red, el sistema queda aislado.');
    else if (!on('INET')) w.push('ℹ Sin TCP/IP no hay conexión a Internet.');
    if (!on('DRM')) w.push('ℹ Sin DRM no hay entorno gráfico (normal en un servidor).');
    if (!on('USB')) w.push('ℹ Sin USB, teclados, ratones y pendrives USB no funcionarán.');
    if (!on('SMP')) w.push('ℹ Con un solo núcleo el sistema irá lento bajo carga.');
    if (!on('STACKPROTECTOR') || !on('RANDOMIZE_BASE')) w.push('ℹ Sin protección de pila o KASLR, un fallo de seguridad es más fácil de explotar.');
    if (on('DEBUG_KERNEL')) w.push('ℹ DEBUG_KERNEL activo: pierdes unos 12 puntos de rendimiento.');
    return w;
  },
  arch: (on, d) => ({
    user: ['👤 Espacio de usuario', `${d ? d.init : 'systemd'}, tu shell y tus aplicaciones`],
    sys: ['Llamadas al sistema', on('SECCOMP') ? 'Con filtro seccomp' : 'Sin filtro seccomp'],
    hw: ['🖥️ Hardware', (on('SMP') ? 'Todos los núcleos en uso' : 'Solo 1 núcleo en uso') + (on('BLK_DEV_NVME') ? ', disco NVMe detectado' : ', disco sin driver')]
  }),
  boot: ({ on, get, t, p, L, err, warn, distro: d }) => {
    if (!on('PRINTK')) L.push(['(pantalla en negro: sin CONFIG_PRINTK no hay mensajes del kernel)', 'warn']);
    else {
      p(`${d.n}: Linux version 6.x-kernellab` + (on('PREEMPT') ? ' PREEMPT' : ''));
      p('Command line: root=/dev/nvme0n1p2 ro quiet');
      p(on('SMP') ? 'smpboot: activando todos los núcleos' : 'smpboot: SMP desactivado, solo 1 CPU', on('SMP') ? '' : 'warn');
      p(on('RANDOMIZE_BASE') ? 'KASLR: base aleatoria del kernel' : 'KASLR desactivado', on('RANDOMIZE_BASE') ? '' : 'warn');
      p(`Memory: el kernel reserva ${Math.round(t.ram)} MB`);
      if (on('THP')) p('transparent hugepage: always');
      if (on('NET')) p('NET: registrados UNIX' + (on('INET') ? ', INET' : '') + (on('IPV6') ? ', INET6' : '')); else p('NET: sin pila de red', 'warn');
      if (on('NETFILTER')) p('nf_conntrack: cargado');
      if (on('DRM')) p('[drm] framebuffer inicializado');
      if (on('USB')) p('usbcore: nuevo driver usbfs');
      if (on('SELINUX')) p('SELinux: inicializando');
      if (on('APPARMOR')) p('AppArmor: inicializado');
      [['BLK_DEV_NVME', 'nvme nvme0: disco detectado (nvme0n1)'], ['EXT4', 'EXT4-fs (nvme0n1p2): raíz montada'], ['DEVTMPFS', 'devtmpfs: montado en /dev'], ['PROC_FS', `${d.init}: /proc montado`]]
        .forEach(([id, m]) => p(on(id) ? m : get(id).k, on(id) ? '' : 'bad'));
    }
    if (err.length) L.push([`Kernel panic - not syncing: ${err[0]}`, 'bad'], ['---[ end Kernel panic ]---', 'bad']);
    else L.push([`Run /sbin/init (${d.init})`, ''], warn.length ? [`⚠ Arranque completado con avisos en ${t.boot.toFixed(2)} s`, 'warn'] : [`✔ Arranque completado en ${t.boot.toFixed(2)} s`, 'ok']);
  },
  ok: ({ distro: d }) => `${d.n} inició correctamente`,
  exp: (OPT, st, on) => ({ name: '.config', text: '# Generado por KernelLab\n' + OPT.map(o => on(o.id) ? `CONFIG_${o.id}=${st[o.id]}` : `# CONFIG_${o.id} is not set`).join('\n') + '\n' })
};

// Distribuciones: nombre, sistema de init y módulo de seguridad que suelen traer por defecto
const DISTROS = [
  { id: 'ubuntu', n: 'Ubuntu', init: 'systemd', lsm: 'apparmor' },
  { id: 'debian', n: 'Debian', init: 'systemd', lsm: 'apparmor' },
  { id: 'fedora', n: 'Fedora', init: 'systemd', lsm: 'selinux' },
  { id: 'arch', n: 'Arch Linux', init: 'systemd', lsm: '' },
  { id: 'mint', n: 'Linux Mint', init: 'systemd', lsm: 'apparmor' },
  { id: 'suse', n: 'openSUSE', init: 'systemd', lsm: 'apparmor' },
  { id: 'alpine', n: 'Alpine Linux', init: 'OpenRC', lsm: '' }
];
