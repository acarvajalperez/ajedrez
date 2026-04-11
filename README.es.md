# ♟️ Ajedrez Pro - Motor C++ Bitboard & React Frontend

Un proyecto integral de Ajedrez que combina una interfaz moderna, táctil e interactiva construida en **React (TypeScript)** utilizando gráficas SVG puras, conectada a un **Motor de Inteligencia Artificial de Alto Rendimiento en C++** mediante una API REST HTTP.

El desarrollo de este proyecto se ha enfocado en alcanzar velocidades de Nodos Por Segundo (NPS) dignas de motores de torneo, implementando una arquitectura de 64-bits (*Bitboards*) para el tablero y las técnicas matemáticas de poda más avanzadas del estado del arte.

---

## 🏗️ Arquitectura General

El proyecto se divide en dos caparazones radicalmente diferentes que se comunican mediante Notación FEN (*Forsyth-Edwards Notation*):

### 1. Frontend (React + Vite + TSX)
*   **Sin Librerías Externas**: El tablero iterativo (`Chessboard.tsx`) y las piezas se redenderizan usando matemáticas puras y gráficos `<svg>` mapeados. No se usan librerías pesadas como `react-chessboard` o `chess.js`.
*   **Drag & Drop Táctil**: Sistema de arrastre suave usando eventos de ratón `onMouseDown`, `onMouseMove` en crudo, garantizando compatibilidad.
*   **Visuales Inmersivos y Animaciones**: Gradientes radiales para destacar al Rey cuando se encuentra en "Jaque Matemático", variables de opacidad durante el arrastre y texturización de las cuadrículas. Implementa transiciones de piezas deterministas y fluidas, con **animaciones orgánicas escalonadas** (30% de solapamiento) al navegar por el historial o efectuar capturas.
*   **Panel de Control en Tiempo Real y UI**: Telemetría en vivo, visualización del Historial de Movimientos, Temas Dinámicos intercambiables, un **Reloj de Ajedrez dual Analógico/Digital**, y controles sobre el límite de tiempo y asignación de Núcleos CPU (Threads).
*   **Configuración Avanzada y Board Editor**: Sistema de selección de bando (jugar como Blancas, Negras o ver partidas IA vs IA en **Modo Espectador**), y un **Editor Visual de Tablero** completo para configurar posiciones de forma intuitiva y generar parámetros FEN al vuelo.

### 2. Backend (C++ 17 + cpp-httplib)
*   Un micro-servidor RESTful multihilo montado con cabeceras `CORS` habilitadas que despacha JSON bidireccional mediante `nlohmann`.
*   El backend decodifica las coordenadas, mueve sobre su Array matricial central y devuelve un JSON al front con el String FEN y las validaciones de victoria o tablas al vuelo.
*   **Soporte FEN Personalizado**: El núcleo C++ implementa un parser FEN completamente funcional, permitiendo que el motor reciba posiciones arbitrarias desde el frontend para evaluar estados de partida específicos al instante.

---

## 🧠 El Cerebro: El Motor de Bitboards
Abandonamos la tradicional y lenta "matriz de 8x8 iterativa" para descender al nivel binario de la CPU.

*   **U64 Bitboards**: Todo el conocimiento físico del juego recae en `12` variables de 64 bits de tipo `unsigned long long`. El Rey Blanco es un 1 binario entre 63 ceros.
*   **Operaciones Cuánticas a Ritmo de CPU (`<<`, `>>`, `&`, `|`)**: Movimientos de captura, promoción o dobles de peón se generan usando álgebra de variables instantánea (Máscaras de pre-cómputo, Look-Up Tables para Caballos y Reyes, y sliding rays para las Reinas).
*   **Move Encoding (Compresión Int32)**: Mover una pieza de `A2` a `A4` se comprime en la CPU como un único número entero (`int`) codificando al milímetro sus casillas destino y origen usando Desplazamiento de Bits (`shift`).
*   **Simulador de Legales Superpuesto**: En lugar del engorroso "Hacer-jugada y Deshacer-jugada" recursivo global, en C++ clonamos el tablero completo de 64 bits, aplicamos el movimiento, verificamos ataques binarios y, si el rey está a salvo, lo damos por bueno.

---

## 💻 Inteligencia Artificial Extrema (Alpha-Beta 2.0)
El core de Búsqueda (`Search.cpp`) expone un algoritmo NegaMax supercargado. Lo que empezó como un simple árbol de profundidad ciega asume ahora los recursos del **Estado del Arte del Ajedrez Computacional**:

