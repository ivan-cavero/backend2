

# **Especificación Técnica para la Extensión de Visual Studio Code de Seguimiento de Actividad del Desarrollador**

## **1\. Resumen Ejecutivo**

### **1.1. Propósito y Funcionalidad Principal de la Extensión**

La extensión de seguimiento de actividad del desarrollador está diseñada para ofrecer una visión exhaustiva del tiempo que un desarrollador dedica dentro del entorno de desarrollo integrado (IDE). Su función principal es capturar "pulsos" detallados de actividad, abarcando el tiempo dedicado a la codificación, la depuración, la lectura de código o documentación, y los períodos de inactividad. Estos datos granulares son fundamentales para comprender los patrones de trabajo y optimizar los flujos de desarrollo.

Los pulsos de actividad recopilados se agregan y se almacenan en una base de datos ClickHouse de alto rendimiento. Esta elección tecnológica es estratégica, ya que ClickHouse está optimizada para el análisis de grandes volúmenes de datos de series temporales, lo que la convierte en una base sólida para futuras implementaciones. La información almacenada servirá como base para la creación de paneles de control analíticos que visualizarán la productividad del desarrollador y el compromiso con el proyecto a lo largo del tiempo. Aunque la implementación inicial se centra en Visual Studio Code, la visión a largo plazo de la extensión es ser compatible con múltiples IDEs, lo que requiere un diseño modular y adaptable desde el principio.

### **1.2. Aspectos Arquitectónicos Destacados y Objetivos de Rendimiento**

La arquitectura de la extensión se ha concebido con la premisa fundamental de minimizar cualquier impacto en el rendimiento del IDE. Para lograr esto, se emplean estrategias avanzadas de manejo de eventos, como el *debouncing* y el *throttling*, particularmente para eventos de alta frecuencia que podrían sobrecargar el sistema si se procesaran individualmente.1 Estas técnicas son esenciales para garantizar que la extensión opere de manera fluida sin degradar la capacidad de respuesta del editor.

La gestión de datos se basa en un modelo de búfer local y sincronización por lotes. Los datos de actividad se almacenan temporalmente en el sistema de archivos local del IDE y se envían a la base de datos ClickHouse de forma infrecuente y agrupada, lo que optimiza la eficiencia de la red y reduce la carga en la base de datos. Este enfoque de sincronización por lotes, combinado con mecanismos de reintento robustos, asegura la integridad de los datos incluso en caso de fallos de conexión. Además, la seguridad en el manejo de datos sensibles, como las claves API, es una consideración primordial en el diseño, utilizando las capacidades de almacenamiento seguro que ofrece el IDE.3

## **2\. Visión General del Sistema y Flujo de Datos**

Esta sección detalla los componentes internos de la extensión, cómo fluyen los datos desde la captura hasta el almacenamiento, y la visión general para la compatibilidad con múltiples IDEs.

### **2.1. Componentes e Interacciones de la Extensión**

La extensión de VS Code opera dentro de un proceso dedicado conocido como "Extension Host".2 Este proceso se ejecuta de forma aislada del proceso principal de la interfaz de usuario (UI) del IDE, una característica fundamental de la arquitectura de VS Code diseñada para mantener la estabilidad y el rendimiento del editor. Esta separación garantiza que cualquier código de extensión que funcione mal o que consuma muchos recursos no bloquee ni provoque el fallo de la interfaz principal del IDE.

Los componentes clave de la extensión incluyen:

* **Oyentes de Eventos (Event Listeners):** Responsables de suscribirse a varios eventos de la API de VS Code, como cambios en documentos de texto 4, el estado del depurador 5, o el enfoque de la ventana.6 Estos oyentes son el punto de entrada para la captura de actividad.  
* **Clasificador de Actividad (Activity Classifier):** Interpreta los eventos brutos capturados para determinar el estado actual de la actividad del desarrollador (codificación, depuración, inactividad, etc.). Este componente aplica la lógica de negocio para categorizar la interacción del usuario.  
* **Generador de Pulsos (Pulse Generator):** Agrega la actividad clasificada en "pulsos" discretos, cada uno con una duración y metadatos asociados. Este componente es crucial para transformar eventos de alta frecuencia en unidades de datos significativas y manejables.  
* **Administrador de Almacenamiento Local (Local Storage Manager):** Almacena temporalmente los pulsos generados en el almacenamiento persistente del IDE para evitar la pérdida de datos en caso de cierres inesperados del IDE. También gestiona de forma segura la clave API proporcionada por el usuario.3  
* **Administrador de Sincronización (Synchronization Manager):** Se encarga de la transferencia periódica de datos por lotes a la base de datos ClickHouse remota. Implementa una lógica de reintento para las sincronizaciones fallidas, asegurando que los datos no se pierdan y se intenten enviar de nuevo.  
* **Controlador de Barra de Estado (Status Bar Controller):** Actualiza la barra de estado de VS Code con métricas de actividad en tiempo real, como el tiempo de codificación acumulado.8 Este componente gestiona la visualización de información clave para el usuario.

### **2.2. Ciclo de Vida de los Datos: de la Captura al Panel de Control**

El flujo de datos en la extensión sigue un ciclo de vida bien definido para garantizar la eficiencia y la fiabilidad:

* **Captura:** Los eventos brutos del IDE son capturados por los oyentes de eventos de la extensión. Estos eventos son la fuente primaria de información sobre la interacción del desarrollador.  
* **Clasificación y Agregación:** Los eventos capturados se procesan y clasifican en tipos de actividad específicos (por ejemplo, codificación, depuración). Luego, se agregan en "pulsos" que representan bloques de actividad con una duración definida, aplicando umbrales de tiempo para consolidar la actividad granular. Estos pulsos se mantienen en un búfer en memoria.  
* **Persistencia Local:** Para proteger los datos contra pérdidas debido a cierres inesperados del IDE o fallos del sistema, el búfer en memoria se persiste periódicamente en el almacenamiento local del IDE. Esto crea un punto de recuperación para los datos antes de su sincronización remota.  
* **Sincronización:** Cada 30 minutos, los pulsos almacenados en el búfer local se envían en un lote a la base de datos ClickHouse. Esta estrategia de envío por lotes reduce significativamente la sobrecarga de red y la frecuencia de operaciones de escritura en la base de datos. Tras una sincronización exitosa, los pulsos correspondientes se eliminan del almacenamiento local. Si la sincronización falla, los pulsos permanecen en el almacenamiento local para ser incluidos en el siguiente intento de sincronización, garantizando la integridad de los datos.  
* **Almacenamiento (ClickHouse):** Los pulsos se ingieren en la tabla pulses de ClickHouse, cuyo esquema está optimizado para el almacenamiento y la consulta eficiente de datos de series temporales.  
* **Análisis y Visualización (Futuro):** Una aplicación frontend separada, no parte de la extensión, consultará la base de datos ClickHouse para generar paneles de control. Estos paneles proporcionarán visualizaciones e informes detallados sobre la actividad del desarrollador, como el tiempo de codificación diario, los proyectos más trabajados, o el tiempo dedicado a la depuración.

### **2.3. Adaptabilidad Multi-IDE**

Aunque la implementación inicial de la extensión se centra en Visual Studio Code, el diseño fundamental de la lógica de seguimiento de actividad y el modelo de datos se ha concebido para ser agnóstico al IDE. Esto significa que los principios centrales de detección de actividad y estructuración de pulsos son independientes de las particularidades de un IDE específico.

