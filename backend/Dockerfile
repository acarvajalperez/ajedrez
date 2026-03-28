FROM gcc:13 AS build
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y cmake

# Copy the complete backend source code
COPY . .

# Build the C++ Engine securely
WORKDIR /app/build
RUN cmake .. && make -j$(nproc)

# Production Image (Minimal)
FROM ubuntu:22.04
WORKDIR /app

# Copy the specific executable
COPY --from=build /app/build/ajedrez_engine .

# Expose C++ Httplib Port
EXPOSE 8080

# Execute Engine
CMD ["./ajedrez_engine"]