1. **Zobrist Hashing (Tablas de Transposición)**
   * Memoria Caché de 4.000.000 entradas para almacenar realidades (tableros) futuras de iteraciones repetidas, calculadas usando XOR (`^`) asimétrico mediante generadores pseudo-aleatorios de 64 Bits.
   * **Profundidad Técnica**: Cada entrada almacena un Flag criptográfico (`EXACT`, `ALPHA` o `BETA`), la profundidad a la que se evaluó y el mejor movimiento (`best_move`). Esto permite saltarse subárboles matemáticos enteros.
   * 💡 **En palabras simples**: *Es como si la IA tuviera memoria fotográfica. Si llega a una posición del tablero dando un rodeo, pero ya calculó cómo jugar ahí hace unos segundos, recupera la respuesta instantáneamente de su "cerebro" y no vuelve a perder el tiempo pensando desde cero.*
2. **Iterative Deepening Controlado por Reloj**
   * El código itera la profundidad de forma recursiva ($D=1$, $D=2$... $D=64$) deteniéndose abruptamente en el instante en el que suenan los Milisegundos Inyectados por el usuario desde el Frontend.
   * **Profundidad Técnica**: Este enfoque garantiza que el motor *siempre* tenga un movimiento de altísima calidad listo en memoria sin importar el límite de tiempo. Durante iteraciones más profundas, los resultados previos guían la convergencia.
   * 💡 **En palabras simples**: *Como buscar las llaves. Primero miras por encima, luego remueves la mesa, y luego levantas los sofás. Si de repente suena la alarma de irte (se te acaba el tiempo), al menos te irás con el objeto más brillante que hayas visto hasta ese punto, en vez de quedarte en blanco.*
3. **PST (Piece-Square Tables)**
   * Fomenta activamente luchar por el *centro* usando Arrays posicionales inversos para Blancas y Negras simultáneamente.
   * **Profundidad Técnica**: Un Peón central no vale 100 puntos, vale 100 + su bonificación zonal, incentivando que la IA domine intrínsecamente el tablero sin haber "entendido" reglas complejas.
   * 💡 **En palabras simples**: *Son "mapas de calor" para la computadora. Además de enseñarle que una Torre vale mucho, le enseña que un Caballo en el centro del tablero es una bestia salvaje e imparable, pero un Caballo arrinconado en la esquina es un burro inútil (y le restará puntos por ponerlo ahí).*
4. **Move Ordering Predictivo**
   * Antes de ramificarse... la IA ordena primero las posibles *Capturas* predecibles que obligarán al jugador contrario a reaccionar.
   * **Profundidad Técnica**: Se utiliza la lógica MVV-LVA (*Most Valuable Victim - Least Valuable Attacker*), de tal forma que Peón(X)Reina se evalúa instantáneamente antes que Reina(X)Peón.
   * 💡 **En palabras simples**: *Usar el sentido común. En vez de desperdiciar la poca memoria analizando qué pasa si mueves tu Rey un milímetro, el algoritmo se obliga a sí mismo a pensar primero "Oye, ¿y si me como su Reina con mi peón miserable? Analicemos esto lo primero".*
5. **Lazy SMP (Symmetric Multiprocessing) Escalable**
   * Computación Multi-Hilo Real en C++. La IA clona el algoritmo en varias ramas asíncronas de CPU aisladas (por ejemplo 12 Cores al dedillo), rastreando futuros distintos y compartiendo descubrimientos cruzados.
   * **Profundidad Técnica**: Su magia radica en que el simple ruido asíncrono, al escribir y leer desordenadamente sobre la misma Transposition Table maestra, empuja iterativamente a que un *Core* explore los aciertos de otro *Core*, divergiendo hacia distintas ramas naturalmente.
   * 💡 **En palabras simples**: *Imagínate meter a 10 detectives ultrarrápidos en un laberinto en vez de a uno solo. Cuando un detective descubre un callejón sin salida, pega un "post-it" en la pared central. Los otros detectives ven el papel y ya ni se molestan en entrar ahí. Entre todos revientan el laberinto.*
6. **Null Move Pruning (Pasar el Turno)**
   * El algoritmo hace un "pase de turno falso" para comprobar si su ventaja es tan demencial que puede salir victorioso asumiendo un rol pesimista.
   * **Profundidad Técnica**: Ponderando una Reducción Fija ($R=2$ o $R=3$), la IA cede ilegalmente su turno al contrincante bajo este paradigma de evaluación Alpha/Beta.
   * 💡 **En palabras simples**: *La IA es tan soberbia que le dice mentalmente a la matriz: "Oye, estoy aplastando a este humano con tanta fuerza, que si literalmente le regalase un turno extra, seguiría ganando. Así que no mereces que malgaste energía RAM simulando esta paliza". Y corta la simulación de golpe.*