La expansión futura a otros IDEs, como Cursor, Windsurf y Visual Studio, implicará la creación de una "capa de adaptador" específica para cada IDE. Esta capa se encargará de traducir los eventos nativos de la API de cada IDE a un formato de pulso común que la lógica central de la extensión pueda procesar. Este diseño modular es crucial, ya que minimiza la necesidad de refactorizar la lógica de seguimiento principal al añadir soporte para nuevas plataformas, facilitando una expansión eficiente y escalable.

## **3\. Interacción y Configuración del Usuario**

Esta sección describe el proceso de configuración inicial, centrándose en la gestión de la clave API y cómo la extensión proporciona retroalimentación en tiempo real al usuario a través de la barra de estado.

### **3.1. Configuración Inicial: Adquisición y Validación de la Clave API**

La extensión está diseñada para ser funcional solo después de que el usuario haya proporcionado una clave API válida, un requisito crítico para la autenticación y el envío de datos.

* **3.1.1. Mecanismo de Entrada de la Clave API**  
  * Inmediatamente después de la instalación inicial de la extensión, o cada vez que el IDE se abra y se detecte que no hay una clave API configurada, la extensión solicitará al usuario que introduzca su clave API. Esta interacción se realizará mediante el método vscode.window.showInputBox().9 Este método presenta un panel de entrada que permite al usuario introducir texto.  
  * El mensaje de solicitud será explícito, indicando claramente que se espera una cadena hexadecimal de 32 o más caracteres, tal como se muestra en la imagen proporcionada por el usuario.  
  * Es fundamental que el cuadro de entrada incluya lógica de validación. Esta validación inicial, que puede verificar el formato hexadecimal y la longitud mínima, se ejecutará antes de que la clave API se intente almacenar o utilizar, proporcionando retroalimentación inmediata al usuario sobre la validez del formato.10  
* **3.1.2. Almacenamiento Seguro de la Clave API**  
  * La clave API es una credencial sensible y, por lo tanto, su almacenamiento debe ser intrínsecamente seguro. VS Code ofrece la API context.secrets específicamente para este propósito.3 Esta API aprovecha los mecanismos de almacenamiento seguro específicos de la plataforma subyacente (por ejemplo, la API  
    safeStorage de Electron en entornos de escritorio o una implementación de Cifrado de Doble Clave (DKE) para la versión web de VS Code). Esto garantiza que la clave se almacene de forma cifrada y, lo que es crucial, que no se sincronice entre diferentes máquinas, protegiendo la privacidad y la seguridad del usuario.  
  * La función activate de la extensión, que se ejecuta cuando se dispara un evento de activación, será el lugar apropiado para recuperar la clave API almacenada de forma segura al inicio de la extensión.6  
* **3.1.3. Retroalimentación al Usuario a Través de la Barra de Estado**  
  * Mientras no se haya proporcionado o validado una clave API, la extensión mostrará un mensaje persistente en la barra de estado de VS Code. Este mensaje indicará claramente que la clave API está ausente y que el seguimiento de datos está inactivo.  
  * Para crear y gestionar este elemento en la barra de estado, se utilizará el método vscode.window.createStatusBarItem().8 La propiedad  
    text de este elemento mostrará el mensaje de advertencia, y el método show() lo hará visible. El elemento de la barra de estado puede alinearse a la izquierda o a la derecha y se le puede asignar una prioridad para controlar su posición.8  
  * Una vez que la clave API se introduce y valida con éxito, este elemento de la barra de estado se actualizará o se reemplazará por la visualización del tiempo de actividad, indicando que el seguimiento ha comenzado.

### **3.2. Visualización de Actividad en Tiempo Real en la Barra de Estado**

Una vez configurada la clave API, la barra de estado de VS Code se transformará para mostrar el tiempo acumulado de "codificación" para el día actual. El formato de visualización se ajustará dinámicamente para proporcionar la información más relevante y legible: inicialmente en segundos, luego en minutos y segundos, y finalmente en horas y minutos a medida que la duración aumente.

Para asegurar que esta actualización de la interfaz de usuario sea eficiente y no degrade el rendimiento del IDE, se implementará un mecanismo de control de frecuencia. El requisito del usuario enfatiza la importancia de la eficiencia, indicando que no se deben actualizar la UI ni sincronizar el almacenamiento local en cada iteración debido a la sobrecarga que esto implicaría. Actualizar la barra de estado con mucha frecuencia, por ejemplo, cada segundo, podría generar un consumo innecesario de recursos y provocar un redibujado excesivo de la interfaz, afectando la fluidez del IDE. Dado que la barra de estado tiene como objetivo proporcionar retroalimentación al usuario y no una precisión en tiempo real a nivel de milisegundos, una ligera demora en la actualización es aceptable. Por lo tanto, se aplicará un mecanismo de *throttling* para las actualizaciones de la barra de estado. En lugar de actualizarla en cada cambio incremental, se realizará una actualización a intervalos fijos y menos frecuentes, como cada 5 o 10 segundos. Esto garantiza que la retroalimentación visual sea suficientemente oportuna sin imponer una carga de rendimiento innecesaria en el sistema.

## **4\. Lógica Detallada de Seguimiento de Actividad**

Esta sección define los diversos estados de actividad del desarrollador, los puntos de datos específicos capturados y las reglas para la agregación de tiempo, incluyendo el manejo de actividades simultáneas y múltiples instancias del IDE.

### **4.1. Definición de los Estados de Actividad del Desarrollador**

La extensión clasificará el tiempo del desarrollador en varios estados distintos para proporcionar una visión granular de la actividad.

* **4.1.1. Coding (Escritura, Navegación entre Pestañas/Archivos)**  
  * La actividad de codificación se detectará principalmente a través del evento vscode.workspace.onDidChangeTextDocument.3 Este evento se dispara cada vez que el contenido de un documento de texto cambia, lo que permite capturar la actividad de escritura.  
  * Además, se monitorizará el evento vscode.window.onDidChangeTextEditorSelection 4, que se activa con el movimiento del cursor o los cambios en la selección de texto. Esto es crucial para contabilizar el tiempo que un desarrollador pasa navegando dentro de un archivo sin modificar su contenido directamente.  
  * Los cambios entre pestañas o archivos se capturarán mediante el evento vscode.window.onDidChangeActiveTextEditor 3, que indica una modificación en el editor activo. La combinación de estos eventos permitirá una detección robusta de la actividad de codificación, incluso cuando no se esté tecleando activamente.  
* **4.1.2. Debugging**  
  * El tiempo de depuración se rastreará directamente utilizando los eventos vscode.debug.onDidStartDebugSession y vscode.debug.onDidTerminateDebugSession.5 Estos eventos proporcionan puntos de inicio y fin claros para las sesiones de depuración, permitiendo una medición precisa.  
  * La clave de contexto debugState (inDebugMode) también se puede aprovechar para verificar si una sesión de depuración está activa en un momento dado.21  
  * **Actividad Simultánea:** Es común que un desarrollador modifique código mientras una sesión de depuración está en pausa o activa. En tales escenarios, tanto el tiempo de coding como el de debugging se contabilizarán concurrentemente. El generador de pulsos registrará ambos tipos de actividad para el mismo intervalo de tiempo, permitiendo un análisis posterior que refleje la superposición de tareas.  
