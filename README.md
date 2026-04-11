# ♟️ Ajedrez Pro - High-Performance C++ Bitboard Engine & React Frontend

A comprehensive Chess project that combines a modern, tactile, and interactive interface built in **React (TypeScript)** using pure SVG graphics, connected to a **High-Performance AI Chess Engine in C++** via an HTTP REST API.

The development of this project has focused on achieving tournament-worthy Nodes Per Second (NPS) speeds by implementing a 64-bit architecture (*Bitboards*) for the board and state-of-the-art mathematical pruning search techniques.

---

## 🏗️ General Architecture

The project is divided into two radically different shells communicating via FEN (*Forsyth-Edwards Notation*):

### 1. Frontend (React + Vite + TSX)
*   **No Heavy External Libraries**: The iterative board (`Chessboard.tsx`) and pieces are rendered using pure mathematics and mapped `<svg>` graphics. No heavy libraries like `react-chessboard` or `chess.js` are used.
*   **Tactile Drag & Drop**: Smooth drag system using raw `onMouseDown`, `onMouseMove` mouse events, guaranteeing maximum compatibility.
*   **Immersive Visuals & Organic Animations**: Radial gradients to highlight the King when in "Mathematical Check", opacity variables during drag, and predefined palette grid texturing. Features deterministic, organic piece animations with a 30% staggered overlap during history navigation and captures for a fluid user experience.
*   **Real-Time Control Panel & UI**: Live Telemetry, full Move History visualization, Dynamic Theme Switching, and a feature-rich interface including a **Dual Analog/Digital Chess Clock**.
*   **Advanced Game Setup & Board Editor**: Includes a Side Selection system (Play as White, Black, or watch a **Spectator Mode** AI vs AI game), and a full **Visual Board Editor** to intuitively set up arbitrary board positions and generate custom FEN strings on the fly.

### 2. Backend (C++ 17 + cpp-httplib)
*   A multi-threaded RESTful micro-server equipped with enabled `CORS` headers that dispatches bidirectional JSON using `nlohmann/json`.
*   The backend decodes coordinates, moves pieces on its central matrix array, and returns a JSON to the frontend with the FEN String and on-the-fly win or draw validations.
*   **Custom FEN Parsing**: The C++ core includes a robust FEN parser, allowing the engine to instantiate games from any arbitrary position and expose it to the API.

---

## 🧠 The Brain: The Bitboard Engine
We abandon the traditional and slow "iterative 8x8 matrix" to descend to the CPU's binary level.

*   **U64 Bitboards**: All the physical knowledge of the game rests in `12` 64-bit variables of type `unsigned long long`. The White King is a binary 1 among 63 zeros.
*   **Quantum Operations at CPU Speed (`<<`, `>>`, `&`, `|`)**: Capture, promotion, or double pawn moves are generated using instantaneous variable algebra (Pre-computed Masks, Look-Up Tables for Knights and Kings, and sliding rays for Queens).
*   **Move Encoding (Int32 Compression)**: Moving a piece from `A2` to `A4` is compressed in the CPU as a single integer number (`int`), strictly encoding its destination and origin squares using bitwise operations (`shift`).
*   **Superimposed Legal Simulator**: Instead of the cumbersome global recursive "Make-Move and Unmake-Move", in C++ we clone the complete 64-bit board, apply the move, verify binary attacks, and if the king is safe, we consider it valid.

---

## 💻 Extreme Artificial Intelligence (Alpha-Beta 2.0)
The Search core (`Search.cpp`) exposes a supercharged NegaMax algorithm. What started as a simple blind-depth tree now assumes the resources of the **State of the Art in Computational Chess**:

1. **Zobrist Hashing (Transposition Tables)**
   * 4,000,000-entry Cache Memory to store future realities (boards) of repeated iterations, calculated using asymmetric XOR (`^`) through 64-bit pseudo-random generators.
   * **Technical Depth**: Each entry stores a cryptographic Flag (`EXACT`, `ALPHA`, or `BETA`), the depth at which it was evaluated, and the `best_move`. This allows skipping entire mathematical subtrees.
