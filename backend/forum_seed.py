"""Forum seed topics (loaded on startup if forum is empty)."""

FORUM_CATEGORIES = [
    {"key": "general", "label": "Conversación general"},
    {"key": "financiamiento", "label": "Financiamiento y convocatorias"},
    {"key": "publicos", "label": "Desarrollo de públicos"},
    {"key": "sostenibilidad", "label": "Sostenibilidad económica"},
    {"key": "formulacion", "label": "Formulación de proyectos"},
    {"key": "marketing", "label": "Comunicación y marketing cultural"},
    {"key": "presupuestos", "label": "Presupuestos"},
    {"key": "indicadores", "label": "Indicadores y evaluación"},
    {"key": "legal", "label": "Aspectos legales y derechos de autor"},
    {"key": "casos", "label": "Casos de estudio y buenas prácticas"},
]

KINDS = [
    {"key": "pregunta", "label": "Pregunta"},
    {"key": "experiencia", "label": "Experiencia"},
    {"key": "buena_practica", "label": "Buena práctica"},
]


FORUM_SEED = [
    {
        "category": "financiamiento",
        "kind": "pregunta",
        "featured": True,
        "title": "¿Cuál fue vuestra primera convocatoria y cómo la abordaron?",
        "body": "Estamos por postular a nuestra primera convocatoria pública y me interesa mucho escuchar cómo lo vivieron ustedes: qué prepararon antes, qué errores cometieron y qué harían distinto la próxima vez.",
        "author": "Camila Restrepo",
        "tags": ["convocatorias", "primera vez"],
        "replies": [
            {"author": "Andrés Vega", "body": "Mi consejo principal: postular varias veces al mismo fondo hasta ganarlo. En tres años pasé de que ni me miraran a ganar dos veces seguidas — es una curva de aprendizaje. Guarda TODO lo que escribas, la próxima postulación te va a costar la mitad."},
            {"author": "María Fernanda Torres", "body": "Yo empezaría por convocatorias locales pequeñas antes que los fondos grandes. Dan track record. Y busca acompañamiento de alguien que ya haya ganado, aunque sea una tarde de café."},
            {"author": "Luz Marina Cabrera", "body": "Un tema poco hablado: la salud emocional al postular. Prepara respuestas para el 'no' porque van a llegar. No es rechazo a ti, es un proceso."},
        ],
    },
    {
        "category": "publicos",
        "kind": "buena_practica",
        "title": "Sistema simple de mailing list que sí funciona",
        "body": "Después de años de depender de Instagram, monté un mailing con Mailerlite (gratis hasta 1000 suscriptores). En 6 meses tengo 450 suscriptores con 42% de apertura. La clave: escribir cada quince días, corto, humano, con una historia y UN llamado a la acción.",
        "author": "Verónica Aguilar",
        "tags": ["mailing", "audiencia propia"],
        "replies": [
            {"author": "Paula Cortés", "body": "Confirmo el 42%. Lo importante es tratar el mailing como un objeto editorial, no como spam de venta."},
            {"author": "Ana Cristina Salazar", "body": "¿Qué usas para captar suscriptores en eventos presenciales?"},
        ],
    },
    {
        "category": "sostenibilidad",
        "kind": "experiencia",
        "featured": True,
        "title": "Pasamos de 90% beca a modelo diversificado en 18 meses",
        "body": "Compartimos el camino: nuestra sala pasó de depender de una única beca al 30% taquilla + 25% alquiler + 20% formación + 15% membresías + 10% donaciones. No fue lineal, hubo dos meses críticos donde casi cerramos. Lo que salvó: bajar el ego y reconocer que necesitábamos vender formación aunque no fuera nuestro corazón.",
        "author": "Espacio Cardinal",
        "tags": ["diversificación", "sala independiente"],
        "replies": [
            {"author": "Julia Mora", "body": "Muy valioso. ¿Cómo estructuraron las membresías? Es lo que menos me convence del mix habitual."},
            {"author": "Espacio Cardinal", "body": "3 tramos: $10 mensual (acceso a ensayos abiertos), $25 (10% descuento + newsletter interna) y $50 (acompañante gratis + invitación a estrenos). El tramo de $25 concentra 70% de las membresías."},
        ],
    },
    {
        "category": "formulacion",
        "kind": "pregunta",
        "title": "¿Vale la pena contratar a alguien que redacte proyectos?",
        "body": "Tengo la idea muy clara pero escribir la propuesta me toma semanas y odio hacerlo. ¿Alguien ha contratado a alguien externo para redactar y ha valido la pena? ¿Tarifa promedio?",
        "author": "Mateo López",
        "tags": ["redacción", "consultoría"],
        "replies": [
            {"author": "Camila Restrepo", "body": "Depende. Contratar solo redacción sin acompañamiento a menudo produce textos correctos pero sin alma. Mejor busca alguien que te ayude a pensar el proyecto y de paso redacte."},
        ],
    },
    {
        "category": "marketing",
        "kind": "buena_practica",
        "featured": True,
        "title": "Boca a boca sistematizado: 15 personas × 5 invitaciones",
        "body": "Deja de rezarle al algoritmo. Antes de cada evento identifico a 15 personas de mi red cercana y les pido a cada una que inviten personalmente a 5 personas más. No es un pedido genérico: cada invitación tiene contexto, motivo y beneficio para el invitado. Nos ha permitido llenar sostenidamente sin gastar en ads.",
        "author": "Julia Mora",
        "tags": ["boca a boca", "conversión"],
        "replies": [
            {"author": "Sebastián Ruiz", "body": "El detalle clave es 'personalmente'. Ya no funciona el flyer reenviado en WhatsApp — se ha vuelto ruido."},
        ],
    },
    {
        "category": "legal",
        "kind": "pregunta",
        "title": "Contratos con artistas invitados: ¿modelo mínimo viable?",
        "body": "¿Alguien tiene un modelo de contrato simple pero suficiente para artistas invitados que colaboran una vez? Quiero evitar dos extremos: nada firmado (riesgo) o contrato de 12 páginas (fricción).",
        "author": "Fernando Ríos",
        "tags": ["contratos", "artistas"],
        "replies": [],
    },
    {
        "category": "indicadores",
        "kind": "experiencia",
        "title": "Los 4 indicadores que sí medimos (y por qué)",
        "body": "Después de años intentando medir de todo, redujimos a 4 indicadores no negociables: % de ocupación, tasa de retorno de público, ingresos por fuente y horas invertidas vs. resultados. Todo lo demás distrae. Nos toma 30 min al mes revisarlos.",
        "author": "Diego Fernández",
        "tags": ["métricas", "evaluación"],
        "replies": [
            {"author": "Andrea Sánchez", "body": "¿Cómo miden horas invertidas? Es la métrica más importante y la que más se ignora."},
        ],
    },
    {
        "category": "general",
        "kind": "experiencia",
        "featured": True,
        "title": "Un año trabajando desde el burnout: lo que aprendí",
        "body": "Sostener un colectivo cultural desde el burnout es común y casi tabú. Este año paré, delegué y reestructuré. Comparto por si alguien está pasando por algo similar y sirve. Lo más difícil no fue delegar tareas — fue delegar decisiones.",
        "author": "Isabel Ramírez",
        "tags": ["salud mental", "sostenibilidad personal"],
        "replies": [
            {"author": "Luz Marina Cabrera", "body": "Gracias por hablar de esto. La cultura del 'esfuerzo infinito' en el sector cultural nos está costando muchísimo."},
            {"author": "Colectivo Ruido Blanco", "body": "Nosotros lo estamos viviendo. ¿Cómo estructuraste la delegación de decisiones? Es donde nos atascamos."},
        ],
    },
]