* **4.1.3. Reading**  
  * La detección precisa del tiempo de "lectura" presenta un desafío inherente debido a la naturaleza pasiva de esta actividad. A diferencia de la escritura o la depuración, no existe un evento de API explícito en VS Code que indique directamente que un usuario está leyendo. Un desarrollador puede estar leyendo código, documentación o la salida de un terminal sin generar ningún evento de interacción activa. Si un usuario simplemente visualiza un documento, los eventos onDidChangeTextDocument y onDidChangeTextEditorSelection no se dispararán. El evento onDidChangeActiveTextEditor podría activarse al abrir un archivo, pero no durante una visualización prolongada.  
  * Esto implica que la "lectura" no puede detectarse de manera fiable solo a través de eventos de interacción activa. Una solución inicial podría inferirse heurísticamente: por ejemplo, si un editor de texto permanece activo y con foco (editorFocus o editorTextFocus de 21) durante un período prolongado sin que se detecte actividad de  
    coding o debugging, podría clasificarse como reading. Sin embargo, este enfoque es propenso a falsos positivos (por ejemplo, el usuario se ha alejado del teclado pero el IDE sigue enfocado). Una solución más robusta podría implicar que el usuario inicie manualmente una "sesión de lectura" a través de un comando, o integrar futuras capacidades de IA que puedan analizar el consumo de contenido. El modelo actual debe reconocer esta ambigüedad y, si se opta por una heurística, documentar sus limitaciones.  
* **4.1.4. Using AI (Alcance Futuro)**  
  * El seguimiento de la actividad de "uso de IA" se implementará en una fase futura y se centrará en detectar las interacciones con funciones impulsadas por inteligencia artificial, como GitHub Copilot.22  
  * Para el seguimiento futuro del "uso de IA", la extensión deberá investigar las APIs del espacio de nombres vscode.lm 6, que están diseñadas para interactuar con modelos de lenguaje. Alternativamente, se podría monitorizar comandos específicos invocados por las extensiones de IA (por ejemplo,  
    github.copilot.generateCommitMessage 23). Esto requerirá una investigación más profunda sobre cómo las extensiones de IA específicas exponen su actividad o si una API genérica de  
    lm puede capturarla de manera efectiva.  
* **4.1.5. Idle (IDE Enfocado, Sin Actividad)**  
  * El estado idle se activará cuando la ventana del IDE tenga el foco (vscode.window.state.focused del evento onDidChangeWindowState 6, o las claves de contexto  
    editorFocus/textInputFocus 21), pero no se detecte actividad de  
    coding, debugging o reading durante un período corto y definido (por ejemplo, menos de 2 minutos).  
  * Esto requiere un temporizador que se reinicie con cualquier evento de actividad detectado.  
* **4.1.6. Inactive (IDE Sin Foco, Cerrado, Sistema Suspendido)**  
  * El estado inactive se alcanzará si no se detecta ninguna actividad (incluida la idle) durante un período más prolongado (por ejemplo, 2 minutos, según lo especificado por el usuario). Este temporizador es crucial para diferenciar la inactividad temporal de una ausencia prolongada.  
  * Eventos como vscode.window.onDidChangeWindowState 6 pueden indicar la pérdida de foco de la ventana o un cambio en el estado de actividad, señalando el inicio de un período de inactividad.  
  * Cuando el IDE se cierra o el sistema se suspende/apaga, se invocará la función deactivate de la extensión.6 Esta función permitirá una captura final del estado y marcará el final de la sesión activa. La extensión debe asegurarse de que no se generen pulsos durante estos períodos de verdadera inactividad para evitar datos irrelevantes o engañosos.

### **4.2. Puntos de Datos Capturados por Pulso**

Cada "pulso" será un registro de un tipo de actividad específico durante una breve duración, enriquecido con metadatos contextuales.

* **4.2.1. Métricas de Tiempo**  
  * timestamp: La hora exacta en que se registró el pulso (por ejemplo, el inicio del intervalo de actividad).  
  * duration\_seconds: La duración de la actividad en segundos.  
* **4.2.2. Métricas de Código (line\_additions, line\_deletions)**  
  * El usuario solicita explícitamente el seguimiento de line\_additions y line\_deletions. El evento vscode.workspace.onDidChangeTextDocument proporciona un objeto TextDocumentChangeEvent.3 Este evento incluye propiedades como  
    range, rangeLength y text 14, que describen qué contenido fue reemplazado por qué nuevo texto. Sin embargo, no proporciona directamente un recuento de líneas añadidas o eliminadas.  
  * Para calcular line\_additions y line\_deletions, la extensión deberá implementar una lógica de *diffing* personalizada. Esto implica comparar el contenido *anterior* del range afectado con el nuevo texto proporcionado por el evento. Mantener una instantánea del contenido del documento o de porciones relevantes de él será necesario. Un algoritmo de *diffing* (por ejemplo, una comparación línea por línea simple o un algoritmo más sofisticado como Myers diff) sería indispensable para determinar los cambios netos de líneas dentro del range afectado. Esta es una tarea computacionalmente intensiva que deberá optimizarse (por ejemplo, realizando el *diffing* solo en las líneas relevantes, o aplicando *debouncing* al evento para este cálculo específico) para evitar la degradación del rendimiento. Esta es una consideración de implementación crítica que va más allá del simple consumo de la API.  
* **4.2.3. Métricas Contextuales (Proyecto, Rama de Git, Posición del Cursor, Tipo de IDE)**  
  * project\_name: Se obtendrá del nombre de la primera carpeta del espacio de trabajo: vscode.workspace.workspaceFolders.name.14 En un espacio de trabajo con múltiples raíces, se utilizará el nombre de la carpeta que contiene el editor activo. Si no hay ningún espacio de trabajo abierto, se puede utilizar un valor predeterminado como "No Project".  
  * git\_branch: El seguimiento del nombre de la rama de Git es una métrica valiosa. VS Code tiene una fuerte integración con Git y muestra la rama actual en la barra de estado.23 Esto indica que la información está disponible para el IDE. Sin embargo, la documentación proporcionada 23 señala explícitamente que una API directa como  
    vscode.scm.SourceControl.repository.head.name no está "disponible" en la API pública documentada. El espacio de nombres vscode.scm existe y permite crear proveedores de control de código fuente personalizados 28, pero no parece exponer directamente la rama actual de la extensión Git incorporada. Para obtener el nombre de la rama de Git actual, la extensión probablemente necesitará ejecutar un comando de Git externamente (por ejemplo,  
    git rev-parse \--abbrev-ref HEAD) a través del módulo child\_process de Node.js. Esto introduce una dependencia externa (el CLI de Git debe estar instalado y en el PATH) y requiere un manejo cuidadoso de errores y una gestión del rendimiento de la ejecución de comandos. Alternativamente, podría ser posible interactuar con la API *interna* de la extensión Git si está expuesta, pero esto generalmente se desaconseja debido a la posible inestabilidad entre versiones de VS Code. Este es un obstáculo técnico importante que requiere una solución robusta.  
  * cursor\_position: El desplazamiento absoluto del carácter del cursor desde el principio del documento.29 Esto se puede obtener de  
    vscode.window.activeTextEditor.selection.active 3 y luego convertirlo a un desplazamiento utilizando  
    document.offsetAt().3  
  * ide\_type: Identifica el tipo de IDE (por ejemplo, "VS Code"). Esto se puede derivar de vscode.env.appName.6 Este campo es crucial para la futura compatibilidad multi-IDE.  
  * ide\_version: La versión del IDE. Se puede obtener de vscode.version.  
  * os\_info: Detalles del sistema operativo (por ejemplo, os.platform(), os.release()).  
  * user\_id: Un identificador único para el desarrollador, probablemente derivado de la clave API o de un ID de usuario proporcionado durante la configuración.  
  * session\_id: Un identificador único para la sesión actual del IDE (desde la activación hasta la desactivación).

