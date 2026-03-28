cmake_minimum_required(VERSION 3.10)
project(AjedrezEngine)

set(CMAKE_CXX_STANDARD 17)

include_directories(third_party)
include_directories(src/engine)

add_executable(ajedrez_engine
    src/main.cpp
    src/engine/Board.cpp
    src/engine/Game.cpp
    src/engine/Bitboard.cpp
    src/engine/Attacks.cpp
    src/engine/MoveGen.cpp
    src/engine/Search.cpp
)

find_package(Threads REQUIRED)
target_link_libraries(ajedrez_engine PRIVATE Threads::Threads)
