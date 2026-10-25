"""
Taxonomy, decision rules, knowledge seed and plan templates for cultural sector.
All strings in Spanish.
"""

GOAL_CATALOG = [
    {
        "key": "vender_entradas",
        "title": "Vender más entradas",
        "description": "Aumentar la venta de entradas para tus funciones, eventos o conciertos.",
        "icon": "Ticket",
    },
    {
        "key": "financiamiento",
        "title": "Conseguir financiamiento",
        "description": "Encontrar fondos, becas, convocatorias o inversores para tu proyecto.",
        "icon": "Coins",
    },
    {
        "key": "sostenibilidad",
        "title": "Sostenibilidad del proyecto",
        "description": "Construir un modelo económico y organizacional viable a mediano plazo.",
        "icon": "Plant",
    },
    {
        "key": "publicos",
        "title": "Ampliar tus públicos",
        "description": "Desarrollar audiencias fieles y expandir tu alcance comunitario.",
        "icon": "UsersThree",
    },
    {
        "key": "organizacion_interna",
        "title": "Fortalecer la organización interna",
        "description": "Mejorar procesos, roles, planeación y toma de decisiones.",
        "icon": "TreeStructure",
    },
    {
        "key": "espacio_cultural",
        "title": "Abrir o consolidar un espacio cultural",
        "description": "Planear, lanzar o estabilizar un espacio físico independiente.",
        "icon": "Storefront",
    },
]


def _q(qid, text, hint=""):
    return {"id": qid, "text": text, "hint": hint}


DIAGNOSTIC_QUESTIONS = {
    "vender_entradas": [
        _q("evento", "Cuéntame brevemente sobre el evento o función en el que quieres vender más entradas.", "Formato, duración, precio y aforo."),
        _q("resultado_actual", "¿Cuál ha sido la venta típica hasta ahora? ¿Qué porcentaje del aforo estás llenando?"),
        _q("canales", "¿Por qué canales estás promocionando actualmente? ¿Cuál te ha dado más resultados?"),
        _q("publico", "¿Quién es tu público objetivo y qué tan bien lo conoces?"),
        _q("plazo", "¿Cuánto tiempo tienes hasta la próxima presentación?"),
        _q("obstaculo", "¿Cuál sientes que es el principal obstáculo para vender más entradas?"),
    ],
    "financiamiento": [
        _q("monto", "¿Qué monto aproximado necesitas conseguir y para qué se destinará?"),
        _q("plazo", "¿En qué plazo necesitas los fondos?"),
        _q("historial", "¿Has postulado antes a convocatorias, becas o fondos? Cuéntame la experiencia."),
        _q("documentos", "¿Tienes formalización (cuit/rut/nit), presupuesto detallado y proyecto escrito?"),
        _q("aliados", "¿Cuentas con aliados, mentores o cartas de apoyo institucional?"),
        _q("modelo_ingresos", "¿Tu proyecto ya genera algún ingreso propio? ¿De qué fuentes?"),
    ],
    "sostenibilidad": [
        _q("ingresos_actuales", "¿De dónde vienen actualmente los ingresos del proyecto? ¿Cuáles son las fuentes principales?"),
        _q("gastos_fijos", "¿Cuáles son tus gastos fijos mensuales aproximados?"),
        _q("dependencia", "¿Qué porcentaje de tus ingresos depende de una sola fuente (una beca, un cliente, un canal)?"),
        _q("equipo", "¿Tienes equipo, colaboradores o trabajas en solitario? ¿Cómo remuneras el trabajo?"),
        _q("horizonte", "¿A cuántos meses hacia adelante tienes visibilidad financiera clara?"),
        _q("prioridad_riesgo", "¿Qué te quita el sueño hoy respecto a la viabilidad del proyecto?"),
    ],
    "publicos": [
        _q("publico_actual", "¿Cómo describirías al público que hoy sí llega a tu proyecto?"),
        _q("publico_deseado", "¿A qué otros públicos te gustaría llegar y por qué?"),
        _q("canales", "¿Qué canales usas para comunicarte con tu audiencia? ¿Con qué frecuencia?"),
        _q("base_datos", "¿Tienes una base de datos o mailing list propia? ¿De qué tamaño?"),
        _q("retencion", "¿Vuelven las personas que ya asistieron a algo tuyo? ¿Cómo lo mides?"),
    ],
    "organizacion_interna": [
        _q("equipo", "¿Cuántas personas participan del proyecto y con qué roles?"),
        _q("decisiones", "¿Cómo se toman las decisiones actualmente?"),
        _q("procesos", "¿Qué procesos internos sientes que están más desordenados hoy?"),
        _q("planeacion", "¿Tienes un plan de trabajo trimestral o anual? ¿Se cumple?"),
        _q("conflictos", "¿Hay tensiones recurrentes o cuellos de botella entre las personas del equipo?"),
    ],
    "espacio_cultural": [
        _q("etapa", "¿En qué etapa estás: idea, búsqueda de local, apertura reciente o operación consolidada?"),
        _q("ubicacion", "¿Dónde piensas ubicarlo o dónde está ubicado? ¿Por qué esa zona?"),
        _q("modelo", "¿Cuál es el modelo del espacio: sala, galería, centro cultural, café-cultural, coworking artístico?"),
        _q("ingresos", "¿Cómo planeas o generas ingresos: taquilla, alquiler, bar, membresías, otras?"),
        _q("permisos", "¿Tienes claridad sobre permisos, uso de suelo y aspectos legales?"),
        _q("equipo", "¿Con qué equipo humano cuentas para operarlo?"),
    ],
}