### **4.3. Reglas de Agregación de Tiempo**

* **4.3.1. Manejo de Actividad Simultánea**  
  * Cuando múltiples tipos de actividad ocurren concurrentemente (por ejemplo, coding mientras se está debugging), el sistema registrará pulsos para *cada* tipo de actividad activa durante ese intervalo de tiempo.  
  * Esto significa que un minuto dedicado a codificar mientras se depura se contabilizará como un minuto de "codificación" y un minuto de "depuración" en los datos de pulso brutos. Los paneles de control posteriores podrán agregar o filtrar esta información según sea necesario para proporcionar diferentes perspectivas sobre la actividad.  
* **4.3.2. Consolidación de Tiempo en Instancias Multi-IDE**  
  * El usuario ha expresado la necesidad de consolidar el tiempo de actividad entre múltiples instancias del mismo tipo de IDE, afirmando que "si abro 4 vs code el tiempo que pondrá en la status bar es el mismo realmente, porque aunque programe en 3 IDEs a la vez sigo siendo yo entonces 1 minuto es 1 minuto." Este requisito implica que el tiempo total reportado debe reflejar la actividad del usuario, no la suma de la actividad de cada instancia de IDE.  
  * Cada ventana de VS Code ejecuta su propio proceso de "Extension Host" aislado.2 Por lo tanto, cada instancia de la extensión es independiente y no tiene conocimiento directo de otras instancias. Para lograr la consolidación del tiempo entre instancias, estas instancias separadas de la extensión no pueden simplemente informar su tiempo local. Deben informar a un punto central que agregue el tiempo antes de actualizar la barra de estado.  
  * Este requisito exige un mecanismo de estado compartido *fuera* de los procesos individuales del Extension Host de VS Code. La forma más robusta y escalable de lograr esto es realizar esta agregación en el lado del servidor, dentro de la base de datos ClickHouse. Cada pulso enviado desde una instancia del IDE incluirá un user\_id y un ide\_instance\_id (un identificador único para esa sesión específica del IDE). Las consultas del panel de control luego sumarán el tiempo de actividad agrupado por user\_id y activity\_type, consolidando efectivamente el tiempo en todas las instancias para un usuario dado. Para la *barra de estado* específicamente, esto implica que la extensión necesitaría consultar la base de datos ClickHouse para obtener el tiempo total diario del usuario, o un demonio local ligero podría agregar y servir estos datos a todas las instancias locales del IDE. Dada la existencia de un backend ClickHouse, consultar la base de datos es el enfoque más consistente y escalable, aunque introduce latencia de red para las actualizaciones de la barra de estado.

## **5\. Optimización del Rendimiento y Gestión de Recursos**

El rendimiento es una preocupación crítica para esta extensión. Esta sección detallará las estrategias empleadas para asegurar que la extensión opere de manera eficiente sin degradar la capacidad de respuesta del IDE.

### **5.1. Manejo de Eventos: Estrategias de Debouncing y Throttling**

La directriz del usuario enfatiza la importancia de un manejo meticuloso del rendimiento, señalando que "no podemos guardar los pulsos de cada vez que pulsa el user porque sería una cantidad de datos demasiado grande, ni actualizar la UI de la status bar en cada iteración, ni sincronizar con el almacenamiento del IDE con cada iteración porque sería mucha sobrecarga". VS Code, por su propia naturaleza, utiliza técnicas de *debouncing* y *throttling* para optimizaciones internas 1, lo que valida su eficacia en el entorno del IDE.

Los eventos de alta frecuencia, como onDidChangeTextDocument (cambios de texto por escritura) 3 y

onDidChangeTextEditorSelection (movimiento del cursor o cambios de selección) 4, se disparan con gran asiduidad. Si cada uno de estos eventos generara un pulso o una actualización de la UI, el sistema se vería rápidamente sobrecargado.

Por ello, se aplicará *debouncing* al evento onDidChangeTextDocument. El *debouncing* asegura que una función se ejecute solo después de un período especificado de inactividad.1 Esto es ideal para detectar la actividad de "codificación": un pulso se generará solo después de que el usuario haga una pausa en la escritura durante una breve duración (por ejemplo, 500 ms a 1 segundo). Esto evita la generación de un pulso por cada pulsación de tecla, consolidando la actividad de escritura en bloques significativos.

Por otro lado, se aplicará *throttling* al evento onDidChangeTextEditorSelection y a la lógica interna de *diffing* para line\_additions/line\_deletions. El *throttling* garantiza que una función se ejecute como máximo una vez en un intervalo de tiempo especificado, independientemente de cuántas veces se active el evento.1 Esto es adecuado para capturar la

cursor\_position o las métricas de cambios de línea a una frecuencia controlada (por ejemplo, cada 5 segundos) en lugar de en cada cambio individual. Esta estrategia dual aborda directamente las preocupaciones de rendimiento del usuario para eventos de alta frecuencia y asegura una granularidad de datos adecuada sin sobrecargar el sistema.

### **5.2. Almacenamiento en Búfer Local y Gestión del Almacenamiento**

Los pulsos se recopilarán inicialmente en un búfer en memoria dentro del proceso del Extension Host. Para prevenir la pérdida de datos debido a cierres inesperados del IDE o fallos del sistema, este búfer en memoria se persistirá periódicamente en el almacenamiento local. Las opciones disponibles incluyen context.globalStorageUri o context.workspaceState.3 Dado que los pulsos pueden ser numerosos,

globalStorageUri es más adecuado para el almacenamiento de archivos más grandes de pulsos brutos antes de la sincronización, mientras que workspaceState es más apropiado para pares clave-valor más pequeños y estructurados. La frecuencia de las escrituras en el almacenamiento local se equilibrará cuidadosamente para minimizar las operaciones de E/S de disco, quizás cada 1-2 minutos, o ante cambios significativos en la actividad.

### **5.3. Actualizaciones Eficientes de la Interfaz de Usuario**

Como se detalló en la Sección 3.2, las actualizaciones de la barra de estado se regularán mediante *throttling* a un intervalo razonable (por ejemplo, cada 5-10 segundos). Esto es crucial para evitar un número excesivo de redibujados de la interfaz de usuario, lo que podría consumir recursos del sistema y afectar la capacidad de respuesta general del IDE. Mantener una frecuencia de actualización controlada asegura una experiencia de usuario fluida sin sacrificar la información esencial.

### **5.4. Protocolo de Sincronización de Datos (Intervalo de 30 minutos, Manejo de Errores)**

Se implementará un mecanismo de sincronización dedicado para enviar los pulsos almacenados en búfer a la base de datos ClickHouse cada 30 minutos. Este enfoque de procesamiento por lotes reduce significativamente la sobrecarga de red y el número de operaciones de escritura en la base de datos en comparación con las sincronizaciones por pulso individual.