2. **Iterative Deepening Clock Control**
   * The code recursively iterates the depth ($D=1$, $D=2$... $D=64$), stopping abruptly the instant the user-injected Milliseconds trigger from the Frontend.
   * **Technical Depth**: Guarantees the engine *always* has a top-quality move ready in memory regardless of the time limit.
3. **PST (Piece-Square Tables)**
   * Actively encourages fighting for the *center* using inverse positional Arrays for White and Black simultaneously.
   * **Technical Depth**: A central Pawn isn't worth 100 points; it's worth 100 + its zonal bonus, incentivizing the AI to intrinsically dominate the board without having "understood" complex rules.
4. **Predictive Move Ordering**
   * Before branching out, the AI first orders predictable *Captures* that will force the opposing player to react.
   * **Technical Depth**: MVV-LVA (*Most Valuable Victim - Least Valuable Attacker*) logic is used.
5. **Scalable Lazy SMP (Symmetric Multiprocessing)**
   * Real Multi-Threading Computation in C++. The AI clones the algorithm into several asynchronous branches on isolated CPUs (e.g., 12 Threads), tracking different futures and sharing cross-discoveries.
   * **Technical Depth**: The magic lies in the fact that simple asynchronous noise, when reading and writing out of order on the same master Transposition Table, iteratively pushes one *Core* to explore another's findings, naturally diverging into distinct branches.
6. **Null Move Pruning**
   * The algorithm makes a "fake turn pass" to check if its advantage is so overwhelming that it can emerge victorious assuming a pessimistic role.
7. **Killer Heuristics**
   * Global matrices remember "silent peaceful" moves (without capture) that destroyed the Beta Search. If they pop up in parallel branches, it prioritizes them.
8. **Quiescence Search**
   * Post-limit extension. If time runs out in the middle of a bloody piece exchange, it forces a limitless but filtered analysis until calmness is reached.
9. **Late Move Reductions (LMR)**
   * "Late" moves are processed by subtracting depth, penalizing absurd non-capturing moves by heavily betting on superficiality.

---

## 🚀 Installation & Execution

Make sure you have a modern C++ compiler and NodeJS on your system.

**1. Launch the Backend (C++)**
```bash
cd backend/build
cmake ..
make -j4
./ajedrez_engine
```
*(The server will start on local port 8080)*

**2. Launch the Frontend (React)**
```bash
cd frontend
npm install
npm run dev
```
*(The frontend will be served via Vite on `http://localhost:5174`)*

Adjust the difficulty, multicore threads, and response time in the UI, and see if you can survive this beast.

### 🐳 Execution with Docker (Recommended)

If you prefer not to install local dependencies, you can deploy the entire environment instantly using Docker and Docker Compose:

```bash
docker-compose up --build -d
```
This will build and start both the C++ engine on port `8080` and the accessible frontend at `http://localhost:5174`.

---

## 🔮 Roadmap and Future Improvements
Despite being heavily robust, these are the pending extreme mathematical integrations:
1. **Magic Bitboards**: Replace the current Ray check on Bishops and Rooks with mapped pre-computations using an `unsigned __int128`, returning all valid attacks in asymptotic $O(1)$ operations with no iteration required.
2. **Opening Book (.Bin)**: Load a database of Multiple Master Openings (ECO) into RAM or local SQLite, so that during the first 12 moves, the AI responds instantly from the theoretical base without spending evaluation resources.
3. **Syzygy Endgame Tablebases**: Terabyte indexing. When there are 6 pieces or fewer left on the board, the computer will stop calculating probabilities; instead, it will download perfect mathematical pre-calculated moves, solving mates in exactly 50 moves with divine exactness.