DECISION_RULES = {
    "vender_entradas": [
        {
            "when": {"canales": ["instagram", "solo instagram", "redes"], "publico": ["no", "poco", "no lo conozco"]},
            "cause_title": "Comunicación monocanal sin segmentación",
            "cause_detail": "Depender de un único canal y no conocer a la audiencia limita el alcance y la conversión.",
            "priorities": ["Diversificar canales de comunicación", "Definir perfil de público objetivo"],
        },
        {
            "when": {"resultado_actual": ["30", "40", "50", "menos", "vacío", "bajo"]},
            "cause_title": "Baja tasa de conversión histórica",
            "cause_detail": "Los llenos parciales suelen indicar problemas de precio percibido, timing o llamada a la acción.",
            "priorities": ["Revisar propuesta de valor y precio", "Reforzar comunicación en la última semana"],
        },
        {
            "when": {"plazo": ["semana", "días", "urgente", "poco"]},
            "cause_title": "Ventana de tiempo corta",
            "cause_detail": "Con menos de dos semanas conviene concentrarse en tácticas de conversión inmediata.",
            "priorities": ["Activar red cercana y voceros", "Ofertas 2x1 o descuentos por grupo"],
        },
    ],
    "financiamiento": [
        {
            "when": {"documentos": ["no", "informal", "no tengo"]},
            "cause_title": "Falta de formalización mínima",
            "cause_detail": "La mayoría de convocatorias exigen personería jurídica, RUT/CUIT o similar y documentos base.",
            "priorities": ["Formalizar figura jurídica o alianza fiscal", "Preparar presupuesto y proyecto base"],
        },
        {
            "when": {"historial": ["no", "nunca", "primera vez"]},
            "cause_title": "Sin experiencia previa en convocatorias",
            "cause_detail": "Postular por primera vez requiere una curva de aprendizaje que puede acelerarse con casos guía.",
            "priorities": ["Estudiar 3 postulaciones exitosas del sector", "Empezar por convocatorias locales pequeñas"],
        },
        {
            "when": {"aliados": ["no", "sin aliados", "solo"]},
            "cause_title": "Sin red de respaldo institucional",
            "cause_detail": "Cartas de apoyo y alianzas mejoran significativamente la evaluación de propuestas.",
            "priorities": ["Construir 2-3 alianzas estratégicas", "Solicitar cartas de aval formal"],
        },
    ],
    "sostenibilidad": [
        {
            "when": {"dependencia": ["100", "90", "80", "una sola", "beca", "un cliente"]},
            "cause_title": "Concentración excesiva de ingresos",
            "cause_detail": "Depender de una única fuente hace al proyecto muy vulnerable ante cualquier cambio.",
            "priorities": ["Diversificar en al menos 3 fuentes de ingreso", "Construir línea de servicios complementarios"],
        },
        {
            "when": {"horizonte": ["mes", "poco", "1", "2"]},
            "cause_title": "Visibilidad financiera muy corta",
            "cause_detail": "Menos de 3 meses de visibilidad indica que la operación es reactiva, no planificada.",
            "priorities": ["Construir flujo de caja a 6-12 meses", "Crear reserva mínima operativa"],
        },
        {
            "when": {"equipo": ["gratis", "no remunero", "voluntario", "no pago"]},
            "cause_title": "Trabajo no remunerado como base",
            "cause_detail": "La sostenibilidad real requiere valorizar el tiempo y establecer honorarios mínimos.",
            "priorities": ["Establecer honorarios mínimos por rol", "Incluir costos de personal en toda propuesta"],
        },
    ],
    "publicos": [
        {
            "when": {"base_datos": ["no", "sin", "no tengo"]},
            "cause_title": "Ausencia de base de datos propia",
            "cause_detail": "Sin base propia, dependes 100% de algoritmos de redes que puedes no controlar.",
            "priorities": ["Iniciar mailing list y captura activa", "Sistema simple de CRM cultural"],
        },
        {
            "when": {"retencion": ["no sé", "no mido", "no vuelven"]},
            "cause_title": "Retención invisible o baja",
            "cause_detail": "Sin métricas de retorno no puedes distinguir crecimiento real de rotación permanente.",
            "priorities": ["Medir asistencia recurrente", "Diseñar experiencia de bienvenida y retorno"],
        },
    ],
    "organizacion_interna": [
        {
            "when": {"decisiones": ["yo", "todo yo", "solo yo", "sin consultar"]},
            "cause_title": "Concentración de decisiones en una sola persona",
            "cause_detail": "Es común y agotador. Delegar es una habilidad estratégica, no operativa.",
            "priorities": ["Definir tres niveles de decisión con criterios claros", "Documentar acuerdos y procesos"],
        },
        {
            "when": {"planeacion": ["no", "no tengo", "no cumplo"]},
            "cause_title": "Ausencia de planeación estructurada",
            "cause_detail": "Trabajar sin plan trimestral genera dispersión y desgaste sin resultados acumulativos.",
            "priorities": ["Plan trimestral con objetivos claros", "Reunión semanal breve de seguimiento"],
        },
    ],
    "espacio_cultural": [
        {
            "when": {"permisos": ["no", "no sé", "sin"]},
            "cause_title": "Riesgo legal y de operación",
            "cause_detail": "Operar sin claridad de permisos puede llevar a clausura, multas o rescisión.",
            "priorities": ["Asesoría legal y de uso de suelo", "Trámites y licencias base"],
        },
        {
            "when": {"ingresos": ["solo taquilla", "solo", "una sola"]},
            "cause_title": "Modelo de ingresos monolítico",
            "cause_detail": "Un espacio cultural rara vez es viable con una única fuente de ingreso.",
            "priorities": ["Diseñar mix de ingresos (taquilla + alquiler + gastronomía + formación)"],
        },
    ],
}