El manejo de errores es una parte integral de este protocolo. Si un intento de sincronización falla (por ejemplo, debido a un error de red o a que la base de datos no está disponible), los pulsos almacenados localmente *no* se eliminarán. Permanecerán en el almacenamiento local y se incluirán en el siguiente intento de sincronización. Esto garantiza la integridad de los datos y previene la pérdida de información debido a problemas transitorios de conectividad o disponibilidad del servicio. Se implementará un mecanismo robusto de reintento con retroceso exponencial para las sincronizaciones fallidas, aumentando el tiempo entre reintentos para evitar sobrecargar el sistema remoto y permitir la recuperación.

## **6\. Diseño del Esquema de la Base de Datos ClickHouse**

Esta sección propondrá un esquema detallado para la tabla pulses en ClickHouse, optimizado para la ingesta de datos de series temporales de alto volumen y consultas analíticas, con un fuerte enfoque en el rendimiento.

### **6.1. Estructura de la Tabla pulses y Tipos de Datos**

El usuario ha solicitado un esquema de base de datos ClickHouse y ha enfatizado la importancia del rendimiento, indicando que "no podemos guardar los pulsos de cada vez que pulsa el user porque sería una cantidad de datos demasiado grande". ClickHouse es una base de datos analítica orientada a columnas, altamente optimizada para consultas rápidas sobre grandes conjuntos de datos, especialmente datos de series temporales.

Las consideraciones clave de rendimiento para ClickHouse incluyen:

* **Almacenamiento Columnar:** ClickHouse solo lee las columnas necesarias para una consulta, lo que acelera significativamente el rendimiento en cargas de trabajo analíticas.  
* **Tipos de Datos:** Es crucial utilizar los tipos de datos más pequeños y apropiados para cada campo. DateTime64 es ideal para marcas de tiempo con precisión de milisegundos, Int32 para duraciones, y String para texto variable.  
* **Clave Primaria (Primary Key):** Fundamental para un filtrado y una ordenación eficientes. Debe incluir columnas de alta cardinalidad que se consulten con frecuencia. Una clave primaria compuesta como (user\_id, timestamp, activity\_type) es una opción sólida para optimizar las búsquedas y agregaciones.  
* **Particionamiento (Partitioning):** Esencial para gestionar grandes conjuntos de datos, permitiendo que los datos antiguos se archiven o eliminen fácilmente y mejorando el rendimiento de las consultas al escanear solo las particiones relevantes. Las funciones basadas en tiempo como toYYYYMMDD(timestamp) o toYYYYMM(timestamp) son comunes y efectivas para datos de series temporales.  
* **Ordenación (Order By):** Define la ordenación física de los datos dentro de las particiones, lo que optimiza las consultas que filtran y ordenan por estas columnas. Debe alinearse con la clave primaria para maximizar la eficiencia.  
* **Cadenas de Baja Cardinalidad (LowCardinality Strings):** Si ciertos campos de cadena (como activity\_type, ide\_type) tienen un número limitado de valores distintos, el tipo LowCardinality(String) puede ahorrar espacio de almacenamiento y mejorar el rendimiento de las consultas al utilizar un diccionario interno.

El esquema propuesto aprovecha las fortalezas de ClickHouse utilizando tipos de datos adecuados, una clave primaria compuesta para búsquedas eficientes y particionamiento por fecha para gestionar el volumen de datos. Se recomienda el motor ReplacingMergeTree para manejar posibles pulsos duplicados que podrían surgir de los mecanismos de reintento durante la sincronización, asegurando la consistencia de los datos. Este diseño aborda directamente los requisitos de rendimiento e integridad de datos para una base de datos de series temporales de alto volumen.

* **Tabla: Esquema Propuesto de la Tabla pulses en ClickHouse**

| Field Name | Data Type | Description | Indexing/Partitioning Strategy |
| :---- | :---- | :---- | :---- |
| timestamp | DateTime64(3) | Marca de tiempo del inicio del pulso de actividad (con milisegundos). | Clave de ordenación principal, clave de partición (toYYYYMMDD(timestamp)) |
| user\_id | String | Identificador único del desarrollador (derivado de la API Key). | Clave de ordenación, índice minmax |
| ide\_instance\_id | String | Identificador único de la instancia del IDE (para consolidación multi-instancia). | Clave de ordenación, índice minmax |
| ide\_type | LowCardinality(String) | Tipo de IDE (ej. 'VS Code', 'Cursor', 'Visual Studio'). | Clave de ordenación, índice set |
| ide\_version | String | Versión del IDE (ej. '1.86.0'). | Índice minmax |
| project\_name | String | Nombre del proyecto/carpeta del espacio de trabajo activo. | Índice minmax |
| git\_branch | String | Nombre de la rama de Git activa. | Índice minmax |
| activity\_type | LowCardinality(String) | Tipo de actividad (ej. 'coding', 'debugging', 'reading', 'idle'). | Clave de ordenación, índice set |
| duration\_seconds | Int32 | Duración del pulso en segundos. | \- |
| line\_additions | Int32 | Número de líneas añadidas en el pulso. | \- |
| line\_deletions | Int32 | Número de líneas eliminadas en el pulso. | \- |
| cursor\_position | Int32 | Posición absoluta del cursor en el documento (offset). | \- |
| file\_path | String | Ruta relativa del archivo activo. | Índice minmax |
| language\_id | LowCardinality(String) | ID del lenguaje del archivo activo (ej. 'typescript', 'python'). | Índice set |

SQL

CREATE TABLE pulses (  
    timestamp DateTime64(3),  
    user\_id String,  
    ide\_instance\_id String,  
    ide\_type LowCardinality(String),  
    ide\_version String,  
    project\_name String,  
    git\_branch String,  
    activity\_type LowCardinality(String),  
    duration\_seconds Int32,  
    line\_additions Int32,  
    line\_deletions Int32,  
    cursor\_position Int32,  
    file\_path String,  
    language\_id LowCardinality(String)  
) ENGINE \= ReplacingMergeTree(timestamp)  
PARTITION BY toYYYYMMDD(timestamp)  
ORDER BY (user\_id, timestamp, activity\_type, ide\_type, project\_name, git\_branch);

### **6.2. Indexación, Particionamiento y Vistas Materializadas para el Rendimiento**

La elección del motor ReplacingMergeTree es fundamental para la integridad de los datos, ya que permite manejar la deduplicación de registros basándose en la clave de ordenación y la columna de versión opcional (en este caso, timestamp se usa como clave de versión implícita para la deduplicación basada en el tiempo del pulso). El particionamiento diario (PARTITION BY toYYYYMMDD(timestamp)) asegura que los datos se dividan en bloques manejables, lo que mejora drásticamente el rendimiento de las consultas que filtran por rangos de fechas y facilita la gestión del ciclo de vida de los datos (por ejemplo, la eliminación de datos antiguos).

La cláusula ORDER BY define el orden físico de los datos dentro de cada partición, lo que es crucial para las consultas de rango y las agregaciones. Al ordenar por (user\_id, timestamp, activity\_type, ide\_type, project\_name, git\_branch), las consultas que filtran por estos campos se beneficiarán de la localidad de los datos, reduciendo la cantidad de datos que ClickHouse necesita leer del disco.