7. **Killer Heuristics**
   * Matrices globales recuerdan jugadas "pacíficas silenciosas" (sin captura) que destrozaron la Búsqueda Beta. Si saltan en ramas paralelas, las prioriza.
   * **Profundidad Técnica**: La caché inyecta las jugadas posicionales no violentas que invalidaron las evaluaciones en otras ramas para evadir redundancia.
   * 💡 **En palabras simples**: *Si un detective de la IA encuentra un "golpe bajo sutil" increíble en otro futuro posible paralelo (como hacer una zancadilla al Alfil enemigo en silencio), se lo guarda en un cajón e intentará probar si meter esa misma zancadilla le soluciona la vida en este otro universo paralelo.*
8. **Quiescence Search (Búsqueda de la Calma)**
   * Extensión post-límite. Si el tiempo acaba a mitad de un sangriento intercambio de piezas, fuerza un análisis ilimitado pero filtrado hasta alcanzar la calma.
   * **Profundidad Técnica**: Quiescence usa la técnica de "Stand-Pat" (establecer la evaluación posicional cruda como límite inferior) para investigar frenéticamente capturas pendientes y evitar lecturas catastróficas.
   * 💡 **En palabras simples**: *Evita que la IA actúe como una estúpida máquina ciega. Si se acaba el tiempo justo en el instante en el que la IA le come un peón al usuario, la IA pensaría idiotamente "¡Oh, le he comido una pieza, voy ganando!". Quiescence le obliga a abrir los ojos dos jugadas más para ver que, al turno siguiente, TÚ le ibas a destrozar la Reina en venganza ciega.*
9. **Late Move Reductions (LMR)**
   * Las jugadas "tardías" se procesan restando profundidad, penalizando movimientos absurdos no capturadores al apostar fuértemente a la superficialidad.
   * **Profundidad Técnica**: Las primeras jugadas se exploran a Full Depth. La máquina cataloga las posteriores como improbables (LMR), rebajando la carga del NegaMax.
   * 💡 **En palabras simples**: *Es la ley del apocalipsis. Si ya has pensado intensamente en 3 planes de supervivencia buenísimos liderando la lista (Luchar, Huir o Esconderse)... Las opciones que están por el fondo de la lista, como "Hacer malabares con manzanas", directamente les das medio microsegundo de atención y pasas de largo.*

---

## 🚀 Instalación y Ejecución

Asegúrate de tener un compilador C++ moderno y NodeJS en tu sistema.

**1. Lanzar el Backend (C++)**
```bash
cd backend/build
cmake ..
make -j4
./ajedrez_engine
```
*(El servidor comenzará en el puerto local 8080)*

**2. Lanzar el Frontend (React)**
```bash
cd frontend
npm install
npm run dev
```
*(El servidor web proveerá la UI mediante Vite en `http://localhost:5174`)*

Ajusta la dificultad, los hilos multicore y el tiempo de respuesta en GFLOPS desde la interfaz táctil, y descubre si puedes sobrevivir a esta bestia.

### 🐳 Ejecución con Docker (Recomendado)

Si prefieres no instalar dependencias locales, puedes desplegar todo el entorno al instante usando Docker y Docker Compose:

```bash
docker-compose up --build -d
```
Esto construirá y levantará tanto el motor C++ en el puerto `8080` como el frontend accesible en `http://localhost:5174`.

---

## 🔮 Roadmap y Mejoras Futuras
A pesar de ser enormemente robusto, estas son las integraciones extremas matemáticas pendientes:
1. **Magic Bitboards**: Reemplazar la comprobación por Rayos actual en Alfiles y Torres por pre-cómputos mapeados con un `unsigned __int128`, devolviendo todos los ataques válidos en operaciones asintóticas $O(1)$. No requieren iteración. 
2. **Opening Book (.Bin)**: Cargar una base de Múltiples Aperturas Maestras (ECO) en memoria RAM o SQLite local, para que durante las primeras 12 jugadas la IA responda instantáneamente de la base teórica sin gastar recursos de evaluación.
3. **Syzygy Endgame Tablebases**: Indexación en Terabytes. Cuando en el tablero queden 6 fichas o menos, la computadora dejará de calcular probabilidades; en su lugar, descargará los movimientos perfectos matemáticos de pre-cálculo resolviendo mates en 50 movimientos con exactitud divina.