def _task(title, detail, priority="media", due_in_days=14):
    return {"title": title, "detail": detail, "priority": priority, "due_in_days": due_in_days}


PLAN_TEMPLATES = {
    "vender_entradas": {
        "tasks": [
            _task("Definir el perfil claro del asistente ideal", "Redacta en 3 párrafos quién es, qué le importa, dónde vive online y qué precio le parece justo.", "alta", 3),
            _task("Diversificar la campaña de comunicación", "Añadir al menos 2 canales más al mix (mailing, prensa local, WhatsApp o alianzas).", "alta", 7),
            _task("Diseñar promociones para las últimas 72 horas", "Descuento grupal, entrada + consumo, o valor agregado exclusivo para el cierre.", "media", 10),
            _task("Activar red de voceros y venta boca a boca", "Contactar personalmente a 20 personas clave y darles un motivo específico para invitar a otras.", "alta", 5),
            _task("Medir conversión por canal y ajustar", "Definir un mini-tablero para saber cuántas entradas trae cada canal y qué contenido rinde.", "media", 21),
        ],
        "indicators": [
            {"name": "% ocupación de aforo", "target": "> 75%"},
            {"name": "Suscriptores nuevos al mailing", "target": "+50 por evento"},
            {"name": "Entradas por canal", "target": "≥ 3 canales activos"},
        ],
    },
    "financiamiento": {
        "tasks": [
            _task("Preparar carpeta base del proyecto", "Documento maestro de 8-12 páginas: contexto, objetivos, equipo, presupuesto, cronograma, indicadores.", "alta", 10),
            _task("Mapear 5 convocatorias afines", "Buscar becas, fondos y premios activos en tu territorio y disciplina, con fechas y requisitos.", "alta", 7),
            _task("Construir presupuesto realista", "Detallar rubros con precios de mercado; incluir honorarios propios y contingencia (10%).", "alta", 14),
            _task("Gestionar 2-3 cartas de apoyo institucional", "Identificar aliados naturales y solicitar cartas de aval formal para adjuntar en postulaciones.", "media", 21),
            _task("Postular a la primera convocatoria", "Adaptar la carpeta base a la convocatoria más viable y enviar antes del cierre.", "alta", 30),
        ],
        "indicators": [
            {"name": "Convocatorias identificadas", "target": "≥ 5"},
            {"name": "Postulaciones enviadas", "target": "≥ 2 en 60 días"},
            {"name": "Cartas de apoyo formalizadas", "target": "≥ 2"},
        ],
    },
    "sostenibilidad": {
        "tasks": [
            _task("Diagnosticar fuentes de ingreso actuales", "Listar todas las fuentes con % que aporta cada una. Detectar concentración.", "alta", 5),
            _task("Diseñar mix diversificado a 12 meses", "Definir 3-4 líneas de ingreso complementarias con proyección mensual.", "alta", 14),
            _task("Construir flujo de caja proyectado", "Excel simple con ingresos, gastos fijos y variables mes a mes.", "alta", 10),
            _task("Definir honorarios base propios", "Establecer valor hora y por proyecto, aplicable a todas las propuestas.", "media", 7),
            _task("Crear reserva operativa mínima", "Meta: 2 meses de gastos fijos como colchón antes de invertir en crecimiento.", "media", 90),
        ],
        "indicators": [
            {"name": "Nº de fuentes de ingreso activas", "target": "≥ 3"},
            {"name": "Meses de visibilidad financiera", "target": "≥ 6"},
            {"name": "% concentración de ingresos", "target": "< 50%"},
        ],
    },
    "publicos": {
        "tasks": [
            _task("Auditar tu base actual", "Cuenta seguidores reales, suscriptores de mailing y contactos activos por canal.", "alta", 7),
            _task("Crear mailing list propia", "Landing simple o formulario de captura con incentivo claro (guía, entrada, contenido).", "alta", 10),
            _task("Definir 2 nuevos segmentos de público", "Segmentos concretos con perfil, motivación y punto de encuentro potencial.", "media", 14),
            _task("Diseñar plan de contenidos mensual", "12 piezas al mes distribuidas en formatos que refuercen relación, no solo venta.", "media", 21),
            _task("Sistematizar retorno de asistentes", "Encuesta breve post-evento + invitación a próximo evento con beneficio.", "media", 30),
        ],
        "indicators": [
            {"name": "Suscriptores propios", "target": "+200 en 90 días"},
            {"name": "Tasa de asistencia recurrente", "target": "≥ 20%"},
            {"name": "Canales activos", "target": "≥ 3"},
        ],
    },
    "organizacion_interna": {
        "tasks": [
            _task("Mapear roles y responsabilidades reales", "Documento simple con cada persona, qué hace y qué decide.", "alta", 7),
            _task("Definir 3 niveles de decisión", "Individual, equipo pequeño y colectivo; criterio de qué va en cada nivel.", "alta", 14),
            _task("Instaurar reunión semanal breve", "30 minutos con agenda fija: pendientes, obstáculos, decisiones.", "alta", 3),
            _task("Plan trimestral con 3-5 objetivos", "Objetivos claros, indicadores y responsables. Revisión mensual.", "media", 21),
            _task("Documentar procesos críticos", "Escribir en un solo lugar los 5 procesos más recurrentes del proyecto.", "media", 30),
        ],
        "indicators": [
            {"name": "Reuniones semanales realizadas", "target": "≥ 90%"},
            {"name": "Objetivos trimestrales cumplidos", "target": "≥ 70%"},
            {"name": "Procesos documentados", "target": "≥ 5"},
        ],
    },
    "espacio_cultural": {
        "tasks": [
            _task("Diseñar modelo de negocio del espacio", "Canvas simple: propuesta, público, ingresos, alianzas, costos.", "alta", 14),
            _task("Verificar viabilidad legal y de uso de suelo", "Consultar normativa local y permisos requeridos con asesor experto.", "alta", 21),
            _task("Construir mix de ingresos", "Taquilla + alquiler de sala + formación + gastronomía + membresías (elegir 3-4).", "alta", 21),
            _task("Plan de programación de 6 meses", "Calendario con eventos propios, alianzas y espacios abiertos a terceros.", "media", 30),
            _task("Comunidad y comunicación de apertura", "Identidad, redes, mailing y evento inaugural con red aliada.", "media", 30),
        ],
        "indicators": [
            {"name": "Ocupación semanal del espacio", "target": "≥ 60%"},
            {"name": "Fuentes de ingreso operativas", "target": "≥ 3"},
            {"name": "Programación con 60 días de anticipación", "target": "Sí"},
        ],
    },
}