Para acelerar las consultas comunes en los paneles de control (por ejemplo, el tiempo total de codificación por día o por proyecto), se podrían considerar vistas materializadas. Por ejemplo, una vista materializada que agregue el tiempo de actividad por usuario, tipo de actividad y día podría pre-calcular estos totales, ofreciendo un rendimiento de consulta casi instantáneo para los paneles de control.

## **7\. Detalles de Implementación de la API de VS Code**

Esta sección profundiza en las APIs específicas de Visual Studio Code que se utilizarán para implementar las funcionalidades de seguimiento de actividad, proporcionando un análisis detallado de cómo se obtendrán los datos necesarios.

### **7.1. Ciclo de Vida Central de la Extensión y Eventos de Activación**

Toda extensión de VS Code se rige por un ciclo de vida bien definido, que comienza con su activación. La extensión debe exportar una función activate() que VS Code invoca solo una vez cuando ocurre uno de los eventos de activación declarados.6 Para esta extensión, los eventos de activación se configurarán en el archivo

package.json para asegurar que el seguimiento comience en el momento adecuado sin imponer una carga innecesaria en el inicio del IDE.

Los eventos de activación clave incluyen:

* onStartupFinished: Este evento activa la extensión algún tiempo después de que VS Code se inicie, sin ralentizar el proceso de arranque principal.6 Es adecuado para inicializar servicios de fondo que no requieren interacción inmediata del usuario.  
* onCommand:yourExtension.enterApiKey: Para la interacción inicial de la clave API, la extensión se activará cuando el usuario invoque un comando específico para introducir la clave.  
* \* (Start up): Aunque se desaconseja su uso generalizado por el impacto en el rendimiento de inicio 6, podría ser necesario para asegurar que la extensión esté activa para mostrar el mensaje de "API Key missing" en la barra de estado desde el principio, o se podría gestionar esta lógica de estado inicial con un  
  onStartupFinished y una lógica de comprobación de clave API.

La extensión también puede exportar una función deactivate(), que se invoca cuando la extensión se desactiva (por ejemplo, al cerrar VS Code o deshabilitar la extensión).6 Esta función es crucial para realizar tareas de limpieza, como guardar cualquier pulso pendiente en el almacenamiento local antes de que el IDE se cierre, o liberar recursos.

### **7.2. API para Documentos de Texto y Eventos del Editor**

La captura de la actividad de codificación y lectura se basará en la monitorización de eventos relacionados con documentos de texto y el editor activo.

* vscode.workspace.onDidChangeTextDocument: Este es el evento principal para detectar cambios en el contenido de un documento de texto.3 La función de  
  *callback* de este evento recibe un objeto TextDocumentChangeEvent, que contiene información sobre el range de texto que fue reemplazado, la rangeLength (longitud del texto reemplazado) y el text nuevo que lo reemplazó.14 Como se mencionó en la Sección 4.2.2, para calcular  
  line\_additions y line\_deletions, la extensión deberá implementar una lógica de *diffing* comparando el estado anterior y actual del documento dentro del rango afectado. Esto requiere mantener un búfer de estado del documento para cada archivo activo.  
* vscode.window.onDidChangeTextEditorSelection: Este evento se dispara cada vez que la selección de texto o la posición del cursor cambia en un editor.4 Es fundamental para detectar la navegación del usuario dentro de un archivo, incluso sin modificaciones de texto. La información de la posición del cursor (  
  cursor\_position) se puede obtener de e.position dentro del evento y luego convertirla a un desplazamiento absoluto utilizando document.offsetAt(position).3  
* vscode.window.onDidChangeActiveTextEditor: Este evento es crucial para detectar cuándo el usuario cambia entre diferentes archivos o pestañas en el IDE.3 Permite identificar el documento activo y su contexto (nombre del archivo, idioma, etc.) para asociar la actividad con el archivo correcto.

### **7.3. API para Eventos de Depuración**

El seguimiento de la actividad de depuración se realizará mediante la suscripción a los eventos específicos del ciclo de vida de las sesiones de depuración.

* vscode.debug.onDidStartDebugSession: Este evento se dispara cuando se inicia una nueva sesión de depuración.5 La extensión utilizará este evento para marcar el inicio de un período de actividad de  
  debugging.  
* vscode.debug.onDidTerminateDebugSession: Este evento se dispara cuando una sesión de depuración finaliza.5 Se utilizará para marcar el final de un período de  
  debugging.  
* Contexto debugState (inDebugMode): Además de los eventos de inicio/fin, la clave de contexto inDebugMode 21 puede proporcionar una indicación en tiempo real de si el depurador está activo, lo que es útil para la clasificación continua de la actividad.

### **7.4. API para Integración Git (Información de Proyecto y Rama)**

La obtención del nombre del proyecto y de la rama de Git es vital para contextualizar la actividad del desarrollador.

* **Nombre del Proyecto:** El nombre del proyecto se puede obtener de vscode.workspace.workspaceFolders.14 Esta propiedad devuelve una lista de objetos  
  WorkspaceFolder, cada uno con una propiedad name que representa el nombre legible de la carpeta del espacio de trabajo. En la mayoría de los casos, workspaceFolders.name será suficiente. Para espacios de trabajo multi-raíz, se puede identificar la carpeta a la que pertenece el archivo activo.  
* **Nombre de la Rama Git:** Como se discutió en la Sección 4.2.3, la API pública de VS Code no expone directamente una propiedad vscode.scm.SourceControl.repository.head.name para obtener el nombre de la rama actual de la extensión Git incorporada.23 Sin embargo, VS Code muestra la rama actual en la barra de estado 23, lo que implica que la información es accesible internamente. La solución más robusta y menos propensa a romperse con futuras actualizaciones de la API interna de VS Code es ejecutar comandos de Git externos utilizando el módulo  
  child\_process de Node.js. Por ejemplo, git rev-parse \--abbrev-ref HEAD devolverá el nombre de la rama actual. Esta ejecución debe ser asíncrona y gestionada cuidadosamente para no bloquear el Extension Host, y se deben implementar mecanismos de caché para evitar ejecuciones excesivas del comando Git.

### **7.5. API para Elementos de la Interfaz de Usuario (Barra de Estado, Cuadro de Entrada, Notificaciones)**

La extensión interactuará con el usuario a través de varios elementos de la UI.

* vscode.window.createStatusBarItem(): Se utilizará para crear y gestionar el elemento de la barra de estado que muestra el tiempo de codificación y los mensajes de estado (por ejemplo, "API Key missing").8 Este método permite especificar la alineación (  
  StatusBarAlignment.Left o StatusBarAlignment.Right) y la prioridad. El texto del elemento se actualizará dinámicamente.  
* vscode.window.showInputBox(): Como se detalla en la Sección 3.1.1, este método es esencial para solicitar al usuario la clave API.9 Permite configurar un  
  *placeholder*, un mensaje de *prompt* y una función de validación de entrada.  
* vscode.window.showInformationMessage(), showWarningMessage(), showErrorMessage(): Estas APIs se pueden utilizar para mostrar mensajes informativos, advertencias o errores al usuario, por ejemplo, para notificar sobre una sincronización fallida o un problema de configuración de la clave API.3

### **7.6. API para Almacenamiento de Datos (ExtensionContext.secrets, globalStorageUri)**

La gestión de datos persistentes es crucial para la funcionalidad de la extensión.

* context.secrets: Para el almacenamiento seguro de la clave API del usuario.3 Este almacenamiento está cifrado y no se sincroniza entre máquinas, lo que lo convierte en la opción preferida para credenciales sensibles.  
* context.globalStorageUri: Proporciona una URI a un directorio local donde la extensión tiene acceso de lectura/escritura.3 Es una excelente opción para almacenar archivos grandes o datos estructurados que necesitan persistir globalmente (a través de diferentes espacios de trabajo) y que no son sensibles como una clave API. Aquí se almacenarán los pulsos en búfer antes de la sincronización remota, actuando como un caché persistente.  
* **Tabla: APIs Clave de VS Code y su Aplicación**

| API de VS Code | Descripción | Aplicación en la Extensión | Datos Proporcionados |
| :---- | :---- | :---- | :---- |
| vscode.window.showInputBox() | Muestra un cuadro de entrada para la interacción del usuario. | Solicitar la clave API al usuario. | Clave API (string) |
| vscode.window.createStatusBarItem() | Crea un elemento en la barra de estado del IDE. | Mostrar el tiempo de codificación diario y el estado de la clave API. | N/A (control de UI) |
| context.secrets | Almacenamiento global cifrado para datos sensibles. | Almacenar de forma segura la clave API. | Clave API (string) |
| vscode.workspace.onDidChangeTextDocument | Evento que se dispara cuando un documento de texto cambia. | Detectar actividad de escritura y cambios de líneas. | TextDocumentChangeEvent (rango, longitud, texto nuevo) 14 |
| vscode.window.onDidChangeTextEditorSelection | Evento que se dispara cuando la selección o el cursor cambia en un editor. | Detectar navegación de código y obtener la posición del cursor. | TextEditorSelectionChangeEvent (posición del cursor) 3 |
| vscode.window.onDidChangeActiveTextEditor | Evento que se dispara cuando el editor activo cambia. | Detectar cambios de archivo/pestaña. | TextEditor (documento, idioma, etc.) 3 |
| vscode.debug.onDidStartDebugSession | Evento que se dispara al iniciar una sesión de depuración. | Marcar el inicio de la actividad de depuración. | DebugSession 6 |
| vscode.debug.onDidTerminateDebugSession | Evento que se dispara al finalizar una sesión de depuración. | Marcar el final de la actividad de depuración. | DebugSession 6 |
| vscode.window.state.focused / onDidChangeWindowState | Propiedad/Evento para el estado de foco de la ventana. | Detectar si el IDE tiene foco para idle e inactive. | Booleano (foco) 6 |
| editorFocus / textInputFocus | Claves de contexto para el foco del editor/entrada de texto. | Refinar la detección de idle y coding. | Booleano (foco) 21 |
| vscode.workspace.workspaceFolders | Lista de carpetas del espacio de trabajo abiertas. | Obtener el nombre del proyecto activo. | Array de WorkspaceFolder (nombre, URI) 14 |
| vscode.env.appName | Nombre de la aplicación (IDE). | Identificar el tipo de IDE. | Nombre del IDE (string) 6 |
| vscode.version | Versión del IDE. | Obtener la versión del IDE. | Versión del IDE (string) |
| context.globalStorageUri | URI a un directorio de almacenamiento global persistente. | Almacenar pulsos en búfer local antes de la sincronización. | URI del directorio 3 |

## **8\. Hoja de Ruta de Desarrollo Futuro**

### **8.1. Consideraciones para el Desarrollo del Panel de Control**

El objetivo final de la extensión es proporcionar paneles de control intuitivos que visualicen los datos de actividad del desarrollador. Estos paneles se construirán sobre los datos almacenados en ClickHouse. Las consideraciones clave incluyen:

* **Tecnología Frontend:** Elección de un *framework* frontend (por ejemplo, React, Angular, Vue.js) y una biblioteca de visualización de datos (por ejemplo, D3.js, ECharts, Grafana) que se integre eficientemente con ClickHouse.  
* **Consultas Optimizadas:** Diseño de consultas SQL para ClickHouse que aprovechen su naturaleza columnar y sus índices para obtener agregaciones rápidas (por ejemplo, sumas de tiempo por día, por proyecto, por tipo de actividad). Las vistas materializadas mencionadas en la Sección 6.2 serán cruciales aquí.  
* **Métricas Clave:** Definición de los KPI (Key Performance Indicators) a visualizar, como tiempo de codificación diario/semanal/mensual, distribución del tiempo por proyecto, tiempo dedicado a depuración vs. codificación, y tendencias de adiciones/eliminaciones de líneas.  
* **Experiencia de Usuario:** Diseño de una interfaz de usuario clara y atractiva que permita a los desarrolladores explorar sus patrones de actividad y obtener información procesable.

### **8.2. Expansión del Soporte a IDEs**

La arquitectura de la extensión está diseñada para ser agnóstica al IDE, lo que facilita la expansión a otras plataformas en el futuro.

* **Priorización de IDEs:** Identificar los próximos IDEs a soportar (Cursor, Windsurf, Visual Studio) basándose en la demanda de los usuarios y la disponibilidad de sus APIs de extensión.  
* **Capa de Adaptador:** Para cada nuevo IDE, se desarrollará una capa de adaptador específica. Esta capa será responsable de:  
  * Mapear los eventos nativos del IDE a la estructura de "pulso" común de la extensión.  
  * Utilizar las APIs de almacenamiento seguro del IDE para la clave API.  
  * Implementar la lógica de interacción con la barra de estado y los cuadros de entrada del IDE.  
  * Gestionar las peculiaridades de rendimiento y ciclo de vida de cada entorno de extensión.  
* **Reutilización del Núcleo:** La lógica central de clasificación de actividad, generación de pulsos, gestión del búfer local y sincronización con ClickHouse se reutilizará en gran medida, minimizando el esfuerzo de desarrollo para cada nuevo IDE.

## **9\. Conclusión**

La extensión de seguimiento de actividad del desarrollador para Visual Studio Code representa una herramienta potente para la introspección de la productividad. Su diseño se ha centrado meticulosamente en la eficiencia y la escalabilidad, abordando los desafíos inherentes al seguimiento de actividad de alta frecuencia dentro de un IDE.

La implementación de estrategias de *debouncing* y *throttling* para el manejo de eventos de UI y de documentos es fundamental para mantener la capacidad de respuesta del IDE. La elección de ClickHouse como base de datos, con un esquema diseñado específicamente para datos de series temporales y optimizado para el rendimiento mediante particionamiento y ordenación, asegura que la ingesta de grandes volúmenes de datos y las consultas analíticas futuras sean eficientes.

Se han identificado y propuesto soluciones para desafíos técnicos específicos, como el cálculo de adiciones/eliminaciones de líneas (requiriendo algoritmos de *diffing* personalizados) y la obtención del nombre de la rama de Git (que probablemente necesite la ejecución de comandos externos debido a las limitaciones de la API pública). La consolidación del tiempo de actividad entre múltiples instancias del IDE se resolverá de manera escalable a través de la agregación en el lado del servidor en ClickHouse.

La arquitectura modular de la extensión, con una clara separación entre la lógica de seguimiento central y las capas de adaptador específicas del IDE, posiciona el proyecto para una expansión futura fluida a otras plataformas como Cursor, Windsurf y Visual Studio. Este enfoque garantiza que la inversión en el desarrollo de la lógica de seguimiento principal se maximice a medida que la extensión evolucione para soportar un ecosistema de desarrollo más amplio. La documentación presentada sirve como un plan técnico exhaustivo, guiando tanto a los desarrolladores actuales como a las futuras implementaciones de IA a través de las complejidades y soluciones arquitectónicas de este sistema de seguimiento de actividad.