KNOWLEDGE_SEED = [
    {
        "id": "kb-001",
        "title": "Fundamentos de la venta de entradas en el sector cultural",
        "category": "marketing",
        "tags": ["marketing", "publicos"],
        "summary": "Principios clave para diseñar campañas de venta de entradas que respetan la naturaleza del proyecto.",
        "content": """La venta de entradas en el sector cultural funciona distinto a la venta de productos.\n\n**1. Antes de vender, define claridad.** Un evento cultural sin definición clara de audiencia difícilmente convierte, sin importar cuánta comunicación se haga. Antes de invertir en anuncios, invierte 4 horas en escribir quién es tu asistente ideal.\n\n**2. La curva de conversión cultural.** Aproximadamente el 40% de las entradas se venden en la última semana. Presupuesta comunicación y presión para ese periodo, no para el arranque.\n\n**3. Nunca dependas de un solo canal.** Instagram, mailing propio, prensa local, alianzas con espacios afines, WhatsApp con red cercana. Un evento que llena sostenidamente tiene al menos 3 canales activos.\n\n**4. Precio y percepción.** Si tu precio percibido es más bajo que el real, sube el precio. Si es más alto, ajusta el discurso, no el precio.\n\n**5. La red humana es la más barata.** 15 personas invitando personalmente a 5 personas cada una equivalen a un ads con 75 conversiones — sin costo.""",
    },
    {
        "id": "kb-002",
        "title": "Cómo diseñar un plan de financiamiento cultural",
        "category": "financiamiento",
        "tags": ["financiamiento", "formulacion"],
        "summary": "Guía práctica para armar tu primera estrategia de financiamiento desde cero.",
        "content": """El financiamiento cultural rara vez viene de una sola fuente. Piensa en portafolio.\n\n**Estructura recomendada:**\n- 30-40% ingresos propios (taquilla, servicios, formación)\n- 30% convocatorias públicas y becas\n- 20% alianzas y patrocinios\n- 10% donaciones y crowdfunding\n\n**Preparación mínima obligatoria:**\n1. Personería jurídica o alianza fiscal con una organización\n2. Presupuesto detallado con precios de mercado\n3. Documento base del proyecto (contexto, objetivos, equipo, cronograma)\n4. Cartas de apoyo formal de al menos 2 aliados\n\n**Error común:** Postular al fondo grande sin haber postulado antes a fondos pequeños. Empieza local, gana track record, sube en escala.""",
    },
    {
        "id": "kb-003",
        "title": "Sostenibilidad económica: modelo de portafolio",
        "category": "sostenibilidad",
        "tags": ["sostenibilidad", "presupuestos"],
        "summary": "Por qué diversificar ingresos es más importante que maximizar cualquier fuente.",
        "content": """La sostenibilidad no es maximizar ingresos: es distribuir riesgo.\n\n**Regla del 30-30-30:** Ninguna fuente debe representar más del 30% de tus ingresos totales sostenidamente. Si lo hace, es una dependencia riesgosa.\n\n**Reserva operativa:** Antes de invertir en crecimiento, apunta a tener 2 meses de gastos fijos guardados.\n\n**Trabajo no pago = insostenibilidad diferida.** Si tu equipo trabaja gratis, el proyecto no es sostenible: es una subvención personal que no aparece en tus números pero que te desangra en energía.""",
    },
    {
        "id": "kb-004",
        "title": "Formulación de proyectos culturales",
        "category": "formulacion",
        "tags": ["formulacion", "financiamiento"],
        "summary": "Estructura estándar para presentar proyectos a convocatorias e instituciones.",
        "content": """**Estructura estándar de un proyecto cultural:**\n\n1. **Título** (breve, evocador, memorable)\n2. **Resumen ejecutivo** (media página)\n3. **Contexto y justificación** (¿por qué este proyecto, aquí, ahora?)\n4. **Objetivos** (1 general + 3-4 específicos)\n5. **Metodología** (cómo lo haremos)\n6. **Cronograma** (con fases y entregables)\n7. **Equipo** (roles y perfiles)\n8. **Presupuesto** (con contrapartidas)\n9. **Indicadores** (cómo se medirá el impacto)\n10. **Anexos** (cv, cartas, portafolio)""",
    },
    {
        "id": "kb-005",
        "title": "Desarrollo de públicos: más allá de los seguidores",
        "category": "publicos",
        "tags": ["publicos", "marketing"],
        "summary": "Cómo construir una audiencia fiel y no depender de algoritmos de redes.",
        "content": """Un seguidor no es un público. Un público:\n- Vuelve\n- Paga o dona\n- Habla del proyecto\n- Trae a otras personas\n\n**La base propia es tu activo más importante.** Un mailing con 500 suscriptores que abren el 40% de tus emails vale más que 20.000 seguidores en redes.\n\n**Retención > adquisición.** Es 5 veces más barato que una persona vuelva que conseguir una nueva.\n\n**Métricas mínimas:** tasa de retorno post-evento, apertura de mailing, boca a boca (cuánta gente llega recomendada).""",
    },
    {
        "id": "kb-006",
        "title": "Estructura organizacional para proyectos culturales pequeños",
        "category": "gestion",
        "tags": ["gestion", "organizacion"],
        "summary": "Cómo organizar equipos pequeños sin caer en burocracia ni en el caos.",
        "content": """**Tres niveles de decisión, siempre:**\n- Individual (lo puede decidir cada persona en su ámbito)\n- Coordinación (2-3 personas involucradas)\n- Colectivo (implica visión, presupuesto o riesgo)\n\n**Reuniones mínimas viables:**\n- Semanal 30 min: pendientes y obstáculos\n- Mensual 90 min: revisión de plan e indicadores\n- Trimestral: retrospectiva y siguiente ciclo\n\nDocumentar acuerdos no es burocracia, es prevención de conflictos.""",
    },
    {
        "id": "kb-007",
        "title": "Presupuestos honestos para proyectos culturales",
        "category": "presupuestos",
        "tags": ["presupuestos", "sostenibilidad"],
        "summary": "Cómo presupuestar sin invisibilizar el trabajo propio.",
        "content": """**Regla número 1:** Incluye siempre tu propio honorario. Si el proyecto no soporta pagarte, no es un proyecto viable — es una subvención personal.\n\n**Rubros mínimos:**\n- Honorarios (todos los roles, incluidos los propios)\n- Producción\n- Comunicación y prensa\n- Logística\n- Administración (10-15% del total)\n- Contingencia (10%)\n\n**Presupuesto vs. Flujo de caja:** El presupuesto dice cuánto cuesta; el flujo dice cuándo entra y sale el dinero. Necesitas ambos.""",
    },
    {
        "id": "kb-008",
        "title": "Indicadores culturales que sí importan",
        "category": "indicadores",
        "tags": ["indicadores", "gestion"],
        "summary": "Métricas que reflejan salud real del proyecto, no vanidad.",
        "content": """**Indicadores de vanidad (evitar como métrica única):** seguidores, likes, alcance.\n\n**Indicadores de salud real:**\n- Tasa de retorno de público\n- % ocupación de aforo\n- Ingresos por fuente y su evolución\n- Suscriptores propios activos\n- Reservas económicas\n- Horas dedicadas por persona vs. resultados\n\nElige 3-5 y mídelos con religiosidad. Más de 5 se vuelve ruido.""",
    },
    {
        "id": "kb-009",
        "title": "Aspectos legales básicos del sector cultural",
        "category": "legal",
        "tags": ["legal", "gestion"],
        "summary": "Formalización, derechos de autor y contratos básicos.",
        "content": """**Formalización:** Antes de cualquier ingreso significativo, define figura jurídica (autónomo, asociación, sociedad, alianza fiscal).\n\n**Derechos de autor:** Todo lo que creas está protegido desde su creación; formalízalo con registros cuando sea relevante.\n\n**Contratos mínimos:**\n- Con equipo (honorarios, alcance, plazos)\n- Con artistas invitados\n- Con espacios (alquiler, coproducción)\n- Con patrocinadores (contrapartidas)\n\nUn buen contrato no es hostilidad: es respeto.""",
    },
    {
        "id": "kb-010",
        "title": "Casos de estudio: proyectos que lograron sostenibilidad",
        "category": "casos",
        "tags": ["sostenibilidad", "gestion", "casos"],
        "summary": "Aprendizajes de proyectos culturales pequeños que alcanzaron viabilidad.",
        "content": """**Caso A — Sala de teatro independiente (60 butacas)**\nSostenibilidad lograda con mix: 45% taquilla, 20% alquiler a compañías externas, 20% formación (talleres), 10% membresías, 5% donaciones. Punto de quiebre: dejar de aceptar coproducciones que consumían más de lo que ingresaban.\n\n**Caso B — Colectivo de artes visuales**\nDesde postulaciones exclusivas a mix con: 40% ventas de obra, 30% clases y clínicas, 20% comisionados, 10% becas. Clave: portafolio digital serio y base de coleccionistas propia.\n\n**Caso C — Festival territorial**\nPasó de depender 90% de un fondo público a mix con patrocinios locales, alianzas con universidades y taquilla en secciones específicas. Aprendizaje: postular al mismo fondo tres años consecutivos generó relación, no dependencia sana.""",
    },
]