#### **Works cited**

1. Optimizing Performance: Using Debouncing and Throttling \- DEV Community, accessed on June 19, 2025, [https://dev.to/austinwdigital/optimizing-performance-using-debouncing-and-throttling-1b64](https://dev.to/austinwdigital/optimizing-performance-using-debouncing-and-throttling-1b64)  
2. VS Code Under The Hood: Behind the Scenes of the World's Most Popular Code Editor, accessed on June 19, 2025, [https://thedeveloperspace.com/vs-code-architecture-guide/](https://thedeveloperspace.com/vs-code-architecture-guide/)  
3. Common Capabilities | Visual Studio Code Extension API, accessed on June 19, 2025, [https://code.visualstudio.com/api/extension-capabilities/common-capabilities](https://code.visualstudio.com/api/extension-capabilities/common-capabilities)  
4. visual studio code \- VSCode Extension Activation Event for when ..., accessed on June 19, 2025, [https://stackoverflow.com/questions/72924107/vscode-extension-activation-event-for-when-document-is-changed](https://stackoverflow.com/questions/72924107/vscode-extension-activation-event-for-when-document-is-changed)  
5. Api debugging \- vscode-docs, accessed on June 19, 2025, [https://vscode-docs.readthedocs.io/en/latest/extensionAPI/api-debugging/](https://vscode-docs.readthedocs.io/en/latest/extensionAPI/api-debugging/)  
6. Extension API | Visual Studio Code Extension API, accessed on June 19, 2025, [https://code.visualstudio.com/api](https://code.visualstudio.com/api)  
7. VSCodeAPI.window \- @narumincho/vscode \- JSR, accessed on June 19, 2025, [https://jsr.io/@narumincho/vscode/doc/\~/VSCodeAPI.window](https://jsr.io/@narumincho/vscode/doc/~/VSCodeAPI.window)  
8. Status bar items \- Comprehensive Visual Studio Code Extension Development \- StudyRaid, accessed on June 19, 2025, [https://app.studyraid.com/en/read/8400/231856/status-bar-items](https://app.studyraid.com/en/read/8400/231856/status-bar-items)  
9. Creating Extensions for Visual Studio Code: A Complete Guide | Syncfusion Blogs, accessed on June 19, 2025, [https://www.syncfusion.com/blogs/post/creating-extensions-for-visual-studio-code-a-complete-guide](https://www.syncfusion.com/blogs/post/creating-extensions-for-visual-studio-code-a-complete-guide)  
10. vscode-extension-samples/quickinput-sample/src/basicInput.ts at main \- GitHub, accessed on June 19, 2025, [https://github.com/microsoft/vscode-extension-samples/blob/master/quickinput-sample/src/basicInput.ts](https://github.com/microsoft/vscode-extension-samples/blob/master/quickinput-sample/src/basicInput.ts)  
11. Extension Anatomy \- Visual Studio Code, accessed on June 19, 2025, [https://code.visualstudio.com/api/get-started/extension-anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy)  
12. Add a custom themable icon to Visual Studio Code | Elio Struyf, accessed on June 19, 2025, [https://www.eliostruyf.com/add-custom-themable-icon-visual-studio-code/](https://www.eliostruyf.com/add-custom-themable-icon-visual-studio-code/)  
13. Testing API | Visual Studio Code Extension API, accessed on June 19, 2025, [https://code.visualstudio.com/api/extension-guides/testing](https://code.visualstudio.com/api/extension-guides/testing)  
14. VS Code API | Visual Studio Code Extension API, accessed on June 19, 2025, [https://code.visualstudio.com/api/references/vscode-api](https://code.visualstudio.com/api/references/vscode-api)  
15. 21 questions you'll ask if you develop a VSCode extension \- Packmind, accessed on June 19, 2025, [https://packmind.com/21-questions-building-vscode-extension/](https://packmind.com/21-questions-building-vscode-extension/)  
16. How to Handle User Interactions and Text Selections in VSCode | LabEx, accessed on June 19, 2025, [https://labex.io/questions/how-to-handle-user-interactions-and-text-selections-within-the-vscode-environment-298937](https://labex.io/questions/how-to-handle-user-interactions-and-text-selections-within-the-vscode-environment-298937)  
17. window.onDidChangeTextEditorSelection triggers for built-in output panes like Terminal or Extension Host · Issue \#206118 · microsoft/vscode \- GitHub, accessed on June 19, 2025, [https://github.com/microsoft/vscode/issues/206118](https://github.com/microsoft/vscode/issues/206118)  
18. Debugger Extension \- Visual Studio Code, accessed on June 19, 2025, [https://code.visualstudio.com/api/extension-guides/debugger-extension](https://code.visualstudio.com/api/extension-guides/debugger-extension)  
19. Debug code with Visual Studio Code, accessed on June 19, 2025, [https://code.visualstudio.com/docs/debugtest/debugging](https://code.visualstudio.com/docs/debugtest/debugging)  
20. Event Command Mapper \- Visual Studio Marketplace, accessed on June 19, 2025, [https://marketplace.visualstudio.com/items?itemName=AndrewRichardson.eventcommandmapper](https://marketplace.visualstudio.com/items?itemName=AndrewRichardson.eventcommandmapper)  
21. when clause contexts | Visual Studio Code Extension API, accessed on June 19, 2025, [https://code.visualstudio.com/api/references/when-clause-contexts](https://code.visualstudio.com/api/references/when-clause-contexts)  
22. Working with GitHub in VS Code, accessed on June 19, 2025, [https://code.visualstudio.com/docs/sourcecontrol/github](https://code.visualstudio.com/docs/sourcecontrol/github)  
23. Using Git source control in VS Code, accessed on June 19, 2025, [https://code.visualstudio.com/docs/sourcecontrol/overview](https://code.visualstudio.com/docs/sourcecontrol/overview)  
24. Introduction to Git in VS Code, accessed on June 19, 2025, [https://code.visualstudio.com/docs/sourcecontrol/intro-to-git](https://code.visualstudio.com/docs/sourcecontrol/intro-to-git)  
25. VscodeWindow \- Haxe externs for Visual Studio Code \- API documentation, accessed on June 19, 2025, [https://vshaxe.github.io/vscode-extern/VscodeWindow.html](https://vshaxe.github.io/vscode-extern/VscodeWindow.html)  
26. What is a VS Code workspace?, accessed on June 19, 2025, [https://code.visualstudio.com/docs/editing/workspaces/workspaces](https://code.visualstudio.com/docs/editing/workspaces/workspaces)  
27. Multi-root Workspaces \- Visual Studio Code, accessed on June 19, 2025, [https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces)  
28. Source Control API \- Visual Studio Code, accessed on June 19, 2025, [https://code.visualstudio.com/api/extension-guides/scm-provider](https://code.visualstudio.com/api/extension-guides/scm-provider)  
29. Cursor Position \- Visual Studio Marketplace, accessed on June 19, 2025, [https://marketplace.visualstudio.com/items?itemName=asquared31415.cursor-pos](https://marketplace.visualstudio.com/items?itemName=asquared31415.cursor-pos)